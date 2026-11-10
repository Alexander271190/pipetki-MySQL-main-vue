<template>
  <AppModal :visible="ui.activeModal === 'history'" @close="close" modal-class="modal-lg">
    <h2><i class="fa-solid fa-clock-rotate-left"></i> История поверок — {{ pipette?.id }}</h2>

    <div v-if="loading" style="text-align:center;padding:30px;">
      <i class="fa-solid fa-spinner fa-spin"></i>
    </div>

    <template v-else-if="pipette">
      <div class="info-grid">
        <div><label>Модель</label><span>{{ pipette.model }}{{ pipette.manufacturer ? ' (' + pipette.manufacturer + ')' : '' }}</span></div>
        <div><label>Серийный номер</label><span>{{ pipette.serial || '—' }}</span></div>
        <div><label>Объём</label><span>{{ pipette.volume ? pipette.volume + ' мкл' : '—' }}</span></div>
        <div><label>Отдел</label><span>{{ pipette.department || '—' }}</span></div>
        <div><label>МПИ</label><span>{{ pipette.interval }} мес.</span></div>
        <div><label>Последняя поверка</label><span>{{ formatDate(pipette.last_calibration) }}</span></div>
        <div><label>Следующая поверка</label><span>{{ formatDate(getNextDate(pipette)) }}</span></div>
        <div><label>Статус</label><span><StatusBadge :status="calcStatus(pipette)" /></span></div>
        <div><label>Ответственный</label><span>{{ pipette.responsible || '—' }}</span></div>
        <div><label>Место</label><span>{{ pipette.location || '—' }}</span></div>
      </div>

      <h3 style="margin-top:20px;font-size:1rem;color:#1e293b;">Журнал поверок ({{ history.length }})</h3>
      <div v-if="history.length === 0" style="text-align:center;padding:30px;color:#94a3b8;">
        Записей о поверках пока нет.
      </div>
      <div v-else class="timeline" style="position:relative;padding-left:28px;margin-top:15px;">
        <div
          v-for="h in history"
          :key="h.id"
          class="timeline-item"
          :class="h.result === 'fail' ? 'danger' : (h.result === 'wip' ? 'warn' : '')"
          style="position:relative;padding-bottom:20px;border-left:2px solid #e2e8f0;padding-left:20px;"
        >
          <div class="text-strong-sm">{{ formatDate(h.date) }}</div>
          <div v-if="h.cert" class="badge-cert"><i class="fa-solid fa-file-lines"></i> Свидетельство № {{ h.cert }}</div>
          <span
            class="badge-result"
            :class="h.result === 'pass' ? 'badge-result-pass' : h.result === 'fail' ? 'badge-result-fail' : 'badge-result-wip'"
          >{{ RESULT_LABELS[h.result] || h.result }}</span>
          <div v-if="h.org" class="text-muted-sm" style="margin-top:4px;">Организация: {{ h.org }}</div>
          <div v-if="h.note" class="text-muted-sm" style="margin-top:4px;">{{ h.note }}</div>
        </div>
      </div>

      <!-- Кнопка «Добавить поверку» (Пункт 5.4 — toggleCalForm) -->
      <div style="margin-top:16px;text-align:right;">
        <button
          v-if="canManagePipettes"
          type="button"
          class="btn btn-info"
          @click="toggleCalForm"
        >
          <i class="fa-solid fa-plus"></i> {{ showCalForm ? 'Скрыть форму' : 'Добавить поверку' }}
        </button>
      </div>

      <!-- Форма добавления поверки -->
      <div v-if="showCalForm" style="margin-top:16px;padding-top:16px;border-top:2px solid #e2e8f0;">
        <h3 style="margin-bottom:15px;font-size:1rem;color:#1e293b;">Новая запись о поверке</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Дата поверки *</label>
            <input v-model="calForm.date" type="date" />
          </div>
          <div class="form-group">
            <label>Номер свидетельства</label>
            <input v-model="calForm.cert" type="text" placeholder="напр. С-АБ-1234567/2025" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Результат</label>
            <select v-model="calForm.result">
              <option value="pass">Годен</option>
              <option value="fail">Брак</option>
              <option value="wip">В процессе</option>
            </select>
          </div>
          <div class="form-group">
            <label>Поверяющая организация</label>
            <input v-model="calForm.org" type="text" placeholder="напр. ФБУ «Красноярский ЦСМ»" />
          </div>
        </div>
        <div class="form-group">
          <label>Примечание</label>
          <textarea v-model="calForm.note" rows="2"></textarea>
        </div>
        <div v-if="calError" class="auth-error" style="visibility:visible;opacity:1;">{{ calError }}</div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="toggleCalForm">Отмена</button>
          <button type="button" class="btn btn-success" :disabled="calSaving" @click="addCalibration">
            <i class="fa-solid" :class="calSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
            Записать
          </button>
        </div>
      </div>
    </template>

    <div class="form-actions">
      <button
        v-if="settings.printDocs?.history !== false"
        type="button"
        class="btn btn-warning"
        @click="onExportHistory"
      >
        <i class="fa-solid fa-print"></i> Печать истории
      </button>
      <button type="button" class="btn btn-secondary" @click="close">Закрыть</button>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { useUiStore } from '@/stores/ui';
