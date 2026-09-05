import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, FileText, Loader2 } from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { Field } from '../components/Fields'
import type { Gasto } from '@shared/types'
import { formatCurrency, getMonthRange, formatDate, todayISO } from '../lib/format'
import { gerarRelatorioGastos } from '../lib/pdf'

const CATEGORIAS = [
  'Combustível',
  'Manutenção',
  'Peças',
  'Seguro',
  'IPVA',
  'Documentação',
  'Salário Instrutor',
  'Aluguel',
  'Marketing',
  'Outros'
]

const categoriaColors: Record<string, string> = {
  Combustível: '#f59e0b',
  Manutenção: '#ef4444',
  Peças: '#ec4899',
  Seguro: '#3b82f6',
  IPVA: '#06b6d4',
  Documentação: '#8b5cf6',
  'Salário Instrutor': '#10b981',
  Aluguel: '#6366f1',
  Marketing: '#f97316',
  Outros: '#6b7280'
}

function GastosPage(): JSX.Element {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [dataInicio, setDataInicio] = useState(getMonthRange().inicio)
  const [dataFim, setDataFim] = useState(getMonthRange().fim)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Gasto | null>(null)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    descricao: '',
    categoria: 'Combustível',
    valor: '',
    data: todayISO()
  })
  const [gerandoPdf, setGerandoPdf] = useState(false)

  const loadGastos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.listarGastos({ data_inicio: dataInicio, data_fim: dataFim })
      setGastos(data)
    } catch (error) {
      console.error('Erro ao carregar gastos:', error)
    } finally {
      setLoading(false)
    }
  }, [dataInicio, dataFim])

  useEffect(() => {
    loadGastos()
  }, [loadGastos])

  function openNovo(): void {
    setForm({ descricao: '', categoria: 'Combustível', valor: '', data: todayISO() })
    setEditando(null)
    setModalOpen(true)
  }

  function openEditar(gasto: Gasto): void {
    setForm({
      descricao: gasto.descricao,
      categoria: gasto.categoria,
      valor: String(gasto.valor),
      data: gasto.data
    })
    setEditando(gasto)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.descricao || !form.valor) return

    try {
      if (editando) {
        await window.api.atualizarGasto(editando.id, {
          descricao: form.descricao,
          categoria: form.categoria,
          valor: Number(form.valor),
          data: form.data
        })
      } else {
        await window.api.criarGasto({
          descricao: form.descricao,
          categoria: form.categoria,
          valor: Number(form.valor),
          data: form.data
        })
      }
      setModalOpen(false)
      await loadGastos()
    } catch (error) {
      console.error('Erro ao salvar gasto:', error)
    }
  }

  async function handleDelete(gasto: Gasto): Promise<void> {
    if (confirm(`Excluir gasto "${gasto.descricao}"?`)) {
      await window.api.deletarGasto(gasto.id)
      await loadGastos()
    }
  }

  const total = gastos.reduce((acc, g) => acc + g.valor, 0)

  async function gerarPdf(): Promise<void> {
    setGerandoPdf(true)
    try {
      await gerarRelatorioGastos({ gastos, dataInicio, dataFim })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar o relatório PDF.')
    } finally {
      setGerandoPdf(false)
    }
  }

  const gastosPorCategoria = gastos.reduce<Record<string, number>>((acc, g) => {
    acc[g.categoria] = (acc[g.categoria] ?? 0) + g.valor
    return acc
  }, {})

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Gastos</h1>
          <p>Controle despesas com combustível, manutenção e mais</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button onClick={openNovo}>
            <Plus size={16} />
            Novo Gasto
          </Button>
          <Button variant="secondary" onClick={gerarPdf} disabled={gerandoPdf || gastos.length === 0}>
            {gerandoPdf ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}
            {gerandoPdf ? 'Gerando...' : 'Gerar PDF'}
          </Button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total no Período</div>
          <div className="stat-value negative">{formatCurrency(total)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Combustível</div>
          <div className="stat-value">{formatCurrency(gastosPorCategoria['Combustível'] ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Manutenção</div>
          <div className="stat-value">{formatCurrency(gastosPorCategoria['Manutenção'] ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Nº de lançamentos</div>
          <div className="stat-value">{gastos.length}</div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="field" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 12, marginBottom: 2, color: 'var(--gray-500)' }}>De</label>
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 12, marginBottom: 2, color: 'var(--gray-500)' }}>Até</label>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Carregando...</div>
      ) : gastos.length === 0 ? (
        <div className="card empty-state">
          <p>Nenhum gasto no período selecionado</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((gasto) => (
                <tr key={gasto.id}>
                  <td>{formatDate(gasto.data)}</td>
                  <td>
                    <strong>{gasto.descricao}</strong>
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 9999,
                        background: `${categoriaColors[gasto.categoria] ?? '#6b7280'}15`,
                        color: categoriaColors[gasto.categoria] ?? '#6b7280',
                        fontWeight: 500,
                        fontSize: 12
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 9999,
                          background: categoriaColors[gasto.categoria] ?? '#6b7280'
                        }}
                      />
                      {gasto.categoria}
                    </span>
                  </td>
                  <td className="text-danger text-right" style={{ fontWeight: 600 }}>
                    {formatCurrency(gasto.valor)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                      <button className="icon-btn" onClick={() => openEditar(gasto)}>
                        <Pencil size={16} />
                      </button>
                      <button className="icon-btn" onClick={() => handleDelete(gasto)}>
                        <Trash2 size={16} color="var(--danger)" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>
                  Total
                </td>
                <td className="text-danger text-right" style={{ fontWeight: 700 }}>
                  {formatCurrency(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Modal cadastro/edição */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar Gasto' : 'Novo Gasto'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="gasto-form">
              {editando ? 'Salvar Alterações' : 'Registrar'}
            </Button>
          </>
        }
      >
        <form id="gasto-form" onSubmit={handleSubmit} className="form-grid">
          <div className="full">
            <Field label="Descrição" required>
              <input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Troca de óleo, Combustível, Pneu..."
                autoFocus
              />
            </Field>
          </div>
          <Field label="Categoria" required>
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Valor (R$)" required>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
            />
          </Field>
          <div className="full">
            <Field label="Data" required>
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default GastosPage
