import fs from 'fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyReplacements, getReplacementProfile, getReplacementProfileName, getTestUrl } from '../src/replacements.ts';
import { createTempWorkspace, useWorkspace } from './test-utils.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('replacements.ts', () => {
  it('prefers the CLI replacement profile flag over the environment variable and default', () => {
    vi.stubEnv('REPLACEMENT_PROFILE', 'staging');

    expect(getReplacementProfileName(['--replacement-profile', 'preview'])).toBe('preview');
    expect(getReplacementProfileName([])).toBe('staging');

    vi.unstubAllEnvs();
    expect(getReplacementProfileName([])).toBe('default');
  });

  it('loads the selected replacement profile from the workspace file', () => {
    const workspace = createTempWorkspace({
      'common/_replacement-profiles.yaml': [
        'profiles:',
        '  default:',
        '    - ref: https://prod.example.com',
        '      test: https://test.example.com',
        '  preview:',
        '    - ref: https://prod.example.com',
        '      test: https://preview.example.com',
      ].join('\n'),
    });
    useWorkspace(workspace);

    expect(getReplacementProfile(['--replacement-profile', 'preview'])).toEqual([
      { ref: 'https://prod.example.com', test: 'https://preview.example.com' },
    ]);
  });

  it('throws a readable error when the replacement profile file is missing', () => {
    const workspace = createTempWorkspace();
    useWorkspace(workspace);

    expect(() => getReplacementProfile([])).toThrow(/_replacement-profiles.yaml/);
  });

  it('applies plain-string replacements in declaration order', () => {
    const output = applyReplacements('https://prod.example.com/home', [
      { ref: 'https://prod.example.com', test: 'https://test.example.com' },
      { ref: '/home', test: '/landing' },
    ]);

    expect(output).toBe('https://test.example.com/landing');
  });

  it('applies regex replacements with flags across multiple case-insensitive matches', () => {
    const output = applyReplacements('https://prod.example.com/PROD/prod', [{ ref: 'prod', test: 'stage', regex: true, flags: 'gi' }]);

    expect(output).toBe('https://stage.example.com/stage/stage');
  });

  it('returns the original URL in reference mode without touching the filesystem', () => {
    const existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation(() => {
      throw new Error('filesystem access should not happen in ref mode');
    });

    expect(getTestUrl([], 'https://prod.example.com/home', true)).toBe('https://prod.example.com/home');
    expect(existsSpy).not.toHaveBeenCalled();
  });

  it('returns the original URL when the selected profile is missing from the profiles map', () => {
    const workspace = createTempWorkspace({
      'common/_replacement-profiles.yaml': [
        'profiles:',
        '  default:',
        '    - ref: https://prod.example.com',
        '      test: https://test.example.com',
      ].join('\n'),
    });
    useWorkspace(workspace);

    expect(getTestUrl(['--replacement-profile', 'missing'], 'https://prod.example.com/home', false)).toBe('https://prod.example.com/home');
  });

  it('applies workspace replacements in test mode', () => {
    const workspace = createTempWorkspace({
      'common/_replacement-profiles.yaml': [
        'profiles:',
        '  default:',
        '    - ref: https://prod.example.com',
        '      test: https://test.example.com',
      ].join('\n'),
    });
    useWorkspace(workspace);

    expect(getTestUrl([], 'https://prod.example.com/home', false)).toBe('https://test.example.com/home');
  });
});
