<template>
  <AppModal :visible="ui.activeModal === 'userEdit'" @close="close" modal-class="modal-lg">
    <h2><i class="fa-solid" :class="isEdit ? 'fa-pen' : 'fa-user-plus'"></i> {{ isEdit ? 'Редактирование: ' + form.login : 'Новый пользователь' }}</h2>

    <div v-if="loading" style="text-align:center;padding:30px;">
      <i class="fa-solid fa-spinner fa-spin"></i>
    </div>

    <form v-else @submit.prevent="onSubmit">
      <div class="form-row">
        <div class="form-group"><label>Логин *</label><input v-model="form.login" :readonly="isEdit" :style="isEdit ? { background: '#f1f5f9' } : {}" /></div>
        <div class="form-group"><label>ФИО *</label><input v-model="form.fullName" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Должность *</label><input v-model="form.position" /></div>
        <div class="form-group"><label>Отдел</label>
          <select v-model="form.department">
            <option value="">— не указан —</option>
            <option v-for="d in settings.departments" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Роль</label>
          <select v-model="form.role">
            <option v-for="r in availableRoles" :key="r.value" :value="r.value">{{ r.name }}</option>
          </select>
        </div>
      </div>

      <small style="color:#64748b;display:block;margin-bottom:12px;font-size:.8rem;">
        Пароль генерируется автоматически. Пользователь обязан сменить его при первом входе.
      </small>

      <div class="info-block" style="margin-bottom:12px;">
        <div style="font-weight:700;margin-bottom:6px;"><i class="fa-solid fa-key"></i> Права доступа</div>
        <small style="display:block;margin-bottom:10px;font-size:.8rem;">Отмеченные права определяют, какие кнопки доступны пользователю.</small>
        <div class="btn-group">
          <button type="button" class="btn btn-secondary btn-sm" @click="applyPreset('none')"><i class="fa-solid fa-eraser"></i> Очистить</button>
          <button type="button" class="btn btn-secondary btn-sm" @click="applyPreset('user')"><i class="fa-solid fa-user"></i> Пользователь</button>
          <button type="button" class="btn btn-secondary btn-sm" @click="applyPreset('senior')"><i class="fa-solid fa-flask"></i> Ст. лаборант</button>
          <button type="button" class="btn btn-secondary btn-sm" @click="applyPreset('all')"><i class="fa-solid fa-star"></i> Все</button>
        </div>
        <div class="btn-group" v-if="presets.length > 0">
          <button
            v-for="p in presets" :key="p.id"
            class="btn btn-secondary btn-sm"
            @click="applyPresetArray(p.permissions)"
          >{{ p.name }}</button>
        </div>
        <div v-for="group in permissionGroups" :key="group.name" style="margin-top:12px;">
          <div class="section-title">{{ group.name }}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;">
            <label v-for="p in group.items" :key="p.key" style="display:flex;align-items:center;gap:6px;font-size:.85rem;cursor:pointer;">
              <input
                type="checkbox"
                :value="p.key"
                :checked="form.permissions.includes(p.key)"
                @change="togglePerm(p.key, ($event.target as HTMLInputElement).checked)"
                :disabled="isRoleAdmin"
              />
              {{ p.label }}
            </label>
          </div>
        </div>
      </div>

      <div class="warning-block" style="margin-bottom:10px;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;">
          <input v-model="form.onlyOwnDepartment" type="checkbox" style="width:18px;height:18px;" />
          Показывать только свой отдел
        </label>
      </div>

      <div class="info-block">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;">
          <input v-model="form.isActing" type="checkbox" style="width:18px;height:18px;" @change="onActingChange" />
          Исполняющий обязанности (и.о.)
        </label>
        <div v-if="form.isActing" style="margin-top:10px;">
          <label style="font-size:.85rem;font-weight:600;margin-bottom:4px;display:block;">За кого исполняет *</label>
          <select v-model="form.actingForId" style="width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;">
            <option value="">— выберите —</option>
            <option v-for="u in actingTargets" :key="u.id" :value="u.id">{{ u.fullName }} — {{ u.department || 'без отдела' }}</option>
          </select>
        </div>
      </div>

      <div v-if="error" class="auth-error" style="visibility:visible;opacity:1;">{{ error }}</div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="close">Отмена</button>
        <button type="submit" class="btn btn-success" :disabled="saving">
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
          {{ saving ? 'Сохранение…' : 'Сохранить' }}
        </button>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { useToastStore } from '@/stores/toast';
import { useSettingsStore } from '@/stores/settings';
import { useAuthStore } from '@/stores/auth';
import * as usersApi from '@/api/users';
import * as rolesApi from '@/api/roles';
import { ALL_PERMISSIONS } from '@/constants/permissions';
import type { Preset } from '@/api/users';
import type { Role } from '@/api/roles';

const ui = useUiStore();
const toast = useToastStore();
const settings = useSettingsStore();
const auth = useAuthStore();

