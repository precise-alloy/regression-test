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

/**
 * HTTP Basic Authentication credentials applied before navigation.
 *
 * Each value may reference an environment variable using `${VAR}` (or
 * `$VAR`) syntax so secrets stay out of committed YAML. Plain literals
 * are also accepted but discouraged. `origin` must be the exact protected
 * origin (scheme://host:port), so inherited credentials never apply to
 * unrelated scenario URLs.
 */
export interface BasicAuthModel {
  origin: string;
  username: string;
  password: string;
}

/**
 * Workspace-level defaults loaded from `regressify.yaml` (or `.yml`)
 * at the workspace root. Provides default values for any property
 * that is not set on the test suite or the scenario.
 *
 * Resolution order: scenario → test suite → workspace → hardcoded default.
 */
export interface WorkspaceConfig {
  // Shared with TestSuiteModel
  urlReplacements?: ReplacementModel[];
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
  bypassCsp?: boolean;
  ignoreSslErrors?: boolean;
  state?: string;
  basicAuth?: BasicAuthModel;
  // Scenario-only options that make sense as workspace defaults
  delay?: number;
  cookiePath?: string;
  jsOnReadyPath?: string;
  noScrollTop?: boolean;
  requiredLogin?: boolean;
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
  bypassCsp?: boolean;
  ignoreSslErrors?: boolean;
  state?: string;
  basicAuth?: BasicAuthModel;
}

export interface ScenarioModel extends Scenario {
  testSuite: string;
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
  bypassCsp?: boolean;
  noScrollTop?: boolean;
  misMatchThreshold?: number;
  postInteractionWait?: number;
  basicAuth?: BasicAuthModel;
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

export type HtmlReportSummary = {
  id: string;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
};
