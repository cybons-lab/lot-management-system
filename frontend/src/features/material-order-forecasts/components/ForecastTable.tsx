import { parseISO, addMonths, lastDayOfMonth } from "date-fns";
import { useMemo } from "react";

import { type MaterialOrderForecast } from "../api";

import { DataTable, type Column } from "@/shared/components/data/DataTable";

interface ForecastTableProps {
  data: MaterialOrderForecast[];
  isLoading?: boolean;
  targetMonth: string; // YYYY-MM
}

/**
 * メタデータカラム（A-K列）の取得
 */
const getMetaColumns = (): Column<MaterialOrderForecast>[] => [
  {
    id: "target_month",
    header: "対象年月",
    cell: (row) => <span className="font-medium text-sm">{row.target_month}</span>,
    width: "110px",
    sticky: "left",
  },
  {
    id: "material_code",
    header: "材質コード",
    cell: (row) => <span className="font-mono text-sm">{row.material_code}</span>,
    width: "120px",
    sticky: "left",
  },
  {
    id: "unit",
    header: "単位",
    cell: (row) => <span className="text-sm">{row.unit}</span>,
    width: "60px",
  },
  {
    id: "warehouse_code",
    header: "倉庫",
    cell: (row) => <span className="text-sm">{row.warehouse_code}</span>,
    width: "80px",
  },
  {
    id: "jiku_code",
    header: "次区",
    cell: (row) => <span className="text-sm">{row.jiku_code}</span>,
    width: "80px",
  },
  {
    id: "delivery_place",
    header: "納入先",
    cell: (row) => <span className="text-sm">{row.delivery_place}</span>,
    width: "100px",
  },
  {
    id: "support_division",
    header: "支給先",
    cell: (row) => <span className="text-sm">{row.support_division}</span>,
    width: "100px",
  },
  {
    id: "procurement_type",
    header: "支購区分",
    cell: (row) => <span className="text-sm">{row.procurement_type}</span>,
    width: "100px",
  },
  {
    id: "maker_code",
    header: "メーカーコード",
    cell: (row) => <span className="text-sm">{row.maker_code}</span>,
    width: "120px",
  },
  {
    id: "maker_name",
    header: "メーカー名",
    cell: (row) => <span className="text-sm">{row.maker_name}</span>,
    width: "150px",
  },
  {
    id: "material_name",
    header: "材質名",
    cell: (row) => <span className="text-sm">{row.material_name}</span>,
    width: "200px",
  },
];

/**
 * 数量情報カラム（L-Q列）の取得
 */
const getQtyInfoColumns = (): Column<MaterialOrderForecast>[] => [
  {
    id: "delivery_lot",
    header: "納入ロット",
    cell: (row) => (
      <span className="text-sm text-right">{row.delivery_lot?.toLocaleString() || "-"}</span>
    ),
    width: "100px",
    align: "right",
  },
  {
    id: "order_quantity",
    header: "発注",
    cell: (row) => (
      <span className="text-sm text-right">{row.order_quantity?.toLocaleString() || "-"}</span>
    ),
    width: "80px",
    align: "right",
  },
  {
    id: "month_start_instruction",
    header: "月初指示",
    cell: (row) => (
      <span className="text-sm text-right">
        {row.month_start_instruction?.toLocaleString() || "-"}
      </span>
    ),
    width: "100px",
    align: "right",
  },
  {
    id: "manager_name",
    header: "担当者",
    cell: (row) => <span className="text-sm">{row.manager_name}</span>,
    width: "100px",
  },
  {
    id: "monthly_instruction_quantity",
    header: "月間指示数量",
    cell: (row) => (
      <span className="text-sm text-right">
        {row.monthly_instruction_quantity?.toLocaleString() || "-"}
      </span>
    ),
    width: "120px",
    align: "right",
  },
  {
    id: "next_month_notice",
    header: "次月内示",
    cell: (row) => (
      <span className="text-sm text-right">{row.next_month_notice?.toLocaleString() || "-"}</span>
    ),
    width: "100px",
    align: "right",
  },
];

/**
 * 日別数量カラム（1-31日）の取得
 */
const getDayColumns = (lastDay: number, monthNum: number): Column<MaterialOrderForecast>[] =>
  Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const exists = day <= lastDay;
    return {
      id: `day_${day}`,
      header: exists ? `${monthNum}/${day}` : "-",
      cell: (row) => {
        const qty = row.daily_quantities?.[day.toString()];
        return (
          <span className={`text-sm ${qty === 0 || !qty ? "text-slate-300" : "font-medium"}`}>
            {qty?.toLocaleString() || "-"}
          </span>
        );
      },
      width: "60px",
      align: "right",
    };
  });

/**
 * 期間別数量カラム（1-10日, 中旬, 下旬）の取得
 */
const getPeriodColumns = (nextMonthNum: number): Column<MaterialOrderForecast>[] => {
  const periodLabels = [
    ...Array.from({ length: 10 }, (_, i) => (i + 1).toString()),
    "中旬",
    "下旬",
  ];
  return periodLabels.map((label) => {
    const isSpecial = label === "中旬" || label === "下旬";
    const header = isSpecial ? `${nextMonthNum}月${label}` : `${nextMonthNum}/${label}`;

    return {
      id: `period_${label}`,
      header,
      cell: (row) => {
        const qty = row.period_quantities?.[label];
        const isEmpty = qty === 0 || !qty;
        return (
          <span className={`text-sm ${isEmpty ? "text-slate-300" : "font-medium text-blue-600"}`}>
            {qty?.toLocaleString() || "-"}
          </span>
        );
      },
      width: "80px",
      align: "right",
    };
  });
};

export function ForecastTable({ data, isLoading, targetMonth }: ForecastTableProps) {
  const columns = useMemo(() => {
    const currentMonthDate = parseISO(`${targetMonth}-01`);
    const nextMonthDate = addMonths(currentMonthDate, 1);

    const lastDayOfCurrent = lastDayOfMonth(currentMonthDate).getDate();
    const currentMonthNum = currentMonthDate.getMonth() + 1;
    const nextMonthNum = nextMonthDate.getMonth() + 1;

    return [
      ...getMetaColumns(),
      ...getQtyInfoColumns(),
      ...getDayColumns(lastDayOfCurrent, currentMonthNum),
      ...getPeriodColumns(nextMonthNum),
    ];
  }, [targetMonth]);

  return (
    <DataTable
      data={data}
      columns={columns}
      {...(isLoading !== undefined ? { isLoading } : {})}
      getRowId={(row) => row.id.toString()}
      dense
      emptyMessage={`${targetMonth} のデータは見つかりませんでした`}
    />
  );
}
