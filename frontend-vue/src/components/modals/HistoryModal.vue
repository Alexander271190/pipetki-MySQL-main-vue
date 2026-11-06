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
    </template>

    <div class="form-actions">
      <button type="button" class="btn btn-warning" @click="onExportHistory">
        <i class="fa-solid fa-print"></i> Печать истории
     </button>
     <button type="button" class="btn btn-secondary" @click="close">Закрыть</button>
   </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { useUiStore } from '@/stores/ui';
import { usePipettesStore } from '@/stores/pipettes';
import { useToastStore } from '@/stores/toast';
import { calcStatus, getNextDate } from '@/utils/status';
import { formatDate } from '@/utils/format';
import { RESULT_LABELS } from '@/constants';
import type { Pipette } from '@/types';
import * as api from '@/api/pipettes';
import type { CalibrationRecord } from '@/api/pipettes';
import { useSettingsStore } from '@/stores/settings';
const settings = useSettingsStore();

const ui = useUiStore();
const pip = usePipettesStore();
const toast = useToastStore();

const pipette = ref<Pipette | null>(null);
const history = ref<CalibrationRecord[]>([]);
const loading = ref(false);

watch(() => ui.activeModal, async (v) => {
  if (v !== 'history') return;
  const id = ui.modalData as string;
  pipette.value = pip.items.find(x => x.id === id) || null;
  if (!pipette.value) { toast.error('Прибор не найден'); ui.close(); return; }

  loading.value = true;
  try {
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

function close() { ui.close(); }

function onExportHistory() {
  if (!pipette.value) return;
  if (settings.printDocs?.history === false) {
    toast.error('Печать истории отключена');
    return;
  }
  ui.open('historyExport', pipette.value.id);
}
  
</script>
