// Widen some third-party component props expected by pages
declare module "@/components/shared/data" {
  export type SortConfig = { column: string | null; direction: "asc" | "desc" };
  export type TablePaginationProps = {
    page?: number;
    pageSize?: number;
    totalItems: number;
    totalPages: number;
    onPageChange: (p: number) => void;
    onPageSizeChange: (s: number) => void;
  };
  export type FilterPanelProps = {
    title: string;
    onReset: () => void;
    children?: React.ReactNode;
    activeCount?: number;
  };
}
