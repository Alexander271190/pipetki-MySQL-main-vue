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
import { showConfirm } from '@/composables/useConfirm';
import { showLockWarning } from '@/composables/useLockWarning';
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

let _heartbeat: number | null = null;
let _skipUnlock = false;
let _lockedId: string | null = null;

// ⏱ Idle timeout: 30 минут бездействия → releaseLock + закрытие
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
let _idleStart = 0;
let _idleCheckTimer: number | null = null;
let _activityListenersAttached = false;

function _onUserActivity() {
  _idleStart = Date.now();
}

function _startIdleTracking() {
  _idleStart = Date.now();
  if (_idleCheckTimer) return;

  _idleCheckTimer = window.setInterval(() => {
    if (!_idleStart) return;
    if (Date.now() - _idleStart >= IDLE_TIMEOUT_MS) {
      _handleIdleTimeout();
    }
  }, 60 * 1000);

  if (!_activityListenersAttached) {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'input'];
    events.forEach(ev =>
      document.addEventListener(ev, _onUserActivity, { passive: true })
    );
    _activityListenersAttached = true;
  }
}

function _stopIdleTracking() {
  if (_idleCheckTimer) { clearInterval(_idleCheckTimer); _idleCheckTimer = null; }
  if (_activityListenersAttached) {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'input'];
    events.forEach(ev =>
      document.removeEventListener(ev, _onUserActivity)
    );
    _activityListenersAttached = false;
  }
  _idleStart = 0;
}

async function _handleIdleTimeout() {
  if (!_lockedId || !_idleStart) return;

  if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
  _stopIdleTracking();

  const id = _lockedId;
  _skipUnlock = true;

  try {
    await api.releaseLock(id);
  } catch (e) { console.warn('releaseLock при idle:', e); }

  _lockedId = null;
  ui.close();

  toast.warn('Модалка закрыта из-за 30 минут бездействия. Передача не выполнена.');
}

const availableDepts = computed(() => {
  return settings.departments.filter(d => d !== (pipette.value?.department || ''));
});

watch(() => ui.activeModal, (v) => {
  if (v === 'transfer') open();
});

async function open() {
  _stopIdleTracking();
  // Сброс состояния прошлой сессии
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

  // 1. Захват лока (с предупреждением, если занят)
  try {
    const lockRes = await api.getLock(id);
    if (lockRes.locked && !lockRes.mine) {
      const proceed = await showLockWarning(lockRes, 'Передача');
      if (!proceed) { ui.close(); return; }
    }
    await api.setLock(id);
    _lockedId = id;
    _startIdleTracking();
  } catch {
    toast.error('Ошибка проверки блокировки');
    ui.close();
    return;
  }

  // 2. Свежие данные прибора (fetchOne идёт в API, если нет в сторе)
  pipette.value = await pip.fetchOne(id);
  if (!pipette.value) {
    toast.error('Прибор не найден');
    await close();
    return;
  }

  // 3. Heartbeat — каждые 3 сек проверяем, наш ли лок
  _heartbeat = window.setInterval(async () => {
    if (!pipette.value) return;
    try {
      const r = await api.getLock(pipette.value.id);
      if (!r.locked || !r.mine) {
        if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
        _stopIdleTracking();
        _skipUnlock = true;

        _lockedId = null;
        ui.close();

        await showConfirm(
          `Сессия завершена. Прибор забрал ${r.lockedBy || 'другой пользователь'}.\n\nПередача не выполнена.`,
          {
            icon: 'ℹ️', title: 'Сессия завершена',
            okText: 'ОК', hideCancel: true, okClass: 'btn-secondary',
          }
        );
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
    await close();   // releaseLock + ui.close()
    await pip.loadPaged();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка передачи';
  } finally {
    saving.value = false;
  }
}

async function close() {
  _stopIdleTracking();
  if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
  if (_lockedId && !_skipUnlock) {
    try { await api.releaseLock(_lockedId); } catch { /* ignore */ }
  }
  _lockedId = null;
  ui.close();
}

onUnmounted(async () => {
  _stopIdleTracking();
  if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
  if (_lockedId && !_skipUnlock) {
    try { await api.releaseLock(_lockedId); } catch { /* ignore */ }
  }
  _lockedId = null;
});
</script>
