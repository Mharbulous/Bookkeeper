import { watch } from 'vue';
import { useRoute } from 'vue-router';

/**
 * Composable for dynamically switching favicon based on current route
 */
export function useFavicon() {
  const route = useRoute();

  const updateFavicon = (iconPath) => {
    // Find existing favicon links
    const links = document.querySelectorAll('link[rel*="icon"]');

    // Update all favicon links
    links.forEach((link) => {
      if (link.getAttribute('rel').includes('icon')) {
        link.href = iconPath;
      }
    });
  };

  const isDemoRoute = (routePath) => {
    return routePath.startsWith('/dev') || routePath.includes('/dev/');
  };

  // Watch route changes and update favicon accordingly
  watch(
    () => route.path,
    (newPath) => {
      if (isDemoRoute(newPath)) {
        updateFavicon('/favicon-demo.png');
      } else {
        updateFavicon('/favicon.ico');
      }
    },
    { immediate: true }
  );

  return {
    updateFavicon,
    isDemoRoute,
  };
}
