<template>
  <div class="pagination" :style="{ display: pip.total > pip.limit ? 'flex' : 'none' }">
    <button class="pagination-btn" :disabled="pip.page <= 1" @click="pip.changePage(-1)">← Назад</button>
    <span class="pagination-info">
      Стр. <strong>{{ pip.page }}</strong> из <strong>{{ pip.totalPages }}</strong>
      · <span>{{ pip.total }}</span> записей
    </span>
    <button class="pagination-btn" :disabled="pip.page >= pip.totalPages" @click="pip.changePage(1)">Вперёд →</button>
  </div>
</template>

<script setup lang="ts">
import { usePipettesStore } from '@/stores/pipettes';
const pip = usePipettesStore();
</script>
