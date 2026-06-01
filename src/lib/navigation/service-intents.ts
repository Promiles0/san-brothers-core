import { supabase } from "@/lib/supabase";

export async function resolveServiceIntentDestination(intent: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    sessionStorage.setItem("signup_intent", intent);
    return {
      to: "/signup",
      search: { intent },
    };
  }

  if (intent === "live-interpreter") {
    return { to: "/dashboard/interpreter" };
  }

  return {
    to: "/dashboard/services",
    search: { apply: intent },
  };
}
