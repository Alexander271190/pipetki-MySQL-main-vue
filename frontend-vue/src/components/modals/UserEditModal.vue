<template>
  <AppModal :visible="ui.activeModal === 'userEdit'" @close="closeAndBack" modal-class="modal-lg">
    <h2 style="display:flex;align-items:center;gap:10px;">
      <button
        type="button"
        class="settings-back-btn"
        @click="closeAndBack"
        title="Назад к списку пользователей"
        style="flex-shrink:0;"
      >
        <i class="fa-solid fa-arrow-left"></i>
      </button>
      <i class="fa-solid" :class="isEdit ? 'fa-pen' : 'fa-user-plus'"></i>
      <span>{{ isEdit ? 'Редактирование: ' + form.login : 'Новый пользователь' }}</span>
    </h2>

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
            <option
              v-if="form.department && !settings.departments.includes(form.department)"
              :value="form.department"
              style="color:#dc2626;"
            >
              {{ form.department }} ⚠ (нет в списке)
           </option>
        </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Роль</label>
          <div style="display:flex;gap:8px;">
           <select
             v-model="form.role"
             :disabled="!canEditRole"
             :title="!canEditRole ? 'Только встроенный admin может менять роль' : ''"
             style="flex:1;"
             >
             <option v-for="r in availableRoles" :key="r.value" :value="r.value">{{ r.name }}</option>
            </select>
            <button
              v-if="perm.canManageRoles.value"
              type="button"
              class="btn btn-secondary"
              @click="openQuickRoleModal"
              title="Создать новую роль"
              style="white-space:nowrap;"
            >
              <i class="fa-solid fa-plus"></i> Новая роль
            </button>
          </div>
        </div>
        <div class="form-group"><label>Строк на странице</label>
          <select v-model="form.pageSize">
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="500">500</option>
          </select>
        </div>
      </div>

      <small style="color:#64748b;display:block;margin-bottom:12px;font-size:.8rem;">
        Пароль генерируется автоматически. Пользователь обязан сменить его при первом входе.
      </small>

      <div class="info-block" style="margin-bottom:12px;">
        <div style="font-weight:700;margin-bottom:6px;"><i class="fa-solid fa-key"></i> Права доступа</div>
        <small style="display:block;margin-bottom:10px;font-size:.8rem;">
          Отмеченные права определяют, <strong>какие кнопки и действия доступны пользователю</strong>.
          Если право не выдано — элемент скрыт. По умолчанию все права выключены.
          Для роли «Администратор» все права выдаются автоматически.
        </small>

        <!-- Стандартные пресеты -->
        <div style="margin-bottom:14px;">
          <div class="card-title-sm">Стандартные:</div>
          <div class="btn-group">
            <button type="button" class="btn btn-secondary btn-sm" @click="applyPreset('none')">
              <i class="fa-solid fa-eraser"></i> Очистить
            </button>
            <button type="button" class="btn btn-secondary btn-sm" @click="applyPreset('user')">
              <i class="fa-solid fa-user"></i> Пользователь
            </button>
            <button type="button" class="btn btn-secondary btn-sm" @click="applyPreset('senior')">
              <i class="fa-solid fa-flask"></i> Ст. лаборант
            </button>
            <button type="button" class="btn btn-secondary btn-sm" @click="applyPreset('all')">
              <i class="fa-solid fa-star"></i> Все права
            </button>
          </div>

          <!-- Мои пресеты -->
          <div class="card-title-sm" style="margin-top:10px;">Мои пресеты:</div>
          <div class="btn-group" style="align-items:center;flex-wrap:wrap;">
            <template v-if="presets.length > 0">
              <div
                v-for="p in presets"
                :key="p.id"
                class="flex-row-sm"
                style="background:#f1f5f9;border-radius:6px;padding:2px 4px;"
              >
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  style="border:none;background:transparent;padding:4px 6px;"
                  @click="applyPresetArray(p.permissions)"
                  :title="'Применить пресет: ' + p.name"
                >{{ p.name }}</button>
                <button
                  type="button"
                  class="btn btn-danger btn-sm"
                  style="padding:2px 4px;border-radius:4px;background:transparent;color:#dc2626;border:none;"
                  @click="deleteCustomPreset(p.id)"
                  title="Удалить пресет"
                ><i class="fa-solid fa-xmark"></i></button>
              </div>
            </template>
            <span v-else class="text-faint-sm">Нет сохранённых пресетов</span>
          </div>

          <button
            type="button"
            class="btn btn-outline btn-sm"
            style="margin-top:8px;"
            @click="saveCurrentPermsAsPreset"
          >
            <i class="fa-solid fa-floppy-disk"></i> Сохранить текущие как пресет
          </button>
        </div>

        <!-- Группы прав -->
        <div id="usr-permissions">
          <div v-for="group in permissionGroups" :key="group.name" style="margin-bottom:12px;">
            <div class="section-title">{{ group.name }}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;">
              <label
                v-for="p in group.items"
                :key="p.key"
                style="display:flex;align-items:center;gap:6px;font-size:.85rem;cursor:pointer;"
              >
                <input
                  type="checkbox"
                  class="usr-perm-cb"
                  :value="p.key"
                  :checked="form.permissions.includes(p.key)"
                  @change="togglePerm(p.key, ($event.target as HTMLInputElement).checked)"
                  :disabled="isRoleAdmin"
                />
                <span v-html="p.label"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="warning-block" style="margin-bottom:10px;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;">
          <input v-model="form.onlyOwnDepartment" type="checkbox" style="width:18px;height:18px;" />
          <i class="fa-solid fa-eye-slash"></i>
          Показывать только свой отдел
        </label>
        <small style="display:block;margin-top:6px;margin-left:26px;font-size:.78rem;">
          Если включено — пользователь увидит только пипетки своего отдела. Отдел должен быть указан выше.
        </small>
      </div>

      <div class="info-block">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;">
          <input v-model="form.isActing" type="checkbox" style="width:18px;height:18px;" @change="onActingChange" />
          <i class="fa-solid fa-user-clock"></i>
          Исполняющий обязанности (и.о.)
        </label>
        <small style="display:block;margin-top:6px;margin-left:26px;font-size:.78rem;">
          И.о. видит оборудование отдела основного и работает под его ФИО.
        </small>
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
        <button type="button" class="btn btn-secondary" @click="resetForm">
          <i class="fa-solid fa-rotate-left"></i> Очистить форму
        </button>
        <button type="submit" class="btn btn-success" :disabled="saving">
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
          {{ saving ? 'Сохранение…' : 'Сохранить' }}
        </button>
      </div>
    </form>

    <!-- 🆕 Модалка быстрого создания роли -->
    <div v-if="quickRoleVisible" class="modal-overlay active" style="z-index:200;" @click.self="closeQuickRole">
      <div class="modal" style="max-width:450px;" @click.stop>
        <h2><i class="fa-solid fa-user-shield"></i> Новая роль</h2>

        <div class="form-group">
          <label>Название роли *</label>
          <input
            id="quick-role-input"
            v-model="quickRoleName"
            type="text"
            placeholder="Например: Администратор 1"
            @keydown.enter.prevent="saveQuickRole"
          />
        </div>

        <div class="form-group" style="padding:10px;background:var(--card-alt);border-radius:6px;">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
            <input v-model="quickRoleIsAdmin" type="checkbox" style="width:18px;height:18px;" />
            <span style="font-weight:600;color:var(--text-strong);">Дать все права администратора</span>
          </label>
          <small style="color:var(--text-muted);margin-top:4px;display:block;margin-left:28px;">
            Пользователи с этой ролью получат полный доступ к системе. Отдельные права настраивать не нужно.
          </small>
        </div>

        <div v-if="quickRoleError" class="auth-error" style="visibility:visible;opacity:1;">
          {{ quickRoleError }}
        </div>

        <div class="form-actions" style="margin-top:16px;">
          <button type="button" class="btn btn-secondary" @click="closeQuickRole">Отмена</button>
          <button
            type="button"
            class="btn btn-success"
            @click="saveQuickRole"
            :disabled="quickRoleSaving"
          >
            <i class="fa-solid" :class="quickRoleSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
            {{ quickRoleSaving ? 'Создание…' : 'Создать' }}
          </button>
        </div>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { useToastStore } from '@/stores/toast';
