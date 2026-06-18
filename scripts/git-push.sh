#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

load_pat_from_env() {
  local line
  line="$(grep -E '^(export )?GITHUB_PAT=' .env 2>/dev/null | head -1 || true)"
  if [[ -z "$line" ]]; then
    return 1
  fi

  GITHUB_PAT="${line#export GITHUB_PAT=}"
  GITHUB_PAT="${GITHUB_PAT#GITHUB_PAT=}"
  GITHUB_PAT="$(printf '%s' "$GITHUB_PAT" | tr -d '\r' | sed 's/^["'"'"' ]*//; s/["'"'"' ]*$//')"
  [[ -n "$GITHUB_PAT" ]]
}

if [[ -f .env ]]; then
  load_pat_from_env || true
fi

if [[ -z "${GITHUB_PAT:-}" ]]; then
  echo "Error: GITHUB_PAT is not set in .env"
  echo "Add: GITHUB_PAT=ghp_...  (classic PAT with repo scope, or fine-grained with Contents: Read and write)"
  echo "Create at: https://github.com/settings/tokens"
  exit 1
fi

origin_url="$(git remote get-url origin)"
repo_path="$(printf '%s' "$origin_url" | sed -E \
  's|^https://[^@/]+@github.com/||;
   s|^https://github.com/||;
   s|^git@github.com:||;
   s|\.git$||')"

branch="${1:-$(git branch --show-current)}"
auth_url="https://x-access-token:${GITHUB_PAT}@github.com/${repo_path}.git"

# Disable osxkeychain so cached tombux76 credentials are not used instead of the PAT.
git -c credential.helper= push "$auth_url" "HEAD:refs/heads/${branch}"

if git rev-parse --abbrev-ref "@{u}" >/dev/null 2>&1; then
  :
else
  git branch --set-upstream-to="origin/${branch}" "${branch}" 2>/dev/null || true
fi

echo "Pushed ${branch} to github.com/${repo_path}"
