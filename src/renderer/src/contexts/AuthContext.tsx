import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import type { Usuario } from '@shared/types'

interface AuthContextType {
  usuario: Usuario | null
  token: string | null
  carregando: boolean
  erro: string | null
  login: (usuarioOuEmail: string, senha: string) => Promise<boolean>
  logout: () => Promise<void>
  recarregarUsuario: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'agenda_auth_token'

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [carregando, setCarregando] = useState<boolean>(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregarSessao = useCallback(async () => {
    const salvo = localStorage.getItem(TOKEN_KEY)
    if (!salvo) {
      setUsuario(null)
      setToken(null)
      setCarregando(false)
      return
    }

    try {
      const user = await window.api.obterUsuarioAtual(salvo)
      if (user) {
        setUsuario(user)
        setToken(salvo)
      } else {
        localStorage.removeItem(TOKEN_KEY)
        setUsuario(null)
        setToken(null)
      }
    } catch (e) {
      console.warn('Erro ao verificar sessão:', e)
      localStorage.removeItem(TOKEN_KEY)
      setUsuario(null)
      setToken(null)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarSessao()

    const handleUnauthorized = (): void => {
      localStorage.removeItem(TOKEN_KEY)
      setUsuario(null)
      setToken(null)
    }

    window.addEventListener('agenda:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('agenda:unauthorized', handleUnauthorized)
  }, [carregarSessao])

  async function login(usuarioInput: string, senhaInput: string): Promise<boolean> {
    setErro(null)
    try {
      const resp = await window.api.login(usuarioInput, senhaInput)
      if (resp?.token && resp?.usuario) {
        localStorage.setItem(TOKEN_KEY, resp.token)
        setToken(resp.token)
        setUsuario(resp.usuario)
        return true
      }
      setErro('Resposta inválida do servidor.')
      return false
    } catch (e: any) {
      setErro(e.message || 'Usuário ou senha incorretos.')
      return false
    }
  }

  async function logout(): Promise<void> {
    const currentToken = token || localStorage.getItem(TOKEN_KEY)
    if (currentToken) {
      try {
        await window.api.logout(currentToken)
      } catch (e) {
        console.warn('Erro ao encerrar sessão:', e)
      }
    }
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUsuario(null)
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        carregando,
        erro,
        login,
        logout,
        recarregarUsuario: carregarSessao
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

