interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  highlight?: boolean;
}

export function StatCard({ title, value, description, highlight }: StatCardProps) {
  return (
    <div
      className={`group rounded-xl border bg-white/90 p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
        highlight
          ? "border-blue-200/80 ring-2 ring-inset ring-blue-50"
          : "border-slate-200"
      }`}
    >
      <div className="text-sm font-semibold text-slate-600">{title}</div>
      <div className={`mt-3 text-3xl font-bold ${highlight ? "text-blue-600" : "text-slate-900"}`}>
        {value}
      </div>
      {description && <div className="mt-2 text-xs text-slate-500">{description}</div>}
    </div>
  );
}
