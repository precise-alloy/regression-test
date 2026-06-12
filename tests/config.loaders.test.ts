import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ConfigValidationError,
  getArgConfigs,
  getConfigs,
  getData,
  getRequiredTestSuiteArg,
  getScriptPath,
  getWorkspaceConfig,
  isCIEnvironment,
  resolveStrictBoolean,
} from '../src/config.ts';
import { createTempWorkspace, useWorkspace } from './test-utils.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('config loaders and environment helpers', () => {
  it('requires --test-suite and throws a readable validation error when it is missing', () => {
    expect(() => getRequiredTestSuiteArg([])).toThrowError(ConfigValidationError);
    expect(() => getRequiredTestSuiteArg([])).toThrow(/--test-suite/);
  });

  it('discovers suite ids via glob and lowercases the resulting suite names', () => {
    const workspace = createTempWorkspace({
      'visual_tests/MySuite.tests.yaml': 'scenarios:\n  - url: https://example.com\n',
    });
    useWorkspace(workspace);

    expect(getArgConfigs(['--test-suite', '*'])).toEqual([
      {
        testSuite: 'mysuite',
        isRef: false,
        globalRequiredLogin: false,
      },
    ]);
  });

  it('loads regressify.yaml before regressify.yml and returns an empty object when neither exists', () => {
    const workspace = createTempWorkspace({
      'regressify.yaml': 'browser: firefox\n',
      'regressify.yml': 'browser: webkit\n',
    });
    useWorkspace(workspace);

    expect(getWorkspaceConfig()).toEqual({ browser: 'firefox' });

    const emptyWorkspace = createTempWorkspace();
    useWorkspace(emptyWorkspace);
    expect(getWorkspaceConfig()).toEqual({});
  });

  it('loads test suite data in yaml -> yml -> json order and throws when nothing matches', () => {
    const workspace = createTempWorkspace({
      'visual_tests/alloy.tests.json': '{"scenarios":[{"url":"https://json.example.com"}]}',
      'visual_tests/alloy.tests.yml': 'scenarios:\n  - url: https://yml.example.com\n',
      'visual_tests/alloy.tests.yaml': 'scenarios:\n  - url: https://yaml.example.com\n',
    });
    useWorkspace(workspace);

    expect(getData('alloy')?.scenarios[0].url).toBe('https://yaml.example.com');

    const ymlWorkspace = createTempWorkspace({
      'visual_tests/alloy.tests.yml': 'scenarios:\n  - url: https://yml.example.com\n',
    });
    useWorkspace(ymlWorkspace);
    expect(getData('alloy')?.scenarios[0].url).toBe('https://yml.example.com');

    const jsonWorkspace = createTempWorkspace({
      'visual_tests/alloy.tests.json': '{"scenarios":[{"url":"https://json.example.com"}]}',
    });
    useWorkspace(jsonWorkspace);
    expect(getData('alloy')?.scenarios[0].url).toBe('https://json.example.com');

    const missingWorkspace = createTempWorkspace();
    useWorkspace(missingWorkspace);
    expect(() => getData('missing')).toThrow(/Data file not found/);
  });

  it('resolves strict booleans without replacing explicit false with a fallback true', () => {
    expect(resolveStrictBoolean(undefined, false, true)).toBe(false);
    expect(resolveStrictBoolean(undefined, undefined, true)).toBe(true);
    expect(resolveStrictBoolean(undefined, undefined)).toBeUndefined();
  });

  it('detects ci environments and computes the engine script path', () => {
    expect(isCIEnvironment({ GITHUB_ACTIONS: 'true' } as NodeJS.ProcessEnv)).toBe(true);
    expect(
      isCIEnvironment({
        TF_BUILD: 'True',
        SYSTEM_TEAMFOUNDATIONSERVERURI: 'uri',
        SYSTEM_TEAMFOUNDATIONCOLLECTIONURI: 'collection',
        SYSTEM_TEAMPROJECT: 'project',
        SYSTEM_COLLECTIONURI: 'collection-uri',
      } as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(isCIEnvironment({ CI: 'true' } as NodeJS.ProcessEnv)).toBe(true);
    expect(isCIEnvironment({} as NodeJS.ProcessEnv)).toBe(false);
    expect(getScriptPath('/onReady.js', 'playwright')).toMatch(/\.engine_scripts[\\/]playwright[\\/]onReady\.js$/);
  });

  it('logs the validation message and exits when getConfigs is called without --test-suite', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit:1');
    }) as never);

    expect(() => getConfigs([], '.backstop')).toThrow('exit:1');
    expect(consoleSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
