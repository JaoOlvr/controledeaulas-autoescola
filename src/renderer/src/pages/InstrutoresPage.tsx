import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { Field } from '../components/Fields'
import type { Instrutor } from '@shared/types'
import { maskPhone } from '../lib/format'

function InstrutoresPage(): JSX.Element {
  const [instrutores, setInstrutores] = useState<Instrutor[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Instrutor | null>(null)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    categoria: '',
    status: 'ativo'
  })

  const loadInstrutores = useCallback(async () => {
    try {
      const data = await window.api.listarInstrutores()
      setInstrutores(data)
    } catch (error) {
      console.error('Erro ao carregar instrutores:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInstrutores()
  }, [loadInstrutores])

  function openNovo(): void {
    setForm({ nome: '', telefone: '', categoria: '', status: 'ativo' })
    setEditando(null)
    setModalOpen(true)
  }

  function openEditar(instrutor: Instrutor): void {
    setForm({
      nome: instrutor.nome,
      telefone: instrutor.telefone ?? '',
      categoria: instrutor.categoria ?? '',
      status: instrutor.status
    })
    setEditando(instrutor)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.nome) return

    try {
      if (editando) {
        await window.api.atualizarInstrutor(editando.id, {
          nome: form.nome,
          telefone: form.telefone,
          categoria: form.categoria,
          status: form.status as Instrutor['status']
        })
      } else {
        await window.api.criarInstrutor({
          nome: form.nome,
          telefone: form.telefone,
          categoria: form.categoria,
          status: 'ativo'
        })
      }
      setModalOpen(false)
      await loadInstrutores()
    } catch (error) {
      console.error('Erro ao salvar instrutor:', error)
    }
  }

  async function handleDelete(instrutor: Instrutor): Promise<void> {
    if (confirm(`Desativar instrutor ${instrutor.nome}?`)) {
      await window.api.deletarInstrutor(instrutor.id)
      await loadInstrutores()
    }
  }

  async function toggleStatus(instrutor: Instrutor): Promise<void> {
    await window.api.atualizarInstrutor(instrutor.id, {
      status: instrutor.status === 'ativo' ? 'inativo' : 'ativo'
    })
    await loadInstrutores()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Instrutores</h1>
          <p>Gerencie os instrutores da autoescola</p>
        </div>
        <Button onClick={openNovo}>
          <Plus size={16} />
          Novo Instrutor
        </Button>
      </div>

      {loading ? (
        <div className="empty-state">Carregando...</div>
      ) : instrutores.length === 0 ? (
        <div className="card empty-state">
          <p>Nenhum instrutor cadastrado</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Categorias</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {instrutores.map((instrutor) => (
                <tr key={instrutor.id}>
                  <td>
                    <strong>{instrutor.nome}</strong>
                  </td>
                  <td>{instrutor.telefone || '-'}</td>
                  <td>{instrutor.categoria || '-'}</td>
                  <td>
                    <span
                      className={`badge ${instrutor.status === 'ativo' ? 'badge-active' : 'badge-inactive'}`}
                      onClick={() => toggleStatus(instrutor)}
                      style={{ cursor: 'pointer' }}
                    >
                      {instrutor.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                      <button className="icon-btn" onClick={() => openEditar(instrutor)}>
                        <Pencil size={16} />
                      </button>
                      <button className="icon-btn" onClick={() => handleDelete(instrutor)}>
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
        title={editando ? 'Editar Instrutor' : 'Novo Instrutor'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="instrutor-form">
              {editando ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </>
        }
      >
        <form id="instrutor-form" onSubmit={handleSubmit} className="form-grid">
          <div className="full">
            <Field label="Nome completo" required>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome do instrutor"
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
          <Field label="Categorias que ministra">
            <input
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value.toUpperCase() })}
              placeholder="Ex: A, B, AB"
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}

export default InstrutoresPage
