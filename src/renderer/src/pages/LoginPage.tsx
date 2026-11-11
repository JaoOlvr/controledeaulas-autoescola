import { useState, FormEvent } from 'react'
import { LogIn, Lock, User, Eye, EyeOff, ShieldCheck, Car } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage(): JSX.Element {
  const { login, erro } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [submetendo, setSubmetendo] = useState(false)
  const [erroLocal, setErroLocal] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!usuario.trim() || !senha) {
      setErroLocal('Informe o usuário e a senha.')
      return
    }

    setErroLocal(null)
    setSubmetendo(true)
    try {
      const ok = await login(usuario, senha)
      if (!ok) {
        setErroLocal('Usuário ou senha inválidos.')
      }
    } catch (err: any) {
      setErroLocal(err.message || 'Falha ao autenticar.')
    } finally {
      setSubmetendo(false)
    }
  }

  const mensagemErro = erroLocal || erro

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
        padding: 20
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            padding: '32px 24px',
            textAlign: 'center',
            color: '#ffffff'
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12
            }}
          >
            <Car size={32} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Agenda da Autoescola</h1>
          <p style={{ fontSize: 13, opacity: 0.9, margin: '6px 0 0 0' }}>
            Acesso ao sistema de aulas e agendamentos
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mensagemErro && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: 13,
                lineHeight: 1.4
              }}
            >
              {mensagemErro}
            </div>
          )}

          <div>
            <label
              htmlFor="usuario-input"
              style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}
            >
              Usuário ou E-mail
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={18} color="var(--gray-400)" style={{ position: 'absolute', left: 12 }} />
              <input
                id="usuario-input"
                type="text"
                autoFocus
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ex: admin ou seu nome"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: 8,
                  border: '1px solid var(--gray-300)',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="senha-input"
              style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}
            >
              Senha
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} color="var(--gray-400)" style={{ position: 'absolute', left: 12 }} />
              <input
                id="senha-input"
                type={mostrarSenha ? 'text' : 'password'}
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha"
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 38px',
                  borderRadius: 8,
                  border: '1px solid var(--gray-300)',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                style={{
                  position: 'absolute',
                  right: 10,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: 'var(--gray-400)'
                }}
                title={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submetendo}
            style={{
              marginTop: 8,
              padding: '12px 20px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--primary)',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 600,
              cursor: submetendo ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.2s',
              opacity: submetendo ? 0.7 : 1
            }}
          >
            <LogIn size={18} />
            {submetendo ? 'Entrando...' : 'Entrar no Sistema'}
          </button>

          {/* Dica para primeiro acesso */}
          <div
            style={{
              marginTop: 10,
              padding: '10px 12px',
              borderRadius: 8,
              background: 'var(--gray-50)',
              border: '1px solid var(--gray-200)',
              fontSize: 12,
              color: 'var(--gray-600)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <ShieldCheck size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
            <div>
              <strong>Primeiro acesso?</strong> Utilize o usuário <code>admin</code> e senha <code>admin</code>.
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

