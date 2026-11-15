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

      <div style="background:#f1f5f9;border-radius:8px;padding:10px 14px;font-size:.82rem;line-height:1.6;">
        <strong style="color:#475569;">Требования к паролю:</strong>
        <ul style="margin:6px 0 0 0;padding:0;list-style:none;">

         <li style="display:flex;align-items:center;gap:8px;margin-bottom:3px;transition:color .15s;"
             :style="{ color: itemColor('minLength') }">
           <span style="width:16px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;">
             <i v-if="pwdChecks.minLength" class="fa-solid fa-check" style="color:#16a34a;font-size:.85em;"></i>
             <i v-else-if="submitted" class="fa-solid fa-xmark" style="color:#dc2626;font-size:.85em;"></i>
           </span>
           <span>Минимум {{ passwordPolicy.minLength }} символов</span>
        </li> 

         <li v-if="passwordPolicy.requireLower"
         style="display:flex;align-items:center;gap:8px;margin-bottom:3px;transition:color .15s;"
           :style="{ color: itemColor('requireLower') }">
         <span style="width:16px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;">
            <i v-if="pwdChecks.requireLower" class="fa-solid fa-check" style="color:#16a34a;font-size:.85em;"></i>
            <i v-else-if="submitted" class="fa-solid fa-xmark" style="color:#dc2626;font-size:.85em;"></i>
         </span>
         <span>Хотя бы одна строчная буква</span>
         </li>

         <li v-if="passwordPolicy.requireUpper"
           style="display:flex;align-items:center;gap:8px;margin-bottom:3px;transition:color .15s;"
             :style="{ color: itemColor('requireUpper') }">
           <span style="width:16px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;">
             <i v-if="pwdChecks.requireUpper" class="fa-solid fa-check" style="color:#16a34a;font-size:.85em;"></i>
             <i v-else-if="submitted" class="fa-solid fa-xmark" style="color:#dc2626;font-size:.85em;"></i>
           </span>
           <span>Хотя бы одна заглавная буква</span>
           </li>

            <li v-if="passwordPolicy.requireDigit"
            style="display:flex;align-items:center;gap:8px;margin-bottom:3px;transition:color .15s;"
              :style="{ color: itemColor('requireDigit') }">
            <span style="width:16px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;">
              <i v-if="pwdChecks.requireDigit" class="fa-solid fa-check" style="color:#16a34a;font-size:.85em;"></i>
              <i v-else-if="submitted" class="fa-solid fa-xmark" style="color:#dc2626;font-size:.85em;"></i>
            </span>
            <span>Хотя бы одна цифра</span>
           </li>

           <li v-if="passwordPolicy.requireSpecial"
           style="display:flex;align-items:center;gap:8px;margin-bottom:3px;transition:color .15s;"
            :style="{ color: itemColor('requireSpecial') }">
           <span style="width:16px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;">
              <i v-if="pwdChecks.requireSpecial" class="fa-solid fa-check" style="color:#16a34a;font-size:.85em;"></i>
              <i v-else-if="submitted" class="fa-solid fa-xmark" style="color:#dc2626;font-size:.85em;"></i>
             </span>
            <span>Хотя бы один спецсимвол</span>
           </li>

            <li v-if="passwordPolicy.forbidSpaces"
            style="display:flex;align-items:center;gap:8px;margin-bottom:3px;transition:color .15s;"
              :style="{ color: itemColor('forbidSpaces') }">
            <span style="width:16px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;">
               <i v-if="pwdChecks.forbidSpaces" class="fa-solid fa-check" style="color:#16a34a;font-size:.85em;"></i>
               <i v-else-if="submitted" class="fa-solid fa-xmark" style="color:#dc2626;font-size:.85em;"></i>
            </span>
            <span>Без пробелов</span>
          </li>

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
import { useSettingsStore } from '@/stores/settings';
import { getPasswordPolicy } from '@/api/auth';
  
