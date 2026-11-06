import * as vscode from 'vscode';
import { OmpTerminalViewProvider } from '../providers/OmpTerminalViewProvider';

export function registerAddAgentCommand(): vscode.Disposable {
  return vscode.commands.registerCommand('multiAgentChat.addAgent', async () => {
    // Trigger the switchHarness command which has the full UI
    vscode.commands.executeCommand('multiAgentChat.switchHarness');
  });
}
