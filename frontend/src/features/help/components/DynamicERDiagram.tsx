/**
 * DynamicERDiagram.tsx
 *
 * 動的にER図を生成・表示するコンポーネント (React Flow)
 */

import "@xyflow/react/dist/style.css";
import {
  ReactFlow,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Position,
  Handle,
} from "@xyflow/react";
import type { Connection, Edge, Node } from "@xyflow/react";
import dagre from "dagre";
import { useEffect, useState, useCallback } from "react";

import httpClient from "@/shared/api/http-client";

interface TableData extends Record<string, unknown> {
  name: string;
  comment: string;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    primary_key: boolean;
    foreign_key: { table: string; column: string } | null;
    comment: string;
  }[];
}

// --- Custom Table Node Component ---

const TableNode = ({ data }: { data: TableData }) => {
  return (
    <div className="min-w-[200px] overflow-hidden rounded-lg border-2 border-slate-300 bg-white shadow-xl transition-shadow hover:shadow-2xl">
      {/* Header */}
      <div className="bg-indigo-600 px-3 py-2 text-white">
        <div className="text-[10px] font-medium uppercase tracking-wider opacity-80">
          {data.name}
        </div>
        <div className="truncate font-bold">{data.comment || data.name}</div>
      </div>

      {/* Columns */}
      <div className="bg-slate-50 p-0">
        <table className="w-full text-left text-xs border-collapse">
          <tbody>
            {data.columns.map((col, idx) => (
              <tr
                key={idx}
                className="border-b border-slate-200 last:border-0 hover:bg-white transition-colors group"
              >
                <td className="px-3 py-1.5 font-mono text-slate-700">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-1.5 font-bold">
                      {col.primary_key && <span title="Primary Key">🔑</span>}
                      {col.name}
                    </span>
                    {col.comment && (
                      <span className="text-[9px] text-slate-400 font-sans leading-tight">
                        {col.comment}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-slate-400 font-mono text-[10px] uppercase text-right align-top pt-2">
                  {col.type}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Handles for connections */}
      {/* 簡易的にトップとボトムにハンドルを配置。数が多い場合はサイドに散らすことも可能 */}
      <Handle type="target" position={Position.Top} className="!bg-indigo-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-400 !w-3 !h-3" />
    </div>
  );
};

const nodeTypes = {
  table: TableNode,
};

// --- Layout Utilities ---

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 250;
const nodeHeight = 300; // およその高さ、実際はカラム数で変動する

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = "TB") => {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // カスタムノードのサイズを指定（概算）
    const tableData = node.data as unknown as TableData;
    const height = 60 + (tableData.columns?.length || 0) * 25;
    dagreGraph.setNode(node.id, { width: nodeWidth, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)!;
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

// --- Main Component ---

// --- Conversion & Filtering Utilities ---

function getFilteredTables(tables: TableData[], targetTable?: string): TableData[] {
  if (!targetTable) return tables;

  const visibleTableNames = new Set<string>([targetTable]);

  tables.forEach((table) => {
    // Outbound
    if (table.name === targetTable) {
      table.columns.forEach((col) => {
        if (col.foreign_key) visibleTableNames.add(col.foreign_key.table);
      });
    }
    // Inbound
    table.columns.forEach((col) => {
      if (col.foreign_key?.table === targetTable) {
        visibleTableNames.add(table.name);
      }
    });
  });

  return tables.filter((t) => visibleTableNames.has(t.name));
}

function createNodesAndEdges(
  tables: TableData[],
  filteredTables: TableData[],
  targetTable?: string,
) {
  const nodes: Node[] = filteredTables.map((table) => ({
    id: table.name,
    type: "table",
    data: table,
    position: { x: 0, y: 0 },
    style: targetTable === table.name ? { border: "3px solid #6366f1" } : {},
  }));

  const edges: Edge[] = [];
  tables.forEach((table) => {
    table.columns.forEach((column) => {
      if (!column.foreign_key) return;

      const source = column.foreign_key.table;
      const target = table.name;

      // Only add edge if both nodes are visible
      if (
        filteredTables.some((t) => t.name === source) &&
        filteredTables.some((t) => t.name === target)
      ) {
        edges.push({
          id: `e-${source}-${target}-${column.name}`,
          source,
          target,
          label: column.name,
          type: "smoothstep",
          animated: targetTable === source || targetTable === target,
          style: { stroke: "#6366f1", strokeWidth: 2 },
          labelStyle: { fontSize: 10, fill: "#4b5563", fontWeight: 500 },
          labelShowBg: true,
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
          labelBgStyle: { fill: "#f1f5f9", fillOpacity: 0.8 },
        });
      }
    });
  });

  return { nodes, edges };
}

// --- Main Component ---

interface DynamicERDiagramProps {
  className?: string;
  targetTable?: string;
}

export function DynamicERDiagram({ className, targetTable }: DynamicERDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  useEffect(() => {
    async function fetchSchema() {
      try {
        setLoading(true);
        const response = await httpClient.get("schema/tables").json<{ tables: TableData[] }>();
        const filtered = getFilteredTables(response.tables, targetTable);
        const { nodes: initialNodes, edges: initialEdges } = createNodesAndEdges(
          response.tables,
          filtered,
          targetTable,
        );

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          initialNodes,
          initialEdges,
        );
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setError(null);
      } catch {
        setError("スキーマの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    }
    fetchSchema();
  }, [setNodes, setEdges, targetTable]);

  const onLayout = useCallback(
    (direction: string) => {
      const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges, direction);
      setNodes([...ln]);
      setEdges([...le]);
    },
    [nodes, edges, setNodes, setEdges],
  );

  if (loading) return <LoadingState {...(className ? { className } : {})} />;
  if (error) return <ErrorState {...(className ? { className } : {})} error={error} />;

  return (
    <div className={`${className} relative er-diagram-wrapper`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls />
        <MiniMap zoomable pannable nodeColor="#e2e8f0" nodeStrokeColor="#cbd5e1" />
        <LayoutPanel onLayout={onLayout} />
      </ReactFlow>
      <DiagramLegend />
    </div>
  );
}

// --- Internal Sub-components ---

function LoadingState({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center justify-center h-[600px] bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <p className="text-slate-500 animate-pulse font-medium">ER図を読み込み中...</p>
      </div>
    </div>
  );
}

function ErrorState({ className, error }: { className?: string; error: string }) {
  return (
    <div className={className}>
      <div className="flex items-center justify-center h-[600px] bg-red-50 rounded-lg border-2 border-dashed border-red-200">
        <p className="text-red-500 font-medium">{error}</p>
      </div>
    </div>
  );
}

function LayoutPanel({ onLayout }: { onLayout: (dir: string) => void }) {
  return (
    <Panel position="top-right" className="flex gap-2">
      <button
        onClick={() => onLayout("TB")}
        className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        Vertical Layout
      </button>
      <button
        onClick={() => onLayout("LR")}
        className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        Horizontal Layout
      </button>
    </Panel>
  );
}

function DiagramLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
      <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-sm text-[11px] text-slate-500">
        <div className="font-bold text-slate-700 mb-1">ER Diagram Controls</div>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Scroll to Zoom</li>
          <li>Right Click / Space + Drag to Pan</li>
          <li>Drag table title to Move</li>
        </ul>
      </div>
    </div>
  );
}
