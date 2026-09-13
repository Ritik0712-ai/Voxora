export default function SuccessMessage({ message }) {
  if (!message) return null

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3" role="status">
      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm text-green-700">{message}</p>
    </div>
  )
}
