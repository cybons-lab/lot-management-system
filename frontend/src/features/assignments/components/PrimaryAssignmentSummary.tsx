import type { SupplierGroup } from "../types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export function PrimaryAssignmentSummary({ supplierGroups }: { supplierGroups: SupplierGroup[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">総仕入先数</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{supplierGroups.length}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">主担当設定済み</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {supplierGroups.filter((g) => g.primaryUser).length}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">主担当未設定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {supplierGroups.filter((g) => !g.primaryUser).length}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
