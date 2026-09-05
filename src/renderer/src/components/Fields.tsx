import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface FieldProps {
  label: string
  children: React.ReactNode
  required?: boolean
}

export function Field({ label, children, required }: FieldProps): JSX.Element {
  return (
    <div className="field">
      <label>
        {label} {required && <span className="required">*</span>}
      </label>
      {children}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, ...props }: InputProps): JSX.Element {
  if (label) {
    return (
      <div className="field">
        <label>{label}</label>
        <input {...props} />
      </div>
    )
  }
  return <input {...props} />
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string | number; label: string }[]
}

export function Select({ label, options, ...props }: SelectProps): JSX.Element {
  const select = (
    <select {...props}>
      <option value="">Selecione...</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )

  if (label) {
    return (
      <div className="field">
        <label>{label}</label>
        {select}
      </div>
    )
  }
  return select
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea({ label, ...props }: TextareaProps): JSX.Element {
  if (label) {
    return (
      <div className="field">
        <label>{label}</label>
        <textarea {...props} />
      </div>
    )
  }
  return <textarea {...props} />
}
