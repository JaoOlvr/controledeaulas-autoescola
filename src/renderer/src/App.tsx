import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import CalendarioPage from './pages/CalendarioPage'
import AlunosPage from './pages/AlunosPage'
import LucrosPage from './pages/LucrosPage'
import GastosPage from './pages/GastosPage'
import InstrutoresPage from './pages/InstrutoresPage'
import VeiculosPage from './pages/VeiculosPage'
import ConfiguracoesPage from './pages/ConfiguracoesPage'
import { Loader2 } from 'lucide-react'

function AppRoutes(): JSX.Element {
  const { usuario, carregando } = useAuth()

  if (carregando) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--gray-50)',
          gap: 12
        }}
      >
        <Loader2 size={36} className="spin" color="var(--primary)" />
        <span style={{ fontSize: 14, color: 'var(--gray-600)', fontWeight: 600 }}>
          Carregando sistema...
        </span>
      </div>
    )
  }

  if (!usuario) {
    return <LoginPage />
  }

  const isAdmin = usuario.perfil === 'admin'

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CalendarioPage />} />
        <Route path="/calendario" element={<CalendarioPage />} />
        <Route path="/alunos" element={<AlunosPage />} />
        {isAdmin && (
          <>
            <Route path="/lucros" element={<LucrosPage />} />
            <Route path="/gastos" element={<GastosPage />} />
            <Route path="/instrutores" element={<InstrutoresPage />} />
            <Route path="/veiculos" element={<VeiculosPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/calendario" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App(): JSX.Element {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
