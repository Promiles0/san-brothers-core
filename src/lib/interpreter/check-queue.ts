import { supabase } from "@/lib/supabase";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  zh: "Chinese",
  rw: "Kinyarwanda",
  sw: "Kiswahili",
};

export async function checkQueueAndNotify(
  interpreterLanguages: { from: string; to: string }[],
  _interpreterId: string,
) {
  if (!interpreterLanguages?.length) return;

  const { data: queuedClients, error } = await supabase
    .from("interpreter_queue")
    .select("*")
    .eq("status", "waiting");

  if (error) {
    console.error("[Queue] Failed to fetch queue:", error.message);
    return;
  }

  if (!queuedClients?.length) return;

  type QueueRow = {
    id: string;
    client_id: string;
    language_from: string;
    language_to: string;
  };

  const matches = (queuedClients as QueueRow[]).filter((entry) =>
    interpreterLanguages.some(
      (pair) => pair.from === entry.language_from && pair.to === entry.language_to,
    ),
  );

  if (!matches.length) return;

  console.log("[Queue] Notifying", matches.length, "queued clients");

  for (const entry of matches) {
    const langFrom = LANGUAGE_NAMES[entry.language_from] ?? entry.language_from;
    const langTo = LANGUAGE_NAMES[entry.language_to] ?? entry.language_to;

    await supabase.from("notifications").insert({
      user_id: entry.client_id,
      type: "interpreter_available",
      title: "Interpreter Now Available",
      body: `An interpreter for ${langFrom} → ${langTo} is now available`,
      link: `/dashboard/interpreter?language_from=${entry.language_from}&language_to=${entry.language_to}`,
      is_read: false,
    });

    await supabase
      .from("interpreter_queue")
      .update({
        status: "notified",
        notified_at: new Date().toISOString(),
      })
      .eq("id", entry.id);

    await supabase
      .from("interpreter_calls")
      .update({ status: "cancelled" })
      .eq("client_id", entry.client_id)
      .eq("status", "queued")
      .eq("language_from", entry.language_from)
      .eq("language_to", entry.language_to);
  }
}
