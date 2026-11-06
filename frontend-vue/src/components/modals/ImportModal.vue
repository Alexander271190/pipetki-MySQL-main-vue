<template>
  <AppModal :visible="ui.activeModal === 'import'" @close="close">
    <h2><i class="fa-solid fa-download"></i> Импорт данных</h2>

    <div class="form-group">
      <label>Файл (.xlsx, .csv, .json, .txt)</label>
      <input ref="fileInput" type="file" accept=".json,.csv,.xlsx,.txt" />
    </div>

    <div class="info-block">
      ℹ️ Заголовки распознаются автоматически: «ID», «Модель», «Отдел», «Дата поверки», «МПИ» и др.
    </div>

    <div v-if="progress > 0" style="margin-bottom:15px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:.85rem;color:#475569;font-weight:600;">{{ progressText }}</span>
        <span style="font-size:.85rem;color:#4f46e5;font-weight:700;">{{ Math.round(progress) }}%</span>
      </div>
      <div style="width:100%;height:8px;background:#e2e8f0;border-radius:6px;overflow:hidden;">
        <div :style="{ width: progress + '%', height: '100%', background: 'linear-gradient(90deg,#6366f1,#4f46e5)', borderRadius: '6px', transition: 'width .25s' }"></div>
      </div>
    </div>

    <div v-if="error" class="auth-error" style="visibility:visible;opacity:1;">{{ error }}</div>

    <div class="form-actions">
      <button type="button" class="btn btn-secondary" @click="close">Отмена</button>
      <button type="button" class="btn btn-success" :disabled="saving" @click="onImport">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-download'"></i>
        Загрузить
      </button>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { useToastStore } from '@/stores/toast';
import { usePipettesStore } from '@/stores/pipettes';
import { useStatsStore } from '@/stores/stats';
import { importFile } from '@/api/import';

const ui = useUiStore();
const toast = useToastStore();
const pip = usePipettesStore();
const stats = useStatsStore();

const fileInput = ref<HTMLInputElement | null>(null);
const progress = ref(0);
const progressText = ref('');
const error = ref('');
const saving = ref(false);

watch(() => ui.activeModal, (v) => {
  if (v !== 'import') return;
  progress.value = 0;
  progressText.value = '';
  error.value = '';
  if (fileInput.value) fileInput.value.value = '';
});

async function onImport() {
  error.value = '';
  const file = fileInput.value?.files?.[0];
  if (!file) { error.value = 'Выберите файл'; return; }
  if (file.name.toLowerCase().endsWith('.xls')) {
    error.value = 'Формат .xls не поддерживается. Пересохраните как .xlsx';
    return;
  }

  saving.value = true;
  progress.value = 10;
  progressText.value = '⏳ Чтение файла…';

  try {
    const base64 = await readFileAsBase64(file);
    progress.value = 40;
    progressText.value = '📤 Отправка на сервер…';

    const res = await importFile(base64, file.name);
    progress.value = 100;
    progressText.value = '✅ Готово';

    let msg = `Импортировано: ${res.added}`;
    if (res.skipped > 0) msg += `, пропущено: ${res.skipped}`;
    if (res.errors > 0) msg += `, ошибок: ${res.errors}`;
    toast.show(msg, res.added > 0 ? 'success' : 'error');

    setTimeout(async () => {
      ui.close();
      await pip.loadPaged();
      await stats.load();
    }, 400);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка импорта';
    progress.value = 0;
    progressText.value = '';
  } finally {
    saving.value = false;
  }
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = String(e.target?.result || '');
      resolve(dataUrl.split(',')[1] || dataUrl);
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });
}

function close() { ui.close(); }
</script>
