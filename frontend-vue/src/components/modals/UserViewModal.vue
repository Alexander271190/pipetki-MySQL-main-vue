<template>
  <AppModal :visible="ui.activeModal === 'userView'" @close="close">
    <h2><i class="fa-solid fa-sliders"></i> Настройки пользователя</h2>
    <p v-if="userName" style="color:#64748b;margin-bottom:16px;font-size:.9rem;">
      Настройка полей формы для: <strong>{{ userName }}</strong>
    </p>

    <div class="prefs-tabs" style="margin-bottom:16px;">
      <button
        class="prefs-tab"
        :class="{ active: tab === 'fields' }"
        @click="tab = 'fields'"
      >
        <i class="fa-solid fa-list-check"></i> Поля формы
      </button>
      <button
        class="prefs-tab"
        :class="{ active: tab === 'documents' }"
        @click="tab = 'documents'"
      >
        <i class="fa-solid fa-print"></i> Документы для печати
      </button>
    </div>

    <!-- ВКЛАДКА: ПОЛЯ ФОРМЫ -->
    <div v-if="tab === 'fields'">
      <!-- Скопировать вид с другого пользователя -->
      <div class="copy-view-block">
        <label class="copy-view-label">
          <i class="fa-solid fa-copy"></i> Скопировать вид с другого пользователя:
        </label>
        <div class="copy-view-controls">
          <select v-model="copyFromUserId">
            <option value="">— загрузка —</option>
            <option v-for="u in otherUsers" :key="u.id" :value="u.id">{{ u.fullName }} — {{ u.position }}</option>
          </select>
          <button type="button" class="btn btn-secondary btn-sm" @click="copyFromUser">
            <i class="fa-solid fa-clipboard"></i> Скопировать
          </button>
        </div>
        <small class="copy-view-hint">Заполнит галочки ниже <strong>текущим видом</strong> выбранного пользователя.</small>
      </div>

      <div v-if="loading" style="text-align:center;padding:30px;">
        <i class="fa-solid fa-spinner fa-spin"></i>
      </div>

      <div v-else>
        <div class="prefs-list">
          <label v-for="f in activeFields" :key="f.id" class="prefs-item">
            <input
              type="checkbox"
              :checked="visibleFields.includes(f.id)"
              @change="toggleField(f.id, ($event.target as HTMLInputElement).checked)"
            />
            <span class="prefs-label">{{ f.label }}</span>
          </label>
        </div>

        <div style="margin-top:14px;padding-top:12px;border-top:1px dashed #e2e8f0;">
          <div style="font-weight:600;font-size:.82rem;color:#64748b;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px;">
            Виртуальные колонки
          </div>
          <div class="prefs-list">
            <label class="prefs-item" title="Считается из «Дата поверки» + МПИ">
              <input type="checkbox" :checked="visibleFields.includes('nextCalibration')" @change="toggleField('nextCalibration', ($event.target as HTMLInputElement).checked)" />
              <span class="prefs-label">Следующая поверка <small style="color:#94a3b8;font-weight:400;">— считается из даты + МПИ</small></span>
            </label>
            <label class="prefs-item" title="Считается из даты, МПИ, результата, активности">
              <input type="checkbox" :checked="visibleFields.includes('status')" @change="toggleField('status', ($event.target as HTMLInputElement).checked)" />
              <span class="prefs-label">Статус <small style="color:#94a3b8;font-weight:400;">— считается из даты, МПИ, результата</small></span>
            </label>
          </div>
        </div>

        <!-- Шаблон вида -->
        <div class="user-view-template-block" style="margin-top:16px;">
          <div class="user-view-template-title"><i class="fa-solid fa-clone"></i> Шаблон вида</div>
          <div class="user-view-template-controls">
            <select v-model="selectedTemplateId" class="user-view-template-select">
              <option value="">— без шаблона —</option>
              <option v-for="t in templates" :key="t.id" :value="String(t.id)">
                {{ t.name }}{{ t.isDefault ? ' ⭐' : '' }}
              </option>
            </select>
            <button type="button" class="btn btn-primary btn-sm" @click="applyTemplate">
              Применить
            </button>
            <button type="button" class="btn btn-secondary btn-sm" @click="resetTemplate">
              Сбросить
            </button>
          </div>
          <small class="user-view-template-hint">Шаблон применяется, если у пользователя нет индивидуальных настроек полей.</small>
        </div>

        <div class="prefs-hint">
          <i class="fa-solid fa-circle-info"></i>
          Отключённые поля не будут видны этому пользователю в форме добавления и редактирования.
        </div>

        <div style="margin-top:16px;padding-top:14px;border-top:1px solid #e2e8f0;">
          <div style="font-weight:600;font-size:.85rem;color:#475569;margin-bottom:8px;">Применить ко всем пользователям:</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-sm" @click="applyToAll('missing')" title="Тем, у кого нет своих настроек">
              <i class="fa-solid fa-users"></i> Тем, у кого нет настроек
            </button>
            <button type="button" class="btn btn-primary btn-sm" @click="applyToAll('add')" title="Добавить отмеченные поля всем">
              <i class="fa-solid fa-plus"></i> Добавить отмеченные всем
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ВКЛАДКА: ДОКУМЕНТЫ -->
    <div v-if="tab === 'documents'">
      <div class="warning-block" v-if="!userHasExportPerm" style="margin:0;">
        ⚠️ У пользователя нет права «Печать документов».<br>
        Сначала выдайте это право в блоке «Права доступа», затем настраивайте документы.
      </div>
      <div v-else>
        <div style="margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-weight:600;">
            <input v-model="useIndividualPrint" type="checkbox" style="width:18px;height:18px;" />
            Использовать индивидуальные настройки печати
          </label>
          <small style="display:block;margin-top:6px;color:#64748b;margin-left:26px;">
            Если выключено — используются стандартные настройки системы.
          </small>
        </div>

        <div class="prefs-tabs" style="margin-bottom:16px;">
          <button
            v-for="d in docConfigs"
            :key="d.key"
            class="prefs-tab"
            :class="{ active: activeDoc === d.key }"
            @click="activeDoc = d.key"
          >{{ d.title }}</button>
        </div>

        <div v-for="d in docConfigs" :key="d.key" v-show="activeDoc === d.key">
          <div style="padding:14px;background:var(--card-alt);border-radius:8px;margin-bottom:12px;"
               :style="{ opacity: useIndividualPrint ? 1 : 0.6, pointerEvents: useIndividualPrint ? 'auto' : 'none' }">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;margin-bottom:12px;">
              <input type="checkbox" v-model="printDocs[d.key].enabled" style="width:16px;height:16px;" />
              Разрешить печать этого документа
            </label>
            <div style="font-weight:600;font-size:.85rem;color:#475569;margin-bottom:8px;">Поля в документе:</div>
            <div class="export-fields-grid" style="grid-template-columns:1fr 1fr;">
              <label v-for="f in d.fields" :key="f.id" style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" :checked="printDocs[d.key].fields.includes(f.id)" @change="togglePrintField(d.key, f.id, ($event.target as HTMLInputElement).checked)" />
                {{ f.label }}
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="form-actions" style="margin-top:16px;">
      <button type="button" class="btn btn-secondary btn-sm" @click="resetUserView">
        <i class="fa-solid fa-rotate-left"></i> Сбросить
      </button>
      <button type="button" class="btn btn-secondary btn-sm" @click="close">Закрыть</button>
      <button type="button" class="btn btn-success btn-sm" :disabled="saving" @click="save">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i> Сохранить
      </button>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import { useToastStore } from '@/stores/toast';
