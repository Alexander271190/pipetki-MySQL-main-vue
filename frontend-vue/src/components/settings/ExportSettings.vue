<template>
  <div>
    <h3>Печать документов</h3>
    <p style="color:#64748b;font-size:.88rem;margin:0 0 14px;">
      Настройте, какие документы доступны пользователям и какие поля в них попадут.
    </p>

    <!-- Шапка -->
    <div style="margin-bottom:20px;padding:14px;background:var(--card-alt);border-radius:8px;border:1px solid var(--border);">
      <h4 style="margin-top:0;margin-bottom:12px;font-size:.95rem;">
        <i class="fa-solid fa-file-invoice"></i> Официальный бланк (Шапка документов)
      </h4>
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-bottom:12px;font-weight:500;">
        <input v-model="headerEnabled" type="checkbox" style="width:16px;height:16px;" />
        Включить шапку в актах и реестрах
      </label>
      <div v-if="headerEnabled">
        <div class="form-row" style="display:flex;gap:12px;">
          <div class="form-group" style="flex:1;">
            <label>Текст шапки (первая строка будет жирной)</label>
            <textarea v-model="headerText" rows="4" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border-hard);font-family:inherit;resize:vertical;"></textarea>
          </div>
          <div class="form-group" style="width:180px;">
            <label>Выравнивание</label>
            <select v-model="headerAlign" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border-hard);background:var(--card);color:var(--text);">
              <option value="center">По центру</option>
              <option value="left">По левому краю</option>
              <option value="right">По правому краю</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Табы -->
    <div class="prefs-tabs" style="margin-bottom:16px;">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="prefs-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >{{ tab.label }}</button>
    </div>

    <!-- Содержимое таба -->
    <div v-if="draft">
      <div class="info-block" style="margin-bottom:14px;">
        <strong>{{ currentTabConfig.title }}</strong><br>
        <small>{{ currentTabConfig.hint }}</small>
      </div>

      <div class="form-group">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-weight:600;">
          <input v-model="draft[currentTabConfig.enabledKey]" type="checkbox" style="width:18px;height:18px;" />
          Включить печать «{{ currentTabConfig.title }}»
        </label>
      </div>

      <div class="section-title" style="margin-top:14px;">Поля в документе:</div>
      <div class="export-fields-grid" :style="{ opacity: draft[currentTabConfig.enabledKey] ? 1 : 0.45, pointerEvents: draft[currentTabConfig.enabledKey] ? 'auto' : 'none' }">
        <label v-for="f in currentTabConfig.fields" :key="f.id" style="display:flex;align-items:center;gap:6px;cursor:pointer;">
          <input
            type="checkbox"
            :checked="((draft[currentTabConfig.fieldsKey] as string[]) || []).includes(f.id)"
            @change="onFieldToggle(f.id, ($event.target as HTMLInputElement).checked)"
          />
          {{ f.label }}
        </label>
      </div>
    </div>

    <div class="form-actions">
      <button type="button" class="btn btn-secondary" @click="$emit('close')">Закрыть</button>
      <button class="btn btn-success" :disabled="saving" @click="onSave">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i> Сохранить
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useToastStore } from '@/stores/toast';
import { useSettingsStore } from '@/stores/settings';
import * as api from '@/api/settings';
import { SYSTEM_FIELD_IDS_IN_CONFIG } from '@/constants';
  
defineEmits<{ (e: 'close'): void }>();

const settings = useSettingsStore();
const toast = useToastStore();

type ExportKey = 'export' | 'actSend' | 'actReturn' | 'history';

interface DraftShape {
  exportEnabled: boolean;
  fields: string[];
  actSendEnabled: boolean;
  actSendFields: string[];
  actReturnEnabled: boolean;
  actReturnFields: string[];
  historyEnabled: boolean;
  historyFields: string[];
  headerEnabled: boolean;
  headerText: string;
  headerAlign: 'left' | 'center' | 'right';
  [key: string]: unknown;
}

const draft = ref<DraftShape | null>(null);
const headerEnabled = ref(false);
const headerText = ref('');
const headerAlign = ref<'left' | 'center' | 'right'>('center');
const activeTab = ref<ExportKey>('export');
const saving = ref(false);

const tabs: { key: ExportKey; label: string }[] = [
  { key: 'export',    label: '📄 Печать реестра' },
  { key: 'actSend',   label: '📤 Печать акта отправки' },
  { key: 'actReturn', label: '📥 Печать акта возврата' },
  { key: 'history',   label: '📜 Печать истории поверок' },
];

const EXPORT_FIELDS = [
  { id: 'id', label: 'Внутренний номер' }, { id: 'serial', label: 'Серийный номер' },
  { id: 'manufacturer', label: 'Производитель' }, { id: 'model', label: 'Модель' },
  { id: 'equipmentType', label: 'Тип оборудования' }, { id: 'volume', label: 'Объём (мкл)' },
  { id: 'department', label: 'Отдел' }, { id: 'lastCalibration', label: 'Дата поверки' },
  { id: 'nextCalibration', label: 'Следующая поверка' }, { id: 'interval', label: 'МПИ (мес.)' },
  { id: 'daysLeft', label: 'Дней до поверки' }, { id: 'responsible', label: 'Ответственный' },
  { id: 'location', label: 'Место хранения' }, { id: 'status', label: 'Статус' },
  { id: 'cert', label: 'Свидетельство' }, { id: 'notes', label: 'Примечание' },
];

