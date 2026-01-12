import os from 'node:os';
import path from 'node:path';

export function getActionPackerHome(): string {
  return process.env.ACTION_PACKER_HOME || path.join(os.homedir(), '.action-packer');
}

export function getDefaultDataDir(actionPackerHome: string = getActionPackerHome()): string {
  return path.join(actionPackerHome, 'data');
}

export function getDefaultRunnersDir(actionPackerHome: string = getActionPackerHome()): string {
  return path.join(actionPackerHome, 'runners');
}
