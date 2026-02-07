import { type ReactNode } from "react";

export interface SortConfig {
  column: string;
  direction: "asc" | "desc";
}

export interface Column<T> {
  id: string;
  header: string | ((info: { table: any; column: any }) => ReactNode) | ReactNode;
  accessor?: (row: T) => any;
  cell?: (row: T) => ReactNode;
  width?: number | string;
  minWidth?: number | string;
  sortable?: boolean;
  enableHiding?: boolean;
  align?: "left" | "center" | "right";
  sticky?: "left" | "right";
  className?: string;
}
