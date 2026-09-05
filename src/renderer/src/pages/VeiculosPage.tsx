import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { Field } from '../components/Fields'
import type { Veiculo } from '@shared/types'

const CATEGORIAS = ['A', 'B', 'AB', 'C', 'D', 'E']

function VeiculosPage(): JSX.Element {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Veiculo | null>(null)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    nome: '',
    placa: '',
    categoria: 'B',
    status: 'ativo',
    observacoes: ''
  })

  const loadVeiculos = useCallback(async () => {
    try {
      const data = await window.api.listarVeiculos()
      setVeiculos(data)
    } catch (error) {
      console.error('Erro ao carregar veículos:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVeiculos()
  }, [loadVeiculos])

  function openNovo(): void {
    setForm({ nome: '', placa: '', categoria: 'B', status: 'ativo', observacoes: '' })
    setEditando(null)
    setModalOpen(true)
  }

  function openEditar(veiculo: Veiculo): void {
    setForm({
      nome: veiculo.nome,
      placa: veiculo.placa ?? '',
      categoria: veiculo.categoria || 'B',
      status: veiculo.status,
      observacoes: veiculo.observacoes ?? ''
    })
    setEditando(veiculo)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.nome) return

    try {
      if (editando) {
        await window.api.atualizarVeiculo(editando.id, {
          nome: form.nome,
          placa: form.placa,
          categoria: form.categoria,
          status: form.status as Veiculo['status'],
          observacoes: form.observacoes
        })
      } else {
        await window.api.criarVeiculo({
          nome: form.nome,
          placa: form.placa,
          categoria: form.categoria,
          status: 'ativo',
          observacoes: form.observacoes
        })
      }
      setModalOpen(false)
      await loadVeiculos()
    } catch (error) {
      console.error('Erro ao salvar veículo:', error)
    }
  }

  async function handleDelete(veiculo: Veiculo): Promise<void> {
    if (confirm(`Desativar veículo "${veiculo.nome}"?`)) {
      await window.api.deletarVeiculo(veiculo.id)
      await loadVeiculos()
    }
  }

  async function toggleStatus(veiculo: Veiculo): Promise<void> {
    await window.api.atualizarVeiculo(veiculo.id, {
      status: veiculo.status === 'ativo' ? 'inativo' : 'ativo'
    })
    await loadVeiculos()
  }

  const ativos = veiculos.filter((v) => v.status === 'ativo').length
  const inativos = veiculos.length - ativos

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Veículos</h1>
          <p>Cadastre os veículos utilizados nas aulas</p>
        </div>
        <Button onClick={openNovo}>
          <Plus size={16} />
          Novo Veículo
        </Button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total de Veículos</div>
          <div className="stat-value">{veiculos.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ativos</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {ativos}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Inativos</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {inativos}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Carregando...</div>
      ) : veiculos.length === 0 ? (
        <div className="card empty-state">
          <p>Nenhum veículo cadastrado</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Placa</th>
                <th>Categoria</th>
                <th>Observações</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {veiculos.map((veiculo) => (
                <tr key={veiculo.id}>
                  <td>
                    <strong>{veiculo.nome}</strong>
                  </td>
                  <td>{veiculo.placa || '-'}</td>
                  <td>{veiculo.categoria || '-'}</td>
                  <td>{veiculo.observacoes || '-'}</td>
                  <td>
                    <span
                      className={`badge ${veiculo.status === 'ativo' ? 'badge-active' : 'badge-inactive'}`}
                      onClick={() => toggleStatus(veiculo)}
                      style={{ cursor: 'pointer' }}
                    >
                      {veiculo.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                      <button className="icon-btn" onClick={() => openEditar(veiculo)}>
                        <Pencil size={16} />
                      </button>
                      <button className="icon-btn" onClick={() => handleDelete(veiculo)}>
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
        title={editando ? 'Editar Veículo' : 'Novo Veículo'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="veiculo-form">
              {editando ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </>
        }
      >
        <form id="veiculo-form" onSubmit={handleSubmit} className="form-grid">
          <div className="full">
            <Field label="Nome do veículo" required>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Carro 1, Moto 1"
                autoFocus
              />
            </Field>
          </div>
          <Field label="Placa">
            <input
              value={form.placa}
              onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })}
              placeholder="ABC-1234"
            />
          </Field>
          <Field label="Categoria">
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </Field>
          <div className="full">
            <Field label="Observações">
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Ano, cor, quilometragem, condições..."
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default VeiculosPage