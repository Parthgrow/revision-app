import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Renders a Context document. Fenced blocks are ASCII diagrams: monospace,
// never wrapped, scrolling sideways when wider than the column.
export default function CtxMarkdown({ body }: { body: string }) {
  return (
    <div className="ctx-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href = '', children }) {
            const external = /^https?:\/\//.test(href)
            return (
              <a href={href} {...(external && { target: '_blank', rel: 'noreferrer' })}>
                {children}
              </a>
            )
          },
          table({ children }) {
            return (
              <div className="ctx-table">
                <table>{children}</table>
              </div>
            )
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  )
}
