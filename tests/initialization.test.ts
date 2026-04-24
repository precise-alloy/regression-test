import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeRegressifySettings, addAutoSuggestion } from '../src/initialization/auto-suggestion.ts';
import { createMarkdownFile } from '../src/initialization/create-markdown-file.ts';
import { REQUIRED_COMMON_FILES, initCommonFolder, initVisualTestsFolder } from '../src/initialization/generate-tests.ts';
import { getVersion } from '../src/initialization/get-version.ts';
import { getMigrationDestination, migrate } from '../src/initialization/migrate.ts';
import { createNodeVersionFiles } from '../src/initialization/node-version.ts';
import { mergeRecommendedExtensions, addExtensions } from '../src/initialization/recommended-extensions.ts';
import { mergeRegressifyPackageScripts, updatePackageJson } from '../src/initialization/update-package.ts';
import { createTempWorkspace, normalizeSlashes, useWorkspace, writeWorkspaceFile } from './test-utils.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('initialization helpers', () => {
  it('merges regressify VS Code settings idempotently while preserving unrelated schema entries', () => {
    const merged = mergeRegressifySettings({
      'json.schemas': [{ fileMatch: ['/*.tests.json'], url: './old.json' }],
      'yaml.schemas': {
        './common/test-schema.json': '/old',
        './another-schema.json': '/keep',
      },
      'files.exclude': {
        '.history': true,
      },
      'yaml.schemaStore.enable': true,
    });

    expect(merged['json.schemas']).toEqual([{ fileMatch: ['/*.tests.json'], url: './common/test-schema.json' }]);
    expect(merged['yaml.schemas']).toMatchObject({
      './another-schema.json': '/keep',
      './common/test-schema.json': '/*.tests.{yaml,yml}',
      './common/replacement-profiles-schema.json': '/_replacement-profiles.{yaml,yml}',
      './common/regressify-schema.json': '/regressify.{yaml,yml}',
    });
    expect(merged['files.exclude']).toMatchObject({
      '.history': true,
      'common/test-schema.json': true,
      'common/regressify-schema.json': true,
    });
    expect(merged['yaml.schemaStore.enable']).toBe(false);
  });

  it('writes the vscode settings and recommendations files when the workspace is empty', async () => {
    const workspace = createTempWorkspace();
    useWorkspace(workspace);

    await addAutoSuggestion();
    await addExtensions();

    const settings = JSON.parse(fs.readFileSync(path.join(workspace, '.vscode', 'settings.json'), 'utf-8'));
    const extensions = JSON.parse(fs.readFileSync(path.join(workspace, '.vscode', 'extensions.json'), 'utf-8'));

    expect(settings['yaml.schemas']['./common/regressify-schema.json']).toBe('/regressify.{yaml,yml}');
    expect(extensions.recommendations).toContain('tuyen.regressify');
    expect(new Set(extensions.recommendations).size).toBe(extensions.recommendations.length);
  });

  it('logs on invalid vscode json input for suggestion and recommendation patching', async () => {
    const workspace = createTempWorkspace({
      '.vscode/settings.json': '{bad json',
      '.vscode/extensions.json': '{bad json',
    });
    useWorkspace(workspace);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await addAutoSuggestion();
    await addExtensions();

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('merges package scripts and writes package.json updates without removing unrelated scripts', async () => {
    const workspace = createTempWorkspace({
      'package.json': JSON.stringify({ scripts: { build: 'tsc', lint: 'eslint .' } }, null, 2),
    });
    useWorkspace(workspace);

    expect(mergeRegressifyPackageScripts({ scripts: { build: 'tsc' } })).toMatchObject({
      scripts: {
        build: 'tsc',
        ref: 'regressify ref',
        approve: 'regressify approve',
        test: 'regressify test',
      },
    });

    await updatePackageJson();

    const pkg = JSON.parse(fs.readFileSync(path.join(workspace, 'package.json'), 'utf-8'));
    expect(pkg.scripts).toMatchObject({
      build: 'tsc',
      lint: 'eslint .',
      ref: 'regressify ref',
      approve: 'regressify approve',
      test: 'regressify test',
    });
  });

  it('logs and returns early when package.json is missing for updatePackageJson', async () => {
    const workspace = createTempWorkspace();
    useWorkspace(workspace);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await updatePackageJson();

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('creates node version files once and does not overwrite existing ones', async () => {
    const workspace = createTempWorkspace();
    useWorkspace(workspace);

    await createNodeVersionFiles();
    expect(fs.readFileSync(path.join(workspace, '.nvmrc'), 'utf-8')).toBe('v22');
    expect(fs.readFileSync(path.join(workspace, '.node-version'), 'utf-8')).toBe('v22');

    fs.writeFileSync(path.join(workspace, '.nvmrc'), 'custom');
    await createNodeVersionFiles();
    expect(fs.readFileSync(path.join(workspace, '.nvmrc'), 'utf-8')).toBe('custom');
  });

  it('logs when markdown or node version file creation throws', async () => {
    const workspace = createTempWorkspace();
    useWorkspace(workspace);
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('boom');
    });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await createMarkdownFile();
    await createNodeVersionFiles();

    expect(consoleSpy).toHaveBeenCalled();
    writeSpy.mockRestore();
  });

  it('creates the README template only when one does not already exist', async () => {
    const workspace = createTempWorkspace();
    useWorkspace(workspace);

    await createMarkdownFile();
    expect(fs.readFileSync(path.join(workspace, 'README.md'), 'utf-8')).toContain('Precise Alloy - Regression Test');

    fs.writeFileSync(path.join(workspace, 'README.md'), 'existing');
    await createMarkdownFile();
    expect(fs.readFileSync(path.join(workspace, 'README.md'), 'utf-8')).toBe('existing');
  });

  it('reports the package version from the library package.json', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    getVersion();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/^\d+\.\d+\.\d+/));
  });

  it('logs when getVersion cannot find package.json', () => {
    const existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation((target) => {
      if (String(target).endsWith('/package.json') || String(target).endsWith('\\package.json')) {
        return false;
      }

      return true;
    });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    getVersion();

    expect(consoleSpy).toHaveBeenCalled();
    existsSpy.mockRestore();
  });

  it('routes migrated files to common or visual_tests and removes legacy folders', async () => {
    const workspace = createTempWorkspace({
      'data/_cookies.yaml': 'cookies',
      'data/alloy.tests.yaml': 'suite',
    });
    writeWorkspaceFile(workspace, '.engine_scripts/old.js', 'old');
    useWorkspace(workspace);

    expect(normalizeSlashes(getMigrationDestination('_cookies.yaml', '/common', '/visual_tests'))).toBe('/common/_cookies.yaml');
    expect(normalizeSlashes(getMigrationDestination('suite.yaml', '/common', '/visual_tests'))).toBe('/visual_tests/suite.yaml');

    await migrate();

    expect(fs.readFileSync(path.join(workspace, 'common', '_cookies.yaml'), 'utf-8')).toBe('cookies');
    expect(fs.readFileSync(path.join(workspace, 'visual_tests', 'alloy.tests.yaml'), 'utf-8')).toBe('suite');
    expect(fs.existsSync(path.join(workspace, 'data'))).toBe(false);
    expect(fs.existsSync(path.join(workspace, '.engine_scripts'))).toBe(false);
  });

  it('copies the common and visual_tests templates, including required schema files', async () => {
    const workspace = createTempWorkspace();
    useWorkspace(workspace);

    await initCommonFolder();
    await initVisualTestsFolder();

    for (const file of REQUIRED_COMMON_FILES) {
      expect(fs.existsSync(path.join(workspace, 'common', file))).toBe(true);
    }
    expect(fs.existsSync(path.join(workspace, 'visual_tests', 'alloy.tests.yaml'))).toBe(true);
  });

  it('logs when common or visual_tests folders already exist', async () => {
    const workspace = createTempWorkspace({
      'common/test-schema.json': '{}',
      'visual_tests/alloy.tests.yaml': 'scenarios: []\n',
    });
    useWorkspace(workspace);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await initCommonFolder();
    await initVisualTestsFolder();

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('merges recommended extensions without duplicating entries', () => {
    const merged = mergeRecommendedExtensions({ recommendations: ['redhat.vscode-yaml', 'custom.extension'] });

    expect(merged.recommendations).toContain('custom.extension');
    expect(merged.recommendations?.filter((item) => item === 'redhat.vscode-yaml')).toHaveLength(1);
  });
});

