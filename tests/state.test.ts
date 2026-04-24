import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getStatePath } from '../src/state.ts';
import { createTempWorkspace, useWorkspace } from './test-utils.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('state.ts', () => {
  it('creates the .states directory when it is missing and returns the json path', () => {
    const workspace = createTempWorkspace();
    useWorkspace(workspace);

    const statePath = getStatePath('auth');

    expect(statePath).toBe(path.join(workspace, '.states', 'auth.json'));
    expect(fs.existsSync(path.join(workspace, '.states'))).toBe(true);
  });

  it('does not recreate the state directory when it already exists', () => {
    const workspace = createTempWorkspace();
    fs.mkdirSync(path.join(workspace, '.states'), { recursive: true });
    useWorkspace(workspace);

    const mkdirSpy = vi.spyOn(fs, 'mkdirSync');
    const statePath = getStatePath('session');

    expect(statePath).toBe(path.join(workspace, '.states', 'session.json'));
    expect(mkdirSpy).not.toHaveBeenCalled();
  });
});