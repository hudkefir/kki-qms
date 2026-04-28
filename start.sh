#!/bin/bash
set -e

DATA_DIR="${KKI_DATA_DIR:-/tmp/data}"
mkdir -p "$DATA_DIR"

# Download the real database from GCS if it doesn't exist locally
if [ ! -f "$DATA_DIR/qms.db" ]; then
  echo "Downloading qms.db from GCS..."
  curl -sf -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" \
    > /tmp/token.json

  ACCESS_TOKEN=$(python3 -c "import json; print(json.load(open('/tmp/token.json'))['access_token'])")

  curl -sf -o "$DATA_DIR/qms.db" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    "https://storage.googleapis.com/storage/v1/b/kki-qms-uploads/o/database%2Fqms.db?alt=media"

  echo "Downloaded qms.db ($(du -h "$DATA_DIR/qms.db" | cut -f1))"
  rm -f /tmp/token.json
else
  echo "qms.db already exists locally"
fi

# Start the server
cd /app
exec node server/src/index.js
