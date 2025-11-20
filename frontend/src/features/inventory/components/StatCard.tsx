interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  highlight?: boolean;
}

export function StatCard({ title, value, description, highlight }: StatCardProps) {
  return (
    <div
      className={`group rounded-xl border bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
        highlight
          ? "border-t border-r border-b border-l-4 border-gray-200 border-l-blue-500"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="text-sm font-medium text-gray-600">{title}</div>
      <div className={`mt-3 text-3xl font-bold ${highlight ? "text-blue-600" : "text-gray-900"}`}>
        {value}
      </div>
      {description && <div className="mt-2 text-xs text-gray-500">{description}</div>}
    </div>
  );
}
