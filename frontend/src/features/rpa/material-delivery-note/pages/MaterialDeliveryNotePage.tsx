/* eslint-disable max-lines-per-function */
/**
 * MaterialDeliveryNotePage
 * 素材納品書発行のメニューページ - Step1/Step2/履歴へのナビゲーション
 */

import { CheckSquare, Download, FileText, History, Play, Settings, Wrench } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
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
  return (
    <Link to={to} className="block">
      <div className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg ${
              variant === "secondary"
                ? "bg-gray-100 text-gray-600"
                : "bg-indigo-100 text-indigo-600"
            }`}
          >
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

export function MaterialDeliveryNotePage() {
  return (
    <PageContainer>
      <PageHeader title="素材納品書発行" subtitle="CSV取込からStep2実行までのワークフロー" />

      <div className="mx-auto max-w-3xl space-y-4">
        {/* Step1: 進度実績ダウンロード */}
        <MenuCard
          title="Step1: 進度実績ダウンロード"
          description="Power Automateフローを呼び出して進度実績データをダウンロードします。"
          icon={<Download className="h-6 w-6" />}
          to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP1}
        />

        {/* Step2: 内容確認 */}
        <MenuCard
          title="Step2: 内容確認"
          description="取込データの確認・編集を行います。詳細ページで発行/完了フラグを操作します。"
          icon={<CheckSquare className="h-6 w-6" />}
          to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP2}
        />

        {/* Step3: PAD実行・監視 */}
        <MenuCard
          title="Step3: PAD実行・監視"
          description="PAD実行の開始と進捗監視を行います。実行中Runの状態を確認できます。"
          icon={<Play className="h-6 w-6" />}
          to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.STEP3}
        />

        {/* Step4: 突合・レビュー - 直接URLでアクセス */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Step4: 突合・レビュー</h3>
              <p className="mt-1 text-sm text-gray-600">
                外部手順完了後、CSVを再取得して突合チェックを行います。
                <br />
                <span className="text-xs text-gray-500">
                  ※ Step3完了後は自動遷移しません。外部手順完了ボタンを押下してStep4へ進めます。
                  履歴一覧からもアクセス可能です。
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* 履歴一覧 */}
        <MenuCard
          title="実行履歴"
          description="過去のCSV取込・実行履歴を確認できます。各Runの詳細ページへ遷移できます。"
          icon={<History className="h-6 w-6" />}
          to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.RUNS}
          variant="secondary"
        />

        {/* CSV取込（一時使用） */}
        <MenuCard
          title="CSV取込（一時使用）"
          description="CSVファイルをアップロードしてデータを登録します。"
          icon={<FileText className="h-6 w-6" />}
          to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.CSV_IMPORT}
          variant="secondary"
        />

        {/* クラウドフロー実行（汎用） */}
        <MenuCard
          title="クラウドフロー実行 (汎用)"
          description="Runデータを使用せず、直接URLとJSONを指定してクラウドフローを実行します。"
          icon={<Wrench className="h-6 w-6" />}
          to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.CLOUD_FLOW_EXECUTE}
          variant="secondary"
        />
        <MenuCard
          title="層別コードマスタ"
          description="層別コードとメーカー名の対応付を管理します。"
          icon={<Settings className="h-6 w-6" />}
          to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.LAYER_CODES}
          variant="secondary"
        />
      </div>

      {/* RPAトップへ戻るリンク */}
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
