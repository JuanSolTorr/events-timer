# Modelos de datos

Base de datos SQL Server (Azure). DDL completo en [Script_Timers.txt](../Script_Timers.txt).

---

## Diagrama entidad-relación

```
USUARIOSTIMERS          EVENTOSTIMERS
──────────────          ─────────────────────
IDUSUARIO (PK)          IDEVENTO (PK)
USERNAME                EVENTO
PASS                    INICIOEVENTO  datetime
                        FINEVENTO     datetime
                              │
                              │ FK_TIEMPOS_EMPRESAS_SALAS_EVENTOS
                              ▼
CATEGORIAS_TIMER ──FK──► TEMPORIZADORES ──────────────────────────────────────┐
─────────────────        ──────────────                                        │
IDCATEGORIA (PK)         IDTIMER (PK)                                          │
CATEGORIA                INICIO    datetime                                    │
DURACION  int (min)      IDCATEGORIA  int  FK→CATEGORIAS_TIMER                │
                         PAUSA     bit                                         │
                              │                                                │
                              │ FK_TIEMPOS_EMPRESAS_SALAS_TEMPORIZADORES      │
                              ▼                                                │
                    TIEMPOS_EMPRESAS_SALAS ◄────────────────────────────────────┘
                    ──────────────────────
                    UNIQUEID (PK)
                    IDTIMER   int  FK→TEMPORIZADORES
                    IDEMPRESA int  FK→EMPRESASTIMERS
                    IDSALA    int  FK→SALASTIMERS
                    IDEVENTO  int  FK→EVENTOSTIMERS
                         ▲            ▲
                         │            │
              EMPRESASTIMERS      SALASTIMERS
              ─────────────────   ───────────
              IDEMPRESA (PK)      IDSALA (PK)
              EMPRESA             SALA
              IMAGEN  nvarchar(550)
```

---

## Tablas

### `CATEGORIAS_TIMER`
Define los tipos de turno y su duración.

| Columna | Tipo | Descripción |
|---|---|---|
| `IDCATEGORIA` | `int` PK | Identificador |
| `CATEGORIA` | `nvarchar(50)` | Nombre (ej: "TRABAJO", "MINI DESCANSO") |
| `DURACION` | `int` | Duración en **minutos** |

Datos de ejemplo:
```
1 → TRABAJO        → 15 min
2 → MINI DESCANSO  →  5 min
3 → DESCANSO LARGO → 60 min
```

---

### `TEMPORIZADORES`
Cada fila es una ocurrencia concreta de un timer (fecha + hora de inicio + categoría).

| Columna | Tipo | Descripción |
|---|---|---|
| `IDTIMER` | `int` PK | Identificador |
| `INICIO` | `datetime` | Fecha y hora de inicio del turno |
| `IDCATEGORIA` | `int` FK | Referencia a `CATEGORIAS_TIMER` |
| `PAUSA` | `bit` | Si el timer está pausado (0/1) |

---

### `EMPRESASTIMERS`
Empresas participantes en el foro.

| Columna | Tipo | Descripción |
|---|---|---|
| `IDEMPRESA` | `int` PK | Identificador |
| `EMPRESA` | `nvarchar(250)` | Nombre de la empresa |
| `IMAGEN` | `nvarchar(550)` | URL del logotipo |

Empresas registradas (48 en total): AVANADE, ENCAMINA, SOGETI, CAPGEMINI, BANKINTER, BBVA IT, ACCENTURE, EY, KPMG, AIRBUS, etc.

---

### `SALASTIMERS`
Salas físicas donde se realizan las entrevistas.

| Columna | Tipo | Descripción |
|---|---|---|
| `IDSALA` | `int` PK | Identificador |
| `SALA` | `nvarchar(250)` | Nombre de la sala |

Salas registradas:
```
1 → FP SISTEMAS
2 → FP DESARROLLO
3 → MASTER SISTEMAS
4 → UNIVERSIDAD
5 → MASTER DESARROLLO
6 → MASTER CIBERSEGURIDAD
7 → BIG DATA
```

---

### `EVENTOSTIMERS`
Eventos del foro (sesión de mañana / tarde).

