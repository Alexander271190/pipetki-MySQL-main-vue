<template>
  <div>
    <h3>Политика паролей</h3>
    <div class="settings-form">
      <div class="form-group">
        <label>Мин. длина пароля</label>
        <input v-model="form.password_min_length" type="number" min="6" max="128" />
      </div>
      <div class="form-group">
        <label>Макс. длина пароля</label>
        <input v-model="form.password_max_length" type="number" min="8" max="128" />
      </div>
      <div class="form-group">
        <label style="display:flex;gap:8px;cursor:pointer;">
          <input v-model="form.password_require_lower" type="checkbox" :true-value="'1'" :false-value="'0'" />
          Требовать строчную букву
        </label>
      </div>
      <div class="form-group">
        <label style="display:flex;gap:8px;cursor:pointer;">
          <input v-model="form.password_require_upper" type="checkbox" :true-value="'1'" :false-value="'0'" />
          Требовать заглавную букву
        </label>
      </div>
      <div class="form-group">
        <label style="display:flex;gap:8px;cursor:pointer;">
          <input v-model="form.password_require_digit" type="checkbox" :true-value="'1'" :false-value="'0'" />
          Требовать цифру
        </label>
      </div>
      <div class="form-group">
        <label style="display:flex;gap:8px;cursor:pointer;">
          <input v-model="form.password_require_special" type="checkbox" :true-value="'1'" :false-value="'0'" />
          Требовать спецсимвол
        </label>
      </div>
      <div class="form-group">
        <label style="display:flex;gap:8px;cursor:pointer;">
          <input v-model="form.password_forbid_spaces" type="checkbox" :true-value="'1'" :false-value="'0'" />
          Запретить пробелы
        </label>
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
const form = ref({
  password_min_length: '8', password_max_length: '64',
  password_require_lower: '1', password_require_upper: '1',
  password_require_digit: '1', password_require_special: '1',
  password_forbid_spaces: '1',
});

onMounted(async () => {
  try {
    const s = await api.getSystemSettings();
    form.value = {
      password_min_length: String(s.password_min_length || '8'),
      password_max_length: String(s.password_max_length || '64'),
      password_require_lower: String(s.password_require_lower ?? '1'),
      password_require_upper: String(s.password_require_upper ?? '1'),
      password_require_digit: String(s.password_require_digit ?? '1'),
      password_require_special: String(s.password_require_special ?? '1'),
      password_forbid_spaces: String(s.password_forbid_spaces ?? '1'),
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
