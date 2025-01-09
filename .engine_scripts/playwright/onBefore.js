const fs = require('fs');
const path = require('path');
const YAML = require('js-yaml');
const chalkImport = import('chalk').then((m) => m.default);

function getStorageState(stateName) {
  const statePath = path.join(process.cwd(), 'states', `${stateName}.yaml`);
  if (fs.existsSync(statePath)) {
    const yaml = fs.readFileSync(statePath, 'utf8');
    return YAML.load(yaml);
  }
}

module.exports = async (page, scenario, viewport, isReference, browserContext) => {
  const chalk = await chalkImport;
  const logPrefix = chalk.yellow(`[${scenario.index} of ${scenario.total}] `);
  await require('./loadCookies')(browserContext, scenario);

  if (scenario.restore) {
    const stateNames = typeof scenario.restore === 'string' ? [scenario.restore] : scenario.restore;

    for (const stateName of stateNames) {
      console.log(logPrefix + 'Restore:', stateName);
      const states = getStorageState(stateName);
      await browserContext.storageState(states);
    }
  }
};
