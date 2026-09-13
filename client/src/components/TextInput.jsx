import { useState, useEffect } from 'react'

const MAX_CHARS = 5000

export default function TextInput({ value, onChange, onClear }) {
  const [error, setError] = useState('')

  const charCount = value.length
  const wordCount = value.trim() === '' ? 0 : value.trim().split(/\s+/).length
  const isOverLimit = charCount > MAX_CHARS
  const isNearLimit = charCount > MAX_CHARS * 0.9

  useEffect(() => {
    if (isOverLimit) {
      setError(`Text exceeds the maximum allowed length of ${MAX_CHARS} characters.`)
    } else {
      setError('')
    }
  }, [isOverLimit])

  const handleChange = (e) => {
    onChange(e.target.value)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          value={value}
          onChange={handleChange}
          placeholder="Enter or paste your text here..."
          className={`w-full h-48 p-4 text-gray-900 bg-white border rounded-xl resize-none
            placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            transition-all duration-200 ${isOverLimit ? 'border-red-500' : 'border-gray-200'}`}
          aria-label="Text to convert to speech"
          aria-invalid={isOverLimit}
          aria-describedby="char-counter"
        />
        <div className="absolute bottom-3 right-3 flex gap-2">
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100
                rounded-lg transition-colors duration-150"
              aria-label="Clear text"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex gap-4 text-gray-500">
          <span aria-live="polite">
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
          </span>
          <span>
            {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
          </span>
        </div>
        {isNearLimit && !isOverLimit && (
          <span className="text-amber-600 text-xs font-medium">
            Approaching limit
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1" role="alert">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
