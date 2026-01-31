import type { SmartReadPadRunListItem } from "../types";

import { SmartReadManagedTaskList } from "./SmartReadManagedTaskList";
import { SmartReadPadRunStatusList } from "./SmartReadPadRunStatusList";

import { TabsContent } from "@/components/ui";

interface TasksTabProps {
  runs: SmartReadPadRunListItem[] | undefined;
  configId: number | null;
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
}

export function SmartReadTasksTab({ runs, configId, selectedTaskId, onSelectTask }: TasksTabProps) {
  return (
    <TabsContent value="tasks" className="flex-1 min-h-0 data-[state=inactive]:hidden pt-4">
      <div className="h-full overflow-hidden flex flex-col gap-4">
        <SmartReadPadRunStatusList runs={runs} />
        <div className="flex-1 overflow-hidden">
          <SmartReadManagedTaskList
            configId={configId}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
          />
        </div>
      </div>
    </TabsContent>
  );
}
