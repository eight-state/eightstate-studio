import type { RouteObject } from 'react-router';

const AGENT_BUILDER_ROUTE = '/agent-builder';

/**
 * Mutates the upstream route array before React Router is created.
 *
 * Removing the route root also removes its nested Agent Builder Skills pages.
 * Workspace Skills remain available because they are part of Studio's runtime
 * inspection surface rather than Agent Builder.
 */
export function removeAgentBuilderRoutes(routes: RouteObject[]): void {
  for (let index = routes.length - 1; index >= 0; index -= 1) {
    if (routes[index]?.path === AGENT_BUILDER_ROUTE) {
      routes.splice(index, 1);
    }
  }
}
