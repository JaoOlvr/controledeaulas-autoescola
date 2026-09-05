import { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import {
  CalendarDays,
  Users,
  TrendingUp,
  Fuel,
  UserCog,
  Car,
  Settings
} from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

const navItems = [
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/alunos', label: 'Alunos', icon: Users },
  { to: '/lucros', label: 'Lucros', icon: TrendingUp },
  { to: '/gastos', label: 'Gastos', icon: Fuel },
  { to: '/instrutores', label: 'Instrutores', icon: UserCog },
  { to: '/veiculos', label: 'Veículos', icon: Car },
  { to: '/configuracoes', label: 'Configurações', icon: Settings }
]

function Layout({ children }: LayoutProps): JSX.Element {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>🚗 Agenda</h1>
          <p>Aulas de Autoescola</p>
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
      </aside>
      <main className="main-content">{children}</main>
    </div>
  )
}

export default Layout
