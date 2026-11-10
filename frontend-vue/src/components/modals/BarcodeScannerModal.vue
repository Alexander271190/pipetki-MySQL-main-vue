<template>
  <AppModal :visible="ui.activeModal === 'barcodeScanner'" @close="close">
    <h2><i class="fa-solid fa-barcode"></i> Сканирование штрихкодов</h2>
    
    <div class="info-block" style="margin-bottom:16px;">
      Наведите сканер на штрихкод или введите значение и нажмите <strong>Enter</strong>.
    </div>

    <div class="form-group">
      <label>Штрихкод</label>
      <input
        ref="inputRef"
        v-model="barcode"
        type="text"
        placeholder="Отсканируйте или введите…"
        autocomplete="off"
        @keydown.enter.prevent="onScan"
      />
    </div>

    <div v-if="error" class="auth-error" style="visibility:visible;opacity:1;">{{ error }}</div>

    <div style="margin-top:16px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <strong style="font-size:.9rem;">Считано: {{ scanList.length }}</strong>
        <button class="btn btn-secondary btn-sm" @click="scanList = []">Очистить</button>
      </div>
      <div style="max-height:240px;overflow-y:auto;padding:8px;background:#f8fafc;border-radius:8px;font-size:.85rem;">
        <div v-if="scanList.length === 0" style="color:#94a3b8;">Список пуст.</div>
        <div v-for="(p, i) in scanList" :key="p.id" style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e2e8f0;">
          <div><strong>{{ p.id }}</strong> — {{ p.model }}</div>
          <button class="btn btn-danger btn-sm" @click="scanList.splice(i, 1)" style="padding:2px 8px;font-size:.7rem;">×</button>
        </div>
      </div>
    </div>

    <div class="form-actions">
      <button type="button" class="btn btn-secondary" @click="close">Закрыть</button>
      <button type="button" class="btn btn-warning" :disabled="!hasSendable" @click="goSend">
        <i class="fa-solid fa-box"></i> На отправку
      </button>
      <button type="button" class="btn btn-success" :disabled="!hasReturnable" @click="goReturn">
        <i class="fa-solid fa-box-open"></i> На возврат
      </button>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { useModals } from '@/composables/useModals';
import { usePipettesStore } from '@/stores/pipettes';
import { lookupBarcode } from '@/api/barcodes';
import type { BarcodeLookupResult } from '@/api/barcodes';

const ui = useUiStore();
const modals = useModals();
const pip = usePipettesStore();

const barcode = ref('');
const scanList = ref<BarcodeLookupResult[]>([]);
const error = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

const hasSendable = computed(() => scanList.value.some(p => !p.sent_for_calibration));
const hasReturnable = computed(() => scanList.value.some(p => !!p.sent_for_calibration));

watch(() => ui.activeModal, async (v) => {
  if (v !== 'barcodeScanner') return;
  barcode.value = '';
  scanList.value = [];
  error.value = '';
  await nextTick();
  inputRef.value?.focus();
});

async function onScan() {
  const value = barcode.value.trim();
  if (!value) return;
  error.value = '';
  barcode.value = '';

  if (scanList.value.some(x => x.id === value)) {
    error.value = 'Уже в списке';
    return;
  }

  try {
    const res = await lookupBarcode(value);
    if (scanList.value.some(x => x.id === res.id)) {
      error.value = 'Уже в списке';
      return;
    }
    scanList.value.push(res);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не найдено';
  }
}

function goSend() {
  const ids = scanList.value.filter(p => !p.sent_for_calibration).map(p => p.id);
  if (!ids.length) return;
  pip.clearSelection();
  ids.forEach(id => pip.toggleSelected(id, true));
  close();
  void modals.openBulkSend();
}

function goReturn() {
  const ids = scanList.value.filter(p => !!p.sent_for_calibration).map(p => p.id);
  if (!ids.length) return;
  pip.clearSelection();
  ids.forEach(id => pip.toggleSelected(id, true));
  close();
  void modals.openBulkReturn();
}

function close() { ui.close(); }
</script>
