import { describe, expect, it } from 'vitest';

import {
  EIGHTSTATE_ENTRY_MODULE_ID,
  EIGHTSTATE_LOGO_FILE,
  EIGHTSTATE_RUNTIME_CONFIG_FILE,
  brandStudioHtml,
  brandStudioSource,
  createDefaultRuntimeConfig,
  customizeRouteManifest,
} from './branding';

describe('brandStudioSource', () => {
  it('replaces upstream Studio product copy without changing unrelated Mastra API copy', () => {
    const source = `const title = '🐴 Mastra Studio'; const product = 'Mastra Studio'; const framework = 'Mastra';`;

    expect(brandStudioSource(source)).toBe(
      `const title = 'EightState Studio'; const product = 'EightState Studio'; const framework = 'Mastra';`,
    );
  });
});

describe('brandStudioHtml', () => {
  it('brands the document, selects the downstream entry, and loads replaceable runtime config', () => {
    const html = `
      <base href="%%MASTRA_STUDIO_BASE_PATH%%/" />
      <link rel="icon" href="./mastra.svg" />
      <title>Mastra Studio</title>
      <script>window.MASTRA_SERVER_HOST = '%%MASTRA_SERVER_HOST%%';</script>
      </head>
      <script type="module" src="./src/bootstrap.ts"></script>
    `;

    const branded = brandStudioHtml(html, '/studio');

    expect(branded).toContain('<base href="/studio/" />');
    expect(branded).toContain('<title>EightState Studio</title>');
    expect(branded).toContain(`type="image/jpeg" href="./${EIGHTSTATE_LOGO_FILE}"`);
    expect(branded).toContain(EIGHTSTATE_RUNTIME_CONFIG_FILE);
    expect(branded).toContain(`<script vite-ignore src="./${EIGHTSTATE_RUNTIME_CONFIG_FILE}"></script>`);
    expect(branded).toContain(EIGHTSTATE_ENTRY_MODULE_ID);
    expect(branded).not.toContain('%%MASTRA_');
    expect(branded).not.toContain('./mastra.svg');
  });
});

describe('createDefaultRuntimeConfig', () => {
  it('defaults a static deployment to its own origin without embedding credentials', () => {
    const runtimeConfig = createDefaultRuntimeConfig();

    expect(runtimeConfig).toContain('autoDetectUrl: true');
    expect(runtimeConfig).not.toContain('headers');
    expect(runtimeConfig).not.toContain('token');
  });
});

describe('customizeRouteManifest', () => {
  it('removes Agent Builder without changing the other upstream routes', () => {
    expect(customizeRouteManifest('["agents", "agent-builder", "traces"]')).toBe(
      '[\n  "agents",\n  "traces"\n]\n',
    );
  });
});
