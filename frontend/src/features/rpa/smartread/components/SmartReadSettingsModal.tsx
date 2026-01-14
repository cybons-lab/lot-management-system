/* eslint-disable max-lines-per-function, complexity, max-lines */
/**
 * SmartReadSettingsModal
 * SmartRead設定管理モーダル
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Edit, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { SmartReadConfig } from "../api";
import {
  useSmartReadConfigs,
  useCreateSmartReadConfig,
  useUpdateSmartReadConfig,
  useDeleteSmartReadConfig,
} from "../hooks";

import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";

// Form validation schema
const configFormSchema = z.object({
  name: z.string().min(1, "設定名を入力してください").max(100),
  endpoint: z.string().url("有効なURLを入力してください"),
  api_key: z.string().min(1, "APIキーを入力してください"),
  request_type: z.string().default("sync"),
  template_ids: z.string().optional().nullable(),
  export_type: z.string().default("json"),
  aggregation_type: z.string().optional().nullable(),
  watch_dir: z.string().optional().nullable(),
  export_dir: z.string().optional().nullable(),
  input_exts: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

type ConfigFormData = z.infer<typeof configFormSchema>;

interface SmartReadSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SmartReadSettingsModal({ open, onOpenChange }: SmartReadSettingsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SmartReadConfig | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const { data: configs, isLoading } = useSmartReadConfigs();
  const createMutation = useCreateSmartReadConfig();
  const updateMutation = useUpdateSmartReadConfig();
  const deleteMutation = useDeleteSmartReadConfig();

  const form = useForm<ConfigFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configFormSchema) as any,
    defaultValues: {
      name: "",
      endpoint: "",
      api_key: "",
      request_type: "sync",
      template_ids: "",
      export_type: "json",
      aggregation_type: "",
      watch_dir: "",
      export_dir: "",
      input_exts: "pdf,png,jpg,jpeg",
      description: "",
      is_active: true,
    },
  });

  const handleEdit = (config: SmartReadConfig) => {
    setEditingConfig(config);
    form.reset({
      name: config.name,
      endpoint: config.endpoint,
      api_key: config.api_key,
      request_type: config.request_type,
      template_ids: config.template_ids ?? "",
      export_type: config.export_type,
      aggregation_type: config.aggregation_type ?? "",
      watch_dir: config.watch_dir ?? "",
      export_dir: config.export_dir ?? "",
      input_exts: config.input_exts ?? "pdf,png,jpg,jpeg",
      description: config.description ?? "",
      is_active: config.is_active,
    });
    setIsEditing(true);
  };

  const handleNew = () => {
    setEditingConfig(null);
    form.reset({
      name: "",
      endpoint: "",
      api_key: "",
      request_type: "sync",
      template_ids: "",
      export_type: "json",
      aggregation_type: "",
      watch_dir: "",
      export_dir: "",
      input_exts: "pdf,png,jpg,jpeg",
      description: "",
      is_active: true,
    });
    setIsEditing(true);
  };

  const handleSubmit = async (data: ConfigFormData) => {
    if (editingConfig) {
      await updateMutation.mutateAsync({
        configId: editingConfig.id,
        data: {
          ...data,
          template_ids: data.template_ids || null,
          aggregation_type: data.aggregation_type || null,
          watch_dir: data.watch_dir || null,
          export_dir: data.export_dir || null,
          input_exts: data.input_exts || null,
          description: data.description || null,
        },
      });
    } else {
      await createMutation.mutateAsync({
        ...data,
        template_ids: data.template_ids || null,
        aggregation_type: data.aggregation_type || null,
        watch_dir: data.watch_dir || null,
        export_dir: data.export_dir || null,
        input_exts: data.input_exts || null,
        description: data.description || null,
      });
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (deleteTargetId) {
      await deleteMutation.mutateAsync(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>SmartRead設定</DialogTitle>
            <DialogDescription>SmartRead OCR APIの接続設定を管理します</DialogDescription>
          </DialogHeader>

          {isEditing ? (
            // 編集フォーム
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>設定名 *</FormLabel>
                        <FormControl>
                          <Input placeholder="例: 本番環境" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>有効</FormLabel>
                          <FormDescription>この設定を使用可能にする</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="endpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>APIエンドポイント *</FormLabel>
                      <FormControl>
                        <Input placeholder="https://api.smartread.jp/v1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="api_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>APIキー *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="APIキーを入力" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="request_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>リクエストタイプ</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sync">同期 (sync)</SelectItem>
                            <SelectItem value="async">非同期 (async)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="export_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>デフォルトエクスポート形式</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="json">JSON</SelectItem>
                            <SelectItem value="csv">CSV</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="template_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>テンプレートID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="カンマ区切りで入力 (例: template1,template2)"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>帳票認識用のテンプレートID（オプション）</FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="input_exts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>対応拡張子</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="pdf,png,jpg,jpeg"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>説明</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="この設定の説明を入力"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="watch_dir"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>監視フォルダ (インプット)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="/path/to/input"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription>自動読み込みを行うフォルダパス</FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="export_dir"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>出力先フォルダ</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="/path/to/output"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription>解析結果を出力するフォルダパス</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    キャンセル
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingConfig ? "更新" : "作成"}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            // 設定一覧
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={handleNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  新規作成
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                </div>
              ) : !configs?.length ? (
                <div className="text-muted-foreground py-8 text-center">設定がありません</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>設定名</TableHead>
                      <TableHead>エンドポイント</TableHead>
                      <TableHead>状態</TableHead>
                      <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">{config.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{config.endpoint}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              config.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {config.is_active ? "有効" : "無効"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(config)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTargetId(config.id)}
                            >
                              <Trash2 className="text-destructive h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteTargetId !== null} onOpenChange={() => setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>設定を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。この設定を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