import { apiRequest } from '@/api/client';
import * as usersApi from '@/api/users';
import * as viewTplApi from '@/api/viewTemplates';
import type { FullUser } from '@/api/users';
import type { ViewTemplate } from '@/api/viewTemplates';

const ui = useUiStore();
const auth = useAuthStore();
const settings = useSettingsStore();
const toast = useToastStore();

const tab = ref<'fields' | 'documents'>('fields');
const activeDoc = ref<'export' | 'actSend' | 'actReturn' | 'history'>('export');
const loading = ref(false);
const saving = ref(false);

const userId = ref<string | null>(null);
const userName = ref('');
const users = ref<FullUser[]>([]);
const visibleFields = ref<string[]>([]);
const templates = ref<ViewTemplate[]>([]);
const selectedTemplateId = ref('');
const copyFromUserId = ref('');
const useIndividualPrint = ref(false);

interface PrintDoc { enabled: boolean; fields: string[] }
const printDocs = ref<Record<string, PrintDoc>>({
  export:    { enabled: true, fields: [] },
  actSend:   { enabled: true, fields: [] },
  actReturn: { enabled: true, fields: [] },
  history:   { enabled: true, fields: [] },
});

const VIRTUAL_IDS = ['status', 'nextCalibration'];

const activeFields = computed(() =>
  settings.fields.filter(f => f.enabled).sort((a, b) => (a.order || 0) - (b.order || 0))
);

