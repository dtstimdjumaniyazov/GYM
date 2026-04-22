import ReactMarkdown from 'react-markdown'

/**
 * Конвертирует формат юридических документов в стандартный Markdown.
 *
 * Правила:
 * - Строки "N. Заголовок" → ## заголовок раздела
 * - Строки "N.N. текст" → параграф с жирным номером
 * - Строки "— текст" → элемент списка
 * - Строки "a) b) в)" → элемент списка
 * - Первый блок до раздела "1." (мета-заголовок файла) → пропускается
 */
function preprocessLegal(text) {
  const lines = text.split('\n')
  const result = []
  let pastHeader = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Пропускаем мета-блок файла (до первого раздела "1.")
    if (!pastHeader) {
      if (/^1\.\s+\S/.test(trimmed)) {
        pastHeader = true
      } else {
        continue
      }
    }

    // "1. Заголовок раздела" → ## heading
    if (/^\d+\.\s+[^\d\s]/.test(trimmed) && !/^\d+\.\d+/.test(trimmed)) {
      result.push('')
      result.push('## ' + trimmed)
      result.push('')
      continue
    }

    // "1.1." или "1.1.1." → параграф с жирным номером
    if (/^\d+\.\d+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+(?:\.\d+)+\.?)\s*(.*)/)
      if (match) {
        result.push('')
        result.push(`**${match[1]}** ${match[2]}`)
        continue
      }
    }

    // "— текст" → элемент маркированного списка
    if (/^—\s+/.test(trimmed)) {
      result.push('- ' + trimmed.replace(/^—\s+/, ''))
      continue
    }

    // "a) б) в)" → элемент маркированного списка
    if (/^[a-zа-яё]\)\s+/i.test(trimmed)) {
      result.push('- ' + trimmed.replace(/^[a-zа-яё]\)\s+/i, ''))
      continue
    }

    // Пустая строка
    if (trimmed === '') {
      result.push('')
      continue
    }

    result.push(trimmed)
  }

  return result.join('\n')
}

const components = {
  h2: ({ children }) => (
    <h2 className="text-base font-bold text-text-header mt-8 mb-3 pb-1 border-b border-bg-header/20">
      {children}
    </h2>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-6 text-text-primary mb-2">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 space-y-1 ml-4">{children}</ul>
  ),
  li: ({ children }) => (
    <li className="text-sm leading-6 text-text-primary flex gap-2">
      <span className="mt-2 w-1 h-1 rounded-full bg-text-primary/40 shrink-0" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-text-header">{children}</strong>
  ),
}

function LegalPage({ title, subtitle, content }) {
  const markdown = preprocessLegal(content)

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <h1 className="text-2xl font-bold text-text-header mb-1">{title}</h1>
      {subtitle && <p className="text-sm text-text-primary/60 mb-6">{subtitle}</p>}
      <div>
        <ReactMarkdown components={components}>{markdown}</ReactMarkdown>
      </div>
    </div>
  )
}

export default LegalPage
