// Daily.co room helpers.
//
// IMPORTANT: rooms are created with `privacy: 'public'`. The room name is
// derived from the call UUID (e.g. `san-brothers-<uuid>`) which is unguessable
// in practice, and the URL is only ever shared with the two participants of
// that specific call via the `interpreter_calls.daily_room_url` column. Using
// `privacy: 'private'` here would require generating per-user Daily meeting
// tokens, which the app does not currently do — that caused both participants
// to be rejected with "You are not allowed to join this meeting".

function normalizeDomain(raw: string): string {
  return raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export async function createDailyRoom(callId: string): Promise<{
  url: string;
  name: string;
} | null> {
  const apiKey =
    import.meta.env.VITE_DAILY_CO_API_KEY || import.meta.env.DAILY_CO_API_KEY;

  const rawDomain =
    import.meta.env.VITE_DAILY_CO_DOMAIN ||
    import.meta.env.DAILY_CO_DOMAIN ||
    "sanbroh.daily.co";
  const domain = normalizeDomain(rawDomain);

  console.log("[Daily] Creating room. Has key:", !!apiKey, "Domain:", domain);

  if (!apiKey) {
    console.warn("[Daily] No API key found in env vars");
    return null;
  }

  const roomName = `san-brothers-${callId}`;

  try {
    const response = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: roomName,
        // public = anyone with the URL can join. Safe here because the URL is
        // only ever stored on the call row and shown to the two participants.
        privacy: "public",
        properties: {
          max_participants: 2,
          enable_chat: false,
          enable_screenshare: false,
          enable_prejoin_ui: false,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + 3600,
          eject_at_room_exp: true,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      // If the room already exists from a previous accept attempt, reuse it.
      if (response.status === 409) {
        console.log("[Daily] Room already exists, reusing:", roomName);
        return { url: `https://${domain}/${roomName}`, name: roomName };
      }
      console.error("[Daily] Room creation failed:", response.status, err);
      return null;
    }

    console.log("[Daily] Room created successfully");
    return {
      url: `https://${domain}/${roomName}`,
      name: roomName,
    };
  } catch (err) {
    console.error("[Daily] Network error:", err);
    return null;
  }
}

export async function deleteDailyRoom(roomName: string): Promise<void> {
  const apiKey =
    import.meta.env.VITE_DAILY_CO_API_KEY || import.meta.env.DAILY_CO_API_KEY;

  if (!apiKey) return;

  try {
    await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch (err) {
    console.error("[Daily] Room deletion failed:", err);
  }
}
