import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTempWorkspace, writeWorkspaceFile } from './test-utils.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('regressify.ts', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('patches the backstop compare html with the custom style block', async () => {
    const workspace = createTempWorkspace();
    const reportIndex = path.join(workspace, 'node_modules', 'backstopjs', 'compare', 'output', 'index.html');
    writeWorkspaceFile(workspace, 'node_modules/backstopjs/compare/output/index.html', '<html><head></head><body></body></html>');

    const backstopMock = vi.fn(() => Promise.resolve());
    const getConfigsMock = vi.fn(() => [{ id: 'alloy' }]);
    const snapshotMock = vi.fn();

    vi.doMock('backstopjs', () => ({ default: backstopMock }));
    vi.doMock('../src/config.js', () => ({ getConfigs: getConfigsMock }));
    vi.doMock('../src/snapshot.js', () => ({ snapshot: snapshotMock }));
    vi.doMock('../src/helpers.js', () => ({
      getBackstopDirName: () => '.backstop',
      getLibraryPath: () => workspace,
    }));

    const { applyCustomStylePatch, regressifyProcess } = await import('../src/regressify.ts');

    expect(applyCustomStylePatch('<html><head></head><body></body></html>')).toContain('PATCH START');

    await regressifyProcess('snapshot', []);

    expect(snapshotMock).toHaveBeenCalledWith({ configs: [{ id: 'alloy' }], backstopDirName: '.backstop' });
    expect(backstopMock).not.toHaveBeenCalled();
    expect(fs.readFileSync(reportIndex, 'utf-8')).toContain('PATCH START');
  });

  it('runs backstop for non-snapshot commands and continues after a failure', async () => {
    const workspace = createTempWorkspace();
    writeWorkspaceFile(workspace, 'node_modules/backstopjs/compare/output/index.html', '<html><head></head><body></body></html>');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const backstopMock = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('failure'));
    const getConfigsMock = vi.fn(() => [{ id: 'suite-a' }, { id: 'suite-b' }]);

    vi.doMock('backstopjs', () => ({ default: backstopMock }));
    vi.doMock('../src/config.js', () => ({ getConfigs: getConfigsMock }));
    vi.doMock('../src/snapshot.js', () => ({ snapshot: vi.fn() }));
    vi.doMock('../src/helpers.js', () => ({
      getBackstopDirName: () => '.backstop',
      getLibraryPath: () => workspace,
    }));

    const { regressifyProcess } = await import('../src/regressify.ts');
    await regressifyProcess('test', ['--test-suite', 'alloy']);

    expect(backstopMock).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('replaces an existing patch block and logs when no compare report file exists', async () => {
    const workspace = createTempWorkspace();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.doMock('backstopjs', () => ({ default: vi.fn(() => Promise.resolve()) }));
    vi.doMock('../src/config.js', () => ({ getConfigs: vi.fn(() => []) }));
    vi.doMock('../src/snapshot.js', () => ({ snapshot: vi.fn() }));
    vi.doMock('../src/helpers.js', () => ({
      getBackstopDirName: () => '.backstop',
      getLibraryPath: () => workspace,
    }));

    const { applyCustomStylePatch, patchCompare } = await import('../src/regressify.ts');

    const patched = applyCustomStylePatch('<head><!-- PATCH START --><style>old</style><!-- PATCH END --></head>');
    expect(patched).toContain('PATCH START');
    expect(patched).not.toContain('<style>old</style>');

    patchCompare();
    expect(consoleSpy).toHaveBeenCalled();
  });
});
