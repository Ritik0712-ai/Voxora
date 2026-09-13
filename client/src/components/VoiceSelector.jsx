export default function VoiceSelector({ value, onChange, options = [], disabled, loading }) {
  const selectedVoice = options.find((v) => v.voiceId === value || v.voiceId === value)

  return (
    <div className="space-y-1.5">
      <label htmlFor="voice" className="block text-sm font-medium text-gray-700">
        Voice
      </label>
      <select
        id="voice"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading || options.length === 0}
        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          disabled:bg-gray-50 disabled:cursor-not-allowed transition-all duration-200
          appearance-none cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.75rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.25rem',
          paddingRight: '2.5rem'
        }}
      >
        <option value="">Select a voice</option>
        {options.map((voice) => (
          <option key={voice.voiceId} value={voice.voiceId}>
            {voice.name} {voice.gender ? `(${voice.gender})` : ''}
            {voice.accent ? ` — ${voice.accent}` : ''}
          </option>
        ))}
      </select>
      {selectedVoice && (
        <p className="text-xs text-gray-500 mt-1">
          {selectedVoice.gender && `${selectedVoice.gender}`}
          {selectedVoice.accent && ` • ${selectedVoice.accent}`}
          {selectedVoice.style && ` • ${selectedVoice.style}`}
        </p>
      )}
    </div>
  )
}
