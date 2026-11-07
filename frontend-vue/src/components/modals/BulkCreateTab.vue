<template>
  <div>
    <div class="bulk-toolbar">
      <button type="button" class="btn btn-primary btn-sm" @click="addRow">
        <i class="fa-solid fa-plus"></i> Добавить строку
      </button>
      <span class="bulk-counter">Строк: <b>{{ rows.length }}</b> / {{ MAX_ROWS }}</span>
    </div>

    <div class="bulk-table-wrap">
      <table class="bulk-table">
        <thead>
          <tr>
            <th style="width:40px;">#</th>
            <th v-for="f in fields" :key="f.id">{{ f.label }}<span v-if="f.required"> *</span></th>
            <th style="width:50px;"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="i">
            <td class="bulk-num">{{ i + 1 }}</td>
            <td v-for="f in fields" :key="f.id">
              <select
                v-if="f.type === 'select'"
                :value="row[f.id]"
                class="bulk-input"
                @change="updateField(i, f.id, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="opt in getOptions(f, row[f.id])" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
              </select>
              <input
                v-else-if="f.type === 'date'"
                :value="row[f.id]"
                type="date"
                class="bulk-input"
                @input="updateField(i, f.id, ($event.target as HTMLInputElement).value)"
              />
              <input
                v-else-if="f.type === 'number'"
                :value="row[f.id]"
                type="number"
                class="bulk-input"
                :min="f.id === 'interval' ? 1 : undefined"
                :max="f.id === 'interval' ? 120 : undefined"
                @input="updateField(i, f.id, ($event.target as HTMLInputElement).value)"
              />
              <input
                v-else
                :value="row[f.id]"
                type="text"
                class="bulk-input"
                :placeholder="f.label"
                @input="updateField(i, f.id, ($event.target as HTMLInputElement).value)"
              />
            </td>
            <td>
              <button type="button" class="bulk-del-btn" @click="removeRow(i)" title="Удалить">
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="rows.length === 0" class="bulk-empty">Нажмите «Добавить строку», чтобы начать.</div>

    <div v-if="error" class="auth-error" style="margin-top:12px;visibility:visible;opacity:1;">{{ error }}</div>

    <div class="form-actions" style="justify-content:space-between;margin-top:16px;">
      <button type="button" class="btn btn-secondary" @click="$emit('cancel')">Отмена</button>
      <button type="button" class="btn btn-success" :disabled="saving" @click="onSave">
        <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
        Создать {{ rows.length }} {{ plural(rows.length) }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { useAuthStore, usePermissions } from '@/stores/auth';
import { usePipettesStore } from '@/stores/pipettes';
import { useStatsStore } from '@/stores/stats';
import { useToastStore } from '@/stores/toast';
import { showConfirm } from '@/composables/useConfirm';
import { todayStr } from '@/utils/format';
import * as bulkApi from '@/api/bulk';
import type { FieldConfig } from '@/api/settings';
import { getResponsibles } from '@/api/users';

const emit = defineEmits<{ (e: 'cancel'): void; (e: 'created', count: number): void }>();

const settings = useSettingsStore();
const auth = useAuthStore();
const perm = usePermissions();
const pip = usePipettesStore();
const stats = useStatsStore();
const toast = useToastStore();
const responsibles = ref<string[]>([]);

const MAX_ROWS = 100;

const rows = ref<Record<string, string>[]>([]);
const saving = ref(false);
const error = ref('');

const fields = computed<FieldConfig[]>(() => {
  return settings.fields
    .filter(f => f.enabled && f.id !== 'id')
    .sort((a, b) => (a.order || 0) - (b.order || 0));
});

function plural(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'единицу';
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'единицы';
  return 'единиц';
}

function getOptions(f: FieldConfig, currentVal: string | undefined): { value: string; label: string }[] {
  let opts: { value: string; label: string }[] = [];

  if (f.id === 'department') {
    let deps = settings.departments;
    if (auth.user?.isActing && auth.user?.actingDepartment) deps = [auth.user.actingDepartment];
    else if (!auth.isAdmin && auth.user?.onlyOwnDepartment && auth.user?.department) {
      deps = [auth.user.department];
    }
    opts = deps.map(d => ({ value: d, label: d }));
    if (!f.required) opts.unshift({ value: '', label: '—' });
  } else if (f.id === 'equipmentType') {
    opts = settings.equipmentTypes.map(t => ({ value: t.value, label: t.label }));
  } else if (f.id === 'result') {
    opts = [
      { value: 'pass', label: '✅ Годен' },
      { value: 'fail', label: '❌ Брак' },
      { value: 'wip',  label: '⏳ В процессе' },
    ];
  } else if (f.id === 'active') {
    opts = [
      { value: 'true',  label: '✅ В работе' },
      { value: 'false', label: '⛔ Не используется' },
    ];
  } else if (f.id === 'responsible') {
  if (auth.isAdmin) {
    const current = currentVal || '';
    const names = new Set<string>(responsibles.value);
    if (current) names.add(current);
    opts = [...names]
      .sort((a, b) => a.localeCompare(b, 'ru'))
      .map(n => ({ value: n, label: n }));
    if (!f.required) opts.unshift({ value: '', label: '— не указан —' });
  } else if (auth.user?.isActing && auth.user?.actingForName) {
    opts = [{ value: auth.user.actingForName, label: auth.user.actingForName + ' (основной)' }];
  } else {
    const self = auth.user?.fullName || '';
    opts = self ? [{ value: self, label: self }] : [{ value: '', label: '—' }];
  }
}

  if (currentVal && !opts.some(o => String(o.value) === currentVal)) {
    opts.push({ value: currentVal, label: `${currentVal} ⚠` });
  }
  return opts;
}

function makeDefaultRow(): Record<string, string> {
  const row: Record<string, string> = {};
  for (const f of fields.value) {
    if (f.id === 'lastCalibration') row[f.id] = todayStr();
    else if (f.id === 'interval') {
      const t = settings.equipmentTypes.find(x => x.value === 'pipette');
      row[f.id] = String(t?.interval || 12);
    } else if (f.id === 'equipmentType') row[f.id] = 'pipette';
    else if (f.id === 'result') row[f.id] = 'pass';
    else if (f.id === 'active') row[f.id] = 'true';
    else if (f.id === 'responsible') {
      if (!auth.isAdmin) {
        if (auth.user?.isActing && auth.user?.actingForName) row[f.id] = auth.user.actingForName;
        else row[f.id] = auth.user?.fullName || '';
      } else {
        row[f.id] = '';
      }
    } else if (f.id === 'department') {
      if (!auth.isAdmin) {
        if (auth.user?.isActing && auth.user?.actingDepartment) row[f.id] = auth.user.actingDepartment;
        else if (auth.user?.onlyOwnDepartment && auth.user?.department) row[f.id] = auth.user.department;
        else row[f.id] = '';
      } else {
        row[f.id] = '';
      }
    } else {
      row[f.id] = f.default || '';
    }
  }
  return row;
}

function addRow() {
  if (rows.value.length >= MAX_ROWS) { toast.error(`Максимум ${MAX_ROWS} строк`); return; }
  rows.value.push(makeDefaultRow());
}

function removeRow(i: number) {
  rows.value.splice(i, 1);
}

function updateField(i: number, fieldId: string, value: string) {
  if (i < 0 || i >= rows.value.length) return;
  rows.value[i][fieldId] = value;

  // Автообновление interval при смене equipmentType
  if (fieldId === 'equipmentType') {
    const t = settings.equipmentTypes.find(x => x.value === value);
    const iv = t?.interval && t.interval > 0 ? t.interval : 12;
    rows.value[i].interval = String(iv);
  }
}

async function onSave() {
  error.value = '';
  if (rows.value.length === 0) { error.value = 'Добавьте хотя бы одну строку'; return; }

  // Валидация обязательных
  const errors: string[] = [];
  rows.value.forEach((r, i) => {
    const n = i + 1;
    for (const f of fields.value) {
      if (!f.required) continue;
      if (!String(r[f.id] || '').trim()) {
        errors.push(`Строка ${n}: ${f.label}`);
      }
    }
  });

  if (errors.length > 0) {
    error.value = 'Заполните: ' + errors.slice(0, 5).join('; ')
      + (errors.length > 5 ? ` (+${errors.length - 5})` : '');
    return;
  }

  if (rows.value.length >= 20) {
    const ok = await showConfirm(
      `Создать ${rows.value.length} единиц одной операцией?`,
      { icon: '📦', title: 'Пакетное создание', okText: 'Создать', okClass: 'btn-primary' }
    );
    if (!ok) return;
  }

  saving.value = true;
  try {
    const res = await bulkApi.bulkCreate(rows.value);
    toast.success(`Создано ${res.created || rows.value.length} единиц`);
    emit('created', res.created || rows.value.length);
    await pip.loadPaged();
    await stats.load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка создания';
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  if (auth.isAdmin) {
    try {
      const users = await getResponsibles();
      responsibles.value = users.map(u => u.fullName).filter(Boolean);
    } catch { /* ignore */ }
  }
  addRow();
});
</script>
