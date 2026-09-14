export default function TranslateToggle({ checked, onChange, languageName, disabled }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>

      <div className="flex-1 min-w-0">
        <label className="block text-sm font-medium text-gray-900">
          {languageName ? `Translate into ${languageName}` : 'Translate before speaking'}
        </label>
        <p className="text-xs text-gray-500 mt-0.5">
          {checked
            ? 'Your text will be translated first, then spoken.'
            : 'Your text will be read exactly as written, in the selected voice’s accent.'}
        </p>
      </div>
    </div>
  )
}
