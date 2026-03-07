'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Download } from 'lucide-react';
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

const COLORS = {
    root: '#67E8F9',
    anchor: '#818CF8',
    object: '#FDE68A',
    edge: '#F87171',
    link: 'rgba(255, 255, 255, 0.08)',
    label: '#A1A1AA',
    bg: '#020108',
};

export default function SemanticGraph({ data }: SemanticGraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !data) return;

        const width = svgRef.current.clientWidth || 800;
        const height = svgRef.current.clientHeight || 500;

        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
            .attr('viewBox', [0, 0, width, height]);

        const nodes: any[] = [];
        const links: any[] = [];

        const rootId = data.node_name;
        nodes.push({ id: rootId, group: 'root', label: data.node_name });

        data.static_anchors?.forEach(anchor => {
            nodes.push({ id: anchor.anchor_id, group: 'anchor', label: anchor.description || anchor.type });
            links.push({ source: rootId, target: anchor.anchor_id, type: 'contains' });
        });

        data.dynamic_objects?.forEach(obj => {
            nodes.push({ id: obj.object_id, group: 'object', label: obj.description || obj.type });
            links.push({ source: rootId, target: obj.object_id, type: 'contains' });
        });

        data.navigable_edges?.forEach(edge => {
            nodes.push({ id: edge.edge_id, group: 'edge', label: edge.description });
            links.push({ source: rootId, target: edge.edge_id, type: 'connects' });
        });

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collide', d3.forceCollide().radius(40));

        const g = svg.append('g');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        const link = g.append('g')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', COLORS.link)
            .attr('stroke-width', 1);
            .attr('stroke', COLORS.link)
            .attr('stroke-width', 1);

        const node = g.append('g')
            .selectAll('g')
            .data(nodes)
            .join('g')
            .call(d3.drag<any, any>()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

        node.each(function (d: any) {
            const el = d3.select(this);
            const color = COLORS[d.group as keyof typeof COLORS] || COLORS.label;

            const color = COLORS[d.group as keyof typeof COLORS] || COLORS.label;

            if (d.group === 'root') {
                el.append('rect')
                    .attr('width', 24).attr('height', 24)
                    .attr('x', -12).attr('y', -12)
                    .attr('rx', 4)
                    .attr('fill', color)
                    .attr('fill-opacity', 0.15)
                    .attr('stroke', color)
                    .attr('width', 24).attr('height', 24)
                    .attr('x', -12).attr('y', -12)
                    .attr('rx', 4)
                    .attr('fill', color)
                    .attr('fill-opacity', 0.15)
                    .attr('stroke', color)
                    .attr('stroke-width', 1.5);
            } else if (d.group === 'edge') {
                el.append('circle')
                    .attr('r', 5)
                    .attr('fill', color)
                    .attr('fill-opacity', 0.2)
                    .attr('stroke', color)
                    .attr('stroke-width', 1);
            } else {
                const size = d.group === 'anchor' ? 18 : 14;
                el.append('rect')
                    .attr('width', size).attr('height', size)
                    .attr('x', -size / 2).attr('y', -size / 2)
                    .attr('rx', 3)
                    .attr('fill', color)
                    .attr('fill-opacity', 0.15)
                    .attr('stroke', color)
                    .attr('stroke-width', 1);
            }
        });

                    .attr('r', 5)
                    .attr('fill', color)
                    .attr('fill-opacity', 0.2)
                    .attr('stroke', color)
                    .attr('stroke-width', 1);
            } else {
                const size = d.group === 'anchor' ? 18 : 14;
                el.append('rect')
                    .attr('width', size).attr('height', size)
                    .attr('x', -size / 2).attr('y', -size / 2)
                    .attr('rx', 3)
                    .attr('fill', color)
                    .attr('fill-opacity', 0.15)
                    .attr('stroke', color)
                    .attr('stroke-width', 1);
            }
        });

        node.append('text')
            .text((d: any) => d.label)
            .attr('x', 16)
            .attr('x', 16)
            .attr('y', 4)
            .attr('font-family', "'IBM Plex Mono', monospace")
            .attr('font-family', "'IBM Plex Mono', monospace")
            .attr('font-size', '10px')
            .attr('font-weight', '500')
            .attr('fill', COLORS.label);
            .attr('font-weight', '500')
            .attr('fill', COLORS.label);

        simulation.on('tick', () => {
            link
                .attr('x1', (d: any) => d.source.x)
                .attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x)
                .attr('y2', (d: any) => d.target.y);

            node
                .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        });

        function dragstarted(event: any) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event: any) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event: any) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        return () => {
            simulation.stop();
        };
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
        ctx.fillStyle = COLORS.bg;
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const link = document.createElement('a');
            link.download = `semantic_graph_${data.node_name || 'graph'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    return (
        <div className="w-full h-full relative overflow-hidden min-h-[420px]" style={{ background: COLORS.bg }}>
        <div className="w-full h-full relative overflow-hidden min-h-[420px]" style={{ background: COLORS.bg }}>
            <button onClick={handleDownload}
                className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(9,9,11,0.9)', border: '1px solid var(--border-strong)', color: 'var(--text-secondary)', backdropFilter: 'blur(8px)' }}>
                <Download className="w-3 h-3" /> Save
                className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(9,9,11,0.9)', border: '1px solid var(--border-strong)', color: 'var(--text-secondary)', backdropFilter: 'blur(8px)' }}>
                <Download className="w-3 h-3" /> Save
            </button>

            <svg ref={svgRef} className="w-full h-full absolute inset-0" />

            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex gap-3 px-3 py-2 rounded-lg text-[10px] font-mono z-10"
                style={{ background: 'rgba(9,9,11,0.85)', border: '1px solid var(--border)', backdropFilter: 'blur(8px)' }}>
                {[
                    { color: COLORS.root, label: 'Node', shape: 'rect' },
                    { color: COLORS.anchor, label: 'Anchor', shape: 'rect' },
                    { color: COLORS.object, label: 'Object', shape: 'rect' },
                    { color: COLORS.edge, label: 'Edge', shape: 'circle' },
                ].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 ${item.shape === 'circle' ? 'rounded-full' : 'rounded-[2px]'}`}
                            style={{ background: item.color, opacity: 0.7 }} />
                        <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                    </div>
                ))}
            <div className="absolute bottom-3 left-3 flex gap-3 px-3 py-2 rounded-lg text-[10px] font-mono z-10"
                style={{ background: 'rgba(9,9,11,0.85)', border: '1px solid var(--border)', backdropFilter: 'blur(8px)' }}>
                {[
                    { color: COLORS.root, label: 'Node', shape: 'rect' },
                    { color: COLORS.anchor, label: 'Anchor', shape: 'rect' },
                    { color: COLORS.object, label: 'Object', shape: 'rect' },
                    { color: COLORS.edge, label: 'Edge', shape: 'circle' },
                ].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 ${item.shape === 'circle' ? 'rounded-full' : 'rounded-[2px]'}`}
                            style={{ background: item.color, opacity: 0.7 }} />
                        <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
