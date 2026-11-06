import * as vscode from 'vscode';
import { PtyManager } from '../terminal/PtyManager';
import { getOmpSettings, setConfiguredHarness } from '../config/settings';
import { HarnessId, HARNESS_DEFINITIONS } from '../terminal/harness';

export class OmpTerminalViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'multiAgentChat.terminalView';
  private _view?: vscode.WebviewView;
  private currentCols = 80;
  private currentRows = 24;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _ptyManager: PtyManager
  ) {
    // Sambungkan stream data dari PTY ke Webview
    this._ptyManager.setOnData((data) => {
      this._view?.webview.postMessage({
        type: 'output',
        data
      });
    });

    this._ptyManager.setOnExit((exitCode) => {
      const harnessName = this._ptyManager.getActiveHarnessName();
      this._view?.webview.postMessage({
        type: 'output',
        data: `\r\n\x1b[33m[Proses ${harnessName} telah berhenti dengan exit code: ${exitCode}]\x1b[0m\r\n`
      });
    });
  }

  public getActiveHarness(): HarnessId {
    return this._ptyManager.getActiveHarness();
  }

  public async switchHarness(harnessId: HarnessId, saveAsDefault = false): Promise<void> {
    if (saveAsDefault) {
      await setConfiguredHarness(harnessId);
    }

    if (this._view) {
      this._view.description = HARNESS_DEFINITIONS[harnessId]?.name || harnessId;
      this._view.webview.postMessage({ type: 'clear' });
    }

    this._ptyManager.restart(this.currentCols, this.currentRows, harnessId);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    this._view.description = this._ptyManager.getActiveHarnessName();

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Tangani pesan dari xterm.js di dalam Webview
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'ready': {
          const settings = getOmpSettings();
          webviewView.webview.postMessage({
            type: 'setFontSize',
            fontSize: settings.fontSize
          });

          if (!this._ptyManager.isAlive()) {
            this._ptyManager.spawn(this.currentCols, this.currentRows, settings.harness);
            this._view!.description = this._ptyManager.getActiveHarnessName();
          } else {
            // Replay history jika webview baru dirender ulang
            const history = this._ptyManager.getHistory();
            if (history) {
              webviewView.webview.postMessage({
                type: 'output',
                data: history
              });
            }
          }
          break;
        }

        case 'input':
          this._ptyManager.write(message.data);
          break;

        case 'resize':
          this.currentCols = message.cols;
          this.currentRows = message.rows;
          this._ptyManager.resize(message.cols, message.rows);
          break;
      }
    });
  }

  public restart() {
    if (this._view) {
      this._view.webview.postMessage({ type: 'clear' });
    }
    this._ptyManager.restart(this.currentCols, this.currentRows);
  }

  public kill() {
    const harnessName = this._ptyManager.getActiveHarnessName();
    this._ptyManager.kill();
    if (this._view) {
      this._view.webview.postMessage({
        type: 'output',
        data: `\r\n\x1b[31m[Session ${harnessName} dihentikan oleh user]\x1b[0m\r\n`
      });
    }
  }

  public focus() {
    this._view?.show?.(true);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist-webview', 'main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist-webview', 'main.css')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${styleUri}" rel="stylesheet">
  <title>Multi-Agent Chat</title>
</head>
<body>
  <div id="terminal-container"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
