import { type ForecastCardHeaderProps } from "./types";

type ForecastCardHeaderInfoProps = Pick<
  ForecastCardHeaderProps,
  | "targetMonthLabel"
  | "customerDisplay"
  | "productName"
  | "productCode"
  | "deliveryPlaceDisplay"
  | "onToggle"
>;

export function ForecastCardHeaderInfo({
  targetMonthLabel,
  customerDisplay,
  productName,
  productCode,
  deliveryPlaceDisplay,
  onToggle,
}: ForecastCardHeaderInfoProps) {
  return (
    <button
      type="button"
      className="focus-visible:ring-primary/40 flex flex-1 flex-col items-start gap-1.5 text-left focus-visible:ring-2 focus-visible:outline-none"
      onClick={() => onToggle?.()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle?.();
        }
      }}
    >
      {/* Top row: Month label */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        <span className="text-gray-500">{targetMonthLabel}</span>
      </div>

      {/* Bottom row: Customer / Product / Delivery Place */}
      <div className="line-clamp-2 text-xs text-gray-500">
        <span className="text-sm font-semibold text-gray-500">{customerDisplay}</span>
        <span className="mx-1 text-gray-300">/</span>
        <span className="text-base font-bold text-gray-900">
          {productName}
          {productCode ? (
            <span className="text-sm font-semibold text-gray-700"> ({productCode})</span>
          ) : null}
        </span>
        <span className="mx-1 text-gray-300">/</span>
        <span className="text-sm text-gray-500">{deliveryPlaceDisplay}</span>
      </div>
    </button>
  );
}
