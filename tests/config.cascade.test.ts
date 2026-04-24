import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getConfigs, getScenarios, resolveScenarioOptions, resolveViewports } from '../src/config.ts';
import { createTempWorkspace, useWorkspace, writeWorkspaceFile } from './test-utils.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('config cascade and final Backstop config assembly', () => {
  it('matches viewport names case-insensitively for both string and array inputs', () => {
    const suite = { scenarios: [], viewportNames: 'desktop' } as never;
    const workspace = { viewportNames: ['tablet'] };
    const scenario = { viewportNames: ['DESKTOP', 'mobile'] } as never;
    const viewports = [{ label: 'Desktop' }, { label: 'Mobile' }, { label: 'Tablet' }] as never;

    expect(resolveViewports(scenario, suite, workspace, viewports)).toEqual([{ label: 'Desktop' }, { label: 'Mobile' }]);
    expect(resolveViewports({} as never, suite, workspace, viewports)).toEqual([{ label: 'Desktop' }]);
  });

  it('resolves scenario options across scenario -> suite -> workspace -> default with strict boolean handling', () => {
    const workspace = createTempWorkspace({
      'common/_replacement-profiles.yaml': [
        'profiles:',
        '  default:',
        '    - ref: https://prod.example.com',
        '      test: https://test.example.com',
      ].join('\n'),
    });
    useWorkspace(workspace);

    const result = resolveScenarioOptions({
      args: [],
      scenario: {
        url: 'https://prod.example.com/authors/public/',
        description: 'public',
        hideSelectors: ['.scenario-hide'],
        removeSelectors: ['.scenario-remove'],
        useCssOverride: false,
        bypassCsp: false,
        requiredLogin: false,
      } as never,
      suite: {
        scenarios: [],
        hideSelectors: ['.suite-hide'],
        removeSelectors: ['.suite-remove'],
        useCssOverride: true,
        cssOverridePath: 'suite.css',
        misMatchThreshold: 0.2,
        postInteractionWait: 2,
      } as never,
      workspace: {
        hideSelectors: ['.workspace-hide'],
        removeSelectors: ['.workspace-remove'],
        cssOverridePath: 'workspace.css',
        bypassCsp: true,
        delay: 2500,
        cookiePath: 'workspace-cookies.yaml',
        jsOnReadyPath: 'workspace-ready.js',
        noScrollTop: true,
        requiredLogin: true,
        misMatchThreshold: 0.4,
        postInteractionWait: 4,
      },
      testSuite: 'alloy',
      isRef: false,
      globalRequiredLogin: false,
      index: 0,
      total: 4,
      viewports: [{ label: 'Desktop' }] as never,
    });

    expect(result).toMatchObject({
      url: 'https://test.example.com/authors/public/',
      referenceUrl: 'https://prod.example.com/authors/public/',
      hideSelectors: ['.scenario-hide'],
      removeSelectors: ['.scenario-remove'],
      useCssOverride: false,
      cssOverridePath: 'suite.css',
      bypassCsp: false,
      delay: 2500,
      cookiePath: 'workspace-cookies.yaml',
      jsOnReadyPath: 'workspace-ready.js',
      noScrollTop: true,
      requiredLogin: false,
      misMatchThreshold: 0.2,
      postInteractionWait: 2,
      index: '1',
      total: 4,
    });
  });

  it('lets the global requiredLogin flag force true and keeps reference runs unmodified', () => {
    const workspace = createTempWorkspace();
    useWorkspace(workspace);

    const result = resolveScenarioOptions({
      args: [],
      scenario: {
        url: 'https://prod.example.com/authors/public/',
        description: 'public',
      } as never,
      suite: { scenarios: [] } as never,
      workspace: { requiredLogin: false },
      testSuite: 'alloy',
      isRef: true,
      globalRequiredLogin: true,
      index: 0,
      total: 1,
      viewports: [],
    });

    expect(result.url).toBe('https://prod.example.com/authors/public/');
    expect(result.referenceUrl).toBeUndefined();
    expect(result.requiredLogin).toBe(true);
  });

  it('deduplicates restore values and expands persist action paths through getScenarios()', () => {
    const workspace = createTempWorkspace({
      'common/_viewports.yaml': '- label: desktop\n  width: 1280\n  height: 720\n',
      'visual_tests/alloy.tests.yaml': [
        'scenarios:',
        '  - url: https://example.com',
        '    description: main page',
        '    restore:',
        '      - auth',
        '      - auth',
        '      - prefs',
        '    actions:',
        '      - persist: auth-state',
      ].join('\n'),
    });
    useWorkspace(workspace);

    const { scenarios } = getScenarios([], 'alloy', true, false, {});
    const scenario = scenarios[0] as never;

    expect(scenario.restore).toEqual(['auth', 'prefs']);
    expect(scenario.actions[0].path).toBe(path.join(workspace, '.states', 'auth-state.json'));
    expect(fs.existsSync(path.join(workspace, '.states'))).toBe(true);
  });

  it('builds final configs with workspace defaults, suite overrides, state files, and non-CI debug behavior', () => {
    const workspace = createTempWorkspace();
    const customViewportPath = path.join(workspace, 'common', 'custom-viewports.yaml');
    writeWorkspaceFile(
      workspace,
      'regressify.yaml',
      [
        'browser: firefox',
        'ignoreSslErrors: false',
        'asyncCaptureLimit: 7',
        'asyncCompareLimit: 8',
        'debug: true',
        'state: workspace-state',
        `viewportsPath: ${customViewportPath.replaceAll('\\', '/')}`,
      ].join('\n')
    );
    writeWorkspaceFile(workspace, 'common/custom-viewports.yaml', '- label: desktop\n  width: 1280\n  height: 720\n');
    writeWorkspaceFile(workspace, 'common/_replacement-profiles.yaml', 'profiles: {}\n');
    writeWorkspaceFile(workspace, '.states/workspace-state.json', '{"cookies":[]}');
    writeWorkspaceFile(
      workspace,
      'visual_tests/alloy.tests.yaml',
      ['browser: webkit', 'asyncCaptureLimit: 9', 'scenarios:', '  - url: https://example.com', '    description: home page'].join('\n')
    );
    useWorkspace(workspace);

    const [config] = getConfigs(['--test-suite', 'alloy'], '.backstop');

    expect(config.viewports).toEqual([{ label: 'desktop', width: 1280, height: 720 }]);
    expect(config.engineOptions.browser).toBe('webkit');
    expect(config.engineOptions.ignoreHTTPSErrors).toBe(false);
    expect(config.engineOptions.headless).toBeUndefined();
    expect(config.engineOptions.storageState).toBe(path.join(workspace, '.states', 'workspace-state.json'));
    expect(config.asyncCaptureLimit).toBe(9);
    expect(config.asyncCompareLimit).toBe(8);
    expect(config.debugWindow).toBe(true);
  });

  it('forces CI behavior in GitHub Actions and leaves storageState undefined when the file is missing', () => {
    vi.stubEnv('GITHUB_ACTIONS', 'true');

    const workspace = createTempWorkspace({
      'regressify.yaml': ['debug: true', 'state: missing-state'].join('\n'),
      'common/_viewports.yaml': '- label: desktop\n  width: 1280\n  height: 720\n',
      'common/_replacement-profiles.yaml': 'profiles: {}\n',
      'visual_tests/alloy.tests.yaml': ['scenarios:', '  - url: https://example.com', '    description: home page'].join('\n'),
    });
    useWorkspace(workspace);

    const [config] = getConfigs(['--test-suite', 'alloy'], '.backstop');

    expect(config.engineOptions.headless).toBe('new');
    expect(config.debugWindow).toBe(false);
    expect(config.engineOptions.storageState).toBeUndefined();
  });
});
