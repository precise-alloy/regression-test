module.exports = async (page, scenario, viewport, isReference, browserContext) => {
  if (scenario.basicAuth && scenario.basicAuth.username && scenario.basicAuth.password) {
    const token = Buffer.from(`${scenario.basicAuth.username}:${scenario.basicAuth.password}`).toString('base64');
    const targetUrl = isReference && scenario.referenceUrl ? scenario.referenceUrl : scenario.url;
    const targetOrigin = new URL(targetUrl).origin;

    // Scope the Authorization header to the protected origin only, so the
    // credentials are never broadcast to third-party subresources (analytics,
    // CDNs, fonts, etc.) the page might request.
    await page.route(
      (url) => url.origin === targetOrigin,
      async (route) => {
        const headers = { ...route.request().headers(), authorization: `Basic ${token}` };
        await route.continue({ headers });
      }
    );
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
