<template>
  <div>
    <p style="color:#64748b;font-size:.88rem;margin:0 0 14px;">
      Загрузите документ (.docx или .pdf) для каждого раздела.
    </p>

    <div class="help-actions-bar">
      <button class="btn btn-primary btn-sm" @click="openUpload(null)">
        <i class="fa-solid fa-plus"></i> Добавить раздел
      </button>
      <button class="btn btn-warning btn-sm" @click="resetFactory">
        <i class="fa-solid fa-rotate-left"></i> Сбросить к заводской
      </button>
    </div>

    <div v-if="loading" style="text-align:center;padding:30px;">
      <i class="fa-solid fa-spinner fa-spin"></i>
    </div>

    <div v-else-if="sections.length === 0" class="help-empty">Разделов пока нет.</div>

    <table v-else class="help-admin-table">
      <thead>
        <tr>
          <th>Название раздела</th>
          <th style="width:200px;">Файл</th>
          <th style="width:80px;">Показ</th>
          <th style="width:80px;">Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in sortedSections" :key="s.slug">
          <td><strong>{{ s.title }}</strong></td>
          <td>
            <span v-if="!s.filePath" style="font-size:.8rem;color:#94a3b8;">— нет файла —</span>
            <span v-else-if="fileExistsMap.get(s.slug) === false"
            style="font-size:.8rem;color:#dc2626;font-weight:600;"
            title="Файл прописан в БД, но отсутствует на сервере">
        <i class="fa-solid fa-triangle-exclamation"></i> {{ fileName(s.filePath) }} — ОТСУТСТВУЕТ
            </span>
            <span v-else style="font-size:.8rem;color:#0369a1;">
         <i class="fa-solid fa-file"></i> {{ fileName(s.filePath) }}
        </span>
      </td>
          <td style="text-align:center;">{{ s.enabled ? '✅' : '❌' }}</td>
          <td style="text-align:center;">
            <button class="row-actions-btn" @click.stop="openActions($event, s)">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
          </td>
        </tr>
      </tbody>
    </table>

        <!-- Модалка загрузки -->
    <AppModal :visible="showUpload" @close="showUpload = false" modal-class="modal-compact">
      <h2><i class="fa-solid fa-upload"></i> {{ editingSlug ? 'Изменить раздел' : 'Новый раздел' }}</h2>
      <div class="form-group">
        <label>Название *</label>
        <input v-model="uploadTitle" type="text" placeholder="Например: Вход в систему" />
      </div>
      <div class="form-group">
        <label>Документ (PDF/DOCX) {{ editingSlug ? '' : '*' }}</label>
        <input ref="fileInput" type="file" accept=".pdf,.docx,.doc" />
        <small v-if="editingSlug" style="color:#64748b;display:block;margin-top:4px;">Оставьте пустым, чтобы сохранить текущий</small>
      </div>
      <div class="form-group">
        <label>Права доступа (кто увидит раздел)</label>
        <div class="hup-multiselect-wrap">
          <div class="hup-multiselect-trigger" @click="togglePermsMenu">
            <span>Выбрано: {{ selectedPerms.length }} прав</span>
            <i class="fa-solid fa-caret-down"></i>
          </div>
          <div v-if="permsMenuOpen" class="hup-multiselect-menu">
            <div v-for="group in permGroups" :key="group.name">
              <div style="font-size:.7rem;font-weight:700;color:#94a3b8;margin:8px 0 4px 4px;text-transform:uppercase;">{{ group.name }}</div>
              <label v-for="p in group.items" :key="p.key" style="display:flex;align-items:center;gap:8px;padding:4px 8px;cursor:pointer;">
                <input type="checkbox" :value="p.key" v-model="selectedPerms" />
                <span v-html="p.label"></span>
              </label>
            </div>
          </div>
        </div>
        <small style="color:#64748b;margin-top:6px;display:block;">
          Если ничего не выбрано — раздел видят все.
        </small>
      </div>
      <div v-if="uploadError" class="auth-error" style="visibility:visible;opacity:1;">{{ uploadError }}</div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="showUpload = false">Отмена</button>
        <button type="button" class="btn btn-success" :disabled="uploading" @click="onUpload">
          <i class="fa-solid" :class="uploading ? 'fa-spinner fa-spin' : 'fa-upload'"></i> Сохранить
        </button>
      </div>
    </AppModal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useToastStore } from '@/stores/toast';
