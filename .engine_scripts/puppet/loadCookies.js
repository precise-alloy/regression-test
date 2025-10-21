const fs = require('fs');
const YAML = require('js-yaml');

module.exports = async (page, scenario) => {
  let cookies = [];
  const cookiePath = scenario.cookiePath;

  // READ COOKIES FROM FILE IF EXISTS
  if (!!cookiePath && fs.existsSync(cookiePath)) {
    let content = fs.readFileSync(cookiePath);
    if (cookiePath.endsWith('.json')) {
      cookies = JSON.parse(content);
    } else if (cookiePath.endsWith('.yaml') || cookiePath.endsWith('.yml')) {
      cookies = YAML.load(content);
    }
  }

  const parsedCookies = [];

  // MUNGE COOKIE DOMAIN
  [].forEach.call(cookies, (c) => {
    let domains = typeof c.domain === 'string' ? [c.domain] : c.domain;

    [].forEach.call(domains, (domain) => {
      const cookie = { ...c };
      if (domain.startsWith('http://') || domain.startsWith('https://')) {
        cookie.url = domain;
      } else {
        cookie.url = 'https://' + domain;
      }
      delete cookie.domain;

      parsedCookies.push(cookie);
    });
  });

  // SET COOKIES
  const setCookies = async () => {
    return Promise.all(
      parsedCookies.map(async (cookie) => {
        await page.setCookie(cookie);
      })
    );
  };
  await setCookies();

  // console.log('Cookie state restored with:', JSON.stringify(cookies, null, 2));
  console.log('Cookie state restored for: ' + scenario.label);
};
