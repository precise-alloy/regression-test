import * as fs from 'fs';
import * as YAML from 'js-yaml';
import type { Page } from 'puppeteer';
import type { CookieInput, EngineScenario, PuppetLoadCookies } from '../engine.js';

export default (async (page: Page, scenario: EngineScenario): Promise<void> => {
  let cookiesFromFile: CookieInput[] = [];
  const cookiePath = scenario.cookiePath;

  // READ COOKIES FROM FILE IF EXISTS
  if (!!cookiePath && fs.existsSync(cookiePath)) {
    let content = fs.readFileSync(cookiePath);
    if (cookiePath.endsWith('.json')) {
      cookiesFromFile = JSON.parse(content.toString());
    } else if (cookiePath.endsWith('.yaml') || cookiePath.endsWith('.yml')) {
      cookiesFromFile = YAML.load(content.toString()) as CookieInput[];
    }
  }

  const cookies: Array<Record<string, unknown>> = [];

  // MUNGE COOKIE DOMAIN
  [].forEach.call(cookiesFromFile, (c: CookieInput) => {
    let domains = typeof c.domain === 'string' ? [c.domain] : c.domain;
    if (!domains || domains.length === 0) {
      return;
    }

    [].forEach.call(domains, (domain: string) => {
      const cookie: Record<string, unknown> = { ...c };
      if (domain.startsWith('http://') || domain.startsWith('https://')) {
        cookie['url'] = domain;
      } else {
        cookie['url'] = 'https://' + domain;
      }

      if (!cookie['expirationDate']) {
        cookie['expirationDate'] = Date.now() / 1000 + 31536000; // 1 year from now
      }

      cookie['domain'] = undefined;
      delete cookie['domain'];

      cookies.push(cookie);
    });
  });

  if (process.env.DEBUG_COOKIES === 'true') {
    console.log('Restoring cookies from:', cookiePath);
    console.log(JSON.stringify(cookies, null, 2));
  }

  // SET COOKIES
  const setCookies = async (): Promise<void> => {
    return Promise.all(
      cookies.map(async (cookie) => {
        await page.setCookie(cookie as unknown as Parameters<typeof page.setCookie>[0]);
      })
    ).then(() => undefined);
  };
  await setCookies();

  // console.log('Cookie state restored with:', JSON.stringify(cookies, null, 2));
  console.log('Cookie state restored for: ' + scenario.label);
}) as PuppetLoadCookies;
