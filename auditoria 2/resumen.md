# Resumen del proyecto — events-timer

## Vision general

Aplicacion web de temporizadores en vivo para eventos presenciales (Tajamar). Muestra en pantalla una cuenta atras en tiempo real para cada empresa/sala segun el horario del evento. Dispone de una seccion de administracion protegida por token JWT para gestionar salas, empresas, categorias, temporizadores y sus asignaciones.

## Stack tecnico

| Capa | Tecnologia | Version |
|---|---|---|
| Framework UI | React | 19.2.6 |
| Lenguaje | TypeScript | 6.0.3 |
| Bundler | Vite | 8.0.12 |
| Estilos | Tailwind CSS (v4) | 4.3.0 |
| Router | React Router DOM | 7.15.1 |
| HTTP client | Axios | 1.16.1 |
| WebSocket | Socket.IO client | 4.8.3 |
| Fechas/horas | Luxon | 3.7.2 |
| Alertas UI | SweetAlert2 | 11.26.25 |
| Optimizador React | babel-plugin-react-compiler | 1.0.0 |

## Backend

Dos APIs REST en Azure App Service:

- **Dev**: `https://apitimerstesting.azurewebsites.net/`
- **Prod**: `https://apitimers.azurewebsites.net/`

Servidor de WebSocket (Socket.IO) compartido entre dev y prod:
- `https://timertajamarback.azurewebsites.net/`

## Estado actual

- Aplicacion funcional en su estructura basica.
- Autenticacion basada en JWT almacenado en `localStorage`.
- Tiempo real via Socket.IO (eventos `timerID` y `envio`).
- Uso de APIs modernas de React 19: `use()`, `useOptimistic`, `useActionState`, `useTransition`.
- Sin tests unitarios ni de integracion.
- Sin rutas protegidas por `ProtectedRoute` (el componente existe pero no se usa en el router).
- Promesas de datos modulo-nivel en `TimerView` y `HorarioView` que se ejecutan al importar el modulo — no se refrescan nunca si el usuario navega fuera y vuelve.

## Estructura de carpetas

```
src/
  assets/           # Imagenes estaticas
  components/       # Componentes reutilizables
  config/           # Configuracion (env.ts)
  context/          # AuthContext, TimerContext
  hooks/            # useAuth, useTimerState
  router/           # Definicion del router
  services/         # httpClient, socketClient, authService, service
  types/            # Interfaces TypeScript
  utils/            # timezone, formatTime
  views/            # Vistas por ruta
```
