import fs, { globSync } from 'fs';
import { Config, Scenario, ViewportNext } from 'backstopjs';
import { createScenario } from './scenarios.js';
import path from 'path';
import { getFlagArg, getStringArg, parseDataFromFile, getLibraryPath } from './helpers.js';
import { TestSuiteModel, ScenarioModel, PersistAction } from './types.js';
import chalk from 'chalk';
import { exit } from 'process';
import YAML from 'js-yaml';
import { getTestUrl } from './replacements.js';
import { getStatePath } from './state.js';

type ArgConfig = {
  testSuite: string;
  isRef: boolean;
  globalRequiredLogin: boolean;
};

const libraryPath = getLibraryPath();
const engine: 'puppeteer' | 'playwright' = 'playwright';

function getArgConfigs(args: string[]): ArgConfig[] {
  const testSuite = getStringArg(args, '--test-suite');
  const isRef = getFlagArg(args, '--ref');
  const globalRequiredLogin = getFlagArg(args, '--requiredLogin');
  if (globalRequiredLogin) {
    console.log('force run all scenarios in login mode');
  }

  if (!testSuite) {
    console.log(chalk.red('Argument `--test-suite` must be set.'));
    console.log(chalk.red('Sample command: regressify <command> --test-suite <test-suite>'));
    console.log(chalk.red('Command is either `ref`, `approve` or `test`.'));
    exit(1);
  }

  return globSync(testSuite + '.tests.{yaml,yml,json}', { cwd: path.join(process.cwd(), 'visual_tests') })
    .map((file) => {
      const fileName = path.basename(file);
      return fileName.substring(0, fileName.indexOf('.tests.')).toLowerCase();
    })
    .map((s) => ({
      testSuite: s,
      isRef,
      globalRequiredLogin,
    }));
}

function getScriptPath(scriptPath: string, engine: 'puppeteer' | 'playwright') {
  return path.join(libraryPath, '.engine_scripts', (engine == 'puppeteer' ? 'puppet' : 'playwright') + scriptPath);
}

function getData(testSuite: String): TestSuiteModel | undefined {
  let extensions: { ext: string; parse: (content: string) => unknown }[] = [
    {
      ext: 'yaml',
      parse: YAML.load,
    },
    {
      ext: 'yml',
      parse: YAML.load,
    },
    {
      ext: 'json',
      parse: JSON.parse,
    },
  ];

  for (let i = 0; i < extensions.length; i++) {
    const dataPath = path.join(process.cwd(), 'visual_tests', `${testSuite}.tests.${extensions[i].ext}`);

    if (fs.existsSync(dataPath)) {
      console.log('Data path: ', dataPath);
      const content = fs.readFileSync(dataPath, 'utf-8');
      return extensions[i].parse(content) as TestSuiteModel;
    }
  }

  throw `Data file not found for test suite: ${testSuite}`;
}

function expandScenarios(model: ScenarioModel, scenarios: ScenarioModel[], level: number) {
  if (level > 100) {
    throw 'Level is too large';
  }

  if (!model.needs) {
    return;
  }

  const neededActions: string[] = [];
  if (typeof model.needs === 'string') {
    neededActions.push(model.needs);
  } else {
    model.needs.forEach((n) => neededActions.push(n));
  }

  neededActions.reverse().forEach((n) => {
    const targetScenarios = scenarios.filter((s) => !!s.id && s.id.toLowerCase() == n.toLowerCase());
    if (targetScenarios.length !== 1) {
      throw `The test suite must contains exactly ONE scenario with id: ${n}`;
    }

    var targetScenario = targetScenarios[0];
    expandScenarios(targetScenario, scenarios, level + 1);
    if (!!targetScenario.actions) {
      if (!model.actions) {
        model.actions = [];
      }
      model.actions = [...targetScenario.actions, ...model.actions];
    }
  });

  model.needs = undefined;
}

