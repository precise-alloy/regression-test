import fs from 'fs';
import path from 'path';
import { ReplacementModel, ReplacementsModel } from './types';
import YAML from 'js-yaml';
import { getLibraryPath, getStringArg } from './helpers.js';
import slash from 'slash';

const libraryPath = getLibraryPath();

const getReplacementProfile = (): ReplacementModel[] | undefined => {
  const replacementProfileName = getStringArg('replacement-profile') ?? process.env.REPLACEMENT_PROFILE;
  if (!!replacementProfileName) {
    const replacementProfilePath = slash(path.join(libraryPath, 'visual_tests', '_replacement-profiles.yaml'));
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
