<template>
  <div>
    <div class="settings-form">
      <h4>Уведомления</h4>
      <div class="form-group">
        <label>Порог предупреждения о поверке (дней)</label>
        <input v-model.number="warnDays" type="number" min="1" max="365" style="max-width:150px;" />
      </div>
      <button class="btn btn-success btn-sm" :disabled="saving" @click="onSaveWarn">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i> Сохранить
      </button>
    </div>

    <div class="settings-form" style="margin-top:24px;border-left:3px solid #dc2626;">
      <h4 style="color:#991b1b;">Опасная зона</h4>
      <p style="color:#64748b;font-size:.88rem;margin:8px 0 12px;">
        Удаление <strong>всех данных</strong> об оборудовании и истории. <strong>Необратимо.</strong>
      </p>
      <button class="btn btn-danger btn-sm" @click="onResetAll">
        <i class="fa-solid fa-trash"></i> Сбросить все данные
      </button>
    </div>

    <div class="form-actions" style="margin-top:24px;">
      <button type="button" class="btn btn-secondary" @click="$emit('close')">Закрыть</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToastStore } from '@/stores/toast';
import { useSettingsStore } from '@/stores/settings';
import { usePipettesStore } from '@/stores/pipettes';
import { useStatsStore } from '@/stores/stats';
import { showConfirm } from '@/composables/useConfirm';
import { showPrompt } from '@/composables/usePrompt';
import * as api from '@/api/settings';

defineEmits<{ (e: 'close'): void }>();

const toast = useToastStore();
const settings = useSettingsStore();
const pip = usePipettesStore();
const stats = useStatsStore();

const warnDays = ref(30);
const saving = ref(false);

onMounted(async () => {
  try {
    const s = await api.getSystemSettings();
    warnDays.value = parseInt(String(s.warn_days)) || 30;
  } catch { /* ignore */ }
});

async function onSaveWarn() {
  saving.value = true;
  try {
    await api.saveSystem({ warn_days: String(warnDays.value) });
    settings.warnDays = warnDays.value;
    toast.success('Настройки сохранены');
    await stats.load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    saving.value = false;
  }
}

async function onResetAll() {
  const code = await showPrompt(
    'Это удалит ВСЁ оборудование и историю поверок.\n\nВведите «УДАЛИТЬ» для подтверждения:',
    {
      icon: 'fa-triangle-exclamation', title: 'Опасная зона',
      okText: 'Сбросить', okClass: 'btn-danger',
      placeholder: 'УДАЛИТЬ',
      validator: v => v === 'УДАЛИТЬ' ? null : 'Введите «УДАЛИТЬ»',
    }
  );
  if (!code) return;

  try {
    // Пока endpoint не реализован в старом бэке — предупреждаем
    toast.warn('Сброс данных требует реализации на сервере');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}
</script>
