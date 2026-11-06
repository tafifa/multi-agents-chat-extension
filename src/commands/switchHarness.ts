import * as vscode from 'vscode';
import { OmpTerminalViewProvider } from '../providers/OmpTerminalViewProvider';
import { HARNESS_DEFINITIONS, HarnessId } from '../terminal/harness';

interface HarnessQuickPickItem extends vscode.QuickPickItem {
  harnessId: HarnessId;
}

export function registerSwitchHarnessCommand(provider: OmpTerminalViewProvider): vscode.Disposable {
  return vscode.commands.registerCommand('cliAgents.switchHarness', async () => {
    const currentHarness = provider.getActiveHarness();

    const items: HarnessQuickPickItem[] = (
      Object.keys(HARNESS_DEFINITIONS) as HarnessId[]
    ).map((id) => {
      const def = HARNESS_DEFINITIONS[id];
      const isCurrent = id === currentHarness;
      return {
        label: `${def.icon} ${def.name}${isCurrent ? '  $(check)' : ''}`,
        description: def.description,
        detail: isCurrent ? 'Sedang aktif' : `Pilih untuk beralih ke ${def.name}`,
        harnessId: id
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Pilih AI Agent Harness untuk Terminal Sidebar'
    });

    if (!selected) {
      return;
    }

    if (selected.harnessId === currentHarness) {
      vscode.window.showInformationMessage(`${selected.label} sudah aktif.`);
      return;
    }

    // Tanya apakah ingin disimpan sebagai default
    const action = await vscode.window.showInformationMessage(
      `Beralih ke ${HARNESS_DEFINITIONS[selected.harnessId].name}. Jadikan sebagai default harness?`,
      'Ya, Jadikan Default',
      'Hanya Sesi Ini'
    );

    const saveAsDefault = action === 'Ya, Jadikan Default';
    await provider.switchHarness(selected.harnessId, saveAsDefault);

    vscode.window.showInformationMessage(
      `Terminal dialihkan ke ${HARNESS_DEFINITIONS[selected.harnessId].name}${
        saveAsDefault ? ' (tersimpan sebagai default)' : ''
      }.`
    );
  });
}
