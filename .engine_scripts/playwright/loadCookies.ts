import * as fs from 'fs';
import * as YAML from 'js-yaml';
import type { BrowserContext } from 'playwright';
import type { CookieInput, EngineScenario, LoadCookies } from '../engine.js';

const chalkImport = import('chalk').then((m) => m.default);

export default (async (browserContext: BrowserContext, scenario: EngineScenario): Promise<void> => {
  let cookiesFromFile: CookieInput[] = [];
  const cookiePath = scenario.cookiePath;
  const chalk = await chalkImport;
  const logPrefix = chalk.yellow(`[${scenario.index} of ${scenario.total}] `);

  // Read Cookies from File, if exists
  if (!!cookiePath && fs.existsSync(cookiePath)) {
    let content = fs.readFileSync(cookiePath);
    if (cookiePath.endsWith('.json')) {
      cookiesFromFile = JSON.parse(content.toString());
    } else if (cookiePath.endsWith('.yaml') || cookiePath.endsWith('.yml')) {
      cookiesFromFile = YAML.load(content.toString()) as CookieInput[];
    }
  }

  const cookies: CookieInput[] = [];

  // MUNGE COOKIE DOMAIN
  [].forEach.call(cookiesFromFile, (c: CookieInput) => {
    let domains = typeof c.domain === 'string' ? [c.domain] : c.domain;

    [].forEach.call(domains, (domain: string) => {
      const cookie = { ...c, domain };

      if (!cookie.expirationDate) {
        cookie.expirationDate = Date.now() / 1000 + 31536000; // 1 year from now
      }

      cookies.push(cookie);
    });
  });

  if (process.env.DEBUG_COOKIES === 'true') {
    console.log('Restoring cookies from:', cookiePath);
    console.log(JSON.stringify(cookies, null, 2));
  }

  // Add cookies to browser
  await browserContext.addCookies(cookies as Parameters<typeof browserContext.addCookies>[0]);

  // console.log('Cookie state restored with:', JSON.stringify(cookies, null, 2));
  console.log(logPrefix + 'Cookie state restored for: ' + scenario.label);
}) as LoadCookies;
