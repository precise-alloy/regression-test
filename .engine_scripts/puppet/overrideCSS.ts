import * as fs from 'fs';
import type { Page } from 'puppeteer';
import type { EngineScenario, PuppetOverrideCSS } from '../engine.js';

export default (async (page: Page, scenario: EngineScenario): Promise<void> => {
  const cssOverridePath = scenario.cssOverridePath;

  if (!cssOverridePath) {
    return;
  } else if (!fs.existsSync(cssOverridePath)) {
    console.log('File not exist: ' + cssOverridePath);
    return;
  }

  const override = fs.readFileSync(cssOverridePath, 'utf-8');

  // inject arbitrary css to override styles
  await page.evaluate(`window._styleData = '${override}'`);
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.type = 'text/css';
    const styleNode = document.createTextNode(window._styleData!);
    style.appendChild(styleNode);
    document.head.appendChild(style);
  });

  console.log('BACKSTOP_TEST_CSS_OVERRIDE injected for: ' + scenario.label);
  // console.log(override);
}) as PuppetOverrideCSS;
