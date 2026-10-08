import { createRouter, createWebHistory } from 'vue-router';
import Login from './pages/Login.vue';

declare module 'vue-router' {
  interface RouteMeta {
    /** Signed-out users go to the login page. */
    requiresAuth?: boolean;
    /** Signed-in users go to the dashboard. */
    guestOnly?: boolean;
  }
}

// Login is the first page, so it is in the main bundle. The other pages load on demand.
const routes = [
  { name: 'login', path: '/', component: Login, meta: { guestOnly: true } },
  {
    name: 'signup',
    path: '/signup',
    component: () => import('./pages/Signup.vue'),
    meta: { guestOnly: true },
  },
  {
    name: 'forgot-password',
    path: '/forgot-password',
    component: () => import('./pages/ForgotPassword.vue'),
  },
  {
    name: 'reset-password',
    path: '/reset-password',
    component: () => import('./pages/ResetPassword.vue'),
  },
  {
    name: 'dashboard',
    path: '/dashboard',
    component: () => import('./pages/Dashboard.vue'),
    meta: { requiresAuth: true },
  },
  { name: 'items', path: '/items', component: () => import('./pages/Items.vue') },
  { name: 'item', path: '/item/:slug', component: () => import('./pages/Item.vue') },
  {
    name: 'not-found',
    path: '/:pathMatch(.*)*',
    component: () => import('./pages/NotFound.vue'),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
