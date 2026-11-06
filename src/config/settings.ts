import * as vscode from 'vscode';
import { HarnessId, HARNESS_DEFINITIONS } from '../terminal/harness';

export interface MultiAgentChatSettings {
  harness: HarnessId;
  fontSize: number;
  fontFamily: string;
  harnessPaths: Record<HarnessId, string>;
}

export function getOmpSettings(): MultiAgentChatSettings {
  const config = vscode.workspace.getConfiguration('multiAgentChat');
  const configuredHarness = config.get<string>('harness', 'omp') as HarnessId;
  const validHarness: HarnessId = HARNESS_DEFINITIONS[configuredHarness] ? configuredHarness : 'omp';

  // Fallback to legacy omp or cliAgents config if available
  const legacyOmpConfig = vscode.workspace.getConfiguration('omp');
  const legacyCliConfig = vscode.workspace.getConfiguration('cliAgents');
  const legacyPath = (
    legacyOmpConfig?.get<string>('executablePath', '') ||
    legacyCliConfig?.get<string>('executablePath', '') ||
    ''
  ).trim();

  const harnessesConfig = config.get<Record<string, { path?: string }>>('harnesses', {});

  const ompPath = harnessesConfig.omp?.path?.trim() || legacyPath;
  const opencodePath = harnessesConfig.opencode?.path?.trim() || '';

  return {
    harness: validHarness,
    fontSize: config.get<number>('fontSize', 13),
    fontFamily: config.get<string>('fontFamily', "Consolas, 'Courier New', monospace"),
    harnessPaths: {
      omp: ompPath,
      opencode: opencodePath
    }
  };
}

export async function setConfiguredHarness(harnessId: HarnessId): Promise<void> {
  const config = vscode.workspace.getConfiguration('multiAgentChat');
  await config.update('harness', harnessId, vscode.ConfigurationTarget.Global);
}

export function getWorkspaceCwd(): string {
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  }
  return process.env.USERPROFILE || process.env.HOME || process.cwd();
}
