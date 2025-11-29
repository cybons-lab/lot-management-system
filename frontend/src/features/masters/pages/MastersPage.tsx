import { Database, Users, Warehouse, Package, Building2 } from "lucide-react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/constants/routes";

interface MasterLink {
    title: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
}

const masterLinks: MasterLink[] = [
    {
        title: "得意先マスタ",
        description: "顧客情報を管理",
        href: ROUTES.MASTERS.CUSTOMERS,
        icon: Users,
        color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
    },
    {
        title: "倉庫マスタ",
        description: "倉庫情報を管理",
        href: ROUTES.MASTERS.WAREHOUSES,
        icon: Warehouse,
        color: "bg-purple-50 text-purple-600 hover:bg-purple-100",
    },
    {
        title: "商品マスタ",
        description: "製品情報を管理",
        href: ROUTES.MASTERS.PRODUCTS,
        icon: Package,
        color: "bg-green-50 text-green-600 hover:bg-green-100",
    },
    {
        title: "仕入先マスタ",
        description: "サプライヤー情報を管理",
        href: ROUTES.MASTERS.SUPPLIERS,
        icon: Building2,
        color: "bg-orange-50 text-orange-600 hover:bg-orange-100",
    },
    {
        title: "得意先商品マスタ",
        description: "顧客別製品情報を管理",
        href: ROUTES.MASTERS.CUSTOMER_ITEMS,
        icon: Database,
        color: "bg-teal-50 text-teal-600 hover:bg-teal-100",
    },
];

export function MastersPage() {
    return (
        <div className="space-y-6 px-6 py-6 md:px-8">
            {/* ヘッダー */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">マスタ管理</h1>
                <p className="mt-1 text-sm text-slate-600">
                    システムの基本情報を管理します
                </p>
            </div>

            {/* マスタリンクグリッド */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {masterLinks.map((master) => {
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
        </div>
    );
}
