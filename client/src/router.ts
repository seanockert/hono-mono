import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from './pages/Dashboard.vue';
import Item from './pages/Item.vue';
import Items from './pages/Items.vue';
import Login from './pages/Login.vue';
import NotFound from './pages/NotFound.vue';
import Signup from './pages/Signup.vue';

const routes = [
  { name: 'login', path: '/', component: Login },
  { name: 'signup', path: '/signup', component: Signup },
  { name: 'dashboard', path: '/dashboard', component: Dashboard },
  { name: 'items', path: '/items', component: Items },
  { name: 'item', path: '/item/:slug', component: Item },
  { name: 'not-found', path: '/:pathMatch(.*)*', component: NotFound },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
