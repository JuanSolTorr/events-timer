# Timers Tajamar — Documentación del proyecto

Sistema de gestión de temporizadores para el **Foro de Empleo de Tajamar**. Controla el tiempo de turno de cada empresa por sala en tiempo real, sincronizando todos los clientes mediante WebSockets.

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE                              │
│           React SPA (AppTimersFinal-master)                 │
│        https://apitimerstesting.azurewebsites.net           │
└───────────────────┬──────────────────┬──────────────────────┘
                    │ REST (axios)      │ Socket.IO
                    ▼                  ▼
┌───────────────────────┐   ┌──────────────────────────────┐
│   API REST (.NET)     │   │  Sync Server (Node.js)       │
│ apitimers.azurewebsi- │   │ timertajamarback.azurewebsi- │
│ tes.net               │   │ tes.net  (puerto 3002)       │
└───────────┬───────────┘   └──────────────┬───────────────┘
            │                              │ también llama
            ▼                              │ a la API REST
    ┌──────────────┐                       │
    │  SQL Server  │◄──────────────────────┘
    │  (Azure)     │
    └──────────────┘
```

### Componentes

| Componente | Tecnología | URL (producción) |
|---|---|---|
| Frontend SPA | React 18 + Bootstrap 5 | `apitimerstesting.azurewebsites.net` |
| API REST | .NET (no está en este repo) | `apitimers.azurewebsites.net` |
| Sync Server | Node.js + Express + Socket.IO | `timertajamarback.azurewebsites.net` |
| Base de datos | SQL Server (Azure) | — |

> El backend .NET (`apitimers`) **no está en este repositorio**. Solo existe el cliente React y el servidor de sincronización Node.js.

---

## Flujo principal de uso

1. El administrador entra en `/login` y se autentica.
2. Crea/configura **categorías** (duración en minutos), **empresas**, **salas** y **temporizadores** con fecha/hora de inicio.
3. En la vista `/` (TimerView) el operador pulsa **"Vamos"** → el cliente emite el evento Socket.IO `vamos`.
4. El sync server ajusta los tiempos de todos los temporizadores al instante actual (via `PUT /api/timers/IncreaseTimers/{diff}`), luego inicia el countdown interno.
5. Cada segundo el servidor hace `broadcast` de `timerID` + `envio` (segundos restantes) a **todos** los clientes conectados.
6. Los clientes muestran la cuenta atrás en pantalla. Al terminar un timer, el servidor pasa automáticamente al siguiente.

---

## Estructura del repositorio

```
PRUEBAS/
├── AppTimersFinal-master/   React SPA (frontend)
│   └── src/
│       ├── components/      Vistas y componentes UI
│       ├── services/
│       │   └── service.js   Capa de acceso a API REST + Socket.IO
│       ├── Global.js        URLs de entorno
│       └── Router.js        Definición de rutas
├── syncServerTimers-master/ Servidor de sincronización
│   └── index.js             Express + Socket.IO server
├── Script_Timers.txt        DDL/DML completo de la base de datos
└── docs/                    ← esta carpeta
    ├── README.md            (este archivo)
    ├── api-endpoints.md     Endpoints REST documentados
    ├── socket-events.md     Eventos Socket.IO
    ├── data-models.md       Modelos de base de datos
    └── components.md        Componentes React
```

---

## Rutas del frontend

| Ruta | Componente | Descripción |
|---|---|---|
| `/` | `TimerView` | Vista pública del countdown en tiempo real |
| `/login` | `Login` | Autenticación de administrador |
| `/horario` | `Horario` | Calendario/horario de timers |
| `/salas` | `Salas` | CRUD de salas |
| `/empresas` | `Empresas` | CRUD de empresas |
| `/categorias` | `Categorias` | CRUD de categorías de timer |
| `/temporizadores` | `Temporizadores` | CRUD de temporizadores |
| `/empresastimersnew` | `EmpresasEventoTimersNew` | Eventos por empresa |

---

## Stack tecnológico

**Frontend**
- React 18.2 · React Router 6.4 · Bootstrap 5.2
- Socket.IO Client 4.5 · Axios 1.2 · Luxon 3.7 · SweetAlert2 11

**Sync Server**
- Node.js ≥20 · Express 4.18 · Socket.IO 4.5 · Axios 1.2 · Luxon 3.7

**Infraestructura**
- Azure App Service (API .NET + Sync Server) · SQL Server (Azure)
- Vercel (configurado como alternativa para el sync server)
