const fs = require('fs');
const YAML = require('js-yaml');
const chalkImport = import('chalk').then((m) => m.default);

module.exports = async (browserContext, scenario) => {
  let cookies = [];
  const cookiePath = scenario.cookiePath;
  const chalk = await chalkImport;
  const logPrefix = chalk.yellow(`[${scenario.index} of ${scenario.total}] `);

  // Read Cookies from File, if exists
  if (!!cookiePath && fs.existsSync(cookiePath)) {
    let content = fs.readFileSync(cookiePath);
    if (cookiePath.endsWith('.json')) {
      cookies = JSON.parse(content);
    } else if (cookiePath.endsWith('.yaml') || cookiePath.endsWith('.yml')) {
      cookies = YAML.load(content);
    }
  }

  // Add cookies to browser
  await browserContext.addCookies(cookies);

  // console.log('Cookie state restored with:', JSON.stringify(cookies, null, 2));
  console.log(logPrefix + 'Cookie state restored for: ' + scenario.label);
};
