// Development-only demo routes
// These routes are excluded from production builds

export const demoRoutes = [
  {
    path: '/dev/lazy-loading',
    name: 'LazyLoadingDemo',
    component: () => import('../views/LazyLoadingDemo.vue'),
    meta: { 
      requiresAuth: false,
      devOnly: true,
      title: 'Lazy Loading Performance Demo',
      description: 'Demonstrates 99%+ performance improvement in file queue rendering'
    }
  },
  {
    path: '/dev',
    name: 'DevDemoIndex',
    component: () => import('../views/DemoIndex.vue'),
    meta: { 
      requiresAuth: false,
      devOnly: true,
      title: 'Development Demonstrations',
      description: 'Index of all available development demos and testing pages'
    }
  }
]

// Helper to register demo routes conditionally
export function registerDemoRoutes(router) {
  // Only register demo routes in development mode
  if (import.meta.env.DEV) {
    demoRoutes.forEach(route => {
      router.addRoute(route)
    })
  }
}