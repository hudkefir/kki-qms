#!/usr/bin/env python3
"""Smoke test: run the backup against ONE domain and assert that a non-empty
object actually landed in the GCS bucket. Prints an explicit PASS / FAIL.

  test_backup.py            # tests the 'qms' domain (override with --domain)
  exit 0 = PASS, 1 = FAIL
"""
import argparse
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import backup_qms as bk  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--domain", default="qms")
    ap.add_argument("--config", default=bk.DEFAULT_CONFIG)
    args = ap.parse_args()

    print(f"=== backup smoke test: domain '{args.domain}' ===")
    cfg = bk.load_config(args.config)

    # Precondition checks with actionable messages (these make a FAIL diagnosable)
    if not cfg.get("bucket"):
        print("FAIL: config 'bucket' is empty — set it to your GCS backup bucket "
              "(e.g. \"gs://kki-qms-backups\") in", args.config)
        return 1
    if args.domain not in cfg["domains"]:
        print(f"FAIL: domain '{args.domain}' not in config")
        return 1

    # 1) Run the real backup (dump -> upload -> internal verify)
    try:
        result = bk.backup_one(cfg, args.domain, cfg["domains"][args.domain], dump_only=False)
    except Exception as e:
        print(f"FAIL: backup raised — {e}")
        return 1

    if not result.get("ok") or not result.get("object"):
        print(f"FAIL: backup did not report a stored object — {result}")
        return 1

    obj = result["object"]

    # 2) INDEPENDENT verification: re-query the bucket for the object + size > 0
    env, _ = bk._ensure_sa_active(cfg)
    desc = subprocess.run(
        ["gcloud", "storage", "objects", "describe", obj, "--format=value(size)"],
        env=env, capture_output=True, text=True)
    if desc.returncode != 0:
        print(f"FAIL: object not found in bucket on independent check — {desc.stderr[:300]}")
        return 1
    size = int((desc.stdout or "0").strip() or "0")
    if size <= 0:
        print(f"FAIL: object exists but is empty — {obj}")
        return 1

    print(f"PASS: object landed in bucket — {obj} ({size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
