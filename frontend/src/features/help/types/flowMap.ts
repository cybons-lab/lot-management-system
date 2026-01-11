export type GraphNodeType = "domain" | "screen" | "process" | "data" | "external";
export type GraphEdgeType = "flow" | "data" | "exception";

export type GraphDomain = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  description?: string;
};

export type GraphNode = {
  id: string;
  type: GraphNodeType;
  label: string;
  x: number;
  y: number;
  domainId?: string;
  importance?: 1 | 2 | 3;
  description?: string;
  inputs?: string[];
  outputs?: string[];
  links?: string[];
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  label?: string;
  description?: string;
};

export type GraphData = {
  domains: GraphDomain[];
  nodes: GraphNode[];
  edges: GraphEdge[];
};
