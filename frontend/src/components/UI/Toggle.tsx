interface ToggleProps {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  label?: string
}

/**
 * Reusable toggle switch.
 *
 * Fix note: the knob is explicitly anchored with `left-0.5` (not left to
 * browser fallback positioning), and the "on" translate is computed from
 * the actual track/knob widths (40px track, 16px knob, 2px inset both
 * sides -> 20px travel = translate-x-5) instead of a hardcoded magic
 * number. This keeps the knob inside the pill at every state.
 */
export default function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      aria-checked={checked}
      aria-label={label}
      role="switch"
      className={`relative w-10 h-5 rounded-full flex-shrink-0 transition-colors ${
        checked ? 'bg-ink' : 'bg-ash-border'
      } disabled:opacity-50`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}