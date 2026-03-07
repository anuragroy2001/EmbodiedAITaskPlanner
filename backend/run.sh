#!/usr/bin/env bash
# Run the backend server. Uses .venv if present. Loads .env from this directory.
set -e
cd "$(dirname "$0")"
if [[ -d .venv ]]; then
  source .venv/bin/activate
fi
exec python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
