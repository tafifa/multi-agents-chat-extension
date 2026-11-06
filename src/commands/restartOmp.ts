import * as vscode from 'vscode';
import { OmpTerminalViewProvider } from '../providers/OmpTerminalViewProvider';

export function registerRestartOmpCommand(provider: OmpTerminalViewProvider): vscode.Disposable {
  return vscode.commands.registerCommand('multiAgentChat.restartTerminal', () => {
    provider.restart();
    vscode.window.showInformationMessage('Multi-Agent Chat direstart.');
  });
}
