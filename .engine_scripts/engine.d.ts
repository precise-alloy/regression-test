import type { Page, Frame, BrowserContext } from 'playwright';
import type { Page as PuppeteerPage } from 'puppeteer';
import type { Scenario, Viewport } from 'backstopjs';

export interface KeyPressSelector {
  selector: string;
  keyPress: string;
}

export interface ScenarioAction {
  frame?: string | string[];
  check?: string;
  click?: string;
  focus?: string;
  goto?: string;
  hide?: string;
  hover?: string;
  input?: string;
  value?: string;
  file?: string | string[];
  append?: boolean;
  useFileChooser?: boolean;
  remove?: string;
  press?: string;
  key?: string;
  scroll?: string;
  select?: string;
  label?: string;
  uncheck?: string;
  wait?: number | string;
  url: string;
  persist?: string;
  path?: string;
}

export interface EngineScenario extends Scenario {
  index: string;
  total: number;
  label: string;
  url: string;
  bypassCsp?: boolean;
  cookiePath?: string;
  useCssOverride?: boolean;
  cssOverridePath?: string;
  jsOnReadyPath?: string;
  noScrollTop?: boolean;
  postInteractionWait?: number;
  hoverSelector?: string | string[];
  hoverSelectors?: string | string[];
  clickSelector?: string | string[];
  clickSelectors?: string | string[];
  keyPressSelector?: KeyPressSelector | KeyPressSelector[];
  keyPressSelectors?: KeyPressSelector | KeyPressSelector[];
  scrollToSelector?: string;
  actions?: ScenarioAction[];
  getTestUrl?: (url: string) => string;
}

export interface CookieInput {
  name: string;
  value: string;
  domain: string | string[];
  path?: string;
  expirationDate?: number;
  [k: string]: unknown;
}

export interface ActionsContext {
  currentPage: Page;
  scenario: EngineScenario;
  browserContext: BrowserContext;
}

export type BrowserScript = () => Promise<void>;

export type OnBeforeScript = (
  page: Page,
  scenario: EngineScenario,
  viewport: Viewport,
  isReference: boolean,
  browserContext: BrowserContext
) => Promise<void>;
export type OnReadyScript = OnBeforeScript;

export type EmbedFiles = (scenario: EngineScenario, page: Page) => Promise<void>;
export type OverrideCSS = (page: Page, scenario: EngineScenario) => Promise<void>;
export type LoadCookies = (browserContext: BrowserContext, scenario: EngineScenario) => Promise<void>;
export type Actions = (context: ActionsContext) => Promise<void>;
export type ClickAndHoverHelper = (page: Page | Frame, scenario: EngineScenario) => Promise<void>;

export type PuppetOnBeforeScript = (
  page: PuppeteerPage,
  scenario: EngineScenario,
  viewport: Viewport,
  isReference: boolean,
  browserContext: unknown
) => Promise<void>;
export type PuppetOnReadyScript = (page: PuppeteerPage, scenario: EngineScenario, vp: Viewport) => Promise<void>;
export type PuppetOverrideCSS = (page: PuppeteerPage, scenario: EngineScenario) => Promise<void>;
export type PuppetClickAndHoverHelper = (page: PuppeteerPage, scenario: EngineScenario) => Promise<void>;
export type PuppetLoadCookies = (page: PuppeteerPage, scenario: EngineScenario) => Promise<void>;
