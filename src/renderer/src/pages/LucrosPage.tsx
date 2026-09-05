import { useCallback, useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, PiggyBank, FileText, Loader2 } from 'lucide-react'
import Button from '../components/Button'
import { formatCurrency, getCurrentYearRange, getMonthRange } from '../lib/format'
import { gerarRelatorioFinanceiro } from '../lib/pdf'
import type { PagamentoComAluno } from '@shared/types'

interface ResumoFinanceiro {
  total_recebido: number
  total_gastos: number
  lucro: number
  por_categoria: Record<string, number>
}

function LucrosPage(): JSX.Element {
  const [periodo, setPeriodo] = useState<'mes' | 'ano' | 'personalizado'>('mes')
  const [dataInicio, setDataInicio] = useState(getMonthRange().inicio)
  const [dataFim, setDataFim] = useState(getMonthRange().fim)
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null)
  const [loading, setLoading] = useState(true)
  const [gerandoPdf, setGerandoPdf] = useState(false)

  const loadResumo = useCallback(async () => {
    setLoading(true)
    try {
      const r = await window.api.resumoFinanceiro(dataInicio, dataFim)
      setResumo(r)
    } catch (error) {
      console.error('Erro ao carregar resumo financeiro:', error)
    } finally {
      setLoading(false)
    }
  }, [dataInicio, dataFim])

  useEffect(() => {
    loadResumo()
  }, [loadResumo])

  function changePeriodo(p: 'mes' | 'ano' | 'personalizado'): void {
    setPeriodo(p)
    if (p === 'mes') {
      const range = getMonthRange()
      setDataInicio(range.inicio)
      setDataFim(range.fim)
    } else if (p === 'ano') {
      const range = getCurrentYearRange()
      setDataInicio(range.inicio)
      setDataFim(range.fim)
    }
  }

  async function generateReport(): Promise<void> {
    if (!resumo) return
    setGerandoPdf(true)
    try {
      const pagamentos = await window.api.listarPagamentos({ data_inicio: dataInicio, data_fim: dataFim })
      await gerarRelatorioFinanceiro({
        resumo,
        pagamentos: pagamentos as PagamentoComAluno[],
        dataInicio,
        dataFim
      })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar o relatório PDF.')
    } finally {
      setGerandoPdf(false)
    }
  }

  const categorias = resumo?.por_categoria ? Object.entries(resumo.por_categoria) : []
  const categoriaColors = ['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#ec4899']

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Lucros</h1>
          <p>Controle financeiro da autoescola</p>
        </div>
        <Button variant="secondary" onClick={generateReport} disabled={gerandoPdf}>
          {gerandoPdf ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}
          {gerandoPdf ? 'Gerando...' : 'Gerar PDF'}
        </Button>
      </div>

      <div className="filter-bar">
        <Button
          variant={periodo === 'mes' ? 'primary' : 'secondary'}
          onClick={() => changePeriodo('mes')}
        >
          Este Mês
        </Button>
        <Button
          variant={periodo === 'ano' ? 'primary' : 'secondary'}
          onClick={() => changePeriodo('ano')}
        >
          Este Ano
        </Button>
        <Button
          variant={periodo === 'personalizado' ? 'primary' : 'secondary'}
          onClick={() => changePeriodo('personalizado')}
        >
          Personalizado
        </Button>
        {periodo === 'personalizado' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12, marginBottom: 2, color: 'var(--gray-500)' }}>De</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12, marginBottom: 2, color: 'var(--gray-500)' }}>Até</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="empty-state">Carregando...</div>
      ) : !resumo ? (
        <div className="empty-state">Sem dados</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--success-light)' }}>
                <TrendingUp size={20} color="var(--success)" />
              </div>
              <div className="stat-label">Total Recebido</div>
              <div className="stat-value positive">{formatCurrency(resumo.total_recebido)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--danger-light)' }}>
                <TrendingDown size={20} color="var(--danger)" />
              </div>
              <div className="stat-label">Total de Gastos</div>
              <div className="stat-value negative">{formatCurrency(resumo.total_gastos)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>
                <PiggyBank size={20} color="var(--primary)" />
              </div>
              <div className="stat-label">Lucro</div>
              <div className={`stat-value ${resumo.lucro >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(resumo.lucro)}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Gastos por Categoria</div>
            {categorias.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum gasto no período</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {categorias.map(([categoria, total], idx) => {
                  const max = Math.max(...categorias.map(([, t]) => t))
                  const pct = max > 0 ? (total / max) * 100 : 0
                  return (
                    <div key={categoria}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 2,
                              background: categoriaColors[idx % categoriaColors.length]
                            }}
                          />
                          <strong>{categoria}</strong>
                        </div>
                        <span>{formatCurrency(total)}</span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: categoriaColors[idx % categoriaColors.length]
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default LucrosPage
