import fs from 'fs';
import path from 'path';
import { ReplacementModel, ReplacementsModel } from './types';
import YAML from 'js-yaml';
import { getStringArg } from './helpers.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getReplacementProfile = (): ReplacementModel[] | undefined => {
  const replacementProfileName = getStringArg('replacement-profile') ?? process.env.REPLACEMENT_PROFILE;
  if (!!replacementProfileName) {
    const replacementProfilePath = path.resolve(__dirname, '../visual_tests/_replacement-profiles.yaml');
    if (!fs.existsSync(replacementProfilePath)) {
      throw "Replacement profile doesn't exist: " + replacementProfilePath;
    }

    const profiles = YAML.load(fs.readFileSync(replacementProfilePath, 'utf-8')) as ReplacementsModel;
    return profiles.profiles[replacementProfileName];
  }
};

const replacementProfile = getReplacementProfile();

export const getTestUrl = (url: string, isRef: boolean) => {
  if (isRef || !replacementProfile) {
    return url;
  }

  let testUrl = url;
  replacementProfile.forEach((e) => (testUrl = testUrl.replace(e.ref, e.test)));

  return testUrl;
};
