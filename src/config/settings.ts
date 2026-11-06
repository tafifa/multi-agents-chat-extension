import * as vscode from 'vscode';
import { AgentHarness, getAllHarnesses } from '../terminal/harness';

export interface MultiAgentChatSettings {
  harness: string;
  fontSize: number;
  fontFamily: string;
  harnessPaths: Record<string, string>;
  customAgents: AgentHarness[];
}

export function getOmpSettings(): MultiAgentChatSettings {
  const config = vscode.workspace.getConfiguration('multiAgentChat');
  const customAgents = config.get<AgentHarness[]>('customAgents', []);
  const allHarnesses = getAllHarnesses(customAgents);

  const configuredHarness = config.get<string>('harness', 'omp');
  const validHarness = allHarnesses[configuredHarness] ? configuredHarness : 'omp';

  // Fallback to legacy omp or cliAgents config if available
  const legacyOmpConfig = vscode.workspace.getConfiguration('omp');
  const legacyCliConfig = vscode.workspace.getConfiguration('cliAgents');
  const legacyPath = (
    legacyOmpConfig?.get<string>('executablePath', '') ||
    legacyCliConfig?.get<string>('executablePath', '') ||
    ''
  ).trim();

  const harnessesConfig = config.get<Record<string, { path?: string }>>('harnesses', {});
  const harnessPaths: Record<string, string> = {};

  // Map known paths
  for (const id of Object.keys(allHarnesses)) {
    harnessPaths[id] = harnessesConfig[id]?.path?.trim() || '';
  }
  if (!harnessPaths['omp'] && legacyPath) {
    harnessPaths['omp'] = legacyPath;
  }

  return {
    harness: validHarness,
    fontSize: config.get<number>('fontSize', 13),
    fontFamily: config.get<string>('fontFamily', "Consolas, 'Courier New', monospace"),
    harnessPaths,
    customAgents
  };
}

export async function setConfiguredHarness(harnessId: string): Promise<void> {
  const config = vscode.workspace.getConfiguration('multiAgentChat');
  await config.update('harness', harnessId, vscode.ConfigurationTarget.Global);
}

export async function addCustomAgent(agent: AgentHarness): Promise<void> {
  const config = vscode.workspace.getConfiguration('multiAgentChat');
  const current = config.get<AgentHarness[]>('customAgents', []);
  const filtered = current.filter((a) => a.id !== agent.id);
  filtered.push(agent);
  await config.update('customAgents', filtered, vscode.ConfigurationTarget.Global);
}

export async function removeCustomAgent(agentId: string): Promise<void> {
  const config = vscode.workspace.getConfiguration('multiAgentChat');
  const current = config.get<AgentHarness[]>('customAgents', []);
  const filtered = current.filter((a) => a.id !== agentId);
  await config.update('customAgents', filtered, vscode.ConfigurationTarget.Global);
}

export function getWorkspaceCwd(): string {
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  }
  return process.env.USERPROFILE || process.env.HOME || process.cwd();
}
