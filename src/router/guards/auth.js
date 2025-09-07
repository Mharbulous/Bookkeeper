import { useAuthStore } from '../../core/stores/auth';

export function createAuthGuard() {
  return async (to, from, next) => {
    const authStore = useAuthStore();

    // Wait for auth initialization to complete
    if (!authStore.isInitialized) {
      await authStore.waitForInit();
    }

    // Handle error state
    if (authStore.isError) {
      console.error('Auth error state, redirecting to login:', authStore.error);
      next({
        path: '/login',
        query: { error: 'auth_error' },
      });
      return;
    }

    // Handle login page access (normal Firebase mode)
    if (to.path === '/login') {
      if (authStore.isAuthenticated) {
        // User is authenticated, redirect away from login
        const redirectPath = to.query.redirect ? decodeURIComponent(to.query.redirect) : '/';
        next({ path: redirectPath });
        return;
      }
      // User not authenticated, allow access to login page
      next();
      return;
    }

    // Handle protected routes (normal Firebase mode)
    if (to.meta.requiresAuth) {
      if (!authStore.isAuthenticated) {
        // User not authenticated, redirect to login
        next({
          path: '/login',
          query: { redirect: encodeURIComponent(to.fullPath) },
        });
        return;
      }
      // User authenticated, allow access
      next();
      return;
    }

    // Allow access to public routes
    next();
  };
}
