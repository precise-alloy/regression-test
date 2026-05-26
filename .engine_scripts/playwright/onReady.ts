import type { Page, BrowserContext } from 'playwright';
import type { Viewport } from 'backstopjs';
import type { EngineScenario, OnReadyScript, EmbedFiles, Actions, ClickAndHoverHelper, BrowserScript } from '../engine.js';
import autoScroll from '../auto-scroll.js';
import scrollTop from '../scroll-top.js';

const chalkImport = import('chalk').then((m) => m.default);
const embedFiles = require('./embedFiles') as EmbedFiles;
const autoScrolls = require('../auto-scroll') as BrowserScript;
const actions = require('./actions') as Actions;
const clickAndHoverHelper = require('./clickAndHoverHelper') as ClickAndHoverHelper;

export default (async (
  page: Page,
  scenario: EngineScenario,
  viewport: Viewport,
  isReference: boolean,
  browserContext: BrowserContext
): Promise<void> => {
  await embedFiles(scenario, page);
  await page.evaluate(autoScroll);
  const chalk = await chalkImport;
  const logPrefix = chalk.yellow(`[${scenario.index} of ${scenario.total}] `);

  page.on('load', async (data) => {
    try {
      await embedFiles(scenario, data);
      await data.evaluate(autoScrolls);
    } catch (error) {
      console.log(logPrefix + error);
    }
  });

  console.log(logPrefix + 'SCENARIO > ' + scenario.label);

  if (!!scenario.actions) {
    await actions({ currentPage: page, scenario, browserContext });
  } else {
    await clickAndHoverHelper(page, scenario);
  }

  if (!scenario.noScrollTop) {
    await page.evaluate(scrollTop);
  }

  // add more ready handlers here...
  // await page.waitForLoadState('load', { timeout: 5000 });

  if (scenario.postInteractionWait) {
    const interactionWait = parseInt(String(scenario.postInteractionWait));
    if (!Number.isNaN(interactionWait) && interactionWait >= 0) {
      await page.waitForTimeout(interactionWait);
    } else {
      await page.waitForSelector(scenario.postInteractionWait as string);
    }
  }
}) as OnReadyScript;
