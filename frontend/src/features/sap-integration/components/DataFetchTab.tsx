/* eslint-disable max-lines-per-function */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  clearCache,
  fetchMaterials,
  listCachedMaterials,
  listConnections,
  type SapMaterialCache,
} from "../api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/base/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DataFetchTab() {
  const queryClient = useQueryClient();
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [kunnrFilter, setKunnrFilter] = useState("100427105");
  const [selectedItem, setSelectedItem] = useState<SapMaterialCache | null>(null);

  const { data: connections = [] } = useQuery({
    queryKey: ["sap-connections"],
    queryFn: () => listConnections(true),
  });

  const { data: cachedMaterials = [], isLoading: isCacheLoading } = useQuery({
    queryKey: ["sap-cache", selectedConnectionId, kunnrFilter],
    queryFn: () =>
      listCachedMaterials({
        connection_id: selectedConnectionId,
        kunnr: kunnrFilter || undefined,
        limit: 200,
      }),
  });

  const fetchMutation = useMutation({
    mutationFn: fetchMaterials,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(
          `データ取得完了: ${result.record_count}件取得、${result.cached_count}件キャッシュ (${result.duration_ms}ms)`,
        );
        queryClient.invalidateQueries({ queryKey: ["sap-cache"] });
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
      queryClient.invalidateQueries({ queryKey: ["sap-cache"] });
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

      {/* Cache List */}
      <Card>
        <CardHeader>
          <CardTitle>キャッシュデータ ({cachedMaterials.length}件)</CardTitle>
          <CardDescription>SAPから取得してキャッシュされたマテリアルデータ</CardDescription>
        </CardHeader>
        <CardContent>
          {isCacheLoading ? (
            <div className="py-4 text-center">読み込み中...</div>
          ) : (
            <div className="flex gap-4">
              {/* Table */}
              <div className="max-h-96 flex-1 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>先方品番 (ZKDMAT_B)</TableHead>
                      <TableHead>得意先</TableHead>
                      <TableHead>取得日時</TableHead>
                      <TableHead>バッチID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cachedMaterials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          キャッシュデータがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      cachedMaterials.map((item) => (
                        <TableRow
                          key={item.id}
                          className={`cursor-pointer hover:bg-muted/50 ${
                            selectedItem?.id === item.id ? "bg-muted" : ""
                          }`}
                          onClick={() => setSelectedItem(item)}
                        >
                          <TableCell className="font-mono">{item.zkdmat_b}</TableCell>
                          <TableCell>{item.kunnr}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(item.fetched_at).toLocaleString("ja-JP")}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {item.fetch_batch_id?.slice(0, 8)}
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
