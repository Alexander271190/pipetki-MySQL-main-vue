<template>
  <div>
    <p style="color:#64748b;font-size:.85rem;margin:0 0 12px;">Параметры печати штрихкодов.</p>

    <div class="bc-settings-block" style="margin-top:0;">
      <div class="bc-settings-title">Что печатать</div>
      <div class="bc-settings-grid">
        <div class="bc-cell"><label>Размер</label>
          <select v-model="labelSize"><option value="58x40">58 × 40 мм</option><option value="40x25">40 × 25 мм</option><option value="100x50">100 × 50 мм</option></select>
        </div>
        <div class="bc-cell"><label>Тип ШК</label>
          <select v-model="type"><option value="code128">Code-128</option><option value="qr">QR</option></select>
        </div>
        <div class="bc-cell"><label>Копий</label><input v-model.number="copies" type="number" min="1" max="50" /></div>
        <div class="bc-cell"><label>Макс. длина</label><input v-model.number="maxLength" type="number" min="8" max="255" /></div>
        <div class="bc-cell bc-cell-check">
          <label class="bc-fallback-line">
            <input v-model="fallbackToPdf" type="checkbox" />
            <span>Fallback на PDF</span>
          </label>
        </div>

        <!-- === 1.5 === шрифт и порт агента -->
        <div class="bc-cell">
          <label>Шрифт</label>
          <select v-model="font">
            <option v-for="f in availableFonts" :key="f.value" :value="f.value">{{ f.label }}</option>
          </select>
        </div>
        <div class="bc-cell">
          <label>Порт агента</label>
          <input v-model.number="agentPort" type="number" />
        </div>
      </div>
      <div class="bc-fields-section">
        <div class="bc-fields-label">Поля на этикетке:</div>
        <div class="bc-fields-grid">
          <label v-for="f in labelFields" :key="f.id" style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" :value="f.id" :checked="selectedFields.includes(f.id)" @change="toggleField(f.id, ($event.target as HTMLInputElement).checked)" />
            {{ f.label }}
          </label>
        </div>
        <div class="bc-fields-hint"><i class="fa-solid fa-circle-info"></i> Влезает <b>3–4 поля</b></div>
      </div>
    </div>

    <div class="form-actions" style="margin-top:16px;">
      <button type="button" class="btn btn-secondary btn-sm" @click="$emit('close')">Закрыть</button>
      <button class="btn btn-success btn-sm" :disabled="saving" @click="onSave">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i> Сохранить
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToastStore } from '@/stores/toast';
import { useSettingsStore } from '@/stores/settings';
import * as api from '@/api/settings';
import { getBarcodeFonts } from '@/api/barcodes';   // === 1.5 ===

defineEmits<{ (e: 'close'): void }>();

const toast = useToastStore();
const settings = useSettingsStore();

const labelSize = ref('58x40');
const type = ref('code128');
const copies = ref(1);
const maxLength = ref(255);
const fallbackToPdf = ref(true);
const selectedFields = ref<string[]>(['id', 'model', 'serial', 'department']);
const saving = ref(false);
const font = ref('dejavu');                                          // === 1.5 ===
const agentPort = ref(9200);                                          // === 1.5 ===
const availableFonts = ref<{ value: string; label: string }[]>([]);   // === 1.5 ===

const labelFields = [
  { id: 'id', label: 'Внутренний номер' },
  { id: 'model', label: 'Модель' },
  { id: 'serial', label: 'Серийный' },
  { id: 'inventorynumber', label: 'Инв. номер' },
  { id: 'department', label: 'Отдел' },
  { id: 'responsible', label: 'Ответственный' },
];

onMounted(async () => {
  try {
    const s = await api.getSystemSettings();
    labelSize.value = String(s.barcode_label_size || '58x40');
    type.value = String(s.barcode_type || 'code128');
    copies.value = Number(s.barcode_default_copies) || 1;
    maxLength.value = Math.min(255, parseInt(String(s.barcode_max_length), 10) || 255);
    fallbackToPdf.value = s.barcode_fallback_to_pdf !== '0';
    try { selectedFields.value = JSON.parse(String(s.barcode_label_fields || '[]')); } catch { /* ignore */ }

    // === 1.5 === шрифт и порт агента
    font.value = String(s.barcode_font || 'dejavu');
    agentPort.value = Number(s.barcode_agent_port) || 9200;
    try {
      availableFonts.value = await getBarcodeFonts();
    } catch { /* ignore */ }
  } catch { /* ignore */ }
});

function toggleField(id: string, checked: boolean) {
  const set = new Set(selectedFields.value);
  if (checked) set.add(id); else set.delete(id);
  selectedFields.value = [...set];
}

async function onSave() {
  if (selectedFields.value.length === 0) { toast.error('Выберите хотя бы одно поле'); return; }
  saving.value = true;
  try {
    await api.saveSystem({
      barcode_label_size: labelSize.value,
      barcode_type: type.value,
      barcode_default_copies: String(copies.value),
      barcode_max_length: String(Math.min(255, Math.max(8, maxLength.value || 255))),
      barcode_fallback_to_pdf: fallbackToPdf.value ? '1' : '0',
      barcode_label_fields: JSON.stringify(selectedFields.value),
      barcode_font: font.value || 'dejavu',                    // === 1.5 ===
      barcode_agent_port: String(agentPort.value),              // === 1.5 ===
    });
    toast.success('Настройки сохранены');
    await settings.loadAll();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    saving.value = false;
  }
}
</script>
