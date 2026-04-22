function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="min-w-10 h-10 sm:min-w-9 sm:h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default bg-bg-header/50 text-text-header hover:bg-bg-header/70"
      >
        &laquo;
      </button>

      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`dots-${idx}`} className="px-1.5 py-2 text-text-primary/50 text-sm">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`min-w-10 h-10 sm:min-w-9 sm:h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              page === currentPage
                ? 'bg-link-hover text-bg-header'
                : 'bg-bg-header/50 text-text-header hover:bg-bg-header/70'
            }`}
          >
            {page}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="min-w-10 h-10 sm:min-w-9 sm:h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default bg-bg-header/50 text-text-header hover:bg-bg-header/70"
      >
        &raquo;
      </button>
    </div>
  )
}

export default Pagination
