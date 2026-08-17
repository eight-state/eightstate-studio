#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
state_file="$repo_root/e2e/.runtime.env"
node_bin="${E2E_NODE_BIN:-node}"

test -f "$state_file" || {
  printf 'no running E2E stack; run scripts/e2e/up.sh first\n' >&2
  exit 1
}
command -v maestro >/dev/null || {
  printf 'Maestro is not installed; follow e2e/README.md\n' >&2
  exit 1
}
command -v java >/dev/null || {
  printf 'Java 17+ is required by Maestro\n' >&2
  exit 1
}

java_major="$(java -version 2>&1 | awk -F'[\".]' '/version/ { print ($2 == 1 ? $3 : $2); exit }')"
if ! [[ "$java_major" =~ ^[0-9]+$ ]] || ((java_major < 17)); then
  printf 'Maestro requires Java 17+; active java is %s\n' "${java_major:-unknown}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$state_file"
set +a

"$node_bin" "$repo_root/scripts/e2e/wait-for-stack.mjs"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
artifacts="$repo_root/e2e/artifacts/$timestamp"
mkdir -p "$artifacts"

maestro_flows=(
  "$repo_root/e2e/maestro/00-readiness-and-auth.yaml"
  "$repo_root/e2e/maestro/10-agent-builder-absent.yaml"
  "$repo_root/e2e/maestro/20-native-experiment-comparison.yaml"
  "$repo_root/e2e/maestro/30-experiment-lifecycle.yaml"
)

maestro test \
  --headless \
  --screen-size=1440x1000 \
  --format=JUNIT \
  --output="$artifacts/junit.xml" \
  --test-output-dir="$artifacts" \
  -e "E2E_BASE_URL=$E2E_BASE_URL" \
  -e "E2E_API_KEY=$E2E_API_KEY" \
  "${maestro_flows[@]}"

printf 'Maestro artifacts: %s\n' "$artifacts"
