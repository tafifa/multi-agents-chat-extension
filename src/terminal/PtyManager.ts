import * as pty from 'node-pty';
import { getOmpSettings, getWorkspaceCwd } from '../config/settings';
import { AgentHarness, getAllHarnesses, resolveExecutableForHarness } from './harness';

export class PtyManager {
  private ptyProcess?: pty.IPty;
  private onDataCallback?: (data: string) => void;
  private onExitCallback?: (exitCode: number) => void;
  private historyBuffer: string[] = [];
  private maxHistoryChunks = 200; // Simpan potongan riwayat untuk Webview reload
  private currentHarnessId: string = 'omp';

  public isAlive(): boolean {
    return !!this.ptyProcess;
  }

  public getActiveHarness(): string {
    return this.currentHarnessId;
  }

  public getActiveHarnessName(): string {
    const settings = getOmpSettings();
    const all = getAllHarnesses(settings.customAgents);
    return all[this.currentHarnessId]?.name || this.currentHarnessId;
  }

  public setOnData(callback: (data: string) => void) {
    this.onDataCallback = callback;
  }

  public setOnExit(callback: (exitCode: number) => void) {
    this.onExitCallback = callback;
  }

  public spawn(cols = 80, rows = 24, targetHarness?: string): void {
    if (this.ptyProcess) {
      this.kill();
    }

    this.historyBuffer = [];
    const settings = getOmpSettings();
    const allHarnesses = getAllHarnesses(settings.customAgents);

    // Prioritaskan targetHarness jika ada, lalu currentHarnessId jika valid, baru settings.harness
    const chosenHarnessId =
      targetHarness ||
      (allHarnesses[this.currentHarnessId] ? this.currentHarnessId : settings.harness);

    this.currentHarnessId = allHarnesses[chosenHarnessId] ? chosenHarnessId : 'omp';

    const harnessDef = allHarnesses[this.currentHarnessId] || allHarnesses.omp;
    const customPath = settings.harnessPaths[this.currentHarnessId];
    const { shell, args } = resolveExecutableForHarness(harnessDef, customPath);
    const cwd = getWorkspaceCwd();

    // Environment variables
    const env = { ...process.env } as { [key: string]: string };
    env['COLORTERM'] = 'truecolor';
    env['TERM'] = 'xterm-256color';

    // Beri info agent yang sedang dijalankan
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

        if (exitCode !== 0) {
          const hint = `\r\n\x1b[33m[Tip]\x1b[0m Pastikan perintah '\x1b[1m${harnessDef.command}\x1b[0m' sudah terinstal dan ada di PATH sistem, atau tentukan path binary di setting 'multiAgentChat.harnesses'.\r\n`;
          this.historyBuffer.push(hint);
          if (this.onDataCallback) {
            this.onDataCallback(hint);
          }
        }

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

  public restart(cols = 80, rows = 24, targetHarness?: string) {
    this.kill();
    this.spawn(cols, rows, targetHarness || this.currentHarnessId);
  }
}