const otherUsers = computed(() => users.value.filter(u => u.id !== userId.value));

const currentUser = computed(() => users.value.find(u => u.id === userId.value));

const userHasExportPerm = computed(() => {
  const u = currentUser.value;
  if (!u) return false;
  return u.isAdmin === true || (u.extraPermissions || []).includes('export_data');
});

const docConfigs = [
  {
    key: 'export', title: 'Печать реестра',
    fields: [
      { id: 'id', label: 'ID' }, { id: 'serial', label: 'Серийный' },
      { id: 'manufacturer', label: 'Производитель' }, { id: 'model', label: 'Модель' },
      { id: 'equipmentType', label: 'Тип' }, { id: 'volume', label: 'Объём' },
      { id: 'department', label: 'Отдел' }, { id: 'lastCalibration', label: 'Дата поверки' },
      { id: 'nextCalibration', label: 'Следующая' }, { id: 'interval', label: 'МПИ' },
      { id: 'daysLeft', label: 'Дней' }, { id: 'responsible', label: 'Ответственный' },
      { id: 'location', label: 'Место' }, { id: 'status', label: 'Статус' },
      { id: 'cert', label: 'Свидетельство' }, { id: 'notes', label: 'Примечание' },
    ],
  },
  {
    key: 'actSend', title: 'Акт отправки',
    fields: [
      { id: 'id', label: 'ID' }, { id: 'model', label: 'Модель' },
      { id: 'manufacturer', label: 'Производитель' }, { id: 'serial', label: 'Серийный' },
      { id: 'volume', label: 'Объём' }, { id: 'department', label: 'Отдел' },
      { id: 'responsible', label: 'Ответственный' }, { id: 'location', label: 'Место' },
      { id: 'cert', label: 'Свидетельство' }, { id: 'notes', label: 'Примечание' },
    ],
  },
  {
    key: 'actReturn', title: 'Акт возврата',
    fields: [
      { id: 'id', label: 'ID' }, { id: 'model', label: 'Модель' },
      { id: 'manufacturer', label: 'Производитель' }, { id: 'serial', label: 'Серийный' },
      { id: 'volume', label: 'Объём' }, { id: 'department', label: 'Отдел' },
      { id: 'responsible', label: 'Ответственный' }, { id: 'cert', label: 'Свидетельство' },
      { id: 'result', label: 'Результат' }, { id: 'notes', label: 'Примечание' },
    ],
  },
  {
    key: 'history', title: 'История поверок',
    fields: [
      { id: 'date', label: 'Дата' }, { id: 'cert', label: 'Свидетельство' },
      { id: 'result', label: 'Результат' }, { id: 'org', label: 'Организация' },
      { id: 'note', label: 'Примечание' },
    ],
  },
];

watch(() => ui.activeModal, async (v) => {
  if (v !== 'userView') return;
  userId.value = ui.modalData as string;
  tab.value = 'fields';
  await loadAll();
});

async function loadAll() {
  loading.value = true;
  try {
    users.value = await usersApi.getUsers();
    const u = users.value.find(x => x.id === userId.value);
    if (!u) { toast.error('Пользователь не найден'); ui.close(); return; }
    userName.value = u.fullName;

    // Загрузка prefs
    let prefs: Record<string, unknown> = {};
    try {
      prefs = await apiRequest(`/settings/user-preferences/${userId.value}`);
    } catch { /* ignore */ }

    const allEnabled = settings.fields.filter(f => f.enabled).map(f => f.id);
    const allAvailable = [...allEnabled, ...VIRTUAL_IDS];
    let vf = Array.isArray(prefs.visibleFields) ? prefs.visibleFields as string[] : [];
    if (vf.length === 0) {
      vf = [...allAvailable];
    } else {
      const valid = new Set(allAvailable);
      vf = vf.filter(id => valid.has(id));
      if (!prefs._virtualsInitialized) {
        for (const vid of VIRTUAL_IDS) {
          if (!vf.includes(vid)) vf.push(vid);
        }
      }
    }
    visibleFields.value = vf;

    // Печать
    const pd = prefs.printDocuments as Record<string, unknown> | undefined;
    if (pd && typeof pd === 'object') {
      useIndividualPrint.value = !!pd.useIndividual;
      for (const key of ['export', 'actSend', 'actReturn', 'history']) {
        const d = pd[key] as { enabled?: boolean; fields?: string[] } | undefined;
        printDocs.value[key] = {
          enabled: d?.enabled !== false,
          fields: Array.isArray(d?.fields) ? d.fields : [],
        };
      }
    }

    // Шаблоны
    try {
      templates.value = await viewTplApi.getViewTemplates();
      const currentTpl = u.viewTemplateId;
      selectedTemplateId.value = currentTpl ? String(currentTpl) : '';
    } catch { templates.value = []; }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка загрузки');
  } finally {
    loading.value = false;
  }
}