import { usePipettesStore } from '@/stores/pipettes';
import { useStatsStore } from '@/stores/stats';
import { useToastStore } from '@/stores/toast';
import { useSettingsStore } from '@/stores/settings';
import { useAuthStore, usePermissions } from '@/stores/auth';
import { calcStatus, getNextDate } from '@/utils/status';
import { formatDate, todayStr } from '@/utils/format';
import { RESULT_LABELS } from '@/constants';
import type { Pipette } from '@/types';
import * as api from '@/api/pipettes';
import type { CalibrationRecord } from '@/api/pipettes';
import { showLockWarning } from '@/composables/useLockWarning';
import { showConfirm } from '@/composables/useConfirm';

const auth = useAuthStore();
const perm = usePermissions();
const ui = useUiStore();
const pip = usePipettesStore();
const stats = useStatsStore();
const toast = useToastStore();
const settings = useSettingsStore();

const canManagePipettes = perm.canManagePipettes;

const pipette = ref<Pipette | null>(null);
const history = ref<CalibrationRecord[]>([]);
const loading = ref(false);

const showCalForm = ref(false);
const calForm = ref({ date: '', cert: '', result: 'pass', org: '', note: '' });
const calSaving = ref(false);
const calError = ref('');


let _calLockId: string | null = null;
let _skipCalUnlock = false;


async function acquireCalLock(id: string): Promise<boolean> {
  try {
    const lockRes = await api.getLock(id);
    if (lockRes.locked && !lockRes.mine) {
      const proceed = await showLockWarning(lockRes, 'Добавление поверки');
      if (!proceed) return false;
    }
    await api.setLock(id);
    _calLockId = id;
    return true;
  } catch {
    toast.error('Ошибка проверки блокировки');
    return false;
  }
}

async function releaseCalLock() {
  if (_calLockId && !_skipCalUnlock) {
    try { await api.releaseLock(_calLockId); } catch { /* ignore */ }
  }
  _calLockId = null;
  _skipCalUnlock = false;
}


async function toggleCalForm() {
  if (showCalForm.value) {
    await releaseCalLock();
    showCalForm.value = false;
  } else {
    await auth.refreshUser();
    if (!perm.canManagePipettes.value) {
      toast.error('Нет прав на добавление поверки');
      return;
    }
    if (!pipette.value) return;
    const ok = await acquireCalLock(pipette.value.id);
    if (!ok) return;
    showCalForm.value = true;
    calForm.value = { date: todayStr(), cert: '', result: 'pass', org: '', note: '' };
  }
}

watch(() => ui.activeModal, async (v) => {
  if (v !== 'history') return;
  const id = ui.modalData as string;

  showCalForm.value = false;
  calError.value = '';
  loading.value = true;

  try {
    pipette.value = await pip.fetchOne(id);
    if (!pipette.value) {
      toast.error('Прибор не найден');
      ui.close();
      return;
    }
    const h = await api.getCalibrationHistory(id);
    history.value = (h || []).sort((a, b) => {
      const c = String(b.date).localeCompare(String(a.date));
      return c !== 0 ? c : (b.id || 0) - (a.id || 0);
    });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка загрузки истории');
    history.value = [];
  } finally {
    loading.value = false;
  }
});


function close() {
  void releaseCalLock();
  ui.close();
}

function onExportHistory() {
  if (!pipette.value) return;
  if (!perm.canExport.value) { toast.error('Нет прав на печать'); return; }
  if (settings.printDocs?.history === false) {
    toast.error('Печать истории отключена');
    return;
  }
  ui.open('historyExport', pipette.value.id);
}


async function addCalibration() {
  calError.value = '';
  if (!pipette.value) return;

  await auth.refreshUser();
  if (!perm.canManagePipettes.value) { calError.value = 'Нет прав'; return; }


  if (!_calLockId) {
    const ok = await acquireCalLock(pipette.value.id);
    if (!ok) return;
  }

  if (!calForm.value.date) { calError.value = 'Заполните дату поверки'; return; }
  if (calForm.value.date > todayStr()) { calError.value = 'Дата не может быть в будущем'; return; }

  calSaving.value = true;
  try {
    await api.addCalibration(pipette.value.id, calForm.value);

    toast.success('Запись о поверке добавлена');
    
    showCalForm.value = false;
    await releaseCalLock();

    const h = await api.getCalibrationHistory(pipette.value.id);
    history.value = (h || []).sort((a, b) => {
      const c = String(b.date).localeCompare(String(a.date));
      return c !== 0 ? c : (b.id || 0) - (a.id || 0);
    });

    await pip.loadPaged();
    await stats.load();
    const fresh = await pip.fetchOne(pipette.value.id);
    if (fresh) pipette.value = fresh;
  } catch (e) {
    calError.value = e instanceof Error ? e.message : 'Ошибка сохранения';
  } finally {
    calSaving.value = false;
  }
}


onUnmounted(() => {
  if (_calLockId) {
    void api.releaseLock(_calLockId).catch(() => {});
    _calLockId = null;
  }
});
</script>
