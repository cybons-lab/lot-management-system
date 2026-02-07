import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useCloudFlowConfig, useUpdateCloudFlowConfig } from "../hooks";

import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/form/textarea";

interface RpaSettingsFormValues {
  step1Url: string;
  step1Payload: string;
  step3Url: string;
  step3Payload: string;
}

// eslint-disable-next-line max-lines-per-function -- 関連する画面ロジックを1箇所で管理するため
function RpaSettingsFormContent({ onClose }: { onClose?: () => void }) {
  const { data: step1UrlConfig } = useCloudFlowConfig("STEP1_URL");
  const { data: step1PayloadConfig } = useCloudFlowConfig("STEP1_PAYLOAD");
  const { data: step3UrlConfig } = useCloudFlowConfig("STEP3_URL");
  const { data: step3PayloadConfig } = useCloudFlowConfig("STEP3_PAYLOAD");

  const updateMutation = useUpdateCloudFlowConfig();

  const form = useForm<RpaSettingsFormValues>({
    defaultValues: {
      step1Url: "",
      step1Payload: "{}",
      step3Url: "",
      step3Payload: "{}",
    },
  });

  // Load initial values
  useEffect(() => {
    if (step1UrlConfig) form.setValue("step1Url", step1UrlConfig.config_value || "");
    if (step1PayloadConfig) form.setValue("step1Payload", step1PayloadConfig.config_value);
    if (step3UrlConfig) form.setValue("step3Url", step3UrlConfig.config_value || "");
    if (step3PayloadConfig) form.setValue("step3Payload", step3PayloadConfig.config_value);
  }, [step1UrlConfig, step1PayloadConfig, step3UrlConfig, step3PayloadConfig, form]);

  const onSubmit = async (values: RpaSettingsFormValues) => {
    // Validate JSON
    try {
      JSON.parse(values.step1Payload);
      JSON.parse(values.step3Payload);
    } catch {
      toast.error("JSONペイロードの形式が不正です");
      return;
    }

    try {
      await Promise.all([
        updateMutation.mutateAsync({
          key: "STEP1_URL",
          data: { config_value: values.step1Url, description: "Step1 Flow URL" },
        }),
        updateMutation.mutateAsync({
          key: "STEP1_PAYLOAD",
          data: { config_value: values.step1Payload, description: "Step1 JSON Payload" },
        }),
        updateMutation.mutateAsync({
          key: "STEP3_URL",
          data: { config_value: values.step3Url, description: "Step3 Flow URL" },
        }),
        updateMutation.mutateAsync({
          key: "STEP3_PAYLOAD",
          data: { config_value: values.step3Payload, description: "Step3 JSON Payload" },
        }),
      ]);
      toast.success("設定を更新しました");
      onClose?.();
    } catch {
      toast.error("設定の更新に失敗しました");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Tabs defaultValue="step1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="step1">Step1 (DL)</TabsTrigger>
            <TabsTrigger value="step3">Step3 (PAD)</TabsTrigger>
          </TabsList>

          <TabsContent value="step1" className="space-y-4 pt-4">
            <div className="bg-muted text-muted-foreground rounded-md p-3 text-sm">
              進度実績ダウンロード処理（Step1）の設定です。
              <br />
              JSON内の <code>{"{{start_date}}"}</code>, <code>{"{{end_date}}"}</code>{" "}
              は実行時に日付（YYYY-MM-DD）に置換されます。
            </div>
            <FormField
              control={form.control}
              name="step1Url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flow URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="step1Payload"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>JSON Template</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="min-h-[150px] font-mono" placeholder="{...}" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="step3" className="space-y-4 pt-4">
            <div className="bg-muted text-muted-foreground rounded-md p-3 text-sm">
              PAD実行・監視処理（Step3）の設定です。
              <br />
              JSON内の <code>{"{{id}}"}</code>, <code>{"{{start_date}}"}</code>,{" "}
              <code>{"{{end_date}}"}</code> は実行時に値に置換されます。
            </div>
            <FormField
              control={form.control}
              name="step3Url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flow URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="step3Payload"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>JSON Template</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="min-h-[150px] font-mono" placeholder="{...}" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "保存中..." : "設定を保存"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function RpaSettingsModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          RPAシステム設定
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>RPAシステム設定</DialogTitle>
          <DialogDescription>
            各ステップで使用するPower Automate Flowの接続情報を設定します。
          </DialogDescription>
        </DialogHeader>
        <RpaSettingsFormContent onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
