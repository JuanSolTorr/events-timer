import { httpClient } from './httpClient'
import { getSocket } from './socketClient'
import type {
  Timer,
  Categoria,
  Empresa,
  Sala,
  TiempoEmpresaSala,
  TimerEvento,
  LoginCredentials,
} from '../types'

type ApiSala = { idSala: number; nombreSala?: string; sala?: string }
type ApiEmpresa = { idEmpresa: number; nombreEmpresa?: string; empresa?: string; imagen?: string; imagenEmpresa?: string }
type ApiTimerEvento = {
  uniqueId: number
  idEmpresa: number
  idTimer: number
  idSala: number
  idEvento: number
  idCategoria: number
  inicioTimer?: string
  inicio?: string
  pausaTimer?: boolean
  pausa?: boolean
  categoria: string
  duracion: number
  sala?: string
  nombreSala?: string
  evento: string
  inicioEvento: string
  finEvento: string
  empresa?: string
  nombreEmpresa?: string
  imagenEmpresa?: string
  imagen?: string
}

function mapSala(data: ApiSala): Sala {
  return {
    idSala: data.idSala,
    sala: data.sala ?? data.nombreSala ?? '',
  }
}

function mapEmpresa(data: ApiEmpresa): Empresa {
  return {
    idEmpresa: data.idEmpresa,
    empresa: data.empresa ?? data.nombreEmpresa ?? '',
    imagen: data.imagen ?? data.imagenEmpresa ?? '',
  }
}

function mapTimerEvento(data: ApiTimerEvento): TimerEvento {
  return {
    uniqueId: data.uniqueId,
    idEmpresa: data.idEmpresa,
    idTimer: data.idTimer,
    idSala: data.idSala,
    idEvento: data.idEvento,
    idCategoria: data.idCategoria,
    inicio: data.inicio ?? data.inicioTimer ?? '',
    pausa: data.pausa ?? data.pausaTimer ?? false,
    categoria: data.categoria,
    duracion: data.duracion,
    sala: data.sala ?? data.nombreSala ?? '',
    evento: data.evento,
    inicioEvento: data.inicioEvento,
    finEvento: data.finEvento,
    empresa: data.empresa ?? data.nombreEmpresa ?? '',
    imagen: data.imagen ?? data.imagenEmpresa ?? '',
  }
}

function emitSyncData(): void {
  getSocket().emit('syncData')
}

// ─── Autenticacion ────────────────────────────────────────────────────────────

export async function generateToken(credentials: LoginCredentials): Promise<string> {
  const { data } = await httpClient.post<string>('Auth/Login', credentials)
  return data
}

// ─── Salas ────────────────────────────────────────────────────────────────────

export async function getSalas(): Promise<Sala[]> {
  const { data } = await httpClient.get<ApiSala[]>('api/salas')
  return data.map(mapSala)
}

export async function getSala(idSala: number): Promise<Sala> {
  const { data } = await httpClient.get<Sala>(`api/salas/${idSala}`)
  return data
}

export async function postSala(nombreSala: string): Promise<void> {
  await httpClient.post(`api/salas/createsala/${encodeURIComponent(nombreSala)}`)
}

export async function putSala(idSala: number, nombreSala: string): Promise<void> {
  await httpClient.put(`api/salas/updatesala/${idSala}/${encodeURIComponent(nombreSala)}`)
}

export async function deleteSala(idSala: number): Promise<void> {
  await httpClient.delete(`api/salas/${idSala}`)
}

// ─── Empresas ─────────────────────────────────────────────────────────────────

export async function getEmpresas(): Promise<Empresa[]> {
  const { data } = await httpClient.get<ApiEmpresa[]>('api/empresas')
  return data.map(mapEmpresa)
}

export async function getEmpresa(idEmpresa: number): Promise<Empresa> {
  const { data } = await httpClient.get<ApiEmpresa>(`api/empresas/${idEmpresa}`)
  return mapEmpresa(data)
}

export async function postEmpresa(nombreEmpresa: string): Promise<void> {
  await httpClient.post(`api/empresas/createempresa/${encodeURIComponent(nombreEmpresa)}`)
}

