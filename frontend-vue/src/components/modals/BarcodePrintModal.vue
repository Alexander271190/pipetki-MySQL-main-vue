<template>
  <AppModal :visible="ui.activeModal === 'barcodePrint'" @close="close" modal-class="modal-compact">
    <h2><i class="fa-solid fa-tag"></i> Печать этикеток</h2>

    <div class="bc-block">
      <div class="bc-block-title">Что печатать</div>
      <label class="bc-radio-item">
        <input v-model="scope" type="radio" value="selected" />
        <span>Только выбранные <b>{{ selectedCount }}</b></span>
      </label>
      <label class="bc-radio-item">
        <input v-model="scope" type="radio" value="page" />
        <span>Текущая страница <b>{{ pip.items.length }}</b></span>
      </label>
      <label class="bc-radio-item">
        <input v-model="scope" type="radio" value="filtered" />
        <span>Весь фильтр <b>{{ pip.total }}</b></span>
      </label>
    </div>

    <div class="bc-block">
      <div class="bc-block-title">Принтер</div>
      <div class="bc-printer-list">
        <label v-for="p in printers" :key="p.id" class="bc-printer-item">
          <input v-model="printerId" type="radio" :value="p.id" />
          <span>{{ printerLabel(p) }}</span>
        </label>
        <label class="bc-printer-item">
          <input v-model="printerId" type="radio" :value="0" />
          <span><i class="fa-solid fa-file-lines"></i> PDF (A4)</span>
        </label>
      </div>
    </div>

    <div class="bc-row">
      <label class="bc-row-label">Копий каждой</label>
      <input v-model.number="copies" type="number" min="1" max="50" class="bc-copies-input" />
    </div>

    <div v-if="error" class="auth-error" style="visibility:visible;opacity:1;">{{ error }}</div>

    <div class="form-actions" style="margin-top:16px;">
      <button type="button" class="btn btn-secondary" @click="close">Отмена</button>
      <button type="button" class="btn btn-success" :disabled="saving" @click="onPrint">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-print'"></i>
        Печать
      </button>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { usePipettesStore } from '@/stores/pipettes';
import { useToastStore } from '@/stores/toast';
import { showConfirm } from '@/composables/useConfirm';
import { todayStr } from '@/utils/format';
import { downloadFile } from '@/utils/download';
import { getAvailablePrinters, printBarcodes } from '@/api/barcodes';
import type { BarcodePrinter } from '@/api/barcodes';
import { getIdsForExport } from '@/api/pipettes';

const ui = useUiStore();
const pip = usePipettesStore();
const toast = useToastStore();

const scope = ref<'selected' | 'page' | 'filtered'>('filtered');
const printerId = ref(0);
const printers = ref<BarcodePrinter[]>([]);
const copies = ref(1);
const saving = ref(false);
const error = ref('');

const selectedCount = computed(() => pip.selected.size);

watch(() => ui.activeModal, async (v) => {
  if (v !== 'barcodePrint') return;
  scope.value = pip.selected.size > 0 ? 'selected' : 'filtered';
  copies.value = 1;
  error.value = '';

  try {
    const res = await getAvailablePrinters();
    printers.value = res.printers || [];
    printerId.value = res.preferredId || 0;
  } catch {
    printers.value = [];
    printerId.value = 0;
  }
});

function printerLabel(p: BarcodePrinter): string {
  const modes: Record<string, string> = {
    'pdf-a4': '📄 PDF (A4)',
    'pdf-zebra': '🖨️ PDF 58×40',
    'zebra-ip': '🌐 Zebra (IP)',
    'zebra-agent': '⚡ Zebra (агент)',
  };
  return `${modes[p.mode] || p.mode} — ${p.name}${p.department ? ' (' + p.department + ')' : ''}`;
}

async function collectIds(): Promise<string[]> {
  if (scope.value === 'selected') return [...pip.selected];
  if (scope.value === 'page') return pip.items.map(p => p.id);
  // filtered — все по фильтру
  const res = await getIdsForExport({
    sort: pip.sortField,
    dir: pip.sortDir > 0 ? 'asc' : 'desc',
    search: pip.search,
    filters: pip.filterState,
  });
  return res.ids || [];
}

async function onPrint() {
  error.value = '';
  const ids = await collectIds();
  if (ids.length === 0) { error.value = 'Ничего не выбрано'; return; }
  if (ids.length > 500) {
    const ok = await showConfirm(
      `Печатается ${ids.length} этикеток. Продолжить?`,
      { icon: '⚠️', title: 'Много этикеток', okText: 'Продолжить', okClass: 'btn-warning' }
    );
    if (!ok) return;
  }

  const c = Math.max(1, Math.min(50, copies.value || 1));
  saving.value = true;

  try {
    if (printerId.value === 0) {
      // PDF A4
      await downloadFile(
        `/api/barcodes/labels.pdf?ids=${encodeURIComponent(ids.join(','))}&copies=${c}&layout=a4`,
        {},
        `labels_a4_${todayStr()}.pdf`
      );
      toast.success(`PDF: ${ids.length * c} этикеток`);
      ui.close();
      return;
    }

    const res = await printBarcodes(ids, c, printerId.value);
    if (res.mode === 'pdf-a4-fallback') {
      toast.warn(`${res.reason || 'Fallback'}. Скачиваем PDF.`);
      await downloadFile(
        `/api/barcodes/labels.pdf?ids=${encodeURIComponent(ids.join(','))}&copies=${c}&layout=a4`,
        {},
        `labels_a4_${todayStr()}.pdf`
      );
      ui.close();
      return;
    }
    if (res.mode === 'pdf-zebra') {
      await downloadFile(
        `/api/barcodes/labels.pdf?ids=${encodeURIComponent(ids.join(','))}&copies=${c}&layout=zebra`,
        {},
        `labels_zebra_${todayStr()}.pdf`
      );
      toast.success(`PDF 58×40: ${ids.length * c} этикеток`);
      ui.close();
      return;
    }
    if (res.mode === 'zebra-ip') {
      toast.success(res.message || `Отправлено на «${res.printer}»`);
      ui.close();
      return;
    }
    if (res.mode === 'zebra-agent') {
      const ok = await sendToLocalAgent(res.zpl || '', res.agentPort || 9200);
      if (ok) {
        toast.success(`Отправлено на «${res.printer}»: ${res.printed} этикеток`);
      } else {
        toast.warn('Агент не отвечает. Скачиваем PDF.');
        await downloadFile(
          `/api/barcodes/labels.pdf?ids=${encodeURIComponent(ids.join(','))}&copies=${c}&layout=zebra`,
          {},
          `labels_zebra_${todayStr()}.pdf`
        );
      }
      ui.close();
      return;
    }
    toast.error('Неизвестный режим: ' + res.mode);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка печати';
  } finally {
    saving.value = false;
  }
}

async function sendToLocalAgent(zpl: string, port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: zpl,
    });
    return res.ok;
  } catch { return false; }
}

function close() { ui.close(); }
</script>
