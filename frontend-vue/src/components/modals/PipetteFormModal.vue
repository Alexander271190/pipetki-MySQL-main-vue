<template>
  <AppModal :visible="ui.activeModal === 'form'" @close="close" modal-class="modal-xl">
    <h2>
      <i class="fa-solid" :class="isEdit ? 'fa-pen' : 'fa-plus'"></i>
      {{ isEdit ? 'Редактировать оборудование' : 'Добавить оборудование' }}
    </h2>

    <!-- Шаблон (только при создании и только админ) -->
    <div v-if="!isEdit && auth.isAdmin" class="template-bar">
      <label class="template-bar-label">
        <i class="fa-solid fa-clone"></i> Шаблон:
      </label>
      <select :value="selectedTemplateId" @change="applyTemplate(Number(($event.target as HTMLSelectElement).value))">
        <option :value="0">— без шаблона —</option>
        <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
      <button type="button" class="btn btn-secondary btn-sm" @click="onSaveAsTemplate" :disabled="!hasAnyFilled">
        <i class="fa-solid fa-floppy-disk"></i> Сохранить как шаблон
      </button>
    </div>

    <!-- Вкладки (только при создании) -->
    <div v-if="!isEdit" class="add-tabs">
      <button type="button" class="add-tab" :class="{ active: tab === 'single' }" @click="tab = 'single'">
        <i class="fa-solid fa-cube"></i> Одна единица
      </button>
      <button type="button" class="add-tab" :class="{ active: tab === 'batch' }" @click="tab = 'batch'">
        <i class="fa-solid fa-table-list"></i> Партия (таблица)
      </button>
    </div>

    <!-- Вкладка «Партия» -->
    <div v-if="!isEdit" v-show="tab === 'batch'">
      <BulkCreateTab @cancel="close" @created="onBulkCreated" />
    </div>

    <!-- Вкладка «Одна единица» / Редактирование -->
    <div v-else>
      <div v-if="loadingData" style="text-align:center;padding:30px;color:#94a3b8;">
        <i class="fa-solid fa-spinner fa-spin"></i> Загрузка…
      </div>

      <!-- Черновик -->
      <div v-if="draft" class="warning-block" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:200px;">
            <strong><i class="fa-solid fa-pencil"></i> Черновик от {{ draft.isMine ? draft.userFullName + ' (вы)' : draft.userFullName }}</strong>
            <div style="font-size:.8rem;margin-top:4px;opacity:.85;">
              {{ formatDraftDate(draft.updatedAt) }} · Данные подставлены в поля. Проверьте и сохраните.
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" @click="discardDraft">
            <i class="fa-solid fa-rotate-left"></i> Отменить черновик
          </button>
        </div>
      </div>

      <form v-if="!loadingData" @submit.prevent="onSubmit" novalidate>
        <div v-for="f in visibleFields" :key="f.id" class="form-group">
          <label>{{ f.label }}<span v-if="f.required"> *</span></label>

          <input
            v-if="f.id === 'id'"
            v-model="form[f.id]"
            type="text"
            :readonly="isEdit"
            :disabled="isEdit"
            :style="isEdit ? { background: '#f1f5f9', cursor: 'not-allowed' } : {}"
            :title="isEdit ? 'ID присваивается автоматически' : ''"
          />
          <select
            v-else-if="f.type === 'select'"
            v-model="form[f.id]"
            :disabled="isFieldDisabled(f.id)"
            :style="isFieldDisabled(f.id) ? { background: '#f1f5f9', cursor: 'not-allowed' } : {}"
            @change="onSelectChange(f.id, $event)"
          >
            <option v-for="opt in getOptions(f)" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
          </select>
          <textarea v-else-if="f.type === 'textarea'" v-model="form[f.id]" rows="2" :placeholder="f.label"></textarea>
          <input v-else-if="f.type === 'date'" v-model="form[f.id]" type="date" />
          <input v-else-if="f.type === 'number'" v-model="form[f.id]" type="number" />
          <div v-else-if="f.id === 'barcode'" style="display:flex;gap:6px;">
            <!-- === 2.1 === readonly + disabled + title + v-if на кнопках -->
            <input
              v-model="form[f.id]"
              type="text"
              :placeholder="f.label"
              style="flex:1;"
              :readonly="!canManageBarcodes"
              :disabled="!canManageBarcodes || isFieldDisabled(f.id)"
              :style="!canManageBarcodes
                ? { background: '#f1f5f9', cursor: 'not-allowed' }
                : (isFieldDisabled(f.id) ? { background: '#f1f5f9', cursor: 'not-allowed' } : {})"
              :title="!canManageBarcodes ? 'Меняется администратором. Авто из инв. номера.' : ''"
            />
            <button
              v-if="canManageBarcodes"
              type="button"
              class="btn btn-secondary"
              @click="generateBarcode"
              title="Заполнить из инв. номера / серийного / ID"
            >
              <i class="fa-solid fa-wand-magic-sparkles"></i>
            </button>
            <button
              v-if="canManageBarcodes && isEdit"
              type="button"
              class="btn btn-warning"
              @click="resetBarcodeValue"
              title="Сбросить ручной — вернуть к авто"
            >
              <i class="fa-solid fa-rotate-left"></i>
            </button>
          </div>
          <input
            v-else
            v-model="form[f.id]"
            type="text"
            :placeholder="f.label"
            :disabled="isFieldDisabled(f.id)"
            :style="isFieldDisabled(f.id) ? { background: '#f1f5f9', cursor: 'not-allowed' } : {}"
          />
        </div>

        <div v-if="error" class="auth-error" style="margin-top:8px;visibility:visible;opacity:1;">{{ error }}</div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="close">Отмена</button>
          <button type="submit" class="btn btn-success" :disabled="saving">
            <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
            {{ saving ? 'Сохранение…' : 'Сохранить' }}
          </button>
        </div>
      </form>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import BulkCreateTab from './BulkCreateTab.vue';
