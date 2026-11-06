<template>
  <div>
    <p style="color:#64748b;font-size:.85rem;margin:0 0 12px;">Список принтеров этикеток.</p>

    <div v-if="loading" style="text-align:center;padding:30px;">
      <i class="fa-solid fa-spinner fa-spin"></i>
    </div>

    <div v-else-if="printers.length === 0" class="bc-empty">
      Принтеров пока нет. Нажмите «Добавить принтер».
    </div>

    <table v-else class="bc-printers-table">
      <thead>
        <tr>
          <th style="width:20%;">Название</th>
          <th style="width:16%;">Режим</th>
          <th style="width:20%;">Отдел</th>
          <th style="width:18%;">IP</th>
          <th style="width:9%;">Размер</th>
          <th style="width:5%;">Вкл</th>
          <th style="width:7%;">По ум.</th>
          <th style="width:5%;"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in printers" :key="p.id">
          <td><input v-model="p.name" type="text" style="width:100%;padding:4px 6px;border:1px solid var(--border-hard);border-radius:4px;" /></td>
          <td>
            <select v-model="p.mode" style="width:100%;padding:4px 6px;border:1px solid var(--border-hard);border-radius:4px;">
              <option value="pdf-a4">PDF (A4)</option>
              <option value="pdf-zebra">PDF 58×40</option>
              <option value="zebra-ip">Zebra IP</option>
              <option value="zebra-agent">Zebra агент</option>
            </select>
          </td>
          <td>
            <select v-model="p.department" style="width:100%;padding:4px 6px;border:1px solid var(--border-hard);border-radius:4px;">
              <option value="">— любой —</option>
              <option v-for="d in settings.departments" :key="d" :value="d">{{ d }}</option>
            </select>
          </td>
          <td><input v-model="p.ip" type="text" placeholder="192.168.1.100" style="width:100%;padding:4px 6px;border:1px solid var(--border-hard);border-radius:4px;" /></td>
          <td>
            <select v-model="p.labelSize" style="width:100%;padding:4px 6px;border:1px solid var(--border-hard);border-radius:4px;">
              <option value="58x40">58×40</option>
              <option value="40x25">40×25</option>
              <option value="100x50">100×50</option>
            </select>
          </td>
          <td style="text-align:center;"><input v-model="p.enabled" type="checkbox" /></td>
          <td style="text-align:center;"><input v-model="p.isDefault" type="checkbox" /></td>
          <td style="text-align:center;">
            <button class="row-actions-btn" @click.stop="openActions($event, p)">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="form-actions">
      <button class="btn btn-primary btn-sm" style="margin-right:auto;" @click="onAdd">
        <i class="fa-solid fa-plus"></i> Добавить принтер
      </button>
      <button type="button" class="btn btn-secondary btn-sm" @click="$emit('close')">Закрыть</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToastStore } from '@/stores/toast';
import { useUiStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { showConfirm } from '@/composables/useConfirm';
import { showPrompt } from '@/composables/usePrompt';
import * as api from '@/api/barcodePrinters';
import type { BarcodePrinterFull } from '@/api/barcodePrinters';

defineEmits<{ (e: 'close'): void }>();

const toast = useToastStore();
const ui = useUiStore();
const settings = useSettingsStore();

const printers = ref<BarcodePrinterFull[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try { printers.value = await api.getBarcodePrinters(); }
  catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
  finally { loading.value = false; }
}

onMounted(load);

async function onAdd() {
  const name = await showPrompt('Название принтера', {
    icon: 'fa-print', title: 'Новый принтер', okText: 'Далее',
    placeholder: 'Например: Zebra КДЛ',
    validator: v => v ? null : 'Укажите название',
  });
  if (!name) return;

  const mode = await showPrompt('Режим:\n1 — PDF (A4)\n2 — PDF 58×40\n3 — Zebra по сети\n4 — Zebra через агент', {
    icon: 'fa-gear', title: 'Режим принтера', okText: 'Далее',
    defaultValue: '2',
    validator: v => ['1','2','3','4'].includes(v) ? null : 'Введите 1, 2, 3 или 4',
  });
  if (!mode) return;

  const modeMap: Record<string, BarcodePrinterFull['mode']> = {
    '1': 'pdf-a4', '2': 'pdf-zebra', '3': 'zebra-ip', '4': 'zebra-agent',
  };
  const selectedMode = modeMap[mode];

  let ip = '';
  let port = 9100;
  if (selectedMode === 'zebra-ip') {
    const ipIn = await showPrompt('IP-адрес', {
      icon: 'fa-network-wired', title: 'Сетевой принтер', okText: 'Далее',
      placeholder: '192.168.1.100',
      validator: v => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v) ? null : 'Некорректный IP',
    });
    if (!ipIn) return;
    ip = ipIn;
  }

  try {
    await api.createBarcodePrinter({
      name: name.trim(),
      mode: selectedMode,
      department: '',
      ip,
      port,
      labelSize: '58x40',
      enabled: true,
      isDefault: false,
    });
    toast.success('Принтер добавлен');
    load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

function openActions(e: MouseEvent, p: BarcodePrinterFull) {
  ui.openRowActions(e.currentTarget as HTMLElement, [
    { label: '<i class="fa-solid fa-floppy-disk"></i> Сохранить', action: () => savePrinter(p) },
    { label: '<i class="fa-solid fa-plug"></i> Проверить связь', action: () => checkPrinter(p) },
    { divider: true },
    {
      label: '<i class="fa-solid fa-trash"></i> Удалить',
      class: 'item-danger',
      action: () => deletePrinter(p),
    },
  ]);
}

async function savePrinter(p: BarcodePrinterFull) {
  try {
    await api.updateBarcodePrinter(p.id, p);
    toast.success('Принтер сохранён');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

async function checkPrinter(p: BarcodePrinterFull) {
  if (p.mode !== 'zebra-ip') {
    toast.warn('Проверка связи — только для Zebra IP');
    return;
  }
  try {
    const res = await api.checkPrinterStatus(p.ip || '', p.port);
    toast.show(res.message, res.ok ? 'success' : 'error');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

async function deletePrinter(p: BarcodePrinterFull) {
  const ok = await showConfirm(`Удалить принтер «${p.name}»?`, {
    icon: '🖨️', title: 'Удаление', okText: 'Удалить', okClass: 'btn-danger',
  });
  if (!ok) return;
  try {
    await api.deleteBarcodePrinter(p.id);
    toast.success('Удалён');
    load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}
</script>
