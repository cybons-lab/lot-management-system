import * as d3 from "d3";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

import graphData from "@/data/graph.json";
import type {
  GraphData,
  GraphEdge,
  GraphEdgeType,
  GraphNode,
  GraphNodeType,
} from "@/features/help/types/flowMap";

import "./FlowMapHelpPage.css";

const typedGraph = graphData as GraphData;

const NODE_DIMENSIONS: Record<Exclude<GraphNodeType, "domain">, { width: number; height: number }>
= {
  screen: { width: 140, height: 56 },
  process: { width: 140, height: 50 },
  data: { width: 130, height: 52 },
  external: { width: 150, height: 56 },
};

const NODE_COLORS: Record<Exclude<GraphNodeType, "domain">, { fill: string; stroke: string }>
= {
  screen: { fill: "#e0f2fe", stroke: "#38bdf8" },
  process: { fill: "#ede9fe", stroke: "#8b5cf6" },
  data: { fill: "#dcfce7", stroke: "#22c55e" },
  external: { fill: "#fff7ed", stroke: "#fb923c" },
};

const EDGE_COLORS: Record<GraphEdgeType, string> = {
  flow: "#2563eb",
  data: "#16a34a",
  exception: "#dc2626",
};

const IMPORTANCE_LEVELS: Array<1 | 2 | 3> = [1, 2, 3];
const NODE_TYPES: GraphNodeType[] = ["domain", "screen", "process", "data", "external"];

const getNodeDimensions = (type: GraphNodeType) => {
  if (type === "domain") {
    return { width: 0, height: 0 };
  }
  return NODE_DIMENSIONS[type];
};

const getNodeRadius = (type: GraphNodeType) => {
  if (type === "screen") return 12;
  if (type === "process") return 8;
  if (type === "data") return 6;
  if (type === "external") return 18;
  return 0;
};

const centerTransform = (
  svg: SVGSVGElement,
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
  transform: d3.ZoomTransform,
  target: { x: number; y: number },
) => {
  const rect = svg.getBoundingClientRect();
  const nextTransform = d3
    .zoomIdentity
    .translate(rect.width / 2 - target.x * transform.k, rect.height / 2 - target.y * transform.k)
    .scale(transform.k);
  d3.select(svg).transition().duration(300).call(zoom.transform, nextTransform);
};

