<template>
  <AppModal :visible="ui.activeModal === 'help'" @close="close" modal-class="modal-compact" >
    <div style="max-width:500px;height:80vh;display:flex;flex-direction:column;">
      <h2><i class="fa-solid fa-book-open"></i> Справка</h2>

      <div style="flex:1;overflow-y:auto;padding-right:5px;">
        <div v-if="loading" style="text-align:center;padding:30px;color:#94a3b8;">
          <i class="fa-solid fa-spinner fa-spin"></i>
        </div>

        <div v-else-if="sections.length === 0" style="text-align:center;padding:30px;color:#94a3b8;">
          Разделы справки пока не добавлены.
        </div>

        <div v-else>
          <div
            v-for="s in sections"
            :key="s.slug"
            class="help-link-item"
            :class="{ 'help-link-missing': !s.filePath }"
            @click="onClick(s)"
          >
            <i
              class="fa-solid"
              :class="s.filePath && s.filePath.toLowerCase().endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-word'"
              :style="{ fontSize: '1.4rem', color: s.filePath ? '#0ea5e9' : '#d97706', width: '24px', textAlign: 'center' }"
            ></i>
            <span style="font-weight:500;flex:1;">{{ cleanTitle(s.title) }}</span>
            <span v-if="!s.filePath" style="font-size:.7rem;color:#d97706;font-weight:600;">нет файла</span>
          </div>
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

async function onClick(s: HelpSection) {
  if (!s.filePath) {
    toast.warn(`Раздел «${cleanTitle(s.title)}» пока без файла.`);
    return;
  }
  const url = s.filePath.startsWith('/') ? s.filePath : '/' + s.filePath;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (!res.ok) {
      toast.error(`Файл раздела «${cleanTitle(s.title)}» не найден.`);
      return;
    }
    window.open(url, '_blank');
  } catch {
    toast.error('Не удалось проверить файл');
  }
}

function close() { ui.close(); }
</script>
