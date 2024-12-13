import fs from 'fs';
import YAML from 'js-yaml';
import path, { dirname } from 'path';
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
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  let currentDir = __dirname;
  while (!fs.existsSync(path.join(currentDir, 'package.json'))) {
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
  const packageJsonPath = path.join(currentDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return `node_modules/${packageJson.name}`;
}
