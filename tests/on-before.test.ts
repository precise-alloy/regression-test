import { createRequire } from 'module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const onBefore = require('../.engine_scripts/playwright/onBefore.js');

afterEach(() => {
  vi.restoreAllMocks();
});

function createScenario(origin: string, url = 'https://protected.example.com/page') {
  return {
    basicAuth: {
      origin,
      username: 'user',
      password: 'pass',
    },
    bypassCsp: false,
    cookiePath: '',
    index: '1',
    label: 'home',
    total: 1,
    url,
  };
}

describe('playwright onBefore basicAuth setup', () => {
  it('sets Playwright HTTP credentials only for matching scenario origin', async () => {
    const page = { route: vi.fn() };
    const browserContext = {
      addCookies: vi.fn(),
      setHTTPCredentials: vi.fn(),
    };
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await onBefore(page, createScenario('https://protected.example.com'), undefined, false, browserContext);

    expect(browserContext.setHTTPCredentials).toHaveBeenCalledWith({
      origin: 'https://protected.example.com',
      username: 'user',
      password: 'pass',
    });
    expect(page.route).not.toHaveBeenCalled();
  });

  it('skips inherited credentials when the scenario origin does not match', async () => {
    const page = { route: vi.fn() };
    const browserContext = {
      addCookies: vi.fn(),
      setHTTPCredentials: vi.fn(),
    };
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await onBefore(page, createScenario('https://staging.example.com', 'https://production.example.com/page'), undefined, false, browserContext);

    expect(browserContext.setHTTPCredentials).not.toHaveBeenCalled();
    expect(page.route).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      'basicAuth origin https://staging.example.com does not match scenario origin https://production.example.com; skipping Basic auth credentials for home'
    );
  });
});
