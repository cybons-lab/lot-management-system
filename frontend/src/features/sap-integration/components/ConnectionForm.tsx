/* eslint-disable max-lines-per-function, complexity -- 関連する画面ロジックを1箇所で管理するため */
import { useForm } from "react-hook-form";

import {
  type SapConnection,
  type SapConnectionCreateRequest,
  type SapConnectionUpdateRequest,
} from "../api";

import { Button } from "@/components/ui/base/button";
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
import { Textarea } from "@/components/ui/form/textarea";

interface ConnectionFormProps {
  defaultValues?: SapConnection;
  onSubmit: (data: SapConnectionCreateRequest | SapConnectionUpdateRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

export function ConnectionForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
  isEdit,
}: ConnectionFormProps) {
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      name: defaultValues?.name ?? "",
      environment: defaultValues?.environment ?? "test",
      description: defaultValues?.description ?? "",
      ashost: defaultValues?.ashost ?? "",
      sysnr: defaultValues?.sysnr ?? "00",
      client: defaultValues?.client ?? "",
      user_name: defaultValues?.user_name ?? "",
      passwd: "",
      lang: defaultValues?.lang ?? "JA",
      default_bukrs: defaultValues?.default_bukrs ?? "10",
      default_kunnr: defaultValues?.default_kunnr ?? "",
      is_default: defaultValues?.is_default ?? false,
      is_active: defaultValues?.is_active ?? true,
    },
  });

  const environment = watch("environment");
  const isDefault = watch("is_default");
  const isActive = watch("is_active");

  return (
    <form
      onSubmit={handleSubmit((data) => {
        // Remove empty string for passwd in edit mode (means no change)
        if (isEdit && !data.passwd) {
          const rest = { ...data };
          delete (rest as { passwd?: string }).passwd;
          onSubmit(rest as SapConnectionUpdateRequest);
          return;
        }
        onSubmit(data);
      })}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">接続名 *</Label>
          <Input id="name" {...register("name", { required: true })} placeholder="本番SAP" />
        </div>

        {/* Environment */}
        <div className="space-y-2">
          <Label>環境 *</Label>
          <Select value={environment} onValueChange={(v) => setValue("environment", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="production">本番 (production)</SelectItem>
              <SelectItem value="test">テスト (test)</SelectItem>
              <SelectItem value="development">開発 (development)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Host */}
        <div className="space-y-2">
          <Label htmlFor="ashost">SAPホスト *</Label>
          <Input
            id="ashost"
            {...register("ashost", { required: true })}
            placeholder="192.168.1.100"
          />
        </div>

        {/* System Number */}
        <div className="space-y-2">
          <Label htmlFor="sysnr">システム番号</Label>
          <Input id="sysnr" {...register("sysnr")} placeholder="00" />
        </div>

        {/* Client */}
        <div className="space-y-2">
          <Label htmlFor="client">クライアント番号 *</Label>
          <Input id="client" {...register("client", { required: true })} placeholder="800" />
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="lang">言語</Label>
          <Input id="lang" {...register("lang")} placeholder="JA" />
        </div>

        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="user_name">ユーザー名 *</Label>
          <Input
            id="user_name"
            {...register("user_name", { required: true })}
            placeholder="BATCH"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="passwd">パスワード {isEdit ? "(空=変更なし)" : "*"}</Label>
          <Input
            id="passwd"
            type="password"
            {...register("passwd", { required: !isEdit })}
            placeholder={isEdit ? "変更する場合のみ入力" : "パスワード"}
          />
        </div>

        {/* Default BUKRS */}
        <div className="space-y-2">
          <Label htmlFor="default_bukrs">デフォルト会社コード</Label>
          <Input id="default_bukrs" {...register("default_bukrs")} placeholder="10" />
        </div>

        {/* Default KUNNR */}
        <div className="space-y-2">
          <Label htmlFor="default_kunnr">デフォルト得意先コード</Label>
          <Input id="default_kunnr" {...register("default_kunnr")} placeholder="100427105" />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea id="description" {...register("description")} placeholder="接続の説明..." />
      </div>

      {/* Checkboxes */}
      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <Checkbox
            id="is_default"
            checked={isDefault}
            onCheckedChange={(checked) => setValue("is_default", !!checked)}
          />
          <Label htmlFor="is_default">デフォルト接続にする</Label>
        </div>

        {isEdit && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue("is_active", !!checked)}
            />
            <Label htmlFor="is_active">有効</Label>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "保存中..." : isEdit ? "更新" : "作成"}
        </Button>
      </div>
    </form>
  );
}
