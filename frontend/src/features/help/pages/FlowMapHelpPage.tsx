/**
 * FlowMapHelpPage.tsx
 *
 * 業務フロー可視化ヘルプページ
 * 一般事務員向けに「仕事の流れ」を分かりやすく表示
 */

import { ArrowRight, MousePointerClick } from "lucide-react";
import { useState, useMemo } from "react";

import graphData from "@/data/graph.json";
import type { FlowData, FlowNode, FlowNodeType, FlowType } from "@/features/help/types/flowMap";

import "./FlowMapHelpPage.css";

const flowData = graphData as FlowData;

type TabType = "flow" | "exceptions" | "terms";

const NODE_TYPE_CONFIG: Record<FlowNodeType, { icon: string; label: string }> = {
  input: { icon: "✏️", label: "入力" },
  confirm: { icon: "👁️", label: "確認" },
  register: { icon: "✓", label: "登録" },
  print: { icon: "🖨️", label: "出力" },
  complete: { icon: "🎉", label: "完了" },
};

const FLOW_TYPE_CONFIG: Record<FlowType, { label: string; color: string }> = {
  order: { label: "受注", color: "#3b82f6" },
  allocation: { label: "引当", color: "#8b5cf6" },
  shipment: { label: "出荷", color: "#22c55e" },
};

// ─────────────────────────────────────────────
// サブコンポーネント
// ─────────────────────────────────────────────

function FlowNodeComponent({
  node,
  isSelected,
  isHighlight,
  onClick,
}: {
  node: FlowNode;
  isSelected: boolean;
  isHighlight: boolean;
  onClick: () => void;
}) {
  const config = NODE_TYPE_CONFIG[node.type];

  return (
    <button
      type="button"
      className={`flow-node type-${node.type} ${isSelected ? "selected" : ""} ${isHighlight ? "highlight" : ""}`}
      onClick={onClick}
    >
      <div className="flow-node-icon">{config.icon}</div>
      <div className="flow-node-label">{node.label}</div>
    </button>
  );
}

function FlowEdgeComponent({ label }: { label?: string }) {
  return (
    <div className="flow-edge">
      <div className="flow-edge-line">
        {label && <span className="flow-edge-label">{label}</span>}
      </div>
    </div>
  );
}

