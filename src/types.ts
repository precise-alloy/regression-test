import { Scenario } from 'backstopjs';

export interface ReplacementModel {
  ref: string;
  test: string;
}

export interface ReplacementsModel {
  profiles: { [name: string]: ReplacementModel[] };
}

export interface TestSuiteModel {
  urlReplacements?: ReplacementModel[];
  scenarios: ScenarioModel[];
  hideSelectors?: string[];
  removeSelectors?: string[];
  useCssOverride?: boolean;
  cssOverridePath?: string;
  viewportsPath?: string;
  debug?: boolean;
  asyncCaptureLimit?: number;
  asyncCompareLimit?: number;
  browser?: 'chromium' | 'firefox' | 'webkit';
  misMatchThreshold?: number;
  postInteractionWait?: number;
  viewportNames?: string | string[];
  ignoreSslErrors?: boolean;
}

export interface ScenarioModel extends Scenario {
  requiredLogin?: boolean;
  id?: string;
  needs?: string | string[];
  actions?: unknown[];
  description: string;
  cssOverridePath?: string;
  index: string;
  jsOnReadyPath?: string;
  total: number;
  viewportNames?: string | string[];
  useCssOverride?: boolean;
  noScrollTop?: boolean;
  misMatchThreshold?: number;
  postInteractionWait?: number;
}
