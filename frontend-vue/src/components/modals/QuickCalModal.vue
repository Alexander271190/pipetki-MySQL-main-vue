<template>
  <AppModal :visible="ui.activeModal === 'quickCal'" @close="close">
    <h2><i class="fa-solid fa-clipboard-list"></i> Быстрая поверка</h2>
    <div v-if="pipette" v-html="identityHtml" style="margin-bottom:15px;padding:10px;background:#f8fafc;border-radius:8px;"></div>

    <form @submit.prevent="onSubmit">
      <div class="form-row">
        <div class="form-group">
          <label>Дата поверки *</label>
          <input v-model="form.date" type="date" required />
        </div>
        <div class="form-group">
          <label>Номер свидетельства</label>
          <input v-model="form.cert" type="text" placeholder="напр. С-АБ-1234567/2025" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Результат</label>
          <select v-model="form.result">
            <option value="pass">Годен</option>
            <option value="fail">Брак</option>
            <option value="wip">В процессе</option>
          </select>
        </div>
        <div class="form-group">
          <label>Поверяющая организация</label>
          <input v-model="form.org" type="text" placeholder="напр. ФБУ «Красноярский ЦСМ»" />
        </div>
      </div>
      <div class="form-group">
        <label>Примечание</label>
        <textarea v-model="form.note" rows="2"></textarea>
      </div>
      <div v-if="error" class="auth-error" style="visibility:visible;opacity:1;">{{ error }}</div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="close">Отмена</button>
        <button type="submit" class="btn btn-success" :disabled="saving">
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
          Записать
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
import { useStatsStore } from '@/stores/stats';
import { useToastStore } from '@/stores/toast';
import { useAuthStore, usePermissions } from '@/stores/auth';
import { showConfirm } from '@/composables/useConfirm';
import { showLockWarning } from '@/composables/useLockWarning';
import { todayStr } from '@/utils/format';
import { getDeviceIdentityHtml } from '@/utils/deviceIdentity';
import * as api from '@/api/pipettes';
import type { Pipette } from '@/types';
import { useIdleLock } from '@/composables/useIdleLock';

const ui = useUiStore();
const pip = usePipettesStore();
const stats = useStatsStore();
const toast = useToastStore();
const auth = useAuthStore();
const perm = usePermissions();
const pipette = ref<Pipette | null>(null);
const form = ref({ date: '', cert: '', result: 'pass', org: '', note: '' });
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

  let saved = false;
  if (form.value.date && form.value.date <= todayStr()) {
    try {
      await api.addCalibration(id, form.value);
      saved = true;
    } catch (e) { console.warn('Автосохранение поверки (idle):', e); }
  }

  try {
    await api.releaseLock(id);
    _skipUnlock = true;
  } catch (e) { console.warn('releaseLock при idle:', e); }

  _lockedId = null;
  ui.close();

  toast.warn(
    saved
      ? 'Модалка закрыта из-за 30 минут бездействия. Поверка сохранена.'
      : 'Модалка закрыта из-за 30 минут бездействия.'
  );

  if (saved) {
    await pip.loadPaged();
    await stats.load();
  }
}

const idle = useIdleLock(_handleIdleTimeout);

const identityHtml = computed(() => pipette.value ? getDeviceIdentityHtml(pipette.value) : '');

watch(() => ui.activeModal, (v) => {
  if (v === 'quickCal') open();
});

async function open() {
  idle.stop();
  if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
  _skipUnlock = false;
  _lockedId = null;
  error.value = '';
  saving.value = false;
  pipette.value = null;

  const id = ui.modalData as string;

  try {
    const lockRes = await api.getLock(id);
    if (lockRes.locked && !lockRes.mine) {
      const proceed = await showLockWarning(lockRes, 'Быстрая поверка');
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

  form.value = { date: todayStr(), cert: '', result: 'pass', org: '', note: '' };

  // ── Heartbeat с модалкой OK ─────────────────
  _heartbeat = window.setInterval(async () => {
    if (!pipette.value) return;
    try {
      const r = await api.getLock(pipette.value.id);
      if (!r.locked || !r.mine) {
        if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
        idle.stop();
        _skipUnlock = true;

        const id = pipette.value.id;

        // 1. Пытаемся сохранить поверку (если форма валидна)
        let saved = false;
        let savedError = '';
        if (form.value.date && form.value.date <= todayStr()) {
          try {
            await api.addCalibration(id, form.value);
            saved = true;
          } catch (e: any) {
            savedError = e?.message || 'ошибка сохранения';
          }
        } else {
          savedError = 'не заполнена дата поверки';
        }

        // 2. Закрываем модалку
        _lockedId = null;
        ui.close();

        // 3. Формируем сообщение
        const name = r.lockedBy || '';
        const pos = r.lockedByPosition;
        const displayUser = pos ? `${name} (${pos})` : (name || 'другой пользователь');

        let title: string;
        let icon: string;
        let message: string;

        if (saved) {
          title = 'Сессия завершена';
          icon = '<i class="fa-solid fa-circle-info" style="color: #0ea5e9;"></i>';
          message = `Ваша поверка была автоматически сохранена.\n\nПрибор забрал в работу: ${displayUser}.`;
        } else {
          title = 'Сессия завершена — поверка не сохранена';
          icon = '<i class="fa-solid fa-triangle-exclamation" style="color: #d97706;"></i>';
          message = `Не удалось сохранить поверку: ${savedError}.\n\nПрибор забрал в работу: ${displayUser}.`;
        }

        // 4. Тост
        toast.warn(saved
          ? 'Сессия завершена. Поверка сохранена.'
          : 'Сессия завершена. Поверка не сохранена.');

        // 5. Обновляем таблицу и статистику
        if (saved) {
          await pip.loadPaged();
          await stats.load();
        }

        // 6. Модалка OK
        try {
          await showConfirm(message, {
            icon, title, okText: 'ОК', hideCancel: true, okClass: 'btn-secondary',
          });
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }, 3000);
}

async function onSubmit() {
  error.value = '';
  await auth.refreshUser();
  if (!perm.canQuickCal.value) { error.value = 'Нет прав на поверку'; return; }

  if (!form.value.date) { error.value = 'Заполните дату'; return; }
  if (form.value.date > todayStr()) { error.value = 'Дата не может быть в будущем'; return; }
  if (!pipette.value) { error.value = 'Прибор не найден'; return; }
  saving.value = true;
  try {
    await api.addCalibration(pipette.value.id, form.value);
    toast.success('Поверка зарегистрирована');
    await close();
    await pip.loadPaged();
    await stats.load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка сохранения';
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
