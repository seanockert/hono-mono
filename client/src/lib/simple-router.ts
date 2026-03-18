import { ref, computed } from 'vue';

/**
 * Basic client router for demo purposes. Replace with a more robust router.
 */

// Static route configuration
const staticRoutes = {
  '/': 'login',
  '/signup': 'signup',
  '/dashboard': 'dashboard',
  '/items': 'items',
} as const;

type StaticRoute = (typeof staticRoutes)[keyof typeof staticRoutes];
export type Route = StaticRoute | 'item';

export type RouteParams = { slug?: string };

const currentRoute = ref<Route>('login');
const currentParams = ref<RouteParams>({});

// Get route and params from current path
const getRouteFromPath = (): { route: Route; params: RouteParams } => {
  const path = window.location.pathname;

  const itemMatch = path.match(/^\/item\/([^/]+)$/);
  if (itemMatch) {
    return { route: 'item', params: { slug: itemMatch[1] } };
  }

  return {
    route: staticRoutes[path as keyof typeof staticRoutes] || 'login',
    params: {},
  };
};

// Update route from URL changes
const updateRoute = () => {
  const { route, params } = getRouteFromPath();
  currentRoute.value = route;
  currentParams.value = params;
};

// Init and listen for changes
updateRoute();
window.addEventListener('popstate', updateRoute);

export const useRouter = () => {
  const route = computed(() => currentRoute.value);
  const params = computed(() => currentParams.value);

  const navigate = (newRoute: Route, replace = false, newParams: RouteParams = {}) => {
    let path: string;

    if (newRoute === 'item' && newParams.slug) {
      path = `/item/${newParams.slug}`;
    } else {
      path =
        Object.keys(staticRoutes).find(
          (key) => staticRoutes[key as keyof typeof staticRoutes] === newRoute,
        ) || '/';
    }

    if (window.location.pathname !== path) {
      if (replace) {
        window.history.replaceState({}, '', path);
      } else {
        window.history.pushState({}, '', path);
      }
      currentRoute.value = newRoute;
      currentParams.value = newParams;
    }
  };

  return { route, params, navigate };
};
