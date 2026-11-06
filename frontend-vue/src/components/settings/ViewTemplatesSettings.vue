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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
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

function openActions(e: MouseEvent, t: ViewTemplate) {
  ui.openRowActions(e.currentTarget as HTMLElement, [
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
