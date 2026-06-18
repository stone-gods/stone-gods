#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  GITHUB_PAT="$(
    grep -E '^GITHUB_PAT=' .env | head -1 | cut -d= -f2- | sed "s/^['\"]//; s/['\"]$//" | xargs
  )"
fi

if [[ -z "${GITHUB_PAT:-}" ]]; then
  echo "Error: GITHUB_PAT is not set in .env"
  echo "Add a GitHub PAT with repo access: https://github.com/settings/tokens"
  exit 1
fi

if [[ $# -eq 0 ]]; then
  set -- origin "$(git branch --show-current)"
fi

exec git -c "http.extraHeader=AUTHORIZATION: bearer ${GITHUB_PAT}" push "$@"
