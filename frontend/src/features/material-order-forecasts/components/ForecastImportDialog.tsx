import { Upload, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useImportMaterialOrderForecast } from "../hooks/useMaterialOrderForecasts";

import { ForecastImportForm } from "./ForecastImportForm";

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui";

interface ForecastImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMonth?: string;
}

export function ForecastImportDialog({
  open,
  onOpenChange,
  defaultMonth,
}: ForecastImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [targetMonth, setTargetMonth] = useState(
    defaultMonth || new Date().toISOString().slice(0, 7),
  );
  const importMutation = useImportMaterialOrderForecast();

  useEffect(() => {
    if (open) setTargetMonth(defaultMonth || new Date().toISOString().slice(0, 7));
  }, [open, defaultMonth]);

  const handleOpenChange = (val: boolean) => {
    if (importMutation.isPending) return;
    onOpenChange(val);
    if (!val) {
      setFile(null);
      importMutation.reset();
    }
  };

  const handleImport = () => {
    if (!file) return;
    importMutation.mutate(
      { file, targetMonth },
      {
        onSuccess: () => {
          setFile(null);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>フォーキャストCSVインポート</DialogTitle>
        </DialogHeader>
        <ForecastImportForm
          targetMonth={targetMonth}
          setTargetMonth={setTargetMonth}
          setFile={setFile}
          isPending={importMutation.isPending}
          isError={importMutation.isError}
          error={importMutation.error}
          isSuccess={importMutation.isSuccess}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={importMutation.isPending}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || !targetMonth || importMutation.isPending}
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                処理中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                インポート
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