function toggleField(id: string, checked: boolean) {
  const set = new Set(visibleFields.value);
  if (checked) set.add(id); else set.delete(id);
  visibleFields.value = [...set];
}

function togglePrintField(docKey: string, fieldId: string, checked: boolean) {
  if (!printDocs.value[docKey]) return;
  const set = new Set(printDocs.value[docKey].fields);
  if (checked) set.add(fieldId); else set.delete(fieldId);
  printDocs.value[docKey].fields = [...set];
}

async function copyFromUser() {
  if (!copyFromUserId.value) { toast.error('Выберите пользователя'); return; }
  try {
    const res = await apiRequest<{ visibleFields: string[] }>(
      `/settings/user-preferences/${copyFromUserId.value}/effective`
    );
    if (!res.visibleFields || res.visibleFields.length === 0) {
      toast.error('У пользователя нет активных полей');
      return;
    }
    const activeSet = new Set(settings.fields.filter(f => f.enabled).map(f => f.id));
    const virtualSet = new Set(VIRTUAL_IDS);
    const filtered = res.visibleFields.filter(id => activeSet.has(id) || virtualSet.has(id));
    visibleFields.value = [...filtered];
    toast.success(`Скопировано полей: ${filtered.length}`);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

async function applyTemplate() {
  if (!selectedTemplateId.value || !userId.value) {
    toast.error('Выберите шаблон'); return;
  }
  try {
    await viewTplApi.applyViewTemplateToUser(Number(selectedTemplateId.value), userId.value);
    toast.success('Шаблон применён');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

async function resetTemplate() {
  if (!userId.value) return;
  try {
    await viewTplApi.resetViewTemplateFromUser(userId.value);
    toast.success('Шаблон сброшен');
    selectedTemplateId.value = '';
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

async function applyToAll(mode: 'missing' | 'add') {
  if (visibleFields.value.length === 0) {
    toast.error('Выберите хотя бы одно поле'); return;
  }
  const modeLabel = mode === 'missing'
    ? 'только тем пользователям, у кого ещё нет своих настроек'
    : 'ВСЕМ пользователям (добавить отмеченные поля, остальные сохранить)';
  if (!confirm(`Применить ${visibleFields.value.length} полей ${modeLabel}?\n\nДействие затронет всех пользователей.`)) return;
  try {
    const res = await apiRequest<{ updated: number; message?: string }>(
      '/settings/apply-fields-to-all', 'POST',
      { visibleFields: visibleFields.value, mode }
    );
    toast.success(res.message || `Обновлено: ${res.updated}`);
    ui.close();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

async function save() {
  if (!userId.value) return;
  if (visibleFields.value.length === 0) {
    toast.error('Выберите хотя бы одно поле'); return;
  }
  saving.value = true;
  try {
    let existing: Record<string, unknown> = {};
    try { existing = await apiRequest(`/settings/user-preferences/${userId.value}`); } catch { /* ignore */ }

    const merged = {
      ...existing,
      visibleFields: visibleFields.value,
      printDocuments: useIndividualPrint.value
        ? {
            useIndividual: true,
            export:    printDocs.value.export,
            actSend:   printDocs.value.actSend,
            actReturn: printDocs.value.actReturn,
            history:   printDocs.value.history,
          }
        : { useIndividual: false },
      _virtualsInitialized: true,
    };
    await apiRequest(`/settings/user-preferences/${userId.value}`, 'PUT', merged);
    toast.success('Настройки сохранены');
    ui.close();

    if (userId.value === auth.user?.id) {
      const { usePrefsStore } = await import('@/stores/prefs');
      const prefs = usePrefsStore();
      prefs.visibleFields = [...visibleFields.value];
      prefs._virtualsInitialized = true;
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  } finally {
    saving.value = false;
  }
}

async function resetUserView() {
  if (!userId.value) return;
  if (!confirm('Сбросить настройки полей и документов к стандартным?')) return;
  try {
    await apiRequest(`/settings/user-preferences/${userId.value}`, 'DELETE');
    toast.success('Сброшено. Пользователь увидит все включённые поля.');
    ui.close();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

function close() { ui.close(); }
</script>