import { useUiStore } from '@/stores/ui';
import { useAuthStore, usePermissions } from '@/stores/auth';   
import { useSettingsStore } from '@/stores/settings';
import { usePipettesStore } from '@/stores/pipettes';
import { useStatsStore } from '@/stores/stats';
import { useToastStore } from '@/stores/toast';
import { showLockWarning } from '@/composables/useLockWarning';
import { showPrompt } from '@/composables/usePrompt';
import { showConfirm } from '@/composables/useConfirm';
import { todayStr } from '@/utils/format';
import * as api from '@/api/pipettes';
import * as tplApi from '@/api/templates';
import type { FieldConfig } from '@/api/settings';
import type { Pipette } from '@/types';
import type { DraftData } from '@/api/pipettes';


const ui = useUiStore();
const auth = useAuthStore();
const perm = usePermissions();                                      
const canManageBarcodes = perm.canManageBarcodes;                  
const settings = useSettingsStore();
const pip = usePipettesStore();
const stats = useStatsStore();
const toast = useToastStore();
const responsibles = ref<string[]>([]);
const tab = ref<'single' | 'batch'>('single');
const form = ref<Record<string, string>>({});
const loadingData = ref(false);
const saving = ref(false);
const error = ref('');
const editId = ref<string | null>(null);
const draft = ref<DraftData | null>(null);

const templates = ref<tplApi.EquipmentTemplate[]>([]);
const selectedTemplateId = ref(0);

let _heartbeat: number | null = null;
let _skipUnlock = false;

// ⏱ Idle timeout: снятие блокировки через 30 минут бездействия
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
let _idleStart = 0;
let _idleCheckTimer: number | null = null;
let _activityListenersAttached = false;

function _onUserActivity() {
  _idleStart = Date.now();
}

