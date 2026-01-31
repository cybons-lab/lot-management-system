/**
 * TablesTab.tsx
 *
 * データベーステーブル一覧タブ
 */

import { Table } from "lucide-react";
import { useMemo, useState } from "react";

import { DynamicERDiagram } from "./DynamicERDiagram";
import { TABLE_GROUPS } from "./table-groups";
import type { TableGroup, TableInfo } from "./types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TablesTabProps = {
  searchTerm: string;
};

export function TablesTab({ searchTerm }: TablesTabProps) {
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return TABLE_GROUPS;

    const lower = searchTerm.toLowerCase();
    const filtered: Record<string, TableGroup> = {};

    Object.entries(TABLE_GROUPS).forEach(([key, group]) => {
      const matchedTables = group.tables.filter(
        (table) =>
          table.name.toLowerCase().includes(lower) ||
          table.label.toLowerCase().includes(lower) ||
          table.description.toLowerCase().includes(lower),
      );

      if (matchedTables.length > 0) {
        filtered[key] = { ...group, tables: matchedTables };
      }
    });

    return filtered;
  }, [searchTerm]);

  return (
    <div className="db-schema-tables">
      {Object.entries(filteredGroups).map(([key, group]) => (
        <div key={key} className="db-schema-table-group">
          <h3 className="db-schema-group-title">{group.label}</h3>
          <div className="db-schema-table-list">
            {group.tables.map((table: TableInfo) => (
              <TableCard key={table.name} table={table} onShowER={() => setSelectedTable(table)} />
            ))}
          </div>
        </div>
      ))}
      {Object.keys(filteredGroups).length === 0 && (
        <div className="db-schema-empty">
          <p>検索条件に一致するテーブルが見つかりませんでした</p>
        </div>
      )}

      <TableERDiagramModal table={selectedTable} onClose={() => setSelectedTable(null)} />
    </div>
  );
}

function TableCard({ table, onShowER }: { table: TableInfo; onShowER: () => void }) {
  return (
    <div className="db-schema-table-card">
      <div className="db-schema-table-header">
        <Table className="db-schema-table-icon" size={20} />
        <div>
          <h4>{table.label}</h4>
          <code>{table.name}</code>
        </div>
      </div>
      <p className="db-schema-table-description">{table.description}</p>
      <div className="db-schema-table-actions">
        <button type="button" className="db-schema-table-link" onClick={onShowER}>
          ER図を表示
        </button>
      </div>
    </div>
  );
}

function TableERDiagramModal({ table, onClose }: { table: TableInfo | null; onClose: () => void }) {
  return (
    <Dialog open={!!table} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] w-[1200px] h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Table size={20} className="text-indigo-600" />
            <span>
              {table?.label} ({table?.name}) - 関連ER図
            </span>
          </DialogTitle>
          <DialogDescription>
            選択されたテーブル「{table?.label}」に関連するテーブル構造を表示しています。
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 bg-slate-50 relative">
          {table && (
            <DynamicERDiagram
              targetTable={table.name}
              className="w-full h-full border-0 rounded-none"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
