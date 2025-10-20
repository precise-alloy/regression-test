import fs from 'fs';
import YAML from 'js-yaml';
import { dirname } from 'path';
import slash from 'slash';
import { fileURLToPath } from 'url';

export const getStringArg = (args: string[], key: string): string | undefined => {
  const index = args.indexOf(key);
  return index >= 0 && index < args.length - 1 && !args[index + 1].startsWith('-') ? args[index + 1] : undefined;
};

export const getBackstopDirName = (args: string[]): string => {
  const siteEnv = getStringArg(args, '--site-env');

  return siteEnv ? `.backstop__${siteEnv}` : '.backstop';
};

export const getFlagArg = (args: string[], key: string): boolean => {
  return args.indexOf(key) >= 0;
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