export function FlowMapHelpPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTypes, setActiveTypes] = useState<Record<GraphNodeType, boolean>>({
    domain: true,
    screen: true,
    process: true,
    data: true,
    external: true,
  });
  const [activeImportance, setActiveImportance] = useState<Record<1 | 2 | 3, boolean>>({
    1: true,
    2: true,
    3: true,
  });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2.5])
      .on("zoom", (event) => {
        setTransform(event.transform);
      });

    d3.select(svg).call(zoom);
    zoomRef.current = zoom;

    return () => {
      d3.select(svg).on(".zoom", null);
    };
  }, []);

  const nodeMap = useMemo(() => new Map(typedGraph.nodes.map((node) => [node.id, node])), []);

  const filteredNodes = useMemo(() => {
    return typedGraph.nodes.filter((node) => {
      const importance = node.importance ?? 2;
      return activeTypes[node.type] && activeImportance[importance];
    });
  }, [activeTypes, activeImportance]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return typedGraph.edges.filter(
      (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target),
    );
  }, [filteredNodeIds]);

  const visibleDomains = useMemo(() => {
    if (!activeTypes.domain) return [];
    return typedGraph.domains.filter((domain) =>
      filteredNodes.some((node) => node.domainId === domain.id),
    );
  }, [activeTypes.domain, filteredNodes]);

  const matchingNodeIds = useMemo(() => {
    if (!searchTerm.trim()) return new Set<string>();
    const lower = searchTerm.trim().toLowerCase();
    return new Set(
      typedGraph.nodes
        .filter((node) => node.label.toLowerCase().includes(lower))
        .map((node) => node.id),
    );
  }, [searchTerm]);

  const handleSearch = useCallback(() => {
    const lower = searchTerm.trim().toLowerCase();
    if (!lower) return;
    const match = typedGraph.nodes.find((node) => node.label.toLowerCase().includes(lower));
    if (!match) return;
    setSelectedNodeId(match.id);
    setSelectedEdgeId(null);
    if (svgRef.current && zoomRef.current) {
      centerTransform(svgRef.current, zoomRef.current, transform, match);
    }
  }, [searchTerm, transform]);

  const handleReset = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSearchTerm("");
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, []);

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  };

  const handleEdgeClick = (edge: GraphEdge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  };

  const selectedNode = typedGraph.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedEdge = typedGraph.edges.find((edge) => edge.id === selectedEdgeId) ?? null;

  const getNodePosition = (node: GraphNode) => {
    const { width, height } = getNodeDimensions(node.type);
    return {
      x: node.x - width / 2,
      y: node.y - height / 2,
      width,
      height,
    };
  };

  const onSvgClick = (event: MouseEvent<SVGSVGElement>) => {
    if (event.target === event.currentTarget) {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  };

  return (
    <div className="flow-map-page">
      <div className="flow-map-toolbar">
        <div className="toolbar-group">
          <strong>検索</strong>
          <input
            type="text"
            placeholder="ノード名で検索"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSearch();
            }}
          />
          <button type="button" onClick={handleSearch}>
            センタリング
          </button>
        </div>
        <div className="toolbar-group">
          <strong>カテゴリ</strong>
          {NODE_TYPES.map((type) => (
            <label key={type}>
              <input
                type="checkbox"
                checked={activeTypes[type]}
                onChange={(event) =>
                  setActiveTypes((prev) => ({ ...prev, [type]: event.target.checked }))
                }
              />
              {type}
            </label>
          ))}
        </div>
        <div className="toolbar-group">
          <strong>重要度</strong>
          {IMPORTANCE_LEVELS.map((level) => (
            <label key={level}>
              <input
                type="checkbox"
                checked={activeImportance[level]}
                onChange={(event) =>
                  setActiveImportance((prev) => ({ ...prev, [level]: event.target.checked }))
                }
              />
              {level}
            </label>
          ))}
        </div>
        <button type="button" onClick={handleReset}>
          リセット
        </button>
      </div>

      <div className="flow-map-layout">
        <div className="flow-map-canvas">
          <svg ref={svgRef} onClick={onSvgClick}>
            <defs>
              {Object.entries(EDGE_COLORS).map(([type, color]) => (
                <marker
                  key={type}
                  id={`arrow-${type}`}
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                </marker>
              ))}
            </defs>
            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
              {visibleDomains.map((domain) => (
                <g key={domain.id}>
                  <rect
                    className="flow-map-domain"
                    x={domain.x}
                    y={domain.y}
                    width={domain.w}
                    height={domain.h}
                    rx={18}
                  />
                  <text className="flow-map-domain-label" x={domain.x + 16} y={domain.y + 24}>
                    {domain.label}
                  </text>
                </g>
              ))}

              {filteredEdges.map((edge) => {
                const source = nodeMap.get(edge.source);
                const target = nodeMap.get(edge.target);
                if (!source || !target) return null;
                const color = EDGE_COLORS[edge.type];
                const midX = (source.x + target.x) / 2;
                const midY = (source.y + target.y) / 2;
                return (
                  <g key={edge.id}>
                    <path
                      d={`M ${source.x} ${source.y} L ${target.x} ${target.y}`}
                      stroke={color}
                      strokeWidth={2}
                      fill="none"
                      markerEnd={`url(#arrow-${edge.type})`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEdgeClick(edge);
                      }}
                      style={{ cursor: "pointer" }}
                    />
                    {edge.label && (
                      <text className="flow-map-edge-label" x={midX + 4} y={midY - 6}>
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {filteredNodes.map((node) => {
                if (node.type === "domain") return null;
                const { x, y, width, height } = getNodePosition(node);
                const { fill, stroke } = NODE_COLORS[node.type];
                const isSelected = node.id === selectedNodeId;
                const isMatch = matchingNodeIds.has(node.id);
                return (
                  <g
                    key={node.id}
                    className="flow-map-node hoverable"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleNodeClick(node);
                    }}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      rx={getNodeRadius(node.type)}
                      fill={fill}
                      stroke={isSelected || isMatch ? "#0f172a" : stroke}
                      strokeWidth={isSelected || isMatch ? 3 : 1.5}
                      className={isSelected ? "flow-map-node selected" : "flow-map-node"}
                    >
                      <title>{node.description ?? node.label}</title>
                    </rect>
                    <text className="flow-map-label" x={node.x} y={node.y + 4} textAnchor="middle">
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <aside className="flow-map-sidepanel">
          <h2>詳細</h2>
          <div className="flow-map-legend">
            {Object.entries(NODE_COLORS).map(([type, style]) => (
              <span key={type}>
                <i className="flow-map-dot" style={{ background: style.fill }} />
                {type}
              </span>
            ))}
            <span>
              <i className="flow-map-dot" style={{ background: EDGE_COLORS.flow }} /> flow
            </span>
            <span>
              <i className="flow-map-dot" style={{ background: EDGE_COLORS.data }} /> data
            </span>
            <span>
              <i className="flow-map-dot" style={{ background: EDGE_COLORS.exception }} /> exception
            </span>
          </div>

          {!selectedNode && !selectedEdge && (
            <p className="flow-map-selection-empty">
              ノードをクリックすると詳細が表示されます。
            </p>
          )}

          {selectedNode && (
            <>
              <section>
                <h3>{selectedNode.label}</h3>
                <div className="flow-map-badge">type: {selectedNode.type}</div>
                <div className="flow-map-badge">
                  importance: {selectedNode.importance ?? 2}
                </div>
                <p>{selectedNode.description ?? "説明は準備中です。"}</p>
              </section>
              {selectedNode.inputs && selectedNode.inputs.length > 0 && (
                <section>
                  <h4>Inputs</h4>
                  <ul>
                    {selectedNode.inputs.map((input) => (
                      <li key={input}>{input}</li>
                    ))}
                  </ul>
                </section>
              )}
              {selectedNode.outputs && selectedNode.outputs.length > 0 && (
                <section>
                  <h4>Outputs</h4>
                  <ul>
                    {selectedNode.outputs.map((output) => (
                      <li key={output}>{output}</li>
                    ))}
                  </ul>
                </section>
              )}
              {selectedNode.links && selectedNode.links.length > 0 && (
                <section>
                  <h4>Related Links</h4>
                  <ul>
                    {selectedNode.links.map((link) => (
                      <li key={link}>{link}</li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          {selectedEdge && (
            <section>
              <h3>{selectedEdge.label ?? selectedEdge.id}</h3>
              <div className="flow-map-badge">type: {selectedEdge.type}</div>
              <p>{selectedEdge.description ?? "エッジの説明は準備中です。"}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
