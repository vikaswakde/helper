import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { HelperProvider } from './HelperProvider';
import { mockHelperWidget, createTestConfig, setupTestEnv, cleanupTestEnv } from '../test/utils';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('HelperProvider', () => {
  beforeEach(() => {
    setupTestEnv();
    mockHelperWidget();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it('renders children', () => {
    render(
      <HelperProvider {...createTestConfig()}>
        <div data-testid="child">Child content</div>
      </HelperProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('injects Helper script', () => {
    render(
      <HelperProvider {...createTestConfig()}>
        <div>Child content</div>
      </HelperProvider>
    );

    const script = document.querySelector('script[src="https://helper.ai/widget/sdk.js"]');
    expect(script).toBeInTheDocument();
  });

  it('initializes Helper widget with correct config', () => {
    const config = createTestConfig();
    render(
      <HelperProvider {...config}>
        <div>Child content</div>
      </HelperProvider>
    );

    const script = document.querySelector('script');
    act(() => {
      script?.dispatchEvent(new Event('load'));
    });

    const helperWidget = window.HelperWidget as typeof window.HelperWidget & { init: ReturnType<typeof vi.fn> };
    expect(helperWidget.init).toHaveBeenCalledWith(config);
  });

  it('cleans up script on unmount', () => {
    const { unmount } = render(
      <HelperProvider {...createTestConfig()}>
        <div>Child content</div>
      </HelperProvider>
    );

    const script = document.querySelector('script[src="https://helper.ai/widget/sdk.js"]');
    expect(script).toBeInTheDocument();

    unmount();

    expect(document.querySelector('script[src="https://helper.ai/widget/sdk.js"]')).not.toBeInTheDocument();
  });
}); 
