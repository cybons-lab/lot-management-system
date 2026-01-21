/**
 * MaterialDeliveryNotePage
 * 素材納品書発行のメニューページ - Step1/Step2/履歴へのナビゲーション
 */

import { CheckSquare, Download, FileText, History, ListTree, Play, Settings } from "lucide-react";
import { Link } from "react-router-dom";

import { RpaSettingsModal } from "../../components/RpaSettingsModal";

import { Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/AuthContext";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

interface MenuCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
  variant?: "default" | "secondary";
}

function MenuCard({ title, description, icon, to, variant = "default" }: MenuCardProps) {
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
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

const MENU_ITEMS: MenuCardProps[] = [
  {
    title: "Step1: 進度実績ダウンロード",
    description: "Power Automateフローを呼び出して進度実績データをダウンロードします。",
    icon: <Download className="h-6 w-6" />,
    to: ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP1,
  },
  {
    title: "Step2: 内容確認",
    description: "取込データの確認・編集を行います。詳細ページで発行/完了フラグを操作します。",
    icon: <CheckSquare className="h-6 w-6" />,
    to: ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP2,
  },
  {
    title: "Step3: 発行リスト作成（Plan）",
    description: "複数Runをまとめてグルーピング・分割します。大量データの一括処理時に使用します。",
    icon: <ListTree className="h-6 w-6" />,
    to: ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP3_PLAN,
  },
  {
    title: "Step3: PAD実行・監視",
    description: "PAD実行の開始と進捗監視を行います。実行中Runの状態を確認できます。",
    icon: <Play className="h-6 w-6" />,
    to: ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP3,
  },
  {
    title: "Step4: レビュー・SAP登録",
    description: "突合OKデータのレビューとSAP登録を行います。",
    icon: <CheckSquare className="h-6 w-6" />,
    to: ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP4,
  },
  {
    title: "実行履歴",
    description: "過去のCSV取込・実行履歴を確認できます。各Runの詳細ページへ遷移できます。",
    icon: <History className="h-6 w-6" />,
    to: ROUTES.RPA.MATERIAL_DELIVERY_NOTE.RUNS,
    variant: "secondary",
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
];

export function MaterialDeliveryNotePage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("admin");

  return (
    <PageContainer>
      <PageHeader
        title="素材納品書発行"
        subtitle="CSV取込からStep2実行までのワークフロー"
        actions={isAdmin ? <RpaSettingsModal /> : undefined}
      />
      <div className="mx-auto max-w-3xl space-y-4">
        {MENU_ITEMS.map((item) => (
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
