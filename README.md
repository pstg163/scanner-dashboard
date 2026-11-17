# Scanner Bot

Mobile dashboard for live police, fire, and EMS alerts in Ontario, Seneca, Wayne, Yates, Monroe, Cayuga, and Onondaga counties. It is a static single-page app: a live alert list, a per-alert page, and an OpenStreetMap view. The feed is public and does not use a PIN.

Deep links should use a query on the site root, which GitHub Pages (and other static hosts) serve
as `index.html` with HTTP 200. Path-only routes such as `/alert/<id>` and `/a/<short-code>` fall
back to `404.html` and return HTTP 404; some in-app browsers, including GroupMe on iPhone, treat
that as an error and show a blank page.

```text
/?a=<short-code>
/?alert=<id>
```

`<id>` is the text primary key on `public.alerts` (`<millis>-<8 hex>`). `<short-code>` is that
8-character suffix. The dashboard and its edge function resolve the suffix to the full alert
(most recent match if two ever collide). The app opens that alert directly and stays
on the `/?a=` URL so a refresh still returns 200. At the root of a host, a notification should open:

```text
https://<your-host>/?a=36465abc
```

Under a subpath such as `/scanner/`, the same alert is `https://<your-host>/scanner/?a=36465abc`.

Refreshing the URL still loads the app because unknown paths fall back to `index.html`.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

The dev server listens on port **41731**. Open [http://127.0.0.1:41731](http://127.0.0.1:41731).

`.env` is optional. The same Supabase URL and publishable key are the defaults in `.env.example` and in `src/config.ts`. The dashboard edge function does not require an Authorization header (`verify_jwt` is off). Leave `VITE_SUPABASE_USE_APIKEY` false unless a future function turns JWT checks on. Never put a service-role key in this app.

While `npm run dev` is running, [http://127.0.0.1:41731/?mock=1](http://127.0.0.1:41731/?mock=1) shows a sample feed. That preview is compiled out of production builds.

```bash
npm test
npm run build
# GitHub Pages (must set the repo subpath; do not use the .env Supabase base)
npm run build:pages
```

`npm run build` writes a static site to `dist/`.

## Live site

The dashboard is hosted on GitHub Pages:

https://pstg163.github.io/scanner-dashboard/

Deep link example: https://pstg163.github.io/scanner-dashboard/?a=36465abc

The production build uses `VITE_BASE_PATH=/scanner-dashboard/`. Always set that when building for
GitHub Pages (`npm run build:pages`); the default `.env` base is for the Supabase web function and
will leave the Pages site blank. Unknown paths still fall back to `404.html`, but notification
links should use `/?a=<short-code>` so the response is HTTP 200.

Pages is currently published from the `gh-pages` branch (a prebuilt `dist`). A GitHub Actions
workflow that builds on each push to `main` is checked in at `docs/github-pages-workflow.yml`. It
is not under `.github/workflows/` yet because the token that created this repo lacks the `workflow`
scope. After that scope is granted, copy it to `.github/workflows/pages.yml` and set Pages source
to GitHub Actions.

## Deploy

This repo is a static Vite build. On Vercel:

1. Import the project. Framework preset: Vite.
2. Build command: `npm run build`. Output directory: `dist`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env.example`.
4. `vercel.json` rewrites every path to `/index.html`, so `/alert/<id>` works on a refresh and from a notification.

On any other static host, serve `dist` and rewrite unknown paths to `index.html`.

To serve the app from a subpath, set `VITE_BASE_PATH` before `npm run build`. It becomes Vite's `base` and the React Router basename. The default is `/`.

```bash
# GitHub Pages project site
VITE_BASE_PATH=/<repo>/ npm run build

# A Supabase function path, or any other prefix
VITE_BASE_PATH=/functions/v1/<name>/ npm run build
```

The value needs a leading slash. A trailing slash is added if it is missing. Asset URLs, the manifest, and `/alert/<id>` all stay under that prefix. The host still has to fall back to `index.html` for those alert paths.

The app is an installable PWA (`manifest.webmanifest`, icons, and a network-only service worker). Add it to the home screen from the browser's install prompt or share sheet. Alerts and audio are not cached.

## Access

The dashboard edge function is public and read-only (`list`, `get`, and `clip`). It does not require a PIN. Writes still go through the ingest function, which keeps its own secret.

```text
https://dfquewlihcgbrbhuwlgf.supabase.co/functions/v1/dashboard
```

## Allowlist

This dashboard does not sign in with email. Direct reads of `public.alerts` (the SQL editor, or a client using the publishable key without the edge function) still require a row in `public.allowlist`:

```sql
insert into public.allowlist (email) values ('lowercase@email');
```

The address must already be lowercase. The hosted dashboard does not use this allowlist; it reads through the public edge function.

## How live updates work

Realtime is off, because the browser is not a Supabase user. The app:

1. Loads `GET ?action=list&limit=100` (newest `event_time` first).
2. Every 12 seconds, loads `GET ?action=list&limit=100&since=<poll_after>` from the previous response.
3. If `count === limit`, it immediately asks again with the new `poll_after` before waiting.
4. Rows are merged by `id`, because a later response can be an update of an alert already on screen.

A poll that contains an id the phone has not seen yet plays a chime, flashes that card, and on Android vibrates for priority 4 and 5. The first load is silent, and an update to a row already on screen is silent. Priority 5 is three short tones, priority 4 is a ding, and priority 2 is a soft tone. Minor calls can be set to Silent under Filters. The header speaker mutes every chime and remembers that choice on the phone. The browser only allows sound after a tap, so the keypad and any later tap unlock audio.

County, category, priority, and source are sent to the function. Search and the 1h / 6h / 24h / 7d window are applied on the phone to the loaded rows. Alerts with no latitude or longitude stay in the list and are left off the map.

Alert audio comes from `GET ?action=clip&id=<id>`, which returns a one-hour signed URL for the private `clips` bucket.
