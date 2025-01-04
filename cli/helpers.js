import { dirname } from 'path';
import slash from 'slash';
import { fileURLToPath } from 'url';

export function getLibraryPath() {
  const fileName = fileURLToPath(import.meta.url);
  return slash(dirname(dirname(fileName)));
}
