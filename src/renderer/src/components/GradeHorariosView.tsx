import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  User,
  Car,
  Plus,
  Pencil,
  Trash2,
  Sun,
  Sunset,
  Filter
} from 'lucide-react'
import type { Aluno, Aula, Instrutor, Veiculo, Configuracao } from '@shared/types'
import { todayISO, formatDate } from '../lib/format'
import Button from './Button'

export interface AulaComNomes extends Aula {
  aluno_nome: string
  instrutor_nome: string
  veiculo_nome: string
}

interface GradeHorariosViewProps {
  aulas: AulaComNomes[]
  alunos: Aluno[]
  instrutores: Instrutor[]
  veiculos: Veiculo[]
  config: Configuracao | null
  diaAtual: string
  instrutorPadraoId?: number | null
  onDiaChange: (novoDia: string) => void
  onAgendarSlot: (dia: string, horaInicio: string, horaFim: string) => void
  onEditarAula: (aula: AulaComNomes) => void
  onToggleRealizada: (aula: AulaComNomes) => void
  onExcluirAula: (id: number) => void
}

const NOMES_DIAS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
]

function getNomeDiaSemana(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return NOMES_DIAS[date.getDay()]
}

function calcularHoraFim(horaInicio: string, duracaoMinutos = 50): string {
  const [h, m] = horaInicio.split(':').map(Number)
  const totalMin = h * 60 + m + duracaoMinutos
  const endH = Math.floor(totalMin / 60) % 24
  const endM = totalMin % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

function addDias(isoDate: string, dias: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + dias)
  const ny = date.getFullYear()
  const nm = String(date.getMonth() + 1).padStart(2, '0')
  const nd = String(date.getDate()).padStart(2, '0')
  return `${ny}-${nm}-${nd}`
}

