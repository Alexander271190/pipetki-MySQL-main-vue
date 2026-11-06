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
            <button class="row-actions-btn" @click="onDelete(i)" title="Удалить">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="form-actions">
      <button class="btn btn-primary" style="margin-right:auto;" @click="onAdd"><i class="fa-solid fa-plus"></i> Добавить поле</button>
      <button type="button" class="btn btn-secondary" @click="$emit('close')">Закрыть</button>
      <button class="btn btn-success" :disabled="saving" @click="onSave">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i> Сохранить
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToastStore } from '@/stores/toast';
import { useSettingsStore } from '@/stores/settings';
import { showConfirm } from '@/composables/useConfirm';
import { showPrompt } from '@/composables/usePrompt';
import { slugify } from '@/utils/string';
import * as api from '@/api/settings';
import type { FieldConfig } from '@/api/settings';

defineEmits<{ (e: 'close'): void }>();

const settings = useSettingsStore();
const toast = useToastStore();

const fields = ref<FieldConfig[]>([]);
const saving = ref(false);

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
    toast.success('Поля сохранены');
    // Перезагрузить таблицу
    const { usePipettesStore } = await import('@/stores/pipettes');
    await usePipettesStore().loadPaged();
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
</script>
