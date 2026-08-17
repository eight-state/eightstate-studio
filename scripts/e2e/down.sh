#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
state_file="$repo_root/e2e/.runtime.env"
compose_file="$repo_root/e2e/stack.compose.yml"

if ! test -f "$state_file"; then
  printf 'no E2E runtime state found; nothing to stop\n'
  exit 0
fi

set -a
# shellcheck disable=SC1090
source "$state_file"
set +a

docker compose --env-file "$state_file" -f "$compose_file" down --volumes --remove-orphans
rm -f "$state_file"
printf 'Removed the %s stack, its project-scoped volumes, and ephemeral credentials.\n' "$COMPOSE_PROJECT_NAME"
