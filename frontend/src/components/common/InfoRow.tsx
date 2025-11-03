// frontend/src/components/common/InfoRow.tsx
import React from "react";

export default function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span
        className={`text-sm ${
          highlight ? "font-semibold text-foreground" : "text-foreground/90"
        }`}>
        {value}
      </span>
    </div>
  );
}
