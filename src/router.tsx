import { QueryClient } from "@tanstack/react-query";
import { createRouter, type LocationRewrite } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

type ChildPortal = "translate" | "consultancy";

function getChildPortal(hostname: string): ChildPortal | null {
  const normalized = hostname.toLowerCase();
  if (normalized.startsWith("translate.")) return "translate";
  if (normalized.startsWith("consultancy.")) return "consultancy";
  return null;
}

function addPortalPrefix(pathname: string, portal: ChildPortal): string {
  const portalRoot = `/${portal}`;
  if (pathname === portalRoot || pathname.startsWith(`${portalRoot}/`)) {
    return pathname;
  }
  if (pathname === "/") return `${portalRoot}/`;
  return `${portalRoot}${pathname}`;
}

function removePortalPrefix(pathname: string, portal: ChildPortal): string {
  const portalRoot = `/${portal}`;
  if (pathname === portalRoot || pathname === `${portalRoot}/`) return "/";
  if (pathname.startsWith(`${portalRoot}/`)) {
    return pathname.slice(portalRoot.length) || "/";
  }
  return pathname;
}

const portalSubdomainRewrite: LocationRewrite = {
  input: ({ url }) => {
    const portal = getChildPortal(url.hostname);
    if (!portal) return undefined;

    url.pathname = addPortalPrefix(url.pathname, portal);
    return url;
  },
  output: ({ url }) => {
    const portal = getChildPortal(url.hostname);
    if (!portal) return undefined;

    url.pathname = removePortalPrefix(url.pathname, portal);
    return url;
  },
};

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    rewrite: portalSubdomainRewrite,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
