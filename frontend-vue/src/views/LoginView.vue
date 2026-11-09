<template>
  <div class="auth-container" id="auth-container">
    <div class="auth-box">
      <div class="auth-box-overlay">
        <div class="auth-header">
          <div class="auth-title-sub">Клинико-диагностическая лаборатория</div>
        </div>
        <form class="auth-form" @submit.prevent="onSubmit">
          <div class="form-group">
            <label>Логин</label>
            <input
              v-model="loginStr"
              type="text"
              placeholder="Введите логин"
              autocomplete="username"
              :disabled="loading"
            />
          </div>
          <div class="form-group">
            <label>Пароль</label>
            <input
              v-model="password"
              type="password"
              placeholder="Введите пароль"
              autocomplete="current-password"
              :disabled="loading"
            />
          </div>
          <div class="auth-error" :style="{ visibility: error ? 'visible' : 'hidden', opacity: error ? 1 : 0 }">
            {{ error }}
          </div>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <i class="fa-solid" :class="loading ? 'fa-spinner fa-spin' : 'fa-right-to-bracket'"></i>
            <span>{{ loading ? 'Вход…' : 'Войти' }}</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useUiStore } from '@/stores/ui';
import { useAuthPullToRefresh } from '@/composables/useAuthPullToRefresh';

const loginStr = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const ui = useUiStore();

const auth = useAuthStore();
const toast = useToastStore();
const router = useRouter();

useAuthPullToRefresh();

onMounted(() => {
  try {
    const last = localStorage.getItem('pipette_last_login');
    if (last) loginStr.value = last;
  } catch { /* ignore */ }
});

async function onSubmit() {
  error.value = '';
  if (!loginStr.value.trim()) { error.value = 'Заполните поле «Логин»'; return; }
  loading.value = true;
  try {
    await auth.login(loginStr.value.trim(), password.value);
    try { localStorage.setItem('pipette_last_login', loginStr.value.trim()); } catch { /* ignore */ }

    if (auth.user?.mustSetPassword) {
      ui.open('changePassword', 'setup');
    } else if (auth.user?.mustChangePassword) {
      ui.open('changePassword', 'change');
    }

    toast.success(`Добро пожаловать, ${auth.user?.fullName || ''}!`);
    router.push('/');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка входа';
    password.value = '';
  } finally {
    loading.value = false;
  }
}
</script>
