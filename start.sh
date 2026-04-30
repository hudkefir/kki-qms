#!/bin/bash
set -e
cd /app
exec node server/src/index.js
