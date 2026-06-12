import fs from 'fs';
import { Config, Scenario, ViewportNext } from 'backstopjs';
import { createScenario } from './scenarios.js';
import path from 'path';
import { getFlagArg, getStringArg, parseDataFromFile, getLibraryPath } from './helpers.js';
import { TestSuiteModel, ScenarioModel, PersistAction, WorkspaceConfig, BasicAuthModel } from './types.js';
import chalk from 'chalk';
import { exit } from 'process';
import YAML from 'js-yaml';
import { getTestUrl } from './replacements.js';
import { getStatePath } from './state.js';
import { globSync } from 'glob';

export type ArgConfig = {
  testSuite: string;
  isRef: boolean;
  globalRequiredLogin: boolean;
};

export const DEFAULT_VIEWPORTS_PATH = 'common/_viewports.yaml';
export const DEFAULT_SCENARIO_DELAY = 1000;
export const DEFAULT_MISMATCH_THRESHOLD = 0.1;
export const DEFAULT_POST_INTERACTION_WAIT = 1;
export const DEFAULT_ASYNC_CAPTURE_LIMIT = 5;
export const DEFAULT_ASYNC_COMPARE_LIMIT = 50;

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

const libraryPath = getLibraryPath();
const engine: 'puppeteer' | 'playwright' = 'playwright';

export function getRequiredTestSuiteArg(args: string[]): string {
  const testSuite = getStringArg(args, '--test-suite');

  if (!testSuite) {
    throw new ConfigValidationError('Argument `--test-suite` must be set.');
  }

  return testSuite;
}

export function getArgConfigs(args: string[]): ArgConfig[] {
  const testSuite = getRequiredTestSuiteArg(args);
  const isRef = getFlagArg(args, '--ref');
  const globalRequiredLogin = getFlagArg(args, '--requiredLogin');
  if (globalRequiredLogin) {
    console.log('force run all scenarios in login mode');
  }

  const visualTestsDir = path.join(process.cwd(), 'visual_tests');
  console.log('Looking for test suites in: ', visualTestsDir, ' with pattern: ', testSuite + '.tests.{yaml,yml,json}');

  return globSync(testSuite + '.tests.{yaml,yml,json}', { cwd: visualTestsDir })
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

export function getScriptPath(scriptPath: string, engine: 'puppeteer' | 'playwright') {
  return path.join(libraryPath, '.engine_scripts', (engine == 'puppeteer' ? 'puppet' : 'playwright') + scriptPath);
}

/**
 * Load workspace-level defaults from `regressify.yaml` (or `.yml`)
 * at the workspace root. The file is optional; when absent an empty
 * object is returned so the cascade always falls back cleanly.
 */
export function getWorkspaceConfig(): WorkspaceConfig {
  const extensions = ['yaml', 'yml'];

  for (const ext of extensions) {
    const wsPath = path.join(process.cwd(), `regressify.${ext}`);
    if (fs.existsSync(wsPath)) {
      console.log('Workspace config: ', wsPath);
      const content = fs.readFileSync(wsPath, 'utf-8');
      return (YAML.load(content) as WorkspaceConfig) ?? {};
    }
  }

  return {};
}

export function getData(testSuite: string): TestSuiteModel | undefined {
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
      const testSuite = extensions[i].parse(content) as TestSuiteModel;

      return testSuite;
    }
  }

  throw `Data file not found for test suite: ${testSuite}`;
}

function getScenarioIdentifier(model: ScenarioModel, fallback: string): string {
  return model.id ?? model.label ?? model.url ?? fallback;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveStrictBoolean(...values: Array<boolean | undefined>): boolean | undefined {
  return values.find((value) => typeof value === 'boolean');
}

/**
 * Expand `${VAR}` and `$VAR` references in a string using `env`.
 * Unset variables expand to an empty string. Strings without any
 * reference are returned unchanged. A bare `$VAR` is only treated as a
 * reference when the `$` starts the string or follows a non-word
 * character, so literals such as `pa$ssword` are preserved.
 */
export function expandEnvReferences(value: string, env: NodeJS.ProcessEnv = process.env): string {
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, braced, bare, offset: number, source: string) => {
    if (braced !== undefined) {
      return env[braced] ?? '';
    }

    // A bare `$VAR` is only a reference when the `$` starts the string or
    // follows a non-word character, so literals such as `pa$ssword` are
    // preserved. The check runs against the original string in a single
    // pass so a `$VAR` immediately following a `${VAR}` still expands.
    if (offset > 0 && /[A-Za-z0-9_]/.test(source[offset - 1])) {
      return match;
    }

    return env[bare] ?? '';
  });
}

export function normalizeHttpOrigin(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined;
    }

    return url.origin;
  } catch {
    return undefined;
  }
}

