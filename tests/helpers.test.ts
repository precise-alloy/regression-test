import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBackstopDirName, getFlagArg, getLibraryPath, getStringArg, parseDataFromFile } from '../src/helpers.ts';
import { createTempWorkspace, normalizeSlashes } from './test-utils.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('helpers.ts', () => {
  it('returns the string argument value immediately after the key', () => {
    expect(getStringArg(['--site-env', 'prod'], '--site-env')).toBe('prod');
  });

  it('returns undefined when the string argument is missing or followed by another flag', () => {
    expect(getStringArg(['--site-env'], '--site-env')).toBeUndefined();
    expect(getStringArg(['--site-env', '--ref'], '--site-env')).toBeUndefined();
    expect(getStringArg(['--ref'], '--site-env')).toBeUndefined();
  });

  it('detects boolean flags by presence only', () => {
    expect(getFlagArg(['--ref', '--debug'], '--ref')).toBe(true);
    expect(getFlagArg(['--ref', '--debug'], '--missing')).toBe(false);
  });

  it('builds the default and site-env-specific backstop directory names', () => {
    expect(getBackstopDirName([])).toBe('.backstop');
    expect(getBackstopDirName(['--site-env', 'preview'])).toBe('.backstop__preview');
  });

  it('parses YAML and JSON files and returns undefined for falsy or missing paths', () => {
    const workspace = createTempWorkspace({
      'data.yaml': 'browser: chromium\n',
      'data.json': '{"browser":"firefox"}',
    });

    expect(parseDataFromFile('')).toBeUndefined();
    expect(parseDataFromFile(path.join(workspace, 'missing.yaml'))).toBeUndefined();
    expect(parseDataFromFile(path.join(workspace, 'data.yaml'))).toEqual({ browser: 'chromium' });
    expect(parseDataFromFile(path.join(workspace, 'data.json'), 'json')).toEqual({ browser: 'firefox' });
  });

  it('surfaces malformed JSON and malformed YAML', () => {
    const workspace = createTempWorkspace({
      'bad.json': '{bad}',
      'bad.yaml': 'browser: [chromium',
    });

    expect(() => parseDataFromFile(path.join(workspace, 'bad.json'), 'json')).toThrow();
    expect(() => parseDataFromFile(path.join(workspace, 'bad.yaml'))).toThrow();
  });

  it('resolves the library path from the current module url', () => {
    const libraryPath = normalizeSlashes(getLibraryPath());

    expect(libraryPath).toMatch(/\/regressify$/);
    expect(fs.existsSync(path.join(libraryPath, 'package.json'))).toBe(true);
  });
});
