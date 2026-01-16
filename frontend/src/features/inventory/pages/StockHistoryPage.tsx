/**
 * StockHistoryPage
 *
 * 入出庫履歴ページ - 入庫履歴と出庫履歴をタブ切り替えで表示
 */
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui";
import { IntakeHistoryTab } from "@/features/inventory/components/IntakeHistoryTab";
import { WithdrawalHistoryTab } from "@/features/inventory/components/WithdrawalHistoryTab";
import { PageHeader } from "@/shared/components/layout/PageHeader";

type HistoryTab = "intake" | "withdrawal";

export function StockHistoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state from URL
  const initialTab = (searchParams.get("tab") as HistoryTab) || "intake";
  const [activeTab, setActiveTab] = useState<HistoryTab>(initialTab);

  // Update URL when tab changes
  const handleTabChange = (tab: HistoryTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleBack = () => {
    navigate("/inventory");
  };

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            在庫管理
          </Button>
          <PageHeader title="入出庫履歴" subtitle="入庫・出庫の履歴一覧" />
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={activeTab === "intake" ? "default" : "outline"}
          size="sm"
          onClick={() => handleTabChange("intake")}
        >
          <ArrowDownToLine className="mr-2 h-4 w-4" />
          入庫履歴
        </Button>
        <Button
          variant={activeTab === "withdrawal" ? "default" : "outline"}
          size="sm"
          onClick={() => handleTabChange("withdrawal")}
        >
          <ArrowUpFromLine className="mr-2 h-4 w-4" />
          出庫履歴
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === "intake" && <IntakeHistoryTab />}
      {activeTab === "withdrawal" && <WithdrawalHistoryTab />}
    </div>
  );
}
