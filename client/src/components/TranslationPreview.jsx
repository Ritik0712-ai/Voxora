import { useState, useEffect } from 'react'

/**
 * Machine translation gets things wrong, so show what was actually spoken and
 * let the user correct it rather than trusting it blind.
 */
export default function TranslationPreview({
  sourceText,
  spokenText,
  translated,
  note,
  languageName,
  onRegenerate,
  regenerating,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(spokenText)

  useEffect(() => {
    setDraft(spokenText)
    setEditing(false)
  }, [spokenText])

  if (!translated) {
    return note ? (
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs text-gray-500">
          Spoken as written &mdash; {note}.
        </p>
      </div>
    ) : null
  }

  return (
    <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-indigo-100 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-indigo-900">
          Translated{languageName ? ` into ${languageName}` : ''}
        </span>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Edit
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">You typed</p>
          <p className="text-sm text-gray-500">{sourceText}</p>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Spoken</p>

          {editing ? (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={regenerating || !draft.trim() || draft === spokenText}
                  onClick={() => onRegenerate(draft.trim())}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg
                    hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {regenerating ? 'Regenerating...' : 'Regenerate audio'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(spokenText)
                    setEditing(false)
                  }}
                  className="px-3 py-1.5 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-base text-gray-900 leading-relaxed">{spokenText}</p>
          )}
        </div>
      </div>
    </div>
  )
}
