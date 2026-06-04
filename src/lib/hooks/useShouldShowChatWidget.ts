import { useLocation } from "@tanstack/react-router";

/**
 * Hook to determine if the AI Chat Widget should be displayed on the current route.
 * 
 * The widget should NOT appear on:
 * - /staff/* routes
 * - /admin/* routes
 * 
 * The widget SHOULD appear on:
 * - All public pages (/, /services/*, /about, /faq, etc.)
 * - /dashboard/* routes
 * - /translate/* routes
 * - /consultancy/* routes
 * 
 * @returns boolean indicating whether the chat widget should be shown
 */
export function useShouldShowChatWidget(): boolean {
  const location = useLocation();
  const pathname = location.pathname;

  // Hide on staff and admin routes
  if (pathname.startsWith("/staff") || pathname.startsWith("/admin")) {
    return false;
  }

  // Show on all other routes
  return true;
}
