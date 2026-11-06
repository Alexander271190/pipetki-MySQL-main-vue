<template>
  <div class="main-content visible">
    <AppHeader />
    <div class="container">
      <div class="alert-banner" :class="{ show: showBanner }">
        <span class="icon"><i class="fa-solid fa-triangle-exclamation"></i></span>
        <span>{{ bannerText }}</span>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppHeader from './AppHeader.vue';
import { useStatsStore } from '@/stores/stats';
import { useSettingsStore } from '@/stores/settings';

const stats = useStatsStore();
const settings = useSettingsStore();

const showBanner = computed(() => {
  return (stats.counters.danger || 0) > 0 || (stats.counters.warn || 0) > 0;
});

const bannerText = computed(() => {
  const c = stats.counters;
  if ((c.danger || 0) > 0) {
    return `У ${c.danger} ${c.danger === 1 ? 'единицы' : 'единиц'} проблема с поверкой!`;
  }
  if ((c.warn || 0) > 0) {
    return `У ${c.warn} ${c.warn === 1 ? 'единицы' : 'единиц'} подходит срок поверки в течение ${settings.warnDays} дн.`;
  }
  return '';
});
</script>
