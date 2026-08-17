import { describe, expect, it } from 'vitest';

import { useAgentBuilderSidebarVisibility } from './disabled-agent-builder-sidebar';

describe('useAgentBuilderSidebarVisibility', () => {
  it('keeps the standalone Agent Builder shortcut out of EightState navigation', () => {
    expect(useAgentBuilderSidebarVisibility()).toEqual({ isVisible: false });
  });
});
