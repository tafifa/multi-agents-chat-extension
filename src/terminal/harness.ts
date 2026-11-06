import * as fs from 'fs';

export interface AgentHarness {
  id: string;
  name: string;
  command: string;
  args: string[];
  description: string;
  icon: string;
  isCustom?: boolean;
}

export const BUILTIN_HARNESSES: Record<string, AgentHarness> = {
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
  },
  hermes: {
    id: 'hermes',
    name: 'Hermes',
    command: 'hermes',
    args: [],
    description: 'Hermes AI Coding Agent',
    icon: '$(rocket)'
  },
  cline: {
    id: 'cline',
    name: 'Cline',
    command: 'cline',
    args: [],
    description: 'Cline CLI Coding Agent',
    icon: '$(robot)'
  }
};

export function getAllHarnesses(customAgents: AgentHarness[] = []): Record<string, AgentHarness> {
  const result: Record<string, AgentHarness> = { ...BUILTIN_HARNESSES };
  for (const agent of customAgents) {
    if (agent && agent.id) {
      result[agent.id] = {
        ...agent,
        args: agent.args || [],
        icon: agent.icon || '$(tools)',
        isCustom: true
      };
    }
  }
  return result;
}

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
