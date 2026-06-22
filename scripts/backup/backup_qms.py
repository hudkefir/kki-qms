#!/usr/bin/env python3
"""QMS hourly cloud backup.

Backs up one or more Supabase "domains" (e.g. production, qms) to a Google
Cloud Storage bucket with timestamped keys, then verifies the uploaded object
is non-empty. No backup artifact is left on local disk — the temp dump is
removed after upload.

Per-domain dump strategy (auto-selected):
  1. `db_url`  present -> `pg_dump <db_url>`            (full schema + data)
  2. `project_url` + `secret_key` -> Supabase REST export (all table rows)
  3. otherwise the domain is skipped with a warning.

Credentials are read from files at runtime; nothing is hardcoded. Config:
  ~/.openclaw/secrets/qms-backup-domains.json   (see domains.example.json)

Usage:
  backup_qms.py                 # back up every configured domain
  backup_qms.py --domain qms    # back up a single domain
  backup_qms.py --domain qms --dump-only   # dump + verify locally, no upload
  backup_qms.py --config /path/to/config.json
"""
import argparse
import gzip
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

DEFAULT_CONFIG = os.path.expanduser("~/.openclaw/secrets/qms-backup-domains.json")


def log(msg):
    print(f"[backup {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}] {msg}", flush=True)


def expand(p):
    return os.path.expanduser(p) if isinstance(p, str) else p


def load_config(path):
    with open(path) as f:
        return json.load(f)


def require_bucket(cfg):
    if not cfg.get("bucket"):
        raise SystemExit(
            "ERROR: config 'bucket' is empty. Set it to your GCS backup bucket, "
            "e.g. \"gs://kki-qms-backups\"."
        )


def resolve_domain_creds(name, dconf):
    """Return a dict with one of: pg (conn dict)  OR  db_url  OR  (project_url, secret_key).

    Secrets are read from files at runtime; nothing is hardcoded. The pg path is
    preferred for completeness — it connects as the DB superuser and so is not
    subject to the per-table SELECT grants that gate the Supabase REST API."""
    dconf = dict(dconf)
    pgf = dconf.get("pg_secret_file")
    if pgf and not dconf.get("pg"):
        with open(expand(pgf)) as f:
            pg = json.load(f)
        dconf["pg"] = {
            "host": pg["host"], "port": str(pg.get("port", "5432")),
            "user": pg.get("user", "postgres"),
            "database": pg.get("database", "postgres"),
            "password": pg["password"],
        }
    src = dconf.get("source_file")
    if src:
        with open(expand(src)) as f:
            sd = json.load(f)
        # Supabase secret file uses project_url / secret_key
        dconf.setdefault("project_url", sd.get("project_url"))
        dconf.setdefault("secret_key", sd.get("secret_key") or sd.get("service_key"))
    skf = dconf.get("secret_key_file")
    if skf and not dconf.get("secret_key"):
        with open(expand(skf)) as f:
            dconf["secret_key"] = json.load(f)[dconf.get("secret_key_field", "secret_key")]
    return dconf


# ───────────────────────── dump strategies ─────────────────────────

def _table_patterns(dconf):
    """pg_dump -t patterns mirroring _scope_tables: prefix -> 'prefix*', exact -> name."""
    args = []
    for p in dconf.get("include_prefixes") or []:
        args += ["-t", f"{p}*"]
    for t in dconf.get("include_tables") or []:
        args += ["-t", t]
    return args


