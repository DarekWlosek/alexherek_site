# AlexHerek.com — kontekst projektu

Strona autorska/sprzedażowa dla marki wydawniczej Alex Herek (Amazon KDP) — dwie grupy docelowe: rodzice/opiekunowie dzieci (kolorowanki, np. seria "Children of the World and Their Cultures") oraz seniorzy (książki do treningu mózgu / niedominującej ręki, łamigłówki — np. "Left Hand Brain Training for Seniors", "Sharp Mind").

## Stack i deployment

- Framework: **Astro** (output: static), i18n: `en` (domyślny, bez prefiksu) + `pl` (prefiks `/pl/`).
- Hosting: **Cloudflare Pages**, projekt `alexherek-site`.
- Repo: GitHub `DarekWlosek/alexherek_site`, branch `main`. Push na `main` → automatyczny deployment Production.
- Domena `alexherek.com` **jeszcze nie jest opublikowana/aktywna** (stan na 2026-08-27). Do testów używaj adresu branch-alias `https://alexherek-site.pages.dev` (zawsze wskazuje na aktualny Production deployment) albo adresu konkretnego, najnowszego deploymentu z hashem (`https://<hash>.alexherek-site.pages.dev`).

### ⚠️ Pułapka: przypięte adresy deploymentów (*.pages.dev z hashem)

Każdy deployment w Cloudflare Pages ma **własny, trwały adres z hashem** (np. `https://7a966eab.alexherek-site.pages.dev`). Taki adres to **zamrożony snapshot** tego konkretnego builda — NIE aktualizuje się, gdy:
- powstanie nowszy deployment,
- w ustawieniach projektu dodasz/zmienisz zmienną środowiskową.

Testując po zmianach zawsze używaj branch-alias URL (bez hasha) albo adresu **najnowszego** deploymentu — inaczej dostaniesz fałszywie negatywny wynik testu.

### ⚠️ Pułapka: nowe zmienne środowiskowe wymagają nowego deploymentu

W Cloudflare Pages Functions:
- Zmiana **wartości** istniejącej zmiennej środowiskowej działa natychmiast, bez redeployu.
- Dodanie **nowej nazwy** zmiennej NIE zostaje podpięte do już wdrożonego deploymentu — potrzebny jest świeży deployment (redeploy albo nowy push), żeby Function ją "zobaczyła".

Dodatkowo: przycisk "Retry deployment" w Cloudflare potrafi wyglądać na zawieszony (status "active") przez kilka minut na stronie szczegółów deploymentu, mimo że w rzeczywistości już się zakończył — sprawdzaj listę deploymentów, nie tylko stronę szczegółów.

## Struktura treści (content collections)

Każda książka/seria ma **osobny plik danych na język** — nie ma jednego wspólnego rekordu EN/PL:

- `src/content/senior-series/*.md` — dane książek seniorskich EN
- `src/content/pl-senior-series/*.md` — dane książek seniorskich PL
- `src/content/kids-series/*.md` — dane serii dziecięcych EN
- `src/content/pl-kids-series/*.md` — dane serii dziecięcych PL
- `src/content/blog-seniors/`, `blog-kids/`, `blog-seniors-pl/`, `blog-kids-pl/` — posty blogowe

### ⚠️ Pułapka: `heroImage` kopiowany EN→PL (lub odwrotnie) bez podmiany

**2026-08-27:** strona EN `/seniors/left-hand-brain-training/` pokazywała okładkę PL, bo w `src/content/senior-series/left-hand-brain-training.md` pole `heroImage` wskazywało na `/images/lhbt-hero.jpg` (plik z polską okładką) zamiast na `/images/lhbt-cover-en.jpg` (poprawny angielski odpowiednik). Przyczyna: dane PL najwyraźniej skopiowano do pliku EN bez podmiany ścieżki obrazka.

**Zasada na przyszłość:** przy tworzeniu/edycji pary plików EN/PL dla tej samej książki/serii zawsze sprawdź, czy pole `heroImage` (i inne pola ze ścieżkami do obrazków) różni się między wersją EN i PL, jeśli obrazek zawiera tekst/okładkę w danym języku. W `public/images/` obrazy z okładkami książek mają zwykle warianty typu `<slug>-hero.jpg` (PL, częściej "domyślny") oraz `<slug>-cover-en.jpg` (EN) — nie zakładaj, że jeden plik pasuje do obu języków.

## Formularze zapisu (lead magnets) — `functions/api/subscribe.ts`

- Cloudflare Pages Function obsługująca POST z formularzy na `/free-samples` i `/pl/free-samples`.
- Turnstile CAPTCHA weryfikowany server-side. Token Turnstile jest **jednorazowy** — przy ponownym teście trzeba odświeżyć/wygenerować widget na nowo, inaczej dostaniesz błąd `captcha_failed` (400), co można pomylić z prawdziwym błędem integracji.
- Integracja z Kit (ConvertKit) — **dwuetapowa**: (1) POST `/v4/subscribers` tworzy/upsertuje subskrybenta, (2) POST `/v4/forms/{id}/subscribers/{subscriberId}` dopina go do formularza (to wyzwala e-mail z potwierdzeniem double opt-in). Jednoetapowy endpoint Kit (`POST /v4/forms/{id}/subscribers` z samym e-mailem) zwracał 404 dla tego konta — przyczyna niewyjaśniona przez support Kit, stąd dwuetapowy flow.
- 4 osobne formularze Kit (Kids-EN, Kids-PL, Seniors-EN, Seniors-PL) — każdy z własnym, przetłumaczonym e-mailem potwierdzającym i (docelowo) własnym linkiem do pliku PDF po potwierdzeniu.
- Wymagane zmienne środowiskowe Cloudflare (Production **i** Preview, typ Secret): `TURNSTILE_SECRET_KEY`, `KIT_API_KEY`, `KIT_FORM_ID_KIDS`, `KIT_FORM_ID_SENIORS`, `KIT_FORM_ID_KIDS_PL`, `KIT_FORM_ID_SENIORS_PL`.

## Workflow pracy nad kodem

Ta sesja Claude (Cowork) **nie ma bezpośredniego dostępu** do lokalnego repozytorium użytkownika — nie ma podłączonego mostka do jego komputera. Właściciel repo uruchamia polecenia PowerShell samodzielnie i wkleja wynik z powrotem. Preferuje **pojedyncze, samodzielne bloki komend** (bez łączenia wielu niepowiązanych poleceń w jednej wiadomości) — łatwiej mu je ogarnąć.

Lokalna ścieżka repo: `C:\Users\wlose\Downloads\alexherek-astro-site\alexherek-site` (Pulpit przekierowany przez OneDrive).
