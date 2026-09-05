import { useCallback, useEffect, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Wallet,
  History,
  FileText,
  Loader2
} from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { Field } from '../components/Fields'
import type { Aluno, Pagamento } from '@shared/types'
import { maskCpf, maskPhone, formatCurrency } from '../lib/format'
import { gerarRelatorioAlunos } from '../lib/pdf'

interface AlunoComSaldo extends Aluno {
  saldo_devedor: number
}

function AlunosPage(): JSX.Element {
  const [alunos, setAlunos] = useState<AlunoComSaldo[]>([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Aluno | null>(null)
  const [pagamentoModal, setPagamentoModal] = useState<Aluno | null>(null)
  const [pagamentosAluno, setPagamentosAluno] = useState<Pagamento[]>([])
  const [mostrarHistorico, setMostrarHistorico] = useState<AlunoComSaldo | null>(null)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    categoria: 'B',
    orcamento_total: '',
    orcamento_pago: '',
    status: 'ativo'
  })

  const [pagamentoForm, setPagamentoForm] = useState({
    valor: '',
    data: new Date().toISOString().split('T')[0],
    metodo: 'Dinheiro',
    observacoes: ''
  })
  const [gerandoPdf, setGerandoPdf] = useState(false)

  async function gerarPdf(): Promise<void> {
    setGerandoPdf(true)
    try {
      await gerarRelatorioAlunos({ alunos })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar o relatório PDF.')
    } finally {
      setGerandoPdf(false)
    }
  }

  const loadAlunos = useCallback(async () => {
    try {
      const data = await window.api.listarAlunos({
        status: filtroStatus || undefined,
        busca: busca || undefined
      })
      setAlunos(data as AlunoComSaldo[])
    } catch (error) {
      console.error('Erro ao carregar alunos:', error)
    } finally {
      setLoading(false)
    }
  }, [busca, filtroStatus])

  useEffect(() => {
    loadAlunos()
  }, [loadAlunos])

  function openNovo(): void {
    setForm({
      nome: '',
      telefone: '',
      cpf: '',
      categoria: 'B',
      orcamento_total: '',
      orcamento_pago: '',
      status: 'ativo'
    })
    setEditando(null)
    setModalOpen(true)
  }

  function openEditar(aluno: Aluno): void {
    setForm({
      nome: aluno.nome,
      telefone: aluno.telefone ?? '',
      cpf: aluno.cpf ?? '',
      categoria: aluno.categoria ?? 'B',
      orcamento_total: String(aluno.orcamento_total ?? 0),
      orcamento_pago: String(aluno.orcamento_pago ?? 0),
      status: aluno.status
    })
    setEditando(aluno)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.nome) return

    const data = {
      nome: form.nome,
      telefone: form.telefone,
      cpf: form.cpf,
      categoria: form.categoria,
      orcamento_total: Number(form.orcamento_total) || 0,
      orcamento_pago: Number(form.orcamento_pago) || 0,
      status: form.status as Aluno['status']
    }

    try {
      if (editando) {
        await window.api.atualizarAluno(editando.id, data)
      } else {
        await window.api.criarAluno(data)
      }
      setModalOpen(false)
      await loadAlunos()
    } catch (error) {
      console.error('Erro ao salvar aluno:', error)
    }
  }

  async function handleDelete(aluno: Aluno): Promise<void> {
    if (confirm(`Excluir aluno ${aluno.nome}?`)) {
      await window.api.deletarAluno(aluno.id)
      await loadAlunos()
    }
  }

  function openPagamento(aluno: Aluno): void {
    setPagamentoModal(aluno)
    setPagamentoForm({
      valor: String((Number(aluno.orcamento_total) - Number(aluno.orcamento_pago)).toFixed(2)),
      data: new Date().toISOString().split('T')[0],
      metodo: 'Dinheiro',
      observacoes: ''
    })
  }

  async function handlePagamento(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!pagamentoModal) return
    const valor = Number(pagamentoForm.valor)
    if (valor <= 0) return

    try {
      await window.api.registrarPagamento({
        aluno_id: pagamentoModal.id,
        valor,
        data: pagamentoForm.data,
        metodo: pagamentoForm.metodo,
        observacoes: pagamentoForm.observacoes
      })
      setPagamentoModal(null)
      await loadAlunos()
      window.api.notificar('Pagamento registrado', `Pagamento de R$ ${valor.toFixed(2)} para ${pagamentoModal.nome}`)
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error)
    }
  }

  async function openHistorico(aluno: AlunoComSaldo): Promise<void> {
    setMostrarHistorico(aluno)
    const pags = await window.api.listarPagamentos({ aluno_id: aluno.id })
    setPagamentosAluno(pags)
  }

  const statusBadge: Record<string, string> = {
    ativo: 'active',
    concluido: 'concluido',
    cancelado: 'cancelado'
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Alunos</h1>
          <p>Cadastre alunos e gerencie orçamentos</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" onClick={gerarPdf} disabled={gerandoPdf || alunos.length === 0}>
            {gerandoPdf ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}
            {gerandoPdf ? 'Gerando...' : 'Gerar PDF'}
          </Button>
          <Button onClick={openNovo}>
            <Plus size={16} />
            Novo Aluno
          </Button>
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--gray-400)' }} />
          <input
            style={{ paddingLeft: 32, width: '100%' }}
            placeholder="Buscar por nome, CPF ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="concluido">Concluídos</option>
          <option value="cancelado">Cancelados</option>
        </select>
      </div>

      {loading ? (
        <div className="empty-state">Carregando...</div>
      ) : alunos.length === 0 ? (
        <div className="card empty-state">
          <p>Nenhum aluno encontrado</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Categoria</th>
                <th>Orçamento</th>
                <th>Pago</th>
                <th>Saldo</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => (
                <tr key={aluno.id}>
                  <td>
                    <strong>{aluno.nome}</strong>
                    {aluno.cpf && <div style={{ color: 'var(--gray-400)', fontSize: 12 }}>{aluno.cpf}</div>}
                  </td>
                  <td>{aluno.telefone || '-'}</td>
                  <td>{aluno.categoria || '-'}</td>
                  <td>{formatCurrency(aluno.orcamento_total)}</td>
                  <td className="text-success">{formatCurrency(aluno.orcamento_pago)}</td>
                  <td className={aluno.saldo_devedor > 0 ? 'text-danger' : 'text-success'}>
                    {formatCurrency(aluno.saldo_devedor)}
                  </td>
                  <td>
                    <span className={`badge badge-${statusBadge[aluno.status] || 'active'}`}>
                      {aluno.status === 'concluido' ? 'Concluído' : aluno.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                      <button className="icon-btn" title="Registrar pagamento" onClick={() => openPagamento(aluno)}>
                        <Wallet size={16} color="var(--success)" />
                      </button>
                      <button className="icon-btn" title="Histórico" onClick={() => openHistorico(aluno)}>
                        <History size={16} />
                      </button>
                      <button className="icon-btn" title="Editar" onClick={() => openEditar(aluno)}>
                        <Pencil size={16} />
                      </button>
                      <button className="icon-btn" title="Excluir" onClick={() => handleDelete(aluno)}>
                        <Trash2 size={16} color="var(--danger)" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal cadastro/edição */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar Aluno' : 'Novo Aluno'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="aluno-form">
              {editando ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </>
        }
      >
        <form id="aluno-form" onSubmit={handleSubmit} className="form-grid">
          <div className="full">
            <Field label="Nome completo" required>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome do aluno"
                autoFocus
              />
            </Field>
          </div>
          <Field label="Telefone">
            <input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })}
              placeholder="(00) 00000-0000"
            />
          </Field>
          <Field label="CPF">
            <input
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })}
              placeholder="000.000.000-00"
            />
          </Field>
          <Field label="Categoria">
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              {['A', 'B', 'AB', 'C', 'D', 'E', 'ACC'].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ativo">Ativo</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </Field>
          <Field label="Orçamento total (R$)" required>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.orcamento_total}
              onChange={(e) => setForm({ ...form, orcamento_total: e.target.value })}
            />
          </Field>
          <Field label="Valor já pago (R$)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.orcamento_pago}
              onChange={(e) => setForm({ ...form, orcamento_pago: e.target.value })}
            />
          </Field>
        </form>
      </Modal>

      {/* Modal registro de pagamento */}
      <Modal
        open={pagamentoModal !== null}
        onClose={() => setPagamentoModal(null)}
        title={`Registrar Pagamento - ${pagamentoModal?.nome ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPagamentoModal(null)}>
              Cancelar
            </Button>
            <Button variant="success" type="submit" form="pagamento-form">
              Registrar
            </Button>
          </>
        }
      >
        {pagamentoModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="stat-card">
                <div className="stat-label">Orçamento</div>
                <div className="stat-value">{formatCurrency(pagamentoModal.orcamento_total)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Saldo Devedor</div>
                <div className="stat-value text-danger">
                  {formatCurrency(pagamentoModal.orcamento_total - pagamentoModal.orcamento_pago)}
                </div>
              </div>
            </div>
            <form id="pagamento-form" onSubmit={handlePagamento} className="form-grid">
              <Field label="Valor (R$)" required>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pagamentoForm.valor}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, valor: e.target.value })}
                />
              </Field>
              <Field label="Data" required>
                <input
                  type="date"
                  value={pagamentoForm.data}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, data: e.target.value })}
                />
              </Field>
              <Field label="Método">
                <select
                  value={pagamentoForm.metodo}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, metodo: e.target.value })}
                >
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Pix">Pix</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Transferência">Transferência</option>
                </select>
              </Field>
              <div className="full">
                <Field label="Observações">
                  <textarea
                    value={pagamentoForm.observacoes}
                    onChange={(e) => setPagamentoForm({ ...pagamentoForm, observacoes: e.target.value })}
                  />
                </Field>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Modal histórico de pagamentos */}
      <Modal
        open={mostrarHistorico !== null}
        onClose={() => setMostrarHistorico(null)}
        title={`Histórico de Pagamentos - ${mostrarHistorico?.nome ?? ''}`}
      >
        {pagamentosAluno.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum pagamento registrado</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Valor</th>
                  <th>Método</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                {pagamentosAluno.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="text-success">{formatCurrency(p.valor)}</td>
                    <td>{p.metodo || '-'}</td>
                    <td>{p.observacoes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AlunosPage
