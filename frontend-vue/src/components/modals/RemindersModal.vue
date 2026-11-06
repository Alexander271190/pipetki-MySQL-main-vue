<template>
  <div v-if="visible" class="reminder-overlay active">
    <div class="reminder-box">
      <div class="reminder-header">
        <div class="reminder-icon" v-html="icon"></div>
        <div class="reminder-title" :style="{ color: titleColor }">{{ title }}</div>
        <div class="reminder-subtitle">{{ subtitle }}</div>
      </div>

      <div v-html="bodyHtml"></div>

      <div class="reminder-actions">
        <button class="btn btn-secondary" @click="dismiss">Позже</button>
        <button class="btn btn-success" @click="confirm">
          <i class="fa-solid fa-check"></i> Понятно
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useStatsStore } from '@/stores/stats';
import { useSettingsStore } from '@/stores/settings';
import { useAuthStore } from '@/stores/auth';
import { calcStatus, daysLeft } from '@/utils/status';
import { esc } from '@/utils/string';
import { todayStr } from '@/utils/format';
import type { Pipette } from '@/types';

const stats = useStatsStore();
const settings = useSettingsStore();
const auth = useAuthStore();

const visible = ref(false);
const isDanger = ref(false);
const title = ref('');
const subtitle = ref('');
const titleColor = ref('#dc2626');
const icon = ref('<i class="fa-solid fa-bell"></i>');
const bodyHtml = ref('');

const STORAGE_PREFIX = 'pipette_last_reminder_';

onMounted(() => {
  setTimeout(() => check(), 600);
});

function check() {
  if (!auth.user) return;
  const key = STORAGE_PREFIX + auth.user.id;
  const last = localStorage.getItem(key);
  if (last === todayStr()) return;

  const danger = stats.reminders?.danger || [];
  const warn = stats.reminders?.warn || [];
  if (danger.length === 0 && warn.length === 0) return;

  isDanger.value = danger.length > 0;
  show(danger, warn);
}

function show(danger: Pipette[], warn: Pipette[]) {
  if (danger.length > 0) {
    icon.value = '<i class="fa-solid fa-triangle-exclamation"></i>';
    title.value = 'Просрочены поверки!';
    titleColor.value = '#dc2626';
    subtitle.value = `${danger.length} ${danger.length === 1 ? 'прибор требует' : 'приборов требуют'} срочной поверки`;
  } else {
    icon.value = '<i class="fa-solid fa-bell"></i>';
    title.value = 'Приближаются сроки поверки';
    titleColor.value = '#eab308';
    subtitle.value = `${warn.length} ${warn.length === 1 ? 'прибор подходит' : 'приборов подходят'} к сроку в течение ${settings.warnDays} дн.`;
  }

  let html = '';
  if (danger.length > 0) {
    html += `<div class="reminder-section"><div class="reminder-section-title danger"><i class="fa-solid fa-triangle-exclamation"></i> Просрочены (${danger.length})</div><ul class="reminder-list">`;
    [...danger].sort((a, b) => daysLeft(a) - daysLeft(b)).forEach(p => {
      const dl = daysLeft(p);
      const isFail = calcStatus(p) === 'fail';
      html += `<li class="danger">
        <div class="pip-info"><div class="pip-id">${esc(p.id)} — ${esc(p.model)}</div>
        <div class="pip-detail">${esc(p.department || 'без отдела')} · ${esc(p.responsible || '—')}</div></div>
        <div class="pip-days">${isFail ? 'брак' : 'просрочка ' + Math.abs(dl) + ' дн.'}</div>
      </li>`;
    });
    html += '</ul></div>';
  }
  if (warn.length > 0) {
    html += `<div class="reminder-section"><div class="reminder-section-title warn"><i class="fa-solid fa-clock"></i> Скоро поверка (${warn.length})</div><ul class="reminder-list">`;
    [...warn].sort((a, b) => daysLeft(a) - daysLeft(b)).forEach(p => {
      html += `<li class="warn">
        <div class="pip-info"><div class="pip-id">${esc(p.id)} — ${esc(p.model)}</div>
        <div class="pip-detail">${esc(p.department || 'без отдела')} · ${esc(p.responsible || '—')}</div></div>
        <div class="pip-days">${daysLeft(p)} дн.</div>
      </li>`;
    });
    html += '</ul></div>';
  }
  bodyHtml.value = html;
  visible.value = true;
}

function confirm() {
  visible.value = false;
  if (auth.user) localStorage.setItem(STORAGE_PREFIX + auth.user.id, todayStr());
}

function dismiss() { visible.value = false; }
</script>
