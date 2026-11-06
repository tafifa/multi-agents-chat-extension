import * as vscode from 'vscode';
import { OmpTerminalViewProvider } from '../providers/OmpTerminalViewProvider';

export function registerRestartOmpCommand(provider: OmpTerminalViewProvider): vscode.Disposable {
  return vscode.commands.registerCommand('cliAgents.restartTerminal', () => {
    provider.restart();
    vscode.window.showInformationMessage('CLI Agents Terminal direstart.');
  });
}
