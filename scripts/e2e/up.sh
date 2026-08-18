#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
state_file="$repo_root/e2e/.runtime.env"
compose_file="$repo_root/e2e/stack.compose.yml"
node_command="${E2E_NODE_BIN:-node}"
pnpm_command="${E2E_PNPM_BIN:-pnpm}"
corepack_home="${E2E_COREPACK_HOME:-}"
studio_port="${E2E_STUDIO_PORT:-4211}"

command -v docker >/dev/null || {
  printf 'docker is required\n' >&2
  exit 1
}
command -v openssl >/dev/null || {
  printf 'openssl is required for ephemeral E2E credentials\n' >&2
  exit 1
}
if ! node_bin="$(command -v "$node_command")"; then
  printf 'Node.js 22.13+ is required; set E2E_NODE_BIN or add node to PATH\n' >&2
  exit 1
fi
if ! pnpm_bin="$(command -v "$pnpm_command")"; then
  printf 'pnpm 11.21.0 is required; set E2E_PNPM_BIN or add pnpm to PATH\n' >&2
  exit 1
fi

build_path="$(dirname "$pnpm_bin"):$(dirname "$node_bin")${PATH:+:$PATH}"

host_pnpm() {
  if [[ -n "$corepack_home" ]]; then
    PATH="$build_path" COREPACK_HOME="$corepack_home" "$pnpm_bin" "$@"
  else
    PATH="$build_path" "$pnpm_bin" "$@"
  fi
}

node_version="$("$node_bin" -p 'process.versions.node')"
if ! "$node_bin" -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 13) ? 0 : 1)'; then
  printf 'Node.js 22.13+ is required; E2E_NODE_BIN reports %s\n' "$node_version" >&2
  exit 1
fi
pnpm_version="$(host_pnpm --version)"
if [[ "$pnpm_version" != "11.21.0" ]]; then
  printf 'pnpm 11.21.0 is required; E2E_PNPM_BIN reports %s\n' "$pnpm_version" >&2
  exit 1
fi

if test -f "$state_file"; then
  printf 'an E2E stack is already recorded in %s; run scripts/e2e/down.sh first\n' "$state_file" >&2
  exit 1
fi

if nc -z 127.0.0.1 "$studio_port" >/dev/null 2>&1; then
  printf 'port %s is already in use; set E2E_STUDIO_PORT to a free port\n' "$studio_port" >&2
  exit 1
fi

printf 'Building scoped Studio artifact on host Node %s...\n' "$node_version"
host_pnpm --filter @eightstate/studio build

test -f "$repo_root/packages/eightstate-studio/dist/index.html" || {
  printf 'Studio build did not produce packages/eightstate-studio/dist/index.html\n' >&2
  exit 1
}
run_id="$(date -u +%Y%m%d%H%M%S)-$(openssl rand -hex 3)"
project_name="eightstate-studio-e2e-$run_id"
api_key="e2e-$(openssl rand -hex 24)"
postgres_password="$(openssl rand -hex 24)"
clickhouse_password="$(openssl rand -hex 24)"

umask 077
{
  printf 'COMPOSE_PROJECT_NAME=%s\n' "$project_name"
  printf 'E2E_STUDIO_PORT=%s\n' "$studio_port"
  printf 'E2E_BASE_URL=http://127.0.0.1:%s\n' "$studio_port"
  printf 'E2E_ADMIN_EMAIL=e2e@example.invalid\n'
  printf 'E2E_API_KEY=%s\n' "$api_key"
  printf 'POSTGRES_PASSWORD=%s\n' "$postgres_password"
  printf 'CLICKHOUSE_PASSWORD=%s\n' "$clickhouse_password"
} >"$state_file"

set -a
# shellcheck disable=SC1090
source "$state_file"
set +a

compose=(docker compose --env-file "$state_file" -f "$compose_file")

cleanup_failed_start() {
  status=$?
  if ((status != 0)); then
    "${compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
    rm -f "$state_file"
  fi
  exit "$status"
}
trap cleanup_failed_start EXIT

"${compose[@]}" up --build --detach --wait
"$node_bin" "$repo_root/scripts/e2e/wait-for-stack.mjs"

trap - EXIT
printf 'EightState Studio E2E stack is ready at %s\n' "$E2E_BASE_URL"
printf 'Run: scripts/e2e/run-maestro.sh\n'
