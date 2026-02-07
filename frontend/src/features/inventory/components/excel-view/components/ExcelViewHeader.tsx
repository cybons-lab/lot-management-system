import { ArrowLeft, BarChart3, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ExcelViewHeaderProps {
    supplierName?: string;
    productName?: string;
    onIntakeClick: () => void;
}

/**
 * ExcelView ページのヘッダーコンポーネント
 */
export function ExcelViewHeader({
    supplierName,
    productName,
    onIntakeClick,
}: ExcelViewHeaderProps) {
    const navigate = useNavigate();

    return (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">引当Excel表示</h1>
                    <p className="text-slate-500 text-sm">
                        {supplierName || "---"} - {productName || "---"}
                    </p>
                </div>
            </div>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => navigate("/reports/monthly")}
                    title="月次レポートを表示"
                >
                    <BarChart3 className="h-4 w-4" />
                    月次レポート
                </Button>
                <Button className="gap-2" onClick={onIntakeClick}>
                    <Plus className="h-4 w-4" />
                    新規ロット受入
                </Button>
            </div>
        </div>
    );
}
