<template>
  <div>
    <h3>Общие настройки оборудования</h3>
    <div class="settings-form">
      <div class="form-group">
        <label>Максимум строк в партии</label>
        <input v-model="form.max_batch_size" type="number" min="1" max="1000" />
      </div>
      <div class="form-group">
        <label>Максимум единиц в массовой операции</label>
        <input v-model="form.max_bulk_size" type="number" min="1" max="1000" />
      </div>
      <div class="form-group">
        <label>Макс. длина модели</label>
        <input v-model="form.max_model_length" type="number" min="10" max="1000" />
      </div>
      <div class="form-group">
        <label>Макс. длина серийного номера</label>
        <input v-model="form.max_serial_length" type="number" min="10" max="1000" />
      </div>
      <button class="btn btn-success btn-sm" :disabled="saving" @click="onSave">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i> Сохранить
      </button>
    </div>
    <div class="form-actions" style="margin-top:16px;">
      <button type="button" class="btn btn-secondary" @click="$emit('close')">Закрыть</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToastStore } from '@/stores/toast';
import { useSettingsStore } from '@/stores/settings';
import * as api from '@/api/settings';

defineEmits<{ (e: 'close'): void }>();

const toast = useToastStore();
const settings = useSettingsStore();
const saving = ref(false);
const form = ref({ max_batch_size: '100', max_bulk_size: '100', max_model_length: '255', max_serial_length: '255' });

onMounted(async () => {
  try {
    const s = await api.getSystemSettings();
    form.value = {
      max_batch_size: String(s.max_batch_size || '100'),
      max_bulk_size: String(s.max_bulk_size || '100'),
      max_model_length: String(s.max_model_length || '255'),
      max_serial_length: String(s.max_serial_length || '255'),
    };
  } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
});

async function onSave() {
  saving.value = true;
  try {
    await api.saveSystem({ ...form.value });
    await settings.loadAll();
    toast.success('Сохранено');
  } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
  finally { saving.value = false; }
}
</script>
