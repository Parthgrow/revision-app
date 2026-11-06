import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { linksToMarkdown } from '@/lib/zk/links'

type Props = {
  body: string
  titles: Record<string, string> // id → current title, for unlabelled links
  broken?: string[]               // ids that no longer exist
}

// Renders a note body. [[id|label]] links become in-app links; links to
// deleted notes are shown struck through instead of leading to a 404.
export default function MarkdownView({ body, titles, broken = [] }: Props) {
  const md = linksToMarkdown(body, (id) => titles[id])
  const dead = new Set(broken)

  return (
    <div className="zk-prose">
      <ReactMarkdown
        components={{
          a({ href = '', children }) {
            const m = /^\/zk\/([A-Za-z0-9]{10})$/.exec(href)
            if (!m) {
              return (
                <a href={href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              )
            }
            if (dead.has(m[1])) {
              return (
                <span className="zk-broken" title="This note was deleted">
                  {children}
                </span>
              )
            }
            return <Link href={href}>{children}</Link>
          },
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  )
}
