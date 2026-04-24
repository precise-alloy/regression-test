import fs from 'fs';
import path from 'path';
import { ReplacementModel, ReplacementsModel } from './types.js';
import YAML from 'js-yaml';
import { getStringArg } from './helpers.js';
import slash from 'slash';

export function getReplacementProfileName(args: string[]): string {
  const profileArg = getStringArg(args, '--replacement-profile') ?? getStringArg(args, 'replacement-profile');
  if (profileArg) {
    return profileArg;
  }

  const profileEnv = process.env.REPLACEMENT_PROFILE;
  if (profileEnv) {
    return profileEnv;
  }

  return 'default';
}

export function getReplacementProfile(args: string[]): ReplacementModel[] | undefined {
  const replacementProfileName = getReplacementProfileName(args);

  const replacementProfilePath = slash(path.join(process.cwd(), 'common', '_replacement-profiles.yaml'));
  if (!fs.existsSync(replacementProfilePath)) {
    throw "Replacement profile doesn't exist: " + replacementProfilePath;
  }

  const profiles = YAML.load(fs.readFileSync(replacementProfilePath, 'utf-8')) as ReplacementsModel;
  return profiles.profiles[replacementProfileName];
}

export function applyReplacements(url: string, replacements?: ReplacementModel[]): string {
  if (!replacements?.length) {
    return url;
  }

  let testUrl = url;
  for (const replacement of replacements) {
    testUrl = replacement.regex
      ? testUrl.replace(new RegExp(replacement.ref, replacement.flags), replacement.test)
      : testUrl.replace(replacement.ref, replacement.test);
  }

  return testUrl;
}

export const getTestUrl = (args: string[], url: string, isRef: boolean) => {
  if (isRef) {
    return url;
  }

  return applyReplacements(url, getReplacementProfile(args));
};
