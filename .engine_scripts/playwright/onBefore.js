module.exports = async (page, scenario, viewport, isReference, browserContext) => {
  if (scenario.basicAuth && scenario.basicAuth.username && scenario.basicAuth.password) {
    const token = Buffer.from(`${scenario.basicAuth.username}:${scenario.basicAuth.password}`).toString('base64');
    await page.setExtraHTTPHeaders({ Authorization: `Basic ${token}` });
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
