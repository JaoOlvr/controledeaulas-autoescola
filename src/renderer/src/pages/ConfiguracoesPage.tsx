import { useCallback, useEffect, useState } from 'react'
import {
  Save,
  DatabaseBackup,
  History,
  Download,
  Tablet,
  Wifi,
  Globe,
  Copy,
  Check,
  QrCode,
  BookOpen,
  UserPlus,
  Key,
  Trash2,
  Pencil,
  Shield
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import Button from '../components/Button'
import Modal from '../components/Modal'
import { Field } from '../components/Fields'
import { useAuth } from '../contexts/AuthContext'
import type { Configuracao, HorarioFuncionamento, Usuario, Instrutor, PerfilUsuario } from '@shared/types'
import { dayOfWeekName, formatDateTime } from '../lib/format'

interface BackupInfo {
  arquivo: string
  tamanho: number
  data: string
}

function ConfiguracoesPage(): JSX.Element {
  const { usuario: usuarioLogado } = useAuth()
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [horarios, setHorarios] = useState<HorarioFuncionamento[]>([])
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [instrutores, setInstrutores] = useState<Instrutor[]>([])
  const [salvo, setSalvo] = useState(false)
  const [backupMsg, setBackupMsg] = useState('')
  const [serverInfo, setServerInfo] = useState<{
    port: number
    ip: string
    url: string
    allIps: string[]
  } | null>(null)
  const [ipSelecionado, setIpSelecionado] = useState<string>('')
  const [copiado, setCopiado] = useState(false)
  const [abaConexao, setAbaConexao] = useState<'wifi' | 'rua'>('wifi')

  // Modais de usuário e senha
  const [modalUsuarioOpen, setModalUsuarioOpen] = useState(false)
  const [editandoUsuarioId, setEditandoUsuarioId] = useState<number | null>(null)
  const [usuarioErro, setUsuarioErro] = useState('')
  const [formUsuario, setFormUsuario] = useState({
    nome: '',
    usuario: '',
    senha: '',
    perfil: 'instrutor' as PerfilUsuario,
    instrutor_id: ''
  })

  const [modalSenhaOpen, setModalSenhaOpen] = useState(false)
  const [senhaErro, setSenhaErro] = useState('')
  const [senhaSucesso, setSenhaSucesso] = useState('')
  const [formSenha, setFormSenha] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  })

  const loadDados = useCallback(async () => {
    const [cfg, hrs, bks, usrs, insts] = await Promise.all([
      window.api.obterConfiguracoes(),
      window.api.listarHorarios(),
      window.api.listarBackups(),
      window.api.listarUsuarios ? window.api.listarUsuarios() : Promise.resolve([]),
      window.api.listarInstrutores ? window.api.listarInstrutores({ status: 'ativo' }) : Promise.resolve([])
    ])
    setConfig(cfg)
    setHorarios(hrs)
    setBackups(bks)
    setUsuarios(usrs)
    setInstrutores(insts)

    if (window.api.obterInfoServidor) {
      try {
        const sInfo = await window.api.obterInfoServidor()
        setServerInfo(sInfo)
        setIpSelecionado(sInfo.ip)
      } catch (e) {
        console.warn('Erro ao obter dados do servidor:', e)
      }
    }
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

  function copiarUrl(texto: string): void {
    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  function openNovoUsuario(): void {
    setUsuarioErro('')
    setEditandoUsuarioId(null)
    setFormUsuario({
      nome: '',
      usuario: '',
      senha: '',
      perfil: 'instrutor',
      instrutor_id: ''
    })
    setModalUsuarioOpen(true)
  }

  function openEditarUsuario(u: Usuario): void {
    setUsuarioErro('')
    setEditandoUsuarioId(u.id)
    setFormUsuario({
      nome: u.nome,
      usuario: u.usuario,
      senha: '',
      perfil: u.perfil,
      instrutor_id: u.instrutor_id ? String(u.instrutor_id) : ''
    })
    setModalUsuarioOpen(true)
  }

  async function handleSalvarUsuario(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setUsuarioErro('')
    try {
      if (editandoUsuarioId) {
        await window.api.atualizarUsuario(editandoUsuarioId, {
          nome: formUsuario.nome,
          usuario: formUsuario.usuario,
          senha: formUsuario.senha || undefined,
          perfil: formUsuario.perfil,
          instrutor_id: formUsuario.instrutor_id ? Number(formUsuario.instrutor_id) : null
        })
      } else {
        if (!formUsuario.senha) {
          setUsuarioErro('A senha é obrigatória para cadastrar um novo usuário.')
          return
        }
        await window.api.criarUsuario({
          nome: formUsuario.nome,
          usuario: formUsuario.usuario,
          senha: formUsuario.senha,
          perfil: formUsuario.perfil,
          instrutor_id: formUsuario.instrutor_id ? Number(formUsuario.instrutor_id) : null
        })
      }
      const usrs = await window.api.listarUsuarios()
      setUsuarios(usrs)
      setModalUsuarioOpen(false)
    } catch (err: any) {
      setUsuarioErro(err.message || 'Erro ao salvar usuário.')
    }
  }

  async function handleExcluirUsuario(id: number, nome: string): Promise<void> {
    if (confirm(`Tem certeza que deseja excluir o usuário "${nome}"?`)) {
      try {
        await window.api.deletarUsuario(id)
        const usrs = await window.api.listarUsuarios()
        setUsuarios(usrs)
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir usuário.')
      }
    }
  }

  async function handleAlterarSenha(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSenhaErro('')
    setSenhaSucesso('')
    if (formSenha.novaSenha !== formSenha.confirmarSenha) {
      setSenhaErro('A nova senha e a confirmação não coincidem.')
      return
    }
    if (formSenha.novaSenha.length < 4) {
      setSenhaErro('A nova senha deve ter no mínimo 4 caracteres.')
      return
    }
    try {
      if (!usuarioLogado) return
      await window.api.alterarMinhaSenha({
        usuarioId: usuarioLogado.id,
        senhaAtual: formSenha.senhaAtual,
        novaSenha: formSenha.novaSenha
      })
      setSenhaSucesso('Senha alterada com sucesso!')
      setTimeout(() => {
        setModalSenhaOpen(false)
        setFormSenha({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
        setSenhaSucesso('')
      }, 1500)
    } catch (err: any) {
      setSenhaErro(err.message || 'Erro ao alterar senha.')
    }
  }

  const urlConexao = serverInfo ? `http://${ipSelecionado || serverInfo.ip}:${serverInfo.port}` : ''

  if (!config) {
    return <div className="empty-state">Carregando...</div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Configurações</h1>
          <p>Ajuste preferências da autoescola e da agenda</p>
        </div>
        <Button onClick={salvarConfig}>
          <Save size={16} />
          Salvar Alterações
        </Button>
      </div>

      {salvo && <div className="alert alert-success">Configurações salvas com sucesso!</div>}
      {backupMsg && <div className="alert alert-success">{backupMsg}</div>}

      {/* Card de Conexão com Tablet / Celular */}
      <div className="card" style={{ marginBottom: 24, border: '1px solid var(--primary-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 8, borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Tablet size={22} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-900)' }}>
                Conexão com Tablet / Celular
              </div>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: 0 }}>
                Acesse a agenda completa diretamente do tablet Android sem instalar nada pela Play Store
              </p>
            </div>
          </div>
          {serverInfo && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0'
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Servidor Ativo na porta {serverInfo.port}
            </span>
          )}
        </div>

        {/* Abas Wi-Fi vs Rua */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--gray-200)', marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setAbaConexao('wifi')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              color: abaConexao === 'wifi' ? 'var(--primary)' : 'var(--gray-500)',
              borderBottom: abaConexao === 'wifi' ? '2px solid var(--primary)' : '2px solid transparent'
            }}
          >
            <Wifi size={16} />
            No Wi-Fi da Autoescola
          </button>
          <button
            type="button"
            onClick={() => setAbaConexao('rua')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              color: abaConexao === 'rua' ? 'var(--primary)' : 'var(--gray-500)',
              borderBottom: abaConexao === 'rua' ? '2px solid var(--primary)' : '2px solid transparent'
            }}
          >
            <Globe size={16} />
            Na Rua / Aulas Práticas (3G / 4G)
          </button>
        </div>

        {abaConexao === 'wifi' ? (
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              background: '#ffffff',
              padding: 12,
              borderRadius: 12,
              boxShadow: 'var(--shadow)',
              border: '1px solid var(--gray-200)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6
            }}>
              {urlConexao ? (
                <QRCodeSVG value={urlConexao} size={150} level="M" />
              ) : (
                <div style={{ width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QrCode size={48} color="var(--gray-400)" />
                </div>
              )}
              <span style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 500 }}>
                Aponte a câmera do tablet
              </span>
            </div>

            <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <strong style={{ fontSize: 14, color: 'var(--gray-800)' }}>1. Conecte ao mesmo Wi-Fi</strong>
                <p style={{ fontSize: 13, color: 'var(--gray-600)', margin: '4px 0 0 0' }}>
                  Certifique-se de que o tablet está conectado na mesma rede Wi-Fi deste computador.
                </p>
              </div>

              <div>
                <strong style={{ fontSize: 14, color: 'var(--gray-800)' }}>2. Endereço de acesso no navegador:</strong>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input
                    type="text"
                    readOnly
                    value={urlConexao}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--gray-300)',
                      background: 'var(--gray-50)',
                      fontFamily: 'monospace',
                      fontSize: 13,
                      color: 'var(--primary-dark)',
                      fontWeight: 600
                    }}
                  />
                  <Button variant="secondary" onClick={() => copiarUrl(urlConexao)}>
                    {copiado ? <Check size={16} color="#059669" /> : <Copy size={16} />}
                    {copiado ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>
              </div>

              {serverInfo && serverInfo.allIps.length > 1 && (
                <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                  Outros adaptadores de rede encontrados:{' '}
                  {serverInfo.allIps.map((ip) => (
                    <button
                      key={ip}
                      type="button"
                      onClick={() => setIpSelecionado(ip)}
                      style={{
                        margin: '0 4px',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 11,
                        border: '1px solid var(--gray-300)',
                        background: ipSelecionado === ip ? 'var(--primary)' : 'white',
                        color: ipSelecionado === ip ? 'white' : 'var(--gray-700)',
                        cursor: 'pointer'
                      }}
                    >
                      {ip}
                    </button>
                  ))}
                </div>
              )}

              <div style={{
                background: 'var(--primary-light)',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--primary-dark)',
                lineHeight: 1.5
              }}>
                ✨ <strong>Como virar aplicativo no Android:</strong> No Chrome do tablet, abra o link, toque no menu de <strong>3 pontinhos</strong> e selecione <strong>"Adicionar à tela inicial"</strong> (ou "Instalar"). O app abrirá em tela cheia como se fosse nativo!
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: 'var(--gray-700)' }}>
            <p>
              Para o instrutor conseguir acessar e marcar aulas <strong>na rua via 3G/4G</strong> enquanto o computador fica na autoescola, a melhor solução gratuita é o <strong>Cloudflare Tunnel</strong>:
            </p>

            <div style={{ background: 'var(--gray-900)', color: '#f3f4f6', padding: 14, borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }}>
              <div style={{ color: '#9ca3af', marginBottom: 4 }}># No computador da autoescola (terminal Linux/Windows):</div>
              <div style={{ color: '#34d399' }}>cloudflared tunnel --url http://127.0.0.1:{serverInfo?.port || 3333}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                <strong>Como funciona:</strong>
                <ol style={{ paddingLeft: 20, marginTop: 4, lineHeight: 1.6 }}>
                  <li>O comando gera um link seguro com HTTPS (ex: <code>https://autoescola-xyz.trycloudflare.com</code>).</li>
                  <li>Você envia esse link no WhatsApp do instrutor.</li>
                  <li>O instrutor abre no tablet Android na rua e salva na tela inicial. Funciona em qualquer rede 3G/4G!</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
        {/* Coluna esquerda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card: Modo da Agenda */}
          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={18} color="var(--primary)" />
              Modo Padrão da Agenda
            </div>
            <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 16 }}>
              Escolha como prefere visualizar e agendar as aulas dos alunos no sistema:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: config.modo_agenda !== 'calendario' ? '2px solid var(--primary)' : '1px solid var(--gray-300)',
                  background: config.modo_agenda !== 'calendario' ? 'var(--primary-light)' : 'white',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="modo_agenda"
                  checked={config.modo_agenda !== 'calendario'}
                  onChange={() => setConfig({ ...config, modo_agenda: 'grade' })}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <strong style={{ fontSize: 14, color: 'var(--gray-900)' }}>
                    📒 Grade de Horários Prontos (Estilo Caderno) - Recomendado
                  </strong>
                  <p style={{ fontSize: 12, color: 'var(--gray-600)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    Horários do dia já montados (08:00, 08:50, 09:40...). Basta clicar no horário vago e selecionar o aluno.
                  </p>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: config.modo_agenda === 'calendario' ? '2px solid var(--primary)' : '1px solid var(--gray-300)',
                  background: config.modo_agenda === 'calendario' ? 'var(--primary-light)' : 'white',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="modo_agenda"
                  checked={config.modo_agenda === 'calendario'}
                  onChange={() => setConfig({ ...config, modo_agenda: 'calendario' })}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <strong style={{ fontSize: 14, color: 'var(--gray-900)' }}>
                    📅 Calendário Tradicional (FullCalendar)
                  </strong>
                  <p style={{ fontSize: 12, color: 'var(--gray-600)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    Visão de calendário mensal/semanal tradicional com preenchimento manual de hora de início e término.
                  </p>
                </div>
              </label>
            </div>

            {config.modo_agenda !== 'calendario' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 14, borderTop: '1px solid var(--gray-200)' }}>
                <Field label="Duração padrão de cada aula (minutos)">
                  <input
                    type="number"
                    min="15"
                    step="5"
                    value={config.duracao_padrao_minutos}
                    onChange={(e) => setConfig({ ...config, duracao_padrao_minutos: Number(e.target.value) })}
                  />
                </Field>

                <Field label="Horários da Manhã (separados por vírgula)">
                  <input
                    value={config.grade_horarios_manha ?? '08:00, 08:50, 09:40, 10:30, 11:20'}
                    onChange={(e) => setConfig({ ...config, grade_horarios_manha: e.target.value })}
                    placeholder="08:00, 08:50, 09:40, 10:30, 11:20"
                  />
                </Field>

                <Field label="Horários da Tarde (separados por vírgula)">
                  <input
                    value={config.grade_horarios_tarde ?? '14:00, 14:50, 15:40, 16:30, 17:20'}
                    onChange={(e) => setConfig({ ...config, grade_horarios_tarde: e.target.value })}
                    placeholder="14:00, 14:50, 15:40, 16:30, 17:20"
                  />
                </Field>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setConfig({
                        ...config,
                        duracao_padrao_minutos: 50,
                        grade_horarios_manha: '08:00, 08:50, 09:40, 10:30, 11:20',
                        grade_horarios_tarde: '14:00, 14:50, 15:40, 16:30, 17:20'
                      })
                    }
                  >
                    Restaurar Padrão de Autoescola (50 min)
                  </Button>
                </div>
              </div>
            )}
          </div>

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
                  step="5"
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
          {/* Card: Contas de Usuários e Acessos */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <Shield size={18} color="var(--primary)" />
                Usuários e Acessos
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSenhaErro('')
                    setSenhaSucesso('')
                    setModalSenhaOpen(true)
                  }}
                >
                  <Key size={14} />
                  Minha Senha
                </Button>
                <Button onClick={openNovoUsuario}>
                  <UserPlus size={14} />
                  Novo Usuário
                </Button>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 14 }}>
              Cadastre contas para instrutores ou administradores acessarem o sistema com segurança.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {usuarios.map((u) => {
                const isAdmin = u.perfil === 'admin'
                return (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--gray-200)',
                      background: 'var(--gray-50)',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: isAdmin ? 'var(--primary)' : '#059669',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 13,
                          flexShrink: 0
                        }}
                      >
                        {u.nome.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: 13, color: 'var(--gray-900)' }}>{u.nome}</strong>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: isAdmin ? '#e0e7ff' : '#d1fae5',
                              color: isAdmin ? '#3730a3' : '#065f46'
                            }}
                          >
                            {isAdmin ? 'Administrador' : 'Instrutor'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                          Usuário: <code style={{ background: '#e5e7eb', padding: '1px 4px', borderRadius: 3 }}>{u.usuario}</code>
                          {u.instrutor_nome && ` • Vinculado a: ${u.instrutor_nome}`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => openEditarUsuario(u)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 6,
                          color: 'var(--gray-500)',
                          borderRadius: 4
                        }}
                        title="Editar Usuário"
                      >
                        <Pencil size={15} />
                      </button>
                      {u.id !== usuarioLogado?.id && (
                        <button
                          type="button"
                          onClick={() => handleExcluirUsuario(u.id, u.nome)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 6,
                            color: '#ef4444',
                            borderRadius: 4
                          }}
                          title="Excluir Usuário"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

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

      {/* Modal: Cadastro / Edição de Usuário */}
      <Modal
        open={modalUsuarioOpen}
        onClose={() => setModalUsuarioOpen(false)}
        title={editandoUsuarioId ? 'Editar Usuário' : 'Novo Usuário de Acesso'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalUsuarioOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarUsuario}>
              Salvar Usuário
            </Button>
          </>
        }
      >
        <form onSubmit={handleSalvarUsuario} className="form-grid">
          {usuarioErro && (
            <div
              className="full"
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: '#fef2f2',
                color: '#b91c1c',
                fontSize: 13,
                border: '1px solid #fecaca'
              }}
            >
              {usuarioErro}
            </div>
          )}

          <div className="full">
            <Field label="Nome completo ou de exibição">
              <input
                required
                value={formUsuario.nome}
                onChange={(e) => setFormUsuario({ ...formUsuario, nome: e.target.value })}
                placeholder="Ex: Carlos Roberto"
              />
            </Field>
          </div>

          <Field label="Usuário de acesso (login)">
            <input
              required
              value={formUsuario.usuario}
              onChange={(e) => setFormUsuario({ ...formUsuario, usuario: e.target.value })}
              placeholder="Ex: carlos ou carlos@autoescola.com"
            />
          </Field>

          <Field label={editandoUsuarioId ? 'Nova senha (deixe vazio para manter)' : 'Senha de acesso'}>
            <input
              type="password"
              required={!editandoUsuarioId}
              value={formUsuario.senha}
              onChange={(e) => setFormUsuario({ ...formUsuario, senha: e.target.value })}
              placeholder={editandoUsuarioId ? 'Digite apenas se quiser alterar' : 'Senha do usuário'}
            />
          </Field>

          <Field label="Perfil de Acesso">
            <select
              value={formUsuario.perfil}
              onChange={(e) =>
                setFormUsuario({
                  ...formUsuario,
                  perfil: e.target.value as PerfilUsuario,
                  instrutor_id: e.target.value === 'admin' ? '' : formUsuario.instrutor_id
                })
              }
            >
              <option value="instrutor">Instrutor (Acesso restrito à agenda)</option>
              <option value="admin">Administrador (Acesso total)</option>
            </select>
          </Field>

          {formUsuario.perfil === 'instrutor' && (
            <Field label="Vincular ao Instrutor">
              <select
                value={formUsuario.instrutor_id}
                onChange={(e) => setFormUsuario({ ...formUsuario, instrutor_id: e.target.value })}
              >
                <option value="">Nenhum instrutor vinculado</option>
                {instrutores.map((i) => (
                  <option key={i.id} value={String(i.id)}>
                    {i.nome} ({i.categoria || 'Geral'})
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="full" style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
            💡 <strong>Dica:</strong> Instrutores só veem as aulas vinculadas a eles no tablet e não têm acesso aos lucros, gastos ou configurações da autoescola.
          </div>
        </form>
      </Modal>

      {/* Modal: Alterar Minha Senha */}
      <Modal
        open={modalSenhaOpen}
        onClose={() => setModalSenhaOpen(false)}
        title="Alterar Minha Senha"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalSenhaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAlterarSenha}>
              Atualizar Senha
            </Button>
          </>
        }
      >
        <form onSubmit={handleAlterarSenha} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {senhaErro && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: '#fef2f2',
                color: '#b91c1c',
                fontSize: 13,
                border: '1px solid #fecaca'
              }}
            >
              {senhaErro}
            </div>
          )}

          {senhaSucesso && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: '#ecfdf5',
                color: '#065f46',
                fontSize: 13,
                border: '1px solid #a7f3d0'
              }}
            >
              {senhaSucesso}
            </div>
          )}

          <Field label="Senha Atual">
            <input
              type="password"
              required
              value={formSenha.senhaAtual}
              onChange={(e) => setFormSenha({ ...formSenha, senhaAtual: e.target.value })}
              placeholder="Digite sua senha atual"
            />
          </Field>

          <Field label="Nova Senha">
            <input
              type="password"
              required
              value={formSenha.novaSenha}
              onChange={(e) => setFormSenha({ ...formSenha, novaSenha: e.target.value })}
              placeholder="Mínimo 4 caracteres"
            />
          </Field>

          <Field label="Confirmar Nova Senha">
            <input
              type="password"
              required
              value={formSenha.confirmarSenha}
              onChange={(e) => setFormSenha({ ...formSenha, confirmarSenha: e.target.value })}
              placeholder="Repita a nova senha"
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}

export default ConfiguracoesPage
