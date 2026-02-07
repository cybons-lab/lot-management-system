import { RefreshButton } from "@/components/ui";
import { MasterPageActions } from "@/shared/components/layout/MasterPageActions";
import { PageHeader } from "@/shared/components/layout/PageHeader";

interface CustomerListPageHeaderProps {
  showInactive: boolean;
  isLoading: boolean;
  onImportClick: () => void;
  onCreateClick: () => void;
}

export function CustomerListPageHeader({
  showInactive,
  isLoading,
  onImportClick,
  onCreateClick,
}: CustomerListPageHeaderProps) {
  return (
    <PageHeader
      title="得意先マスタ"
      subtitle="得意先の管理"
      backLink={{ to: "/masters", label: "マスタ管理" }}
      actions={
        <div className="flex gap-2">
          <RefreshButton
            queryKey={["customers", { includeInactive: showInactive }]}
            isLoading={isLoading}
          />
          <MasterPageActions
            exportApiPath="masters/customers/export/download"
            exportFilePrefix="customers"
            onImportClick={onImportClick}
            onCreateClick={onCreateClick}
          />
        </div>
      }
    />
  );
}
