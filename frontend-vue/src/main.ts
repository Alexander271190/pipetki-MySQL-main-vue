import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/style.css';

try {
  const saved = localStorage.getItem('pipette_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
} catch { /* ignore */ }

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
