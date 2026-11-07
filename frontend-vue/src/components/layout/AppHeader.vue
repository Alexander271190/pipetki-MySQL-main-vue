<template>
  <div class="header" :class="{ collapsed }" id="main-header">
    <div class="header-top">
      <h1>
        <span class="logo"><i class="fa-solid fa-flask-vial"></i></span>
        <span v-if="!collapsed" class="h1-full">Клинико-диагностическая лаборатория учёт оборудования и его поверок</span>
        <span v-else class="h1-short">КДЛ-оборудование</span>
      </h1>
      <div v-if="collapsed" class="header-mini-stats">
        <i class="fa-solid fa-circle-check" style="opacity:.8;"></i>
        <b>{{ stats.counters.ok }}</b>/{{ stats.counters.total }} в норме
      </div>
      <button
        class="header-collapse-btn"
        @click="toggleCollapse"
        :title="collapsed ? 'Развернуть шапку' : 'Свернуть шапку'"
      >
        <span class="collapse-label">
          <i class="fa-solid" :class="collapsed ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
          {{ collapsed ? 'Развернуть' : 'Свернуть' }}
        </span>
      </button>
    </div>

    <div class="header-body">
      <div class="header-stats">
        <div class="stat-card ok">
          <div class="num">{{ stats.counters.ok }}</div>
          <div class="label">В норме</div>
        </div>
        <div class="stat-card warn">
          <div class="num">{{ stats.counters.warn }}</div>
          <div class="label">Скоро поверка</div>
        </div>
        <div class="stat-card danger">
          <div class="num">{{ stats.counters.danger }}</div>
          <div class="label">Просрочены</div>
        </div>

        <div class="stat-card stat-total-card" id="stat-total-card">
          <div class="num" style="cursor:help;">{{ stats.counters.total }}</div>
          <div class="label">Всего</div>
          <div class="stat-tooltip">
            <div class="tooltip-row tooltip-total">
              <span>Всего:</span> <strong>{{ stats.counters.total }}</strong>
            </div>
            <div class="tooltip-row"><span>🟢 В норме:</span> <span>{{ stats.counters.ok }}</span></div>
            <div class="tooltip-row"><span>🟡 Скоро поверка:</span> <span>{{ stats.counters.warn }}</span></div>
            <div class="tooltip-row"><span>🔴 Просрочены:</span> <span>{{ stats.counters.danger }}</span></div>

            <div v-if="outsideCounters.total > 0" class="tooltip-outside">
              <div class="tooltip-row" style="font-weight:600; margin-bottom: 4px; color: var(--warn);">
                <span>Вне индикаторов:</span> <b>{{ outsideCounters.total }}</b>
              </div>
              <div style="font-size:0.78rem; line-height: 1.5; color: var(--text);">
                <div
                  v-for="cat in outsideCounters.categories"
                  :key="cat.label"
                  class="tooltip-row"
                  style="font-size:0.78rem;"
                >
                  <span>{{ cat.label }}:</span> <b>{{ cat.value }}</b>
                </div>
                <div
                  v-if="outsideCounters.other > 0"
                  class="tooltip-row"
                  style="font-size:0.78rem; color:#94a3b8;"
                >
                  <span>Прочее:</span> <b>{{ outsideCounters.other }}</b>
                </div>
                <div
                  v-if="outsideCounters.total > 0 && outsideCounters.categories.length === 0 && outsideCounters.other === 0"
                  class="tooltip-row"
                  style="font-size:0.78rem;"
                >
                  <span>— (нет данных)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="user-info">
        <span class="name">{{ auth.user?.fullName }}</span>
        <span class="position">{{ positionLine }}</span>
        <button
          v-if="auth.isImpersonating"
          class="btn btn-sm"
          @click="onStopImpersonate"
          title="Вернуться к своей учётной записи"
        >
          <i class="fa-solid fa-arrow-left"></i> Вернуться
        </button>
        <button class="btn btn-sm" @click="toggleTheme" :title="isDark ? 'Светлая тема' : 'Тёмная тема'">
          <i class="fa-solid" :class="isDark ? 'fa-sun' : 'fa-moon'"></i>
        </button>
        <button class="btn btn-sm" @click="onPassword">
          <i class="fa-solid fa-lock"></i> Пароль
        </button>
        <button class="btn btn-sm" @click="onLogout">Выйти</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useStatsStore } from '@/stores/stats';
import { useToastStore } from '@/stores/toast';
import { useModals } from '@/composables/useModals';

const auth = useAuthStore();
const stats = useStatsStore();
const toast = useToastStore();
const router = useRouter();

const collapsed = ref(false);
const isDark = ref(false);

const positionLine = computed(() => {
  const u = auth.user;
  if (!u) return '';
  let pos = u.position || '';
  if (u.isAdmin) pos += ' (админ)';
  else if (u.role === 'senior_lab') pos += ' (ст. лаборант)';
  if (u.isActing) {
    pos += u.actingForName ? ` · и.о. за ${u.actingForName}` : ' · и.о.';
  }
  if (u.department) pos += ' · ' + u.department;
  return pos;
});

const outsideCounters = computed(() => {
  const c = stats.counters;
  const sumIn = (c.ok || 0) + (c.warn || 0) + (c.danger || 0);
  const outside = (c.total || 0) - sumIn;

  const allCategories = [
    { label: '📦 На поверке',      value: c.sent || 0 },
    { label: '⏳ В процессе',       value: c.wip || 0 },
    { label: '❌ Брак',             value: c.fail || 0 },
    { label: '❓ Без даты поверки', value: c.unknownDate || 0 },
    { label: '⛔ Неактивные',       value: c.inactive || 0 },
  ];

  const categories = allCategories.filter(cat => cat.value > 0);
  const sumCategories = allCategories.reduce((sum, cat) => sum + cat.value, 0);
  const other = Math.max(0, outside - sumCategories);

  return { total: outside, categories, other };
});

function toggleCollapse() {
  collapsed.value = !collapsed.value;
  try { localStorage.setItem('pipette_header_collapsed', collapsed.value ? '1' : '0'); } catch { /* ignore */ }
}

function toggleTheme() {
  isDark.value = !isDark.value;
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light');
  try { localStorage.setItem('pipette_theme', isDark.value ? 'dark' : 'light'); } catch { /* ignore */ }
}

const modals = useModals();

function onPassword() {
  modals.openChangePassword('change');
}

function onLogout() {
  ui.close(); 
  auth.logout();
  toast.success('Вы вышли из системы');
  router.push('/login');
}

async function onStopImpersonate() {
  try {
    const { stopImpersonate } = await import('@/api/auth');
    await stopImpersonate();

    if (auth.originalUser && auth.originalToken) {
      auth.applySession({
        user: auth.originalUser,
        token: auth.originalToken,
      });

      await auth.resetOtherStores();       

      toast.success('Вернулись к своей учётной записи');
      window.dispatchEvent(new CustomEvent('auth:changed'));
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка');
  }
}

function initFromStorage() {
  try {
    const theme = localStorage.getItem('pipette_theme') || 'light';
    isDark.value = theme === 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    const collapse = localStorage.getItem('pipette_header_collapsed');
    if (window.innerWidth <= 768 && collapse !== '0') {
      collapsed.value = true;
    }
  } catch { /* ignore */ }
}

function onResize() {
  if (window.innerWidth > 768 && collapsed.value) {
    collapsed.value = false;
  }
}

onMounted(() => {
  initFromStorage();
  window.addEventListener('resize', onResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});
</script>