export async function putEmpresa(idEmpresa: number, nombreEmpresa: string): Promise<void> {
  await httpClient.put(
    `api/empresas/updateempresa/${idEmpresa}/${encodeURIComponent(nombreEmpresa)}`
  )
}

export async function deleteEmpresa(idEmpresa: number): Promise<void> {
  await httpClient.delete(`api/empresas/${idEmpresa}`)
}

// ─── Categorias ───────────────────────────────────────────────────────────────

export async function getCategorias(): Promise<Categoria[]> {
  const { data } = await httpClient.get<Categoria[]>('api/categoriastimer')
  return data
}

export async function getCategoria(idCategoria: number): Promise<Categoria> {
  const { data } = await httpClient.get<Categoria>(`api/categoriastimer/${idCategoria}`)
  return data
}

export async function postCategoria(categoria: Omit<Categoria, 'idCategoria'>): Promise<void> {
  await httpClient.post('api/categoriastimer', { idCategoria: 0, ...categoria })
  emitSyncData()
}

export async function putCategoria(categoria: Categoria): Promise<void> {
  await httpClient.put('api/categoriastimer', categoria)
  emitSyncData()
}

export async function deleteCategoria(idCategoria: number): Promise<void> {
  await httpClient.delete(`api/categoriastimer/${idCategoria}`)
  emitSyncData()
}

// ─── Temporizadores ───────────────────────────────────────────────────────────

export async function getTemporizadores(): Promise<Timer[]> {
  const { data } = await httpClient.get<Timer[]>('api/timers')
  return data
}

export async function postTemporizador(timer: Omit<Timer, 'idTemporizador'>): Promise<void> {
  await httpClient.post('api/timers', { idTemporizador: 0, ...timer })
  emitSyncData()
}

export async function putTemporizador(timer: Timer): Promise<void> {
  await httpClient.put('api/timers', timer)
  emitSyncData()
}

export async function deleteTemporizador(idTimer: number): Promise<void> {
  await httpClient.delete(`api/timers/${idTimer}`)
  emitSyncData()
}

export async function updateIncreaseTimers(minutes: number): Promise<void> {
  await httpClient.put(`api/timers/increasetimers/${minutes}`)
  emitSyncData()
}

// ─── TiempoEmpresaSala ────────────────────────────────────────────────────────

export async function getTES(): Promise<TiempoEmpresaSala[]> {
  const { data } = await httpClient.get<TiempoEmpresaSala[]>('api/TiempoEmpresaSala')
  return data
}

export async function postTES(tes: TiempoEmpresaSala): Promise<void> {
  await httpClient.post('api/TiempoEmpresaSala', tes)
}

export async function deleteTES(idTES: number): Promise<void> {
  await httpClient.delete(`api/TiempoEmpresaSala/${idTES}`)
}

// ─── TimerEventos (vista JOIN) ────────────────────────────────────────────────

export async function getTimersEventos(): Promise<TimerEvento[]> {
  const { data } = await httpClient.get<ApiTimerEvento[]>('api/timereventos')
  return data.map(mapTimerEvento)
}

export async function getEmpresasTimers(): Promise<Empresa[]> {
  const { data } = await httpClient.get<ApiEmpresa[]>('api/timereventos/empresastimers')
  return data.map(mapEmpresa)
}

export async function findTimersActualesEmpresa(idEmpresa: number): Promise<TimerEvento[]> {
  const { data } = await httpClient.get<ApiTimerEvento[]>(
    `api/timereventos/eventosactualesempresa/${idEmpresa}`
  )
  return data.map(mapTimerEvento)
}

export async function findTimersEventosEmpresa(idEmpresa: number): Promise<TimerEvento[]> {
  const { data } = await httpClient.get<ApiTimerEvento[]>(
    `api/timereventos/eventosempresa/${idEmpresa}`
  )
  return data.map(mapTimerEvento)
}

export async function findTimersEventosSala(idSala: number): Promise<TimerEvento[]> {
  const { data } = await httpClient.get<ApiTimerEvento[]>(
    `api/timereventos/eventossala/${idSala}`
  )
  return data.map(mapTimerEvento)
}
