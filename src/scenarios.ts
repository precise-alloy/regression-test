import { ScenarioModel } from './types.js';

export const createScenario = (opts: ScenarioModel): ScenarioModel => {
  const parsedUrl = new URL(opts.url);

  return {
    ...opts,
    label: opts.label ?? `${opts.index} of ${opts.total}: ${parsedUrl.pathname}`,
    cookiePath: opts.cookiePath ?? 'common/_cookies.yaml',
    cssOverridePath: opts.cssOverridePath ?? 'common/_override.css',
    jsOnReadyPath: opts.jsOnReadyPath ?? 'common/_on-ready.js',
    referenceUrl: opts.referenceUrl ?? '',
    readyEvent: '',
    hideSelectors: opts.hideSelectors ?? [],
    removeSelectors: opts.removeSelectors ?? [],
    selectors: [],
    selectorExpansion: true,
    expect: 0,
    requireSameDimensions: true,
  };
};
