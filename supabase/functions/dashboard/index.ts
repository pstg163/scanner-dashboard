import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;
const CLIP_TTL = 3600;
const ALERT_COLUMNS = [
  "id",
  "created_at",
  "updated_at",
  "event_time",
  "event_ts",
  "county",
  "town",
  "address",
  "lat",
  "lng",
  "category",
  "priority",
  "title",
  "summary",
  "transcript",
  "snippet",
  "source_type",
  "source_feed_id",
  "source_name",
  "source_url",
  "clip_path",
  "dedupe_key",
  "is_update",
  "is_merged",
  "escalations",
  "tags",
  "geocode_status",
  "raw",
].join(", ");

/** Fields the detail page shows. `raw` itself stays off the client payload. */
const DISPLAY_KEYS = [
  "listen_url",
  "map",
  "cross_streets",
  "agency",
  "place",
  "incident_id",
  "call_type",
  "cad_time",
  "status",
  "transmission_time",
  "correction_note",
] as const;

function attachDisplayFields(row: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!row) return null;
  const raw = row.raw;
  const bag = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const extras: Record<string, string | null> = { listen_url: null };
  for (const key of DISPLAY_KEYS) {
    const value = bag[key];
    if (typeof value === "string" && value.trim()) extras[key] = value.trim();
  }
  const { raw: _raw, ...rest } = row;
  return { ...rest, ...extras };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

const SHORT_CODE = /^[A-Za-z0-9]{6,8}$/;

/** Exact id first; if the client passed a short suffix, resolve to the newest match. */
async function findAlertById(
  admin: SupabaseClient,
  id: string,
  columns: string,
) {
  const exact = await admin.from("alerts").select(columns).eq("id", id).maybeSingle();
  if (exact.error || exact.data || !SHORT_CODE.test(id)) return exact;
  const suffix = await admin
    .from("alerts")
    .select(columns)
    .like("id", `%-${id}`)
    .order("event_time", { ascending: false })
    .limit(2);
  if (suffix.error) return suffix;
  const rows = suffix.data ?? [];
  return { data: rows[0] ?? null, error: null };
}

function parseLimit(raw: string | null): number {
  const n = Number(raw ?? DEFAULT_LIMIT);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

function applyFilters(query: ReturnType<SupabaseClient["from"]> extends infer T ? any : never, url: URL) {
  const county = url.searchParams.get("county");
  const town = url.searchParams.get("town");
  const category = url.searchParams.get("category");
  const sourceType = url.searchParams.get("source_type");
  const priority = url.searchParams.get("priority");
  if (county) query = query.ilike("county", county);
  if (town) query = query.ilike("town", town);
  if (category) query = query.ilike("category", category);
  if (sourceType) query = query.eq("source_type", sourceType);
  if (priority !== null && priority !== "") {
    const p = Number(priority);
    if (Number.isFinite(p)) query = query.eq("priority", p);
  }
  return query;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  // Read-only: list, get, and clip. Writes go through the ingest function, which still requires its secret.
  if (req.method !== "GET") {
    return json({ error: "method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "server misconfigured" }, 500);
  const admin = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "list";
  const serverTime = new Date().toISOString();

  try {
    if (action === "list") {
      const limit = parseLimit(url.searchParams.get("limit"));
      const since = url.searchParams.get("since");
      let q = admin.from("alerts").select(ALERT_COLUMNS);
      q = applyFilters(q, url);
      if (since) {
        q = q.gt("updated_at", since).order("updated_at", { ascending: true }).order("id", { ascending: true });
      } else {
        q = q.order("event_time", { ascending: false }).order("id", { ascending: false });
      }
      const { data, error } = await q.limit(limit);
      if (error) return json({ error: error.message }, 400);
      const rows = data ?? [];
      // Initial load: next poll uses server_time.
      // Incremental page that filled the limit: continue from the last updated_at.
      // Partial incremental page: jump to server_time so empty polls still advance.
      let pollAfter = serverTime;
      if (since && rows.length === limit && rows[rows.length - 1]?.updated_at) {
        pollAfter = rows[rows.length - 1].updated_at;
      }
      return json({
        ok: true,
        action: "list",
        alerts: rows.map((row) => attachDisplayFields(row as Record<string, unknown>)),
        count: rows.length,
        limit,
        since: since || null,
        server_time: serverTime,
        // Client should pass this back as `since` on the next 10–15s poll.
        poll_after: pollAfter,
      });
    }

    if (action === "get") {
      const id = url.searchParams.get("id") ?? "";
      if (!id) return json({ error: "id is required" }, 400);
      const { data, error } = await findAlertById(admin, id, ALERT_COLUMNS);
      if (error) return json({ error: error.message }, 400);
      if (!data) return json({ error: "not found" }, 404);
      return json({ ok: true, action: "get", alert: attachDisplayFields(data as Record<string, unknown>), server_time: serverTime });
    }

    if (action === "clip") {
      const id = url.searchParams.get("id") ?? "";
      if (!id) return json({ error: "id is required" }, 400);
      const { data, error } = await findAlertById(admin, id, "id, clip_path");
      if (error) return json({ error: error.message }, 400);
      if (!data) return json({ error: "not found" }, 404);
      if (!data.clip_path) return json({ error: "no clip" }, 404);
      const { data: signed, error: signErr } = await admin.storage
        .from("clips")
        .createSignedUrl(data.clip_path, CLIP_TTL);
      if (signErr || !signed?.signedUrl) {
        return json({ error: signErr?.message ?? "sign failed" }, 400);
      }
      return json({
        ok: true,
        action: "clip",
        id: data.id,
        clip_path: data.clip_path,
        signed_url: signed.signedUrl,
        expires_in: CLIP_TTL,
        server_time: serverTime,
      });
    }

    return json({ error: `unknown action: ${action}` }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
