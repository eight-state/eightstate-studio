#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
compose_file="$repo_root/e2e/stack.compose.yml"

node_bin="${E2E_NODE_BIN:-node}"

required_files=(
  "$compose_file"
  "$repo_root/e2e/stack/runtime.Dockerfile"
  "$repo_root/e2e/stack/model-gateway.mjs"
  "$repo_root/e2e/stack/proxy.conf.template"
  "$repo_root/e2e/maestro/00-readiness-and-auth.yaml"
  "$repo_root/e2e/maestro/10-agent-builder-absent.yaml"
  "$repo_root/e2e/maestro/20-native-experiment-comparison.yaml"
  "$repo_root/e2e/maestro/30-experiment-lifecycle.yaml"
  "$repo_root/e2e/maestro/scripts/seed-experiment-lifecycle.js"
  "$repo_root/scripts/e2e/up.sh"
  "$repo_root/scripts/e2e/down.sh"
  "$repo_root/scripts/e2e/run-maestro.sh"
  "$repo_root/scripts/e2e/assert-compose-config.mjs"
  "$repo_root/scripts/e2e/wait-for-stack.mjs"
  "$repo_root/scripts/e2e/verify-experiment-controls.mjs"
)

for file in "${required_files[@]}"; do
  test -f "$file" || {
    printf 'missing required harness file: %s\n' "$file" >&2
    exit 1
  }
done

if test -e "$repo_root/e2e/maestro/config.yaml"; then
  printf 'Maestro 2.8 must receive explicit flow files; config discovery is unsupported here\n' >&2
  exit 1
fi

expected_flows=$'00-readiness-and-auth.yaml\n10-agent-builder-absent.yaml\n20-native-experiment-comparison.yaml\n30-experiment-lifecycle.yaml'
actual_flows="$(
  sed -n '/^maestro_flows=(/,/^)/p' "$repo_root/scripts/e2e/run-maestro.sh" |
    rg -o '[0-9][0-9]-[^"/]+\.yaml'
)"
if [[ "$actual_flows" != "$expected_flows" ]]; then
  printf 'run-maestro.sh must pass exactly the four root flows in their intended order\n' >&2
  exit 1
fi
if rg -Fq -- '--config' "$repo_root/scripts/e2e/run-maestro.sh" || \
  rg -Fq '"$repo_root/e2e/maestro"' "$repo_root/scripts/e2e/run-maestro.sh"; then
  printf 'run-maestro.sh must not invoke Maestro directory/config discovery\n' >&2
  exit 1
fi
if rg -n 'E2E_ADMIN_EMAIL|#email|#password|takeScreenshot|openLink:.*\/login' \
  "$repo_root/scripts/e2e/run-maestro.sh" "$repo_root/e2e/maestro"; then
  printf 'Maestro flows must use transient auth_header handoff, not the broken credentials form/screenshot path\n' >&2
  exit 1
fi
if rg --pcre2 -n 'openLink:\s+(?!.*auth_header=Bearer%20\$\{E2E_API_KEY\})' "$repo_root/e2e/maestro"; then
  printf 'every browser navigation must refresh the transient API-key handoff\n' >&2
  exit 1
fi

experiment_selectors=(experiment-cancel experiment-rerun)
for selector in "${experiment_selectors[@]}"; do
  rg -q "data-testid=.${selector}" "$repo_root/e2e/maestro" || {
    printf 'experiment lifecycle coverage is missing selector: %s\n' "$selector" >&2
    exit 1
  }
done

dockerfile="$repo_root/e2e/stack/runtime.Dockerfile"
rg -Fq 'context: ./stack' "$compose_file" || {
  printf 'Docker main context must be limited to e2e/stack\n' >&2
  exit 1
}
rg -Fq 'agents: ../../EightState Agents Studio' "$compose_file" || {
  printf 'Compose clean-agent context does not target the sibling runtime repository\n' >&2
  exit 1
}
rg -Fq 'studio_dist: ../packages/eightstate-studio/dist' "$compose_file" || {
  printf 'Compose Studio context must contain only the host-built dist directory\n' >&2
  exit 1
}
if rg -n 'studio-deps|studio-builder|pnpm@11|COPY \. \.' "$dockerfile"; then
  printf 'Dockerfile must consume the host-built Studio artifact, not install the Studio monorepo\n' >&2
  exit 1
fi
rg -Fq 'COPY --from=studio_dist' "$dockerfile" || {
  printf 'Dockerfile must copy the host-built Studio named context\n' >&2
  exit 1
}
rg -Fq -- '--filter @eightstate/studio build' "$repo_root/scripts/e2e/up.sh" || {
  printf 'up.sh must build the Studio artifact on the healthy host Node toolchain\n' >&2
  exit 1
}
if rg -n '/Users/|/private/tmp/|/opt/homebrew/|/usr/bin:/bin' "$repo_root/scripts/e2e/up.sh"; then
  printf 'up.sh must not hardcode a developer or system tool path\n' >&2
  exit 1
fi
rg -Fq 'node_command="${E2E_NODE_BIN:-node}"' "$repo_root/scripts/e2e/up.sh" || {
  printf 'up.sh must default to resolving node from the inherited PATH\n' >&2
  exit 1
}
rg -Fq 'pnpm_command="${E2E_PNPM_BIN:-pnpm}"' "$repo_root/scripts/e2e/up.sh" || {
  printf 'up.sh must default to resolving pnpm from the inherited PATH\n' >&2
  exit 1
}
rg -Fq 'networks: [e2e, edge-host]' "$compose_file" || {
  printf 'only the edge service may join the host-facing bridge\n' >&2
  exit 1
}
rg -Fq 'edge-host:' "$compose_file" || {
  printf 'Compose is missing the host-facing bridge network\n' >&2
  exit 1
}

for script in "$repo_root"/scripts/e2e/*.sh; do
  bash -n "$script"
done

for script in "$repo_root"/scripts/e2e/*.mjs "$repo_root"/e2e/stack/*.mjs "$repo_root"/e2e/maestro/scripts/*.js; do
  "$node_bin" --check "$script"
done

if command -v docker >/dev/null; then
  compose_config="$(COMPOSE_PROJECT_NAME=eightstate-studio-e2e-config \
    E2E_STUDIO_PORT=4211 \
    E2E_API_KEY=config-only \
    POSTGRES_PASSWORD=config-postgres \
    CLICKHOUSE_PASSWORD=config-clickhouse \
    docker compose -f "$compose_file" config --format json)"
  printf '%s' "$compose_config" | "$node_bin" "$repo_root/scripts/e2e/assert-compose-config.mjs"
fi

if rg -n '^name:|container_name:|external: true|^[[:space:]]+name:[[:space:]]+eightstate' "$compose_file"; then
  printf 'compose stack must not use global names or external networks\n' >&2
  exit 1
fi

if rg -n '(POSTGRES_PASSWORD|CLICKHOUSE_PASSWORD|E2E_API_KEY)=[0-9a-f]{16,}' \
  "$repo_root/e2e" "$repo_root/scripts/e2e"; then
  printf 'static secret found; E2E credentials must be generated at runtime\n' >&2
  exit 1
fi

printf 'EightState Studio E2E harness static checks passed.\n'
