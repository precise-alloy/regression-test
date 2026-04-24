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

function getDependencyResolver() {
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

function getBrowserInstallTargets(): BrowserInstallTarget[] {
  const dependencyResolver = getDependencyResolver();
  const playwrightCorePackageJsonPath = dependencyResolver.resolve('playwright-core/package.json');
  const browsersJsonPath = path.join(path.dirname(playwrightCorePackageJsonPath), 'browsers.json');
  const browsers = JSON.parse(fs.readFileSync(browsersJsonPath, 'utf-8')) as PlaywrightBrowsersFile;

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

export function installBrowsers() {
  try {
    const dependencyResolver = getDependencyResolver();
    const playwrightPackageJsonPath = dependencyResolver.resolve('playwright/package.json');
    const playwrightCliPath = path.join(path.dirname(playwrightPackageJsonPath), 'cli.js');
    const browserInstallTargets = getBrowserInstallTargets();

    console.log(chalk.blue('Installing browser binaries used by this regressify release:'));
    browserInstallTargets.forEach((target) => {
      console.log(`- ${target.name}: ${target.browserVersion}`);
    });
    console.log(chalk.blue('Use these versions for BrowserStack browserVersion values when you need parity.'));

    const result = spawnSync(process.execPath, [playwrightCliPath, 'install', ...browserInstallTargets.map((target) => target.name)], {
      stdio: 'inherit',
      env: process.env,
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
      exit(result.status);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(message));
    exit(1);
  }
}