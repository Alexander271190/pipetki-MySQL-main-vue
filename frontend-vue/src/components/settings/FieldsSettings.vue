<template>
  <div>
    <h3>Управление полями формы</h3>
    <p style="color:#64748b;margin-bottom:12px;">Включите/отключите поля, измените порядок, сделайте обязательными.</p>

    <table class="field-settings-table">
      <thead>
        <tr>
          <th style="width:100px;text-align:center;">Порядок</th>
          <th style="text-align:center;">Название</th>
          <th style="width:120px;text-align:center;">Тип</th>
          <th style="width:100px;text-align:center;">Обяз-но</th>
          <th style="width:110px;text-align:center;">Активно</th>
          <th style="text-align:center;">Список значений</th>
          <th style="width:60px;"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(f, i) in fields" :key="f.id">
          <td>
            <div class="order-btns">
              <button type="button" class="btn btn-secondary btn-sm" :disabled="i === 0" @click="move(i, -1)" title="Выше">
                <i class="fa-solid fa-arrow-up"></i>
              </button>
              <button type="button" class="btn btn-secondary btn-sm" :disabled="i === fields.length - 1" @click="move(i, 1)" title="Ниже">
                <i class="fa-solid fa-arrow-down"></i>
              </button>
            </div>
          </td>
          <td><input v-model="f.label" type="text" /></td>
          <td>
            <select v-if="isSystemField(f.id)" disabled :title="'Системное поле — тип фиксирован'">
              <option>{{ typeLabels[f.type] || f.type }}</option>
            </select>
            <select v-else v-model="f.type" @change="onTypeChange(f)">
              <option value="text">Текст</option>
              <option value="number">Число</option>
              <option value="date">Дата</option>
              <option value="select">Список</option>
              <option value="textarea">Текст. область</option>
            </select>
          </td>
          <td style="text-align:center;"><input v-model="f.required" type="checkbox" /></td>
          <td style="text-align:center;">
            <input type="checkbox" :checked="f.enabled" @change="onEnabledChange(i, ($event.target as HTMLInputElement).checked)" />
          </td>
          <td>
            <textarea
              v-if="f.type === 'select'"
              :value="(f.options || []).join('\n')"
              rows="2"
              @input="f.options = ($event.target as HTMLTextAreaElement).value.split('\n').map(s => s.trim()).filter(Boolean)"
            ></textarea>
            <span v-else>—</span>
          </td>
           <td style="text-align:center;">
            <button class="row-actions-btn" @click="openActions($event, i)" title="Действия">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
          </td>
        </tr>
      </tbody>
    </table>

   <div class="form-actions">
       <button class="btn btn-primary" style="margin-right:auto;" @click="onAdd">
         <i class="fa-solid fa-plus"></i> Добавить поле
       </button>
       <button class="btn btn-warning" @click="showIdentity = true" title="Настроить, какие поля видны в массовых операциях">
        <i class="fa-solid fa-list-ul"></i> Отображение в списках
       </button>
       <button type="button" class="btn btn-secondary" @click="$emit('close')">Закрыть</button>
       <button class="btn btn-success" :disabled="saving" @click="onSave">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i> Сохранить
       </button>
     </div>
    <!-- Модалка «Отображение в списках» -->
<div v-if="showIdentity" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;">
  <div class="modal" style="max-width:600px;width:100%;background:var(--card);border-radius:16px;padding:24px;max-height:90vh;overflow-y:auto;">
    <h3 style="margin-top:0;">Отображение в списках</h3>
    <p style="color:#64748b;font-size:.88rem;margin-bottom:16px;">
      Выберите поля, которые будут отображаться в модалках массовых операций и быстрой поверки.
      Первые выбранные ID и Модель будут стоять в заголовке, остальные — мелким шрифтом.
    </p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;background:var(--card-alt);padding:16px;border-radius:8px;margin-bottom:20px;">
      <label v-for="opt in identityOptions" :key="opt.id" style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.9rem;">
        <input type="checkbox" :value="opt.id" :checked="identityFields.includes(opt.id)" @change="toggleIdentity(opt.id, ($event.target as HTMLInputElement).checked)" />
        {{ opt.label }}
      </label>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" @click="showIdentity = false">Отмена</button>
      <button class="btn btn-success" :disabled="savingIdentity" @click="saveIdentity">
        <i class="fa-solid" :class="savingIdentity ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i> Сохранить
      </button>
     </div>
   </div>
 </div>
</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useToastStore } from '@/stores/toast';
import { useSettingsStore } from '@/stores/settings';
import { useUiStore } from '@/stores/ui';
import { usePipettesStore } from '@/stores/pipettes';
import { showConfirm } from '@/composables/useConfirm';
import { showPrompt } from '@/composables/usePrompt';
import { slugify } from '@/utils/string';
import * as api from '@/api/settings';
import type { FieldConfig } from '@/api/settings';

defineEmits<{ (e: 'close'): void }>();

const settings = useSettingsStore();
const pip = usePipettesStore();
const toast = useToastStore();
const ui = useUiStore();
const fields = ref<FieldConfig[]>([]);
const saving = ref(false);
const showIdentity = ref(false);
const savingIdentity = ref(false);
const identityFields = ref<string[]>(['id', 'model', 'serial', 'inventorynumber', 'department']);

const identityOptions = computed(() => {
  const standard = [
    { id: 'id', label: 'ID' },
    { id: 'model', label: 'Модель' },
    { id: 'serial', label: 'Серийный номер' },
    { id: 'inventorynumber', label: 'Инвентарный номер' },
    { id: 'department', label: 'Отдел' },
    { id: 'responsible', label: 'Ответственный' },
  ];
  const standardIds = new Set(standard.map(s => s.id));
  
  // Добавляем только включённые кастомные поля
  const custom = settings.fields
    .filter(f => f.enabled && !standardIds.has(f.id))
    .map(f => ({ id: f.id, label: f.label }));

  return [...standard, ...custom];
});