describe('initRegressify orchestration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('calls the setup steps in the documented order', async () => {
    const callOrder: string[] = [];

    vi.doMock('../src/initialization/auto-suggestion.js', () => ({ addAutoSuggestion: () => callOrder.push('auto-suggestion') }));
    vi.doMock('../src/initialization/create-markdown-file.js', () => ({ createMarkdownFile: () => callOrder.push('create-markdown-file') }));
    vi.doMock('../src/initialization/generate-tests.js', () => ({
      initCommonFolder: async () => callOrder.push('init-common-folder'),
      initVisualTestsFolder: async () => callOrder.push('init-visual-tests-folder'),
    }));
    vi.doMock('../src/initialization/migrate.js', () => ({ migrate: () => callOrder.push('migrate') }));
    vi.doMock('../src/initialization/node-version.js', () => ({ createNodeVersionFiles: async () => callOrder.push('node-version') }));
    vi.doMock('../src/initialization/recommended-extensions.js', () => ({ addExtensions: () => callOrder.push('recommended-extensions') }));
    vi.doMock('../src/initialization/update-package.js', () => ({ updatePackageJson: async () => callOrder.push('update-package') }));

    const { initRegressify } = await import('../src/initialization/init.ts');
    await initRegressify();

    expect(callOrder).toEqual([
      'init-common-folder',
      'init-visual-tests-folder',
      'node-version',
      'update-package',
      'auto-suggestion',
      'recommended-extensions',
      'migrate',
      'create-markdown-file',
    ]);
  });
});