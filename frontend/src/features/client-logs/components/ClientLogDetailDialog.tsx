import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClientLog {
  id: number;
  level: string;
  message: string;
  user_id?: number | null;
  created_at: string;
}

interface ClientLogDetailDialogProps {
  log: ClientLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientLogDetailDialog({ log, open, onOpenChange }: ClientLogDetailDialogProps) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[80vh] max-w-2xl flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>ログ詳細 (ID: {log.id})</DialogTitle>
            <Badge variant={log.level === "error" ? "destructive" : "secondary"}>{log.level}</Badge>
          </div>
          <DialogDescription>
            {new Date(log.created_at).toLocaleString("ja-JP")} に記録されたログの詳細です
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-2 gap-4 border-b pb-4 text-sm">
          <div>
            <span className="text-muted-foreground font-medium">ユーザーID:</span>{" "}
            <span>{log.user_id ?? "-"}</span>
          </div>
          <div>
            <span className="text-muted-foreground font-medium">日時:</span>{" "}
            <span>{new Date(log.created_at).toLocaleString("ja-JP")}</span>
          </div>
        </div>

        <div className="mt-4 flex-1 overflow-hidden">
          <p className="text-muted-foreground mb-2 text-sm font-medium">メッセージ内容:</p>
          <ScrollArea className="h-[40vh] w-full rounded-md border bg-slate-50 p-4">
            <pre className="font-mono text-sm break-all whitespace-pre-wrap text-slate-800">
              {log.message}
            </pre>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
