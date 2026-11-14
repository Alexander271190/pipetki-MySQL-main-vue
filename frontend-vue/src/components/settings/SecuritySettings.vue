<template>
  <div>
    <h3>Вход под пользователем</h3>
    <div class="settings-form">
      <div class="form-group">
        <label style="display:flex;gap:8px;cursor:pointer;margin-bottom:8px;">
          <input v-model="form.impersonation_mode" type="radio" value="off" />
          <span><strong>Отключено</strong> — никто не может</span>
        </label>
        <label style="display:flex;gap:8px;cursor:pointer;margin-bottom:8px;">
          <input v-model="form.impersonation_mode" type="radio" value="admin" />
          <span><strong>Только встроенный admin</strong></span>
        </label>
        <label style="display:flex;gap:8px;cursor:pointer;">
          <input v-model="form.impersonation_mode" type="radio" value="all_admins" />
          <span><strong>Все администраторы</strong></span>
        </label>
      </div>
      <div v-if="form.impersonation_mode === 'off'" class="warning-block">
        ⚠️ Админ не сможет воспроизвести баг пользователя.
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
const form = ref({ impersonation_mode: 'all_admins' as 'off' | 'admin' | 'all_admins' });

onMounted(async () => {
  try {
    const s = await api.getSystemSettings();
    form.value.impersonation_mode = (s.impersonation_mode as any) || 'all_admins';
  } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
});

async function onSave() {
  saving.value = true;
  try {
    await api.saveSystem({ impersonation_mode: form.value.impersonation_mode });
    await settings.loadAll();
    toast.success('Сохранено');
  } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
  finally { saving.value = false; }
}
</script>
