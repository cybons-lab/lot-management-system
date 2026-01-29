import {
  Database,
  Users,
  Warehouse,
  Package,
  Building2,
  UserCheck,
  FilePenLine,
  Truck,
} from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/feedback/alert";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/AuthContext";
import { useMasterStatus } from "@/features/masters/hooks/useMasterStatus";
import { PageHeader } from "@/shared/components/layout/PageHeader";

interface MasterLink {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  requireAdmin?: boolean;
}

interface MasterSection {
  title: string;
  description: string;
  links: MasterLink[];
}

const masterSections: MasterSection[] = [
  {
    title: "品番・品目管理 (Items & Materials)",
    description: "製品・品番に関するマスタデータを管理",
    links: [
      {
        title: "メーカー品番マスタ",
        description: "仕入先から購入する製品・原材料（在庫の基準）を管理",
        href: "/masters/supplier-products",
        icon: Package,
        color: "bg-orange-50 text-orange-600 hover:bg-orange-100",
      },
      {
        title: "得意先品番マスタ",
        description: "得意先の注文書に記載される品番（変換ルール）を管理",
        href: ROUTES.MASTERS.CUSTOMER_ITEMS,
        icon: Database,
        color: "bg-teal-50 text-teal-600 hover:bg-teal-100",
      },
      {
        title: "メーカー品番マスタ",
        description: "仕入先から仕入れる品目の情報（品番、単位、リードタイムなど）を管理",
        href: ROUTES.MASTERS.SUPPLIER_PRODUCTS,
        icon: Database,
        color: "bg-green-50 text-green-600 hover:bg-green-100",
      },
    ],
  },
  {
    title: "取引先・拠点 (Partners & Locations)",
    description: "仕入先・得意先および拠点情報を管理",
    links: [
      {
        title: "仕入先マスタ",
        description: "仕入先の基本情報を管理（担当者設定を含む）",
        href: ROUTES.MASTERS.SUPPLIERS,
        icon: Building2,
        color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
      },
      {
        title: "得意先マスタ",
        description: "得意先の基本情報や納入ルールを管理",
        href: ROUTES.MASTERS.CUSTOMERS,
        icon: Users,
        color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
      },
      {
        title: "納入先マスタ",
        description: "納入先の基本情報を管理",
        href: "/delivery-places",
        icon: Truck,
        color: "bg-pink-50 text-pink-600 hover:bg-pink-100",
      },
      {
        title: "倉庫マスタ",
        description: "自社倉庫の基本情報を管理",
        href: ROUTES.MASTERS.WAREHOUSES,
        icon: Warehouse,
        color: "bg-purple-50 text-purple-600 hover:bg-purple-100",
      },
    ],
  },
  {
    title: "システム・設定 (System & Config)",
    description: "システム制御や単位換算などの設定",
    links: [
      {
        title: "出荷制御マスタ",
        description: "OCR変換ルールや出荷時の特殊制御を管理",
        href: "/masters/shipping-masters",
        icon: Truck,
        color: "bg-sky-50 text-sky-600 hover:bg-sky-100",
      },
      {
        title: "単位換算",
        description: "商品ごとの単位換算係数を管理",
        href: "/masters/uom-conversions",
        icon: Package,
        color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
      },
      {
        title: "主担当設定",
        description: "仕入先ごとの主担当者を設定",
        href: "/masters/primary-assignments",
        icon: UserCheck,
        color: "bg-amber-50 text-amber-600 hover:bg-amber-100",
      },
    ],
  },
  {
    title: "運用・管理",
    description: "ユーザーや初期化などの管理機能",
    links: [
      {
        title: "ユーザー管理",
        description: "ユーザーアカウントを管理",
        href: ROUTES.SETTINGS.USERS,
        icon: Users,
        color: "bg-gray-50 text-gray-600 hover:bg-gray-100",
        requireAdmin: true,
      },
      {
        title: "一括インポート・初期化",
        description: "マスタデータの一括登録とDB初期化",
        href: ROUTES.MASTERS.BULK_LOAD,
        icon: FilePenLine,
        color: "bg-rose-50 text-rose-600 hover:bg-rose-100",
        requireAdmin: true,
      },
    ],
  },
];

export function MastersPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("admin");

  // 管理者でない場合は管理者専用リンクを除外
  const visibleSections = masterSections
    .map((section) => ({
      ...section,
      links: section.links.filter((link) => !link.requireAdmin || isAdmin),
    }))
    .filter((section) => section.links.length > 0);

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      {/* ヘッダー */}
      <PageHeader title="マスタ管理" subtitle="システムの基本情報を管理します" />

      <MasterStatusAlert />

      {/* マスタリンクグリッド */}
      <div className="space-y-8">
        {visibleSections.map((section) => (
          <section key={section.title} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{section.description}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.links.map((master) => {
                const Icon = master.icon;
                return (
                  <Link
                    key={master.href}
                    to={master.href}
                    className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${master.color}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 group-hover:text-teal-600">
                          {master.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">{master.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function
function MasterStatusAlert() {
  const { data: status } = useMasterStatus();

  if (!status) return null;

  const hasUnmappedCustomerItems = status.unmapped_customer_items_count > 0;
  const hasUnmappedProducts = status.unmapped_products_count > 0;
  const hasUnmappedDeliverySettings = status.unmapped_customer_item_delivery_settings_count > 0;
  const isMissingPrimaryAssignments = !status.current_user_has_primary_assignments;

  if (
    !hasUnmappedCustomerItems &&
    !hasUnmappedProducts &&
    !hasUnmappedDeliverySettings &&
    !isMissingPrimaryAssignments
  )
    return null;

  return (
    <div className="space-y-4">
      {hasUnmappedCustomerItems && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-900">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>要確認: マッピング未設定のデータがあります</AlertTitle>
          <AlertDescription>
            仕入先が設定されていない得意先商品が{" "}
            <strong>{status.unmapped_customer_items_count}件</strong> あります。
            <Link
              to={ROUTES.MASTERS.CUSTOMER_ITEMS}
              className="ml-1 font-medium underline hover:text-red-950"
            >
              得意先品番マッピングを確認
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {hasUnmappedProducts && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-900">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>要確認: マッピング未設定のデータがあります</AlertTitle>
          <AlertDescription>
            仕入先が設定されていない商品構成が <strong>{status.unmapped_products_count}件</strong>{" "}
            あります。
            <Link
              to="/masters/supplier-products"
              className="ml-1 font-medium underline hover:text-red-950"
            >
              メーカー品番マスタを確認
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {hasUnmappedDeliverySettings && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-900">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>要確認: 納入先設定が未完了のデータがあります</AlertTitle>
          <AlertDescription>
            納入先が設定されていない得意先商品が{" "}
            <strong>{status.unmapped_customer_item_delivery_settings_count}件</strong> あります。
            <Link
              to={ROUTES.MASTERS.CUSTOMER_ITEMS}
              className="ml-1 font-medium underline hover:text-red-950"
            >
              得意先品番マッピングを確認
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {isMissingPrimaryAssignments && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-900">
          <AlertCircle className="h-4 w-4 text-blue-900" />
          <AlertTitle>お知らせ: 主担当が設定されていません</AlertTitle>
          <AlertDescription>
            あなたの主担当仕入先が設定されていません。業務を円滑に進めるため、設定を行ってください。
            <Link
              to="/masters/primary-assignments"
              className="ml-1 font-medium underline hover:text-blue-950"
            >
              主担当設定を確認
            </Link>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
