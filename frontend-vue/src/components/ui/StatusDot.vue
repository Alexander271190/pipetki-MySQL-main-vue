<template>
  <span class="status-dot-inline" :style="{ background: color }" :title="label"></span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Status } from '@/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/constants';

const props = defineProps<{ status: Status }>();
const color = computed(() => STATUS_COLORS[props.status] || '#94a3b8');
const label = computed(() => STATUS_LABELS[props.status] || props.status);
</script>