function getScenarios(args: string[], testSuite: string, isRef: boolean, globalRequiredLogin: boolean) {
  const scenarios: Scenario[] = [];

  const data = getData(testSuite);

  const viewports = parseDataFromFile(data?.viewportsPath ?? 'common/_viewports.yaml') as ViewportNext[];
  if (data) {
    [].forEach.call(data.scenarios, (s: ScenarioModel) => {
      expandScenarios(s, data.scenarios, 0);
    });

    const getTestUrlLocal = (url: string) => getTestUrl(args, url, isRef);

    const pad = String(data?.scenarios.length).length;
    data.scenarios.forEach((s, index) => {
      const opts: ScenarioModel = {
        ...s,
        requiredLogin: globalRequiredLogin || s.requiredLogin,
        getTestUrl: getTestUrlLocal,
        url: isRef ? s.url : getTestUrl(args, s.url, isRef),
        index: String(index + 1).padStart(pad, ' '),
        total: data.scenarios.length,
        delay: s.delay ?? 1000,
        state: data.state,
        hideSelectors: s.hideSelectors ?? data.hideSelectors,
        removeSelectors: s.removeSelectors ?? data.removeSelectors,
        useCssOverride: s.useCssOverride ?? data.useCssOverride,
        jsOnReadyPath: s.jsOnReadyPath,
        viewports: !!s.viewportNames
          ? typeof s.viewportNames === 'string'
            ? viewports.filter((v) => v.label.toLowerCase() == (s.viewportNames as string).trim().toLowerCase())
            : viewports.filter((v) => s.viewportNames?.includes(v.label))
          : !!data.viewportNames
          ? typeof data.viewportNames === 'string'
            ? viewports.filter((v) => v.label.toLowerCase() == (data.viewportNames as string).trim().toLowerCase())
            : viewports.filter((v) => data.viewportNames?.includes(v.label))
          : undefined,
        referenceUrl: !isRef ? s.url : undefined,
        misMatchThreshold: s.misMatchThreshold ?? data.misMatchThreshold ?? 0.1,
        postInteractionWait: s.postInteractionWait ?? data.postInteractionWait ?? 1,
      };

      if (opts.restore && Array.isArray(opts.restore)) {
        // Deduplicate restore array
        opts.restore = opts.restore.filter((value, index, self) => self.indexOf(value) === index);
      }

      if (opts.actions && Array.isArray(opts.actions)) {
        let persistActions = opts.actions.filter((a) => (a as PersistAction).persist) as PersistAction[];
        for (const persistAction of persistActions) {
          persistAction.path = getStatePath(persistAction.persist as string);
          // console.log('Persist action: ', persistAction);
        }
      }

      const scenario = createScenario(opts);
      scenarios.push(scenario);
    });
  }

  return { scenarios, data, viewports };
}

export function getConfigs(args: string[]): Config[] {
  return getArgConfigs(args).map((argConfig) => {
    const { testSuite, isRef, globalRequiredLogin } = argConfig;
    const { scenarios, data, viewports } = getScenarios(args, testSuite, isRef, globalRequiredLogin);

    const config = {
      id: testSuite,
      viewports,
      onBeforeScript: getScriptPath('/onBefore.js', engine),
      onReadyScript: getScriptPath('/onReady.js', engine),
      scenarios,
      paths: {
        bitmaps_reference: '.backstop/' + testSuite + '/bitmaps_reference',
        bitmaps_test: '.backstop/' + testSuite + '/bitmaps_test',
        engine_scripts: `${getLibraryPath()}/.engine_scripts`,
        html_report: '.backstop/' + testSuite + '/html_report',
        ci_report: '.backstop/' + testSuite + '/ci_report',
      },
      report: [isRef ? 'CI' : 'browser'],
      engine,
      engineOptions: {
        args: [
          '--disable-infobars',
          '--disable-setuid-sandbox',
          '--ignore-certifcate-errors',
          '--ignore-certifcate-errors-spki-list',
          '--no-sandbox',
          '--window-position=0,0',
        ],
        browser: data?.browser ?? 'chromium',
        ignoreHTTPSErrors: data && typeof data?.ignoreSslErrors === 'boolean' ? data.ignoreSslErrors : true,
        headless: data?.debug ? undefined : 'new',
        storageState: data?.state && fs.existsSync(getStatePath(data.state)) ? getStatePath(data.state) : undefined,
      },
      asyncCaptureLimit: data?.asyncCaptureLimit ?? 5,
      asyncCompareLimit: data?.asyncCompareLimit ?? 50,
      debug: false,
      debugWindow: data?.debug,
    } as Config;

    return config;
  });
}
