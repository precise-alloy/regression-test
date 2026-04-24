import chalk from 'chalk';
import fs from 'fs';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import { exit } from 'process';

const supportedBrowsers = ['chromium', 'firefox', 'webkit'] as const;

type SupportedBrowser = (typeof supportedBrowsers)[number];

type PlaywrightBrowserMetadata = {
  name: string;
  browserVersion?: string;
};

type PlaywrightBrowsersFile = {
  browsers: PlaywrightBrowserMetadata[];
};

type BrowserInstallTarget = {
  name: SupportedBrowser;
  browserVersion: string;
};

export type DependencyResolver = {
  resolve: (id: string) => string;
};

export function getDependencyResolver(): DependencyResolver {
  const currentModuleRequire = createRequire(import.meta.url);

  try {
    currentModuleRequire.resolve('playwright/package.json');
    currentModuleRequire.resolve('playwright-core/package.json');
    return currentModuleRequire;
  } catch {
    const backstopPackageJsonPath = currentModuleRequire.resolve('backstopjs/package.json');
    return createRequire(backstopPackageJsonPath);
  }
}

export function getBrowserInstallTargets(
  dependencyResolver: DependencyResolver = getDependencyResolver(),
  readFileSync: typeof fs.readFileSync = fs.readFileSync
): BrowserInstallTarget[] {
  const playwrightCorePackageJsonPath = dependencyResolver.resolve('playwright-core/package.json');
  const browsersJsonPath = path.join(path.dirname(playwrightCorePackageJsonPath), 'browsers.json');
  const browsers = JSON.parse(readFileSync(browsersJsonPath, 'utf-8')) as PlaywrightBrowsersFile;

  return supportedBrowsers.map((browserName) => {
    const browser = browsers.browsers.find((candidate) => candidate.name === browserName);

    if (!browser?.browserVersion) {
      throw new Error(`Unable to determine the installed Playwright browser version for ${browserName}.`);
    }

    return {
      name: browserName,
      browserVersion: browser.browserVersion,
    };
  });
}

type InstallBrowserDependencies = {
  dependencyResolver?: DependencyResolver;
  readFileSync?: typeof fs.readFileSync;
  spawn?: typeof spawnSync;
  exitFn?: typeof exit;
  env?: NodeJS.ProcessEnv;
  execPath?: string;
  log?: typeof console.log;
};

export function installBrowsers({
  dependencyResolver,
  readFileSync = fs.readFileSync,
  spawn = spawnSync,
  exitFn = exit,
  env = process.env,
  execPath = process.execPath,
  log = console.log,
}: InstallBrowserDependencies = {}) {
  try {
    const resolver = dependencyResolver ?? getDependencyResolver();
    const playwrightPackageJsonPath = resolver.resolve('playwright/package.json');
    const playwrightCliPath = path.join(path.dirname(playwrightPackageJsonPath), 'cli.js');
    const browserInstallTargets = getBrowserInstallTargets(resolver, readFileSync);

    log(chalk.blue('Installing browser binaries used by this regressify release:'));
    browserInstallTargets.forEach((target) => {
      log(`- ${target.name}: ${target.browserVersion}`);
    });
    log(chalk.blue('Use these versions for BrowserStack browserVersion values when you need parity.'));

    const result = spawn(execPath, [playwrightCliPath, 'install', ...browserInstallTargets.map((target) => target.name)], {
      stdio: 'inherit',
      env,
    });

    if (result.error) {
      throw result.error;
    }

    if (result.signal) {
      throw new Error(`Playwright install was interrupted by signal ${result.signal}.`);
    }

    if (typeof result.status !== 'number') {
      throw new Error('Playwright install exited without a status code.');
    }

    if (result.status !== 0) {
      exitFn(result.status);
      return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(chalk.red(message));
    exitFn(1);
  }
}