const ACT_SEND_FIELDS = [
  { id: 'id', label: 'Внутренний номер' }, { id: 'model', label: 'Модель' },
  { id: 'manufacturer', label: 'Производитель' }, { id: 'serial', label: 'Серийный номер' },
  { id: 'volume', label: 'Объём' }, { id: 'department', label: 'Отдел' },
  { id: 'responsible', label: 'Ответственный' }, { id: 'location', label: 'Место хранения' },
  { id: 'cert', label: 'Свидетельство' }, { id: 'notes', label: 'Примечание' },
];

const ACT_RETURN_FIELDS = [
  { id: 'id', label: 'Внутренний номер' }, { id: 'model', label: 'Модель' },
  { id: 'manufacturer', label: 'Производитель' }, { id: 'serial', label: 'Серийный номер' },
  { id: 'volume', label: 'Объём' }, { id: 'department', label: 'Отдел' },
  { id: 'responsible', label: 'Ответственный' }, { id: 'cert', label: 'Свидетельство' },
  { id: 'result', label: 'Результат поверки' }, { id: 'notes', label: 'Примечание' },
];

const HISTORY_FIELDS = [
  { id: 'date', label: 'Дата поверки' }, { id: 'cert', label: 'Свидетельство' },
  { id: 'result', label: 'Результат' }, { id: 'org', label: 'Организация' },
  { id: 'note', label: 'Примечание' },
];

// Кастомные поля (созданные админом через «Поля формы» и включённые)
const customFields = computed(() =>
  settings.fields
    .filter(f => f.enabled && !SYSTEM_FIELD_IDS_IN_CONFIG.has(f.id))
    .map(f => ({ id: f.id, label: f.label }))
);  

const currentTabConfig = computed(() => {
  const map: Record<ExportKey, { title: string; hint: string; enabledKey: string; fieldsKey: string; fields: { id: string; label: string }[] }> = {
    export:    { title: 'Реестр оборудования',        hint: 'Документ при нажатии «Печать в Excel/PDF»', enabledKey: 'exportEnabled',    fieldsKey: 'fields',          fields: EXPORT_FIELDS },
    actSend:   { title: 'Акт отправки на поверку',    hint: 'Печатный документ при отправке',           enabledKey: 'actSendEnabled',   fieldsKey: 'actSendFields',   fields: ACT_SEND_FIELDS },
    actReturn: { title: 'Акт возврата с поверки',     hint: 'Печатный документ при возврате',            enabledKey: 'actReturnEnabled', fieldsKey: 'actReturnFields', fields: ACT_RETURN_FIELDS },
    history:   { title: 'История поверок',            hint: 'Документ при нажатии «Печать истории»',     enabledKey: 'historyEnabled',   fieldsKey: 'historyFields',   fields: HISTORY_FIELDS },
  };
  const base = map[activeTab.value];
  return { ...base, fields: [...base.fields, ...customFields.value] };
});

onMounted(async () => {
  try {
   const raw = await api.getExport();
   const data: DraftShape = Array.isArray(raw)
    ? {
      fields: raw as string[],
      exportEnabled: true, actSendEnabled: true, actSendFields: [],
      actReturnEnabled: true, actReturnFields: [],
      historyEnabled: true, historyFields: [],
      headerEnabled: false, headerText: '', headerAlign: 'center',
    }
  : (raw as DraftShape);

    draft.value = {
      exportEnabled:    data.exportEnabled    !== false,
      fields:           data.fields           || [],
      actSendEnabled:   data.actSendEnabled   !== false,
      actSendFields:    data.actSendFields    || ['id','model','manufacturer','serial','volume','department','responsible'],
      actReturnEnabled: data.actReturnEnabled !== false,
      actReturnFields:  data.actReturnFields  || ['id','model','manufacturer','serial','volume','department','cert','result'],
      historyEnabled:   data.historyEnabled   !== false,
      historyFields:    data.historyFields    || ['date','cert','result','org','note'],
      headerEnabled:    !!data.headerEnabled,
      headerText:       data.headerText || '',
      headerAlign:      (data.headerAlign as 'left'|'center'|'right') || 'center',
    };
    headerEnabled.value = !!data.headerEnabled;
    headerText.value = data.headerText || '';
    headerAlign.value = (data.headerAlign as 'left'|'center'|'right') || 'center';
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка загрузки');
  }
});

function onFieldToggle(fieldId: string, checked: boolean) {
  if (!draft.value) return;
  const key = currentTabConfig.value.fieldsKey as 'fields' | 'actSendFields' | 'actReturnFields' | 'historyFields';
  const arr = Array.isArray(draft.value[key]) ? [...draft.value[key]] : [];
  if (checked) { if (!arr.includes(fieldId)) arr.push(fieldId); }
  else { const idx = arr.indexOf(fieldId); if (idx !== -1) arr.splice(idx, 1); }
  draft.value[key] = arr;
}

async function onSave() {
  if (!draft.value) return;
  saving.value = true;
  try {
    draft.value.headerEnabled = headerEnabled.value;
    draft.value.headerText = headerText.value;
    draft.value.headerAlign = headerAlign.value;
    await api.saveExport(draft.value);
    await settings.loadAll();
    toast.success('Настройки печати сохранены');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    saving.value = false;
  }
}
</script>
