import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>キーボードショートカット</DialogTitle>
          <DialogDescription>
            利用可能なショートカットキーの一覧です。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 items-center gap-4 border-b pb-2">
            <span className="font-semibold">?</span>
            <span className="text-sm text-gray-500">このヘルプを表示</span>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <span className="font-semibold">g + h</span>
            <span className="text-sm text-gray-500">ホームへ移動</span>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <span className="font-semibold">g + d</span>
            <span className="text-sm text-gray-500">ダッシュボードへ移動</span>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <span className="font-semibold">g + i</span>
            <span className="text-sm text-gray-500">在庫一覧へ移動</span>
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <span className="font-semibold">g + o</span>
            <span className="text-sm text-gray-500">受注一覧へ移動</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
