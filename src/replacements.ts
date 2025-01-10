import fs from 'fs';
import path from 'path';
import { ReplacementModel, ReplacementsModel } from './types.js';
import YAML from 'js-yaml';
import { getStringArg } from './helpers.js';
import slash from 'slash';

function getReplacementProfile(args: string[]): ReplacementModel[] | undefined {
  const replacementProfileName = getStringArg(args, 'replacement-profile') ?? process.env.REPLACEMENT_PROFILE;
  if (!!replacementProfileName) {
    const replacementProfilePath = slash(path.join(process.cwd(), 'common', '_replacement-profiles.yaml'));
    if (!fs.existsSync(replacementProfilePath)) {
      throw "Replacement profile doesn't exist: " + replacementProfilePath;
    }

    const profiles = YAML.load(fs.readFileSync(replacementProfilePath, 'utf-8')) as ReplacementsModel;
    return profiles.profiles[replacementProfileName];
  }
}

export const getTestUrl = (args: string[], url: string, isRef: boolean) => {
  const replacementProfile = getReplacementProfile(args);

  if (isRef || !replacementProfile) {
    return url;
  }

  let testUrl = url;
  replacementProfile.forEach((e) => (testUrl = testUrl.replace(e.ref, e.test)));

  return testUrl;
};
