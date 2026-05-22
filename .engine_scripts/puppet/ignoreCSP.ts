/**
 * IGNORE CSP HEADERS
 * Listen to all requests. If a request matches scenario.url
 * then fetch the request again manually, strip out CSP headers
 * and respond to the original request without CSP headers.
 * Allows `ignoreHTTPSErrors: true` BUT... requires `debugWindow: true`
 *
 * see https://github.com/GoogleChrome/puppeteer/issues/1229#issuecomment-380133332
 * this is the workaround until native page CSP bypass lands... https://github.com/GoogleChrome/puppeteer/pull/2324
 *
 * @param      {REQUEST}  request
 * @return     {VOID}
 *
 * Use this in an onBefore script E.G.
  ```
  module.exports = async function(page, scenario) {
    require('./removeCSP')(page, scenario);
  }
  ```
 *
 */

import * as https from 'https';
import type { Page } from 'puppeteer';
import type { EngineScenario } from '../engine.js';

// node-fetch is not a declared dependency; typed to reflect the subset used here
type FetchFn = (
  url: string,
  options: {
    headers: Record<string, string>;
    body: string | undefined;
    method: string;
    follow: number;
    agent: https.Agent;
  }
) => Promise<{
  buffer(): Promise<Buffer>;
  headers: { _headers: Record<string, string | string[]> };
  status: number;
}>;

const fetch = require('node-fetch') as FetchFn;
const agent = new https.Agent({
  rejectUnauthorized: false,
});

export default async function (page: Page, scenario: EngineScenario): Promise<void> {
  const intercept = async (request: Parameters<Parameters<typeof page.on<'request'>>[1]>[0], targetUrl: string): Promise<void> => {
    const requestUrl = request.url();

    // FIND TARGET URL REQUEST
    if (requestUrl === targetUrl) {
      const cookiesList = await page.cookies(requestUrl);
      const cookies = cookiesList.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
      const headers = Object.assign(request.headers(), { cookie: cookies });
      const options = {
        headers,
        body: request.postData(),
        method: request.method(),
        follow: 20,
        agent,
      };

      const result = await fetch(requestUrl, options);

      const buffer = await result.buffer();
      const cleanedHeaders = result.headers._headers || {};
      cleanedHeaders['content-security-policy'] = '';
      await request.respond({
        body: buffer,
        headers: cleanedHeaders as Record<string, string>,
        status: result.status,
      });
    } else {
      request.continue();
    }
  };

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    intercept(req, scenario.url!);
  });
}
