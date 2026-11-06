import * as pty from 'node-pty';
import { getOmpSettings, getWorkspaceCwd } from '../config/settings';
import { HarnessId, HARNESS_DEFINITIONS, resolveExecutableForHarness } from './harness';

export class PtyManager {
  private ptyProcess?: pty.IPty;
  private onDataCallback?: (data: string) => void;
  private onExitCallback?: (exitCode: number) => void;
  private historyBuffer: string[] = [];
  private maxHistoryChunks = 200; // Simpan potongan riwayat untuk Webview reload
  private currentHarnessId: HarnessId = 'omp';

  public isAlive(): boolean {
    return !!this.ptyProcess;
  }

  public getActiveHarness(): HarnessId {
    return this.currentHarnessId;
  }

  public getActiveHarnessName(): string {
    return HARNESS_DEFINITIONS[this.currentHarnessId]?.name || 'Unknown';
  }

  public setOnData(callback: (data: string) => void) {
    this.onDataCallback = callback;
  }

  public setOnExit(callback: (exitCode: number) => void) {
    this.onExitCallback = callback;
  }

  public spawn(cols = 80, rows = 24, targetHarness?: HarnessId): void {
    if (this.ptyProcess) {
      this.kill();
    }

    this.historyBuffer = [];
    const settings = getOmpSettings();
    const harnessId = targetHarness || settings.harness;
    this.currentHarnessId = harnessId;

    const harnessDef = HARNESS_DEFINITIONS[harnessId] || HARNESS_DEFINITIONS.omp;
    const customPath = settings.harnessPaths[harnessId];
    const { shell, args } = resolveExecutableForHarness(harnessDef, customPath);
    const cwd = getWorkspaceCwd();

    // Environment variables
    const env = { ...process.env } as { [key: string]: string };
    env['COLORTERM'] = 'truecolor';
    env['TERM'] = 'xterm-256color';

    // Beri info harness yang sedang dijalankan
    const banner = `\r\n\x1b[1;36m[Multi-Agent Chat]\x1b[0m Menjalankan agent: \x1b[1;32m${harnessDef.name}\x1b[0m (${harnessDef.command})\r\n\r\n`;
    this.historyBuffer.push(banner);
    if (this.onDataCallback) {
      this.onDataCallback(banner);
    }

    try {
      this.ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env
      });

      this.ptyProcess.onData((data) => {
        // Simpan ke buffer riwayat
        if (this.historyBuffer.length > this.maxHistoryChunks) {
          this.historyBuffer.shift();
        }
        this.historyBuffer.push(data);

        if (this.onDataCallback) {
          this.onDataCallback(data);
        }
      });

      this.ptyProcess.onExit(({ exitCode }) => {
        this.ptyProcess = undefined;
        if (this.onExitCallback) {
          this.onExitCallback(exitCode);
        }
      });
    } catch (err: any) {
      const errorMessage = `\r\n\x1b[31m[Multi-Agent Chat Error] Gagal menjalankan ${harnessDef.name}: ${err.message}\x1b[0m\r\n`;
      this.historyBuffer.push(errorMessage);
      if (this.onDataCallback) {
        this.onDataCallback(errorMessage);
      }
    }
  }

  public write(data: string) {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }

  public resize(cols: number, rows: number) {
    if (this.ptyProcess && cols > 0 && rows > 0) {
      try {
        this.ptyProcess.resize(cols, rows);
      } catch (err) {
        console.warn('Gagal resize PTY:', err);
      }
    }
  }

  public getHistory(): string {
    return this.historyBuffer.join('');
  }

  public kill() {
    if (this.ptyProcess) {
      try {
        this.ptyProcess.kill();
      } catch (err) {
        console.warn('Gagal kill PTY process:', err);
      }
      this.ptyProcess = undefined;
    }
  }

  public restart(cols = 80, rows = 24, targetHarness?: HarnessId) {
    this.kill();
    this.spawn(cols, rows, targetHarness);
  }
}
