<template>
  <div>
    <h3>Управление ролями</h3>
    <p style="color:#64748b;margin-bottom:12px;">Настройте права доступа для каждой роли.</p>

    <table class="field-settings-table">
      <thead>
        <tr>
          <th>Название</th>
          <th style="text-align:center;">Код</th>
          <th style="text-align:center;">Админ</th>
          <th style="text-align:center;">Права</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in roles" :key="r.id">
          <td>
            <strong>{{ r.name }}</strong>
            <i v-if="r.isSystem" class="fa-solid fa-lock" style="color:#94a3b8;font-size:.8em;" title="Системная"></i>
          </td>
          <td style="text-align:center;color:#64748b;font-family:monospace;">{{ r.value }}</td>
          <td style="text-align:center;">
            <span v-if="r.isAdmin" style="color:#dc2626;font-weight:bold;">Да</span>
            <span v-else>—</span>
          </td>
          <td style="text-align:center;">{{ r.isAdmin ? 'Все' : r.permissions.length + ' шт.' }}</td>
          <td style="text-align:center;">
            <button class="row-actions-btn" @click.stop="openActions($event, r)">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="form-actions">
      <button class="btn btn-primary" style="margin-right:auto;" @click="openEdit(null)">
        <i class="fa-solid fa-plus"></i> Добавить роль
      </button>
      <button type="button" class="btn btn-secondary" @click="$emit('close')">Закрыть</button>
    </div>

    <RoleEditModal :role="editingRole" :visible="showEdit" @close="closeEdit" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToastStore } from '@/stores/toast';
import { useUiStore, type MenuItem } from '@/stores/ui';
import { showConfirm } from '@/composables/useConfirm';
import * as api from '@/api/roles';
import type { Role } from '@/api/roles';
import RoleEditModal from './RoleEditModal.vue';

defineEmits<{ (e: 'close'): void }>();

const toast = useToastStore();
const ui = useUiStore();

const roles = ref<Role[]>([]);
const showEdit = ref(false);
const editingRole = ref<Role | null>(null);

async function load() {
  try { roles.value = await api.getRoles(); }
  catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
}

onMounted(load);

function openEdit(r: Role | null) {
  editingRole.value = r;
  showEdit.value = true;
}

function closeEdit() { showEdit.value = false; editingRole.value = null; }
function onSaved() { closeEdit(); load(); }

function openActions(e: MouseEvent, r: Role) {
  const items: MenuItem[] = [{ label: '<i class="fa-solid fa-pen"></i> Редактировать', action: () => openEdit(r) }];
  if (!r.isSystem && r.value !== 'admin') {
    items.push({
      label: '<i class="fa-solid fa-trash"></i> Удалить',
      class: 'item-danger',
      action: () => deleteRole(r),
    });
  }
  ui.openRowActions(e.currentTarget as HTMLElement, items);
}

async function deleteRole(r: Role) {
  const ok = await showConfirm(`Удалить роль «${r.name}»?`, {
    icon: '<i class="fa-solid fa-trash"></i>', title: 'Удаление', okText: 'Удалить', okClass: 'btn-danger',
  });
  if (!ok) return;
  try {
    await api.deleteRole(r.id);
    toast.success('Удалена');
    load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}
</script>
