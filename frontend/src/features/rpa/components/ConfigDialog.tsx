import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useCloudFlowConfigOptional, useUpdateCloudFlowConfig } from "../hooks";

import { Button, Input, Label } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STEP1_CONFIG_KEY = "MATERIAL_DELIVERY_STEP1_URL";
const STEP2_CONFIG_KEY = "MATERIAL_DELIVERY_STEP2_URL";

export function ConfigDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step1Url, setStep1Url] = useState("");
  const [step2Url, setStep2Url] = useState("");

  const { data: step1Config } = useCloudFlowConfigOptional(STEP1_CONFIG_KEY, { enabled: open });
  const { data: step2Config } = useCloudFlowConfigOptional(STEP2_CONFIG_KEY, { enabled: open });
  const updateConfigMutation = useUpdateCloudFlowConfig();

  useEffect(() => {
    if (step1Config) setStep1Url(step1Config.config_value);
  }, [step1Config]);

  useEffect(() => {
    if (step2Config) setStep2Url(step2Config.config_value);
  }, [step2Config]);

  const handleSaveConfig = async () => {
    try {
      await Promise.all([
        updateConfigMutation.mutateAsync({
          key: STEP1_CONFIG_KEY,
          data: { config_value: step1Url, description: "Material Delivery Step1 URL" },
        }),
        updateConfigMutation.mutateAsync({
          key: STEP2_CONFIG_KEY,
          data: { config_value: step2Url, description: "Material Delivery Step2 URL" },
        }),
      ]);
      toast.success("URL設定を保存しました");
      onOpenChange(false);
    } catch {
      toast.error("URL設定の保存に失敗しました");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>URL設定</DialogTitle>
          <DialogDescription>RPAフローの実行URLを設定します。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="step1-url">Step1 URL</Label>
            <Input
              id="step1-url"
              value={step1Url}
              onChange={(event) => setStep1Url(event.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="step2-url">Step2 URL</Label>
            <Input
              id="step2-url"
              value={step2Url}
              onChange={(event) => setStep2Url(event.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSaveConfig} disabled={updateConfigMutation.isPending}>
            {updateConfigMutation.isPending ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
