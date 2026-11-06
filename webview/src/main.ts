import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import './styles.css';

declare function acquireVsCodeApi(): {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
};

const vscode = acquireVsCodeApi();

// Dapatkan warna tema dari CSS variables VS Code
const styles = getComputedStyle(document.documentElement);
const getVar = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;

const terminal = new Terminal({
  cursorBlink: true,
  cursorStyle: 'block',
  fontSize: 13,
  fontFamily: "Consolas, 'Cascadia Code', 'Courier New', monospace",
  theme: {
    background: getVar('--vscode-terminal-background', '#181818'),
    foreground: getVar('--vscode-terminal-foreground', '#cccccc'),
    cursor: getVar('--vscode-terminalCursor-foreground', '#ffffff'),
    cursorAccent: getVar('--vscode-terminalCursor-background', '#000000'),
    selectionBackground: getVar('--vscode-terminal-selectionBackground', 'rgba(255, 255, 255, 0.25)'),
    black: getVar('--vscode-terminal-ansiBlack', '#000000'),
    red: getVar('--vscode-terminal-ansiRed', '#cd3131'),
    green: getVar('--vscode-terminal-ansiGreen', '#0dbc79'),
    yellow: getVar('--vscode-terminal-ansiYellow', '#e5e510'),
    blue: getVar('--vscode-terminal-ansiBlue', '#2472c8'),
    magenta: getVar('--vscode-terminal-ansiMagenta', '#bc3fbc'),
    cyan: getVar('--vscode-terminal-ansiCyan', '#11a8cd'),
    white: getVar('--vscode-terminal-ansiWhite', '#e5e5e5'),
    brightBlack: getVar('--vscode-terminal-ansiBrightBlack', '#666666'),
    brightRed: getVar('--vscode-terminal-ansiBrightRed', '#f14c4c'),
    brightGreen: getVar('--vscode-terminal-ansiBrightGreen', '#23d18b'),
    brightYellow: getVar('--vscode-terminal-ansiBrightYellow', '#f5f543'),
    brightBlue: getVar('--vscode-terminal-ansiBrightBlue', '#3b8eea'),
    brightMagenta: getVar('--vscode-terminal-ansiBrightMagenta', '#d670d6'),
    brightCyan: getVar('--vscode-terminal-ansiBrightCyan', '#29b8db'),
    brightWhite: getVar('--vscode-terminal-ansiBrightWhite', '#ffffff')
  },
  allowProposedApi: true
});

const fitAddon = new FitAddon();
terminal.loadAddon(fitAddon);

const container = document.getElementById('terminal-container');
if (container) {
  terminal.open(container);
  
  // Safe initial fit
  requestAnimationFrame(() => {
    try {
      fitAddon.fit();
      notifyResize();
    } catch (e) {
      console.warn('Initial fit warning', e);
    }
  });
}

function notifyResize() {
  if (terminal.cols > 0 && terminal.rows > 0) {
    vscode.postMessage({
      type: 'resize',
      cols: terminal.cols,
      rows: terminal.rows
    });
  }
}

// Tangani input keyboard dari user ke PTY
terminal.onData((data) => {
  vscode.postMessage({
    type: 'input',
    data: data
  });
});

// Tangani resize window
window.addEventListener('resize', () => {
  try {
    fitAddon.fit();
    notifyResize();
  } catch (err) {
    console.error('Resize error:', err);
  }
});

// Pesan masuk dari Extension Host
window.addEventListener('message', (event) => {
  const message = event.data;
  if (!message) return;

  switch (message.type) {
    case 'output':
      terminal.write(message.data);
      break;
    case 'clear':
      terminal.clear();
      break;
    case 'reset':
      terminal.reset();
      fitAddon.fit();
      notifyResize();
      break;
    case 'setFontSize':
      if (typeof message.fontSize === 'number') {
        terminal.options.fontSize = message.fontSize;
        fitAddon.fit();
        notifyResize();
      }
      break;
  }
});

// Beri tahu extension host bahwa webview xterm sudah siap
vscode.postMessage({ type: 'ready' });
