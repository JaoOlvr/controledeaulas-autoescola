export interface Instrutor {
  id: number
  nome: string
  telefone: string
  categoria: string
  status: 'ativo' | 'inativo'
  criado_em: string
}

export interface Veiculo {
  id: number
  nome: string
  placa: string
  categoria: string
  status: 'ativo' | 'inativo'
  observacoes: string
  criado_em: string
}

export interface Aluno {
  id: number
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
  descricao: string
  categoria: string
  valor: number
  data: string
  criado_em: string
}

export interface Pagamento {
  id: number
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
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  ativo: number
}

export interface Configuracao {
  nome_autoescola: string
  horario_padrao_inicio: string
  duracao_padrao_minutos: number
  backup_automatico: boolean
  backup_intervalo_dias: number
  ultimo_backup: string | null
}
