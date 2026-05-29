export async function createDailyRoom(callId: string): Promise<{
  url: string;
  name: string;
} | null> {
  const apiKey =
    import.meta.env.VITE_DAILY_CO_API_KEY ||
    import.meta.env.DAILY_CO_API_KEY;

  const domain =
    import.meta.env.VITE_DAILY_CO_DOMAIN ||
    import.meta.env.DAILY_CO_DOMAIN ||
    'sanbroh.daily.co';

  console.log('[Daily] Creating room. Has key:', !!apiKey, 'Domain:', domain);

  if (!apiKey) {
    console.warn('[Daily] No API key found in env vars');
    return null;
  }

  const roomName = `san-brothers-${callId}`;

  try {
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: {
          max_participants: 2,
          enable_chat: false,
          enable_screenshare: false,
          exp: Math.floor(Date.now() / 1000) + 3600,
          eject_at_room_exp: true,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('[Daily] Room creation failed:', err);
      return null;
    }

    console.log('[Daily] Room created successfully');
    return {
      url: `https://${domain}/${roomName}`,
      name: roomName,
    };
  } catch (err) {
    console.error('[Daily] Network error:', err);
    return null;
  }
}

export async function deleteDailyRoom(roomName: string): Promise<void> {
  const apiKey =
    import.meta.env.VITE_DAILY_CO_API_KEY ||
    import.meta.env.DAILY_CO_API_KEY;

  if (!apiKey) return;

  try {
    await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
  } catch (err) {
    console.error('[Daily] Room deletion failed:', err);
  }
}
