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
import { ref, computed, watch, onUnmounted } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { usePipettesStore } from '@/stores/pipettes';
import { useToastStore } from '@/stores/toast';
import { useAuthStore, usePermissions } from '@/stores/auth';
import { showConfirm } from '@/composables/useConfirm';
import { getResponsibles } from '@/api/users';
import * as bulkApi from '@/api/bulk';

const ui = useUiStore();
const pip = usePipettesStore();
const toast = useToastStore();
const auth = useAuthStore();        
const perm = usePermissions();     
const ids = ref<string[]>([]);
const newResp = ref('');
const namesList = ref<string[]>([]);
const saving = ref(false);
const error = ref('');

let _lockedIds: string[] = [];
let _generation = 0;

const count = computed(() => ids.value.length);

watch(() => ui.activeModal, (v) => {
  if (v === 'bulkResponsible') open();
});

async function open() {
  const gen = ++_generation;

  // Сброс состояния
  error.value = '';
  saving.value = false;
  ids.value = [];
  newResp.value = '';

  const list = (ui.modalData as string[]) || [];
  if (list.length === 0) {
    toast.error('Ничего не выбрано');
    ui.close();
    return;
  }

  // 1. Захват локов (await), потом показываем форму
  try {
    const r = await bulkApi.bulkLock(list);
    if (gen !== _generation) {
      // Пока ждали — сессия переоткрыта или закрыта: сразу освобождаем
      bulkApi.bulkUnlock(list).catch(() => {});
      return;
    }
    _lockedIds = list;
    if (r.busy?.length) {
      toast.warn(`Уже редактируются: ${r.busy.map(b => `${b.id} (${b.lockedBy})`).join(', ')}`);
    }
  } catch {
    if (gen === _generation) {
      toast.error('Ошибка блокировки');
      ui.close();
    }
    return;
  }

  ids.value = list;

  // 2. Список имён
  try {
    const users = await getResponsibles();
    if (gen !== _generation) return;
    const names = new Set<string>();
    users.forEach(u => u.fullName && names.add(u.fullName));
    pip.items.forEach(p => p.responsible && names.add(p.responsible));
    namesList.value = [...names].sort((a, b) => a.localeCompare(b, 'ru'));
  } catch { /* ignore */ }
}

async function onSubmit() {
  error.value = '';
   await auth.refreshUser();
  if (!perm.canBulkChangeResponsible.value) { error.value = 'Нет прав на смену ответственного'; return; }

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

    close();                       // ← вместо ui.close(): снимает локи
    pip.clearSelection();
    await pip.loadPaged();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка';
  } finally {
    saving.value = false;
  }
}

function close() {
  if (_lockedIds.length > 0) {
    bulkApi.bulkUnlock(_lockedIds).catch(() => {});
    _lockedIds = [];
  }
  ui.close();
}

onUnmounted(() => {
  if (_lockedIds.length > 0) {
    bulkApi.bulkUnlock(_lockedIds).catch(() => {});
    _lockedIds = [];
  }
});
</script>
