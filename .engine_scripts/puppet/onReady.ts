import * as fs from 'fs';
import type { Page } from 'puppeteer';
import type { Viewport } from 'backstopjs';
import type { EngineScenario, PuppetOnReadyScript, PuppetOverrideCSS, PuppetClickAndHoverHelper } from '../engine.js';
import autoScroll from '../auto-scroll.js';

export default (async (page: Page, scenario: EngineScenario, vp: Viewport): Promise<void> => {
  console.log('SCENARIO > ' + scenario.label);
  if (scenario.useCssOverride) {
    await (require('./overrideCSS') as PuppetOverrideCSS)(page, scenario);
  }
  await (require('./clickAndHoverHelper') as PuppetClickAndHoverHelper)(page, scenario);

  const jsOnReadyPath = scenario.jsOnReadyPath;

  if (!jsOnReadyPath) {
    return;
  } else if (!fs.existsSync(jsOnReadyPath)) {
    console.log('File not exist: ' + jsOnReadyPath);
    return;
  }

  const jsOnReadyScript = fs.readFileSync(jsOnReadyPath, 'utf-8');
  await page.evaluate(jsOnReadyScript).then(() => 'ONREADY script executed for: ' + scenario.label);

  // add more ready handlers here...
  await page.evaluate(autoScroll as Parameters<typeof page.evaluate>[0]);

  await page.waitForNetworkIdle({
    idleTime: 500,
    timeout: 5000,
  });
}) as PuppetOnReadyScript;
