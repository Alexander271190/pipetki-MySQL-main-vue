<template>
  <AppModal :visible="ui.activeModal === 'transfer'" @close="close">
    <h2><i class="fa-solid fa-right-left"></i> Передача в другой отдел</h2>
    <div v-if="pipette" style="margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:8px;font-size:.9rem;">
      <strong>{{ pipette.id }}</strong> — {{ pipette.model }}<br>
      <small style="color:#64748b;">Текущий отдел: {{ pipette.department || 'без отдела' }}</small>
    </div>

    <form @submit.prevent="onSubmit">
      <div class="form-group">
        <label>Новый отдел *</label>
        <select v-model="newDept" @change="onDeptChange">
          <option value="">— выберите отдел —</option>
          <option v-for="d in availableDepts" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>Ответственный в новом отделе *</label>
        <select v-model="newResp" :disabled="!newDept">
          <option value="">— сначала выберите отдел —</option>
          <option v-for="r in responsiblesInDept" :key="r" :value="r">{{ r }}</option>
        </select>
      </div>
      <div class="info-block" style="margin:12px 0;">ℹ️ Вся история поверок сохранится.</div>
      <div v-if="error" class="auth-error" style="visibility:visible;opacity:1;">{{ error }}</div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="close">Отмена</button>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          <i class="fa-solid fa-right-left"></i> Передать
        </button>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { usePipettesStore } from '@/stores/pipettes';
import { useToastStore } from '@/stores/toast';
import { showConfirm } from '@/composables/useConfirm';
import { apiRequest } from '@/api/client';
import * as api from '@/api/pipettes';
import type { Pipette } from '@/types';

const ui = useUiStore();
const settings = useSettingsStore();
const pip = usePipettesStore();
const toast = useToastStore();

const pipette = ref<Pipette | null>(null);
const newDept = ref('');
const newResp = ref('');
const responsiblesInDept = ref<string[]>([]);
const saving = ref(false);
const error = ref('');

const availableDepts = computed(() => {
  return settings.departments.filter(d => d !== (pipette.value?.department || ''));
});

watch(() => ui.activeModal, (v) => {
  if (v !== 'transfer') return;
  const id = ui.modalData as string;
  pipette.value = pip.items.find(x => x.id === id) || null;
  if (!pipette.value) { toast.error('Прибор не найден'); ui.close(); return; }
  newDept.value = '';
  newResp.value = '';
  responsiblesInDept.value = [];
  error.value = '';
});

async function onDeptChange() {
  newResp.value = '';
  if (!newDept.value) { responsiblesInDept.value = []; return; }
  try {
    const users = await apiRequest<{ fullName: string; department?: string }[]>('/users/responsibles');
    responsiblesInDept.value = users
      .filter(u => (u.department || '') === newDept.value)
      .map(u => u.fullName);
    if (responsiblesInDept.value.length === 0) {
      toast.warn('В этом отделе нет сотрудников');
    }
  } catch (e) {
    toast.error('Не удалось загрузить список');
  }
}

async function onSubmit() {
  error.value = '';
  if (!newDept.value) { error.value = 'Выберите отдел'; return; }
  if (!newResp.value) { error.value = 'Выберите ответственного'; return; }
  if (!pipette.value) return;

  const ok = await showConfirm(
    `Передать «${pipette.value.id}» из «${pipette.value.department || 'без отдела'}» в «${newDept.value}»?\n\nОтветственный: ${newResp.value}.`,
    { icon: '🔀', title: 'Передача в другой отдел', okText: 'Передать', okClass: 'btn-primary' }
  );
  if (!ok) return;

  saving.value = true;
  try {
    await api.transferPipette(pipette.value.id, newDept.value, newResp.value);
    toast.success(`Передано в «${newDept.value}»`);
    ui.close();
    await pip.loadPaged();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка передачи';
  } finally {
    saving.value = false;
  }
}

function close() { ui.close(); }
</script>
