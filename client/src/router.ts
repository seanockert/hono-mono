import { createRoute, createRouter } from '@kitbag/router';
import Dashboard from './pages/Dashboard.vue';
import Item from './pages/Item.vue';
import Items from './pages/Items.vue';
import Login from './pages/Login.vue';
import Signup from './pages/Signup.vue';

const routes = [
  createRoute({ name: 'login', path: '/', component: Login }),
  createRoute({ name: 'signup', path: '/signup', component: Signup }),
  createRoute({ name: 'dashboard', path: '/dashboard', component: Dashboard }),
  createRoute({ name: 'items', path: '/items', component: Items }),
  createRoute({ name: 'item', path: '/item/[slug]', component: Item }),
] as const;

export const router = createRouter(routes);

declare module '@kitbag/router' {
  interface Register {
    router: typeof router;
  }
}
