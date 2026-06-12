module.exports = async (page, scenario, viewport, isReference, browserContext) => {
  if (scenario.basicAuth && scenario.basicAuth.origin && scenario.basicAuth.username && scenario.basicAuth.password) {
    const targetUrl = isReference && scenario.referenceUrl ? scenario.referenceUrl : scenario.url;
    const targetOrigin = new URL(targetUrl).origin;

    if (scenario.basicAuth.origin === targetOrigin) {
      // Backstop creates the browser context before this hook runs. Set
      // Playwright HTTP credentials on that fresh per-scenario context so the
      // browser responds only to Basic-auth challenges for the configured
      // origin, without broadcasting Authorization headers to subresources or
      // redirects.
      await browserContext.setHTTPCredentials({
        origin: scenario.basicAuth.origin,
        username: scenario.basicAuth.username,
        password: scenario.basicAuth.password,
      });
    } else {
      console.warn(
        `basicAuth origin ${scenario.basicAuth.origin} does not match scenario origin ${targetOrigin}; skipping Basic auth credentials for ${scenario.label}`
      );
    }
  }

  if (scenario.bypassCsp) {
    const browser = browserContext.browser();
    const browserName = browser ? browser.browserType().name() : undefined;

    if (browserName === 'chromium') {
      const session = await browserContext.newCDPSession(page);
      await session.send('Page.setBypassCSP', { enabled: true });
    } else {
      console.warn(`Playwright bypassCsp is only supported with chromium. Current browser: ${browserName ?? 'unknown'}`);
    }
  }

  await require('./loadCookies')(browserContext, scenario);
};
