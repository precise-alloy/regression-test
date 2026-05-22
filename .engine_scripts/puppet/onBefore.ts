import type { Page } from 'puppeteer';
import type { Viewport } from 'backstopjs';
import type { EngineScenario, PuppetOnBeforeScript, PuppetLoadCookies } from '../engine.js';

export default (async (page: Page, scenario: EngineScenario, viewport: Viewport, isReference: boolean, browserContext: unknown): Promise<void> => {
  await (require('./loadCookies') as PuppetLoadCookies)(browserContext as Page, scenario);
}) as PuppetOnBeforeScript;
