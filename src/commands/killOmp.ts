import * as vscode from 'vscode';
import { OmpTerminalViewProvider } from '../providers/OmpTerminalViewProvider';

export function registerKillOmpCommand(provider: OmpTerminalViewProvider): vscode.Disposable {
  return vscode.commands.registerCommand('multiAgentChat.killTerminal', () => {
    provider.kill();
    vscode.window.showInformationMessage('Multi-Agent Chat dimatikan.');
  });
}
