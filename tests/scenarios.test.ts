import { describe, expect, it } from 'vitest';
import { createScenario } from '../src/scenarios.ts';

describe('scenarios.ts', () => {
  it('fills in the documented scenario defaults', () => {
    const scenario = createScenario({
      url: 'https://example.com/authors/public/',
      description: 'Public author page',
      testSuite: 'alloy',
      index: '1',
      total: 3,
    } as never);

    expect(scenario).toMatchObject({
      label: '1 of 3: /authors/public/',
      cookiePath: 'common/_cookies.yaml',
      cssOverridePath: 'common/_override.css',
      jsOnReadyPath: 'common/_on-ready.js',
      referenceUrl: '',
      readyEvent: '',
      hideSelectors: [],
      removeSelectors: [],
      selectors: [],
      selectorExpansion: true,
      expect: 0,
      requireSameDimensions: true,
    });
  });

  it('preserves explicit overrides instead of replacing them with defaults', () => {
    const scenario = createScenario({
      url: 'https://example.com/authors/public/',
      description: 'Public author page',
      testSuite: 'alloy',
      index: '1',
      total: 1,
      label: 'explicit-label',
      cookiePath: 'custom-cookies.yaml',
      cssOverridePath: 'custom.css',
      jsOnReadyPath: 'custom.js',
      referenceUrl: 'https://reference.example.com',
      hideSelectors: ['.hero'],
      removeSelectors: ['.popup'],
    } as never);

    expect(scenario).toMatchObject({
      label: 'explicit-label',
      cookiePath: 'custom-cookies.yaml',
      cssOverridePath: 'custom.css',
      jsOnReadyPath: 'custom.js',
      referenceUrl: 'https://reference.example.com',
      hideSelectors: ['.hero'],
      removeSelectors: ['.popup'],
    });
  });

  it('fails fast for invalid URLs', () => {
    expect(() =>
      createScenario({
        url: 'not-a-valid-url',
        description: 'broken',
        testSuite: 'alloy',
        index: '1',
        total: 1,
      } as never)
    ).toThrow();
  });
});
