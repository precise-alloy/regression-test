import { ScenarioModel } from './types';

export const createScenario = (opts: ScenarioModel): ScenarioModel => {
  const parsedUrl = new URL(opts.url);

  return {
    ...opts,
    label: opts.label ?? `${opts.index} of ${opts.total}: ${parsedUrl.pathname}`,
    cookiePath: opts.cookiePath ?? 'visual_tests/_cookies.yaml',
    cssOverridePath: opts.cssOverridePath ?? 'visual_tests/_override.css',
    jsOnReadyPath: opts.jsOnReadyPath ?? 'visual_tests/_on-ready.js',
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
