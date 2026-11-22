import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@revision-app/core/auth'

export const metadata: Metadata = {
  title: 'ContextMagic — your design docs, where Claude can read them',
  description:
    'Keep your schema, HLD and LLDs in one place. Connect Claude once, and it reads and edits them in every chat and in Claude Code.',
  openGraph: {
    title: 'ContextMagic — your design docs, where Claude can read them',
    description:
      'Schema, HLD and LLDs in one place. Connect Claude once; it reads and edits them in every conversation.',
    url: 'https://contextmagic.in',
    siteName: 'ContextMagic',
    type: 'website',
  },
}

// Signed-in visitors go straight to their projects; everyone else sees the landing page.
export default async function Home() {
  if (await getSession()) redirect('/context')
  return <Landing />
}

const wrap = 'mx-auto w-full max-w-[1080px] px-6 sm:px-10'
const btnPrimary =
  'inline-block px-6 py-3 text-[15px] font-semibold bg-[var(--ink)] text-[var(--paper)] no-underline transition-opacity duration-150 hover:opacity-85'
const btnSecondary =
  'inline-block px-6 py-3 text-[15px] text-[var(--ink)] border border-[var(--rule)] no-underline transition-colors duration-150 hover:border-[var(--ink-3)] hover:bg-[var(--paper-2)]'

function Landing() {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <Header />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Documents />
        <Tools />
        <Safety />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="border-b border-[var(--rule)]">
      <div className={`${wrap} flex items-center justify-between h-16`}>
        <Link href="/" className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--ink)] no-underline">
          ContextMagic
        </Link>
        <nav className="flex items-center gap-5 sm:gap-7 text-[15px]">
          <a href="#how" className="hidden sm:inline text-[var(--ink-2)] no-underline hover:text-[var(--ink)]">
            How it works
          </a>
          <a href="#faq" className="hidden sm:inline text-[var(--ink-2)] no-underline hover:text-[var(--ink)]">
            FAQ
          </a>
          <Link href="/login" className="text-[var(--ink-2)] no-underline hover:text-[var(--ink)]">
            Sign in
          </Link>
          <Link href="/register" className="px-4 py-2 text-[14px] font-semibold bg-[var(--ink)] text-[var(--paper)] no-underline hover:opacity-85">
            Get started
          </Link>
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className={`${wrap} pt-16 sm:pt-24 pb-16 sm:pb-24 grid gap-14 lg:grid-cols-[1.05fr_1fr] items-center`}>
      <div className="flex flex-col gap-7">
        <p className="smallcaps">Design context for Claude</p>
        <h1 className="text-[40px] sm:text-[54px] font-light leading-[1.08] tracking-[-0.02em]">
          Write the design once.
          <br />
          <span className="italic">Claude reads it every time.</span>
        </h1>
        <p className="text-[18px] sm:text-[19px] leading-[1.6] text-[var(--ink-2)] max-w-[34rem]">
          ContextMagic keeps your schema, high-level design and low-level designs in one place.
          Connect it to Claude once, and every chat — and Claude Code — can look up how your
          system works, and update the docs as it changes.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/register" className={btnPrimary}>
            Start your first project
          </Link>
          <a href="#how" className={btnSecondary}>
            See how it works
          </a>
        </div>
        <p className="text-[14px] text-[var(--ink-3)]">
          No install. Works with claude.ai and Claude Code.
        </p>
      </div>
      <HeroVisual />
    </section>
  )
}

