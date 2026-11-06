import * as vscode from 'vscode';
import { PtyManager } from './terminal/PtyManager';
import { OmpTerminalViewProvider } from './providers/OmpTerminalViewProvider';
import { registerOpenTerminalCommand } from './commands/openTerminal';
import { registerRestartOmpCommand } from './commands/restartOmp';
import { registerKillOmpCommand } from './commands/killOmp';
import { registerSwitchHarnessCommand } from './commands/switchHarness';

let ptyManager: PtyManager | undefined;

export function activate(context: vscode.ExtensionContext) {
  ptyManager = new PtyManager();

  const provider = new OmpTerminalViewProvider(context.extensionUri, ptyManager);

  // Daftarkan WebviewViewProvider dengan retainContextWhenHidden: true
  // agar proses dan state terminal tetap aktif saat sidebar di-hide / switch
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      OmpTerminalViewProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );

  // Daftarkan perintah-perintah extension
  context.subscriptions.push(
    registerOpenTerminalCommand(provider),
    registerRestartOmpCommand(provider),
    registerKillOmpCommand(provider),
    registerSwitchHarnessCommand(provider)
  );

  // Pantau perubahan konfigurasi
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('cliAgents')) {
        vscode.window.showInformationMessage('Konfigurasi CLI Agents diperbarui. Silakan restart terminal jika diperlukan.');
      }
    })
  );
}

export function deactivate() {
  if (ptyManager) {
    ptyManager.kill();
    ptyManager = undefined;
  }
}
