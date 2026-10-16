'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { drag } from 'd3-drag'
import type { Graph, GraphEdge, GraphNode, NoteType } from '@/lib/zk/types'
import { seedPosition } from '@/lib/zk/graph'

type SimNode = GraphNode & SimulationNodeDatum
type SimLink = SimulationLinkDatum<SimNode> & { kinds: GraphEdge['kinds'] }

type Props = {
  graph: Graph
  focusId?: string | null
  height?: number
}

// Small graphs show every title; bigger ones show titles on hover or when
// zoomed in, so labels don't pile on top of each other.
const LABEL_ALL_BELOW = 30
const LABEL_ZOOM = 1.4

export const nodeRadius = (degree: number) => 5 + 2 * Math.sqrt(degree)

// Note type is encoded by shape (and fill), never by colour alone.
export function shapePath(type: NoteType, r: number): string {
  switch (type) {
    case 'structure': {
      const d = r * 1.35
      return `M0,${-d}L${d},0L0,${d}L${-d},0Z`
    }
    case 'literature': {
      const s = r * 0.9
      return `M${-s},${-s}H${s}V${s}H${-s}Z`
    }
    default:
      return `M${r},0A${r},${r} 0 1,1 ${-r},0A${r},${r} 0 1,1 ${r},0Z`
  }
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function GraphCanvas({ graph, focusId, height = 600 }: Props) {
  const router = useRouter()
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const positions = useRef(new Map<string, { x: number; y: number; fx?: number | null; fy?: number | null }>())
  const userMoved = useRef(false)
  const [width, setWidth] = useState(800)
  const [tip, setTip] = useState<{ node: SimNode; x: number; y: number } | null>(null)

  // Track the container width so the drawing fills the column.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Build / rebuild the drawing whenever the graph or size changes.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const root = select(svg)
    root.selectAll('*').remove()

    const nodes: SimNode[] = graph.nodes.map((n) => {
      const prev = positions.current.get(n.id)
      const [sx, sy] = seedPosition(n.id, 40 + Math.sqrt(graph.nodes.length) * 30)
      return { ...n, x: prev?.x ?? sx, y: prev?.y ?? sy, fx: prev?.fx ?? null, fy: prev?.fy ?? null }
    })
    const links: SimLink[] = graph.edges.map((e) => ({ source: e.source, target: e.target, kinds: e.kinds }))

    const neighbours = new Map<string, Set<string>>(nodes.map((n) => [n.id, new Set()]))
    for (const e of graph.edges) {
      neighbours.get(e.source)?.add(e.target)
      neighbours.get(e.target)?.add(e.source)
    }

    // When every title is visible, give each note room for its label so
    // titles don't land on top of each other.
    const labelled = nodes.length < LABEL_ALL_BELOW
    const room = (d: SimNode) =>
      nodeRadius(d.degree) + (labelled ? 10 + Math.min(d.title.length, 40) * 3.1 : 8)

    const sim = forceSimulation<SimNode>(nodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((l) => (l.kinds.includes('link') ? 90 : 65))
          .strength((l) => (l.kinds.includes('sequence') ? 0.9 : 0.5))
      )
      .force('charge', forceManyBody<SimNode>().strength(-300))
      .force('collide', forceCollide<SimNode>(room).strength(0.9))
      .force('x', forceX<SimNode>(0).strength(0.08))
      .force('y', forceY<SimNode>(0).strength(0.08))
      .stop()
    // Settle the layout before the first paint: no flying dots, and the same
    // starting positions give the same picture every visit. After a filter
    // change most notes already have a place, so only nudge them gently.
    const placed = graph.nodes.filter((n) => positions.current.has(n.id)).length
    if (placed > 0 && placed >= nodes.length / 2) sim.alpha(0.2).tick(80)
    else sim.tick(nodes.length > 600 ? 120 : 300)
    simRef.current?.stop()
    simRef.current = sim

    const viewport = root.append('g').attr('class', 'viewport')
    const edgeSel = viewport
      .append('g')
      .attr('class', 'edges')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('class', (l) => (l.kinds.includes('link') ? 'edge edge-link' : 'edge edge-sequence'))

    const nodeSel = viewport
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes, (d) => d.id)
      .join('g')
      .attr('class', (d) => `node node-${d.type}`)

    // Invisible hit area larger than the mark, drawn underneath it.
    nodeSel
      .append('circle')
      .attr('class', 'hit')
      .attr('r', (d) => nodeRadius(d.degree) + 8)
    nodeSel.append('path').attr('d', (d) => shapePath(d.type, nodeRadius(d.degree)))
    nodeSel
      .append('text')
      .attr('class', 'label')
      .attr('x', (d) => nodeRadius(d.degree) + 6)
      .attr('dy', '0.35em')
      .text((d) => (d.title.length > 40 ? d.title.slice(0, 39) + '…' : d.title))

    const draw = () => {
      edgeSel
        .attr('x1', (l) => (l.source as SimNode).x!)
        .attr('y1', (l) => (l.source as SimNode).y!)
        .attr('x2', (l) => (l.target as SimNode).x!)
        .attr('y2', (l) => (l.target as SimNode).y!)
      nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`)
      for (const n of nodes) positions.current.set(n.id, { x: n.x!, y: n.y!, fx: n.fx, fy: n.fy })
    }
    draw()
    sim.on('tick', draw)

    // Labels: everything in small graphs, otherwise only when zoomed in.
    const setZoomLabels = (k: number) =>
      root.classed('show-labels', nodes.length < LABEL_ALL_BELOW || k >= LABEL_ZOOM)

    // Zoom and pan.
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on('zoom', (event) => {
        viewport.attr('transform', event.transform.toString())
        setZoomLabels(event.transform.k)
        if (event.sourceEvent) userMoved.current = true
        setTip(null)
      })
    zoomRef.current = z
    root.call(z).on('dblclick.zoom', null)

    // Fit everything drawn (labels included) in view, unless the reader has
    // already zoomed or panned. Never zoom in past 1.25× just to fill space.
    if (!userMoved.current && nodes.length > 0) {
      setZoomLabels(1)
      const box = (viewport.node() as SVGGElement).getBBox()
      const pad = 24
      const k = Math.min(1.25, (width - pad * 2) / box.width, (height - pad * 2) / box.height)
      const cx = box.x + box.width / 2
      const cy = box.y + box.height / 2
      root.call(z.transform, zoomIdentity.translate(width / 2 - cx * k, height / 2 - cy * k).scale(k))
    } else {
      setZoomLabels(1)
    }

    // Hover: keep the node and its neighbours sharp, fade the rest.
    const highlight = (id: string | null) => {
      root.classed('is-hovering', !!id)
      if (!id) return
      const near = neighbours.get(id) ?? new Set()
      nodeSel.classed('is-near', (d) => d.id === id || near.has(d.id)).classed('is-hovered', (d) => d.id === id)
      edgeSel.classed('is-near', (l) => (l.source as SimNode).id === id || (l.target as SimNode).id === id)
    }
    nodeSel
      .on('pointerenter', (event: PointerEvent, d) => {
        highlight(d.id)
        const box = wrapRef.current!.getBoundingClientRect()
        setTip({ node: d, x: event.clientX - box.left, y: event.clientY - box.top })
      })
      .on('pointerleave', () => {
        highlight(null)
        setTip(null)
      })
      .on('click', (_event, d) => router.push(`/zk/${d.id}`))
      .on('dblclick', (event: MouseEvent, d) => {
        // Unpin a dragged note.
        event.stopPropagation()
        d.fx = null
        d.fy = null
        sim.alpha(0.3).restart()
      })

    // Drag moves a note and pins it where it is dropped.
    nodeSel.call(
      drag<SVGGElement, SimNode>()
        .on('start', (event, d) => {
          if (!event.active && !prefersReducedMotion()) sim.alphaTarget(0.2).restart()
          d.fx = d.x
          d.fy = d.y
          setTip(null)
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
          if (prefersReducedMotion()) {
            d.x = event.x
            d.y = event.y
            draw()
          }
        })
        .on('end', (event) => {
          if (!event.active) sim.alphaTarget(0)
        })
    )

    return () => {
      sim.stop()
    }
  }, [graph, width, height, router])

  // Centre a searched-for note.
  useEffect(() => {
    if (!focusId || !svgRef.current || !zoomRef.current) return
    const p = positions.current.get(focusId)
    if (!p) return
    const root = select(svgRef.current)
    const k = 1.6
    const t = zoomIdentity.translate(width / 2 - p.x * k, height / 2 - p.y * k).scale(k)
    userMoved.current = true
    root.call(zoomRef.current.transform, t)
    root.selectAll<SVGGElement, SimNode>('g.node').classed('is-focus', (d) => d.id === focusId)
  }, [focusId, graph, width, height])

  return (
    <div ref={wrapRef} className="zk-graph relative w-full border border-[var(--rule)]" style={{ height }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label={`Graph of ${graph.nodes.length} notes and ${graph.edges.length} connections`}
        className="block touch-none select-none"
      />
      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 max-w-[260px] border border-[var(--ink-3)] bg-[var(--paper)] px-3 py-2 shadow-[0_10px_24px_-16px_rgba(33,31,28,0.6)]"
          style={{
            left: Math.min(tip.x + 14, width - 270),
            top: Math.max(8, tip.y - 12),
          }}
        >
          <p className="text-[15px] font-semibold leading-snug text-[var(--ink)]">{tip.node.title}</p>
          <p className="smallcaps mt-1">
            {tip.node.type}
            {tip.node.address ? ` · ${tip.node.address}` : ''} · {tip.node.degree} connection
            {tip.node.degree === 1 ? '' : 's'}
          </p>
          <p className="mt-1 text-[13px] text-[var(--ink-3)]">Click to open · drag to pin</p>
        </div>
      )}
    </div>
  )
}
