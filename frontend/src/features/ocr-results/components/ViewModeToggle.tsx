import { cn } from "@/shared/libs/utils";

export function ViewModeToggle({
  viewMode,
  setViewMode,
  setSelectedIds,
}: {
  viewMode: "current" | "completed";
  setViewMode: (v: "current" | "completed") => void;
  setSelectedIds: (ids: any[]) => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
      <button
        onClick={() => {
          setViewMode("current");
          setSelectedIds([]);
        }}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
          viewMode === "current"
            ? "bg-white shadow-sm text-blue-700"
            : "text-gray-600 hover:text-gray-900",
        )}
      >
        未処理
      </button>
      <button
        onClick={() => {
          setViewMode("completed");
          setSelectedIds([]);
        }}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
          viewMode === "completed"
            ? "bg-white shadow-sm text-blue-700"
            : "text-gray-600 hover:text-gray-900",
        )}
      >
        完了済み
      </button>
    </div>
  );
}
