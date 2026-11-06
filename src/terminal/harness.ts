import * as fs from 'fs';

export type HarnessId = 'omp' | 'opencode';

export interface AgentHarness {
  id: HarnessId;
  name: string;
  command: string;
  args: string[];
  description: string;
  icon: string;
}

export const HARNESS_DEFINITIONS: Record<HarnessId, AgentHarness> = {
  omp: {
    id: 'omp',
    name: 'OMP Code',
    command: 'omp',
    args: [],
    description: 'OhMyPi Agent CLI (Default)',
    icon: '$(sparkle)'
  },
  opencode: {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    args: [],
    description: 'OpenCode AI Terminal Agent',
    icon: '$(terminal)'
  }
};

export function resolveExecutableForHarness(
  harness: AgentHarness,
  customPath?: string
): { shell: string; args: string[] } {
  const isWindows = process.platform === 'win32';

  if (customPath && customPath.trim() !== '' && fs.existsSync(customPath.trim())) {
    const trimmed = customPath.trim();
    if (isWindows && (trimmed.endsWith('.cmd') || trimmed.endsWith('.bat'))) {
      return {
        shell: 'cmd.exe',
        args: ['/c', trimmed, ...harness.args]
      };
    }
    return { shell: trimmed, args: harness.args };
  }

  const baseCommand = harness.command;

  if (isWindows) {
    return {
      shell: 'cmd.exe',
      args: ['/c', baseCommand, ...harness.args]
    };
  } else {
    return {
      shell: baseCommand,
      args: harness.args
    };
  }
}
