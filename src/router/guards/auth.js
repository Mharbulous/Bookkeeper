import { useAuthStore } from '../../stores/auth';

export function createAuthGuard() {
  return async (to, from, next) => {
    const authStore = useAuthStore();

    console.log('Auth guard triggered for route:', to.path, 'Auth state:', authStore.authState);

    // Wait for auth initialization to complete
    if (!authStore.isInitialized) {
      console.log('Auth not initialized, waiting...');
      await authStore.waitForInit();
      console.log('Auth initialization complete, state:', authStore.authState);
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
        console.log('User authenticated, redirecting from login to', redirectPath);
        next({ path: redirectPath });
        return;
      }
      // User not authenticated, allow access to login page
      console.log('User not authenticated, allowing access to login');
      next();
      return;
    }

    // Handle protected routes (normal Firebase mode)
    if (to.meta.requiresAuth) {
      if (!authStore.isAuthenticated) {
        // User not authenticated, redirect to login
        console.log('Protected route requires auth, redirecting to login');
        next({
          path: '/login',
          query: { redirect: encodeURIComponent(to.fullPath) },
        });
        return;
      }
      // User authenticated, allow access
      console.log('User authenticated, allowing access to protected route:', to.path);
      next();
      return;
    }

    // Allow access to public routes
    console.log('Public route, allowing access:', to.path);
    next();
  };
}
