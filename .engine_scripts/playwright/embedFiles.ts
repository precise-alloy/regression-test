import * as fs from 'fs';
import type { Page } from 'playwright';
import type { EngineScenario, EmbedFiles, OverrideCSS } from '../engine.js';

const chalkImport = import('chalk').then((m) => m.default);

const embedCss = async (scenario: EngineScenario, page: Page): Promise<void> => {
  if (scenario.useCssOverride) {
    await (require('./overrideCSS') as OverrideCSS)(page, scenario);
  }
};

const embedJs = async (scenario: EngineScenario, page: Page): Promise<void> => {
  const jsOnReadyPath = scenario.jsOnReadyPath;
  const chalk = await chalkImport;
  const logPrefix = chalk.yellow(`[${scenario.index} of ${scenario.total}] `);

  if (!jsOnReadyPath) {
    return;
  } else if (!fs.existsSync(jsOnReadyPath)) {
    console.log(logPrefix + 'File not exist: ' + jsOnReadyPath);
  } else {
    const jsOnReadyScript = fs.readFileSync(jsOnReadyPath, 'utf-8');
    await page.evaluate(jsOnReadyScript).then(() => console.log(logPrefix + '`onReady` script executed for: ' + scenario.label));
  }
};

export default (async (scenario: EngineScenario, page: Page): Promise<void> => {
  await embedJs(scenario, page);
  await embedCss(scenario, page);
}) as EmbedFiles;
