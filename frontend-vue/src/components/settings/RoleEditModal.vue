<template>
  <AppModal :visible="visible" @close="$emit('close')" modal-class="modal-lg">
     <div style="max-height: 75vh; overflow-y: auto; padding-right: 4px;">
        <h2 style="margin-top:0;"><i class="fa-solid fa-user-shield"></i> {{ role ? 'Редактирование роли' : 'Новая роль' }}</h2>

      <form @submit.prevent="onSubmit">
        <div class="form-group">
          <label>Название роли *</label>
          <input v-model="name" type="text" placeholder="Например: Заведующий лабораторией" />
        </div>

        <div v-if="auth.isAdmin" class="form-group" style="padding:10px;background:var(--card-alt);border-radius:6px;">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
            <input v-model="isAdmin" type="checkbox" :disabled="role?.value === 'admin'" style="width:18px;height:18px;" />
            <span style="font-weight:600;color:#dc2626;">Дать полные права администратора</span>
          </label>
        </div>

        <div class="form-group" style="max-height:35vh;overflow-y:auto;border:1px solid var(--border-hard);padding:12px;border-radius:8px;" :style="{ opacity: isAdmin ? 0.5 : 1, pointerEvents: isAdmin ? 'none' : 'auto' }">
          <div v-for="group in permissionGroups" :key="group.name" style="margin-bottom:12px;">
            <div style="font-size:.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:6px;">{{ group.name }}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;">
              <label v-for="p in group.items" :key="p.key" style="display:flex;align-items:center;gap:6px;font-size:.85rem;cursor:pointer;">
                <input type="checkbox" :value="p.key" :checked="permissions.includes(p.key)" @change="togglePerm(p.key, ($event.target as HTMLInputElement).checked)" />
                <span>{{ p.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <div v-if="error" class="auth-error" style="visibility:visible;opacity:1;margin-bottom:12px;">{{ error }}</div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">Отмена</button>
          <button type="submit" class="btn btn-success" :disabled="saving">
            <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i> Сохранить
          </button>
        </div>
      </form>

    </div>
  
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { ALL_PERMISSIONS } from '@/constants/permissions';
import * as api from '@/api/roles';
import type { Role } from '@/api/roles';

const props = defineProps<{ role: Role | null; visible: boolean }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>();

const auth = useAuthStore();
const toast = useToastStore();

const name = ref('');
const isAdmin = ref(false);
const permissions = ref<string[]>([]);
const saving = ref(false);
const error = ref('');

const permissionGroups = computed(() => {
  const groups: Record<string, { key: string; label: string }[]> = {};
  for (const p of ALL_PERMISSIONS) {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push({ key: p.key, label: p.label.replace(/<[^>]+>/g, '').trim() });
  }
  return Object.entries(groups).map(([name, items]) => ({ name, items }));
});

watch(() => props.visible, (v) => {
  if (v) {
    if (props.role) {
      name.value = props.role.name;
      isAdmin.value = props.role.isAdmin;
      permissions.value = [...props.role.permissions];
    } else {
      name.value = '';
      isAdmin.value = false;
      permissions.value = [];
    }
    error.value = '';
  }
});

function togglePerm(key: string, checked: boolean) {
  const set = new Set(permissions.value);
  if (checked) set.add(key); else set.delete(key);
  permissions.value = [...set];
}

async function onSubmit() {
  error.value = '';
  if (!name.value.trim()) { error.value = 'Укажите название'; return; }

  saving.value = true;
  try {
    const payload = { name: name.value.trim(), permissions: isAdmin.value ? [] : permissions.value, isAdmin: isAdmin.value };
    if (props.role) await api.updateRole(props.role.id, payload);
    else await api.createRole(payload);
    toast.success('Роль сохранена');
    emit('saved');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка';
  } finally {
    saving.value = false;
  }
}
</script>
