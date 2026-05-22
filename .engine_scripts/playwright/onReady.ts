import type { Page, BrowserContext } from 'playwright';
import type { Viewport } from 'backstopjs';
import type { EngineScenario, OnReadyScript, EmbedFiles, Actions, ClickAndHoverHelper, BrowserScript } from '../engine.js';
import autoScroll from '../auto-scroll.js';
import scrollTop from '../scroll-top.js';

const chalkImport = import('chalk').then((m) => m.default);

export default (async (
  page: Page,
  scenario: EngineScenario,
  viewport: Viewport,
  isReference: boolean,
  browserContext: BrowserContext
): Promise<void> => {
  await (require('./embedFiles') as EmbedFiles)(scenario, page);
  await page.evaluate(autoScroll);
  const chalk = await chalkImport;
  const logPrefix = chalk.yellow(`[${scenario.index} of ${scenario.total}] `);

  page.on('load', async (data) => {
    try {
      await (require('./embedFiles') as EmbedFiles)(scenario, data);
      await data.evaluate(require('../auto-scroll') as BrowserScript);
    } catch (error) {
      console.log(logPrefix + error);
    }
  });

  console.log(logPrefix + 'SCENARIO > ' + scenario.label);

  if (!!scenario.actions) {
    await (require('./actions') as Actions)({ currentPage: page, scenario, browserContext });
  } else {
    await (require('./clickAndHoverHelper') as ClickAndHoverHelper)(page, scenario);
  }

  if (!scenario.noScrollTop) {
    await page.evaluate(scrollTop);
  }

  // add more ready handlers here...
  // await page.waitForLoadState('load', { timeout: 5000 });

  if (scenario.postInteractionWait) {
    await page.waitForTimeout(scenario.postInteractionWait as number);
  }
}) as OnReadyScript;
