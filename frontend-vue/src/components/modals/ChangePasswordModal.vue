<template>
  <AppModal :visible="ui.activeModal === 'changePassword'" @close="close">
    <h2><i class="fa-solid fa-lock"></i> {{ isSetup ? 'Установка пароля администратора' : 'Смена пароля' }}</h2>

    <div v-if="forced" class="warning-block" style="margin-bottom:16px;">
      {{ isSetup
        ? 'Это первый вход в систему. Задайте пароль администратора, соответствующий требованиям ниже.'
        : 'Администратор выдал вам разовый пароль. Для продолжения работы задайте новый пароль.' }}
    </div>

    <form @submit.prevent="onSubmit">
      <div v-if="!isSetup" class="form-group">
        <label>Текущий пароль *</label>
        <input v-model="currentPwd" type="password" autocomplete="current-password" placeholder="Введите текущий пароль" />
      </div>
      <div class="form-group">
        <label>Новый пароль *</label>
        <input v-model="newPwd" type="password" autocomplete="new-password" placeholder="Введите новый пароль" />
      </div>
      <div class="form-group">
        <label>Подтверждение пароля *</label>
        <input v-model="confirmPwd" type="password" autocomplete="new-password" placeholder="Повторите пароль" />
      </div>

      <div style="background:#f1f5f9;border-radius:8px;padding:10px 14px;font-size:.82rem;color:#475569;line-height:1.6;">
        <strong>Требования к паролю:</strong>
        <ul style="margin:6px 0 0 20px;padding:0;">
          <li>Минимум 8 символов</li>
          <li>Хотя бы одна строчная и одна заглавная буква</li>
          <li>Хотя бы одна цифра</li>
          <li>Хотя бы один спецсимвол (! @ # $ % ^ &amp; * и т.п.)</li>
        </ul>
      </div>

      <div v-if="error" class="auth-error" style="margin-top:12px;visibility:visible;opacity:1;">{{ error }}</div>

      <div class="form-actions">
        <button v-if="!forced" type="button" class="btn btn-secondary" @click="close">Отмена</button>
        <button type="submit" class="btn btn-success" :disabled="loading">
          <i class="fa-solid" :class="loading ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
          {{ loading ? 'Сохранение…' : (isSetup ? 'Установить пароль' : 'Сохранить пароль') }}
        </button>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import * as authApi from '@/api/auth';

const ui = useUiStore();
const auth = useAuthStore();
const toast = useToastStore();

const currentPwd = ref('');
const newPwd = ref('');
const confirmPwd = ref('');
const error = ref('');
const loading = ref(false);

const isSetup = computed(() => ui.modalData === 'setup');
const forced = computed(() => {
  if (auth.isImpersonating) return false;
  return !!(auth.user?.mustSetPassword || auth.user?.mustChangePassword);
});

watch(() => ui.activeModal, (v) => {
  if (v === 'changePassword') {
    currentPwd.value = '';
    newPwd.value = '';
    confirmPwd.value = '';
    error.value = '';
  }
});

function close() {
  if (forced.value) { toast.warn('Смена пароля обязательна'); return; }
  ui.close();
}

async function onSubmit() {
  error.value = '';
  const missing: string[] = [];
  if (!isSetup.value && !currentPwd.value) missing.push('Текущий пароль');
  if (!newPwd.value) missing.push('Новый пароль');
  if (!confirmPwd.value) missing.push('Подтверждение');
  if (missing.length) {
    error.value = missing.length === 1
      ? `Заполните поле «${missing[0]}»`
      : `Заполните: ${missing.map(m => `«${m}»`).join(', ')}`;
    return;
  }
  if (newPwd.value !== confirmPwd.value) { error.value = 'Пароли не совпадают'; return; }

  loading.value = true;
  try {
    const res: { token?: string } = isSetup.value
      ? await authApi.setupPassword(newPwd.value, confirmPwd.value)
      : await authApi.changePassword(currentPwd.value, newPwd.value, confirmPwd.value);

    if (res?.token) auth.applySession({ user: auth.user!, token: res.token });
    if (auth.user) {
      auth.user.mustSetPassword = false;
      auth.user.mustChangePassword = false;
    }
    toast.success(isSetup.value ? 'Пароль установлен' : 'Пароль успешно изменён');
    ui.close();
    await auth.refreshUser();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка смены пароля';
  } finally {
    loading.value = false;
  }
}
</script>
