/**
 * MaterialDeliveryNotePage
 * 素材納品書発行のメニューページ - Step1/Step2/履歴へのナビゲーション
 */

import {
  CheckSquare,
  Download,
  FileText,
  History,
  ListTree,
  Play,
  Settings,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { RpaSettingsModal } from "../../components/RpaSettingsModal";
import { useRuns } from "../hooks";

import { Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/AuthContext";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

interface MenuCardProps {
  title: string;
  description?: string;
  summaryItems?: { label: string; value: string }[];
  icon: React.ReactNode;
  to: string;
  variant?: "default" | "secondary";
}

function MenuCard({
  title,
  description,
  summaryItems = [],
  icon,
  to,
  variant = "default",
}: MenuCardProps) {
  const iconBg =
    variant === "secondary" ? "bg-gray-100 text-gray-600" : "bg-indigo-100 text-indigo-600";
  return (
    <Link to={to} className="block">
      <div className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconBg}`}>
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
              {title}
            </h3>
            {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
            {summaryItems.length > 0 && (
              <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                {summaryItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="text-gray-400">{item.label}:</span>
                    <span className="font-medium text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function MaterialDeliveryNotePage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("admin");
  const { data: runsData } = useRuns(0, 50);
  const runs = runsData?.runs ?? [];
  const latestRun = runs[0];

  const step2TargetRuns = runs.filter(
    (run) => run.status === "step1_done" || run.status === "step2_confirmed",
  );
  const step3TargetRuns = runs.filter((run) => run.status === "step2_confirmed");
  const step4TargetRuns = runs.filter((run) =>
    ["step3_done", "step4_checking", "step4_ng_retry", "step4_review"].includes(run.status),
  );

  const menuItems = useMemo<MenuCardProps[]>(
    () => [
      {
        title: "Step1: 進度実績ダウンロード",
        icon: <Download className="h-6 w-6" />,
        to: ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP1,
        summaryItems: [
          { label: "状態", value: latestRun ? "取得済み" : "未実行" },
          {
            label: "最終取得",
            value: latestRun ? new Date(latestRun.created_at).toLocaleString("ja-JP") : "-",
          },
          {
            label: "期間",
            value:
              latestRun?.data_start_date && latestRun?.data_end_date
                ? `${latestRun.data_start_date} 〜 ${latestRun.data_end_date}`
                : "-",
          },
          { label: "件数", value: latestRun ? `${latestRun.item_count}件` : "-" },
        ],
      },
      {
        title: "Step2: 発行対象の選択",
        icon: <CheckSquare className="h-6 w-6" />,
        to: ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP2,
        summaryItems: [
          { label: "対象Run", value: `${step2TargetRuns.length}件` },
          { label: "選択中", value: latestRun ? `${latestRun.issue_count}件` : "0件" },
        ],
      },
      {
        title: "Step3: 発行リスト作成（Plan）",
        icon: <ListTree className="h-6 w-6" />,
        to: ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP3_PLAN,
        summaryItems: [
          { label: "リスト", value: step3TargetRuns.length > 0 ? "作成待ち" : "未作成" },
          { label: "予定Run数", value: `${step3TargetRuns.length}件` },
        ],
      },
      {
        title: "Step3: PAD実行・監視",
        icon: <Play className="h-6 w-6" />,
        to: ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP3,
        summaryItems: [
          { label: "実行中", value: runs.some((run) => run.status === "step3_running") ? "あり" : "なし" },
          { label: "最終更新", value: latestRun ? new Date(latestRun.updated_at).toLocaleString("ja-JP") : "-" },
        ],
      },
      {
        title: "Step4: 突合・SAP登録",
        icon: <CheckSquare className="h-6 w-6" />,
        to: ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP4,
        summaryItems: [
          { label: "検証", value: step4TargetRuns.length > 0 ? "要対応" : "未実行" },
          { label: "登録", value: runs.some((run) => run.status === "done") ? "完了あり" : "未実行" },
        ],
      },
      {
        title: "Step5: Run監視・履歴",
        icon: <History className="h-6 w-6" />,
        to: ROUTES.RPA.MATERIAL_DELIVERY_NOTE.RUNS,
        variant: "secondary",
        summaryItems: [
          { label: "直近Run", value: latestRun ? `#${latestRun.id}` : "-" },
          {
            label: "状態",
            value: latestRun ? latestRun.status : "-",
          },
        ],
      },
      {
        title: "CSV取込（一時使用）",
        description: "CSVファイルをアップロードしてデータを登録します。",
        icon: <FileText className="h-6 w-6" />,
        to: ROUTES.RPA.MATERIAL_DELIVERY_NOTE.CSV_IMPORT,
        variant: "secondary",
      },
      {
        title: "層別コードマスタ",
        description: "層別コードとメーカー名の対応付を管理します。",
        icon: <Settings className="h-6 w-6" />,
        to: ROUTES.RPA.MATERIAL_DELIVERY_NOTE.LAYER_CODES,
        variant: "secondary",
      },
    ],
    [latestRun, runs, step2TargetRuns.length, step3TargetRuns.length, step4TargetRuns.length],
  );

  return (
    <PageContainer>
      <PageHeader
        title="素材納品書発行"
        subtitle="CSV取込からStep2実行までのワークフロー"
        actions={isAdmin ? <RpaSettingsModal /> : undefined}
      />
      <div className="mx-auto max-w-3xl space-y-4">
        {menuItems.map((item) => (
          <MenuCard key={item.to} {...item} />
        ))}
      </div>
      <div className="mx-auto mt-8 max-w-3xl">
        <Link to={ROUTES.RPA.ROOT}>
          <Button variant="outline" size="sm">
            ← RPAトップへ戻る
          </Button>
        </Link>
      </div>
    </PageContainer>
  );
}
