import { useCallback, useEffect, useState } from 'react'
import { Save, DatabaseBackup, History, Download } from 'lucide-react'
import Button from '../components/Button'
import { Field } from '../components/Fields'
import type { Configuracao, HorarioFuncionamento } from '@shared/types'
import { dayOfWeekName, formatDateTime } from '../lib/format'

interface BackupInfo {
  arquivo: string
  tamanho: number
  data: string
}

function ConfiguracoesPage(): JSX.Element {
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [horarios, setHorarios] = useState<HorarioFuncionamento[]>([])
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [salvo, setSalvo] = useState(false)
  const [backupMsg, setBackupMsg] = useState('')

  const loadDados = useCallback(async () => {
    const [cfg, hrs, bks] = await Promise.all([
      window.api.obterConfiguracoes(),
      window.api.listarHorarios(),
      window.api.listarBackups()
    ])
    setConfig(cfg)
    setHorarios(hrs)
    setBackups(bks)
  }, [])

  useEffect(() => {
    loadDados()
  }, [loadDados])

  async function salvarConfig(): Promise<void> {
    if (!config) return
    await window.api.atualizarConfiguracoes(config)
    for (const h of horarios) {
      if (h.ativo) {
        await window.api.atualizarHorario(h.id, {
          hora_inicio: h.hora_inicio,
          hora_fim: h.hora_fim
        })
      }
    }
    setSalvo(true)
    setTimeout(() => setSalvo(false), 3000)
  }

  async function fazerBackup(): Promise<void> {
    await window.api.fazerBackup()
    const bks = await window.api.listarBackups()
    setBackups(bks)
    setBackupMsg('Backup realizado com sucesso!')
    setTimeout(() => setBackupMsg(''), 3000)
  }

  async function backupManual(): Promise<void> {
    const path = await window.api.backupParaLocal()
    if (path) {
      setBackupMsg(`Backup salvo em: ${path}`)
      setTimeout(() => setBackupMsg(''), 5000)
    }
  }

  function toggleHorario(id: number): void {
    const updated = horarios.map((h) =>
      h.id === id ? { ...h, ativo: h.ativo === 1 ? 0 : 1 } : h
    )
    setHorarios(updated)
  }

  function updateHorarioHora(id: number, campo: 'hora_inicio' | 'hora_fim', valor: string): void {
    const updated = horarios.map((h) => (h.id === id ? { ...h, [campo]: valor } : h))
    setHorarios(updated)
  }

  if (!config) {
    return <div className="empty-state">Carregando...</div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Configurações</h1>
          <p>Ajuste preferências da autoescola</p>
        </div>
        <Button onClick={salvarConfig}>
          <Save size={16} />
          Salvar Alterações
        </Button>
      </div>

      {salvo && <div className="alert alert-success">Configurações salvas com sucesso!</div>}
      {backupMsg && <div className="alert alert-success">{backupMsg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
        {/* Coluna esquerda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <div className="card-title">Dados da Autoescola</div>
            <div className="form-grid">
              <div className="full">
                <Field label="Nome da autoescola">
                  <input
                    value={config.nome_autoescola}
                    onChange={(e) => setConfig({ ...config, nome_autoescola: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Horário padrão (início)">
                <input
                  type="time"
                  value={config.horario_padrao_inicio}
                  onChange={(e) => setConfig({ ...config, horario_padrao_inicio: e.target.value })}
                />
              </Field>
              <Field label="Duração padrão da aula (min)">
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={config.duracao_padrao_minutos}
                  onChange={(e) => setConfig({ ...config, duracao_padrao_minutos: Number(e.target.value) })}
                />
              </Field>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Horários de Funcionamento</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {horarios.map((h) => (
                <div
                  key={h.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: h.ativo === 1 ? 'var(--gray-50)' : 'transparent',
                    opacity: h.ativo === 1 ? 1 : 0.5
                  }}
                >
                  <input
                    type="checkbox"
                    checked={h.ativo === 1}
                    onChange={() => toggleHorario(h.id)}
                    style={{ width: 18, height: 18 }}
                  />
                  <strong style={{ width: 80 }}>{dayOfWeekName(h.dia_semana)}</strong>
                  {h.ativo === 1 ? (
                    <>
                      <input
                        type="time"
                        value={h.hora_inicio}
                        onChange={(e) => updateHorarioHora(h.id, 'hora_inicio', e.target.value)}
                        disabled={h.ativo !== 1}
                      />
                      <span>às</span>
                      <input
                        type="time"
                        value={h.hora_fim}
                        onChange={(e) => updateHorarioHora(h.id, 'hora_fim', e.target.value)}
                        disabled={h.ativo !== 1}
                      />
                    </>
                  ) : (
                    <span style={{ color: 'var(--gray-400)' }}>Fechado</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna direita */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <div className="card-title">Backup Automático</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.backup_automatico}
                  onChange={(e) => setConfig({ ...config, backup_automatico: e.target.checked })}
                />
                Ativar backup automático
              </label>
              {config.backup_automatico && (
                <Field label="Intervalo (dias)">
                  <input
                    type="number"
                    min="1"
                    value={config.backup_intervalo_dias}
                    onChange={(e) => setConfig({ ...config, backup_intervalo_dias: Number(e.target.value) })}
                  />
                </Field>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="secondary" onClick={fazerBackup}>
                  <DatabaseBackup size={16} />
                  Fazer Backup Agora
                </Button>
                <Button variant="secondary" onClick={backupManual}>
                  <Download size={16} />
                  Exportar
                </Button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={16} />
              Backups Recentes
            </div>
            {backups.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum backup ainda</p>
              </div>
            ) : (
              <div className="table-wrapper" style={{ boxShadow: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tamanho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.slice(0, 10).map((b) => (
                      <tr key={b.arquivo}>
                        <td>{formatDateTime(b.data)}</td>
                        <td>{(b.tamanho / 1024).toFixed(1)} KB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfiguracoesPage
