<template>
  <div>
    <h3>Шаблоны вида</h3>
    <p style="color:#64748b;margin-bottom:12px;">Шаблоны для настройки видимых колонок.</p>

    <table class="field-settings-table">
      <thead><tr><th>Название</th><th style="text-align:center;">По умолчанию</th><th></th></tr></thead>
      <tbody>
        <tr v-for="t in templates" :key="t.id">
          <td>{{ t.name }}</td>
          <td style="text-align:center;">{{ t.isDefault ? '✅' : '—' }}</td>
          <td style="text-align:center;">
            <button class="row-actions-btn" @click.stop="openActions($event, t)">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
          </td>
        </tr>
        <tr v-if="templates.length === 0">
          <td colspan="3" style="text-align:center;padding:20px;color:#94a3b8;">Нет шаблонов</td>
        </tr>
      </tbody>
    </table>

    <div class="form-actions">
      <button class="btn btn-primary" style="margin-right:auto;" @click="onAdd">
        <i class="fa-solid fa-plus"></i> Добавить шаблон
      </button>
      <button type="button" class="btn btn-secondary" @click="$emit('close')">Закрыть</button>
    </div>

    <!-- Модалка редактирования -->
    <AppModal :visible="!!editing" @close="closeEdit" modal-class="modal-lg">
      <h2><i class="fa-solid fa-pen"></i> Редактировать шаблон</h2>

      <div class="form-group">
        <label>Название *</label>
        <input v-model="editName" type="text" placeholder="Например: Лаборант" />
      </div>

      <div class="form-group">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input v-model="editIsDefault" type="checkbox" style="width:18px;height:18px;" />
          <span style="font-weight:600;">Использовать по умолчанию</span>
        </label>
        <small style="display:block;margin-top:4px;margin-left:26px;color:#64748b;font-size:.78rem;">
          Будет применяться для новых пользователей без своих настроек.
        </small>
      </div>

      <div class="form-group">
        <label>Видимые колонки *</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;max-height:340px;overflow-y:auto;padding:10px;background:#f8fafc;border-radius:8px;">
          <label
            v-for="f in allEditFields"
            :key="f.id"
            style="display:flex;align-items:center;gap:8px;font-size:.85rem;cursor:pointer;padding:4px;"
          >
            <input
              type="checkbox"
              :checked="editFields.includes(f.id)"
              @change="toggleEditField(f.id, ($event.target as HTMLInputElement).checked)"
              style="width:16px;height:16px;accent-color:#4f46e5;"
            />
            <span>{{ f.label }}</span>
          </label>
        </div>
        <small style="display:block;margin-top:6px;color:#64748b;font-size:.78rem;">
          {{ editFields.length }} из {{ allEditFields.length }} выбрано
        </small>
      </div>

      <div v-if="editError" class="auth-error" style="visibility:visible;opacity:1;">{{ editError }}</div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="closeEdit">Отмена</button>
        <button type="button" class="btn btn-success" :disabled="editSaving" @click="saveEdit">
          <i class="fa-solid" :class="editSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
          {{ editSaving ? 'Сохранение…' : 'Сохранить' }}
        </button>
      </div>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useToastStore } from '@/stores/toast';
import { useUiStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { showConfirm } from '@/composables/useConfirm';
import { showPrompt } from '@/composables/usePrompt';
import * as api from '@/api/viewTemplates';
import type { ViewTemplate } from '@/api/viewTemplates';

defineEmits<{ (e: 'close'): void }>();

const toast = useToastStore();
const ui = useUiStore();
const settings = useSettingsStore();

const templates = ref<ViewTemplate[]>([]);

// ── Редактирование ──
const editing = ref<ViewTemplate | null>(null);
const editName = ref('');
const editFields = ref<string[]>([]);
const editIsDefault = ref(false);
const editSaving = ref(false);
const editError = ref('');

// Все поля, доступные для шаблона: enabled из settings.fields + status + nextCalibration
const allEditFields = computed(() => {
  const base = settings.fields
    .filter(f => f.enabled)
    .map(f => ({ id: f.id, label: f.label }));
  base.push({ id: 'status', label: 'Статус' });
  base.push({ id: 'nextCalibration', label: 'Следующая поверка' });
  return base;
});

async function load() {
  try { templates.value = await api.getViewTemplates(); }
  catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
}

onMounted(load);

async function onAdd() {
  const name = await showPrompt('Название шаблона', {
    icon: 'fa-plus', title: 'Новый шаблон', okText: 'Далее',
    placeholder: 'Например: Лаборант',
    validator: v => v ? null : 'Укажите название',
  });
  if (!name) return;

  const activeFields = settings.fields.filter(f => f.enabled).map(f => f.id);
  activeFields.push('status', 'nextCalibration');

  try {
    await api.createViewTemplate({ name: name.trim(), visibleFields: activeFields, isDefault: false });
    toast.success('Шаблон создан');
    load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

function openEdit(t: ViewTemplate) {
  editing.value = t;
  editName.value = t.name;
  editFields.value = [...(t.visibleFields || [])];
  editIsDefault.value = !!t.isDefault;
  editError.value = '';
}

function closeEdit() {
  editing.value = null;
  editName.value = '';
  editFields.value = [];
  editIsDefault.value = false;
  editError.value = '';
  editSaving.value = false;
}

function toggleEditField(id: string, checked: boolean) {
  const s = new Set(editFields.value);
  if (checked) s.add(id); else s.delete(id);
  editFields.value = [...s];
}

async function saveEdit() {
  editError.value = '';
  if (!editing.value) return;
  const name = editName.value.trim();
  if (!name) { editError.value = 'Укажите название'; return; }
  if (editFields.value.length === 0) { editError.value = 'Выберите хотя бы одну колонку'; return; }

  editSaving.value = true;
  try {
    await api.updateViewTemplate(editing.value.id, {
      name,
      visibleFields: editFields.value,
      isDefault: editIsDefault.value,
    });
    toast.success('Шаблон обновлён');
    closeEdit();
    await load();
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Ошибка';
  } finally {
    editSaving.value = false;
  }
}

function openActions(e: MouseEvent, t: ViewTemplate) {
  ui.openRowActions(e.currentTarget as HTMLElement, [
    {
      label: '<i class="fa-solid fa-pen"></i> Редактировать',
      action: () => openEdit(t),
    },
    {
      label: '<i class="fa-solid fa-trash"></i> Удалить',
      class: 'item-danger',
      action: async () => {
        const ok = await showConfirm(`Удалить «${t.name}»?`, {
          icon: '<i class="fa-solid fa-trash"></i>', title: 'Удаление', okText: 'Удалить', okClass: 'btn-danger',
        });
        if (!ok) return;
        try {
          await api.deleteViewTemplate(t.id);
          toast.success('Удалён');
          load();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Ошибка');
        }
      },
    },
  ]);
}
</script>
