<template>
  <AppModal :visible="ui.activeModal === 'settings'" @close="close" modal-class="modal-lg modal-tall">
    <h2 id="settings-header">
      <button
        v-if="currentSection"
        type="button"
        class="settings-back-btn"
        @click="currentSection = null"
        title="Назад к списку"
      >
        <i class="fa-solid fa-arrow-left"></i>
      </button>
      <span>{{ currentSectionLabel || 'Настройки системы' }}</span>
    </h2>

    <!-- Меню разделов -->
    <div v-if="!currentSection" id="settings-list">
      <template v-for="group in visibleGroups" :key="group.group">
        <div class="settings-group-title">{{ group.group }}</div>
        <div class="settings-items">
          <button
            v-for="(item, idx) in group.items"
            :key="item.id"
            class="settings-item"
            :class="{ 'settings-item-last': idx === group.items.length - 1 }"
            @click="openSection(item.id)"
          >{{ item.label }}</button>
        </div>
      </template>
    </div>

    <!-- Содержимое раздела -->
    <div v-else id="settings-section">
      <div id="settings-section-content">
        <component :is="sectionComponent" @close="close" @back="currentSection = null" />
      </div>
    </div>

    <div class="form-actions" v-if="!currentSection">
      <button type="button" class="btn btn-secondary" @click="close">Закрыть</button>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, shallowRef, watch } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { useAuthStore, usePermissions } from '@/stores/auth';
import FieldsSettings from './FieldsSettings.vue';
import DepartmentsSettings from './DepartmentsSettings.vue';
import FiltersSettings from './FiltersSettings.vue';
import ExportSettings from './ExportSettings.vue';
import EquipmentTypesSettings from './EquipmentTypesSettings.vue';
import UsersSettings from './UsersSettings.vue';
import RolesSettings from './RolesSettings.vue';
import ViewTemplatesSettings from './ViewTemplatesSettings.vue';
import PrintersSettings from './PrintersSettings.vue';
import BarcodesSettings from './BarcodesSettings.vue';
import HelpSettings from './HelpSettings.vue';
import GeneralSettings from './GeneralSettings.vue';
import EquipmentGeneralSettings from './EquipmentGeneralSettings.vue';
import PasswordPolicySettings from './PasswordPolicySettings.vue';
import NotificationSettings from './NotificationSettings.vue';
import SecuritySettings from './SecuritySettings.vue';
import TableViewSettings from './TableViewSettings.vue';
  
const ui = useUiStore();
const auth = useAuthStore();
const perm = usePermissions();

interface Section { id: string; label: string; component?: unknown }
interface Group { group: string; items: Section[] }

const ALL_SECTIONS: Group[] = [
  {
  group: 'Оборудование и данные',
  items: [
    { id: 'fields',             label: 'Поля формы',             component: FieldsSettings },
    { id: 'departments',        label: 'Отделы',                 component: DepartmentsSettings },
    { id: 'filters',            label: 'Фильтры',                component: FiltersSettings },
    { id: 'export',             label: 'Печать документов',      component: ExportSettings },
    { id: 'equipment',          label: 'Типы оборудования',      component: EquipmentTypesSettings },
    { id: 'view-templates',     label: 'Шаблоны вида',           component: ViewTemplatesSettings },
    { id: 'equipment-general',  label: 'Общие настройки',        component: EquipmentGeneralSettings },
    { id: 'table-view',         label: 'Таблица и отображение',  component: TableViewSettings },
  ],
},
{
  group: 'Пользователи',
  items: [
    { id: 'users', label: 'Пользователи', component: UsersSettings },
    { id: 'roles', label: 'Роли',         component: RolesSettings },
  ],
},
{
  group: 'Безопасность',
  items: [
    { id: 'password-policy', label: 'Политика паролей',       component: PasswordPolicySettings },
    { id: 'notifications',   label: 'Уведомления',            component: NotificationSettings },
    { id: 'security',        label: 'Вход под пользователем', component: SecuritySettings },
  ],
},
{
    group: 'Печать и штрихкоды',
    items: [
      { id: 'printers', label: 'Принтеры этикеток', component: PrintersSettings },
      { id: 'barcodes', label: 'Штрихкоды',         component: BarcodesSettings },
    ],
  },
  {
    group: 'Общие',
    items: [
      { id: 'help',    label: 'Справка', component: HelpSettings },
      { id: 'general', label: 'Общие',   component: GeneralSettings },
    ],
  },
];

const currentSection = ref<string | null>(null);
const sectionComponent = shallowRef<unknown>(null);

const visibleGroups = computed<Group[]>(() => {
  return ALL_SECTIONS.map(g => ({
    group: g.group,
  items: g.items.filter(it => {
  if (it.id === 'users') return perm.canManageUsers.value || auth.isAdmin;
  if (it.id === 'roles') return perm.canManageRoles.value;   
  if (it.id === 'printers') return perm.canManagePrinters.value;  
  if (['equipment-general', 'table-view', 'password-policy', 'notifications', 'security'].includes(it.id)) {
  return auth.isAdmin;
}
  return true;
}),
  })).filter(g => g.items.length > 0);
});

const currentSectionLabel = computed(() => {
  if (!currentSection.value) return '';
  for (const g of ALL_SECTIONS) {
    const found = g.items.find(i => i.id === currentSection.value);
    if (found) return found.label;
  }
  return '';
});

watch(
  () => [ui.activeModal, ui.modalData],
  async ([modal, data]) => {
    if (modal !== 'settings') return;
    const target = typeof data === 'string' ? data : null;
    if (target) {
      openSection(target);
      ui.modalData = null;
    } else {
      currentSection.value = null;
      sectionComponent.value = null;
    }
  }
);

function openSection(id: string) {
  currentSection.value = id;
  for (const g of ALL_SECTIONS) {
    const found = g.items.find(i => i.id === id);
    if (found) {
      if (found.component) {
        sectionComponent.value = found.component;
      } else {
        sectionComponent.value = {
          template: `<div style="text-align:center;padding:40px;color:#94a3b8;">
            <div style="font-size:2.5rem;margin-bottom:12px;">🚧</div>
            <div>Раздел «${found.label}» — в следующем блоке</div>
          </div>`,
        };
      }
      return;
    }
  }
}

function close() { ui.close(); }
</script>
