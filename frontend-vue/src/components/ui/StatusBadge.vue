<template>
  <span class="status-badge" :class="`status-${status}`">
    <span class="status-dot"></span>
    <i class="fa-solid" :class="icon"></i> {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Status } from '@/types';
import { STATUS_LABELS, STATUS_ICONS } from '@/constants';

const props = defineProps<{ status: Status }>();
const label = computed(() => STATUS_LABELS[props.status] || props.status);
const icon  = computed(() => STATUS_ICONS[props.status] || '');
</script>
