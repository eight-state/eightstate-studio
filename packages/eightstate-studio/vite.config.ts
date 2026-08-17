import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ConfigEnv, Plugin, UserConfig } from 'vite';
import { defineConfig } from 'vite';

import upstreamPlaygroundConfig from '../playground/vite.config';
import {
  EIGHTSTATE_ENTRY_MODULE_ID,
  EIGHTSTATE_LOGO_FILE,
  EIGHTSTATE_RUNTIME_CONFIG_FILE,
  brandStudioHtml,
  brandStudioSource,
  createDefaultRuntimeConfig,
  customizeRouteManifest,
} from './src/branding';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const playgroundRoot = path.resolve(packageRoot, '../playground');
const playgroundSourceRoot = path.join(playgroundRoot, 'src');
const bootstrapPath = path.join(packageRoot, 'src/bootstrap.ts');
const logoAssetPath = path.join(packageRoot, 'assets', EIGHTSTATE_LOGO_FILE);
const resolvedEntryModuleId = `\0${EIGHTSTATE_ENTRY_MODULE_ID}`;

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function eightStateOverlayPlugin(): Plugin {
  let outDir = path.join(packageRoot, 'dist');

  return {
    name: 'eightstate-studio-overlay',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    transform(source, id) {
      const sourcePath = id.split('?')[0];
      if (!sourcePath?.startsWith(`${playgroundSourceRoot}${path.sep}`)) return;
      if (!/\.[cm]?[jt]sx?$/.test(sourcePath)) return;

      const branded = brandStudioSource(source);
      return branded === source ? undefined : branded;
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return brandStudioHtml(html, process.env.MASTRA_STUDIO_BASE_PATH ?? '');
      },
    },
    resolveId(id) {
      if (id === EIGHTSTATE_ENTRY_MODULE_ID) return resolvedEntryModuleId;
    },
    load(id) {
      if (id === resolvedEntryModuleId) {
        return `import ${JSON.stringify(bootstrapPath)};`;
      }
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: EIGHTSTATE_RUNTIME_CONFIG_FILE,
        source: createDefaultRuntimeConfig(),
      });
    },
    async closeBundle() {
      await fs.copyFile(logoAssetPath, path.join(outDir, EIGHTSTATE_LOGO_FILE));

      const manifestPath = path.join(outDir, 'routes-manifest.json');
      try {
        const manifest = await fs.readFile(manifestPath, 'utf8');
        await fs.writeFile(manifestPath, customizeRouteManifest(manifest), 'utf8');
      } catch (error) {
        if (!isMissingFileError(error)) throw error;
      }
    },
  };
}

async function resolveUpstreamConfig(env: ConfigEnv): Promise<UserConfig> {
  if (typeof upstreamPlaygroundConfig === 'function') {
    return upstreamPlaygroundConfig(env);
  }

  return upstreamPlaygroundConfig;
}

export default defineConfig(async env => {
  const upstream = await resolveUpstreamConfig(env);
  const configuredAliases = upstream.resolve?.alias;
  const upstreamAliases = Array.isArray(configuredAliases)
    ? configuredAliases
    : Object.entries(configuredAliases ?? {}).map(([find, replacement]) => ({ find, replacement }));

  return {
    ...upstream,
    root: playgroundRoot,
    cacheDir: path.join(packageRoot, 'node_modules/.vite'),
    resolve: {
      ...upstream.resolve,
      alias: [
        {
          find: '@eightstate/upstream-app',
          replacement: path.join(playgroundRoot, 'src/App.tsx'),
        },
        {
          find: '@eightstate/upstream-startup-error',
          replacement: path.join(playgroundRoot, 'src/startup-error.ts'),
        },
        {
          find: '@eightstate/upstream-nav-items',
          replacement: path.join(playgroundRoot, 'src/lib/nav/nav-items.tsx'),
        },
        {
          find: '@eightstate/upstream-studio-config',
          replacement: path.join(playgroundRoot, 'src/domains/configuration/context/studio-config-state.ts'),
        },
        {
          find: '@eightstate/upstream-experiment-page-tabs',
          replacement: path.join(playgroundRoot, 'src/domains/experiments/components/experiment-page-tabs.tsx'),
        },
        {
          find: '@/domains/experiments/components/experiment-page-tabs',
          replacement: path.join(packageRoot, 'src/experiments/experiment-page-tabs.tsx'),
        },
        {
          find: './components/experiment-trigger/experiment-trigger-dialog',
          replacement: path.join(packageRoot, 'src/experiments/experiment-trigger-dialog.tsx'),
        },
        {
          find: '@mastra/playground-ui/components/Logo',
          replacement: path.join(packageRoot, 'src/brand-logo.tsx'),
        },
        {
          find: '@/domains/agent-builder/hooks/use-agent-builder-sidebar-visibility',
          replacement: path.join(packageRoot, 'src/disabled-agent-builder-sidebar.ts'),
        },
        ...upstreamAliases,
      ],
    },
    build: {
      ...upstream.build,
      outDir: path.join(packageRoot, 'dist'),
      emptyOutDir: true,
    },
    plugins: [...(upstream.plugins ?? []), eightStateOverlayPlugin()],
  };
});
