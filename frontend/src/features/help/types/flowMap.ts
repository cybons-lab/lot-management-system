/**
 * フローマップ型定義
 * 一般事務員向けの業務フロー可視化用
 */

/** ノードの種別（業務用語） */
export type FlowNodeType = "input" | "confirm" | "register" | "print" | "complete";

/** フローの種別 */
export type FlowType = "order" | "allocation" | "shipment";

/** ノード定義 */
export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  flowType: FlowType;
  /** 何をする？（1〜2行） */
  description: string;
  /** よくあるミス（箇条書き3つまで） */
  commonMistakes?: string[];
  /** 次にやること */
  nextAction?: {
    label: string;
    href?: string;
  };
  /** 関連する例外 */
  relatedExceptions?: string[];
  /** X座標（左→右の順序） */
  order: number;
}

/** エッジ定義 */
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  /** 例外フローかどうか */
  isException?: boolean;
}

/** 例外フロー定義 */
export interface ExceptionFlow {
  id: string;
  title: string;
  description: string;
  trigger: string;
  steps: string[];
}

/** 用語定義 */
export interface TermDefinition {
  term: string;
  definition: string;
  relatedNodes?: string[];
}

/** フローデータ全体 */
export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  exceptions: ExceptionFlow[];
  terms: TermDefinition[];
}
