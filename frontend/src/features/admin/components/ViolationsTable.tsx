/**
 * ViolationsTable - データ整合性違反の一覧テーブル
 */
import { AlertTriangle } from "lucide-react";

import { Badge, Button } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Violation {
  table_name: string;
  column_name: string;
  column_type: string;
  violation_count: number;
  sample_ids: (number | string)[];
  fixable: boolean;
  default_value: string | null;
  source: string;
}

interface ViolationsTableProps {
  violations: Violation[];
  isFixing: boolean;
  onFix: (tableName: string, columnName: string) => void;
}

export function ViolationsTable({ violations, isFixing, onFix }: ViolationsTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>テーブル</TableHead>
            <TableHead>カラム</TableHead>
            <TableHead>型</TableHead>
            <TableHead className="text-right">違反行数</TableHead>
            <TableHead>検出</TableHead>
            <TableHead>状態</TableHead>
            <TableHead>修正値</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {violations.map((v) => (
            <TableRow key={`${v.table_name}.${v.column_name}`}>
              <TableCell className="font-mono text-sm">{v.table_name}</TableCell>
              <TableCell className="font-mono text-sm">{v.column_name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{v.column_type}</TableCell>
              <TableCell className="text-right font-medium">
                <span className="text-red-600">{v.violation_count}</span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {v.source === "auto" ? "自動" : "ルール"}
                </Badge>
              </TableCell>
              <TableCell>
                {v.fixable ? (
                  <Badge className="bg-green-100 text-green-800">修正可能</Badge>
                ) : (
                  <Badge variant="secondary">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    ルール未定義
                  </Badge>
                )}
              </TableCell>
              <TableCell className="font-mono text-sm">{v.default_value ?? "-"}</TableCell>
              <TableCell>
                {v.fixable && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isFixing}
                    onClick={() => onFix(v.table_name, v.column_name)}
                  >
                    修正
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
