import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import CalendarioPage from './pages/CalendarioPage'
import AlunosPage from './pages/AlunosPage'
import LucrosPage from './pages/LucrosPage'
import GastosPage from './pages/GastosPage'
import InstrutoresPage from './pages/InstrutoresPage'
import VeiculosPage from './pages/VeiculosPage'
import ConfiguracoesPage from './pages/ConfiguracoesPage'

function App(): JSX.Element {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CalendarioPage />} />
        <Route path="/calendario" element={<CalendarioPage />} />
        <Route path="/alunos" element={<AlunosPage />} />
        <Route path="/lucros" element={<LucrosPage />} />
        <Route path="/gastos" element={<GastosPage />} />
        <Route path="/instrutores" element={<InstrutoresPage />} />
        <Route path="/veiculos" element={<VeiculosPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        <Route path="*" element={<Navigate to="/calendario" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
