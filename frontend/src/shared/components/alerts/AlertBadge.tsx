/**
 * AlertBadge component
 *
 * Displays alert severity with appropriate styling.
 */

import type { AlertSeverity } from "@/shared/types/alerts";

interface AlertBadgeProps {
    severity: AlertSeverity;
    className?: string;
}

const severityStyles: Record<AlertSeverity, string> = {
    critical: "bg-red-100 text-red-800 border-red-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
};

const severityLabels: Record<AlertSeverity, string> = {
    critical: "重要",
    warning: "警告",
    info: "情報",
};

export function AlertBadge({ severity, className = "" }: AlertBadgeProps) {
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${severityStyles[severity]} ${className}`}
        >
            {severityLabels[severity]}
        </span>
    );
}
