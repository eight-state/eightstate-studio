import type { RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';

import { removeAgentBuilderRoutes } from './studio-routes';

describe('removeAgentBuilderRoutes', () => {
  it('removes Agent Builder and its Skills route tree from the shipped router', () => {
    const routes: RouteObject[] = [
      { path: '/login' },
      {
        path: '/agent-builder',
        children: [{ path: 'agents' }, { path: 'skills', children: [{ path: ':id/edit' }] }],
      },
      { path: '/', children: [{ path: '/agents' }, { path: '/workspaces/:workspaceId/skills' }] },
    ];

    removeAgentBuilderRoutes(routes);

    expect(routes).toEqual([
      { path: '/login' },
      { path: '/', children: [{ path: '/agents' }, { path: '/workspaces/:workspaceId/skills' }] },
    ]);
  });

  it('is idempotent and preserves every non-builder route object by reference', () => {
    const loginRoute: RouteObject = { path: '/login' };
    const studioRoute: RouteObject = { path: '/' };
    const routes: RouteObject[] = [loginRoute, { path: '/agent-builder' }, studioRoute];

    removeAgentBuilderRoutes(routes);
    removeAgentBuilderRoutes(routes);

    expect(routes).toHaveLength(2);
    expect(routes[0]).toBe(loginRoute);
    expect(routes[1]).toBe(studioRoute);
  });
});