function _startIdleTracking() {
  _idleStart = Date.now();
  if (_idleCheckTimer) return;

  _idleCheckTimer = window.setInterval(() => {
    if (!_idleStart) return;
    const elapsed = Date.now() - _idleStart;
    if (elapsed >= IDLE_TIMEOUT_MS) {
      _handleIdleTimeout();
    }
  }, 60 * 1000);

  if (!_activityListenersAttached) {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'input'];
    events.forEach(ev =>
      document.addEventListener(ev, _onUserActivity, { passive: true })
    );
    _activityListenersAttached = true;
  }
}

function _stopIdleTracking() {
  if (_idleCheckTimer) {
    clearInterval(_idleCheckTimer);
    _idleCheckTimer = null;
  }
  if (_activityListenersAttached) {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'input'];
    events.forEach(ev =>
      document.removeEventListener(ev, _onUserActivity)
    );
    _activityListenersAttached = false;
  }
  _idleStart = 0;
}

async function _handleIdleTimeout() {
  if (!editId.value || !_idleStart) return;

  if (_heartbeat) {
    clearInterval(_heartbeat);
    _heartbeat = null;
  }
  _stopIdleTracking();

  const id = editId.value;

  let draftSaved = false;
  try {
    await api.saveDraft(id, { ...form.value });
    draftSaved = true;
  } catch (e) {
    console.warn('Автосохранение черновика при idle timeout:', e);
  }

  try {
    await api.releaseLock(id);
    _skipUnlock = true;
  } catch (e) {
    console.warn('releaseLock при idle timeout:', e);
  }

  ui.close();

  const msg = draftSaved
    ? 'Модалка закрыта из-за 30 минут бездействия.\n\nВаши данные сохранены как черновик — сможете продолжить с того же места.'
    : 'Модалка закрыта из-за 30 минут бездействия.';

  toast.warn(msg);
}

const isEdit = computed(() => !!editId.value);
import { usePrefsStore } from '@/stores/prefs';
const prefs = usePrefsStore();

const visibleFields = computed<FieldConfig[]>(() => {
  const enabled = settings.fields
    .filter(f => f.enabled)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Если у пользователя нет своих настроек — все enabled
  const vis = prefs.visibleFields;
  if (!Array.isArray(vis) || vis.length === 0) return enabled;

  // Иначе — только отмеченные в «Настроить видимые поля»
  const set = new Set(vis);
  return enabled.filter(f => set.has(f.id));
});

const hasAnyFilled = computed(() => {
  return Object.values(form.value).some(v => v && v.trim && v.trim() !== '');
});

function getOptions(f: FieldConfig): { value: string; label: string }[] {
  if (f.id === 'equipmentType') {
    return settings.equipmentTypes.map(t => ({ value: t.value, label: t.label }));
  }

  if (f.id === 'result') {
    return [
      { value: 'pass', label: '✅ Годен' },
      { value: 'fail', label: '❌ Брак' },
      { value: 'wip',  label: '⏳ В процессе' },
    ];
  }

  if (f.id === 'active') {
    return [
      { value: 'true',  label: '✅ В работе' },
      { value: 'false', label: '⛔ Не используется' },
    ];
  }

  //  фильтр по onlyOwnDepartment / isActing
  if (f.id === 'department') {
    let deps = settings.departments;

    if (auth.user?.isActing && auth.user?.actingDepartment) {
      deps = [auth.user.actingDepartment];
    }
    else if (!auth.isAdmin && auth.user?.onlyOwnDepartment && auth.user?.department) {
      deps = [auth.user.department];
    }

    const opts = deps.map(d => ({ value: d, label: d }));
    if (!f.required) {
      return [{ value: '', label: '— не указан —' }, ...opts];
    }
    return opts;
  }

  if (f.id === 'responsible') {
    const opts: { value: string; label: string }[] = [];
    if (!f.required) opts.push({ value: '', label: '— не указан —' });

    const self = auth.user?.fullName || '';

    if (auth.isAdmin) {
      const names = new Set<string>(responsibles.value);
      if (self) names.add(self);
      const current = form.value.responsible;
      if (current) names.add(current);

      const sorted = [...names].sort((a, b) => a.localeCompare(b, 'ru'));
      sorted.forEach(n => opts.push({ value: n, label: n }));
      return opts;
    }

    if (auth.user?.isActing && auth.user?.actingForName) {
      opts.push({ value: auth.user.actingForName, label: `${auth.user.actingForName} (основной)` });
    } else if (self) {
      opts.push({ value: self, label: self });
    }
    return opts;
  }

  const raw = Array.isArray(f.options) ? f.options : [];
  const opts = raw.map(o => ({ value: o, label: o }));
  if (!f.required && !opts.some(o => o.value === '')) {
    return [{ value: '', label: '—' }, ...opts];
  }
  return opts;
}