import { useSettingsStore } from '@/stores/settings';
import { useAuthStore } from '@/stores/auth';
import { showConfirm } from '@/composables/useConfirm';
import { showPrompt } from '@/composables/usePrompt';
import { apiRequest } from '@/api/client';
import * as usersApi from '@/api/users';
import * as rolesApi from '@/api/roles';
import { ALL_PERMISSIONS } from '@/constants/permissions';
import { usePermissions } from '@/stores/auth';
import type { Preset } from '@/api/users';
import type { Role } from '@/api/roles';

const ui = useUiStore();
const toast = useToastStore();
const settings = useSettingsStore();
const auth = useAuthStore();
const perm = usePermissions();
  
interface FormShape {
  login: string;
  fullName: string;
  position: string;
  department: string;
  role: string;
  pageSize: string;
  permissions: string[];
  onlyOwnDepartment: boolean;
  isActing: boolean;
  actingForId: string;
}

const form = ref<FormShape>({
  login: '', fullName: '', position: '', department: '', role: 'user', pageSize: '100',
  permissions: [], onlyOwnDepartment: false, isActing: false, actingForId: '',
});

const editId = ref<string | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const presets = ref<Preset[]>([]);
const roles = ref<Role[]>([]);
const actingTargets = ref<{ id: string; fullName: string; department?: string }[]>([]);

