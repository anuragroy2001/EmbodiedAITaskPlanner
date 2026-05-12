#!/usr/bin/env bash
set -e

SESSION="rpg"
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Kill existing session if it exists
if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "Killing existing tmux session '$SESSION'..."
  tmux kill-session -t "$SESSION"
fi

# Create new session with backend in the first window
tmux new-session -d -s "$SESSION" -n backend -x 220 -y 50

# Backend window: activate venv if present, then run uvicorn
tmux send-keys -t "$SESSION:backend" "cd '$ROOT/backend'" Enter
tmux send-keys -t "$SESSION:backend" "[[ -d .venv ]] && source .venv/bin/activate; python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000" Enter

# Frontend window
tmux new-window -t "$SESSION" -n frontend
tmux send-keys -t "$SESSION:frontend" "cd '$ROOT/frontend' && npm run dev" Enter

# Attach to the session
tmux attach-session -t "$SESSION"
