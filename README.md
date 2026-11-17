# Scanner Bot

Mobile dashboard for live police, fire, and EMS alerts in Ontario, Seneca, Wayne, Yates, Monroe, Cayuga, and Onondaga counties. It is a static single-page app: a PIN gate, a live alert list, a per-alert page, and an OpenStreetMap view.

Deep links use this path, after `VITE_BASE_PATH` when the app is not hosted at the domain root:

```text
/alert/<id>
```

`<id>` is the text primary key on `public.alerts`. At the root of a host, a push notification should open:

```text
https://<your-host>/alert/1794931957603-36465
```

Under a subpath such as `/scanner/`, the same alert is `https://<your-host>/scanner/alert/1794931957603-36465`.

The phone shows the PIN keypad first if this device has not been unlocked. After a correct PIN, that exact alert opens. Refreshing the URL still loads the app because unknown paths fall back to `index.html`.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

The dev server listens on port **41731**. Open [http://127.0.0.1:41731](http://127.0.0.1:41731).

`.env` is optional. The same Supabase URL and publishable key are the defaults in `.env.example` and in `src/config.ts`. The dashboard edge function does not require an Authorization header (`verify_jwt` is off). Leave `VITE_SUPABASE_USE_APIKEY` false unless a future function turns JWT checks on. Never put a service-role key in this app.

While `npm run dev` is running, [http://127.0.0.1:41731/?mock=1](http://127.0.0.1:41731/?mock=1) shows a sample feed so the UI can be reviewed without a PIN. Any 6-digit code except `000000` is accepted. That preview is compiled out of production builds.

```bash
npm test
npm run build
```

`npm run build` writes a static site to `dist/`.

## Deploy

This repo is a static Vite build. On Vercel:

1. Import the project. Framework preset: Vite.
2. Build command: `npm run build`. Output directory: `dist`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env.example`. Do not set a PIN in the host's environment.
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

## PIN

The keypad sends the 6-digit PIN in the `X-Dashboard-Pin` header to:

```text
https://dfquewlihcgbrbhuwlgf.supabase.co/functions/v1/dashboard
```

A correct PIN is stored in `localStorage` on that phone until you tap **Lock**. A `401` clears it and shows the keypad again. Five failures from the same IP within 15 minutes return `429` with `retry_after` (seconds). The keypad counts down and does not throw away a PIN that was already accepted.

The PIN is not in this repository. Set or rotate it in the Supabase SQL editor. The value has to be 6 digits because that is all the keypad submits.

```sql
update private.dashboard_pins
set
  pin_sha256 = encode(extensions.digest(convert_to('your-six-digit-pin', 'utf8'), 'sha256'), 'hex'),
  updated_at = now()
where id = 'default';
```

Replace `your-six-digit-pin` before running it. Do not commit the PIN or paste it into Vercel.

## Allowlist

This dashboard does not sign in with email. Direct reads of `public.alerts` (the SQL editor, or a client using the publishable key without the edge function) still require a row in `public.allowlist`:

```sql
insert into public.allowlist (email) values ('lowercase@email');
```

The address must already be lowercase. That insert does not grant access to Scanner Bot. Scanner Bot access is the PIN above.

## How live updates work

Realtime is off, because the browser is not a Supabase user. The app:

1. Loads `GET ?action=list&limit=100` (newest `event_time` first).
2. Every 12 seconds, loads `GET ?action=list&limit=100&since=<poll_after>` from the previous response.
3. If `count === limit`, it immediately asks again with the new `poll_after` before waiting.
4. Rows are merged by `id`, because a later response can be an update of an alert already on screen.

County, category, priority, and source are sent to the function. Search and the 1h / 6h / 24h / 7d window are applied on the phone to the loaded rows. Alerts with no latitude or longitude stay in the list and are left off the map.

Alert audio comes from `GET ?action=clip&id=<id>`, which returns a one-hour signed URL for the private `clips` bucket.
