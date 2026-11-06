import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/MainView.vue'),
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  // Публичные маршруты — пускаем всех
  if (to.meta.public) {
    // Если уже залогинен — уводим на /
    if (auth.isAuthenticated && to.name === 'login') return { path: '/' };
    return true;
  }

  // Приватные — только залогиненным
  if (!auth.isAuthenticated) return { path: '/login' };
  return true;
});

export default router;