def dump_pg(conn, out_path, dconf=None):
    """Logical (plain-SQL) pg_dump, gzipped. `conn` is a libpq URL string or a
    dict of host/port/user/database/password. When include_prefixes/include_tables
    are set, only those tables are dumped (per-domain logical export)."""
    pg_dump = _find_pg_dump()
    if not pg_dump:
        raise RuntimeError("pg configured but pg_dump not found on PATH")
    cmd = [pg_dump, "--no-owner", "--no-privileges"]
    env = dict(os.environ)
    if isinstance(conn, dict):
        cmd += ["-h", conn["host"], "-p", str(conn.get("port", "5432")),
                "-U", conn.get("user", "postgres"), "-d", conn.get("database", "postgres")]
        env["PGPASSWORD"] = conn["password"]
        target = f"{conn.get('user','postgres')}@{conn['host']}/{conn.get('database','postgres')}"
    else:
        cmd.append(conn)
        target = "db_url"
    scope = _table_patterns(dconf or {})
    cmd += scope
    log(f"  pg_dump {target}" + (f" (scoped: {len(scope)//2} patterns)" if scope else " (full)"))
    with gzip.open(out_path, "wb") as gz:
        proc = subprocess.run(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if proc.returncode != 0:
            raise RuntimeError(f"pg_dump failed: {proc.stderr.decode()[:500]}")
        gz.write(proc.stdout)
    return {"strategy": "pg_dump", "scoped": bool(scope), "patterns": len(scope) // 2}


def _find_pg_dump():
    from shutil import which
    for cand in ("pg_dump", "/opt/homebrew/opt/libpq/bin/pg_dump",
                 "/usr/local/opt/libpq/bin/pg_dump", "/opt/homebrew/bin/pg_dump"):
        p = which(cand) if "/" not in cand else (cand if os.path.exists(cand) else None)
        if p:
            return p
    return None


def _rest_get(url, secret_key, extra_headers=None):
    headers = {"apikey": secret_key, "Authorization": f"Bearer {secret_key}"}
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp, resp.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:300]
        raise RuntimeError(f"HTTP {e.code} from {url.split('?')[0]}: {detail}") from None


def _list_tables(project_url, secret_key):
    """PostgREST root returns an OpenAPI doc whose `definitions` keys are tables."""
    url = project_url.rstrip("/") + "/rest/v1/"
    _, body = _rest_get(url, secret_key)
    spec = json.loads(body)
    tables = sorted(spec.get("definitions", {}).keys())
    # `definitions` may include RPC return types; only keep ones exposed as paths
    paths = {p.strip("/").split("/")[0] for p in spec.get("paths", {}) if p.startswith("/") and p != "/"}
    if paths:
        tables = [t for t in tables if t in paths]
    return tables


def _scope_tables(tables, dconf):
    """Restrict to a single domain's tables via include_prefixes / include_tables.
    With neither configured, every table is kept (whole-instance export)."""
    prefixes = dconf.get("include_prefixes") or []
    exact = set(dconf.get("include_tables") or [])
    if not prefixes and not exact:
        return tables
    return [t for t in tables
            if t in exact or any(t == p or t.startswith(p) for p in prefixes)]


def _fetch_table(project_url, secret_key, table, page=1000):
    base = project_url.rstrip("/") + "/rest/v1/" + urllib.parse.quote(table)
    rows, offset = [], 0
    while True:
        url = f"{base}?select=*&limit={page}&offset={offset}"
        _, body = _rest_get(url, secret_key)
        chunk = json.loads(body)
        rows.extend(chunk)
        if len(chunk) < page:
            break
        offset += page
    return rows


def dump_supabase_rest(project_url, secret_key, domain, out_path, dconf=None):
    if not project_url or not secret_key:
        raise RuntimeError("project_url and secret_key required for REST export")
    log(f"  Supabase REST export {project_url}")
    tables = _list_tables(project_url, secret_key)
    if dconf:
        scoped = _scope_tables(tables, dconf)
        if scoped != tables:
            log(f"  scoped {len(scoped)}/{len(tables)} tables to domain '{domain}'")
        tables = scoped
    if not tables:
        raise RuntimeError(f"no tables matched scope for domain '{domain}'")
    log(f"  {len(tables)} tables to export")
    export = {
        "_meta": {
            "domain": domain,
            "project_url": project_url,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "strategy": "supabase_rest",
            "tables": {},
        },
        "tables": {},
    }
    for t in tables:
        rows = _fetch_table(project_url, secret_key, t)
        export["tables"][t] = rows
        export["_meta"]["tables"][t] = len(rows)
    with gzip.open(out_path, "wt", encoding="utf-8") as gz:
        json.dump(export, gz, default=str)
    return {"strategy": "supabase_rest", "table_count": len(tables),
            "row_total": sum(export["_meta"]["tables"].values())}


def dump_domain(name, dconf, out_path):
    if dconf.get("pg"):
        return dump_pg(dconf["pg"], out_path, dconf)
    if dconf.get("db_url"):
        return dump_pg(dconf["db_url"], out_path, dconf)
    if dconf.get("project_url") and dconf.get("secret_key"):
        return dump_supabase_rest(dconf["project_url"], dconf["secret_key"], name, out_path, dconf)
    raise RuntimeError("no usable credentials (need pg/db_url OR project_url+secret_key)")


# ───────────────────────── GCS upload + verify ─────────────────────────

def _gcloud_env(cfg):
    env = dict(os.environ)
    cfgdir = expand(cfg.get("gcloud_config_dir", "~/.openclaw/gcloud-backup"))
    env["CLOUDSDK_CONFIG"] = cfgdir
    return env, cfgdir


def _ensure_sa_active(cfg):
    """Activate the backup service account inside an isolated gcloud config
    (does not touch the user's default ~/.config/gcloud)."""
    env, cfgdir = _gcloud_env(cfg)
    sa = expand(cfg["gcs_service_account"])
    with open(sa) as f:
        email = json.load(f)["client_email"]
    # Already active?
    r = subprocess.run(["gcloud", "auth", "list", "--filter=status:ACTIVE",
                        "--format=value(account)"], env=env, capture_output=True, text=True)
    if email not in (r.stdout or ""):
        subprocess.run(["gcloud", "auth", "activate-service-account",
                        f"--key-file={sa}", "--quiet"], env=env,
                       check=True, capture_output=True, text=True)
    return env, email


def upload_and_verify(cfg, local_path, gcs_key):
    env, email = _ensure_sa_active(cfg)
    bucket = cfg["bucket"].rstrip("/")
    dest = f"{bucket}/{gcs_key}"
    log(f"  uploading -> {dest}")
    up = subprocess.run(["gcloud", "storage", "cp", local_path, dest, "--quiet"],
                        env=env, capture_output=True, text=True)
    if up.returncode != 0:
        raise RuntimeError(f"upload failed: {up.stderr[:500]}")
    # Verify: object exists AND size > 0
    desc = subprocess.run(["gcloud", "storage", "objects", "describe", dest,
                           "--format=value(size)"], env=env, capture_output=True, text=True)
    if desc.returncode != 0:
        raise RuntimeError(f"verification (describe) failed: {desc.stderr[:500]}")
    size = int((desc.stdout or "0").strip() or "0")
    if size <= 0:
        raise RuntimeError(f"verification FAILED: uploaded object is empty ({dest})")
    log(f"  verified non-empty: {size} bytes at {dest}")
    return dest, size


# ───────────────────────── orchestration ─────────────────────────

def backup_one(cfg, name, dconf, dump_only=False):
    dconf = resolve_domain_creds(name, dconf)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    d = datetime.now(timezone.utc)
    ext = "sql.gz" if (dconf.get("pg") or dconf.get("db_url")) else "json.gz"
    fname = f"{name}-{ts}.{ext}"
    gcs_key = f"{name}/{d:%Y/%m/%d}/{fname}"
    log(f"domain '{name}': starting")
    with tempfile.TemporaryDirectory(prefix="qms-backup-") as tmp:
        out = os.path.join(tmp, fname)
        meta = dump_domain(name, dconf, out)
        local_size = os.path.getsize(out)
        if local_size <= 0:
            raise RuntimeError(f"dump produced an empty file for '{name}'")
        log(f"  dump ok: {local_size} bytes ({meta})")
        if dump_only:
            log(f"domain '{name}': dump-only OK (upload skipped)")
            return {"domain": name, "ok": True, "dump_only": True,
                    "local_size": local_size, **meta}
        dest, size = upload_and_verify(cfg, out, gcs_key)
        log(f"domain '{name}': DONE -> {dest} ({size} bytes)")
        return {"domain": name, "ok": True, "object": dest, "size": size, **meta}


def main():
    ap = argparse.ArgumentParser(description="QMS hourly cloud backup")
    ap.add_argument("--config", default=DEFAULT_CONFIG)
    ap.add_argument("--domain", help="back up only this domain")
    ap.add_argument("--dump-only", action="store_true",
                    help="dump + verify locally, skip GCS upload")
    args = ap.parse_args()

    cfg = load_config(args.config)
    if not args.dump_only:
        require_bucket(cfg)
    domains = cfg["domains"]
    if args.domain:
        if args.domain not in domains:
            raise SystemExit(f"unknown domain '{args.domain}'. Known: {list(domains)}")
        domains = {args.domain: domains[args.domain]}

    results, failures = [], 0
    for name, dconf in domains.items():
        try:
            results.append(backup_one(cfg, name, dconf, dump_only=args.dump_only))
        except Exception as e:
            failures += 1
            log(f"domain '{name}': FAILED — {e}")
            results.append({"domain": name, "ok": False, "error": str(e)})

    log(f"summary: {len(results) - failures}/{len(results)} domains ok")
    status = {
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "ok": failures == 0,
        "failures": failures,
        "domains_total": len(results),
        "dump_only": args.dump_only,
        "results": results,
    }
    write_status(cfg, status)
    print(json.dumps(status, default=str))
    sys.exit(1 if failures else 0)


def write_status(cfg, status):
    """Persist a machine-readable status file (mirrors the production job's
    /tmp/kki-backup-status.json convention, namespaced to QMS)."""
    path = expand(cfg.get("status_file", "/tmp/qms-backup-status.json"))
    try:
        with open(path, "w") as f:
            json.dump(status, f, default=str, indent=2)
        log(f"status written -> {path}")
    except OSError as e:
        log(f"WARN: could not write status file {path}: {e}")


if __name__ == "__main__":
    main()
