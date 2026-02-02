import {
  AlertCircle,
  Upload,
  CheckCircle2,
  History,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  getDeployStatus,
  uploadBundle,
  type DeployStatusResponse,
  type DeployHistoryItem,
} from "../api/deploy";

import { Button } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { getUserFriendlyMessage as getErrorMessage } from "@/utils/errors/api-error-handler";

export function DeployPage() {
  const [status, setStatus] = useState<DeployStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await getDeployStatus();
      setStatus(data);
    } catch (e) {
      toast.error(`ステータス取得失敗: ${getErrorMessage(e)}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const res = await uploadBundle(selectedFile);
      toast.success(`デプロイ成功: バージョン ${res.version}`);
      if (res.requires_restart) {
        toast.warning("バックエンドの変更が含まれています。サーバーを再起動してください。", {
          duration: 10000,
        });
      }
      setSelectedFile(null);
      fetchStatus();
    } catch (e) {
      toast.error(`デプロイ失敗: ${getErrorMessage(e)}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="システムデプロイ"
        subtitle="新しいリリースZIPをアップロードしてシステムを更新します"
      />

      <div className="grid gap-6">
        <DeployManual />
        <CurrentRelease isLoading={isLoading} status={status} />
        <UploadForm
          selectedFile={selectedFile}
          isUploading={isUploading}
          onFileChange={handleFileChange}
          onUpload={handleUpload}
        />
        <DeployHistoryTable history={status?.history || []} />
      </div>
    </PageContainer>
  );
}

function DeployManual() {
  return (
    <Card className="overflow-hidden">
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between p-4 font-medium hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-500" />
            <span>操作マニュアル（デプロイの手順）</span>
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground group-open:hidden transition-transform" />
          <ChevronUp className="h-5 w-5 text-muted-foreground hidden group-open:block transition-transform" />
        </summary>
        <CardContent className="border-t pt-4">
          <div className="grid gap-4 sm:grid-cols-3 text-sm leading-relaxed text-muted-foreground">
            <div className="space-y-1">
              <h4 className="font-bold text-foreground flex items-center gap-1">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                  1
                </span>
                ビルド
              </h4>
              <p>開発機のターミナルで実行：</p>
              <code className="block bg-muted p-2 rounded text-xs font-mono">make build</code>
              <p className="text-[11px]">
                <code className="bg-muted px-1 rounded">deploy/</code> フォルダに ZIP
                が生成されます。
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-foreground flex items-center gap-1">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                  2
                </span>
                アップロード
              </h4>
              <p>下のエリアに ZIP をドロップし「デプロイ実行」をクリック。</p>
              <p className="text-[11px]">
                システムがディレクトリを切り替え、フロントエンドが即時反映されます。
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-foreground flex items-center gap-1">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                  3
                </span>
                更新の適用
              </h4>
              <p>バックエンド更新時は、サーバー上で以下を実行：</p>
              <code className="block bg-muted p-2 rounded text-[10px] font-mono break-all leading-tight">
                C:\lot_management\run\restart_server.bat
              </code>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                ※ フロントのみの変更なら再起動不要です。
              </p>
            </div>
          </div>
        </CardContent>
      </details>
    </Card>
  );
}

function CurrentRelease({
  isLoading,
  status,
}: {
  isLoading: boolean;
  status: DeployStatusResponse | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          現在のリリース
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>読み込み中...</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              パス:{" "}
              <code className="bg-muted rounded px-1 py-0.5">
                {status?.current_release || "不明"}
              </code>
            </p>
            <p className="text-muted-foreground text-sm">
              最終デプロイ: {status?.last_deploy_at || "なし"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface UploadFormProps {
  selectedFile: File | null;
  isUploading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
}

function UploadForm({ selectedFile, isUploading, onFileChange, onUpload }: UploadFormProps) {
  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          新しいリリースをデプロイ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="border-muted-foreground/20 rounded-lg border-2 border-dashed p-8 text-center">
            <div className="space-y-4">
              <input
                type="file"
                id="bundle-upload"
                className="hidden"
                accept=".zip"
                onChange={onFileChange}
              />
              <label htmlFor="bundle-upload" className="block cursor-pointer">
                <Upload className="text-muted-foreground mx-auto mb-2 h-10 w-10" />
                <p className="text-sm font-medium">
                  {selectedFile ? selectedFile.name : "bundle.zip を選択してください"}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Viteビルド成果物とPythonバックエンドを含むZIP
                </p>
              </label>
              {selectedFile && (
                <div className="flex justify-center">
                  <Button className="w-full max-w-xs" onClick={onUpload} disabled={isUploading}>
                    {isUploading ? "アップロード中..." : "デプロイ実行"}
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-900/50 flex gap-3 rounded-md border p-4 text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>
              バックエンドの変更が含まれる場合、アップロード完了後にサーバーの再起動が必要です。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DeployHistoryTable({ history }: { history: DeployHistoryItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="text-muted-foreground h-5 w-5" />
          デプロイ履歴
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">日時</th>
                <th className="px-4 py-2 font-medium">バージョン</th>
                <th className="px-4 py-2 font-medium">種別</th>
                <th className="px-4 py-2 font-medium">備考</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs sm:text-sm">
              {history.map((item) => (
                <tr key={item.timestamp}>
                  <td className="whitespace-nowrap px-4 py-2">{item.deployed_at}</td>
                  <td className="px-4 py-2 font-mono">{item.version}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      {item.backend_changed ? (
                        <Badge variant="default">Backend</Badge>
                      ) : (
                        <Badge variant="outline">Frontend</Badge>
                      )}
                    </div>
                  </td>
                  <td className="text-muted-foreground px-4 py-2 italic">{item.notes || "-"}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted-foreground px-4 py-8 text-center">
                    履歴はありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
