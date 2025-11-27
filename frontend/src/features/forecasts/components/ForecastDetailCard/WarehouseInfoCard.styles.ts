/**
 * WarehouseInfoCard - Style definitions
 */

import { cva } from "class-variance-authority";

export const cardRoot = "rounded-lg border bg-gradient-to-br from-blue-50 to-green-50 p-3";

export const cardHeader = "mb-2 flex items-center gap-2";

export const cardTitle = "text-sm font-semibold text-gray-800";

export const warehouseSection = "mb-2 rounded-md border border-gray-200 bg-white p-2 last:mb-0";

export const warehouseName = "mb-1.5 text-xs font-semibold text-gray-700";

// 2列グリッドレイアウト（左寄せ）
export const infoGrid = "grid grid-cols-2 gap-x-4 gap-y-1";

export const infoRow = "flex items-start gap-1 text-xs";

export const infoLabel = "min-w-[2.5rem] text-gray-600";

export const infoValue = cva("font-semibold tabular-nums", {
    variants: {
        type: {
            inventory: "text-blue-700",
            inbound: "text-green-700",
            zero: "text-gray-400",
        },
    },
    defaultVariants: {
        type: "inventory",
    },
});

export const lotCount = "ml-1 text-[10px] text-gray-500";

export const inboundList = "space-y-0.5";

export const inboundItem = "flex items-center gap-1.5 text-xs text-gray-700";

export const inboundDate = "font-medium";

export const inboundQuantity = "text-green-600";

export const noData = "text-xs text-gray-500";

export const detailButton = "mt-2 h-7 w-full bg-white text-xs hover:bg-blue-50";

export const emptyState = "flex flex-col items-center justify-center py-6 text-center";

export const emptyIcon = "mb-2 text-3xl";

export const emptyText = "text-xs text-gray-500";
