export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-200 rounded-full" />
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
      </div>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  )
}
