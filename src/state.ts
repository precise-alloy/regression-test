import fs from 'fs';
import path from 'path';

export function getStatePath(stateName: string) {
  const stateFolder = path.join(process.cwd(), '.states');
  if (!fs.existsSync(stateFolder)) {
    fs.mkdirSync(stateFolder, { recursive: true });
  }

  return path.join(stateFolder, `${stateName}.json`);
}
