<template>
  <AppModal :visible="ui.activeModal === 'bulkDelete'" @close="close">
    <h2><i class="fa-solid fa-trash"></i> Удаление оборудования</h2>

    <div class="danger-block" style="margin-bottom:16px;">
      <strong>Выбрано: {{ ids.length }} единиц</strong><br>
      Действие <strong>необратимо</strong>. История поверок будет удалена.
    </div>

    <div v-if="loading" style="text-align:center;padding:30px;color:#94a3b8;">
      <i class="fa-solid fa-spinner fa-spin"></i> Проверка...
    </div>

    <div v-else>
      <div v-if="deletable.length > 0" style="margin-bottom:16px;">
        <div style="font-weight:600;color:#16a34a;margin-bottom:6px;font-size:.9rem;">
          <i class="fa-solid fa-check"></i> Будет удалено ({{ deletable.length }})
        </div>
        <div style="max-height:150px;overflow-y:auto;padding:8px;background:#f0fdf4;border-radius:8px;font-size:.85rem;">
          <div v-for="id in deletable" :key="id" style="padding:3px 0;"><strong>{{ id }}</strong></div>
        </div>
      </div>

      <div v-if="skipped.length > 0" style="margin-bottom:16px;">
        <div style="font-weight:600;color:#dc2626;margin-bottom:6px;font-size:.9rem;">
          <i class="fa-solid fa-triangle-exclamation"></i> Не будет удалено ({{ skipped.length }})
        </div>
        <div style="max-height:200px;overflow-y:auto;padding:8px;background:#fee2e2;border-radius:8px;font-size:.82rem;">
          <div v-for="s in skipped" :key="s.id" style="padding:3px 0;"><strong>{{ s.id }}</strong> — {{ s.reason }}</div>
        </div>
      </div>

      <div v-if="notFound.length > 0" style="margin-bottom:16px;">
        <div style="padding:8px;background:#f8fafc;border-radius:8px;font-size:.82rem;color:#64748b;">
          Не найдено: {{ notFound.join(', ') }}
        </div>
      </div>

      <div v-if="deletable.length === 0" class="warning-block">
        Нет единиц для удаления.
      </div>

      <div v-if="error" class="auth-error" style="visibility:visible;opacity:1;margin-top:12px;">{{ error }}</div>
    </div>

    <div class="form-actions" style="margin-top:20px;">
      <button type="button" class="btn btn-secondary" @click="close">Отмена</button>
      <button
        v-if="!loading && deletable.length > 0"
        type="button"
        class="btn btn-danger"
        :disabled="saving"
        @click="onDelete"
      >
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-trash'"></i>
        {{ saving ? 'Удаление...' : `Удалить ${deletable.length}` }}
      </button>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { usePipettesStore } from '@/stores/pipettes';
import { useStatsStore } from '@/stores/stats';
import { useToastStore } from '@/stores/toast';
import { showConfirm } from '@/composables/useConfirm';
import * as api from '@/api/pipettes';
import * as bulkApi from '@/api/bulk';

const ui = useUiStore();
const pip = usePipettesStore();
const stats = useStatsStore();
const toast = useToastStore();

const ids = ref<string[]>([]);
const deletable = ref<string[]>([]);
const skipped = ref<{ id: string; reason: string }[]>([]);
const notFound = ref<string[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');

const precheck = computed(() => {
  const del: string[] = [];
  const skip: { id: string; reason: string }[] = [];
  for (const id of ids.value) {
    const p = pip.items.find(x => x.id === id);
    if (!p) { skip.push({ id, reason: 'не найдено' }); continue; }
    if (p.sent_for_calibration) { skip.push({ id, reason: `на поверке с ${String(p.sent_for_calibration).slice(0, 10)}` }); continue; }
    if (p.replacing) { skip.push({ id, reason: `заменяет ${p.replacing}` }); continue; }
    del.push(id);
  }
  return { del, skip };
});

watch(() => ui.activeModal, async (v) => {
  if (v !== 'bulkDelete') return;
  ids.value = (ui.modalData as string[]) || [];
  error.value = '';
  loading.value = false;
  saving.value = false;
  deletable.value = precheck.value.del;
  skipped.value = precheck.value.skip;
  notFound.value = [];
  await verifyOnServer();
});

async function verifyOnServer() {
  loading.value = true;
  try {
    const res = await api.getByIds(ids.value);
    const freshItems = res.items || [];
    const freshIds = new Set(freshItems.map(p => p.id));
    const del: string[] = [];
    const skip: { id: string; reason: string }[] = [];
    const nf: string[] = [];
    for (const id of ids.value) {
      if (!freshIds.has(id)) { nf.push(id); continue; }
      const p = freshItems.find(x => x.id === id)!;
      if (p.sent_for_calibration) { skip.push({ id, reason: `на поверке с ${String(p.sent_for_calibration).slice(0, 10)}` }); continue; }
      if (p.replacing) { skip.push({ id, reason: `заменяет ${p.replacing}` }); continue; }
      del.push(id);
    }
    deletable.value = del;
    skipped.value = skip;
    notFound.value = nf;
  } catch (e) {
    console.warn('[BulkDeleteModal] verify failed:', e);
  } finally {
    loading.value = false;
  }
}

async function onDelete() {
  if (deletable.value.length === 0) return;
  const ok = await showConfirm(
    `Удалить ${deletable.value.length} единиц?\n\nДействие необратимо.`,
    { icon: '<i class="fa-solid fa-trash" style="color:#dc2626;"></i>', title: 'Массовое удаление', okText: 'Удалить', okClass: 'btn-danger' }
  );
  if (!ok) return;

  saving.value = true;
  error.value = '';
  try {
    const res = await bulkApi.bulkDelete(deletable.value);
    let msg = `Удалено: ${res.successful}`;
    if (res.skipped > 0) msg += `. Пропущено: ${res.skipped}`;
    toast.success(msg);
    close();
    pip.clearSelection();
    await pip.loadPaged();
    await stats.load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка';
  } finally {
    saving.value = false;
  }
}

function close() {
  ids.value = [];
  deletable.value = [];
  skipped.value = [];
  notFound.value = [];
  ui.close();
}
</script>
