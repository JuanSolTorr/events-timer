export interface Timer {
  idTemporizador: number
  inicio: string
  idCategoria: number
  pausa: boolean
}

export interface Categoria {
  idCategoria: number
  categoria: string
  duracion: number
}

export interface Empresa {
  idEmpresa: number
  empresa: string
  imagen: string
}

export interface Sala {
  idSala: number
  sala: string
}

export interface TiempoEmpresaSala {
  uniqueId: number
  idTimer: number
  idEmpresa: number
  idSala: number
  idEvento: number
}

export interface TimerEvento {
  uniqueId: number
  idEmpresa: number
  idTimer: number
  idSala: number
  idEvento: number
  idCategoria: number
  inicio: string
  pausa: boolean
  categoria: string
  duracion: number
  sala: string
  evento: string
  inicioEvento: string
  finEvento: string
  empresa: string
  imagen: string
}

export interface LoginCredentials {
  userName: string
  password: string
}

export interface AuthToken {
  token: string
}

export interface Evento {
  idEvento: number
  evento: string
  inicioEvento: string
  finEvento: string
}

export interface SocketServerEvents {
  timerID: (idTimer: number) => void
  envio: (segundosRestantes: number) => void
}

export interface SocketClientEvents {
  vamos: () => void
  syncData: () => void
  panic: () => void
}
