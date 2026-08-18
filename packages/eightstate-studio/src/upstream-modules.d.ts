declare module '@eightstate/upstream-app' {
  import type { ComponentType } from 'react';
  import type { RouteObject } from 'react-router';

  export const routes: RouteObject[];
  const App: ComponentType;
  export default App;
}

declare module '@eightstate/upstream-startup-error' {
  export function renderStartupError(error: unknown): void;
}

declare module '@eightstate/upstream-nav-items' {
  import type { ComponentType, SVGProps } from 'react';

  export interface NavItem {
    name: string;
    url: string;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
    isOnMastraPlatform?: boolean;
  }

  export interface NavSection {
    key: string;
    items: NavItem[];
  }

  export const mainNav: NavSection[];
}

declare module '@eightstate/upstream-studio-config' {
  import type { Context } from 'react';

  export type StudioConfigContextType = {
    baseUrl: string;
    headers: Record<string, string>;
    apiPrefix?: string;
    isLoading: boolean;
    setConfig: (config: { baseUrl?: string; headers?: Record<string, string>; apiPrefix?: string }) => void;
  };

  export const StudioConfigContext: Context<StudioConfigContextType>;
  export function useStudioConfig(): StudioConfigContextType;
}

declare module '@eightstate/upstream-experiment-page-tabs' {
  import type { DatasetExperimentResult } from '@mastra/client-js';
  import type { ExperimentStatus } from '@mastra/core/storage';
  import type { ComponentType } from 'react';

  export type ExperimentPageTabsProps = {
    experimentId: string;
    datasetId: string;
    experimentStatus: ExperimentStatus;
    results: DatasetExperimentResult[];
    isLoading: boolean;
    setEndOfListElement: (node: HTMLDivElement | null) => void;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
  };

  export const ExperimentPageTabs: ComponentType<ExperimentPageTabsProps>;
}

declare module 'react-grab';
