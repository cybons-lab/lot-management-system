/* eslint-disable max-lines-per-function */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  createConnection,
  deleteConnection,
  listConnections,
  type SapConnection,
  type SapConnectionCreateRequest,
  type SapConnectionUpdateRequest,
  testConnection,
  updateConnection,
} from "../api";

import { ConnectionForm } from "./ConnectionForm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/base/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ConnectionsTab() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<SapConnection | null>(null);

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["sap-connections"],
    queryFn: () => listConnections(false),
  });

  const createMutation = useMutation({
    mutationFn: createConnection,
    onSuccess: () => {
      toast.success("接続情報を作成しました");
      queryClient.invalidateQueries({ queryKey: ["sap-connections"] });
      setIsCreateOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`作成エラー: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SapConnectionUpdateRequest }) =>
      updateConnection(id, data),
    onSuccess: () => {
      toast.success("接続情報を更新しました");
      queryClient.invalidateQueries({ queryKey: ["sap-connections"] });
      setEditingConnection(null);
    },
    onError: (error: Error) => {
      toast.error(`更新エラー: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteConnection,
    onSuccess: () => {
      toast.success("接続情報を無効化しました");
      queryClient.invalidateQueries({ queryKey: ["sap-connections"] });
    },
    onError: (error: Error) => {
      toast.error(`削除エラー: ${error.message}`);
    },
  });

  const testMutation = useMutation({
    mutationFn: testConnection,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`接続テスト成功 (${result.duration_ms}ms): ${result.message}`);
      } else {
        toast.error(`接続テスト失敗: ${result.message}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`テストエラー: ${error.message}`);
    },
  });

  const handleCreate = (data: SapConnectionCreateRequest | SapConnectionUpdateRequest) => {
    createMutation.mutate(data as SapConnectionCreateRequest);
  };

  const handleUpdate = (data: SapConnectionCreateRequest | SapConnectionUpdateRequest) => {
    if (editingConnection) {
      updateMutation.mutate({ id: editingConnection.id, data: data as SapConnectionUpdateRequest });
    }
  };

  if (isLoading) {
    return <div className="py-4 text-center">読み込み中...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>SAP接続設定</CardTitle>
          <CardDescription>SAP RFCへの接続情報を管理します</CardDescription>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>新規作成</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>名前</TableHead>
              <TableHead>環境</TableHead>
              <TableHead>ホスト</TableHead>
              <TableHead>クライアント</TableHead>
              <TableHead>ユーザー</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  接続情報がありません
                </TableCell>
              </TableRow>
            ) : (
              connections.map((conn) => (
                <TableRow key={conn.id} className={!conn.is_active ? "opacity-50" : ""}>
                  <TableCell>{conn.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {conn.name}
                      {conn.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          デフォルト
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={conn.environment === "production" ? "default" : "outline"}>
                      {conn.environment}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{conn.ashost}</TableCell>
                  <TableCell>{conn.client}</TableCell>
                  <TableCell>{conn.user_name}</TableCell>
                  <TableCell>
                    <Badge variant={conn.is_active ? "default" : "secondary"}>
                      {conn.is_active ? "有効" : "無効"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testMutation.mutate(conn.id)}
                        disabled={testMutation.isPending}
                      >
                        テスト
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingConnection(conn)}
                      >
                        編集
                      </Button>
                      {conn.is_active && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm("この接続を無効化しますか？")) {
                              deleteMutation.mutate(conn.id);
                            }
                          }}
                        >
                          無効化
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新規接続作成</DialogTitle>
            <DialogDescription>SAP RFCへの接続情報を入力してください</DialogDescription>
          </DialogHeader>
          <ConnectionForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateOpen(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingConnection} onOpenChange={() => setEditingConnection(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>接続情報編集</DialogTitle>
            <DialogDescription>接続情報を編集してください</DialogDescription>
          </DialogHeader>
          {editingConnection && (
            <ConnectionForm
              defaultValues={editingConnection}
              onSubmit={handleUpdate}
              onCancel={() => setEditingConnection(null)}
              isLoading={updateMutation.isPending}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
