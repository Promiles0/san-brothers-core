import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/staff/admin/")({ component: Redirect });

function Redirect() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/admin", replace: true });
  }, [navigate]);
  return null;
}
