import * as vscode from 'vscode';
import { OmpTerminalViewProvider } from '../providers/OmpTerminalViewProvider';
import { getAllHarnesses, AgentHarness } from '../terminal/harness';
import { getOmpSettings, addCustomAgent, removeCustomAgent } from '../config/settings';

interface HarnessQuickPickItem extends vscode.QuickPickItem {
  harnessId?: string;
  isAction?: boolean;
  actionType?: 'add' | 'delete';
}

export function registerSwitchHarnessCommand(provider: OmpTerminalViewProvider): vscode.Disposable {
  return vscode.commands.registerCommand('multiAgentChat.switchHarness', async () => {
    const currentHarness = provider.getActiveHarness();
    const settings = getOmpSettings();
    const allHarnesses = getAllHarnesses(settings.customAgents);

    const items: HarnessQuickPickItem[] = Object.keys(allHarnesses).map((id) => {
      const def = allHarnesses[id];
      const isCurrent = id === currentHarness;
      return {
        label: `${def.icon} ${def.name}${isCurrent ? '  $(check)' : ''}`,
        description: def.description,
        detail: isCurrent ? 'Sedang aktif' : `Pilih untuk beralih ke ${def.name}`,
        harnessId: id
      };
    });

    // Tambahkan pemisah dan aksi tambahan
    items.push({
      label: '',
      kind: vscode.QuickPickItemKind.Separator
    });

    items.push({
      label: '$(add) Add New Agent...',
      description: 'Daftarkan CLI Agent kustom baru',
      isAction: true,
      actionType: 'add'
    });

    if (settings.customAgents.length > 0) {
      items.push({
        label: '$(trash) Delete Custom Agent...',
        description: 'Hapus CLI Agent kustom yang pernah ditambahkan',
        isAction: true,
        actionType: 'delete'
      });
    }

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Pilih AI Agent untuk Multi-Agent Chat'
    });

    if (!selected) {
      return;
    }

    // Aksi: Tambah Agent Baru
    if (selected.isAction && selected.actionType === 'add') {
      await handleAddNewAgent(provider);
      return;
    }

    // Aksi: Hapus Agent Kustom
    if (selected.isAction && selected.actionType === 'delete') {
      await handleDeleteCustomAgent(provider, settings.customAgents);
      return;
    }

    if (!selected.harnessId) {
      return;
    }

    if (selected.harnessId === currentHarness) {
      vscode.window.showInformationMessage(`${allHarnesses[selected.harnessId].name} sudah aktif.`);
      return;
    }

    // Langsung beralih dan simpan pilihan
    await provider.switchHarness(selected.harnessId);
    vscode.window.showInformationMessage(
      `Terminal dialihkan ke ${allHarnesses[selected.harnessId].name}.`
    );
  });
}

async function handleAddNewAgent(provider: OmpTerminalViewProvider) {
  // 1. Masukkan Nama Agent
  const name = await vscode.window.showInputBox({
    title: 'Add New AI Agent (1/3)',
    prompt: 'Masukkan nama tampilan Agent',
    placeHolder: 'Contoh: Aider, Claude Code, Goose',
    validateInput: (value) => (value.trim() ? null : 'Nama agent tidak boleh kosong')
  });

  if (!name) return;

  // 2. Masukkan Command CLI
  const command = await vscode.window.showInputBox({
    title: 'Add New AI Agent (2/3)',
    prompt: `Masukkan executable / CLI command untuk ${name}`,
    placeHolder: 'Contoh: aider, claude, goose',
    validateInput: (value) => (value.trim() ? null : 'Command CLI tidak boleh kosong')
  });

  if (!command) return;

  // 3. Masukkan Argumen Tambahan (Opsional)
  const argsInput = await vscode.window.showInputBox({
    title: 'Add New AI Agent (3/3)',
    prompt: 'Argumen default saat dijalankan (opsional, kosongkan jika tidak ada)',
    placeHolder: 'Contoh: --model gpt-4o'
  });

  const args = argsInput && argsInput.trim() ? argsInput.trim().split(/\s+/) : [];
  const id = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

  const newAgent: AgentHarness = {
    id,
    name: name.trim(),
    command: command.trim(),
    args,
    description: `Custom Agent: ${name.trim()} (${command.trim()})`,
    icon: '$(sparkle)',
    isCustom: true
  };

  await addCustomAgent(newAgent);
  await provider.switchHarness(id);

  vscode.window.showInformationMessage(
    `Agent '${name.trim()}' berhasil ditambahkan dan langsung diaktifkan!`
  );
}

async function handleDeleteCustomAgent(
  provider: OmpTerminalViewProvider,
  customAgents: AgentHarness[]
) {
  const items = customAgents.map((agent) => ({
    label: agent.name,
    description: agent.command,
    agentId: agent.id
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Pilih Agent kustom yang ingin dihapus'
  });

  if (!selected) return;

  await removeCustomAgent(selected.agentId);

  // Jika agent yang dihapus sedang aktif, fallback ke omp
  if (provider.getActiveHarness() === selected.agentId) {
    await provider.switchHarness('omp');
  }

  vscode.window.showInformationMessage(`Agent '${selected.label}' berhasil dihapus.`);
}
