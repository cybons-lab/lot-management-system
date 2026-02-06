/* eslint-disable max-lines-per-function -- 論理的な画面単位を維持 */
import { Plus, Trash2, Edit2, Check, X, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import {
  useCreateLayerCode,
  useDeleteLayerCode,
  useLayerCodes,
  useUpdateLayerCode,
} from "../hooks";

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
} from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/constants/routes";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

interface EditingState {
  code: string;
  makerName: string;
}

export function LayerCodeMappingsPage() {
  const { data: mappings, isLoading } = useLayerCodes();
  const createMutation = useCreateLayerCode();
  const updateMutation = useUpdateLayerCode();
  const deleteMutation = useDeleteLayerCode();

  const [newCode, setNewCode] = useState("");
  const [newMaker, setNewMaker] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);

  const handleCreate = async () => {
    if (!newCode || !newMaker) {
      toast.error("コードとメーカー名を入力してください");
      return;
    }

    try {
      await createMutation.mutateAsync({
        layer_code: newCode,
        maker_name: newMaker,
      });
      toast.success("登録しました");
      setNewCode("");
      setNewMaker("");
      setIsDialogOpen(false);
    } catch {
      // Error handling is done in hook
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`層別コード ${code} を削除しますか？`)) return;

    try {
      await deleteMutation.mutateAsync(code);
      toast.success("削除しました");
    } catch {
      // Error handling
    }
  };

  const handleStartEdit = (code: string, currentMaker: string) => {
    setEditing({ code, makerName: currentMaker });
  };

  const handleCancelEdit = () => {
    setEditing(null);
  };

  const handleSaveEdit = async () => {
    if (!editing || !editing.makerName) return;

    try {
      await updateMutation.mutateAsync({
        code: editing.code,
        data: { maker_name: editing.makerName },
      });
      toast.success("更新しました");
      setEditing(null);
    } catch {
      // Error handling
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <PageContainer>
      <div className="mb-4">
        <Link
          to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.ROOT}
          className="flex items-center text-sm text-gray-500 hover:text-gray-900"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          メニューへ戻る
        </Link>
      </div>

      <PageHeader
        title="層別コードマスタ編集"
        subtitle="層別コードとメーカー名の対応を管理します"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                新規登録
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新規層別コード登録</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="code" className="text-right text-sm font-medium">
                    層別コード
                  </label>
                  <Input
                    id="code"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="col-span-3"
                    placeholder="例: A01"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="maker" className="text-right text-sm font-medium">
                    メーカー名
                  </label>
                  <Input
                    id="maker"
                    value={newMaker}
                    onChange={(e) => setNewMaker(e.target.value)}
                    className="col-span-3"
                    placeholder="例: 東京メーカー"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    キャンセル
                  </Button>
                  <Button onClick={handleCreate}>登録</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">層別コード</TableHead>
              <TableHead>メーカー名</TableHead>
              <TableHead className="w-[150px] text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings?.map((item) => (
              <TableRow key={item.layer_code}>
                <TableCell className="font-medium">{item.layer_code}</TableCell>
                <TableCell>
                  {editing?.code === item.layer_code ? (
                    <Input
                      value={editing.makerName}
                      onChange={(e) => setEditing({ ...editing, makerName: e.target.value })}
                      className="h-8"
                    />
                  ) : (
                    item.maker_name
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    {editing?.code === item.layer_code ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleSaveEdit}
                          className="h-8 w-8 text-green-600"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCancelEdit}
                          className="h-8 w-8 text-gray-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEdit(item.layer_code, item.maker_name)}
                          className="h-8 w-8 text-blue-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.layer_code)}
                          className="h-8 w-8 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {mappings?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-gray-500">
                  データがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  );
}