| Columna | Tipo | Descripción |
|---|---|---|
| `IDEVENTO` | `int` PK | Identificador |
| `EVENTO` | `nvarchar(150)` | Nombre del evento |
| `INICIOEVENTO` | `datetime` | Inicio del evento |
| `FINEVENTO` | `datetime` | Fin del evento |

---

### `TIEMPOS_EMPRESAS_SALAS`
Tabla de relación: asigna qué empresa ocupa qué sala en qué timer (turno) dentro de qué evento.

| Columna | Tipo | Descripción |
|---|---|---|
| `UNIQUEID` | `int` PK | Identificador único |
| `IDTIMER` | `int` FK | Referencia a `TEMPORIZADORES` |
| `IDEMPRESA` | `int` FK | Referencia a `EMPRESASTIMERS` |
| `IDSALA` | `int` FK | Referencia a `SALASTIMERS` |
| `IDEVENTO` | `int` FK | Referencia a `EVENTOSTIMERS` |

---

### `USUARIOSTIMERS`
Usuarios del sistema de administración.

| Columna | Tipo | Descripción |
|---|---|---|
| `IDUSUARIO` | `int` PK | Identificador |
| `USERNAME` | `nvarchar(50)` | Nombre de usuario |
| `PASS` | `nvarchar(50)` | Contraseña en texto plano ⚠️ |

> **Alerta de seguridad:** contraseñas almacenadas en texto plano. Sin hash, sin salt.

---

## Vista SQL: `TIEMPOS_EVENTOSTIMERS`

JOIN de todas las tablas. Consumida por el endpoint `api/timereventos`.

Columnas que expone:
```
UniqueId, IDEMPRESA, IDTIMER, IDSALA, IDEVENTO,
IDCATEGORIA, INICIO, PAUSA, CATEGORIA, DURACION,
SALA, EVENTO, INICIOEVENTO, FINEVENTO, EMPRESA, IMAGEN
```

---

## Stored Procedures

| Procedimiento | Parámetros | Descripción |
|---|---|---|
| `SP_INCREASETIMERS` | `@INCREASE int` | Desplaza todos los `INICIO` de `TEMPORIZADORES` en `n` minutos. Lógica especial: si `@INCREASE < 0`, suma `@INCREASE + 60` (workaround de zona horaria). |
| `SP_GETTIEMPOEMPRESASTIMERSACTUAL` | `@IDEMPRESA int` | Devuelve los 2 próximos timers de una empresa (donde `INICIO >= GETDATE()`). |
| `SP_DELETETIMERS` | — | Borra **todos** los registros de `TIEMPOS_EMPRESAS_SALAS` y `TEMPORIZADORES`. |
| `SP_DELETETIMER` | `@IDTIMER int` | Borra un timer específico y sus relaciones en `TIEMPOS_EMPRESAS_SALAS`. |

---

## Modelos JavaScript (frontend / sync server)

Los objetos que viajan por la API no tienen tipado formal (no hay TypeScript). Forma inferida:

### Timer
```js
{
  idTemporizador: number,
  inicio: string,        // ISO 8601: "2025-01-23T10:05:00.000"
  idCategoria: number,
  pausa: boolean
}
```

### Categoría
```js
{
  idCategoria: number,
  categoria: string,
  duracion: number       // minutos
}
```

### Empresa
```js
{
  idEmpresa: number,
  empresa: string,
  imagen: string         // URL
}
```

### Sala
```js
{
  idSala: number,
  sala: string
}
```

### TiempoEmpresaSala
```js
{
  uniqueId: number,
  idTimer: number,
  idEmpresa: number,
  idSala: number,
  idEvento: number
}
```

### TimerEvento (vista)
```js
{
  uniqueId: number,
  idEmpresa: number,
  idTimer: number,
  idSala: number,
  idEvento: number,
  idCategoria: number,
  inicio: string,
  pausa: boolean,
  categoria: string,
  duracion: number,
  sala: string,
  evento: string,
  inicioEvento: string,
  finEvento: string,
  empresa: string,
  imagen: string
}
```
