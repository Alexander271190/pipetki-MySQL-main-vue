<template>
  <div>
    <h3>Уведомления</h3>
    <div class="settings-form">
      <div class="form-group">
        <label style="display:flex;gap:8px;cursor:pointer;">
          <input v-model="form.reminders_enabled" type="checkbox" :true-value="'1'" :false-value="'0'" />
          Показывать напоминания о просроченных поверках
        </label>
      </div>
      <div class="form-group">
        <label>Для каких ролей</label>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px;">
          <label v-for="r in roles" :key="r.value" style="display:flex;gap:8px;cursor:pointer;">
            <input type="checkbox" :value="r.value" :checked="rolesSelected.includes(r.value)" @change="toggleRole(r.value, ($event.target as HTMLInputElement).checked)" />
            {{ r.label }}
          </label>
        </div>
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
const roles = [
  { value: 'user', label: 'Пользователь' },
  { value: 'senior_lab', label: 'Ст. лаборант' },
  { value: 'admin', label: 'Администратор' },
];
const form = ref({ reminders_enabled: '1' });
const rolesSelected = ref<string[]>(['user', 'senior_lab', 'admin']);

onMounted(async () => {
  try {
    const s = await api.getSystemSettings();
    form.value = { reminders_enabled: String(s.reminders_enabled ?? '1') };
    try {
      const parsed = JSON.parse(String(s.reminders_for_roles || '[]'));
      if (Array.isArray(parsed) && parsed.length > 0) rolesSelected.value = parsed;
    } catch { /* дефолт */ }
  } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
});

function toggleRole(role: string, checked: boolean) {
  const s = new Set(rolesSelected.value);
  if (checked) s.add(role); else s.delete(role);
  rolesSelected.value = [...s];
}

async function onSave() {
  if (rolesSelected.value.length === 0 && form.value.reminders_enabled === '1') {
    toast.error('Выберите хотя бы одну роль');
    return;
  }
  saving.value = true;
  try {
    await api.saveSystem({
      reminders_enabled: form.value.reminders_enabled,
      reminders_for_roles: JSON.stringify(rolesSelected.value),
    });
    await settings.loadAll();
    toast.success('Сохранено');
  } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
  finally { saving.value = false; }
}
</script>