interface FormShape {
  login: string;
  fullName: string;
  position: string;
  department: string;
  role: string;
  permissions: string[];
  onlyOwnDepartment: boolean;
  isActing: boolean;
  actingForId: string;
}

const form = ref<FormShape>({
  login: '', fullName: '', position: '', department: '', role: 'user',
  permissions: [], onlyOwnDepartment: false, isActing: false, actingForId: '',
});

const editId = ref<string | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const presets = ref<Preset[]>([]);
const roles = ref<Role[]>([]);
const actingTargets = ref<{ id: string; fullName: string; department?: string }[]>([]);

const isEdit = computed(() => !!editId.value);

const availableRoles = computed(() => roles.value.filter(r => {
  if (r.isAdmin && !auth.isAdmin) return false;
  return true;
}));

const isRoleAdmin = computed(() => {
  const r = roles.value.find(x => x.value === form.value.role);
  return !!r?.isAdmin;
});

const permissionGroups = computed(() => {
  const groups: Record<string, { key: string; label: string }[]> = {};
  for (const p of ALL_PERMISSIONS) {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push({ key: p.key, label: p.label.replace(/<[^>]+>/g, '').trim() });
  }
  return Object.entries(groups).map(([name, items]) => ({ name, items }));
});

async function loadAll() {
  loading.value = true;
  try {
    roles.value = await rolesApi.getRoles();
    try { presets.value = await usersApi.getPresets(); } catch { /* ignore */ }

    if (editId.value) {
      const users = await usersApi.getUsers();
      const u = users.find(x => x.id === editId.value);
      if (u) {
        form.value = {
          login: u.login,
          fullName: u.fullName,
          position: u.position,
          department: u.department || '',
          role: u.role,
          permissions: [...(u.extraPermissions || [])],
          onlyOwnDepartment: !!u.onlyOwnDepartment,
          isActing: !!u.isActing,
          actingForId: u.actingForId || '',
        };
        if (u.isActing) await onActingChange();
      }
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка загрузки');
  } finally {
    loading.value = false;
  }
}

watch(() => ui.activeModal, async (v) => {
  if (v !== 'userEdit') return;
  editId.value = (ui.modalData as string) || null;
  error.value = '';
  if (!isEdit.value) {
    form.value = {
      login: '', fullName: '', position: '', department: '', role: 'user',
      permissions: [], onlyOwnDepartment: false, isActing: false, actingForId: '',
    };
  }
  await loadAll();
});

async function onActingChange() {
  if (!form.value.isActing) { form.value.actingForId = ''; return; }
  if (actingTargets.value.length > 0) return;
  try {
    actingTargets.value = await usersApi.getActingTargets();
  } catch { /* ignore */ }
}

function togglePerm(key: string, checked: boolean) {
  const set = new Set(form.value.permissions);
  if (checked) set.add(key); else set.delete(key);
  form.value.permissions = [...set];
}

function applyPreset(kind: 'none' | 'user' | 'senior' | 'all') {
  const presets: Record<string, string[]> = {
    none: [],
    user: ['view_history', 'print_labels', 'export_data'],
    senior: ['add_pipette','edit_pipette','quick_calibration','transfer_pipette','bulk_change_responsible','bulk_send','bulk_return','export_data','scan_barcode','print_labels','view_history','view_audit'],
    all: ALL_PERMISSIONS.map((p: { key: string }) => p.key),
  };
  form.value.permissions = [...presets[kind]];
}

function applyPresetArray(list: string[]) { form.value.permissions = [...list]; }

async function onSubmit() {
  error.value = '';
  const missing: string[] = [];
  if (!form.value.login.trim()) missing.push('Логин');
  if (!form.value.fullName.trim()) missing.push('ФИО');
  if (!form.value.position.trim()) missing.push('Должность');
  if (missing.length) { error.value = 'Заполните: ' + missing.join(', '); return; }
  if (form.value.isActing && !form.value.actingForId) {
    error.value = 'Для и.о. нужно указать, за кого он исполняет';
    return;
  }

  saving.value = true;
  try {
    const payload = {
      login: form.value.login.trim(),
      fullName: form.value.fullName.trim(),
      position: form.value.position.trim(),
      department: form.value.department,
      role: form.value.role,
      onlyOwnDepartment: form.value.onlyOwnDepartment,
      extraPermissions: isRoleAdmin.value ? [] : form.value.permissions,
      isActing: form.value.isActing,
      actingForId: form.value.isActing ? form.value.actingForId : null,
    };

    if (isEdit.value && editId.value) {
      await usersApi.updateUser(editId.value, payload);
      toast.success('Пользователь обновлён');
    } else {
      const res = await usersApi.createUser(payload);
      toast.success('Пользователь создан');
      ui.open('tempPassword', { login: res.login, fullName: form.value.fullName, password: res.tempPassword });
    }
    ui.close();
    // Перезагрузка списка
    const { useUiStore: _ } = await import('@/stores/ui');
    window.dispatchEvent(new CustomEvent('users:reload'));
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

function close() { ui.close(); }
</script>
