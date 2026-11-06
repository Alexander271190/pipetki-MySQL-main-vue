<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { usePipettesStore } from '@/stores/pipettes';
import { lookupBarcode } from '@/api/barcodes';
import type { BarcodeLookupResult } from '@/api/barcodes';

const ui = useUiStore();
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
  ui.open('bulkSend', ids);
}

function goReturn() {
  const ids = scanList.value.filter(p => !!p.sent_for_calibration).map(p => p.id);
  if (!ids.length) return;
  pip.clearSelection();
  ids.forEach(id => pip.toggleSelected(id, true));
  close();
  ui.open('bulkReturn', ids);
}

function close() { ui.close(); }
</script>
