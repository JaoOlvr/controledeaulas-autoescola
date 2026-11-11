import { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import {
  CalendarDays,
  Users,
  TrendingUp,
  Fuel,
  UserCog,
  Car,
  Settings,
  LogOut,
  UserCheck
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps): JSX.Element {
  const { usuario, logout } = useAuth()

  const isAdmin = usuario?.perfil === 'admin'

  const navItems = isAdmin
    ? [
        { to: '/calendario', label: 'Calendário', icon: CalendarDays },
        { to: '/alunos', label: 'Alunos', icon: Users },
        { to: '/lucros', label: 'Lucros', icon: TrendingUp },
        { to: '/gastos', label: 'Gastos', icon: Fuel },
        { to: '/instrutores', label: 'Instrutores', icon: UserCog },
        { to: '/veiculos', label: 'Veículos', icon: Car },
        { to: '/configuracoes', label: 'Configurações', icon: Settings }
      ]
    : [
        { to: '/calendario', label: 'Minha Agenda', icon: CalendarDays },
        { to: '/alunos', label: 'Lista de Alunos', icon: Users }
      ]

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>🚗 Agenda</h1>
          <p>{isAdmin ? 'Gestão da Autoescola' : 'Portal do Instrutor'}</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Informações do Usuário e Botão Sair */}
        <div
          style={{
            padding: '12px 14px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            margin: 'auto 10px 12px 10px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: isAdmin ? 'var(--primary)' : '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: 14
              }}
            >
              {usuario?.nome?.charAt(0).toUpperCase() || <UserCheck size={18} />}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {usuario?.nome || 'Usuário'}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: isAdmin ? 'rgba(79, 70, 229, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                  color: isAdmin ? '#c7d2fe' : '#a7f3d0'
                }}
              >
                {isAdmin ? 'Administrador' : 'Instrutor'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'transparent',
              color: '#f87171',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <LogOut size={14} />
            <span>Sair da Conta</span>
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  )
}

export default Layout
