import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/routes/dashboard.settings";

export const Route = createFileRoute("/staff/settings")({ component: SettingsPage });
