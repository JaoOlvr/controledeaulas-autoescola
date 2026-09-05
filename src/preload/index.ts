import { contextBridge, ipcRenderer } from 'electron'
import type {
  Instrutor,
  Veiculo,
  Aluno,
  Aula,
  Gasto,
  Pagamento,
  PagamentoComAluno,
  HorarioFuncionamento,
  Configuracao
} from '@shared/types'

const api = {
  // ---- Instrutores ----
  listarInstrutores: (filtro?: { status?: string }): Promise<Instrutor[]> =>
    ipcRenderer.invoke('instrutores:list', filtro),
  criarInstrutor: (instrutor: Omit<Instrutor, 'id' | 'criado_em'>): Promise<Instrutor> =>
    ipcRenderer.invoke('instrutores:create', instrutor),
  atualizarInstrutor: (id: number, instrutor: Partial<Instrutor>): Promise<void> =>
    ipcRenderer.invoke('instrutores:update', id, instrutor),
  deletarInstrutor: (id: number): Promise<void> =>
    ipcRenderer.invoke('instrutores:delete', id),

  // ---- Veículos ----
  listarVeiculos: (filtro?: { status?: string }): Promise<Veiculo[]> =>
    ipcRenderer.invoke('veiculos:list', filtro),
  criarVeiculo: (veiculo: Omit<Veiculo, 'id' | 'criado_em'>): Promise<Veiculo> =>
    ipcRenderer.invoke('veiculos:create', veiculo),
  atualizarVeiculo: (id: number, veiculo: Partial<Veiculo>): Promise<void> =>
    ipcRenderer.invoke('veiculos:update', id, veiculo),
  deletarVeiculo: (id: number): Promise<void> =>
    ipcRenderer.invoke('veiculos:delete', id),

  // ---- Alunos ----
  listarAlunos: (filtro?: { status?: string; busca?: string }): Promise<Aluno[]> =>
    ipcRenderer.invoke('alunos:list', filtro),
  criarAluno: (aluno: Omit<Aluno, 'id' | 'criado_em'>): Promise<Aluno> =>
    ipcRenderer.invoke('alunos:create', aluno),
  obterAluno: (id: number): Promise<Aluno> =>
    ipcRenderer.invoke('alunos:get', id),
  atualizarAluno: (id: number, aluno: Partial<Aluno>): Promise<void> =>
    ipcRenderer.invoke('alunos:update', id, aluno),
  deletarAluno: (id: number): Promise<void> =>
    ipcRenderer.invoke('alunos:delete', id),

  // ---- Pagamentos ----
  registrarPagamento: (pagamento: Omit<Pagamento, 'id' | 'criado_em'>): Promise<Pagamento> =>
    ipcRenderer.invoke('pagamentos:create', pagamento),
  listarPagamentos: (filtro?: { aluno_id?: number; data_inicio?: string; data_fim?: string }): Promise<
    PagamentoComAluno[]
  > => ipcRenderer.invoke('pagamentos:list', filtro),

  // ---- Aulas ----
  listarAulas: (filtro?: { data_inicio?: string; data_fim?: string; aluno_id?: number }): Promise<Aula[]> =>
    ipcRenderer.invoke('aulas:list', filtro),
  criarAula: (aula: Partial<Aula> & { aluno_id: number; data: string; hora_inicio: string; hora_fim: string }): Promise<
    Aula
  > => ipcRenderer.invoke('aulas:create', aula),
  atualizarAula: (id: number, aula: Partial<Aula>): Promise<void> =>
    ipcRenderer.invoke('aulas:update', id, aula),
  deletarAula: (id: number): Promise<void> =>
    ipcRenderer.invoke('aulas:delete', id),

  // ---- Gastos ----
  listarGastos: (filtro?: { data_inicio?: string; data_fim?: string }): Promise<Gasto[]> =>
    ipcRenderer.invoke('gastos:list', filtro),
  criarGasto: (gasto: Omit<Gasto, 'id' | 'criado_em'>): Promise<Gasto> =>
    ipcRenderer.invoke('gastos:create', gasto),
  atualizarGasto: (id: number, gasto: Partial<Gasto>): Promise<void> =>
    ipcRenderer.invoke('gastos:update', id, gasto),
  deletarGasto: (id: number): Promise<void> =>
    ipcRenderer.invoke('gastos:delete', id),
  totalGastosPeriodo: (inicio: string, fim: string): Promise<number> =>
    ipcRenderer.invoke('gastos:totalPeriodo', inicio, fim),

  // ---- Relatórios ----
  resumoFinanceiro: (inicio: string, fim: string): Promise<{
    total_recebido: number
    total_gastos: number
    lucro: number
    por_categoria: Record<string, number>
  }> => ipcRenderer.invoke('financeiro:resumo', inicio, fim),

  // ---- Horários ----
  listarHorarios: (): Promise<HorarioFuncionamento[]> =>
    ipcRenderer.invoke('horarios:list'),
  atualizarHorario: (id: number, horario: Partial<HorarioFuncionamento>): Promise<void> =>
    ipcRenderer.invoke('horarios:update', id, horario),

  // ---- Configurações ----
  obterConfiguracoes: (): Promise<Configuracao> =>
    ipcRenderer.invoke('config:get'),
  atualizarConfiguracoes: (config: Partial<Configuracao>): Promise<void> =>
    ipcRenderer.invoke('config:update', config),

  // ---- Backup ----
  fazerBackup: (): Promise<string> =>
    ipcRenderer.invoke('backup:make'),
  backupParaLocal: (): Promise<string | null> =>
    ipcRenderer.invoke('backup:toLocation'),
  listarBackups: (): Promise<{ arquivo: string; tamanho: number; data: string }[]> =>
    ipcRenderer.invoke('backup:list'),
  exportarJson: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('backup:exportJson', filePath),

  // ---- Notificações ----
  notificar: (title: string, body: string): Promise<boolean> =>
    ipcRenderer.invoke('notify:send', { title, body })
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
