/**
 * RPAPage
 * RPAトップページ - 各種RPA機能へのメニュー
 */

import { FileText, ArrowRight, ScanLine } from "lucide-react";
import { Link } from "react-router-dom";

import { RpaSettingsModal } from "../components/RpaSettingsModal";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/AuthContext";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { PageHeader } from "@/shared/components/layout/PageHeader";

interface RPAMenuCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}

function RPAMenuCard({ title, description, icon, to }: RPAMenuCardProps) {
  return (
    <Link to={to} className="group block">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
              {title}
              <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </h3>
            <p className="mt-2 text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function RPAPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("admin");

  return (
    <PageContainer>
      <PageHeader
        title="RPA"
        subtitle="RPA (Robotic Process Automation) 機能一覧"
        actions={isAdmin ? <RpaSettingsModal /> : undefined}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 素材納品書発行 */}
        <RPAMenuCard
          title="素材納品書発行"
          description="CSVファイルの取込、チェック、およびワークフロー実行を行います。Step1、Step2のプロセス管理が可能です。"
          icon={<FileText className="h-6 w-6" />}
          to={ROUTES.RPA.MATERIAL_DELIVERY_NOTE.ROOT}
        />

        {/* クラウドフロー実行（汎用） */}
        <RPAMenuCard
          title="クラウドフロー実行 (汎用)"
          description="Runデータを使用せず、直接URLとJSONを指定してクラウドフローを実行します。"
          icon={<FileText className="h-6 w-6" />}
          to={ROUTES.RPA.GENERIC_CLOUD_FLOW}
        />

        {/* SmartRead PDFインポート */}
        <RPAMenuCard
          title="SmartRead PDFインポート"
          description="SmartRead OCRを使用してPDFや画像を解析し、CSVまたはJSONでデータをエクスポートします。"
          icon={<ScanLine className="h-6 w-6" />}
          to={ROUTES.RPA.SMARTREAD}
        />
      </div>
    </PageContainer>
  );
}