/**
 * Resolve `basicAuth` across scenario -> suite -> workspace and expand
 * any environment-variable references in the credentials. Returns
 * `undefined` when no level sets it, when the protected origin is invalid,
 * or when either resolved credential is empty (e.g. a referenced env var is
 * missing) so credentials are never applied ambiguously.
 */
export function resolveBasicAuth(
  scenario?: BasicAuthModel,
  suite?: BasicAuthModel,
  workspace?: BasicAuthModel,
  env: NodeJS.ProcessEnv = process.env
): BasicAuthModel | undefined {
  const resolved = scenario ?? suite ?? workspace;
  if (!resolved) {
    return undefined;
  }

  const originValue = expandEnvReferences(resolved.origin ?? '', env);
  const origin = normalizeHttpOrigin(originValue);
  const username = expandEnvReferences(resolved.username ?? '', env);
  const password = expandEnvReferences(resolved.password ?? '', env);

  if (!origin || !username || !password) {
    console.warn(chalk.yellow('basicAuth is set but origin, username, or password resolved to an invalid/empty value; skipping Basic auth credentials.'));
    return undefined;
  }

  return { origin, username, password };
}

export function expandScenarios(model: ScenarioModel, scenarios: ScenarioModel[], level: number, trail?: string[]) {
  const currentIdentifier = getScenarioIdentifier(model, `<anonymous:${level}>`);
  const currentTrail = trail ?? [currentIdentifier];

  if (level >= 100) {
    throw new ConfigValidationError(`Scenario dependency depth exceeded 100: ${currentTrail.join(' -> ')}`);
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
    const normalizedNeed = normalizeName(n);
    if (currentTrail.map(normalizeName).includes(normalizedNeed)) {
      throw new ConfigValidationError(`Circular scenario dependency detected: ${[...currentTrail, n].join(' -> ')}`);
    }

    const targetScenarios = scenarios.filter((s) => !!s.id && normalizeName(s.id) == normalizedNeed);
    if (targetScenarios.length !== 1) {
      throw new ConfigValidationError(`The test suite must contain exactly one scenario with id: ${n}`);
    }

    var targetScenario = targetScenarios[0];
    expandScenarios(targetScenario, scenarios, level + 1, [...currentTrail, getScenarioIdentifier(targetScenario, n)]);
    if (!!targetScenario.actions) {
      if (!model.actions) {
        model.actions = [];
      }
      model.actions = [...targetScenario.actions, ...model.actions];
    }
  });

  model.needs = undefined;
}

/**
 * Resolve `viewportNames` across scenario → suite → workspace, then
 * filter the loaded viewport definitions accordingly.
 */
export function resolveViewports(
  s: ScenarioModel,
  data: TestSuiteModel,
  ws: WorkspaceConfig,
  viewports?: ViewportNext[]
): ViewportNext[] | undefined {
  const names = s.viewportNames ?? data.viewportNames ?? ws.viewportNames;

  if (!names || !viewports?.length) {
    return undefined;
  }

  const targets = (typeof names === 'string' ? [names] : names).map((name) => normalizeName(name));

  return viewports.filter((v) => targets.includes(normalizeName(v.label)));
}

type ResolveScenarioOptionsInput = {
  args: string[];
  scenario: ScenarioModel;
  suite: TestSuiteModel;
  workspace: WorkspaceConfig;
  testSuite: string;
  isRef: boolean;
  globalRequiredLogin: boolean;
  index: number;
  total: number;
  viewports?: ViewportNext[];
};

export function resolveScenarioOptions({
  args,
  scenario,
  suite,
  workspace,
  testSuite,
  isRef,
  globalRequiredLogin,
  index,
  total,
  viewports,
}: ResolveScenarioOptionsInput): ScenarioModel {
  const requiredLogin = globalRequiredLogin ? true : (resolveStrictBoolean(scenario.requiredLogin, workspace.requiredLogin) ?? false);

  return {
    ...scenario,
    testSuite,
    requiredLogin,
    getTestUrl: (url: string) => getTestUrl(args, url, isRef),
    url: isRef ? scenario.url : getTestUrl(args, scenario.url, isRef),
    index: String(index + 1).padStart(String(total).length, ' '),
    total,
    delay: scenario.delay ?? workspace.delay ?? DEFAULT_SCENARIO_DELAY,
    state: suite.state ?? workspace.state,
    hideSelectors: scenario.hideSelectors ?? suite.hideSelectors ?? workspace.hideSelectors,
    removeSelectors: scenario.removeSelectors ?? suite.removeSelectors ?? workspace.removeSelectors,
    useCssOverride: resolveStrictBoolean(scenario.useCssOverride, suite.useCssOverride, workspace.useCssOverride) ?? true,
    cssOverridePath: scenario.cssOverridePath ?? suite.cssOverridePath ?? workspace.cssOverridePath,
    bypassCsp: resolveStrictBoolean(scenario.bypassCsp, suite.bypassCsp, workspace.bypassCsp),
    basicAuth: resolveBasicAuth(scenario.basicAuth, suite.basicAuth, workspace.basicAuth),
    jsOnReadyPath: scenario.jsOnReadyPath ?? workspace.jsOnReadyPath,
    cookiePath: scenario.cookiePath ?? workspace.cookiePath,
    noScrollTop: scenario.noScrollTop ?? workspace.noScrollTop,
    viewports: resolveViewports(scenario, suite, workspace, viewports),
    referenceUrl: !isRef ? scenario.url : undefined,
    misMatchThreshold: scenario.misMatchThreshold ?? suite.misMatchThreshold ?? workspace.misMatchThreshold ?? DEFAULT_MISMATCH_THRESHOLD,
    postInteractionWait: scenario.postInteractionWait ?? suite.postInteractionWait ?? workspace.postInteractionWait ?? DEFAULT_POST_INTERACTION_WAIT,
  };
}

