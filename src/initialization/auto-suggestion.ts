import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

type JsonSchema = {
  fileMatch: string[];
  url: string;
};

type YamlSchema = Record<string, string>;

type Settings = {
  'json.schemas'?: JsonSchema[];
  'yaml.schemas'?: YamlSchema;
  'files.exclude'?: Record<string, boolean>;
  'yaml.schemaStore.enable'?: boolean;
};

export type { Settings };

export async function addAutoSuggestion() {
  patchVsCodeSettings();
}

export function mergeRegressifySettings(settings: Settings): Settings {
  const nextSettings = JSON.parse(JSON.stringify(settings || {})) as Settings;
  const jsonSchemas = nextSettings['json.schemas'] || [];
  let existingJsonSchema: JsonSchema | undefined;

  do {
    existingJsonSchema = jsonSchemas.find((js) => js.fileMatch && js.fileMatch.includes('/*.tests.json'));
    if (existingJsonSchema) {
      jsonSchemas.splice(jsonSchemas.indexOf(existingJsonSchema), 1);
    }
  } while (existingJsonSchema);

  jsonSchemas.push({
    fileMatch: ['/*.tests.json'],
    url: './common/test-schema.json',
  });

  nextSettings['json.schemas'] = jsonSchemas;

  const yamlSchema = nextSettings['yaml.schemas'] || {};
  Object.keys(yamlSchema).forEach((key) => {
    if (
      key.includes('test-schema.json') ||
      key.includes('replacement-profiles-schema.json') ||
      key.includes('regressify-schema.json')
    ) {
      delete yamlSchema[key];
    }
  });

  nextSettings['yaml.schemas'] = {
    ...yamlSchema,
    './common/test-schema.json': '/*.tests.{yaml,yml}',
    './common/replacement-profiles-schema.json': '/_replacement-profiles.{yaml,yml}',
    './common/regressify-schema.json': '/regressify.{yaml,yml}',
  };

  const filesExclude = nextSettings['files.exclude'] || {};
  filesExclude['common/test-schema.json'] = true;
  filesExclude['common/replacement-profiles-schema.json'] = true;
  filesExclude['common/regressify-schema.json'] = true;
  filesExclude['.vscode'] = true;
  filesExclude['**/node_modules'] = true;
  filesExclude['.idea'] = true;

  nextSettings['files.exclude'] = filesExclude;
  nextSettings['yaml.schemaStore.enable'] = false;

  return nextSettings;
}

function patchVsCodeSettings() {
  try {
    const vsCodeFolder = path.join(process.cwd(), '.vscode');
    const settingsJsonPath = path.join(vsCodeFolder, 'settings.json');
    const json = fs.existsSync(settingsJsonPath) ? fs.readFileSync(settingsJsonPath, 'utf8') : '{}';
    const settings = mergeRegressifySettings(JSON.parse(json) as Settings);

    if (!fs.existsSync(vsCodeFolder)) {
      fs.mkdirSync(vsCodeFolder, { recursive: true });
    }
    fs.writeFileSync(settingsJsonPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.log(chalk.red(error));
  }
}