const settings = useSettingsStore();
const ui = useUiStore();
const auth = useAuthStore();
const toast = useToastStore();
const localPolicy = ref<any>(null);
const currentPwd = ref('');
const newPwd = ref('');
const confirmPwd = ref('');
const error = ref('');
const loading = ref(false);
const passwordPolicy = computed(() => {
  if (localPolicy.value) {
    return {
      minLength: localPolicy.value.minLength || 8,
      maxLength: localPolicy.value.maxLength || 64,
      requireLower: localPolicy.value.requireLower === true,
      requireUpper: localPolicy.value.requireUpper === true,
      requireDigit: localPolicy.value.requireDigit === true,
      requireSpecial: localPolicy.value.requireSpecial === true,
      forbidSpaces: localPolicy.value.forbidSpaces === true,
    };
  }
  return settings.getPasswordPolicy();
});
  
//  Флаг: была ли попытка отправки (для красных крестиков)
const submitted = ref(false);

//  Проверка каждого требования в реальном времени
const pwdChecks = computed(() => {
  const pwd = newPwd.value || '';
  const p = passwordPolicy.value;
  return {
    minLength:      pwd.length >= p.minLength,
    requireLower:   /[a-z]/.test(pwd),
    requireUpper:   /[A-Z]/.test(pwd),
    requireDigit:   /[0-9]/.test(pwd),
    requireSpecial: /[^A-Za-z0-9]/.test(pwd),
    //  true только когда пароль непустой И без пробелов
    forbidSpaces:   pwd.length > 0 && !/\s/.test(pwd),
  };
});

//  Хелпер: цвет текста пункта
function itemColor(key: string): string {
  const checked = (pwdChecks.value as Record<string, boolean>)[key];
  if (checked) return '#16a34a';           
  if (submitted.value) return '#dc2626';   
  return '#475569';                        
}

//  При изменении пароля сбрасываем «красный режим»
watch(newPwd, () => { submitted.value = false; });
const isSetup = computed(() => ui.modalData === 'setup');
const forced = computed(() => {
  if (auth.isImpersonating) return false;
  return !!(auth.user?.mustSetPassword || auth.user?.mustChangePassword);
});

watch(() => ui.activeModal, async (v) => {
  if (v === 'changePassword') {
    currentPwd.value = '';
    newPwd.value = '';
    confirmPwd.value = '';
    error.value = '';
    submitted.value = false;
    localPolicy.value = null;

    //  Загружаем политику напрямую (работает даже при 403 на другие ручки)
    try {
      localPolicy.value = await getPasswordPolicy();
    } catch { 
      /* fallback на settings.getPasswordPolicy() сработает в computed */
    }
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

  //  Проверка по политике из настроек
    // 🆕 Перед проверкой политики: отмечаем попытку
  submitted.value = true;

  const policy = passwordPolicy.value;
  const checks = pwdChecks.value;
  const failed: string[] = [];

  if (!checks.minLength)      failed.push(`Минимум ${policy.minLength} символов`);
  if (policy.requireLower && !checks.requireLower)   failed.push('Хотя бы одна строчная буква');
  if (policy.requireUpper && !checks.requireUpper)   failed.push('Хотя бы одна заглавная буква');
  if (policy.requireDigit && !checks.requireDigit)   failed.push('Хотя бы одна цифра');
  if (policy.requireSpecial && !checks.requireSpecial) failed.push('Хотя бы один спецсимвол');
  if (policy.forbidSpaces && !checks.forbidSpaces)   failed.push('Пробелы недопустимы');

  if (failed.length > 0) {
    error.value = 'Пароль не соответствует требованиям:\n• ' + failed.join('\n• ');
    return;
  }
  
  loading.value = true;
  try {
    const res: { token?: string } = isSetup.value
      ? await authApi.setupPassword(newPwd.value, confirmPwd.value)
      : await authApi.changePassword(currentPwd.value, newPwd.value, confirmPwd.value);

    if (res?.token) {
      auth.applySession({
        user: auth.user!,
        token: res.token,
        originalUser: auth.originalUser || undefined,
        originalToken: auth.originalToken || undefined,
      });
    }
    if (auth.user) {
      auth.user.mustSetPassword = false;
      auth.user.mustChangePassword = false;
    }
    toast.success(isSetup.value ? 'Пароль установлен' : 'Пароль успешно изменён');
    ui.close();
    await auth.refreshUser();
    window.dispatchEvent(new CustomEvent('force:reload'));
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка смены пароля';
  } finally {
    loading.value = false;
  }
}
</script>
