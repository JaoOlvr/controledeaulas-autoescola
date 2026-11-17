export interface Autoescola {
  id: number
  nome: string
  responsavel: string
  telefone: string
  email: string
  status: 'ativa' | 'bloqueada' | 'teste'
  plano_valor: number
  data_vencimento: string
  pix_chave?: string
  criado_em?: string
  total_alunos?: number
  total_aulas?: number
}

export interface Instrutor {
  id: number
  autoescola_id?: number
  nome: string
  telefone: string
  categoria: string
  status: 'ativo' | 'inativo'
  criado_em: string
}

export interface Veiculo {
  id: number
  autoescola_id?: number
  nome: string
  placa: string
  categoria: string
  status: 'ativo' | 'inativo'
  observacoes: string
  criado_em: string
}

export interface Aluno {
  id: number
  autoescola_id?: number
  nome: string
  telefone: string
  cpf: string
  categoria: string
  orcamento_total: number
  orcamento_pago: number
  status: 'ativo' | 'concluido' | 'cancelado'
  criado_em: string
}

export interface Aula {
  id: number
  autoescola_id?: number
  aluno_id: number
  instrutor_id: number | null
  veiculo_id: number | null
  data: string
  hora_inicio: string
  hora_fim: string
  categoria: string
  tipo: string
  status: 'agendada' | 'realizada' | 'cancelada'
  observacoes: string
  criado_em: string
  aluno_nome?: string
  instrutor_nome?: string
  veiculo_nome?: string
}

export interface Gasto {
  id: number
  autoescola_id?: number
  descricao: string
  categoria: string
  valor: number
  data: string
  criado_em: string
}

export interface Pagamento {
  id: number
  autoescola_id?: number
  aluno_id: number
  valor: number
  data: string
  metodo: string
  observacoes: string
  criado_em: string
}

export interface PagamentoComAluno extends Pagamento {
  aluno_nome: string
}

export interface HorarioFuncionamento {
  id: number
  autoescola_id?: number
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  ativo: number
}

export type PerfilUsuario = 'superadmin' | 'admin' | 'instrutor'

export interface Usuario {
  id: number
  autoescola_id?: number | null
  nome: string
  usuario: string
  perfil: PerfilUsuario
  instrutor_id?: number | null
  ativo: number
  criado_em?: string
  instrutor_nome?: string
  autoescola_nome?: string
  autoescola_status?: 'ativa' | 'bloqueada' | 'teste'
  autoescola_pix?: string
  autoescola_vencimento?: string
}

export interface AuthResponse {
  token: string
  usuario: Usuario
}

export interface Configuracao {
  autoescola_id?: number
  nome_autoescola: string
  horario_padrao_inicio: string
  duracao_padrao_minutos: number
  backup_automatico: boolean
  backup_intervalo_dias: number
  ultimo_backup: string | null
  modo_agenda?: 'grade' | 'calendario'
  grade_horarios_manha?: string
  grade_horarios_tarde?: string
}

export interface ResumoSaaS {
  total_autoescolas: number
  total_ativas: number
  total_bloqueadas: number
  total_teste: number
  faturamento_mensal_estimado: number
  autoescolas: Autoescola[]
}
