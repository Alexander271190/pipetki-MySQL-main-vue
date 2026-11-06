<template>
  <AppModal :visible="ui.activeModal === 'bulkResponsible'" @close="close">
    <h2><i class="fa-solid fa-user-pen"></i> Смена ответственного</h2>

    <div class="info-block">
      <strong>Выбрано:</strong> {{ count }}
    </div>

    <div class="warning-block">
      ℹ️ Отдел не меняется — только ответственный. Для перевода в другой отдел используйте «Передать».
    </div>

    <form @submit.prevent="onSubmit">
      <div class="form-group">
        <label>Новый ответственный *</label>
        <select v-model="newResp" required>
          <option value="">— выберите —</option>
          <option v-for="name in namesList" :key="name" :value="name">{{ name }}</option>
        </select>
      </div>
      <div v-if="error" class="auth-error" style="visibility:visible;opacity:1;">{{ error }}</div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="close">Отмена</button>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          <i class="fa-solid fa-check"></i> Применить
        </button>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { usePipettesStore } from '@/stores/pipettes';
import { useToastStore } from '@/stores/toast';
import { showConfirm } from '@/composables/useConfirm';
import { getResponsibles } from '@/api/users';
import * as bulkApi from '@/api/bulk';

const ui = useUiStore();
const pip = usePipettesStore();
const toast = useToastStore();

const ids = ref<string[]>([]);
const newResp = ref('');
const namesList = ref<string[]>([]);
const saving = ref(false);
const error = ref('');

const count = computed(() => ids.value.length);

watch(() => ui.activeModal, async (v) => {
  if (v !== 'bulkResponsible') return;
  ids.value = (ui.modalData as string[]) || [];
  if (ids.value.length === 0) { toast.error('Ничего не выбрано'); ui.close(); return; }
  newResp.value = '';
  error.value = '';

  try {
    const users = await getResponsibles();
    const names = new Set<string>();
    users.forEach(u => u.fullName && names.add(u.fullName));
    pip.items.forEach(p => p.responsible && names.add(p.responsible));
    namesList.value = [...names].sort((a, b) => a.localeCompare(b, 'ru'));
  } catch { /* ignore */ }
});

async function onSubmit() {
  error.value = '';
  if (!newResp.value) { error.value = 'Выберите ответственного'; return; }

  const ok = await showConfirm(
    `Назначить «${newResp.value}» ответственным за ${ids.value.length} единиц?`,
    { icon: '👤', title: 'Смена ответственного', okText: 'Применить', okClass: 'btn-primary' }
  );
  if (!ok) return;

  saving.value = true;
  try {
    const res = await bulkApi.bulkChangeResponsible(ids.value, newResp.value);
    let msg = `Изменено: ${res.successful}`;
    if (res.skipped > 0) msg += `. Пропущено: ${res.skipped}`;
    toast.success(msg);
    ui.close();
    pip.clearSelection();
    await pip.loadPaged();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка';
  } finally {
    saving.value = false;
  }
}

function close() {
  if (ids.value.length > 0) bulkApi.bulkUnlock(ids.value).catch(() => {});
  ui.close();
}
</script>
