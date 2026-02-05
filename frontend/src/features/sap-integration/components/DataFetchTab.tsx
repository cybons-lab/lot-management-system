/* eslint-disable max-lines-per-function, complexity -- 関連する画面ロジックを1箇所で管理するため */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  clearCache,
  fetchMaterials,
  getSapCache,
  listConnections,
  type SapCacheItem,
} from "../api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/base/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/form/checkbox";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DEFAULT_COLUMNS = [
  { key: "zkdmat_b", label: "先方品番" },
  { key: "zmkmat_b", label: "メーカー品番" },
  { key: "meins", label: "数量単位" },
  { key: "kunnr", label: "得意先" },
  { key: "zlifnr_h", label: "仕入先" },
  { key: "zotwarh_h", label: "出荷倉庫" },
  { key: "zdepnm_s_h", label: "納入場所" },
  { key: "zshipte_h", label: "出荷票テキスト" },
] as const;

export function DataFetchTab() {
  const queryClient = useQueryClient();
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [kunnrFilter, setKunnrFilter] = useState("100427105");
  const [selectedItem, setSelectedItem] = useState<SapCacheItem | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 50; // Fixed page size
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS.map((c) => c.key));

  const { data: connections = [] } = useQuery({
    queryKey: ["sap-connections"],
    queryFn: () => listConnections(true),
  });

  const { data: cacheData, isLoading: isCacheLoading } = useQuery({
    queryKey: [
      "sap-cache-paginated",
      selectedConnectionId,
      kunnrFilter,
      page,
      pageSize,
      searchTerm,
    ],
    queryFn: () =>
      getSapCache({
        connection_id: selectedConnectionId,
        kunnr: kunnrFilter || undefined,
        zkdmat_b_search: searchTerm || undefined,
        page,
        page_size: pageSize,
      }),
  });

  const fetchMutation = useMutation({
    mutationFn: fetchMaterials,
    onSuccess: (result) => {
      if (result.success) {
        const deletedInfo = result.deleted_count > 0 ? `、${result.deleted_count}件削除` : "";
        toast.success(
          `データ取得完了: ${result.record_count}件取得、${result.cached_count}件キャッシュ${deletedInfo} (${result.duration_ms}ms)`,
        );
        queryClient.invalidateQueries({ queryKey: ["sap-cache-paginated"] });
        setPage(1); // Reset to first page
      } else {
        toast.error(`取得エラー: ${result.error_message}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`取得エラー: ${error.message}`);
    },
  });

  const clearMutation = useMutation({
    mutationFn: clearCache,
    onSuccess: (result) => {
      toast.success(`キャッシュクリア完了: ${result.deleted_count}件削除`);
      queryClient.invalidateQueries({ queryKey: ["sap-cache-paginated"] });
      setPage(1);
    },
    onError: (error: Error) => {
      toast.error(`クリアエラー: ${error.message}`);
    },
  });

  const handleFetch = () => {
    fetchMutation.mutate({
      connection_id: selectedConnectionId,
      kunnr_f: kunnrFilter || undefined,
      kunnr_t: kunnrFilter || undefined,
    });
  };

  const handleClearCache = () => {
    if (confirm("キャッシュをクリアしますか？")) {
      clearMutation.mutate({
        connection_id: selectedConnectionId,
        kunnr: kunnrFilter || undefined,
      });
    }
  };

  const handleColumnToggle = (columnKey: string, checked: boolean) => {
    if (checked) {
      setVisibleColumns([...visibleColumns, columnKey]);
    } else {
      setVisibleColumns(visibleColumns.filter((k) => k !== columnKey));
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page on search
  };

  const getCellValue = (item: SapCacheItem, key: string): string => {
    const value = item[key as keyof SapCacheItem];
    if (value === null || value === undefined) return "-";
    if (typeof value === "string") return value;
    return String(value);
  };

  const visibleColumnsData = DEFAULT_COLUMNS.filter((col) => visibleColumns.includes(col.key));

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, cacheData?.total || 0);

  return (
    <div className="space-y-6">
      {/* Fetch Controls */}
      <Card>
        <CardHeader>
          <CardTitle>SAPデータ取得</CardTitle>
          <CardDescription>
            Z_SCM1_RFC_MATERIAL_DOWNLOAD を呼び出してマテリアルデータを取得します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label>接続</Label>
              <Select
                value={selectedConnectionId?.toString() ?? "default"}
                onValueChange={(v) => setSelectedConnectionId(v === "default" ? null : parseInt(v))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="デフォルト" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">デフォルト</SelectItem>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id.toString()}>
                      {conn.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>得意先コード</Label>
              <Input
                className="w-40"
                value={kunnrFilter}
                onChange={(e) => setKunnrFilter(e.target.value)}
                placeholder="100427105"
              />
            </div>

            <Button onClick={handleFetch} disabled={fetchMutation.isPending}>
              {fetchMutation.isPending ? "取得中..." : "SAPから取得"}
            </Button>

            <Button variant="outline" onClick={handleClearCache} disabled={clearMutation.isPending}>
              キャッシュクリア
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cache List with Pagination */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>キャッシュデータ ({cacheData?.total?.toLocaleString() || 0}件)</CardTitle>
              <CardDescription>SAPから取得してキャッシュされたマテリアルデータ</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="先方品番で検索"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-64"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings2 className="mr-2 h-4 w-4" />
                    カラム選択
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">表示カラムを選択</p>
                    {DEFAULT_COLUMNS.map((col) => (
                      <div key={col.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={col.key}
                          checked={visibleColumns.includes(col.key)}
                          onCheckedChange={(checked) =>
                            handleColumnToggle(col.key, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={col.key}
                          className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {col.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isCacheLoading ? (
            <div className="py-4 text-center">読み込み中...</div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4">
                {/* Table */}
                <div className="max-h-96 flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {visibleColumnsData.map((col) => (
                          <TableHead key={col.key}>{col.label}</TableHead>
                        ))}
                        <TableHead>取得日時</TableHead>
                        <TableHead>バッチID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!cacheData || cacheData.items.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={visibleColumnsData.length + 2}
                            className="py-8 text-center text-muted-foreground"
                          >
                            キャッシュデータがありません
                          </TableCell>
                        </TableRow>
                      ) : (
                        cacheData.items.map((item, idx) => (
                          <TableRow
                            key={`${item.zkdmat_b}-${item.kunnr}-${idx}`}
                            className={`cursor-pointer hover:bg-muted/50 ${
                              selectedItem?.zkdmat_b === item.zkdmat_b &&
                              selectedItem?.kunnr === item.kunnr
                                ? "bg-muted"
                                : ""
                            }`}
                            onClick={() => setSelectedItem(item)}
                          >
                            {visibleColumnsData.map((col) => (
                              <TableCell
                                key={col.key}
                                className={col.key === "zkdmat_b" ? "font-mono" : ""}
                              >
                                {getCellValue(item, col.key)}
                              </TableCell>
                            ))}
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(item.fetched_at).toLocaleString("ja-JP")}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {item.fetch_batch_id?.slice(0, 8) || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Detail Panel */}
                {selectedItem && (
                  <div className="w-96 overflow-auto rounded-lg border bg-muted/20 p-4">
                    <h3 className="mb-2 font-semibold">raw_data</h3>
                    <pre className="max-h-80 overflow-auto text-xs">
                      {JSON.stringify(selectedItem.raw_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {cacheData && cacheData.total > 0 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-sm text-muted-foreground">
                    全 {cacheData.total.toLocaleString()} 件中 {startItem.toLocaleString()} -{" "}
                    {endItem.toLocaleString()} 件表示
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      前へ
                    </Button>
                    <span className="text-sm">
                      ページ {page} / {cacheData.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= cacheData.total_pages}
                      onClick={() => setPage(page + 1)}
                    >
                      次へ
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SAP Fields Reference */}
      <Card>
        <CardHeader>
          <CardTitle>SAPフィールド参照</CardTitle>
          <CardDescription>ET_DATA の主要フィールド</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              { field: "ZKDMAT_B", label: "先方品番" },
              { field: "ZMKMAT_B", label: "メーカー品番" },
              { field: "MEINS", label: "数量単位" },
              { field: "ZKUNNR_H", label: "得意先コード" },
              { field: "ZLIFNR_H", label: "仕入先コード" },
              { field: "ZOTWARH_H", label: "出荷倉庫" },
              { field: "ZDEPNM_S_H", label: "納入場所" },
              { field: "ZREMAKTE_H", label: "備考" },
              { field: "ZSHIPTE_H", label: "出荷票テキスト" },
            ].map(({ field, label }) => (
              <Badge key={field} variant="outline" className="font-mono">
                {field}: {label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
