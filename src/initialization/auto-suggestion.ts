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

export async function addAutoSuggestion() {
  patchVsCodeSettings();
}

function patchVsCodeSettings() {
  try {
    const vsCodeFolder = path.join(process.cwd(), '.vscode');
    const settingsJsonPath = path.join(vsCodeFolder, 'settings.json');
    const json = fs.existsSync(settingsJsonPath) ? fs.readFileSync(settingsJsonPath, 'utf8') : '{}';
    const settings = JSON.parse(json) as Settings;

    const jsonSchemas = settings['json.schemas'] || [];
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

    settings['json.schemas'] = jsonSchemas;

    const yamlSchema = settings['yaml.schemas'] || {};

    // Check for each of `settings['yaml.schemas']`,
    // if the key contains `test-schema.json` or `replacement-profiles-schema.json`,
    // then remove it.
    Object.keys(yamlSchema).forEach((key) => {
      if (key.includes('test-schema.json') || key.includes('replacement-profiles-schema.json')) {
        delete yamlSchema[key];
      }
    });

    settings['yaml.schemas'] = {
      ...yamlSchema,
      './common/test-schema.json': '/*.tests.{yaml,yml}',
      './common/replacement-profiles-schema.json': '/_replacement-profiles.{yaml,yml}',
    };

    const filesExclude = settings['files.exclude'] || {};
    filesExclude['common/test-schema.json'] = true;
    filesExclude['common/replacement-profiles-schema.json'] = true;
    filesExclude['.vscode'] = true;
    filesExclude['**/node_modules'] = true;
    filesExclude['.idea'] = true;

    settings['files.exclude'] = filesExclude;

    settings['yaml.schemaStore.enable'] = false;

    if (!fs.existsSync(vsCodeFolder)) {
      fs.mkdirSync(vsCodeFolder, { recursive: true });
    }
    fs.writeFileSync(settingsJsonPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.log(chalk.red(error));
  }
}
