const fs = require('fs');
const YAML = require('js-yaml');
const chalkImport = import('chalk').then((m) => m.default);

module.exports = async (browserContext, scenario) => {
  let cookiesFromFile = [];
  const cookiePath = scenario.cookiePath;
  const chalk = await chalkImport;
  const logPrefix = chalk.yellow(`[${scenario.index} of ${scenario.total}] `);

  // Read Cookies from File, if exists
  if (!!cookiePath && fs.existsSync(cookiePath)) {
    let content = fs.readFileSync(cookiePath);
    if (cookiePath.endsWith('.json')) {
      cookiesFromFile = JSON.parse(content);
    } else if (cookiePath.endsWith('.yaml') || cookiePath.endsWith('.yml')) {
      cookiesFromFile = YAML.load(content);
    }
  }

  const cookies = [];

  // MUNGE COOKIE DOMAIN
  [].forEach.call(cookiesFromFile, (c) => {
    let domains = typeof c.domain === 'string' ? [c.domain] : c.domain;

    [].forEach.call(domains, (domain) => {
      const cookie = { ...c };
      if (domain.startsWith('http://') || domain.startsWith('https://')) {
        cookie.url = domain;
      } else {
        cookie.url = 'https://' + domain;
      }

      if (!cookie.expirationDate) {
        cookie.expirationDate = Date.now() / 1000 + 31536000; // 1 year from now
      }

      cookie.domain = undefined;
      delete cookie.domain;

      cookies.push(cookie);
    });
  });

  if (process.env.DEBUG_COOKIES === 'true') {
    console.log('Restoring cookies from:', cookiePath);
    console.log(JSON.stringify(cookies, null, 2));
  }

  // Add cookies to browser
  await browserContext.addCookies(cookies);

  // console.log('Cookie state restored with:', JSON.stringify(cookies, null, 2));
  console.log(logPrefix + 'Cookie state restored for: ' + scenario.label);
};
