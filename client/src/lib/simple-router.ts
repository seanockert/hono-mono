import { ref, computed } from 'vue'

// Route configuration - easy to extend
const routes = {
  '/': 'login',
  '/signup': 'signup',
  '/dashboard': 'dashboard',
} as const

export type Route = typeof routes[keyof typeof routes]

const currentRoute = ref<Route>('login')

// Get route from current path
const getRouteFromPath = (): Route => {
  return routes[window.location.pathname as keyof typeof routes] || 'login'
}

// Update route from URL changes
const updateRoute = () => {
  currentRoute.value = getRouteFromPath()
}

// Initialize and listen for changes
currentRoute.value = getRouteFromPath()
window.addEventListener('popstate', updateRoute)

export const useRouter = () => {
  const route = computed(() => currentRoute.value)

  const navigate = (newRoute: Route) => {
    // Find path for route
    const path = Object.keys(routes).find(key => routes[key as keyof typeof routes] === newRoute) || '/'
    
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path)
      currentRoute.value = newRoute
    }
  }

  return { route, navigate }
}