// A small "screenshot" built from markup: a project's documents, and Claude using them.
function HeroVisual() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="border border-[var(--rule)] bg-[var(--paper)] shadow-[0_1px_0_var(--rule),0_18px_40px_-24px_rgba(33,31,28,0.35)]">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--rule)] bg-[var(--paper-2)]">
          <span className="text-[14px] font-semibold">checkout-service</span>
          <span className="smallcaps">5 documents</span>
        </div>
        <div className="ledger text-[14px]">
          {[
            ['Schema', 'Orders, payments, refunds', '2h ago'],
            ['HLD', 'Components and data flow', 'yesterday'],
            ['LLD', 'Payment retries', '3d ago'],
            ['LLD', 'Refund webhook', '1w ago'],
            ['LLD', 'Idempotency keys', '2w ago'],
          ].map(([kind, title, when]) => (
            <div key={title} className="row grid grid-cols-[56px_1fr_auto] gap-3 px-4 py-2.5">
              <span className="smallcaps !text-[var(--ink-2)]">{kind}</span>
              <span>{title}</span>
              <span className="text-[var(--ink-3)]">{when}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="border border-[var(--rule)] bg-[var(--paper-2)] p-4 flex flex-col gap-3 text-[14px] leading-[1.55] sm:ml-10">
        <p>
          <span className="smallcaps mr-2">You</span>
          Add a max-attempts column to payments and update the retry LLD.
        </p>
        <p className="font-mono text-[12.5px] text-[var(--ink-3)]">
          read_document(&quot;checkout-service&quot;, &quot;schema&quot;) · edit_document(…)
        </p>
        <p>
          <span className="smallcaps mr-2">Claude</span>
          Done — added <code className="font-mono text-[13px]">max_attempts</code> to the payments
          table and a “Giving up” section to <em>Payment retries</em>.
        </p>
      </div>
    </div>
  )
}

function SectionHead({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 max-w-[40rem]">
      <p className="smallcaps">{kicker}</p>
      <h2 className="text-[30px] sm:text-[36px] font-light leading-[1.15] tracking-[-0.015em]">{title}</h2>
      {children && <p className="text-[17px] leading-[1.65] text-[var(--ink-2)]">{children}</p>}
    </div>
  )
}

function Problem() {
  return (
    <section className="border-y border-[var(--rule)] bg-[var(--paper-2)]">
      <div className={`${wrap} py-16 sm:py-20 grid gap-10 md:grid-cols-3`}>
        {[
          ['Every chat starts from zero', 'You paste the same schema and explain the same architecture again, every conversation.'],
          ['Docs drift from the code', 'The design lives in someone’s head or a stale wiki page nobody updates after the change ships.'],
          ['Claude guesses the rest', 'Without the real design in front of it, Claude fills gaps with plausible-looking assumptions.'],
        ].map(([t, d]) => (
          <div key={t} className="flex flex-col gap-2.5">
            <h3 className="text-[19px] font-semibold tracking-[-0.01em]">{t}</h3>
            <p className="text-[16px] leading-[1.6] text-[var(--ink-2)]">{d}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    ['Create a project', 'You get a schema and an HLD, started from templates with tables and diagrams. Add an LLD for each piece you design.'],
    ['Connect Claude', 'Generate a connector URL in Settings and add it to claude.ai as a custom connector — or one command for Claude Code.'],
    ['Just ask', '“How do refunds work?” “Write the LLD for rate limiting.” Claude looks up your docs, and keeps them current as you build.'],
  ]
  return (
    <section id="how" className={`${wrap} py-20 sm:py-28 flex flex-col gap-12 scroll-mt-8`}>
      <SectionHead kicker="How it works" title="Three steps, about two minutes." />
      <ol className="grid gap-px bg-[var(--rule)] border border-[var(--rule)] md:grid-cols-3 list-none">
        {steps.map(([t, d], i) => (
          <li key={t} className="bg-[var(--paper)] p-7 flex flex-col gap-3">
            <span className="text-[34px] font-light text-[var(--ink-4)] leading-none">{i + 1}</span>
            <h3 className="text-[19px] font-semibold tracking-[-0.01em]">{t}</h3>
            <p className="text-[16px] leading-[1.6] text-[var(--ink-2)]">{d}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Documents() {
  return (
    <section className="border-t border-[var(--rule)]">
      <div className={`${wrap} py-20 sm:py-28 grid gap-12 lg:grid-cols-[1fr_1.1fr] items-start [&>*]:min-w-0`}>
        <SectionHead kicker="What goes in a project" title="The three documents every system needs.">
          Plain markdown with tables and ASCII diagrams — readable by you, by your team, and by
          Claude. Print a whole project to PDF when you need to share it.
        </SectionHead>
        <div className="ledger border border-[var(--rule)]">
          {[
            ['Schema', 'What you store, where, and why: entities, keys, relationships, and what writes what.'],
            ['HLD', 'Goals, non-goals, components and data flow — the shape of the system on one page.'],
            ['LLDs', 'One per feature or tricky piece: the exact behaviour, edge cases and decisions.'],
          ].map(([t, d]) => (
            <div key={t} className="row grid sm:grid-cols-[110px_1fr] gap-1 sm:gap-4 px-5 py-5">
              <span className="text-[17px] font-semibold">{t}</span>
              <span className="text-[16px] leading-[1.6] text-[var(--ink-2)]">{d}</span>
            </div>
          ))}
          <pre className="font-mono text-[12px] leading-[1.45] text-[var(--ink-2)] px-5 py-5 overflow-x-auto border-t border-[var(--rule)] bg-[var(--paper)]">
{`┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│   API    │────▶│ Database │
└──────────┘     └──────────┘     └──────────┘`}
          </pre>
        </div>
      </div>
    </section>
  )
}

function Tools() {
  const tools = [
    ['list_projects', 'See every project'],
    ['get_project', 'A project’s documents'],
    ['read_document', 'Full markdown of one doc'],
    ['create_project', 'Start a project from templates'],
    ['create_lld', 'Write a new LLD'],
    ['edit_document', 'Change one exact passage'],
    ['update_document', 'Rewrite a whole document'],
    ['rename_lld', 'Rename an LLD'],
  ]
  return (
    <section className="border-t border-[var(--rule)] bg-[var(--paper-2)]">
      <div className={`${wrap} py-20 sm:py-28 flex flex-col gap-12`}>
        <SectionHead kicker="Built for Claude" title="Claude gets eight precise tools — not a wall of pasted text.">
          It reads only what the question needs, finds documents by name, and makes surgical edits
          instead of rewriting everything.
        </SectionHead>
        <div className="grid gap-px bg-[var(--rule)] border border-[var(--rule)] sm:grid-cols-2 lg:grid-cols-4">
          {tools.map(([name, d]) => (
            <div key={name} className="bg-[var(--paper)] px-5 py-4 flex flex-col gap-1">
              <code className="font-mono text-[13px] font-semibold">{name}</code>
              <span className="text-[14.5px] text-[var(--ink-2)]">{d}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Safety() {
  return (
    <section className="border-t border-[var(--rule)]">
      <div className={`${wrap} py-20 sm:py-28 grid gap-12 lg:grid-cols-[1fr_1.2fr]`}>
        <SectionHead kicker="You stay in control" title="Claude edits. It doesn’t clobber." />
        <ul className="flex flex-col gap-7 list-none">
          {[
            ['No overwritten work', 'If you changed a document in the browser after Claude read it, Claude’s edit is refused and it re-reads first.'],
            ['Deleting is yours alone', 'Claude can create and edit, but only you can delete a project or a document, from the web app.'],
            ['Revoke any time', 'Each connector has its own token. Revoke one in Settings and that connection stops working immediately.'],
          ].map(([t, d]) => (
            <li key={t} className="flex flex-col gap-1.5 border-l border-[var(--ink)] pl-5">
              <h3 className="text-[18px] font-semibold tracking-[-0.01em]">{t}</h3>
              <p className="text-[16px] leading-[1.6] text-[var(--ink-2)]">{d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Faq() {
  const qs = [
    ['Which Claude apps does it work with?', 'claude.ai on web, desktop and mobile through a custom connector, and Claude Code through an MCP server. Both use the connector URL or token you generate in Settings.'],
    ['Do I need to install anything?', 'No. ContextMagic runs in the browser, and connecting Claude is a URL you paste into Claude’s connector settings.'],
    ['How is this different from pasting docs into a Claude Project?', 'Pasted files are a snapshot. Here, Claude reads the current version every time and can update the docs itself, so they stay in step with what you build.'],
    ['Can I use it with my MindGym account?', 'Yes — it’s the same account, and your Context projects appear in both apps.'],
    ['Is my connector URL a secret?', 'Yes. Anyone with it can read and edit your documents, so treat it like a password and revoke it in Settings if it leaks.'],
  ]
  return (
    <section id="faq" className="border-t border-[var(--rule)] scroll-mt-8">
      <div className={`${wrap} py-20 sm:py-28 flex flex-col gap-10`}>
        <SectionHead kicker="Questions" title="Frequently asked" />
        <div className="border-t border-[var(--rule)] max-w-[48rem]">
          {qs.map(([q, a]) => (
            <details key={q} className="group border-b border-[var(--rule)]">
              <summary className="flex justify-between items-center gap-6 py-5 cursor-pointer list-none text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                {q}
                <span className="text-[var(--ink-3)] text-[22px] font-light transition-transform duration-150 group-open:rotate-45">+</span>
              </summary>
              <p className="pb-6 -mt-1 text-[16px] leading-[1.65] text-[var(--ink-2)] max-w-[42rem]">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="border-t border-[var(--rule-ink)] bg-[var(--ink)] text-[var(--paper)]">
      <div className={`${wrap} py-20 sm:py-24 flex flex-col items-start gap-7`}>
        <h2 className="text-[32px] sm:text-[42px] font-light leading-[1.12] tracking-[-0.015em] max-w-[36rem]">
          Stop re-explaining your system. Give Claude the design.
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/register" className="inline-block px-6 py-3 text-[15px] font-semibold bg-[var(--paper)] text-[var(--ink)] no-underline hover:opacity-90">
            Create your first project
          </Link>
          <Link href="/login" className="inline-block px-6 py-3 text-[15px] text-[var(--paper)] border border-[#5c574e] no-underline hover:border-[var(--paper)]">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className={`${wrap} py-10 flex flex-col sm:flex-row gap-3 justify-between text-[14px] text-[var(--ink-3)]`}>
      <span>© {new Date().getFullYear()} ContextMagic</span>
      <span className="smallcaps">Schema · HLD · LLDs — for Claude</span>
    </footer>
  )
}
