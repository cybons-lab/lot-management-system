// frontend/src/components/common/InfoRow.tsx

type Props = {
  label: string;
  value: string | number;
  highlight?: boolean;
};

export function InfoRow({ label, value, highlight }: Props) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}:</span>
      <span className={highlight ? "font-semibold text-sky-700" : "font-medium text-gray-900"}>
        {value}
      </span>
    </div>
  );
}
