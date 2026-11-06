// Starting content for new documents, plus the diagram helpers the editor
// offers. Everything is plain markdown with ASCII diagrams in fenced blocks.

const fence = (s: string) => '```\n' + s.replace(/^\n|\n$/g, '') + '\n```'

export function schemaTemplate(projectName: string): string {
  return `What ${projectName} stores, where, and why.

## Overview


## Entities

| Entity | Key / table | Holds |
|---|---|---|
| User | \`user:{id}\` | account |
| | | |

## Relationships
${fence(`
┌──────────┐ 1      n ┌──────────┐
│  User    │─────────▶│  Item    │
└──────────┘          └──────────┘
`)}

## What writes what

| Action | Writes |
|---|---|
| | |

## Example records
${fence(`
user:abc → {"id":"abc","email":"…"}
`)}
`
}

export function hldTemplate(projectName: string): string {
  return `High-level design for ${projectName}.

## Goals
-

## Non-goals
-

## Users
Who uses it and for what.

## Components
${fence(`
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│   API    │────▶│ Database │
└──────────┘     └──────────┘     └──────────┘
`)}

## Data flow
${fence(`
user ─▶ page ─▶ API ─▶ service ─▶ storage
`)}

## External services
-

## Non-functional requirements
| Concern | Approach |
|---|---|
| Performance | |
| Security | |

## Open questions
1.
`
}

export function lldTemplate(title: string): string {
  return `Low-level design for ${title}.

## Requirements
-

## Types
${fence(`
type Example = { id: string }
`)}

## Classes
${fence(`
┌──────────────────────┐
│ «service» Example    │
├──────────────────────┤
│ - store              │
├──────────────────────┤
│ + doThing(input)     │
└──────────────────────┘
`)}

## Storage changes
| Key | Type | Holds |
|---|---|---|
| | | |

## Algorithms
${fence(`
step 1 → step 2 → step 3
`)}

## API
| Method | Path | Body | Returns |
|---|---|---|---|
| | | | |

## Sequence
${fence(`
 Client           API            Service
   │── request ───▶│                 │
   │               │── call ────────▶│
   │◀── response ──│◀────────────────│
`)}

## Edge cases
-

## Tests
-
`
}

export type Snippet = { label: string; text: string }

// Inserted by the editor's "Diagram" menu as complete fenced blocks.
export const DIAGRAM_SNIPPETS: Snippet[] = [
  {
    label: 'Box',
    text: fence(`
┌──────────────┐
│  Component   │
└──────────────┘
`),
  },
  {
    label: 'Flow',
    text: fence(`
┌───────┐     ┌───────┐     ┌───────┐
│   A   │────▶│   B   │────▶│   C   │
└───────┘     └───────┘     └───────┘
`),
  },
  {
    label: 'Layers',
    text: fence(`
┌──────────────────────────────┐
│ UI                           │
├──────────────────────────────┤
│ API                          │
├──────────────────────────────┤
│ Service                      │
├──────────────────────────────┤
│ Storage                      │
└──────────────────────────────┘
`),
  },
  {
    label: 'Sequence',
    text: fence(`
 Client           Server           DB
   │── request ─────▶│               │
   │                 │── query ─────▶│
   │                 │◀── rows ──────│
   │◀── response ────│               │
`),
  },
  {
    label: 'Tree',
    text: fence(`
root
├── child
│   ├── leaf
│   └── leaf
└── child
`),
  },
  {
    label: 'Table grid',
    text: fence(`
┌────────┬────────┬────────┐
│ col    │ col    │ col    │
├────────┼────────┼────────┤
│        │        │        │
└────────┴────────┴────────┘
`),
  },
  {
    label: 'State machine',
    text: fence(`
 ┌────────┐  start   ┌─────────┐  finish  ┌────────┐
 │  idle  │─────────▶│ running │─────────▶│  done  │
 └────────┘          └────┬────┘          └────────┘
      ▲         fail      │
      └───────────────────┘
`),
  },
  {
    label: 'Class',
    text: fence(`
┌──────────────────────┐
│ «interface» Name     │
├──────────────────────┤
│ + field: type        │
├──────────────────────┤
│ + method(arg): type  │
└──────────────────────┘
`),
  },
]

// One-click characters in the editor's palette.
export const BOX_CHARS = [
  '┌', '┐', '└', '┘', '─', '│', '├', '┤', '┬', '┴', '┼',
  '═', '║', '▶', '◀', '▲', '▼', '→', '←', '↑', '↓', '●', '○', '◆', '·',
]