// Быстрое создание роли
const quickRoleVisible = ref(false);
const quickRoleName = ref('');
const quickRoleIsAdmin = ref(false);
const quickRoleSaving = ref(false);
const quickRoleError = ref('');

const isEdit = computed(() => !!editId.value);
const editingAdminUser = computed(() => {
  if (!isEdit.value) return false;
  return !!(form.value.role && roles.value.find(r => r.value === form.value.role)?.isAdmin);
});

const canEditRole = computed(() => {
  if (!isEdit.value) return true;
  if (!editingAdminUser.value) return true;
  return auth.user?.login === 'admin';   
});
  
const availableRoles = computed(() =>
  roles.value.filter(r => !r.isAdmin || auth.isAdmin)
);

const isRoleAdmin = computed(() => {
  const r = roles.value.find(x => x.value === form.value.role);
  return !!r?.isAdmin;
});

const permissionGroups = computed(() => {
  const groups: Record<string, { key: string; label: string }[]> = {};
  for (const p of ALL_PERMISSIONS) {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push({ key: p.key, label: p.label });
  }
  return Object.entries(groups).map(([name, items]) => ({ name, items }));
});

async function loadAll() {
  loading.value = true;
  try {
    roles.value = await rolesApi.getCachedRoles();
    try { presets.value = await usersApi.getCachedPresets(); } catch { /* ignore */ }

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
          pageSize: '100',
          permissions: [...(u.extraPermissions || [])],
          onlyOwnDepartment: !!u.onlyOwnDepartment,
          isActing: !!u.isActing,
          actingForId: u.actingForId || '',
        };
        // Проверка «битого» отдела
        if (u.department && !settings.departments.includes(u.department)) {
        toast.error(`Отдел «${u.department}» отсутствует в справочнике`);
       }
        if (u.isActing) await onActingChange();

        try {
          const prefs = await apiRequest<{ defaultPageSize?: number }>(`/settings/user-preferences/${editId.value}`);
          if (prefs?.defaultPageSize) form.value.pageSize = String(prefs.defaultPageSize);
        } catch { /* ignore */ }
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
  editId.value = typeof ui.modalData === 'string' ? ui.modalData : null;
  error.value = '';
  if (!isEdit.value) resetForm();
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
  const presetMap: Record<string, string[]> = {
    none: [],
    user: ['view_history', 'print_labels', 'export_data'],
    senior: ['add_pipette','edit_pipette','quick_calibration','transfer_pipette','bulk_change_responsible','bulk_send','bulk_return','export_data','scan_barcode','print_labels','view_history','view_audit'],
    all: ALL_PERMISSIONS.map(p => p.key),
  };
  form.value.permissions = [...presetMap[kind]];
}

function applyPresetArray(list: string[]) {
  form.value.permissions = [...list];
}