function isFieldDisabled(fid: string): boolean {
  if (fid === 'department' && auth.user?.isActing) return true;
  if (fid === 'responsible' && !auth.isAdmin) return true;
  return false;
}

async function onSelectChange(fid: string, e: Event) {
  if (fid === 'equipmentType') {
    const typeVal = (e.target as HTMLSelectElement).value;
    const t = settings.equipmentTypes.find(x => x.value === typeVal);
    if ('interval' in form.value) form.value.interval = String(t?.interval && t.interval > 0 ? t.interval : 12);
    if (!isEdit.value) {
      try {
        const res = await api.getNextId(typeVal);
        form.value.id = res.nextId;
      } catch { /* ignore */ }
    }
  }
}

function formatDraftDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function generateBarcode() {
  const inv = form.value.inventorynumber;
  const serial = form.value.serial;
  const id = form.value.id;
  const val = inv || serial || id;
  if (val) form.value.barcode = String(val);
  else toast.warn('Заполните инв. номер, серийный или ID');
}

async function resetBarcodeValue() {
  if (!editId.value) return;
  const ok = await showConfirm(
    'Сбросить ручной штрихкод и пересчитать из источника?',
    { icon: '↩️', title: 'Сброс штрихкода', okText: 'Сбросить', okClass: 'btn-warning' }
  );
  if (!ok) return;
  try {
    await api.resetBarcode(editId.value);
    form.value.barcode = '';

    const item = pip.items.find(x => x.id === editId.value);
    if (item) (item as unknown as Record<string, unknown>).barcode = '';

    toast.success('Штрихкод сброшен. Будет пересчитан при сохранении.');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка сброса');
  }
}

