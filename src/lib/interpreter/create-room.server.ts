import { createServerFn } from '@tanstack/react-start'

export const createDailyRoomFn = createServerFn({ method: 'POST' })
  .validator((callId: string) => callId)
  .handler(async ({ data: callId }) => {
    const apiKey = process.env.DAILY_CO_API_KEY
    const domain = process.env.DAILY_CO_DOMAIN || process.env.VITE_DAILY_CO_DOMAIN

    console.log('[Daily Server] Creating room for call:', callId)
    console.log('[Daily Server] Has API key:', !!apiKey)
    console.log('[Daily Server] Domain:', domain)

    if (!apiKey || !domain) {
      throw new Error('Daily.co not configured on server')
    }

    const roomName = `san-brothers-${callId}`

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
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error('Daily.co room creation failed: ' + JSON.stringify(err))
    }

    await response.json()
    return {
      url: `https://${domain}/${roomName}`,
      name: roomName,
    }
  })

export const deleteDailyRoomFn = createServerFn({ method: 'POST' })
  .validator((roomName: string) => roomName)
  .handler(async ({ data: roomName }) => {
    const apiKey = process.env.DAILY_CO_API_KEY
    if (!apiKey) return

    await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
  })
