<template>
  <div>
    <h3>Управление пользователями</h3>
    <div style="margin-bottom:12px;position:relative;">
      <input
        v-model="search"
        type="text"
        placeholder="Поиск по логину, ФИО, должности, отделу…"
        style="width:100%;padding:9px 12px 9px 36px;border:1px solid var(--border-hard);border-radius:8px;background:var(--card);color:var(--text);"
      />
      <i class="fa-solid fa-magnifying-glass" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-faint);"></i>
    </div>

    <div v-if="loading" style="text-align:center;padding:30px;">
      <i class="fa-solid fa-spinner fa-spin"></i>
    </div>

    <table v-else class="field-settings-table" style="margin-bottom:20px;">
      <thead>
        <tr>
          <th>Логин</th>
          <th>ФИО</th>
          <th>Должность</th>
          <th>Отдел</th>
          <th>Роль</th>
          <th>Права</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in filteredUsers" :key="u.id">
          <td>{{ u.login }}</td>
          <td>{{ u.fullName }}</td>
          <td>{{ u.position }}<span v-if="u.isActing" style="color:#eab308;font-weight:600;"> (и.о.)</span></td>
          <td>{{ u.department || '—' }}</td>
          <td>{{ u.roleName || u.role }}</td>
          <td style="text-align:center;">
            <span v-if="u.isAdmin" style="color:#dc2626;font-weight:700;">все</span>
            <span v-else-if="(u.extraPermissions || []).length === 0" style="color:#94a3b8;">нет</span>
            <span v-else>{{ (u.extraPermissions || []).length }}</span>
          </td>
          <td style="text-align:center;">
            <button class="row-actions-btn" @click.stop="openActions($event, u)" title="Действия">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
          </td>
        </tr>
        <tr v-if="filteredUsers.length === 0">
          <td colspan="7" style="text-align:center;padding:20px;color:var(--text-faint);">Никого не найдено</td>
        </tr>
      </tbody>
    </table>

    <div class="form-actions">
      <button class="btn btn-primary" style="margin-right:auto;" @click="onAdd">
        <i class="fa-solid fa-plus"></i> Добавить пользователя
      </button>
      <button type="button" class="btn btn-secondary" @click="$emit('close')">Закрыть</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useToastStore } from '@/stores/toast';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import { showConfirm } from '@/composables/useConfirm';
import * as api from '@/api/users';
import type { FullUser } from '@/api/users';

defineEmits<{ (e: 'close'): void }>();

const toast = useToastStore();
const ui = useUiStore();
const auth = useAuthStore();
const settings = useSettingsStore();
const users = ref<FullUser[]>([]);
const loading = ref(false);
const search = ref('');

const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return users.value;
  return users.value.filter(u =>
    [u.login, u.fullName, u.position, u.department, u.roleName, u.role]
      .map(x => String(x || '').toLowerCase())
      .join(' ').includes(q)
  );
});

async function load() {
  loading.value = true;
  try { users.value = await api.getUsers(); }
  catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
  finally { loading.value = false; }
}

onMounted(() => {
  load();
  window.addEventListener('users:reload', load);
});
onUnmounted(() => {
  window.removeEventListener('users:reload', load);
});

function onAdd() {
  ui.open('userEdit', null);
}

function editUser(id: string) {
  ui.open('userEdit', id);
}

function openActions(e: MouseEvent, u: FullUser) {
  const items = [];
  const isBuiltinAdmin = u.login === 'admin';
  const isMe = u.id === auth.user?.id;

  if (!(isBuiltinAdmin && !isMe)) {
    items.push({ label: '<i class="fa-solid fa-pen"></i> Редактировать', action: () => editUser(u.id) });
  }
  items.push({
    label: '<i class="fa-solid fa-list-check"></i> Настроить видимые поля',
    action: () => ui.open('userView', u.id),
  });

  if (!isMe) {
    items.push({ divider: true });
    if (!(isBuiltinAdmin && !isMe)) {
      items.push({
        label: '<i class="fa-solid fa-right-to-bracket"></i> Войти как этот пользователь',
        class: 'item-warning',
        action: () => impersonate(u.id),
      });
    }
    items.push({
      label: '<i class="fa-solid fa-key"></i> Сбросить пароль',
      class: 'item-warning',
      action: () => resetPwd(u),
    });
    if (!isBuiltinAdmin) {
      items.push({ divider: true });
      items.push({
        label: '<i class="fa-solid fa-trash"></i> Удалить',
        class: 'item-danger',
        action: () => deleteUser(u),
      });
    }
  }
  ui.openRowActions(e.currentTarget as HTMLElement, items);
}

async function impersonate(id: string) {
  try {
    const { impersonate: api_imp } = await import('@/api/auth');
    const result = await api_imp(id);

    const originalUser = auth.originalUser || auth.user;
    const originalToken = auth.originalToken || auth.token;

    auth.applySession({
      user: result.user,
      token: result.token,
      originalUser: originalUser || undefined,
      originalToken: originalToken || undefined,
    });

    await auth.resetOtherStores();       

    toast.success('Вы вошли как ' + result.user.fullName);
    window.dispatchEvent(new CustomEvent('auth:changed'));
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}
  
async function resetPwd(u: FullUser) {
  const ok = await showConfirm(`Сбросить пароль пользователя «${u.login}»?`, {
    icon: '<i class="fa-solid fa-key"></i>', title: 'Сброс пароля', okText: 'Сбросить', okClass: 'btn-warning',
  });
  if (!ok) return;
  try {
    const res = await api.resetUserPassword(u.id);
    ui.open('tempPassword', { login: res.login, fullName: u.fullName, password: res.tempPassword });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

async function deleteUser(u: FullUser) {
  const ok = await showConfirm(`Удалить пользователя «${u.fullName}»? Действие необратимо.`, {
    icon: '<i class="fa-solid fa-user"></i>', title: 'Удаление', okText: 'Удалить', okClass: 'btn-danger',
  });
  if (!ok) return;
  try {
    await api.deleteUser(u.id);
    toast.success('Удалён');
    api.invalidateUsersCache();
    settings.invalidateResponsibles();   
    load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}
</script>
