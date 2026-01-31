/**
 * SupplierAssignmentWarning - 担当仕入先未設定時の警告バナー
 *
 * 担当仕入先が設定されていない場合に警告を表示し、
 * 設定画面を開くボタンを提供します。
 */

import { Info } from "lucide-react";
import { useState } from "react";

import { useSupplierFilter } from "../hooks/useSupplierFilter";

import { MySupplierAssignmentDialog } from "./MySupplierAssignmentDialog";

import { Alert, AlertDescription, AlertTitle, Button } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";

interface SupplierAssignmentWarningProps {
  /** 追加のクラス名 */
  className?: string;
}

/**
 * 担当仕入先が未設定の場合に警告を表示するコンポーネント
 *
 * - 担当仕入先が1つ以上ある場合は何も表示しない
 * - 担当仕入先がない場合は警告バナーを表示
 * - 「設定する」ボタンで担当仕入先追加モーダルを開く
 */
export function SupplierAssignmentWarning({ className }: SupplierAssignmentWarningProps) {
  const { hasAssignedSuppliers } = useSupplierFilter();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  // 担当仕入先が設定されている場合は何も表示しない
  if (hasAssignedSuppliers) {
    return null;
  }

  return (
    <>
      <Alert className={`border-blue-200 bg-blue-50 ${className ?? ""}`}>
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">担当仕入先が設定されていません</AlertTitle>
        <AlertDescription className="text-blue-700">
          担当する仕入先を設定すると、自動的にフィルタが適用されます。
          <Button
            variant="link"
            className="ml-2 h-auto p-0 text-blue-700 underline"
            onClick={() => setDialogOpen(true)}
          >
            担当仕入先を設定する
          </Button>
        </AlertDescription>
      </Alert>

      {user && (
        <MySupplierAssignmentDialog
          userId={user.id}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  );
}
