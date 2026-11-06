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
import { ref, computed, watch } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { usePipettesStore } from '@/stores/pipettes';
import { useStatsStore } from '@/stores/stats';
import { useToastStore } from '@/stores/toast';
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

const identityHtml = computed(() => pipette.value ? getDeviceIdentityHtml(pipette.value) : '');

watch(() => ui.activeModal, (v) => {
  if (v !== 'quickCal') return;
  const id = ui.modalData as string;
  pipette.value = pip.items.find(x => x.id === id) || null;
  if (!pipette.value) { toast.error('Прибор не найден'); ui.close(); return; }
  form.value = { date: todayStr(), cert: '', result: 'pass', org: '', note: '' };
  error.value = '';
});

async function onSubmit() {
  error.value = '';
  if (!form.value.date) { error.value = 'Заполните дату'; return; }
  if (form.value.date > todayStr()) { error.value = 'Дата не может быть в будущем'; return; }

  saving.value = true;
  try {
    await api.addCalibration(pipette.value!.id, form.value);
    toast.success('Поверка зарегистрирована');
    ui.close();
    await pip.loadPaged();
    await stats.load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

function close() { ui.close(); }
</script>
