import type { Page, BrowserContext } from 'playwright';
import type { Viewport } from 'backstopjs';
import type { EngineScenario, OnBeforeScript, LoadCookies } from '../engine.js';

export default (async (
  page: Page,
  scenario: EngineScenario,
  viewport: Viewport,
  isReference: boolean,
  browserContext: BrowserContext
): Promise<void> => {
  if (scenario.bypassCsp) {
    const browser = browserContext.browser();
    const browserName = browser ? browser.browserType().name() : undefined;

    if (browserName === 'chromium') {
      const session = await browserContext.newCDPSession(page);
      await session.send('Page.setBypassCSP', { enabled: true });
    } else {
      console.warn(`Playwright bypassCsp is only supported with chromium. Current browser: ${browserName ?? 'unknown'}`);
    }
  }

  await (require('./loadCookies') as LoadCookies)(browserContext, scenario);
}) as OnBeforeScript;
