import { Scenario } from 'backstopjs';

export interface ReplacementModel {
  ref: string;
  test: string;
  regex?: boolean;
  flags?: string;
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
  state?: string;
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

export type PersistAction = {
  persist: string;
  path?: string;
};

export type BackstopReport = {
  testSuite: string;
  tests: BackstopTest[];
  id: string;
};

export type BackstopTest = {
  pair: BackstopPair;
  status: string;
};

export type BackstopPair = {
  reference: string;
  test: string;
  selector: string;
  fileName: string;
  label: string;
  requireSameDimensions: boolean;
  misMatchThreshold: number;
  url: string;
  referenceUrl: string;
  expect: number;
  viewportLabel: string;
  diff: BackstopDiff;
  diffImage?: string;
};

export type BackstopDiff = {
  isSameDimensions: boolean;
  dimensionDifference: BackstopDimensionDifference;
  rawMisMatchPercentage: number;
  misMatchPercentage: string;
  analysisTime: number;
};

export type BackstopDimensionDifference = {
  width: number;
  height: number;
};
