const fs = require('fs');
const path = require('path');
const YAML = require('js-yaml');

function getStorageState(stateName) {
  const statePath = path.join(process.cwd(), 'states', `${stateName}.yaml`);
  if (fs.existsSync(statePath)) {
    const yaml = fs.readFileSync(statePath, 'utf8');
    return YAML.load(yaml);
  }
}

module.exports = async (page, scenario, viewport, isReference, browserContext) => {
  const logPrefix = chalk.yellow(`[${scenario.index} of ${scenario.total}] `);
  await require('./loadCookies')(browserContext, scenario);

  if (scenario.restore) {
    console.log(logPrefix + 'restore:', scenario.restore);
    const states = getStorageState(scenario.restore);
    await browserContext.storageState(states);
  }
};
