// Renders a single chat bubble with markdown support:
// ## h2, ### h3, **bold**, *italic*, bullet lists, numbered lists, tables, ---, paragraphs.

function parseInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>
    // strip unmatched ** the LLM accidentally leaves in plain-text segments
    return part.replace(/\*\*/g, '')
  })
}

// Split a table row "| a | b | c |" → ["a", "b", "c"]
function splitTableRow(line) {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())
}

const isTableRow  = (l) => l.trim().startsWith('|') && l.trim().endsWith('|')
const isSeparator = (l) => /^\|[\s|:-]+\|$/.test(l.trim())

function renderMarkdown(text) {
  const lines = text.split('\n')
  const nodes = []
  let listType  = null   // 'ul' | 'ol' | null
  let listItems = []
  let tableRows = []     // raw lines collected for a table block
  let key = 0

  const flushList = () => {
    if (!listItems.length) return
    const Tag = listType === 'ol' ? 'ol' : 'ul'
    nodes.push(
      <Tag key={key++} className="chat-md-list">
        {listItems.map((item, i) => <li key={i}>{parseInline(item)}</li>)}
      </Tag>
    )
    listItems = []
    listType  = null
  }

  const flushTable = () => {
    if (!tableRows.length) return

    // find separator row index
    const sepIdx = tableRows.findIndex(isSeparator)
    const headerLines = sepIdx > 0 ? tableRows.slice(0, sepIdx)  : []
    const bodyLines   = sepIdx >= 0 ? tableRows.slice(sepIdx + 1) : tableRows

    nodes.push(
      <div key={key++} className="chat-md-table-wrap">
        <table className="chat-md-table">
          {headerLines.length > 0 && (
            <thead>
              {headerLines.map((row, r) => (
                <tr key={r}>
                  {splitTableRow(row).map((cell, c) => (
                    <th key={c}>{parseInline(cell)}</th>
                  ))}
                </tr>
              ))}
            </thead>
          )}
          <tbody>
            {bodyLines.map((row, r) => (
              <tr key={r}>
                {splitTableRow(row).map((cell, c) => (
                  <td key={c}>{parseInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
    tableRows = []
  }

  lines.forEach((line) => {
    if (isTableRow(line)) {
      flushList()
      tableRows.push(line)
      return
    }

    flushTable()

    const h2Match = line.match(/^## (.+)/)
    const h3Match = line.match(/^### (.+)/)
    const hrMatch = line.match(/^---+$/)
    const ulMatch = line.match(/^[-*] (.+)/)
    const olMatch = line.match(/^\d+\. (.+)/)

    if (h2Match) {
      flushList()
      nodes.push(<h2 key={key++} className="chat-md-h2">{parseInline(h2Match[1])}</h2>)
    } else if (h3Match) {
      flushList()
      nodes.push(<h3 key={key++} className="chat-md-h3">{parseInline(h3Match[1])}</h3>)
    } else if (hrMatch) {
      flushList()
      nodes.push(<hr key={key++} className="chat-md-hr" />)
    } else if (ulMatch) {
      if (listType === 'ol') flushList()
      listType = 'ul'
      listItems.push(ulMatch[1])
    } else if (olMatch) {
      if (listType === 'ul') flushList()
      listType = 'ol'
      listItems.push(olMatch[1])
    } else {
      flushList()
      if (line.trim() === '') {
        nodes.push(<div key={key++} className="chat-md-gap" />)
      } else {
        nodes.push(<p key={key++} className="chat-md-p">{parseInline(line)}</p>)
      }
    }
  })

  flushList()
  flushTable()
  return nodes
}

export default function ChatMessage({ role, content }) {
  const isUser = role === 'user'

  return (
    <div className={`chat-msg ${isUser ? 'chat-msg-user' : 'chat-msg-bot'}`}>
      {!isUser && (
        <div className="chat-avatar chat-avatar-bot" title="AI Assistant">
          🤖
        </div>
      )}
      <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>
        {isUser
          ? <span>{content}</span>
          : <div className="chat-md">{renderMarkdown(content)}</div>
        }
      </div>
      {isUser && (
        <div className="chat-avatar chat-avatar-user" title="Bạn">
          👤
        </div>
      )}
    </div>
  )
}