async function saveCurrentPermsAsPreset() {
  const selected = [...form.value.permissions];
  if (selected.length === 0) {
    toast.error('Отметьте хотя бы одно право для сохранения');
    return;
  }
  const name = await showPrompt('Название нового пресета', {
    icon: 'fa-floppy-disk',
    title: 'Сохранить пресет',
    okText: 'Сохранить',
    placeholder: 'Например: Врач КДЛ',
    validator: (v) => v ? null : 'Укажите название',
  });
  if (!name) return;
  try {
    await usersApi.createPreset(name.trim(), selected);
    toast.success('Пресет сохранён');
    usersApi.invalidatePresetsCache();
    presets.value = await usersApi.getCachedPresets(true);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

async function deleteCustomPreset(id: number) {
  const ok = await showConfirm('Удалить этот пресет?', {
    icon: '<i class="fa-solid fa-trash"></i>',
    title: 'Удаление',
    okText: 'Удалить',
    okClass: 'btn-danger',
  });
  if (!ok) return;
  try {
    await usersApi.deletePreset(id);
    usersApi.invalidatePresetsCache();
    presets.value = presets.value.filter(p => p.id !== id);
    toast.success('Пресет удалён');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

// 🆕 Быстрое создание роли
function openQuickRoleModal() {
  quickRoleVisible.value = true;
  quickRoleName.value = '';
  quickRoleIsAdmin.value = false;
  quickRoleError.value = '';
  setTimeout(() => {
    document.querySelector<HTMLInputElement>('#quick-role-input')?.focus();
  }, 100);
}

function closeQuickRole() {
  quickRoleVisible.value = false;
  quickRoleName.value = '';
  quickRoleIsAdmin.value = false;
  quickRoleError.value = '';
  quickRoleSaving.value = false;
}

async function saveQuickRole() {
  quickRoleError.value = '';
  const name = quickRoleName.value.trim();
  if (!name) {
    quickRoleError.value = 'Укажите название роли';
    return;
  }

  quickRoleSaving.value = true;
  try {
    await apiRequest('/roles', 'POST', {
      name,
      permissions: [],
      isAdmin: quickRoleIsAdmin.value,
    });

    rolesApi.invalidateRolesCache();
    roles.value = await rolesApi.getCachedRoles(true);

    const newRole = roles.value.find(r => r.name === name);
    if (newRole) {
      form.value.role = newRole.value;
    }

    toast.success('Роль создана');
    closeQuickRole();
  } catch (e) {
    quickRoleError.value = e instanceof Error ? e.message : 'Ошибка создания';
    quickRoleSaving.value = false;
  }
}

async function savePageSize(userId: string) {
  try {
    let existing: Record<string, unknown> = {};
    try { existing = await apiRequest(`/settings/user-preferences/${userId}`); } catch { /* ignore */ }
    const merged = { ...existing, defaultPageSize: parseInt(form.value.pageSize, 10) || 100 };
    await apiRequest(`/settings/user-preferences/${userId}`, 'PUT', merged);
  } catch { /* ignore */ }
}

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

    let savedId = editId.value;

    if (isEdit.value && editId.value) {
      // ═══ EDIT ═══
      await usersApi.updateUser(editId.value, payload);
      toast.success('Пользователь обновлён');
      usersApi.invalidateUsersCache();
      settings.invalidateResponsibles(); 
      
      if (savedId) await savePageSize(savedId);

      if (savedId === auth.user?.id) {
         await auth.refreshUser();
      }
      closeAndBack();
      window.dispatchEvent(new CustomEvent('users:reload'));
    } else {
      // ═══ CREATE ═══
      const res = await usersApi.createUser(payload);
      usersApi.invalidateUsersCache();
      savedId = res.id;
      toast.success('Пользователь создан');
      settings.invalidateResponsibles();

      if (savedId) await savePageSize(savedId);

      window.dispatchEvent(new CustomEvent('users:reload'));

      // Показываем модалку с паролем и НЕ закрываем — пользователь прочитает/скопирует
      ui.open('tempPassword', {
        login: res.login,
        fullName: form.value.fullName,
        password: res.tempPassword,
      });
      closeAndBack();
      saving.value = false;
      return;                       
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

function resetForm() {
  form.value = {
    login: '', fullName: '', position: '', department: '', role: 'user', pageSize: '100',
    permissions: [], onlyOwnDepartment: false, isActing: false, actingForId: '',
  };
  error.value = '';
}

function closeAndBack() {
  ui.close();
  ui.open('settings', 'users');
}

function onStorageChange(e: StorageEvent) {
  if (e.key === 'pipette_session') {
    // Сессия изменилась в другой вкладке — сбрасываем кеш пресетов
    usersApi.invalidatePresetsCache();
    usersApi.invalidateUsersCache();
    if (ui.activeModal === 'userEdit') {
      void loadAll();
    }
  }
}

onMounted(() => {
  window.addEventListener('storage', onStorageChange);
});

onUnmounted(() => {
  window.removeEventListener('storage', onStorageChange);
});
</script>