export function getScenarios(args: string[], testSuite: string, isRef: boolean, globalRequiredLogin: boolean, ws: WorkspaceConfig) {
  const scenarios: Scenario[] = [];

  const data = getData(testSuite);

  const viewportsPath = data?.viewportsPath ?? ws.viewportsPath ?? DEFAULT_VIEWPORTS_PATH;
  const viewports = parseDataFromFile(viewportsPath) as ViewportNext[];
  if (data) {
    [].forEach.call(data.scenarios, (s: ScenarioModel) => {
      expandScenarios(s, data.scenarios, 0);
    });

    data.scenarios.forEach((s, index) => {
      const opts = resolveScenarioOptions({
        args,
        scenario: s,
        suite: data,
        workspace: ws,
        testSuite,
        isRef,
        globalRequiredLogin,
        index,
        total: data.scenarios.length,
        viewports,
      });

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

export function isCIEnvironment(env = process.env): boolean {
  const isAzurePipelines =
    env.TF_BUILD === 'True' &&
    !!env.SYSTEM_TEAMFOUNDATIONSERVERURI &&
    !!env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI &&
    !!env.SYSTEM_TEAMPROJECT &&
    !!env.SYSTEM_COLLECTIONURI;

  const isGitHubActions = env.GITHUB_ACTIONS === 'true';

  return env.CI === 'true' || isAzurePipelines || isGitHubActions;
}

function logConfigValidationAndExit(error: ConfigValidationError): never {
  console.log(chalk.red(error.message));
  console.log(chalk.red('Sample command: regressify <command> --test-suite <test-suite>'));
  console.log(chalk.red('Command is either `ref`, `approve` or `test`.'));
  exit(1);
}

export function getConfigs(args: string[], backstopDirName: string): Config[] {
  const isCI = isCIEnvironment();

  const ws = getWorkspaceConfig();
  let argConfigs: ArgConfig[];

  try {
    argConfigs = getArgConfigs(args);
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      return logConfigValidationAndExit(error);
    }

    throw error;
  }

  return argConfigs.map((argConfig) => {
    const { testSuite, isRef, globalRequiredLogin } = argConfig;
    const { scenarios, data, viewports } = getScenarios(args, testSuite, isRef, globalRequiredLogin, ws);

    const backStopTestSuiteFolder = backstopDirName + '/' + testSuite;

    const debug = data?.debug ?? ws.debug;
    const state = data?.state ?? ws.state;
    const ignoreSslErrors =
      typeof data?.ignoreSslErrors === 'boolean' ? data.ignoreSslErrors : typeof ws.ignoreSslErrors === 'boolean' ? ws.ignoreSslErrors : true;

    const config = {
      id: testSuite,
      backstopDirName,
      viewports,
      onBeforeScript: getScriptPath('/onBefore.js', engine),
      onReadyScript: getScriptPath('/onReady.js', engine),
      scenarios,
      paths: {
        bitmaps_reference: backStopTestSuiteFolder + '/bitmaps_reference',
        bitmaps_test: backStopTestSuiteFolder + '/bitmaps_test',
        html_report: backStopTestSuiteFolder + '/html_report',
        ci_report: backStopTestSuiteFolder + '/ci_report',
        engine_scripts: `${getLibraryPath()}/.engine_scripts`,
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
        browser: data?.browser ?? ws.browser ?? 'chromium',
        ignoreHTTPSErrors: ignoreSslErrors,
        headless: debug && !isCI ? undefined : 'new',
        storageState: state && fs.existsSync(getStatePath(state)) ? getStatePath(state) : undefined,
      },
      asyncCaptureLimit: data?.asyncCaptureLimit ?? ws.asyncCaptureLimit ?? DEFAULT_ASYNC_CAPTURE_LIMIT,
      asyncCompareLimit: data?.asyncCompareLimit ?? ws.asyncCompareLimit ?? DEFAULT_ASYNC_COMPARE_LIMIT,
      debug: false,
      debugWindow: debug && !isCI,
    } as Config;

    return config;
  });
}
