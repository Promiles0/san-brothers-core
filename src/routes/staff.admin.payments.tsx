import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/staff/admin/payments")({ component: Redirect });

function Redirect() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/admin/revenue", replace: true });
  }, [navigate]);
  return null;
}