async function openForm() {
  _stopIdleTracking();
  if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }

  if (auth.isAdmin) {
  await settings.loadResponsibles();
  responsibles.value = settings.responsibles;
 }

  const data = ui.modalData as string | null;
  editId.value = data || null;
  error.value = '';
  form.value = {};
  draft.value = null;
  selectedTemplateId.value = 0;
  _skipUnlock = false;
  tab.value = 'single';

  loadingData.value = true;

  try {
    if (editId.value) {
      try {
        const lockRes = await api.getLock(editId.value);
        if (lockRes.locked && !lockRes.mine) {
          const proceed = await showLockWarning(lockRes, 'Редактирование');
          if (!proceed) { ui.close(); return; }
        }
        await api.setLock(editId.value);
        _startIdleTracking();

        _heartbeat = window.setInterval(async () => {
          if (!editId.value) return;
          try {
            const r = await api.getLock(editId.value);
            if (!r.locked || !r.mine) {
              if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
              _stopIdleTracking();
              _skipUnlock = true;

              const id = editId.value;

              let saved = false;
              let savedError = '';
              try {
                await onSubmit(true);
                saved = !error.value;
                if (!saved) savedError = error.value || 'ошибка сохранения';
              } catch (e: any) {
                savedError = e?.message || 'ошибка сохранения';
              }

              let draftSaved = false;
              if (!saved && id) {
                try {
                  await api.saveDraft(id, { ...form.value });
                  draftSaved = true;
                } catch (e) {
                  console.warn('Черновик не сохранён:', e);
                }
              }

              if (ui.activeModal === 'form') {
                await close();
              }

              const name = r.lockedBy || '';
              const pos = r.lockedByPosition;
              const displayUser = pos ? `${name} (${pos})` : (name || 'другой пользователь');

              let title: string;
              let icon: string;
              let message: string;

              if (saved) {
                title = 'Сессия завершена';
                icon = '<i class="fa-solid fa-circle-info" style="color: #0ea5e9;"></i>';
                message = `Ваши изменения были автоматически сохранены.\n\nПрибор забрал в работу: ${displayUser}.`;
              } else if (draftSaved) {
                title = 'Сессия завершена — данные сохранены как черновик';
                icon = '<i class="fa-solid fa-pencil" style="color: #d97706;"></i>';
                message =
                  `Обычное сохранение не удалось: ${savedError}.\n\n` +
                  `Но ваши данные сохранены как черновик — тот, кто забрал прибор, увидит их и сможет дозаполнить.\n\n` +
                  `Прибор забрал в работу: ${displayUser}.`;
              } else {
                title = 'Сессия завершена — сохранить не удалось';
                icon = '<i class="fa-solid fa-triangle-exclamation" style="color: #dc2626;"></i>';
                message =
                  `Не удалось сохранить изменения: ${savedError}.\n\n` +
                  `Прибор забрал в работу: ${displayUser}.\n\n` +
                  `Скопируйте важные данные, если они есть.`;
              }

              toast.warn(saved
                ? `Сессия завершена. Прибор забрал ${displayUser}.`
                : draftSaved
                  ? 'Сессия завершена. Данные сохранены как черновик.'
                  : 'Сессия завершена. Сохранить не удалось.');

              try {
                await showConfirm(message, {
                  icon, title, okText: 'ОК', hideCancel: true, okClass: 'btn-secondary',
                });
              } catch { /* ignore */ }
            }
          } catch { /* ignore */ }
        }, 3000);

      } catch (e: any) {
        if (e?.status === 429) {
          toast.warn('Секунду, синхронизация...');
          setTimeout(() => openForm(), 500);
          return;
        }
        if (e?.status === 409) {
          toast.error(`Заблокировано: ${e.response?.lockedBy || ''}`);
          ui.close();
          return;
        }
        toast.error('Ошибка проверки блокировки');
        ui.close();
        return;
      }

      let p: Pipette | null = pip.items.find(x => x.id === editId.value) || null;
      let fresh: api.GetByIdResponse | null = null;
      try {
        fresh = await api.getById(editId.value) as api.GetByIdResponse;
        if (fresh) p = fresh;
      } catch { /* ignore */ }
      if (!p) {
        toast.error('Оборудование не найдено');
        await close();
        return;
      }

      const f: Record<string, string> = {};
      for (const field of visibleFields.value) {
        let v: unknown = (p as Record<string, unknown>)[field.id];
        if (field.id === 'equipmentType') v = p.equipment_type || 'pipette';
        if (field.id === 'lastCalibration') {
          const m = String(p.last_calibration || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
          v = m ? `${m[1]}-${m[2]}-${m[3]}` : '';
        }
        if (field.id === 'result') v = p.last_result || 'pass';
        if (field.id === 'active') v = p.active ? 'true' : 'false';
        f[field.id] = v == null ? '' : String(v);
      }

      if (fresh?.draft) {
        draft.value = fresh.draft;
        Object.assign(f, fresh.draft.data);
      }
      form.value = f;
    } else {
      if (auth.isAdmin) {
        try { templates.value = await tplApi.getTemplates(); } catch { templates.value = []; }
      }

      let nextId = '';
      try {
        const res = await api.getNextId('pipette');
        nextId = res.nextId;
      } catch { /* ignore */ }

      const defaults: Record<string, string> = {
        id: nextId,
        lastCalibration: todayStr(),
        interval: '12',
        result: 'pass',
        active: 'true',
      };
      if (visibleFields.value.some(f => f.id === 'equipmentType')) defaults.equipmentType = 'pipette';
      if (!auth.isAdmin) {
        if (auth.user?.isActing && auth.user?.actingForName) {
          defaults.responsible = auth.user.actingForName;
          if (auth.user.actingDepartment) defaults.department = auth.user.actingDepartment;
        } else {
          defaults.responsible = auth.user?.fullName || '';
          if (auth.user?.onlyOwnDepartment && auth.user?.department) {
            defaults.department = auth.user.department;
          }
        }
      }
      form.value = defaults;
    }
  } finally {
    loadingData.value = false;
  }
}

