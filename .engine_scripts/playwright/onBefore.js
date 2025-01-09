const fs = require('fs');
const path = require('path');

function getStorageState(stateName) {
  const statePath = path.join(process.cwd(), 'states', `storage-states--${stateName}.json`);
  if (fs.existsSync(statePath)) {
    const json = fs.readFileSync(statePath, 'utf8');
    return JSON.parse(json);
  }
}

module.exports = async (page, scenario, viewport, isReference, browserContext) => {
  await require('./loadCookies')(browserContext, scenario);

  if (scenario.restore) {
    console.log(logPrefix + 'restore:', scenario.restore);
    const states = getStorageState(scenario.restore);
    await browserContext.storageState(states);
  }
};
