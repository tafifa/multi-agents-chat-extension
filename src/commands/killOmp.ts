import * as vscode from 'vscode';
import { OmpTerminalViewProvider } from '../providers/OmpTerminalViewProvider';

export function registerKillOmpCommand(provider: OmpTerminalViewProvider): vscode.Disposable {
  return vscode.commands.registerCommand('cliAgents.killTerminal', () => {
    provider.kill();
    vscode.window.showInformationMessage('CLI Agents Terminal dimatikan.');
  });
}