import { useUiStore } from '@/stores/ui';
import { showConfirm } from '@/composables/useConfirm';
import * as api from '@/api/help';
import type { HelpSection } from '@/api/help';
import { ALL_PERMISSIONS } from '@/constants/permissions';


defineEmits<{ (e: 'close'): void }>();

const toast = useToastStore();
const ui = useUiStore();

const sections = ref<HelpSection[]>([]);
const loading = ref(false);
const showUpload = ref(false);
const editingSlug = ref<string | null>(null);
const uploadTitle = ref('');
const uploadError = ref('');
const uploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
  
const fileExistsMap = ref<Map<string, boolean>>(new Map());

const selectedPerms = ref<string[]>([]);
const permsMenuOpen = ref(false);

const permGroups = computed(() => {
  const groups: Record<string, { key: string; label: string }[]> = {};
  for (const p of ALL_PERMISSIONS) {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push({ key: p.key, label: p.label });
  }
  return Object.entries(groups).map(([name, items]) => ({ name, items }));
});

async function checkFiles() {
  const map = new Map<string, boolean>();
  await Promise.all(sections.value.map(async s => {
    if (!s.filePath) { map.set(s.slug, false); return; }
    const url = s.filePath.startsWith('/') ? s.filePath : '/' + s.filePath;
    try {
      const r = await fetch(url, { method: 'HEAD' });
      map.set(s.slug, r.ok);
    } catch { map.set(s.slug, false); }
  }));
  fileExistsMap.value = map;
}

const sortedSections = computed(() => [...sections.value].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));

function fileName(path: string): string {
  return path.split('/').pop() || path;
}

async function load() {
  loading.value = true;
  try {
    sections.value = await api.getHelpSections();
    await checkFiles();                                   
  }
  catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
  finally { loading.value = false; }
}

onMounted(load);

function openUpload(slug: string | null) {
  editingSlug.value = slug;
  const sec = slug ? sections.value.find(s => s.slug === slug) : null;
  uploadTitle.value = sec?.title || '';
  uploadError.value = '';
  selectedPerms.value = sec?.requiredPermissions ? [...sec.requiredPermissions] : [];
  permsMenuOpen.value = false;
  showUpload.value = true;
  if (fileInput.value) fileInput.value.value = '';
}
function openActions(e: MouseEvent, s: HelpSection) {
  ui.openRowActions(e.currentTarget as HTMLElement, [
    { label: '<i class="fa-solid fa-pen"></i> Заменить файл', action: () => openUpload(s.slug) },
    { label: '<i class="fa-solid fa-trash"></i> Удалить', class: 'item-danger', action: () => onDelete(s.slug) },
  ]);
}

async function onUpload() {
  uploadError.value = '';
  if (!uploadTitle.value.trim()) { uploadError.value = 'Введите название'; return; }
  const file = fileInput.value?.files?.[0];
  if (!editingSlug.value && !file) { uploadError.value = 'Выберите файл'; return; }

  uploading.value = true;
  try {
    const fd = new FormData();
    fd.append('title', uploadTitle.value.trim());
    if (editingSlug.value) fd.append('slug', editingSlug.value);
    fd.append('requiredPermissions', JSON.stringify(selectedPerms.value));   
    fd.append('enabled', 'true');
    if (file) fd.append('file', file);

    await api.uploadHelpFile(fd);
    toast.success('Сохранено');
    showUpload.value = false;
    load();
  } catch (e) {
    uploadError.value = e instanceof Error ? e.message : 'Ошибка';
  } finally {
    uploading.value = false;
  }
}

async function onDelete(slug: string) {
  const ok = await showConfirm('Удалить раздел?', {
    icon: '<i class="fa-solid fa-trash"></i>', title: 'Удаление', okText: 'Удалить', okClass: 'btn-danger',
  });
  if (!ok) return;
  try {
    await api.deleteHelpSection(slug);
    toast.success('Удалён');
    load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

async function resetFactory() {
  const ok = await showConfirm('Сбросить справку к заводской?', {
    icon: '<i class="fa-solid fa-triangle-exclamation"></i>', title: 'Сброс', okText: 'Сбросить', okClass: 'btn-warning',
  });
  if (!ok) return;
  try {
    await api.resetHelpToFactory();
    toast.success('Справка восстановлена');
    load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

function togglePermsMenu() {
  permsMenuOpen.value = !permsMenuOpen.value;
}
</script>
