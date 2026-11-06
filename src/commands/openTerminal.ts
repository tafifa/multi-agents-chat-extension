import * as vscode from 'vscode';
import { OmpTerminalViewProvider } from '../providers/OmpTerminalViewProvider';

export function registerOpenTerminalCommand(provider: OmpTerminalViewProvider): vscode.Disposable {
  return vscode.commands.registerCommand('cliAgents.openTerminal', () => {
    provider.focus();
  });
}
