import type {
  Instrutor,
  Veiculo,
  Aluno,
  Aula,
  Gasto,
  Pagamento,
  PagamentoComAluno,
  HorarioFuncionamento,
  Configuracao,
  Usuario,
  AuthResponse,
  PerfilUsuario
} from '@shared/types'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('agenda_auth_token') : null
  const authHeaders: Record<string, string> = {}
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers
    }
  })

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      if (!path.includes('/auth/login')) {
        localStorage.removeItem('agenda_auth_token')
        window.dispatchEvent(new CustomEvent('agenda:unauthorized'))
      }
    }
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Erro ${res.status}: ${res.statusText}`)
  }

  return res.json()
}

export function createWebApiClient() {
  return {
    // ---- Instrutores ----
    listarInstrutores: (filtro?: { status?: string }): Promise<Instrutor[]> => {
      const q = filtro?.status ? `?status=${encodeURIComponent(filtro.status)}` : ''
      return request<Instrutor[]>(`/api/instrutores${q}`)
    },
    criarInstrutor: (instrutor: Omit<Instrutor, 'id' | 'criado_em'>): Promise<Instrutor> =>
      request<Instrutor>('/api/instrutores', {
        method: 'POST',
        body: JSON.stringify(instrutor)
      }),
    atualizarInstrutor: (id: number, instrutor: Partial<Instrutor>): Promise<void> =>
      request<void>(`/api/instrutores/${id}`, {
        method: 'PUT',
        body: JSON.stringify(instrutor)
      }),
    deletarInstrutor: (id: number): Promise<void> =>
      request<void>(`/api/instrutores/${id}`, { method: 'DELETE' }),

    // ---- Veículos ----
    listarVeiculos: (filtro?: { status?: string }): Promise<Veiculo[]> => {
      const q = filtro?.status ? `?status=${encodeURIComponent(filtro.status)}` : ''
      return request<Veiculo[]>(`/api/veiculos${q}`)
    },
    criarVeiculo: (veiculo: Omit<Veiculo, 'id' | 'criado_em'>): Promise<Veiculo> =>
      request<Veiculo>('/api/veiculos', {
        method: 'POST',
        body: JSON.stringify(veiculo)
      }),
    atualizarVeiculo: (id: number, veiculo: Partial<Veiculo>): Promise<void> =>
      request<void>(`/api/veiculos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(veiculo)
      }),
    deletarVeiculo: (id: number): Promise<void> =>
      request<void>(`/api/veiculos/${id}`, { method: 'DELETE' }),

    // ---- Alunos ----
    listarAlunos: (filtro?: { status?: string; busca?: string }): Promise<Aluno[]> => {
      const params = new URLSearchParams()
      if (filtro?.status) params.set('status', filtro.status)
      if (filtro?.busca) params.set('busca', filtro.busca)
      const q = params.toString() ? `?${params.toString()}` : ''
      return request<Aluno[]>(`/api/alunos${q}`)
    },
    criarAluno: (aluno: Omit<Aluno, 'id' | 'criado_em'>): Promise<Aluno> =>
      request<Aluno>('/api/alunos', {
        method: 'POST',
        body: JSON.stringify(aluno)
      }),
    obterAluno: (id: number): Promise<Aluno> => request<Aluno>(`/api/alunos/${id}`),
    atualizarAluno: (id: number, aluno: Partial<Aluno>): Promise<void> =>
      request<void>(`/api/alunos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(aluno)
      }),
    deletarAluno: (id: number): Promise<void> =>
      request<void>(`/api/alunos/${id}`, { method: 'DELETE' }),

    // ---- Pagamentos ----
    registrarPagamento: (pagamento: Omit<Pagamento, 'id' | 'criado_em'>): Promise<Pagamento> =>
      request<Pagamento>('/api/pagamentos', {
        method: 'POST',
        body: JSON.stringify(pagamento)
      }),
    listarPagamentos: (filtro?: {
      aluno_id?: number
      data_inicio?: string
      data_fim?: string
    }): Promise<PagamentoComAluno[]> => {
      const params = new URLSearchParams()
      if (filtro?.aluno_id) params.set('aluno_id', String(filtro.aluno_id))
      if (filtro?.data_inicio) params.set('data_inicio', filtro.data_inicio)
      if (filtro?.data_fim) params.set('data_fim', filtro.data_fim)
      const q = params.toString() ? `?${params.toString()}` : ''
      return request<PagamentoComAluno[]>(`/api/pagamentos${q}`)
    },

    // ---- Aulas ----
    listarAulas: (filtro?: {
      data_inicio?: string
      data_fim?: string
      aluno_id?: number
    }): Promise<Aula[]> => {
      const params = new URLSearchParams()
      if (filtro?.data_inicio) params.set('data_inicio', filtro.data_inicio)
      if (filtro?.data_fim) params.set('data_fim', filtro.data_fim)
      if (filtro?.aluno_id) params.set('aluno_id', String(filtro.aluno_id))
      const q = params.toString() ? `?${params.toString()}` : ''
      return request<Aula[]>(`/api/aulas${q}`)
    },
    criarAula: (
      aula: Partial<Aula> & { aluno_id: number; data: string; hora_inicio: string; hora_fim: string }
    ): Promise<Aula> =>
      request<Aula>('/api/aulas', {
        method: 'POST',
        body: JSON.stringify(aula)
      }),
    atualizarAula: (id: number, aula: Partial<Aula>): Promise<void> =>
      request<void>(`/api/aulas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(aula)
      }),
    deletarAula: (id: number): Promise<void> =>
      request<void>(`/api/aulas/${id}`, { method: 'DELETE' }),

    // ---- Gastos ----
    listarGastos: (filtro?: { data_inicio?: string; data_fim?: string }): Promise<Gasto[]> => {
      const params = new URLSearchParams()
      if (filtro?.data_inicio) params.set('data_inicio', filtro.data_inicio)
      if (filtro?.data_fim) params.set('data_fim', filtro.data_fim)
      const q = params.toString() ? `?${params.toString()}` : ''
      return request<Gasto[]>(`/api/gastos${q}`)
    },
    criarGasto: (gasto: Omit<Gasto, 'id' | 'criado_em'>): Promise<Gasto> =>
      request<Gasto>('/api/gastos', {
        method: 'POST',
        body: JSON.stringify(gasto)
      }),
    atualizarGasto: (id: number, gasto: Partial<Gasto>): Promise<void> =>
      request<void>(`/api/gastos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(gasto)
      }),
    deletarGasto: (id: number): Promise<void> =>
      request<void>(`/api/gastos/${id}`, { method: 'DELETE' }),
    totalGastosPeriodo: (inicio: string, fim: string): Promise<number> =>
      request<number>(
        `/api/gastos/total?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`
      ),

    // ---- Relatórios ----
    resumoFinanceiro: (
      inicio: string,
      fim: string
    ): Promise<{
      total_recebido: number
      total_gastos: number
      lucro: number
      por_categoria: Record<string, number>
    }> =>
      request(
        `/api/financeiro/resumo?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`
      ),

    // ---- Horários ----
    listarHorarios: (): Promise<HorarioFuncionamento[]> =>
      request<HorarioFuncionamento[]>('/api/horarios'),
    atualizarHorario: (id: number, horario: Partial<HorarioFuncionamento>): Promise<void> =>
      request<void>(`/api/horarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(horario)
      }),

    // ---- Configurações ----
    obterConfiguracoes: (): Promise<Configuracao> => request<Configuracao>('/api/config'),
    atualizarConfiguracoes: (config: Partial<Configuracao>): Promise<void> =>
      request<void>('/api/config', {
        method: 'PUT',
        body: JSON.stringify(config)
      }),

    // ---- Backup ----
    fazerBackup: async (): Promise<string> => {
      const res = await request<{ arquivo: string }>('/api/backup/make', { method: 'POST' })
      return res.arquivo
    },
    backupParaLocal: async (): Promise<string | null> => {
      return null
    },
    listarBackups: (): Promise<{ arquivo: string; tamanho: number; data: string }[]> =>
      request('/api/backup/list'),
    exportarJson: async (): Promise<void> => {},

    // ---- Notificações ----
    notificar: async (title: string, body: string): Promise<boolean> => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, { body })
          return true
        } else if (Notification.permission !== 'denied') {
          const perm = await Notification.requestPermission()
          if (perm === 'granted') {
            new Notification(title, { body })
            return true
          }
        }
      }
      return false
    },

    // ---- Servidor / Informações de Conexão ----
    obterInfoServidor: (): Promise<{ port: number; ip: string; url: string; allIps: string[] }> =>
      request('/api/server-info'),

    // ---- Autenticação e Usuários ----
    login: (usuario: string, senha: string): Promise<AuthResponse> =>
      request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ usuario, senha })
      }),
    obterUsuarioAtual: (token: string): Promise<Usuario | null> => {
      return request<Usuario>('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => null)
    },
    logout: (token: string): Promise<void> =>
      request<void>('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }),
    alterarMinhaSenha: (dados: { usuarioId: number; senhaAtual: string; novaSenha: string }): Promise<void> =>
      request<void>('/api/auth/alterar-senha', {
        method: 'POST',
        body: JSON.stringify(dados)
      }),
    listarUsuarios: (): Promise<Usuario[]> => request<Usuario[]>('/api/usuarios'),
    criarUsuario: (dados: { nome: string; usuario: string; senha: string; perfil: PerfilUsuario; instrutor_id?: number | null }): Promise<Usuario> =>
      request<Usuario>('/api/usuarios', {
        method: 'POST',
        body: JSON.stringify(dados)
      }),
    atualizarUsuario: (id: number, dados: { nome?: string; usuario?: string; senha?: string; perfil?: PerfilUsuario; instrutor_id?: number | null; ativo?: number }): Promise<void> =>
      request<void>(`/api/usuarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dados)
      }),
    deletarUsuario: (id: number): Promise<void> =>
      request<void>(`/api/usuarios/${id}`, { method: 'DELETE' })
  }
}

