export const config = {
  apiUrl: import.meta.env.VITE_API_URL as string,
  socketUrl: import.meta.env.VITE_SOCKET_URL as string,
} as const

if (!config.apiUrl) throw new Error('VITE_API_URL no esta definida')
if (!config.socketUrl) throw new Error('VITE_SOCKET_URL no esta definida')