watch(() => ui.activeModal, (v) => {
  if (v === 'form') openForm();
});

onUnmounted(async () => {
  _stopIdleTracking();
  if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
  if (editId.value && !_skipUnlock) {
    try { await api.releaseLock(editId.value); } catch { /* ignore */ }
  }
});

function applyTemplate(templateId: number) {
  selectedTemplateId.value = templateId;
  if (!templateId) return;
  const tpl = templates.value.find(t => t.id === templateId);
  if (!tpl) {
    toast.error('Шаблон не найден');
    return;
  }
  let applied = 0;
  for (const [fieldId, value] of Object.entries(tpl.data || {})) {
  if (value === undefined || value === null || value === '') continue;
  if (!(fieldId in form.value)) continue;
  if (form.value[fieldId] === String(value)) continue;

  const field = settings.fields.find(f => f.id === fieldId);
  if (field?.type === 'select') {
    const opts = getOptions(field);
    if (!opts.some(o => String(o.value) === String(value))) continue;
  }

  form.value[fieldId] = String(value);
  applied++;
}
  toast.success(`Применено полей: ${applied}`);
}

async function onSaveAsTemplate() {
  if (!auth.isAdmin) { toast.error('Только админ может создавать шаблоны'); return; }
  const name = await showPrompt(
    'Название шаблона',
    {
      icon: 'fa-floppy-disk', title: 'Сохранение шаблона',
      okText: 'Сохранить', okClass: 'btn-success',
      placeholder: 'Например: Eppendorf 1000 мкл',
      validator: (v) => v ? null : 'Укажите название',
    }
  );
  if (!name) return;

  const data: Record<string, string> = {};
  const skip = ['id', 'barcode', 'responsible', 'location'];
  for (const [k, v] of Object.entries(form.value)) {
    if (skip.includes(k)) continue;
    if (!v || !v.trim()) continue;
    data[k] = v;
  }
  if (Object.keys(data).length === 0) { toast.error('Заполните хотя бы одно поле'); return; }

  try {
    await tplApi.saveTemplate(name.trim(), data);
    toast.success('Шаблон сохранён');
    templates.value = await tplApi.getTemplates();
    const created = templates.value.find(t => t.name === name.trim());
    if (created) selectedTemplateId.value = created.id;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

async function discardDraft() {
  if (!editId.value) return;
  const ok = await showConfirm(
    'Отменить черновик? Данные, введённые другим пользователем, будут потеряны.',
    { icon: '↩️', title: 'Отмена черновика', okText: 'Отменить черновик', okClass: 'btn-warning' }
  );
  if (!ok) return;
  try {
    await api.deleteDraft(editId.value);
    toast.success('Черновик отменён');
    draft.value = null;
    await openForm();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

async function onSubmit(silent = false) {
  error.value = '';
  const payload = { ...form.value };
  
  if (isEdit.value && editId.value && !_skipUnlock) {
    const currentPipette = pip.items.find(p => p.id === editId.value);
    if (currentPipette?.updated_at) {
      payload.updatedAt = currentPipette.updated_at;
    }
  }

  const isFieldVisible = (fid: string) => visibleFields.value.some(f => f.id === fid);
  
  if (!isFieldVisible('model') && !String(payload.model || '').trim()) {
    payload.model = 'Не указана';
  }
  if (!isFieldVisible('lastCalibration') && !String(payload.lastCalibration || '').trim()) {
    payload.lastCalibration = todayStr();
  }
  if (!isFieldVisible('responsible') && !String(payload.responsible || '').trim()) {
    payload.responsible = auth.user?.isActing && auth.user?.actingForName
      ? auth.user.actingForName
      : (auth.user?.fullName || '');
  }
  
  const missing: string[] = [];
  for (const f of visibleFields.value) {
    if (!f.required) continue;
    if (!String(payload[f.id] || '').trim()) missing.push(f.label);
  }
  if (missing.length) { error.value = 'Заполните: ' + missing.join(', '); return; }

  saving.value = true;
  try {
    if (isEdit.value && editId.value) {
      const res = await api.updatePipette(editId.value, payload) as { idChanged?: boolean; newId?: string };
      if (!silent) {
        if (res.idChanged && res.newId) {
          toast.success(`Сохранено. Новый ID: ${res.newId}`);
        } else {
          toast.success('Оборудование обновлено');
        }
      }
    } else {
      const res = await api.createPipette(payload);
      if (!silent) {
        toast.success(`Оборудование создано (${res.id || payload.id})`);
      }
    }

    if (!silent) await close();
    await pip.loadPaged();
    await stats.load();
    } catch (e: unknown) {
    const err = e as { status?: number; response?: { code?: string; draftAuthor?: string }; message?: string };
    if (err?.status === 409 && err?.response?.code === 'draft_conflict' && editId.value) {
      const author = err.response?.draftAuthor || 'другого пользователя';
      const ok = await showConfirm(
        `Найден несохранённый черновик от ${author}.\n\nЕсли вы сохраните сейчас — черновик будет удалён, данные ${author} потеряются.\n\nПродолжить?`,
        { icon: '⚠️', title: 'Черновик от другого пользователя', okText: 'Перезаписать', okClass: 'btn-danger' }
      );
      if (!ok) { saving.value = false; return; }

      try {
        await api.deleteDraft(editId.value);
        if (isEdit.value) {
          const res2 = await api.updatePipette(editId.value, payload) as { idChanged?: boolean; newId?: string };
          if (!silent) {
            if (res2.idChanged && res2.newId) {
              toast.success(`Сохранено. Новый ID: ${res2.newId}`);
            } else {
              toast.success('Оборудование сохранено');
            }
          }
        } else {
          await api.createPipette(payload);
          if (!silent) toast.success('Оборудование сохранено');
        }

        if (!silent) await close();
        await pip.loadPaged();
        await stats.load();
      } catch (err2) {
        error.value = err2 instanceof Error ? err2.message : 'Ошибка перезаписи';
      }
    } else if (err?.status === 409 && editId.value) {
     
      delete payload.updatedAt;
      try {
        const res2 = await api.updatePipette(editId.value, payload) as { idChanged?: boolean; newId?: string };
        if (!silent) {
          toast.success(res2.idChanged && res2.newId ? `Сохранено. Новый ID: ${res2.newId}` : 'Оборудование обновлено');
        }
        if (!silent) await close();
        await pip.loadPaged();
        await stats.load();
      } catch (err2) {
        error.value = err2 instanceof Error ? err2.message : 'Ошибка сохранения';
      }
    } else {
      error.value = err.message || 'Ошибка сохранения';
    }
  } finally {
    saving.value = false;
  }
}
  
function onBulkCreated(_count: number) {
  _skipUnlock = true;
  ui.close();
}

async function close() {
  _stopIdleTracking();
  if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
  if (editId.value && !_skipUnlock) {
    try { await api.releaseLock(editId.value); } catch { /* ignore */ }
    _skipUnlock = true;
  }
  tab.value = 'single';   
  ui.close();
}
</script>
