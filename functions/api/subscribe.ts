// functions/api/subscribe.ts
//
// Cloudflare Pages Function — handles POST /api/subscribe from the
// lead-magnet forms on /free-samples and /pl/free-samples.
//
// Security model:
// - Only POST is handled; every other method is rejected explicitly.
// - The Turnstile CAPTCHA token is verified server-side against
//   Cloudflare's own siteverify endpoint before anything else happens —
//   a token existing in the request proves nothing on its own.
// - A hidden honeypot field ("company") catches simple bots that fill in
//   every input on a form.
// - The email address is validated with a basic regex + a length cap.
// - TURNSTILE_SECRET_KEY and KIT_API_KEY live ONLY as Cloudflare Pages
//   environment variables of type "Secret" — set in the Cloudflare
//   dashboard, never committed to Git, never sent to the browser.
// - This function never stores the visitor's name or email itself. It
//   forwards the signup to Kit, which owns the double opt-in confirmation
//   email and the mailing list — exactly as described in the Privacy
//   Policy (section 5, "Data Sharing & Third-Party Processors").
//
// Required Cloudflare Pages environment variables (Settings → Environment
// variables, "Secret" type, set for both Production and Preview):
//   TURNSTILE_SECRET_KEY   — from the Cloudflare Turnstile widget
//   KIT_API_KEY             — from Kit → Settings → Developer → API Keys
//   KIT_FORM_ID_KIDS        — the numeric ID of the "Kids Free Sample" (EN) Kit form
//   KIT_FORM_ID_SENIORS     — the numeric ID of the "Seniors Free Sample" (EN) Kit form
//   KIT_FORM_ID_KIDS_PL     — the numeric ID of the "Kids Free Sample PL" Kit form
//   KIT_FORM_ID_SENIORS_PL  — the numeric ID of the "Seniors Free Sample PL" Kit form
//
// EN/PL split (2026-08-27): Kit's confirmation email copy and post-confirm
// PDF delivery are both per-form settings, not dynamic per submission — so
// each language needs its own Kit form. The /free-samples (EN) page sends
// list "kids" / "seniors"; the /pl/free-samples page sends "kids-pl" /
// "seniors-pl". Each maps to its own form below, with its own (translated)
// confirmation email already configured in Kit.
//
// Kit integration note (2026-08-27): the single-step "add subscriber to
// form by email address" endpoint (POST /v4/forms/{id}/subscribers with
// {email_address}) returns 404 for this Kit account for reasons Kit
// support could not immediately explain — confirmed not a plan
// restriction, confirmed the form IDs are correct and exist, confirmed
// reproducible across every form on the account. The two-step flow below
// (create/upsert the subscriber, then attach them to the form by numeric
// subscriber ID) was verified working end-to-end, including the double
// opt-in confirmation email. If Kit later fixes the single-step endpoint,
// this can be simplified back to one call.

interface Env {
  TURNSTILE_SECRET_KEY: string;
  KIT_API_KEY: string;
  KIT_FORM_ID_KIDS: string;
  KIT_FORM_ID_SENIORS: string;
  KIT_FORM_ID_KIDS_PL: string;
  KIT_FORM_ID_SENIORS_PL: string;
}

const FORM_ID_BY_LIST: Record<string, keyof Env> = {
  kids: "KIT_FORM_ID_KIDS",
  seniors: "KIT_FORM_ID_SENIORS",
  "kids-pl": "KIT_FORM_ID_KIDS_PL",
  "seniors-pl": "KIT_FORM_ID_SENIORS_PL",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_request" }, 400);
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const list = typeof payload.list === "string" ? payload.list : "";
  const token = typeof payload.token === "string" ? payload.token : "";
  const honeypot = typeof payload.company === "string" ? payload.company.trim() : "";

  // Honeypot: a real visitor never sees or fills this field. Report a fake
  // "success" so bots don't learn their submission was rejected.
  if (honeypot) {
    return json({ ok: true });
  }

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: "invalid_email" }, 400);
  }
  if (name.length > 100) {
    return json({ ok: false, error: "invalid_name" }, 400);
  }
  if (!list || !(list in FORM_ID_BY_LIST)) {
    return json({ ok: false, error: "invalid_list" }, 400);
  }
  if (!token) {
    return json({ ok: false, error: "missing_captcha" }, 400);
  }

  // 1. Verify the Turnstile token server-side. This is the step that
  // actually matters — never trust a token just because it was present
  // in the request body.
  let verifyData: { success: boolean };
  try {
    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: request.headers.get("CF-Connecting-IP") ?? undefined,
        }),
      }
    );
    verifyData = await verifyRes.json();
  } catch {
    return json({ ok: false, error: "captcha_unreachable" }, 502);
  }
  if (!verifyData.success) {
    return json({ ok: false, error: "captcha_failed" }, 400);
  }

  // 2. Create (or upsert) the subscriber in Kit, then attach them to the
  // correct form. Kit owns the double opt-in confirmation email from here
  // on — nothing below marks anyone as subscribed on our side.
  const formId = env[FORM_ID_BY_LIST[list]];

  // 2a. Create/find the subscriber by email. This upserts: if the email
  // already exists in Kit, it just updates the first name.
  let createRes: Response;
  try {
    createRes = await fetch("https://api.kit.com/v4/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kit-Api-Key": env.KIT_API_KEY,
      },
      body: JSON.stringify(
        name ? { email_address: email, first_name: name } : { email_address: email }
      ),
    });
  } catch {
    return json({ ok: false, error: "subscribe_unreachable" }, 502);
  }

  if (!createRes.ok) {
    return json({ ok: false, error: "subscribe_failed" }, 502);
  }

  const createBody = (await createRes.json()) as { subscriber?: { id?: number } };
  const subscriberId = createBody.subscriber?.id;

  if (!subscriberId) {
    return json({ ok: false, error: "subscribe_failed" }, 502);
  }

  // 2b. Attach the subscriber to the correct form. This is what actually
  // triggers Kit's double opt-in confirmation email for this form/sequence.
  let attachRes: Response;
  try {
    attachRes = await fetch(
      `https://api.kit.com/v4/forms/${formId}/subscribers/${subscriberId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Kit-Api-Key": env.KIT_API_KEY,
        },
        body: JSON.stringify({
          referrer: request.headers.get("Referer") ?? undefined,
        }),
      }
    );
  } catch {
    return json({ ok: false, error: "subscribe_unreachable" }, 502);
  }

  if (!attachRes.ok) {
    return json({ ok: false, error: "subscribe_failed" }, 502);
  }

  return json({ ok: true });
};

// Reject every other method explicitly rather than falling through to a
// generic 404/405 from the platform.
export const onRequestGet: PagesFunction = async () =>
  json({ ok: false, error: "method_not_allowed" }, 405);
