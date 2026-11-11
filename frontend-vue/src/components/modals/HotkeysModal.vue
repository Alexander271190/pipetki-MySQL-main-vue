<template>
  <AppModal :visible="ui.activeModal === 'help'" @close="close" modal-class="modal-compact" >
    <div style="max-width:500px;height:80vh;display:flex;flex-direction:column;">
      <h2><i class="fa-solid fa-book-open"></i> Инструкция по работе с системой</h2>

      <div style="flex:1;overflow-y:auto;padding-right:5px;">
        <div v-if="loading" style="text-align:center;padding:30px;color:#94a3b8;">
          <i class="fa-solid fa-spinner fa-spin"></i>
        </div>

        <div v-else-if="sections.length === 0" style="text-align:center;padding:30px;color:#94a3b8;">
          Разделы справки пока не добавлены.
        </div>

<div v-else>
  <template v-for="s in sections" :key="s.slug">
    <!-- Нет файла -->
    <div
      v-if="!s.filePath"
      class="help-link-item help-link-missing"
      @click="onClick(s)"
    >
      <i
        class="fa-solid fa-triangle-exclamation"
        :style="{ fontSize: '1.4rem', color: '#d97706', width: '24px', textAlign: 'center' }"
      ></i>
      <span style="font-weight:500;color:var(--text-muted);flex:1;">{{ cleanTitle(s.title) }}</span>
      <span style="font-size:.7rem;color:#d97706;font-weight:600;">нет файла</span>
    </div>

    <!-- Есть файл -->
    <a
      v-else
      :href="s.filePath.startsWith('/') ? s.filePath : '/' + s.filePath"
      target="_blank"
      rel="noopener"
      class="help-link-item"
      @click.prevent="onClick(s, $event)"
    >
      <i
        class="fa-solid"
        :class="s.filePath.toLowerCase().endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-word'"
        :style="{
          fontSize: '1.4rem',
          width: '24px',
          textAlign: 'center',
          color: s.filePath.toLowerCase().endsWith('.pdf') ? '#dc2626' : '#0ea5e9'
        }"
      ></i>
      <span style="font-weight:500;flex:1;">{{ cleanTitle(s.title) }}</span>
    </a>
  </template>
</div>
      </div>

      <div class="form-actions" style="margin-top:15px;justify-content:flex-end;">
        <button type="button" class="btn btn-secondary" @click="close">Закрыть</button>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { useToastStore } from '@/stores/toast';
import { getVisibleHelp } from '@/api/help';
import type { HelpSection } from '@/api/help';

const ui = useUiStore();
const toast = useToastStore();

const sections = ref<HelpSection[]>([]);
const loading = ref(false);

watch(() => ui.activeModal, async (v) => {
  if (v !== 'help') return;
  loading.value = true;
  try { sections.value = await getVisibleHelp(); }
  catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка'); }
  finally { loading.value = false; }
});

function cleanTitle(t: string): string {
  return t.replace(/\{icon:.*?\}/g, '').trim();
}

async function onClick(s: HelpSection, e?: MouseEvent) {
  // Ctrl+клик / Cmd+клик / Shift+клик / средняя кнопка — пусть браузер откроет <a> сам
  if (e && (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)) return;

  if (!s.filePath) {
    toast.warn(`Раздел «${cleanTitle(s.title)}» пока без файла. Обратитесь к администратору.`);
    return;
  }
  const url = s.filePath.startsWith('/') ? s.filePath : '/' + s.filePath;

  // HEAD-проверка: файл физически есть?
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) {
      toast.error(`Файл раздела «${cleanTitle(s.title)}» не найден на сервере.`);
      return;
    }
  } catch {
    toast.error('Не удалось проверить файл');
    return;
  }

  window.open(url, '_blank');
}
  
function close() { ui.close(); }
</script>
