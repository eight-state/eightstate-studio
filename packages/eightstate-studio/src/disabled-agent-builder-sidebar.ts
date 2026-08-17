export interface UseAgentBuilderSidebarVisibilityResult {
  isVisible: boolean;
}

/** Downstream replacement for the upstream sidebar visibility hook. */
export function useAgentBuilderSidebarVisibility(): UseAgentBuilderSidebarVisibilityResult {
  return { isVisible: false };
}
