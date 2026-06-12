module.exports = async (page, scenario, viewport, isReference, browserContext) => {
  if (scenario.basicAuth) {
    const entries = (Array.isArray(scenario.basicAuth) ? scenario.basicAuth : [scenario.basicAuth]).filter(
      (entry) => entry && entry.origin && entry.username && entry.password
    );
    const targetUrl = isReference && scenario.referenceUrl ? scenario.referenceUrl : scenario.url;
    const targetOrigin = new URL(targetUrl).origin;
    const match = entries.find((entry) => entry.origin === targetOrigin);

    if (match) {
      // Backstop creates the browser context before this hook runs. Set
      // Playwright HTTP credentials on that fresh per-scenario context so the
      // browser responds only to Basic-auth challenges for the configured
      // origin, without broadcasting Authorization headers to subresources or
      // redirects.
      await browserContext.setHTTPCredentials({
        origin: match.origin,
        username: match.username,
        password: match.password,
      });
    } else if (entries.length > 0) {
      const configuredOrigins = entries.map((entry) => entry.origin).join(', ');
      console.warn(
        `No basicAuth entry matches scenario origin ${targetOrigin} (configured: ${configuredOrigins}); skipping Basic auth credentials for ${scenario.label}`
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
