const fs = require('fs');
const path = require('path');
const autoScroll = require('../auto-scroll');
const scrollTop = require('../scroll-top');
const chalkImport = import('chalk').then((m) => m.default);

function getStorageState(stateName) {
  const statePath = path.join(process.cwd(), 'states', `storage-states--${stateName}.json`);
  if (fs.existsSync(statePath)) {
    const json = fs.readFileSync(statePath, 'utf8');
    return JSON.parse(json);
  }
}

module.exports = async (page, scenario, viewport, isReference, browserContext) => {
  if (scenario.restore) {
    console.log(logPrefix + 'restore:', scenario.restore);
    const states = getStorageState(scenario.restore);
    await browserContext.storageState(states);
  }

  await require('./embedFiles')(scenario, page);
  await page.evaluate(autoScroll);
  const chalk = await chalkImport;
  const logPrefix = chalk.yellow(`[${scenario.index} of ${scenario.total}] `);

  page.on('load', async (data) => {
    try {
      await require('./embedFiles')(scenario, data);
      await data.evaluate(require('../auto-scroll'));
    } catch (error) {
      console.log(logPrefix + error);
    }
  });

  console.log(logPrefix + 'SCENARIO > ' + scenario.label);

  if (!!scenario.actions) {
    await require('./actions')({ currentPage: page, scenario, browserContext });
  } else {
    await require('./clickAndHoverHelper')(page, scenario);
  }

  if (!scenario.noScrollTop) {
    await page.evaluate(scrollTop);
  }

  // add more ready handlers here...
  // await page.waitForLoadState('load', { timeout: 5000 });

  if (scenario.postInteractionWait) {
    await page.waitForTimeout(scenario.postInteractionWait);
  }
};
