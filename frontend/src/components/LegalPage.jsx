import ReactMarkdown from 'react-markdown'

function preprocessLegal(text) {
  const lines = text.split('\n')
  const result = []
  let pastHeader = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!pastHeader) {
      if (/^1\.\s+\S/.test(trimmed)) {
        pastHeader = true
      } else {
        continue
      }
    }

    if (/^\d+\.\s+[^\d\s]/.test(trimmed) && !/^\d+\.\d+/.test(trimmed)) {
      result.push('')
      result.push('## ' + trimmed)
      result.push('')
      continue
    }

    if (/^\d+\.\d+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+(?:\.\d+)+\.?)\s*(.*)/)
      if (match) {
        result.push('')
        result.push(`**${match[1]}** ${match[2]}`)
        continue
      }
    }

    if (/^—\s+/.test(trimmed)) {
      result.push('- ' + trimmed.replace(/^—\s+/, ''))
      continue
    }

    if (/^[a-zа-яё]\)\s+/i.test(trimmed)) {
      result.push('- ' + trimmed.replace(/^[a-zа-яё]\)\s+/i, ''))
      continue
    }

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
    <h2 className="text-base font-bold text-gray-900 mt-8 mb-3 pb-1 border-b border-gray-200">
      {children}
    </h2>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-6 text-gray-700 mb-2">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 space-y-1 ml-4">{children}</ul>
  ),
  li: ({ children }) => (
    <li className="text-sm leading-6 text-gray-700 flex gap-2">
      <span className="mt-2 w-1 h-1 rounded-full bg-gray-300 shrink-0" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
}

function LegalPage({ title, subtitle, content }) {
  const markdown = preprocessLegal(content)

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mb-6">{subtitle}</p>}
      <div>
        <ReactMarkdown components={components}>{markdown}</ReactMarkdown>
      </div>
    </div>
  )
}

export default LegalPage
