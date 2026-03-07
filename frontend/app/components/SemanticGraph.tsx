'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Download } from 'lucide-react';

interface SpatialNode {
    node_name: string;
    static_anchors: { anchor_id: string; type: string; description: string; image_indices: number[] }[];
    dynamic_objects: { object_id: string; type: string; description: string; image_indices: number[] }[];
    navigable_edges: { edge_id: string; description: string; visual_cue: string }[];
}

interface SemanticGraphProps {
    data: SpatialNode;
}

const PALETTE = {
    root: { fill: '#67E8F9', glow: 'rgba(103, 232, 249, 0.5)' },
    anchor: { fill: '#818CF8', glow: 'rgba(129, 140, 248, 0.4)' },
    object: { fill: '#34D399', glow: 'rgba(52, 211, 153, 0.4)' },
    edge: { fill: '#FB923C', glow: 'rgba(251, 146, 60, 0.4)' },
};

const BG = '#06060A';

function hexPath(r: number): string {
    return d3.range(6).map(i => {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        return `${r * Math.cos(a)},${r * Math.sin(a)}`;
    }).join(' ');
}

function diamondPath(s: number): string {
    return `0,${-s} ${s},0 0,${s} ${-s},0`;
}

export default function SemanticGraph({ data }: SemanticGraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !data) return;

        const width = svgRef.current.clientWidth || 800;
        const height = svgRef.current.clientHeight || 600;

        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
            .attr('viewBox', [0, 0, width, height]);

        const defs = svg.append('defs');

        // Glow filters per group
        Object.entries(PALETTE).forEach(([key, val]) => {
            const filter = defs.append('filter')
                .attr('id', `glow-${key}`)
                .attr('x', '-50%').attr('y', '-50%')
                .attr('width', '200%').attr('height', '200%');
            filter.append('feGaussianBlur')
                .attr('stdDeviation', 6).attr('result', 'blur');
            filter.append('feFlood')
                .attr('flood-color', val.glow).attr('result', 'color');
            filter.append('feComposite')
                .attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow');
            const merge = filter.append('feMerge');
            merge.append('feMergeNode').attr('in', 'glow');
            merge.append('feMergeNode').attr('in', 'SourceGraphic');
        });

        // Build data
        const nodes: any[] = [];
        const links: any[] = [];
        const rootId = data.node_name;
        nodes.push({ id: rootId, group: 'root', label: data.node_name });

        data.static_anchors?.forEach(a => {
            nodes.push({ id: a.anchor_id, group: 'anchor', label: a.description || a.type });
            links.push({ source: rootId, target: a.anchor_id });
        });
        data.dynamic_objects?.forEach(o => {
            nodes.push({ id: o.object_id, group: 'object', label: o.description || o.type });
            links.push({ source: rootId, target: o.object_id });
        });
        data.navigable_edges?.forEach(e => {
            nodes.push({ id: e.edge_id, group: 'edge', label: e.description });
            links.push({ source: rootId, target: e.edge_id });
        });

        // Radial layout with staggered angles per ring
        const cx = width / 2;
        const cy = height / 2;
        const groups = ['anchor', 'object', 'edge'] as const;
        const grouped: Record<string, any[]> = { anchor: [], object: [], edge: [] };
        nodes.forEach(n => { if (n.group !== 'root') grouped[n.group].push(n); });

        const rootNode = nodes.find(n => n.group === 'root')!;
        rootNode.x = cx;
        rootNode.y = cy;
        rootNode.fx = cx;
        rootNode.fy = cy;
        rootNode.angle = 0;

        const maxR = Math.min(width, height) / 2 - 60;
        const activeGroups = groups.filter(g => grouped[g].length > 0);
        const totalRings = activeGroups.length;

        // Offset each ring's start angle so nodes in adjacent rings don't align
        const ringOffsets = [0, Math.PI / 7, Math.PI / 5];

        let ringIdx = 0;
        activeGroups.forEach(grp => {
            const items = grouped[grp];
            const radius = (maxR / (totalRings + 0.3)) * (ringIdx + 1);
            const offset = ringOffsets[ringIdx % ringOffsets.length];
            items.forEach((n, i) => {
                const angle = (2 * Math.PI * i) / items.length + offset - Math.PI / 2;
                n.x = cx + radius * Math.cos(angle);
                n.y = cy + radius * Math.sin(angle);
                n.fx = n.x;
                n.fy = n.y;
                n.angle = angle;
            });
            ringIdx++;
        });

        // Resolve link source/target strings to node objects
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        links.forEach(l => {
            if (typeof l.source === 'string') l.source = nodeMap.get(l.source)!;
            if (typeof l.target === 'string') l.target = nodeMap.get(l.target)!;
        });

        const g = svg.append('g');

        // Zoom + pan
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.2, 10])
            .on('zoom', (event) => g.attr('transform', event.transform));
        svg.call(zoom);

        // Orbit rings
        ringIdx = 0;
        activeGroups.forEach(grp => {
            const radius = (maxR / (totalRings + 0.3)) * (ringIdx + 1);
            g.append('circle')
                .attr('cx', cx).attr('cy', cy).attr('r', radius)
                .attr('fill', 'none')
                .attr('stroke', 'rgba(255,255,255,0.04)')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '4,8');
            ringIdx++;
        });

        // Links — bright white, thick, straight lines
        const linkSelection = g.append('g')
            .selectAll<SVGLineElement, any>('line')
            .data(links)
            .join('line')
            .attr('stroke', '#ffffff')
            .attr('stroke-opacity', 0.7)
            .attr('stroke-width', 2.5)
            .attr('stroke-linecap', 'round')
            .attr('x1', (d: any) => d.source.x)
            .attr('y1', (d: any) => d.source.y)
            .attr('x2', (d: any) => d.target.x)
            .attr('y2', (d: any) => d.target.y);

        function updateLinks() {
            linkSelection
                .attr('x1', (d: any) => d.source.fx ?? d.source.x)
                .attr('y1', (d: any) => d.source.fy ?? d.source.y)
                .attr('x2', (d: any) => d.target.fx ?? d.target.x)
                .attr('y2', (d: any) => d.target.fy ?? d.target.y);
        }

        // Nodes
        const nodeSelection = g.append('g')
            .selectAll<SVGGElement, any>('g')
            .data(nodes)
            .join('g')
            .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
            .style('cursor', 'grab')
            .call(d3.drag<SVGGElement, any>()
                .on('start', function () { d3.select(this).style('cursor', 'grabbing'); })
                .on('drag', function (event, d) {
                    d.fx = event.x; d.fy = event.y;
                    d.x = event.x; d.y = event.y;
                    d.angle = Math.atan2(event.y - cy, event.x - cx);
                    d3.select(this).attr('transform', `translate(${event.x},${event.y})`);
                    updateLinks();
                    // Update label position for dragged node
                    updateLabelPosition(d3.select(this), d);
                })
                .on('end', function () { d3.select(this).style('cursor', 'grab'); }));

        // Hover interaction
        nodeSelection
            .on('mouseenter', function (_event, d: any) {
                nodeSelection.transition().duration(200)
                    .style('opacity', (n: any) =>
                        n.id === d.id || links.some((l: any) =>
                            (l.source.id === d.id && l.target.id === n.id) ||
                            (l.target.id === d.id && l.source.id === n.id)
                        ) ? 1 : 0.15
                    );
                linkSelection.transition().duration(200)
                    .style('opacity', (l: any) =>
                        l.source.id === d.id || l.target.id === d.id ? 1 : 0.06
                    );
            })
            .on('mouseleave', function () {
                nodeSelection.transition().duration(300).style('opacity', 1);
                linkSelection.transition().duration(300).style('opacity', 1);
            });

        // Draw shapes per group
        nodeSelection.each(function (d: any) {
            const el = d3.select(this);
            const p = PALETTE[d.group as keyof typeof PALETTE];
            const color = p.fill;
            el.attr('filter', `url(#glow-${d.group})`);

            if (d.group === 'root') {
                el.append('circle')
                    .attr('r', 28)
                    .attr('fill', 'none')
                    .attr('stroke', color)
                    .attr('stroke-opacity', 0.12)
                    .attr('stroke-width', 1);
                el.append('polygon')
                    .attr('points', hexPath(20))
                    .attr('fill', color).attr('fill-opacity', 0.1)
                    .attr('stroke', color).attr('stroke-width', 2);
                [-4, 0, 4].forEach(ox => {
                    el.append('circle')
                        .attr('cx', ox).attr('cy', 0).attr('r', 2)
                        .attr('fill', color).attr('fill-opacity', 0.7);
                });
            } else if (d.group === 'anchor') {
                el.append('polygon')
                    .attr('points', diamondPath(12))
                    .attr('fill', color).attr('fill-opacity', 0.12)
                    .attr('stroke', color).attr('stroke-width', 1.5);
                el.append('line')
                    .attr('x1', 0).attr('y1', -5).attr('x2', 0).attr('y2', 5)
                    .attr('stroke', color).attr('stroke-width', 1.5).attr('stroke-opacity', 0.5);
                el.append('line')
                    .attr('x1', -5).attr('y1', 0).attr('x2', 5).attr('y2', 0)
                    .attr('stroke', color).attr('stroke-width', 1.5).attr('stroke-opacity', 0.5);
            } else if (d.group === 'object') {
                el.append('rect')
                    .attr('width', 18).attr('height', 18)
                    .attr('x', -9).attr('y', -9).attr('rx', 5)
                    .attr('fill', color).attr('fill-opacity', 0.1)
                    .attr('stroke', color).attr('stroke-width', 1.5);
                el.append('circle')
                    .attr('r', 3)
                    .attr('fill', color).attr('fill-opacity', 0.5);
            } else if (d.group === 'edge') {
                el.append('polygon')
                    .attr('points', '-8,-9 10,0 -8,9')
                    .attr('fill', color).attr('fill-opacity', 0.12)
                    .attr('stroke', color).attr('stroke-width', 1.5);
                el.append('line')
                    .attr('x1', -3).attr('y1', 0).attr('x2', 5).attr('y2', 0)
                    .attr('stroke', color).attr('stroke-width', 1.5).attr('stroke-opacity', 0.6);
            }
        });

        // Labels positioned outward from center to avoid overlaps
        function updateLabelPosition(el: d3.Selection<SVGGElement, any, any, any>, d: any) {
            el.selectAll('.node-label-bg, .node-label-text').remove();

            const p = PALETTE[d.group as keyof typeof PALETTE];
            const isRoot = d.group === 'root';

            if (isRoot) {
                const text = el.append('text')
                    .classed('node-label-text', true)
                    .text(d.label)
                    .attr('x', 0).attr('y', 36)
                    .attr('text-anchor', 'middle')
                    .attr('font-family', "'IBM Plex Mono', monospace")
                    .attr('font-size', '12px')
                    .attr('font-weight', '700')
                    .attr('fill', p.fill)
                    .attr('fill-opacity', 0.9);
                const bbox = (text.node() as SVGTextElement).getBBox();
                el.insert('rect', '.node-label-text')
                    .classed('node-label-bg', true)
                    .attr('x', bbox.x - 6).attr('y', bbox.y - 3)
                    .attr('width', bbox.width + 12).attr('height', bbox.height + 6)
                    .attr('rx', 5)
                    .attr('fill', BG).attr('fill-opacity', 0.85)
                    .attr('stroke', p.fill).attr('stroke-opacity', 0.15)
                    .attr('stroke-width', 1);
                return;
            }

            const angle = d.angle ?? Math.atan2(d.y - cy, d.x - cx);
            const onRight = Math.cos(angle) >= 0;
            const labelOffset = 20;
            const lx = onRight ? labelOffset : -labelOffset;
            const anchor = onRight ? 'start' : 'end';

            const text = el.append('text')
                .classed('node-label-text', true)
                .text(d.label)
                .attr('x', lx).attr('y', 4)
                .attr('text-anchor', anchor)
                .attr('font-family', "'IBM Plex Mono', monospace")
                .attr('font-size', '10px')
                .attr('font-weight', '500')
                .attr('fill', p.fill)
                .attr('fill-opacity', 0.85);

            const bbox = (text.node() as SVGTextElement).getBBox();
            el.insert('rect', '.node-label-text')
                .classed('node-label-bg', true)
                .attr('x', bbox.x - 5).attr('y', bbox.y - 2)
                .attr('width', bbox.width + 10).attr('height', bbox.height + 4)
                .attr('rx', 4)
                .attr('fill', BG).attr('fill-opacity', 0.8)
                .attr('stroke', p.fill).attr('stroke-opacity', 0.1)
                .attr('stroke-width', 1);
        }

        nodeSelection.each(function (d: any) {
            updateLabelPosition(d3.select(this) as any, d);
        });

        // Initial view: fit all nodes in viewport with padding so first view is well distributed
        const padding = 80;
        const minX = Math.min(...nodes.map((n: any) => n.x)) - padding;
        const maxX = Math.max(...nodes.map((n: any) => n.x)) + padding;
        const minY = Math.min(...nodes.map((n: any) => n.y)) - padding;
        const maxY = Math.max(...nodes.map((n: any) => n.y)) + padding;
        const boxW = maxX - minX;
        const boxH = maxY - minY;
        const scale = Math.min(width / boxW, height / boxH, 2); // cap scale at 2 to avoid over-zooming
        const tx = width / 2 - scale * (minX + maxX) / 2;
        const ty = height / 2 - scale * (minY + maxY) / 2;
        svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }, [data]);

    const handleDownload = () => {
        if (!svgRef.current) return;
        const svgEl = svgRef.current;
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const canvas = document.createElement('canvas');
        canvas.width = svgEl.clientWidth * 2;
        canvas.height = svgEl.clientHeight * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const a = document.createElement('a');
            a.download = `semantic_graph_${data.node_name || 'graph'}.png`;
            a.href = canvas.toDataURL('image/png');
            a.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    return (
        <div className="w-full h-full relative overflow-hidden min-h-[420px]" style={{ background: BG }}>
            <button onClick={handleDownload}
                className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(9,9,11,0.9)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)' }}>
                <Download className="w-3 h-3" /> Export
            </button>

            <svg ref={svgRef} className="w-full h-full absolute inset-0" />

            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg text-[10px] font-mono z-10"
                style={{ background: 'rgba(6,6,10,0.8)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)' }}>
                Scroll to zoom · Drag nodes to rearrange
            </div>
        </div>
    );
}
