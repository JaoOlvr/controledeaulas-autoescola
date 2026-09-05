import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import {
  Plus,
  CalendarX2,
  Pencil,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  Loader2
} from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { Field } from '../components/Fields'
import type { Aluno, Aula, Instrutor, Veiculo } from '@shared/types'
import { todayISO } from '../lib/format'
import { gerarRelatorioAulas } from '../lib/pdf'

function formatDiaCurto(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

interface AulaComNomes extends Aula {
  aluno_nome: string
  instrutor_nome: string
  veiculo_nome: string
}

function CalendarioPage(): JSX.Element {
  const [aulas, setAulas] = useState<AulaComNomes[]>([])
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [instrutores, setInstrutores] = useState<Instrutor[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDetalhes, setModalDetalhes] = useState<AulaComNomes | null>(null)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [erro, setErro] = useState('')
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)
  const [vistaAtual, setVistaAtual] = useState<string>('dayGridMonth')

  const [form, setForm] = useState({
    aluno_id: '',
    instrutor_id: '',
    veiculo_id: '',
    data: todayISO(),
    hora_inicio: '08:00',
    hora_fim: '09:00',
    tipo: 'Prática',
    observacoes: ''
  })

  const loadDados = useCallback(async () => {
    try {
      const [aulasData, alunosData, instrutoresData, veiculosData] = await Promise.all([
        window.api.listarAulas(),
        window.api.listarAlunos({ status: 'ativo' }),
        window.api.listarInstrutores({ status: 'ativo' }),
        window.api.listarVeiculos({ status: 'ativo' })
      ])
      setAulas(aulasData as AulaComNomes[])
      setAlunos(alunosData)
      setInstrutores(instrutoresData)
      setVeiculos(veiculosData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDados()
  }, [loadDados])

  const calendarRef = useRef<FullCalendar>(null)

  const eventos = useMemo(() => {
    return aulas
      .filter((a) => a.status !== 'cancelada')
      .map((aula) => ({
        id: String(aula.id),
        title: `${aula.aluno_nome || 'Aluno'}${aula.tipo ? ` (${aula.tipo})` : ''}`,
        start: `${aula.data}T${aula.hora_inicio}`,
        end: `${aula.data}T${aula.hora_fim}`,
        backgroundColor:
          aula.status === 'realizada'
            ? '#10b981'
            : aula.status === 'cancelada'
              ? '#ef4444'
              : aula.tipo === 'Teórica'
                ? '#3b82f6'
                : '#8b5cf6',
        borderColor: 'transparent',
        extendedProps: { aula }
      }))
  }, [aulas])

  function handleDateClick(arg: { dateStr: string }): void {
    const tema = calendarRef.current?.getApi().getOption('firstDay')
    void tema
    setErro('')
    setDiaSelecionado(arg.dateStr)
    calendarRef.current?.getApi().select(arg.dateStr)
    setForm((prev) => ({
      ...prev,
      data: arg.dateStr,
      hora_inicio: '08:00',
      hora_fim: '09:00',
      veiculo_id: prev.veiculo_id || (veiculos[0] ? String(veiculos[0].id) : '')
    }))
    setEditandoId(null)
    setModalOpen(true)
  }

  function handleEventClick(arg: { event: { id: string } }): void {
    const aula = aulas.find((a) => String(a.id) === arg.event.id)
    if (aula) {
      setModalDetalhes(aula)
    }
  }

  function openNovoAula(): void {
    setErro('')
    setForm({
      aluno_id: '',
      instrutor_id: '',
      veiculo_id: veiculos[0] ? String(veiculos[0].id) : '',
      data: todayISO(),
      hora_inicio: '08:00',
      hora_fim: '09:00',
      tipo: 'Prática',
      observacoes: ''
    })
    setEditandoId(null)
    setModalOpen(true)
  }

  function openEditar(aula: AulaComNomes): void {
    setErro('')
    setForm({
      aluno_id: String(aula.aluno_id),
      instrutor_id: String(aula.instrutor_id ?? ''),
      veiculo_id: String(aula.veiculo_id ?? ''),
      data: aula.data,
      hora_inicio: aula.hora_inicio,
      hora_fim: aula.hora_fim,
      tipo: aula.tipo ?? '',
      observacoes: aula.observacoes ?? ''
    })
    setEditandoId(aula.id)
    setModalDetalhes(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!form.aluno_id) return
    setErro('')

    const dados: Partial<Aula> = {
      aluno_id: Number(form.aluno_id),
      instrutor_id: form.instrutor_id ? Number(form.instrutor_id) : null,
      veiculo_id: form.veiculo_id ? Number(form.veiculo_id) : null,
      data: form.data,
      hora_inicio: form.hora_inicio,
      hora_fim: form.hora_fim,
      tipo: form.tipo,
      observacoes: form.observacoes
    }

    try {
      if (editandoId) {
        await window.api.atualizarAula(editandoId, dados)
      } else {
        await window.api.criarAula({
          aluno_id: Number(form.aluno_id),
          data: form.data,
          hora_inicio: form.hora_inicio,
          hora_fim: form.hora_fim,
          instrutor_id: form.instrutor_id ? Number(form.instrutor_id) : null,
          veiculo_id: form.veiculo_id ? Number(form.veiculo_id) : null,
          categoria: alunos.find((a) => a.id === Number(form.aluno_id))?.categoria ?? '',
          tipo: form.tipo,
          status: 'agendada',
          observacoes: form.observacoes ?? ''
        })
      }
      await loadDados()
      setModalOpen(false)
    } catch (error) {
      const mensagem = String(error)
        .replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
        .replace(/^Error: /, '')
      setErro(mensagem || 'Não foi possível salvar a aula.')
      console.error('Erro ao salvar aula:', error)
    }
  }

  async function handleStatus(status: 'realizada' | 'cancelada'): Promise<void> {
    if (!modalDetalhes) return
    try {
      await window.api.atualizarAula(modalDetalhes.id, { status })
      await loadDados()
      setModalDetalhes(null)
      if (status === 'realizada') {
        window.api.notificar('Aula concluída', `Aula de ${modalDetalhes.aluno_nome} marcada como realizada`)
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!modalDetalhes) return
    if (confirm('Excluir esta aula?')) {
      await window.api.deletarAula(modalDetalhes.id)
      setModalDetalhes(null)
      await loadDados()
    }
  }

  function prevMonth(): void {
    calendarRef.current?.getApi().prev()
  }

  function nextMonth(): void {
    calendarRef.current?.getApi().next()
  }

  function goToday(): void {
    calendarRef.current?.getApi().today()
  }

  function expandirDia(dia?: string | null): void {
    const api = calendarRef.current?.getApi()
    if (!api) return
    const alvo = dia ?? diaSelecionado ?? api.getDate()
    api.changeView('timeGridDay', alvo)
  }

  function voltaMes(): void {
    calendarRef.current?.getApi().changeView('dayGridMonth')
  }

  async function gerarAgendaPdf(): Promise<void> {
    setGerandoPdf(true)
    try {
      const api = calendarRef.current?.getApi()
      const alvo = api?.view?.currentStart ?? new Date()
      const inicio = new Date(alvo.getFullYear(), alvo.getMonth(), 1)
      const fim = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0)
      const isoInicio = inicio.toISOString().split('T')[0]
      const isoFim = fim.toISOString().split('T')[0]

      const data = await window.api.listarAulas({ data_inicio: isoInicio, data_fim: isoFim })
      await gerarRelatorioAulas({
        aulas: data as AulaComNomes[],
        dataInicio: isoInicio,
        dataFim: isoFim
      })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar o relatório PDF.')
    } finally {
      setGerandoPdf(false)
    }
  }

  const alunoSelecionado = alunos.find((a) => a.id === Number(form.aluno_id))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Calendário</h1>
          <p>Agende e gerencie suas aulas</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={prevMonth}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="secondary" onClick={goToday}>
            Hoje
          </Button>
          <Button variant="secondary" onClick={nextMonth}>
            <ChevronRight size={16} />
          </Button>
          {vistaAtual !== 'dayGridMonth' && (
            <Button variant="secondary" onClick={voltaMes}>
              Mês
            </Button>
          )}
          {vistaAtual === 'dayGridMonth' && (
            <Button variant="secondary" onClick={() => expandirDia()} disabled={!diaSelecionado}>
              <Maximize2 size={16} />
              Expandir Dia{diaSelecionado ? ` (${formatDiaCurto(diaSelecionado)})` : ''}
            </Button>
          )}
          <Button variant="secondary" onClick={gerarAgendaPdf} disabled={gerandoPdf}>
            {gerandoPdf ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}
            {gerandoPdf ? 'Gerando...' : 'PDF'}
          </Button>
          <Button onClick={openNovoAula}>
            <Plus size={16} />
            Nova Aula
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Carregando...</div>
      ) : (
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'title',
            center: '',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          locale={ptBrLocale}
          events={eventos}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          datesSet={(info) => setVistaAtual(info.view.type)}
          selectable={true}
          editable={false}
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="21:00:00"
          allDaySlot={false}
          nowIndicator={true}
          businessHours={false}
        />
      )}

      {/* Modal para criar/editar aula */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editandoId ? 'Editar Aula' : 'Nova Aula'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="aula-form">
              {editandoId ? 'Salvar Alterações' : 'Agendar Aula'}
            </Button>
          </>
        }
      >
        <form id="aula-form" onSubmit={handleSubmit} className="form-grid">
          {erro && (
            <div className="full">
              <div className="alert alert-danger">{erro}</div>
            </div>
          )}
          <Field label="Aluno" required>
            <select
              value={form.aluno_id}
              onChange={(e) => setForm({ ...form, aluno_id: e.target.value })}
            >
              <option value="">Selecione o aluno</option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome} - {a.categoria}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Instrutor">
            <select
              value={form.instrutor_id}
              onChange={(e) => setForm({ ...form, instrutor_id: e.target.value })}
            >
              <option value="">Sem instrutor</option>
              {instrutores.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Veículo" required>
            <select
              value={form.veiculo_id}
              onChange={(e) => setForm({ ...form, veiculo_id: e.target.value })}
            >
              <option value="">Selecione o veículo</option>
              {veiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome} {v.placa ? `(${v.placa})` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data" required>
            <input
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
            />
          </Field>
          <Field label="Tipo de Aula">
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="Prática">Prática</option>
              <option value="Teórica">Teórica</option>
            </select>
          </Field>
          <Field label="Hora Início" required>
            <input
              type="time"
              value={form.hora_inicio}
              onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
            />
          </Field>
          <Field label="Hora Fim" required>
            <input
              type="time"
              value={form.hora_fim}
              onChange={(e) => setForm({ ...form, hora_fim: e.target.value })}
            />
          </Field>
          <div className="full">
            <Field label="Observações">
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Notas sobre a aula..."
              />
            </Field>
          </div>
          {alunoSelecionado && (
            <div className="full">
              <div className="alert alert-success">
                Orçamento do aluno: <strong>R$ {alunoSelecionado.orcamento_total.toFixed(2)}</strong> - Pago:{' '}
                <strong>R$ {alunoSelecionado.orcamento_pago.toFixed(2)}</strong> - Restante:{' '}
                <strong>
                  R$ {(alunoSelecionado.orcamento_total - alunoSelecionado.orcamento_pago).toFixed(2)}
                </strong>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Modal de detalhes da aula */}
      <Modal
        open={modalDetalhes !== null}
        onClose={() => setModalDetalhes(null)}
        title="Detalhes da Aula"
        footer={
          <>
            {modalDetalhes?.status !== 'realizada' && (
              <>
                <Button variant="danger" onClick={() => handleStatus('cancelada')}>
                  <CalendarX2 size={16} />
                  Cancelar
                </Button>
                <Button variant="success" onClick={() => handleStatus('realizada')}>
                  <CheckCircle2 size={16} />
                  Realizada
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={() => modalDetalhes && openEditar(modalDetalhes)}>
              <Pencil size={16} />
              Editar
            </Button>
            <Button variant="ghost" onClick={() => {
              if (modalDetalhes) {
                const dia = modalDetalhes.data
                setModalDetalhes(null)
                expandirDia(dia)
              }
            }}>
              <Maximize2 size={16} />
              Ver Dia
            </Button>
            <Button variant="ghost" onClick={handleDelete}>
              Excluir
            </Button>
          </>
        }
      >
        {modalDetalhes && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <strong>Aluno:</strong> {modalDetalhes.aluno_nome || 'N/A'}
            </div>
            <div>
              <strong>Instrutor:</strong> {modalDetalhes.instrutor_nome || 'N/A'}
            </div>
            <div>
              <strong>Veículo:</strong> {modalDetalhes.veiculo_nome || 'N/A'}
            </div>
            <div>
              <strong>Data:</strong>{' '}
              {new Date(modalDetalhes.data + 'T12:00:00').toLocaleDateString('pt-BR')}
            </div>
            <div>
              <strong>Horário:</strong> {modalDetalhes.hora_inicio} - {modalDetalhes.hora_fim}
            </div>
            <div>
              <strong>Tipo:</strong> {modalDetalhes.tipo || 'Prática'}
            </div>
            <div>
              <strong>Status:</strong>{' '}
              <span className={`badge badge-${modalDetalhes.status}`}>
                {modalDetalhes.status}
              </span>
            </div>
            {modalDetalhes.observacoes && (
              <div>
                <strong>Observações:</strong> {modalDetalhes.observacoes}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default CalendarioPage
