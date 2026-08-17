export const EIGHTSTATE_ENTRY_MODULE_ID = '/@eightstate-studio-entry';
export const EIGHTSTATE_LOGO_FILE = 'eightstate-logo.jpg';
export const EIGHTSTATE_RUNTIME_CONFIG_FILE = 'eightstate-runtime-config.js';

const STUDIO_NAME = 'EightState Studio';
const UPSTREAM_STUDIO_NAME = 'Mastra Studio';

const HTML_RUNTIME_DEFAULTS = new Map([
  ['%%MASTRA_TELEMETRY_DISABLED%%', 'false'],
  ['%%MASTRA_SERVER_HOST%%', 'localhost'],
  ['%%MASTRA_SERVER_PORT%%', '4111'],
  ['%%MASTRA_API_PREFIX%%', '/api'],
  ['%%MASTRA_HIDE_CLOUD_CTA%%', 'true'],
  ['%%MASTRA_SERVER_PROTOCOL%%', 'http'],
  ['%%MASTRA_CLOUD_API_ENDPOINT%%', ''],
  ['%%MASTRA_EXPERIMENTAL_FEATURES%%', 'false'],
  ['%%MASTRA_TEMPLATES%%', ''],
  ['%%MASTRA_AUTO_DETECT_URL%%', 'true'],
  ['%%MASTRA_REQUEST_CONTEXT_PRESETS%%', ''],
  ['%%MASTRA_EXPERIMENTAL_UI%%', 'false'],
  ['%%MASTRA_AGENT_SIGNALS%%', 'true'],
  ['%%MASTRA_SIGNALS_UI%%', 'false'],
  ['%%MASTRA_ORGANIZATION_ID%%', ''],
  ['%%MASTRA_PLATFORM_PROJECT_ID%%', ''],
  ['%%MASTRA_PLATFORM_OBSERVABILITY_ENDPOINT%%', ''],
]);

const RUNTIME_CONFIG_APPLICATION = `<script>
      (function applyEightStateRuntimeConfig() {
        const config = window.EIGHTSTATE_STUDIO_CONFIG || {};
        const assign = (key, value) => {
          if (value !== undefined) window[key] = String(value);
        };

        assign('MASTRA_SERVER_HOST', config.serverHost);
        assign('MASTRA_SERVER_PORT', config.serverPort);
        assign('MASTRA_SERVER_PROTOCOL', config.serverProtocol);
        assign('MASTRA_API_PREFIX', config.apiPrefix);
        assign('MASTRA_CLOUD_API_ENDPOINT', config.cloudApiEndpoint);
        assign('MASTRA_AUTO_DETECT_URL', config.autoDetectUrl);
        assign('MASTRA_HIDE_CLOUD_CTA', config.hideCloudCta);
        assign('MASTRA_TELEMETRY_DISABLED', config.telemetryDisabled);
      })();
    </script>`;

function normalizeBasePath(basePath: string): string {
  const trimmed = basePath.trim();
  if (!trimmed || trimmed === '/') return '';

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

export function brandStudioSource(source: string): string {
  return source
    .replaceAll(`🐴 ${UPSTREAM_STUDIO_NAME}`, STUDIO_NAME)
    .replaceAll(UPSTREAM_STUDIO_NAME, STUDIO_NAME);
}

export function brandStudioHtml(html: string, basePath: string): string {
  let branded = brandStudioSource(html)
    .replaceAll('%%MASTRA_STUDIO_BASE_PATH%%', normalizeBasePath(basePath))
    .replace(
      /(?:type=["']image\/svg\+xml["']\s+)?href=["']\.\/mastra\.svg["']/,
      `type="image/jpeg" href="./${EIGHTSTATE_LOGO_FILE}"`,
    )
    .replace(/src=["']\.\/src\/bootstrap\.ts["']/, `src="${EIGHTSTATE_ENTRY_MODULE_ID}"`);

  for (const [placeholder, value] of HTML_RUNTIME_DEFAULTS) {
    branded = branded.replaceAll(placeholder, value);
  }

  const runtimeConfigTags = `<script vite-ignore src="./${EIGHTSTATE_RUNTIME_CONFIG_FILE}"></script>\n    ${RUNTIME_CONFIG_APPLICATION}`;
  return branded.replace('</head>', `${runtimeConfigTags}\n  </head>`);
}

export function createDefaultRuntimeConfig(): string {
  return `// Replace this file at deploy time to connect EightState Studio to a separate Mastra server.
window.EIGHTSTATE_STUDIO_CONFIG = {
  autoDetectUrl: true,
  hideCloudCta: true,
  ...window.EIGHTSTATE_STUDIO_CONFIG,
};
`;
}

export function customizeRouteManifest(manifest: string): string {
  const roots: unknown = JSON.parse(manifest);
  if (!Array.isArray(roots) || !roots.every(root => typeof root === 'string')) {
    throw new Error('Expected routes-manifest.json to contain an array of route roots');
  }

  const customized = new Set(roots.filter(root => root !== 'agent-builder'));
  const sortedRoots = [...customized];
  sortedRoots.sort();

  return `${JSON.stringify(sortedRoots, null, 2)}\n`;
}
