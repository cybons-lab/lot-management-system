import { SmartReadSavedDataList } from "./SmartReadSavedDataList";

import { TabsContent } from "@/components/ui";

export function SmartReadSavedTab({ configId }: { configId: number | null }) {
  return (
    <TabsContent value="saved" className="flex-1 min-h-0 data-[state=inactive]:hidden pt-4">
      <div className="h-full overflow-hidden">
        <SmartReadSavedDataList configId={configId} />
      </div>
    </TabsContent>
  );
}
