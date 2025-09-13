import { createRouter, createWebHashHistory } from 'vue-router';
import { createAuthGuard } from './guards/auth'; // Import the auth guard
import { registerDemoRoutes } from '../dev-demos/utils/demoRoutes'; // Import demo routes

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/Home.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/home',
      name: 'home-explicit',
      component: () => import('../views/Home.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/About.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/Profile.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/Settings.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/upload',
      name: 'upload',
      component: () => import('../features/upload/FileUpload.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/organizer',
      name: 'organizer',
      component: () => import('../features/organizer/views/Organizer.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/organizer/categories',
      name: 'category-manager',
      component: () => import('../features/organizer/views/CategoryManager.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/organizer/categories/new',
      name: 'category-creation-wizard',
      component: () => import('../features/organizer/views/CategoryCreationWizard.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../components/features/auth/LoginForm.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/under-construction',
      name: 'under-construction',
      component: () => import('../views/defaults/UnderConstruction.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/404',
      name: 'page-not-found',
      component: () => import('../views/defaults/PageNotFound.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'catch-all',
      redirect: '/404',
    },
  ],
});

// Register demo routes (development only)
registerDemoRoutes(router);

// Apply the global beforeEach guard
router.beforeEach(createAuthGuard());

export default router;
