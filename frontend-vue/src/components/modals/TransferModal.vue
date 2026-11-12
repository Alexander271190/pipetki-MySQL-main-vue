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
import { ref, computed, watch, onUnmounted } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { usePipettesStore } from '@/stores/pipettes';
import { useToastStore } from '@/stores/toast';
import { useAuthStore, usePermissions } from '@/stores/auth';
import { showConfirm } from '@/composables/useConfirm';
import { showLockWarning } from '@/composables/useLockWarning';
import { apiRequest } from '@/api/client';
import * as api from '@/api/pipettes';
import type { Pipette } from '@/types';
import { useIdleLock } from '@/composables/useIdleLock';

const ui = useUiStore();
const settings = useSettingsStore();
const pip = usePipettesStore();
const toast = useToastStore();
const auth = useAuthStore();
const perm = usePermissions();
const pipette = ref<Pipette | null>(null);
const newDept = ref('');
const newResp = ref('');
const responsiblesInDept = ref<string[]>([]);
const saving = ref(false);
const error = ref('');

let _heartbeat: number | null = null;
let _skipUnlock = false;
let _lockedId: string | null = null;

async function _handleIdleTimeout() {
  if (!_lockedId) return;

  if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
  // idle.stop() уже вызван внутри useIdleLock перед onTimeout — вручную не надо

  const id = _lockedId;

  try {
    await api.releaseLock(id);
    _skipUnlock = true;
  } catch (e) { console.warn('releaseLock при idle:', e); }

  _lockedId = null;
  ui.close();

  toast.warn('Модалка закрыта из-за 30 минут бездействия. Передача не выполнена.');
}

const idle = useIdleLock(_handleIdleTimeout);

const availableDepts = computed(() => {
  return settings.departments.filter(d => d !== (pipette.value?.department || ''));
});

watch(() => ui.activeModal, (v) => {
  if (v === 'transfer') open();
});

async function open() {
  idle.stop();
  if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
  _skipUnlock = false;
  _lockedId = null;
  error.value = '';
  saving.value = false;
  pipette.value = null;
  newDept.value = '';
  newResp.value = '';
  responsiblesInDept.value = [];

  const id = ui.modalData as string;

  try {
    const lockRes = await api.getLock(id);
    if (lockRes.locked && !lockRes.mine) {
      const proceed = await showLockWarning(lockRes, 'Передача');
      if (!proceed) { ui.close(); return; }
    }
    await api.setLock(id);
    _lockedId = id;
    idle.start();
  } catch {
    toast.error('Ошибка проверки блокировки');
    ui.close();
    return;
  }

  pipette.value = await pip.fetchOne(id);
  if (!pipette.value) {
    toast.error('Прибор не найден');
    await close();
    return;
  }

  // ── Heartbeat с модалкой OK ─────────────────
  _heartbeat = window.setInterval(async () => {
    if (!pipette.value) return;
    try {
      const r = await api.getLock(pipette.value.id);
      if (!r.locked || !r.mine) {
        if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
        idle.stop();
        _skipUnlock = true;

        _lockedId = null;
        ui.close();

        const name = r.lockedBy || '';
        const pos = r.lockedByPosition;
        const displayUser = pos ? `${name} (${pos})` : (name || 'другой пользователь');

        toast.warn(`Сессия завершена. Прибор забрал ${displayUser}.`);

        try {
          await showConfirm(
            `Сессия завершена. Прибор забрал в работу: ${displayUser}.\n\nПередача не выполнена.`,
            {
              icon: '<i class="fa-solid fa-circle-info" style="color: #0ea5e9;"></i>',
              title: 'Сессия завершена',
              okText: 'ОК',
              hideCancel: true,
              okClass: 'btn-secondary',
            }
          );
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }, 3000);
}

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
  } catch {
    toast.error('Не удалось загрузить список');
  }
}

async function onSubmit() {
  error.value = '';
  await auth.refreshUser();
  if (!perm.canTransferPipette.value) { error.value = 'Нет прав на передачу'; return; }

  if (!newDept.value) { error.value = 'Выберите отдел'; return; }
  if (!newResp.value) { error.value = 'Выберите ответственного'; return; }
  if (!pipette.value) { error.value = 'Прибор не найден'; return; }

  const ok = await showConfirm(
    `Передать «${pipette.value.id}» из «${pipette.value.department || 'без отдела'}» в «${newDept.value}»?\n\nОтветственный: ${newResp.value}.`,
    { icon: '🔀', title: 'Передача в другой отдел', okText: 'Передать', okClass: 'btn-primary' }
  );
  if (!ok) return;

  saving.value = true;
  try {
    await api.transferPipette(pipette.value.id, newDept.value, newResp.value);
    toast.success(`Передано в «${newDept.value}»`);
    await close();
    await pip.loadPaged();
  } catch (e: any) {
  if (e?.status === 409) {
    _skipUnlock = true;
    _lockedId = null;
  }
  error.value = e instanceof Error ? e.message : 'Ошибка передачи';
  } finally {
    saving.value = false;
  }
}

async function close() {
  idle.stop();
  if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
  if (_lockedId && !_skipUnlock) {
    try { await api.releaseLock(_lockedId); } catch { /* ignore */ }
  }
  _lockedId = null;
  ui.close();
}

onUnmounted(async () => {
  idle.stop();
  if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
  if (_lockedId && !_skipUnlock) {
    try { await api.releaseLock(_lockedId); } catch { /* ignore */ }
  }
  _lockedId = null;
});
</script>
