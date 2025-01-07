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
};

export async function addAutoSuggestion() {
  patchVsCodeSettings();
}

function patchVsCodeSettings() {
  try {
    const settingsJsonPath = path.join(process.cwd(), '.vscode', 'settings.json');
    const json = fs.existsSync(settingsJsonPath) ? fs.readFileSync(settingsJsonPath, 'utf8') : '{}';
    const settings = JSON.parse(json) as Settings;

    const jsonSchemas = settings['json.schemas'] || [];
    if (!jsonSchemas.some((js) => js.url === './common/test-schema.json')) {
      jsonSchemas.push({
        fileMatch: ['/*.tests.json'],
        url: './common/test-schema.json',
      });
    }

    settings['json.schemas'] = jsonSchemas;

    settings['yaml.schemas'] = settings['yaml.schemas'] || {};
    settings['yaml.schemas'] = {
      ...settings['yaml.schemas'],
      './.engine_scripts/test-schema.json': '/*.tests.{yaml,yml}',
      './.engine_scripts/replacement-profiles-schema.json': '/_replacement-profiles.{yaml,yml}',
    };

    settings['files.exclude'] = settings['files.exclude'] || {};
    settings['files.exclude']['common/test-schema.json'] = true;
    settings['files.exclude']['replacement-profiles-schema.json'] = true;

    fs.mkdirSync(path.join(process.cwd(), '.vscode'), { recursive: true });
    fs.writeFileSync(settingsJsonPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.log(chalk.red(error));
  }
}