export default function GradeHorariosView({
  aulas,
  alunos: _alunos,
  instrutores,
  veiculos,
  config,
  diaAtual,
  instrutorPadraoId,
  onDiaChange,
  onAgendarSlot,
  onEditarAula,
  onToggleRealizada,
  onExcluirAula
}: GradeHorariosViewProps): JSX.Element {
  const [filtroInstrutor, setFiltroInstrutor] = useState<string>(
    instrutorPadraoId ? String(instrutorPadraoId) : ''
  )
  const [filtroVeiculo, setFiltroVeiculo] = useState<string>('')
  const [modoExibicao, setModoExibicao] = useState<'1dia' | '3dias' | 'semana'>('1dia')

  // Horários configurados ou padrões de autoescola (50 min cada)
  const slotsManha = useMemo(() => {
    if (config?.grade_horarios_manha) {
      return config.grade_horarios_manha.split(',').map((s) => s.trim()).filter(Boolean)
    }
    return ['08:00', '08:50', '09:40', '10:30', '11:20']
  }, [config?.grade_horarios_manha])

  const slotsTarde = useMemo(() => {
    if (config?.grade_horarios_tarde) {
      return config.grade_horarios_tarde.split(',').map((s) => s.trim()).filter(Boolean)
    }
    return ['14:00', '14:50', '15:40', '16:30', '17:20']
  }, [config?.grade_horarios_tarde])

  const duracao = config?.duracao_padrao_minutos || 50

  // Dias a exibir conforme o modo selecionado
  const diasExibidos = useMemo(() => {
    if (modoExibicao === '1dia') {
      return [diaAtual]
    }
    if (modoExibicao === '3dias') {
      return [diaAtual, addDias(diaAtual, 1), addDias(diaAtual, 2)]
    }
    // semana (Segunda a Sábado com base na semana do dia selecionado)
    const [y, m, d] = diaAtual.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const dayOfWeek = date.getDay() // 0 = Dom, 1 = Seg...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const segunda = addDias(diaAtual, diffToMonday)
    return [0, 1, 2, 3, 4, 5].map((i) => addDias(segunda, i))
  }, [diaAtual, modoExibicao])

  // Aulas filtradas por instrutor e veículo
  const aulasFiltradas = useMemo(() => {
    return aulas.filter((a) => {
      if (a.status === 'cancelada') return false
      if (filtroInstrutor && String(a.instrutor_id) !== filtroInstrutor) return false
      if (filtroVeiculo && String(a.veiculo_id) !== filtroVeiculo) return false
      return true
    })
  }, [aulas, filtroInstrutor, filtroVeiculo])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Barra de Controles da Grade */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '14px 18px'
        }}
      >
        {/* Navegação de Datas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            variant="secondary"
            onClick={() => onDiaChange(addDias(diaAtual, modoExibicao === 'semana' ? -7 : modoExibicao === '3dias' ? -3 : -1))}
            title="Anterior"
          >
            <ChevronLeft size={16} />
          </Button>

          <Button variant="secondary" onClick={() => onDiaChange(todayISO())}>
            Hoje
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
            <Calendar size={16} color="var(--primary)" />
            <input
              type="date"
              value={diaAtual}
              onChange={(e) => e.target.value && onDiaChange(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--gray-300)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer'
              }}
            />
          </div>

          <Button
            variant="secondary"
            onClick={() => onDiaChange(addDias(diaAtual, modoExibicao === 'semana' ? 7 : modoExibicao === '3dias' ? 3 : 1))}
            title="Próximo"
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        {/* Filtros e Modo de Visualização */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Seletor de Modo: 1 Dia / 3 Dias / Semana */}
          <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 8, padding: 3 }}>
            <button
              type="button"
              onClick={() => setModoExibicao('1dia')}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: modoExibicao === '1dia' ? 'white' : 'transparent',
                color: modoExibicao === '1dia' ? 'var(--primary)' : 'var(--gray-600)',
                boxShadow: modoExibicao === '1dia' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              1 Dia
            </button>
            <button
              type="button"
              onClick={() => setModoExibicao('3dias')}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: modoExibicao === '3dias' ? 'white' : 'transparent',
                color: modoExibicao === '3dias' ? 'var(--primary)' : 'var(--gray-600)',
                boxShadow: modoExibicao === '3dias' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              3 Dias
            </button>
            <button
              type="button"
              onClick={() => setModoExibicao('semana')}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: modoExibicao === 'semana' ? 'white' : 'transparent',
                color: modoExibicao === 'semana' ? 'var(--primary)' : 'var(--gray-600)',
                boxShadow: modoExibicao === 'semana' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Semana
            </button>
          </div>

          {/* Filtro por Instrutor */}
          {!instrutorPadraoId && instrutores.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={14} color="var(--gray-500)" />
              <select
                value={filtroInstrutor}
                onChange={(e) => setFiltroInstrutor(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--gray-300)', fontSize: 13 }}
              >
                <option value="">Todos Instrutores</option>
                {instrutores.map((i) => (
                  <option key={i.id} value={String(i.id)}>
                    {i.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por Veículo */}
          {veiculos.length > 1 && (
            <select
              value={filtroVeiculo}
              onChange={(e) => setFiltroVeiculo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--gray-300)', fontSize: 13 }}
            >
              <option value="">Todos Veículos</option>
              {veiculos.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.nome} {v.placa ? `(${v.placa})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Grade de Dias (Estilo Caderno) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            modoExibicao === '1dia'
              ? '1fr'
              : modoExibicao === '3dias'
                ? 'repeat(auto-fit, minmax(360px, 1fr))'
                : 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16
        }}
      >
        {diasExibidos.map((dia) => {
          const nomeDia = getNomeDiaSemana(dia)
          const isHoje = dia === todayISO()
          const aulasDoDia = aulasFiltradas.filter((a) => a.data === dia)

          return (
            <div
              key={dia}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                padding: '16px 20px',
                borderTop: isHoje ? '4px solid var(--primary)' : '4px solid var(--gray-300)',
                background: isHoje ? '#fafafa' : '#ffffff',
                boxShadow: isHoje ? 'var(--shadow-md)' : 'var(--shadow)'
              }}
            >
              {/* Cabeçalho do Dia (igual ao topo da folha do caderno) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: 10,
                  borderBottom: '2px solid var(--gray-200)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-900)' }}>
                      {formatDate(dia)}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: isHoje ? 'var(--primary)' : 'var(--gray-600)',
                        textTransform: 'capitalize'
                      }}
                    >
                      {nomeDia}
                    </span>
                    {isHoje && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: 'var(--primary)',
                          color: 'white'
                        }}
                      >
                        HOJE
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 500 }}>
                  {aulasDoDia.length} aula{aulasDoDia.length === 1 ? '' : 's'}
                </div>
              </div>

              {/* Duas Colunas: MANHÃ e TARDE (como no caderno da autoescola) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: modoExibicao === 'semana' ? '1fr' : '1fr 1fr',
                  gap: 16
                }}
              >
                {/* Coluna Manhã */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#d97706',
                      padding: '4px 8px',
                      background: '#fffbeb',
                      borderRadius: 6
                    }}
                  >
                    <Sun size={15} />
                    <span>MANHÃ</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {slotsManha.map((horaInicio) => {
                      const horaFim = calcularHoraFim(horaInicio, duracao)
                      // Encontra aula que começa neste horário (ou próxima a ele)
                      const aula = aulasDoDia.find((a) => a.hora_inicio === horaInicio)

                      return (
                        <SlotItem
                          key={`${dia}-${horaInicio}`}
                          horaInicio={horaInicio}
                          horaFim={horaFim}
                          aula={aula}
                          onAgendar={() => onAgendarSlot(dia, horaInicio, horaFim)}
                          onEditar={() => aula && onEditarAula(aula)}
                          onToggleRealizada={() => aula && onToggleRealizada(aula)}
                          onExcluir={() => aula && onExcluirAula(aula.id)}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Coluna Tarde */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#4f46e5',
                      padding: '4px 8px',
                      background: '#eef2ff',
                      borderRadius: 6
                    }}
                  >
                    <Sunset size={15} />
                    <span>TARDE</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {slotsTarde.map((horaInicio) => {
                      const horaFim = calcularHoraFim(horaInicio, duracao)
                      const aula = aulasDoDia.find((a) => a.hora_inicio === horaInicio)

                      return (
                        <SlotItem
                          key={`${dia}-${horaInicio}`}
                          horaInicio={horaInicio}
                          horaFim={horaFim}
                          aula={aula}
                          onAgendar={() => onAgendarSlot(dia, horaInicio, horaFim)}
                          onEditar={() => aula && onEditarAula(aula)}
                          onToggleRealizada={() => aula && onToggleRealizada(aula)}
                          onExcluir={() => aula && onExcluirAula(aula.id)}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Aulas em horários fora da grade padrão (se houver) */}
              {(() => {
                const todosSlots = [...slotsManha, ...slotsTarde]
                const aulasExtras = aulasDoDia.filter((a) => !todosSlots.includes(a.hora_inicio))
                if (aulasExtras.length === 0) return null

                return (
                  <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px dashed var(--gray-300)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 6 }}>
                      Outros horários neste dia:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {aulasExtras.map((extra) => (
                        <SlotItem
                          key={extra.id}
                          horaInicio={extra.hora_inicio}
                          horaFim={extra.hora_fim}
                          aula={extra}
                          onAgendar={() => {}}
                          onEditar={() => onEditarAula(extra)}
                          onToggleRealizada={() => onToggleRealizada(extra)}
                          onExcluir={() => onExcluirAula(extra.id)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface SlotItemProps {
  horaInicio: string
  horaFim: string
  aula?: AulaComNomes
  onAgendar: () => void
  onEditar: () => void
  onToggleRealizada: () => void
  onExcluir: () => void
}

function SlotItem({
  horaInicio,
  horaFim,
  aula,
  onAgendar,
  onEditar,
  onToggleRealizada,
  onExcluir
}: SlotItemProps): JSX.Element {
  // Estado 1: Horário Vago / Livre -> Botão para agendar diretamente com 1 clique
  if (!aula) {
    return (
      <div
        onClick={onAgendar}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px dashed var(--gray-300)',
          background: '#ffffff',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)'
          e.currentTarget.style.background = 'var(--primary-light)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--gray-300)'
          e.currentTarget.style.background = '#ffffff'
        }}
        title={`Clique para agendar aluno neste horário (${horaInicio} às ${horaFim})`}
      >
        <span
          style={{
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: 13,
            color: 'var(--gray-600)',
            width: 48
          }}
        >
          {horaInicio}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-400)', fontSize: 13 }}>
          <Plus size={14} />
          <span>Vago</span>
        </div>
      </div>
    )
  }

  // Estado 2: Horário Ocupado com Aula
  const isRealizada = aula.status === 'realizada'
  const isTeorica = aula.tipo === 'Teórica'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 8,
        border: isRealizada ? '1px solid #10b981' : isTeorica ? '1px solid #8b5cf6' : '1px solid #3b82f6',
        background: isRealizada ? '#ecfdf5' : isTeorica ? '#f5f3ff' : '#eff6ff',
        transition: 'all 0.15s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        {/* Horário */}
        <span
          title={`${horaInicio} às ${horaFim}`}
          style={{
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: 13,
            color: isRealizada ? '#065f46' : 'var(--gray-800)',
            width: 48
          }}
        >
          {horaInicio}
        </span>

        {/* Informações do Aluno e Aula */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: isRealizada ? '#065f46' : 'var(--gray-900)',
                textDecoration: isRealizada ? 'line-through' : 'none'
              }}
            >
              {aula.aluno_nome || 'Aluno'}
            </span>

            {/* Categoria / Tipo */}
            {aula.categoria && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: isRealizada ? '#d1fae5' : '#dbeafe',
                  color: isRealizada ? '#065f46' : '#1e40af'
                }}
              >
                {aula.categoria}
              </span>
            )}

            {/* Observações estilo caderno (ex: (pg), 1/2) */}
            {aula.observacoes && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#b45309',
                  background: '#fef3c7',
                  padding: '1px 6px',
                  borderRadius: 4
                }}
              >
                {aula.observacoes}
              </span>
            )}
          </div>

          {/* Veículo e Instrutor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
            {aula.veiculo_nome && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Car size={12} />
                {aula.veiculo_nome}
              </span>
            )}
            {aula.instrutor_nome && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <User size={12} />
                {aula.instrutor_nome}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Toggle Realizada */}
        <button
          type="button"
          onClick={onToggleRealizada}
          style={{
            border: 'none',
            background: isRealizada ? '#10b981' : 'white',
            color: isRealizada ? 'white' : 'var(--gray-400)',
            width: 26,
            height: 26,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow)'
          }}
          title={isRealizada ? 'Marcar como não realizada' : 'Marcar como realizada'}
        >
          <CheckCircle2 size={16} />
        </button>

        {/* Editar */}
        <button
          type="button"
          onClick={onEditar}
          style={{
            border: 'none',
            background: 'white',
            color: 'var(--gray-600)',
            width: 26,
            height: 26,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow)'
          }}
          title="Editar aula"
        >
          <Pencil size={13} />
        </button>

        {/* Excluir */}
        <button
          type="button"
          onClick={onExcluir}
          style={{
            border: 'none',
            background: 'white',
            color: 'var(--danger)',
            width: 26,
            height: 26,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow)'
          }}
          title="Excluir aula"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
