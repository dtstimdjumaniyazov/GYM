function Loader({ text = 'Загрузка...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-link-hover/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-text-header animate-spin" />
      </div>
      <p className="text-sm text-text-header/70 animate-pulse">{text}</p>
    </div>
  )
}

export default Loader
