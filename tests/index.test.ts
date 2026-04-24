import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('index.ts', () => {
  it('dispatches the ref command to Backstop reference mode with the --ref flag', async () => {
    const originalArgv = process.argv;
    process.argv = ['node', 'regressify', 'ref', '--test-suite', 'alloy'];

    const regressifyProcess = vi.fn();

    vi.doMock('../src/initialization/init.js', () => ({ initRegressify: vi.fn() }));
    vi.doMock('../src/regressify.js', () => ({ regressifyProcess }));
    vi.doMock('../src/initialization/get-version.js', () => ({ getVersion: vi.fn() }));
    vi.doMock('../src/install.js', () => ({ installBrowsers: vi.fn() }));

    await import('../src/index.ts');

    expect(regressifyProcess).toHaveBeenCalledWith('reference', ['--ref', '--test-suite', 'alloy']);

    process.argv = originalArgv;
  });
});