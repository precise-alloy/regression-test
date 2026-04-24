import fs from 'fs';
import os from 'os';
import path from 'path';
import { vi } from 'vitest';

export function createTempWorkspace(files: Record<string, string | Uint8Array> = {}) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'regressify-test-'));

  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(workspace, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  return workspace;
}

export function cleanupTempWorkspace(workspace: string) {
  fs.rmSync(workspace, { recursive: true, force: true });
}

export function writeWorkspaceFile(workspace: string, relativePath: string, content: string | Uint8Array) {
  const fullPath = path.join(workspace, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  return fullPath;
}

export function useWorkspace(workspace: string) {
  return vi.spyOn(process, 'cwd').mockReturnValue(workspace);
}

export function normalizeSlashes(value: string) {
  return value.replaceAll('\\', '/');
}