function DetailPanel({
  node,
}: {
  node: FlowNode | null;
}) {
  if (!node) {
    return (
      <div className="flow-help-detail">
        <div className="flow-help-detail-empty">
          <MousePointerClick />
          <p>ノードをクリックすると<br />詳細が表示されます</p>
        </div>
      </div>
    );
  }

  const config = NODE_TYPE_CONFIG[node.type];

  return (
    <div className="flow-help-detail">
      <div className="flow-help-detail-content">
        <div className="flow-help-detail-header">
          <div className={`flow-help-detail-icon flow-node-icon type-${node.type}`} style={{
            background: node.type === "input" ? "#dbeafe" :
                       node.type === "confirm" ? "#dcfce7" :
                       node.type === "register" ? "#f3e8ff" :
                       node.type === "print" ? "#ffedd5" : "#f1f5f9"
          }}>
            {config.icon}
          </div>
          <h3 className="flow-help-detail-title">{node.label}</h3>
        </div>

        <div className="flow-help-detail-section">
          <h4>何をする？</h4>
          <p>{node.description}</p>
        </div>

        {node.commonMistakes && node.commonMistakes.length > 0 && (
          <div className="flow-help-detail-section">
            <h4>よくあるミス</h4>
            <ul>
              {node.commonMistakes.map((mistake, i) => (
                <li key={i}>{mistake}</li>
              ))}
            </ul>
          </div>
        )}

        {node.nextAction && (
          <div className="flow-help-detail-section">
            <h4>次にやること</h4>
            <button type="button" className="flow-help-detail-action">
              <ArrowRight size={16} />
              {node.nextAction.label}
            </button>
          </div>
        )}

        {node.relatedExceptions && node.relatedExceptions.length > 0 && (
          <div className="flow-help-detail-section">
            <h4>関連する例外</h4>
            <div>
              {node.relatedExceptions.map((ex, i) => (
                <span key={i} className="flow-help-detail-exception">{ex}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FlowTab({
  nodes,
  edges,
  selectedNodeId,
  highlightNodeIds,
  onNodeClick,
}: {
  nodes: FlowNode[];
  edges: FlowData["edges"];
  selectedNodeId: string | null;
  highlightNodeIds: Set<string>;
  onNodeClick: (node: FlowNode) => void;
}) {
  // フロータイプごとにグループ化
  const flowGroups = useMemo(() => {
    const groups: Record<FlowType, FlowNode[]> = {
      order: [],
      allocation: [],
      shipment: [],
    };

    nodes.forEach((node) => {
      if (groups[node.flowType]) {
        groups[node.flowType].push(node);
      }
    });

    // order でソート
    Object.values(groups).forEach((group) => {
      group.sort((a, b) => a.order - b.order);
    });

    return groups;
  }, [nodes]);

  const renderFlowLine = (flowNodes: FlowNode[], flowType: FlowType) => {
    if (flowNodes.length === 0) return null;

    return (
      <div className="flow-section" key={flowType}>
        <h3 className="flow-section-title" style={{ borderColor: FLOW_TYPE_CONFIG[flowType].color }}>
          {FLOW_TYPE_CONFIG[flowType].label}
        </h3>
        <div className="flow-line">
          {flowNodes.map((node, index) => {
            const edge = edges.find((e) => e.source === node.id);
            return (
              <div key={node.id} style={{ display: "flex", alignItems: "center" }}>
                <FlowNodeComponent
                  node={node}
                  isSelected={node.id === selectedNodeId}
                  isHighlight={highlightNodeIds.has(node.id)}
                  onClick={() => onNodeClick(node)}
                />
                {index < flowNodes.length - 1 && <FlowEdgeComponent label={edge?.label} />}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flow-container">
      {renderFlowLine(flowGroups.order, "order")}
      {renderFlowLine(flowGroups.allocation, "allocation")}
      {renderFlowLine(flowGroups.shipment, "shipment")}
    </div>
  );
}

function ExceptionsTab({ exceptions }: { exceptions: FlowData["exceptions"] }) {
  return (
    <div className="flow-exceptions">
      {exceptions.map((ex) => (
        <div key={ex.id} className="flow-exception-card">
          <h3>{ex.title}</h3>
          <p className="flow-exception-trigger">
            <strong>発生条件：</strong>{ex.trigger}
          </p>
          <ol className="flow-exception-steps">
            {ex.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

function TermsTab({ terms }: { terms: FlowData["terms"] }) {
  return (
    <div className="flow-terms">
      <dl>
        {terms.map((term) => (
          <div key={term.term} className="flow-term-card">
            <dt>{term.term}</dt>
            <dd>{term.definition}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ─────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────

export function FlowMapHelpPage() {
  const [activeTab, setActiveTab] = useState<TabType>("flow");
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const highlightNodeIds = useMemo(() => {
    if (!searchTerm.trim()) return new Set<string>();
    const lower = searchTerm.toLowerCase();
    return new Set(
      flowData.nodes
        .filter((n) => n.label.toLowerCase().includes(lower))
        .map((n) => n.id)
    );
  }, [searchTerm]);

  const handleNodeClick = (node: FlowNode) => {
    setSelectedNode(node);
  };

  return (
    <div className="flow-help-page">
      <header className="flow-help-header">
        <h1>業務フローガイド</h1>
        <p>仕事の流れと、迷った時の次の行動を確認できます</p>
      </header>

      <div className="flow-help-tabs">
        <button
          type="button"
          className={`flow-help-tab ${activeTab === "flow" ? "active" : ""}`}
          onClick={() => setActiveTab("flow")}
        >
          通常の流れ
        </button>
        <button
          type="button"
          className={`flow-help-tab ${activeTab === "exceptions" ? "active" : ""}`}
          onClick={() => setActiveTab("exceptions")}
        >
          よくある例外
        </button>
        <button
          type="button"
          className={`flow-help-tab ${activeTab === "terms" ? "active" : ""}`}
          onClick={() => setActiveTab("terms")}
        >
          用語・ルール
        </button>
      </div>

      {activeTab === "flow" && (
        <div className="flow-help-search">
          <input
            type="text"
            placeholder="画面名・作業名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      <div className="flow-help-content">
        <div className="flow-help-canvas">
          {activeTab === "flow" && (
            <FlowTab
              nodes={flowData.nodes}
              edges={flowData.edges}
              selectedNodeId={selectedNode?.id ?? null}
              highlightNodeIds={highlightNodeIds}
              onNodeClick={handleNodeClick}
            />
          )}
          {activeTab === "exceptions" && (
            <ExceptionsTab exceptions={flowData.exceptions} />
          )}
          {activeTab === "terms" && (
            <TermsTab terms={flowData.terms} />
          )}
        </div>

        {activeTab === "flow" && (
          <DetailPanel node={selectedNode} />
        )}
      </div>
    </div>
  );
}
