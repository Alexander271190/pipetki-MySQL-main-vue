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
import { showConfirm } from '@/composables/useConfirm';
import { showLockWarning } from '@/composables/useLockWarning';
import { todayStr } from '@/utils/format';
import { getDeviceIdentityHtml } from '@/utils/deviceIdentity';
import * as api from '@/api/pipettes';
import type { Pipette } from '@/types';

const ui = useUiStore();
const pip = usePipettesStore();
const stats = useStatsStore();
const toast = useToastStore();

const pipette = ref<Pipette | null>(null);
const form = ref({ date: '', cert: '', result: 'pass', org: '', note: '' });
const saving = ref(false);
const error = ref('');

let _heartbeat: number | null = null;
let _skipUnlock = false;
let _lockedId: string | null = null;

const identityHtml = computed(() => pipette.value ? getDeviceIdentityHtml(pipette.value) : '');

watch(() => ui.activeModal, (v) => {
  if (v === 'quickCal') open();
});

async function open() {
  // Сброс состояния прошлой сессии
  if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
  _skipUnlock = false;
  _lockedId = null;
  error.value = '';
  saving.value = false;
  pipette.value = null;

  const id = ui.modalData as string;

  // 1. Захват лока (с предупреждением, если занят)
  try {
    const lockRes = await api.getLock(id);
    if (lockRes.locked && !lockRes.mine) {
      const proceed = await showLockWarning(lockRes, 'Быстрая поверка');
      if (!proceed) { ui.close(); return; }
    }
    await api.setLock(id);
    _lockedId = id;
  } catch {
    toast.error('Ошибка проверки блокировки');
    ui.close();
    return;
  }

  // 2. Свежие данные прибора (не из кэша стора — другой юзер мог изменить)
  try {
    const fresh = await api.getById(id);
    pipette.value = fresh as Pipette;
  } catch {
    pipette.value = pip.items.find(x => x.id === id) || null;
  }
  if (!pipette.value) {
    toast.error('Прибор не найден');
    await close();   // releaseLock не нужен — _lockedId ещё наш, close снимет
    return;
  }

  // 3. Сброс формы
  form.value = { date: todayStr(), cert: '', result: 'pass', org: '', note: '' };

  // 4. Heartbeat — каждые 3 сек проверяем, наш ли лок
  _heartbeat = window.setInterval(async () => {
    if (!pipette.value) return;
    try {
      const r = await api.getLock(pipette.value.id);
      if (!r.locked || !r.mine) {
        if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
        _skipUnlock = true;   // лок уже не наш — release не нужен

        // Автосохранение: если форма валидна — пишем поверку
        let saved = false;
        if (form.value.date && form.value.date <= todayStr()) {
          try {
            await api.addCalibration(pipette.value.id, form.value);
            saved = true;
          } catch { /* ignore */ }
        }

        ui.close();

        const msg = saved
          ? `Сессия завершена. Ваша поверка сохранена.\n\nПрибор забрал ${r.lockedBy || 'другой пользователь'}.`
          : `Сессия завершена. Прибор забрал ${r.lockedBy || 'другой пользователь'}.`;
        await showConfirm(msg, {
          icon: 'ℹ️', title: 'Сессия завершена',
          okText: 'ОК', hideCancel: true, okClass: 'btn-secondary',
        });
      }
    } catch { /* ignore */ }
  }, 3000);
}

async function onSubmit() {
  error.value = '';
  if (!form.value.date) { error.value = 'Заполните дату'; return; }
  if (form.value.date > todayStr()) { error.value = 'Дата не может быть в будущем'; return; }
  if (!pipette.value) { error.value = 'Прибор не найден'; return; }

  saving.value = true;
  try {
    await api.addCalibration(pipette.value.id, form.value);
    toast.success('Поверка зарегистрирована');
    await close();          // releaseLock + ui.close()
    await pip.loadPaged();
    await stats.load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

async function close() {
  if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
  if (_lockedId && !_skipUnlock) {
    try { await api.releaseLock(_lockedId); } catch { /* ignore */ }
  }
  _lockedId = null;
  ui.close();
}

onUnmounted(async () => {
  if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
  if (_lockedId && !_skipUnlock) {
    try { await api.releaseLock(_lockedId); } catch { /* ignore */ }
  }
  _lockedId = null;
});
</script>
