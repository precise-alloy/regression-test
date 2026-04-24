import { describe, expect, it, vi } from 'vitest';
import { getBrowserInstallTargets, getDependencyResolver, installBrowsers } from '../src/install.ts';

describe('install.ts', () => {
  it('reads the supported browser targets in the expected order from browsers.json', () => {
    const resolver = {
      resolve: (id: string) => {
        if (id === 'playwright-core/package.json') {
          return '/tmp/playwright-core/package.json';
        }

        throw new Error(`unexpected resolve: ${id}`);
      },
    };

    const targets = getBrowserInstallTargets(resolver, (() =>
      JSON.stringify({
        browsers: [
          { name: 'webkit', browserVersion: '17' },
          { name: 'chromium', browserVersion: '126' },
          { name: 'firefox', browserVersion: '127' },
        ],
      })) as never);

    expect(targets).toEqual([
      { name: 'chromium', browserVersion: '126' },
      { name: 'firefox', browserVersion: '127' },
      { name: 'webkit', browserVersion: '17' },
    ]);
  });

  it('throws a readable error when a browser version is missing from browsers.json', () => {
    const resolver = {
      resolve: () => '/tmp/playwright-core/package.json',
    };

    expect(() =>
      getBrowserInstallTargets(resolver, (() =>
        JSON.stringify({
          browsers: [{ name: 'chromium' }, { name: 'firefox', browserVersion: '127' }, { name: 'webkit', browserVersion: '17' }],
        })) as never)
    ).toThrow(/chromium/);
  });

  it('returns a dependency resolver with package resolution capability', () => {
    const resolver = getDependencyResolver();

    expect(typeof resolver.resolve).toBe('function');
    expect(resolver.resolve('backstopjs/package.json')).toMatch(/backstopjs[\\/]package\.json$/);
  });

  it('invokes the Playwright CLI with the resolved browser names and keeps parity logs on success', () => {
    const spawn = vi.fn(() => ({ status: 0 }));
    const exitFn = vi.fn();
    const log = vi.fn();
    const resolver = {
      resolve: (id: string) => {
        if (id === 'playwright/package.json') {
          return '/tmp/playwright/package.json';
        }

        if (id === 'playwright-core/package.json') {
          return '/tmp/playwright-core/package.json';
        }

        throw new Error(`unexpected resolve: ${id}`);
      },
    };

    installBrowsers({
      dependencyResolver: resolver,
      readFileSync: (() =>
        JSON.stringify({
          browsers: [
            { name: 'webkit', browserVersion: '17' },
            { name: 'chromium', browserVersion: '126' },
            { name: 'firefox', browserVersion: '127' },
          ],
        })) as never,
      spawn: spawn as never,
      exitFn: exitFn as never,
      log,
      execPath: '/node',
    });

    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn.mock.calls[0][0]).toBe('/node');
    expect(spawn.mock.calls[0][1]).toEqual([expect.stringMatching(/playwright[\\/]cli\.js$/), 'install', 'chromium', 'firefox', 'webkit']);
    expect(spawn.mock.calls[0][2]).toEqual(expect.objectContaining({ stdio: 'inherit' }));
    expect(exitFn).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  });

  it('maps spawn failures and non-zero exits to the injected exit function', () => {
    const resolver = {
      resolve: (id: string) => {
        if (id === 'playwright/package.json') {
          return '/tmp/playwright/package.json';
        }

        if (id === 'playwright-core/package.json') {
          return '/tmp/playwright-core/package.json';
        }

        throw new Error(`unexpected resolve: ${id}`);
      },
    };

    const exitFn = vi.fn();
    installBrowsers({
      dependencyResolver: resolver,
      readFileSync: (() =>
        JSON.stringify({
          browsers: [
            { name: 'webkit', browserVersion: '17' },
            { name: 'chromium', browserVersion: '126' },
            { name: 'firefox', browserVersion: '127' },
          ],
        })) as never,
      spawn: (() => ({ status: 2 })) as never,
      exitFn: exitFn as never,
      log: vi.fn(),
      execPath: '/node',
    });
    expect(exitFn).toHaveBeenCalledWith(2);

    exitFn.mockClear();
    installBrowsers({
      dependencyResolver: resolver,
      readFileSync: (() =>
        JSON.stringify({
          browsers: [
            { name: 'webkit', browserVersion: '17' },
            { name: 'chromium', browserVersion: '126' },
            { name: 'firefox', browserVersion: '127' },
          ],
        })) as never,
      spawn: (() => ({ error: new Error('boom') })) as never,
      exitFn: exitFn as never,
      log: vi.fn(),
      execPath: '/node',
    });
    expect(exitFn).toHaveBeenCalledWith(1);

    exitFn.mockClear();
    installBrowsers({
      dependencyResolver: resolver,
      readFileSync: (() =>
        JSON.stringify({
          browsers: [
            { name: 'webkit', browserVersion: '17' },
            { name: 'chromium', browserVersion: '126' },
            { name: 'firefox', browserVersion: '127' },
          ],
        })) as never,
      spawn: (() => ({ signal: 'SIGTERM' })) as never,
      exitFn: exitFn as never,
      log: vi.fn(),
      execPath: '/node',
    });
    expect(exitFn).toHaveBeenCalledWith(1);

    exitFn.mockClear();
    installBrowsers({
      dependencyResolver: resolver,
      readFileSync: (() =>
        JSON.stringify({
          browsers: [
            { name: 'webkit', browserVersion: '17' },
            { name: 'chromium', browserVersion: '126' },
            { name: 'firefox', browserVersion: '127' },
          ],
        })) as never,
      spawn: (() => ({ status: undefined })) as never,
      exitFn: exitFn as never,
      log: vi.fn(),
      execPath: '/node',
    });
    expect(exitFn).toHaveBeenCalledWith(1);
  });
});
