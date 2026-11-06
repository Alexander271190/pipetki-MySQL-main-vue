<template>
  <div>
    <h3>Управление отделами</h3>
    <p style="color:#64748b;margin-bottom:12px;">Отделы <strong>не могут дублироваться</strong>.</p>

    <table class="field-settings-table">
      <thead>
        <tr>
          <th style="width:110px;text-align:center;">Активно</th>
          <th style="text-align:center;">Название</th>
          <th style="width:100px;text-align:center;">Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(d, i) in departments" :key="i">
          <td style="text-align:center;"><input v-model="d.enabled" type="checkbox" /></td>
          <td><input v-model="d.name" type="text" @input="checkDuplicate" /></td>
          <td style="text-align:center;">
            <button class="row-actions-btn" @click="openActions($event, i)" title="Действия">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="form-actions" style="margin-top:16px;">
      <input
        v-model="newDeptName"
        type="text"
        placeholder="Название нового отдела"
        style="flex:1;max-width:400px;padding:9px 12px;border:1px solid var(--border-hard);border-radius:8px;background:var(--card);color:var(--text);"
        @keydown.enter.prevent="onAdd"
      />
      <button type="button" class="btn btn-success" @click="onAdd"><i class="fa-solid fa-plus"></i> Добавить</button>
      <button type="button" class="btn btn-secondary" style="margin-left:auto;" @click="$emit('close')">Закрыть</button>
      <button type="button" class="btn btn-primary" :disabled="saving" @click="onSave">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i> Сохранить
      </button>
    </div>

    <div v-if="duplicateWarning" style="margin-top:12px;padding:10px 12px;background:#fee2e2;border-left:3px solid #dc2626;border-radius:6px;color:#991b1b;font-size:.85rem;">
      <i class="fa-solid fa-triangle-exclamation"></i> Отдел «{{ duplicateWarning }}» уже существует.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToastStore } from '@/stores/toast';
import { useSettingsStore } from '@/stores/settings';
import { useUiStore } from '@/stores/ui';
import { showConfirm } from '@/composables/useConfirm';
import * as api from '@/api/settings';
import type { DepartmentFull } from '@/api/settings';

defineEmits<{ (e: 'close'): void }>();

const settings = useSettingsStore();
const toast = useToastStore();
const ui = useUiStore();
const departments = ref<(DepartmentFull & { _originalName?: string | null })[]>([]);
const newDeptName = ref('');
const saving = ref(false);
const duplicateWarning = ref('');

onMounted(async () => {
  try {
    const data = await api.getDepartmentsFull();
    departments.value = (data || []).map(d => ({ ...d, _originalName: d.name }));
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка загрузки');
  }
});

function checkDuplicate() {
  duplicateWarning.value = '';
  const seen = new Set<string>();
  for (const d of departments.value) {
    const n = (d.name || '').trim().toLowerCase();
    if (!n) continue;
    if (seen.has(n)) { duplicateWarning.value = d.name; return; }
    seen.add(n);
  }
}

function onAdd() {
  const name = newDeptName.value.trim();
  if (!name) { toast.error('Введите название отдела'); return; }
  if (departments.value.some(d => d.name.toLowerCase() === name.toLowerCase())) {
    toast.error('Такой отдел уже есть');
    return;
  }
  departments.value.push({ name, enabled: true, _originalName: null });
  newDeptName.value = '';
  checkDuplicate();
  toast.success(`Отдел «${name}» добавлен`);
}

async function onDelete(idx: number) {
  const d = departments.value[idx];
  const name = d.name;
  // Проверка использования
  try {
    const check = await api.getFields(); // dummy — лучше /pipettes/paged
    const res = await fetch(`/api/pipettes/paged?limit=1&filters=${encodeURIComponent(JSON.stringify({ department: name }))}`, {
      headers: { Authorization: 'Bearer ' + (sessionStorage.getItem('pipette_session') ? JSON.parse(sessionStorage.getItem('pipette_session')!).token : '') },
    });
    if (res.ok) {
      const data = await res.json();
      const used = data?.total || 0;
      if (used > 0) {
        toast.error(`Нельзя удалить «${name}»: привязано ${used} единиц. Сначала переведите их.`);
        return;
      }
    }
  } catch { /* ignore */ }

  const ok = await showConfirm(`Удалить отдел «${name}»?`, {
    icon: '<i class="fa-solid fa-building"></i>', title: 'Удаление', okText: 'Удалить', okClass: 'btn-danger',
  });
  if (!ok) return;
  departments.value.splice(idx, 1);
}

async function onSave() {
  saving.value = true;
  checkDuplicate();
  try {
    const payload = departments.value
      .filter(d => (d.name || '').trim())
      .map(d => ({
        name: d.name.trim(),
        enabled: d.enabled !== false,
        oldName: d._originalName && d._originalName !== d.name.trim() ? d._originalName : null,
      }));

    if (payload.length === 0) { toast.error('Добавьте хотя бы один отдел'); saving.value = false; return; }

    await api.saveDepartments(payload);
    await settings.loadAll();

    const { usePipettesStore } = await import('@/stores/pipettes');
    usePipettesStore().syncFilterState(settings.filters);

    toast.success(`Отделы сохранены (${payload.length})`);

    await usePipettesStore().loadPaged();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    saving.value = false;
  }
}
  function openActions(e: MouseEvent, idx: number) {
  e.stopPropagation();
  ui.openRowActions(e.currentTarget as HTMLElement, [
    {
      label: '<i class="fa-solid fa-trash"></i> Удалить',
      class: 'item-danger',
      action: () => onDelete(idx),
    },
  ]);
}
</script>