function toggleIdentity(id: string, checked: boolean) {
  const set = new Set(identityFields.value);
  if (checked) set.add(id); else set.delete(id);
  identityFields.value = [...set];
}

async function saveIdentity() {
  if (identityFields.value.length === 0) {
    toast.error('Выберите хотя бы одно поле');
    return;
  }
  savingIdentity.value = true;
  try {
    await api.saveSystem({ bulk_identity_fields: JSON.stringify(identityFields.value) });
    settings.bulkIdentityFields = [...identityFields.value];
    toast.success('Настройки отображения сохранены');
    showIdentity.value = false;
    await pip.loadPaged();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    savingIdentity.value = false;
  }
}

const SYSTEM_FIELD_IDS = ['id', 'department', 'equipmentType', 'result', 'active'];
const typeLabels: Record<string, string> = {
  text: 'Текст', number: 'Число', date: 'Дата', select: 'Список', textarea: 'Текст. область',
};

function isSystemField(id: string) { return SYSTEM_FIELD_IDS.includes(id); }

onMounted(async () => {
  try {
    const data = await api.getFields();
    fields.value = JSON.parse(JSON.stringify(data || []));
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка загрузки');
  }

  // Загрузка текущих identity fields
  try {
    const sys = await api.getSystemSettings();
    if (sys.bulk_identity_fields) {
      try {
        const parsed = JSON.parse(sys.bulk_identity_fields);
        if (Array.isArray(parsed)) identityFields.value = parsed;
      } catch {  }
    }
  } catch {  }
});

function move(idx: number, dir: number) {
  const to = idx + dir;
  if (to < 0 || to >= fields.value.length) return;
  [fields.value[idx], fields.value[to]] = [fields.value[to], fields.value[idx]];
  fields.value.forEach((f, i) => f.order = i + 1);
}

function onTypeChange(f: FieldConfig) {
  if (f.type !== 'select') f.options = [];
}

async function onEnabledChange(idx: number, checked: boolean) {
  const f = fields.value[idx];
  if (!checked && f.required) {
    const ok = await showConfirm(
      `Поле «${f.label}» обязательно. Если скрыть — при создании будет подставляться значение «Не указана». Продолжить?`,
      { icon: '<i class="fa-solid fa-triangle-exclamation"></i>', title: 'Скрытие обязательного поля', okText: 'Скрыть', okClass: 'btn-warning' }
    );
    if (!ok) { (document.activeElement as HTMLElement)?.blur(); return; }
  }
  fields.value[idx].enabled = checked;
}

async function onAdd() {
  const label = await showPrompt('Название поля (по-русски)', {
    icon: 'fa-plus', title: 'Новое поле', okText: 'Добавить',
    placeholder: 'Например: Инвентарный номер',
    validator: (v) => v ? null : 'Укажите название',
  });
  if (!label) return;

  let baseId = slugify(label);
  let finalId = baseId;
  let counter = 1;
  while (fields.value.some(f => f.id === finalId)) finalId = `${baseId}_${counter++}`;

  fields.value.push({
    id: finalId, label: label.trim(), type: 'text',
    required: false, enabled: true, options: [], default: '',
    order: fields.value.length + 1,
  });
}

async function onDelete(idx: number) {
  const f = fields.value[idx];
  const ok = await showConfirm(`Удалить поле «${f.label}»?`, {
    icon: '<i class="fa-solid fa-clipboard-list"></i>', title: 'Удаление', okText: 'Удалить', okClass: 'btn-danger',
  });
  if (!ok) return;
  fields.value.splice(idx, 1);
  fields.value.forEach((f, i) => f.order = i + 1);
}

async function onSave() {
  saving.value = true;
  try {
    await api.saveFields(fields.value);
    // Перезагрузить store
    await settings.loadAll();
    const { usePrefsStore } = await import('@/stores/prefs');
    const prefs = usePrefsStore();
    const activeIds = settings.fields.filter(f => f.enabled).map(f => f.id);
    prefs.syncWithFieldsAddMissing(activeIds);
    await prefs.save();
    toast.success('Поля сохранены');
    // Перезагрузить таблицу
    await pip.loadPaged();
  } catch (e: unknown) {
    const err = e as { response?: { code?: string; affected?: number; fields?: string[] } };
    if (err.response?.code === 'field_has_data') {
      const affected = err.response.affected || 0;
      const list = (err.response.fields || []).map(f => `«${f}»`).join(', ');
      const plural = affected === 1 ? 'и' : 'ей';
      const ok = await showConfirm(
        `Поле ${list} заполнено у ${affected} запис${plural}.\n\nДанные будут стёрты. Продолжить?`,
        { icon: '<i class="fa-solid fa-triangle-exclamation"></i>', title: 'Поле с данными', okText: 'Удалить', okClass: 'btn-danger' }
      );
      if (!ok) { saving.value = false; return; }
      try {
        await api.saveFieldsWithConfirm(fields.value);
        await settings.loadAll();
        const { usePrefsStore } = await import('@/stores/prefs');
        const prefs = usePrefsStore();
        const activeIds = settings.fields.filter(f => f.enabled).map(f => f.id);
        prefs.syncWithFieldsAddMissing(activeIds);
        await prefs.save();
        toast.success(`Поле удалено, данные очищены у ${affected} записей`);
      } catch (e2) {
        toast.error(e2 instanceof Error ? e2.message : 'Ошибка');
      }
    } else {
      toast.error(e instanceof Error ? e.message : 'Ошибка сохранения');
    }
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
