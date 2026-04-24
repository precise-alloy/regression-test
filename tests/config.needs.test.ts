import { describe, expect, it } from 'vitest';
import { ConfigValidationError, expandScenarios } from '../src/config.ts';

describe('config scenario dependency expansion', () => {
  it('merges one dependency actions ahead of the current scenario actions', () => {
    const base = {
      id: 'base',
      url: 'https://example.com/base',
      description: 'base',
      actions: [{ click: '#base' }],
    } as never;
    const target = {
      id: 'page',
      url: 'https://example.com/page',
      description: 'page',
      needs: 'base',
      actions: [{ click: '#page' }],
    } as never;

    expandScenarios(target, [base, target], 0);

    expect(target.actions).toEqual([{ click: '#base' }, { click: '#page' }]);
    expect(target.needs).toBeUndefined();
  });

  it('preserves declared dependency order when needs is an array', () => {
    const first = { id: 'first', url: 'https://example.com/1', description: 'first', actions: [{ click: '#first' }] } as never;
    const second = { id: 'second', url: 'https://example.com/2', description: 'second', actions: [{ click: '#second' }] } as never;
    const target = {
      id: 'page',
      url: 'https://example.com/page',
      description: 'page',
      needs: ['first', 'second'],
      actions: [{ click: '#page' }],
    } as never;

    expandScenarios(target, [first, second, target], 0);

    expect(target.actions).toEqual([{ click: '#first' }, { click: '#second' }, { click: '#page' }]);
  });

  it('flattens nested dependencies recursively', () => {
    const grandparent = { id: 'grandparent', url: 'https://example.com/a', description: 'grandparent', actions: [{ hover: '#a' }] } as never;
    const parent = {
      id: 'parent',
      url: 'https://example.com/b',
      description: 'parent',
      needs: 'grandparent',
      actions: [{ hover: '#b' }],
    } as never;
    const child = {
      id: 'child',
      url: 'https://example.com/c',
      description: 'child',
      needs: 'parent',
      actions: [{ hover: '#c' }],
    } as never;

    expandScenarios(child, [grandparent, parent, child], 0);

    expect(child.actions).toEqual([{ hover: '#a' }, { hover: '#b' }, { hover: '#c' }]);
  });

  it('throws when a dependency id is missing or duplicated', () => {
    const target = { id: 'child', url: 'https://example.com/c', description: 'child', needs: 'missing' } as never;
    expect(() => expandScenarios(target, [target], 0)).toThrow(/exactly ONE scenario with id: missing/);

    const duplicateA = { id: 'dup', url: 'https://example.com/a', description: 'dup' } as never;
    const duplicateB = { id: 'dup', url: 'https://example.com/b', description: 'dup' } as never;
    const duplicated = { id: 'child', url: 'https://example.com/c', description: 'child', needs: 'dup' } as never;
    expect(() => expandScenarios(duplicated, [duplicateA, duplicateB, duplicated], 0)).toThrow(/exactly ONE scenario with id: dup/);
  });

  it('throws early with a readable cycle path when scenarios depend on each other', () => {
    const alpha = { id: 'alpha', url: 'https://example.com/a', description: 'alpha', needs: 'beta' } as never;
    const beta = { id: 'beta', url: 'https://example.com/b', description: 'beta', needs: 'alpha' } as never;

    expect(() => expandScenarios(alpha, [alpha, beta], 0)).toThrowError(ConfigValidationError);
    expect(() => expandScenarios(alpha, [alpha, beta], 0)).toThrow(/alpha -> beta -> alpha/i);
  });
});