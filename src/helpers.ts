import fs from 'fs';
import YAML from 'js-yaml';
import { dirname } from 'path';
import slash from 'slash';
import { fileURLToPath } from 'url';

export const getStringArg = (key: string): string | undefined => {
  const index = process.argv.indexOf(key);
  return index >= 0 && index < process.argv.length - 1 && !process.argv[index + 1].startsWith('-') ? process.argv[index + 1] : undefined;
};

export const getFlagArg = (key: string): boolean => {
  return process.argv.indexOf(key) >= 0;
};

export const parseDataFromFile = (dataPath: string, type: 'yaml' | 'json' = 'yaml'): unknown | undefined => {
  if (!!dataPath && fs.existsSync(dataPath)) {
    let content = fs.readFileSync(dataPath, 'utf-8');
    if (type === 'json') {
      return JSON.parse(content);
    } else if (type === 'yaml') {
      return YAML.load(content);
    }
  }
};

export function getLibraryPath() {
  const fileName = fileURLToPath(import.meta.url);
  return slash(dirname(dirname(fileName)));
}
