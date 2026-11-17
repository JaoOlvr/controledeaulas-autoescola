import { useState } from 'react'
import { ShieldAlert, Copy, Check, MessageSquare, AlertTriangle, X } from 'lucide-react'
import type { Usuario } from '@shared/types'

interface BloqueioPagamentoModalProps {
  usuario: Usuario
}

export default function BloqueioPagamentoModal({ usuario }: BloqueioPagamentoModalProps): JSX.Element | null {
  const [copiado, setCopiado] = useState(false)
  const [minimizado, setMinimizado] = useState(false)

  if (usuario.perfil === 'superadmin' || usuario.autoescola_status !== 'bloqueada') {
    return null
  }

  const pixChave = usuario.autoescola_pix || 'contato@agendaaulas.app'

  function copiarPix(): void {
    navigator.clipboard.writeText(pixChave)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  function abrirWhatsApp(): void {
    const msg = encodeURIComponent(
      `Olá! Sou da ${usuario.autoescola_nome || 'Autoescola'} (usuário ${usuario.usuario}). Realizei o pagamento da mensalidade de R$ 40,00 da nossa plataforma e gostaria de solicitar a liberação do acesso. Segue o comprovante!`
    )
    window.open(`https://wa.me/5511987654321?text=${msg}`, '_blank')
  }

  if (minimizado) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          background: '#ef4444',
          color: '#ffffff',
          padding: '10px 16px',
          borderRadius: 30,
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: 13
        }}
        onClick={() => setMinimizado(false)}
      >
        <ShieldAlert size={18} />
        <span>Assinatura Suspensa (R$ 40,00) - Clique para Regularizar</span>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          maxWidth: 480,
          width: '100%',
          padding: 28,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          textAlign: 'center'
        }}
      >
        <button
          type="button"
          onClick={() => setMinimizado(true)}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'none',
            border: 'none',
            color: 'var(--gray-400)',
            cursor: 'pointer',
            padding: 4
          }}
          title="Minimizar aviso (Modo somente leitura)"
        >
          <X size={20} />
        </button>

        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#fee2e2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}
        >
          <AlertTriangle size={32} />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', margin: '0 0 8px' }}>
          Assinatura Temporariamente Suspensa
        </h2>

        <p style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.5, margin: '0 0 20px' }}>
          A mensalidade do sistema da sua autoescola (<strong>{usuario.autoescola_nome}</strong>) no valor de{' '}
          <strong style={{ color: '#059669' }}>R$ 40,00</strong> está pendente. Novos agendamentos e alterações
          foram temporariamente bloqueados.
        </p>

        {/* Card do PIX */}
        <div
          style={{
            background: 'var(--gray-50)',
            border: '1px solid var(--gray-200)',
            borderRadius: 10,
            padding: 14,
            marginBottom: 20,
            textAlign: 'left'
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>
            Chave PIX para Pagamento
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 6,
              background: '#ffffff',
              border: '1px solid var(--gray-300)',
              borderRadius: 6,
              padding: '6px 10px'
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--gray-800)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {pixChave}
            </span>
            <button
              type="button"
              onClick={copiarPix}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 4,
                border: 'none',
                background: copiado ? '#dcfce7' : 'var(--primary)',
                color: copiado ? '#15803d' : '#ffffff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {copiado ? <Check size={13} /> : <Copy size={13} />}
              {copiado ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8 }}>
            Valor: <strong>R$ 40,00</strong>
          </div>
        </div>

        {/* Botão WhatsApp */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            onClick={abrirWhatsApp}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#25D366',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)'
            }}
          >
            <MessageSquare size={18} />
            <span>Enviar Comprovante no WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setMinimizado(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gray-500)',
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Continuar no modo somente leitura
          </button>
        </div>
      </div>
    </div>
  )
}

