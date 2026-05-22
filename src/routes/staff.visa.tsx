import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/staff/visa")({ component: () => <Outlet /> });
