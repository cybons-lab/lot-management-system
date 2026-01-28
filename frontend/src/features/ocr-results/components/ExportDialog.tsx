import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ExportDialog({
  open,
  onOpenChange,
  onProcess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcess: (complete: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ダウンロード完了処理</AlertDialogTitle>
          <AlertDialogDescription>
            ファイルをダウンロードします。
            <br />
            現在表示されている項目（ページ内）を「完了」ステータスに移動しますか？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onProcess(false)}>
            完了にしない（DLのみ）
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onProcess(true)}>
            ダウンロードして完了にする
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
