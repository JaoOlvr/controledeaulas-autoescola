import { useState, useEffect, useMemo } from 'react'
import {
  Building2,
  DollarSign,
  ShieldAlert,
  Plus,
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Edit2,
  Trash2,
  X,
  Building
} from 'lucide-react'
import type { Autoescola, ResumoSaaS } from '@shared/types'

export default function MasterAdminPage(): JSX.Element {
  const [resumo, setResumo] = useState<ResumoSaaS | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  // Modais
  const [modalNova, setModalNova] = useState(false)
  const [editando, setEditando] = useState<Autoescola | null>(null)

  // Formulário Nova Autoescola
  const [formNova, setFormNova] = useState({
    nome: '',
    responsavel: '',
    telefone: '',
    email: '',
    plano_valor: 40.0,
    data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    pix_chave: '',
    usuario_admin: '',
    senha_admin: '123456'
  })

  // Formulário Edição
  const [formEdicao, setFormEdicao] = useState<Partial<Autoescola>>({})

  async function carregarDados(): Promise<void> {
    try {
      setCarregando(true)
      const data = await window.api.obterResumoSaaS()
      setResumo(data)
    } catch (err) {
      console.error('Erro ao carregar dados SaaS:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const autoescolasFiltradas = useMemo(() => {
    if (!resumo) return []
    return resumo.autoescolas.filter((ae) => {
      const matchBusca =
        ae.nome.toLowerCase().includes(busca.toLowerCase()) ||
        ae.responsavel?.toLowerCase().includes(busca.toLowerCase()) ||
        ae.email?.toLowerCase().includes(busca.toLowerCase()) ||
        ae.telefone?.includes(busca)

      const matchStatus = filtroStatus === 'todos' || ae.status === filtroStatus
      return matchBusca && matchStatus
    })
  }, [resumo, busca, filtroStatus])

  async function handleSalvarNova(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!formNova.nome.trim()) return

    try {
      await window.api.criarAutoescola(formNova)
      setModalNova(false)
      setFormNova({
        nome: '',
        responsavel: '',
        telefone: '',
        email: '',
        plano_valor: 40.0,
        data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        pix_chave: '',
        usuario_admin: '',
        senha_admin: '123456'
      })
      await carregarDados()
      alert('Nova autoescola cadastrada com sucesso!')
    } catch (err: any) {
      alert(err.message || 'Erro ao criar autoescola.')
    }
  }

  async function handleAlternarStatus(ae: Autoescola): Promise<void> {
    const novoStatus = ae.status === 'ativa' ? 'bloqueada' : 'ativa'
    const confirmMsg =
      novoStatus === 'bloqueada'
        ? `Tem certeza que deseja bloquear a autoescola "${ae.nome}"? O acesso dos instrutores e admin ficará suspenso.`
        : `Deseja reativar o acesso da autoescola "${ae.nome}"?`

    if (!confirm(confirmMsg)) return

    try {
      await window.api.atualizarAutoescola(ae.id, { status: novoStatus })
      await carregarDados()
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status.')
    }
  }

  async function handleSalvarEdicao(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!editando) return

    try {
      await window.api.atualizarAutoescola(editando.id, formEdicao)
      setEditando(null)
      await carregarDados()
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar autoescola.')
    }
  }

  async function handleExcluir(ae: Autoescola): Promise<void> {
    if (ae.id === 1) {
      alert('A Autoescola Piloto (ID 1) não pode ser excluída.')
      return
    }
    if (
      !confirm(
        `ATENÇÃO: Excluir a autoescola "${ae.nome}" apagará todos os dados, alunos e aulas vinculados a ela. Deseja continuar?`
      )
    ) {
      return
    }

    try {
      await window.api.deletarAutoescola(ae.id)
      await carregarDados()
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir autoescola.')
    }
  }

  function getStatusBadge(status: string): JSX.Element {
    if (status === 'ativa') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            background: '#dcfce7',
            color: '#15803d'
          }}
        >
          <CheckCircle2 size={13} /> Ativa
        </span>
      )
    }
    if (status === 'bloqueada') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            background: '#fee2e2',
            color: '#b91c1c'
          }}
        >
          <XCircle size={13} /> Bloqueada
        </span>
      )
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          background: '#fef3c7',
          color: '#b45309'
        }}
      >
        <Clock size={13} /> Período Teste
      </span>
    )
  }

  function abrirWhatsAppCobranca(ae: Autoescola): void {
    const limpo = ae.telefone?.replace(/\D/g, '') || ''
    if (!limpo) {
      alert('Esta autoescola não possui telefone cadastrado.')
      return
    }
    const numero = limpo.startsWith('55') ? limpo : `55${limpo}`
    const msg = encodeURIComponent(
      `Olá ${ae.responsavel || ae.nome}, tudo bem?\n\nPassando para lembrar sobre a mensalidade do sistema de gestão da sua autoescola (${ae.nome}) no valor de R$ ${(Number(ae.plano_valor) || 40).toFixed(2)}.\n\nChave PIX: ${ae.pix_chave || 'contato@agendaaulas.app'}\n\nAssim que realizar o pagamento, basta nos enviar o comprovante por aqui para mantermos seu acesso 100% ativo. Obrigado!`
    )
    window.open(`https://wa.me/${numero}?text=${msg}`, '_blank')
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>👑</span>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--gray-900)', margin: 0 }}>
              Painel Master SaaS
            </h1>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--gray-500)', fontSize: 14 }}>
            Controle de assinantes, cobranças de R$ 40,00/mês e status das autoescolas
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalNova(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            background: 'var(--primary)',
            color: '#ffffff',
            borderRadius: 8,
            border: 'none',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
          }}
        >
          <Plus size={18} />
          <span>Nova Autoescola</span>
        </button>
      </div>

      {/* Cards de Métricas SaaS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 28
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid var(--gray-200)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 10,
              background: '#e0e7ff',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Building2 size={26} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>
              Total de Autoescolas
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--gray-900)' }}>
              {resumo?.total_autoescolas ?? 0}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid var(--gray-200)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 10,
              background: '#dcfce7',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CheckCircle2 size={26} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>
              Autoescolas Ativas
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#15803d' }}>
              {resumo?.total_ativas ?? 0}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid var(--gray-200)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 10,
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <DollarSign size={26} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>
              Faturamento Mensal (MRR)
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#059669' }}>
              R$ {(resumo?.faturamento_mensal_estimado ?? 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid var(--gray-200)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 10,
              background: '#fee2e2',
              color: '#b91c1c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ShieldAlert size={26} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>
              Bloqueadas / Em Atraso
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#b91c1c' }}>
              {resumo?.total_bloqueadas ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 18,
          flexWrap: 'wrap'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#ffffff',
            border: '1px solid var(--gray-300)',
            borderRadius: 8,
            padding: '8px 14px',
            flex: '1 1 300px'
          }}
        >
          <Search size={18} color="var(--gray-400)" />
          <input
            type="text"
            placeholder="Buscar por autoescola, responsável, email ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: 14,
              color: 'var(--gray-800)'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, background: 'var(--gray-100)', padding: 4, borderRadius: 8 }}>
          {[
            { id: 'todos', label: 'Todas' },
            { id: 'ativa', label: 'Ativas' },
            { id: 'bloqueada', label: 'Bloqueadas' },
            { id: 'teste', label: 'Período Teste' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFiltroStatus(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: filtroStatus === tab.id ? '#ffffff' : 'transparent',
                color: filtroStatus === tab.id ? 'var(--primary)' : 'var(--gray-600)',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: filtroStatus === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Autoescolas */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid var(--gray-200)',
          overflow: 'hidden'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
              <th style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: 'var(--gray-500)' }}>
                AUTOESCOLA
              </th>
              <th style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: 'var(--gray-500)' }}>
                RESPONSÁVEL / CONTATO
              </th>
              <th style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: 'var(--gray-500)' }}>
                DADOS DE USO
              </th>
              <th style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: 'var(--gray-500)' }}>
                MENSALIDADE & VENCIMENTO
              </th>
              <th style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: 'var(--gray-500)' }}>
                STATUS
              </th>
              <th
                style={{
                  padding: '14px 18px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--gray-500)',
                  textAlign: 'right'
                }}
              >
                AÇÕES
              </th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--gray-500)' }}>
                  Carregando autoescolas...
                </td>
              </tr>
            ) : autoescolasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--gray-500)' }}>
                  Nenhuma autoescola encontrada.
                </td>
              </tr>
            ) : (
              autoescolasFiltradas.map((ae) => (
                <tr
                  key={ae.id}
                  style={{
                    borderBottom: '1px solid var(--gray-100)',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--gray-50)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                >
                  <td style={{ padding: '16px 18px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: 15 }}>
                      {ae.nome}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>ID #{ae.id}</div>
                  </td>

                  <td style={{ padding: '16px 18px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: 14 }}>
                      {ae.responsavel || 'Não informado'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--gray-600)' }}>
                        {ae.telefone || ae.email || 'Sem contato'}
                      </span>
                      {ae.telefone && (
                        <button
                          type="button"
                          onClick={() => abrirWhatsAppCobranca(ae)}
                          title="Conversar no WhatsApp / Enviar Cobrança"
                          style={{
                            background: '#25D366',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 4,
                            padding: '2px 6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: 11,
                            fontWeight: 700
                          }}
                        >
                          <MessageSquare size={11} /> WhatsApp
                        </button>
                      )}
                    </div>
                  </td>

                  <td style={{ padding: '16px 18px' }}>
                    <div style={{ fontSize: 13, color: 'var(--gray-800)', fontWeight: 600 }}>
                      👥 {ae.total_alunos ?? 0} alunos
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                      🚗 {ae.total_aulas ?? 0} aulas agendadas
                    </div>
                  </td>

                  <td style={{ padding: '16px 18px' }}>
                    <div style={{ fontWeight: 700, color: '#059669', fontSize: 14 }}>
                      R$ {(Number(ae.plano_valor) || 40).toFixed(2)}/mês
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        color: 'var(--gray-600)',
                        marginTop: 2
                      }}
                    >
                      <Calendar size={12} />
                      Vence em: {ae.data_vencimento || 'Não def.'}
                    </div>
                  </td>

                  <td style={{ padding: '16px 18px' }}>{getStatusBadge(ae.status)}</td>

                  <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      {/* Botão Ativar / Bloquear */}
                      <button
                        type="button"
                        onClick={() => handleAlternarStatus(ae)}
                        title={ae.status === 'ativa' ? 'Bloquear Autoescola' : 'Liberar / Ativar Autoescola'}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: 'none',
                          background: ae.status === 'ativa' ? '#fee2e2' : '#dcfce7',
                          color: ae.status === 'ativa' ? '#b91c1c' : '#15803d',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        {ae.status === 'ativa' ? 'Bloquear' : 'Ativar'}
                      </button>

                      {/* Botão Editar */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditando(ae)
                          setFormEdicao({
                            nome: ae.nome,
                            responsavel: ae.responsavel,
                            telefone: ae.telefone,
                            email: ae.email,
                            status: ae.status,
                            plano_valor: ae.plano_valor,
                            data_vencimento: ae.data_vencimento,
                            pix_chave: ae.pix_chave
                          })
                        }}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          border: '1px solid var(--gray-300)',
                          background: '#ffffff',
                          color: 'var(--gray-700)',
                          cursor: 'pointer'
                        }}
                        title="Editar Informações"
                      >
                        <Edit2 size={14} />
                      </button>

                      {/* Botão Excluir */}
                      {ae.id !== 1 && (
                        <button
                          type="button"
                          onClick={() => handleExcluir(ae)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: '1px solid #fee2e2',
                            background: '#fff',
                            color: '#ef4444',
                            cursor: 'pointer'
                          }}
                          title="Excluir Autoescola"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nova Autoescola */}
      {modalNova && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: 16
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 540,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              padding: 24
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building size={22} color="var(--primary)" />
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Cadastrar Nova Autoescola</h2>
              </div>
              <button
                type="button"
                onClick={() => setModalNova(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvarNova} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  Nome da Autoescola *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Autoescola Vitória"
                  value={formNova.nome}
                  onChange={(e) => setFormNova({ ...formNova, nome: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--gray-300)',
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Roberto Carlos"
                    value={formNova.responsavel}
                    onChange={(e) => setFormNova({ ...formNova, responsavel: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--gray-300)',
                      fontSize: 14
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 98765-4321"
                    value={formNova.telefone}
                    onChange={(e) => setFormNova({ ...formNova, telefone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--gray-300)',
                      fontSize: 14
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  E-mail de Contato
                </label>
                <input
                  type="email"
                  placeholder="contato@autoescola.com"
                  value={formNova.email}
                  onChange={(e) => setFormNova({ ...formNova, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--gray-300)',
                    fontSize: 14
                  }}
                />
              </div>

              <div
                style={{
                  background: 'var(--gray-50)',
                  border: '1px solid var(--gray-200)',
                  padding: 12,
                  borderRadius: 8
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', marginBottom: 8 }}>
                  🔑 Acesso Inicial do Administrador da Autoescola
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Usuário de Login
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: admin_vitoria"
                      value={formNova.usuario_admin}
                      onChange={(e) => setFormNova({ ...formNova, usuario_admin: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--gray-300)',
                        fontSize: 13
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Senha Provisória
                    </label>
                    <input
                      type="text"
                      value={formNova.senha_admin}
                      onChange={(e) => setFormNova({ ...formNova, senha_admin: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--gray-300)',
                        fontSize: 13
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    Valor do Plano Mensal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formNova.plano_valor}
                    onChange={(e) => setFormNova({ ...formNova, plano_valor: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--gray-300)',
                      fontSize: 14
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    Primeiro Vencimento
                  </label>
                  <input
                    type="date"
                    value={formNova.data_vencimento}
                    onChange={(e) => setFormNova({ ...formNova, data_vencimento: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--gray-300)',
                      fontSize: 14
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  Chave PIX da Plataforma para Cobrança
                </label>
                <input
                  type="text"
                  placeholder="Ex: seu-pix@banco.com ou celular"
                  value={formNova.pix_chave}
                  onChange={(e) => setFormNova({ ...formNova, pix_chave: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--gray-300)',
                    fontSize: 14
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setModalNova(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid var(--gray-300)',
                    background: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Criar e Liberar Autoescola
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edição */}
      {editando && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: 16
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 500,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Editar Autoescola #{editando.id}</h2>
              <button
                type="button"
                onClick={() => setEditando(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Nome</label>
                <input
                  type="text"
                  required
                  value={formEdicao.nome ?? ''}
                  onChange={(e) => setFormEdicao({ ...formEdicao, nome: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--gray-300)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    Responsável
                  </label>
                  <input
                    type="text"
                    value={formEdicao.responsavel ?? ''}
                    onChange={(e) => setFormEdicao({ ...formEdicao, responsavel: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--gray-300)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Status</label>
                  <select
                    value={formEdicao.status ?? 'ativa'}
                    onChange={(e) => setFormEdicao({ ...formEdicao, status: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--gray-300)' }}
                  >
                    <option value="ativa">Ativa</option>
                    <option value="bloqueada">Bloqueada (Mensalidade Pendente)</option>
                    <option value="teste">Período de Teste</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formEdicao.telefone ?? ''}
                    onChange={(e) => setFormEdicao({ ...formEdicao, telefone: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--gray-300)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>E-mail</label>
                  <input
                    type="email"
                    value={formEdicao.email ?? ''}
                    onChange={(e) => setFormEdicao({ ...formEdicao, email: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--gray-300)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    Valor Plano (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formEdicao.plano_valor ?? 40}
                    onChange={(e) => setFormEdicao({ ...formEdicao, plano_valor: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--gray-300)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    Data Vencimento
                  </label>
                  <input
                    type="date"
                    value={formEdicao.data_vencimento ?? ''}
                    onChange={(e) => setFormEdicao({ ...formEdicao, data_vencimento: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--gray-300)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  Chave PIX para Cobrança
                </label>
                <input
                  type="text"
                  value={formEdicao.pix_chave ?? ''}
                  onChange={(e) => setFormEdicao({ ...formEdicao, pix_chave: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--gray-300)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid var(--gray-300)',
                    background: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
