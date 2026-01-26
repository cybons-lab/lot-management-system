import { type ProductHeaderInfo } from "./types";

interface Props {
  data: ProductHeaderInfo;
}

export function ProductHeader({ data }: Props) {
  return (
    <div className="bg-slate-50 border border-slate-300 text-sm overflow-hidden rounded-t-lg">
      <div className="grid grid-cols-12 border-b border-slate-300">
        <div className="col-span-1 bg-slate-200 p-1 font-bold border-r border-slate-300">
          仕入先
        </div>
        <div className="col-span-2 bg-slate-200 p-1 font-bold border-r border-slate-300">
          仕入先名称
        </div>
        <div className="col-span-1 bg-slate-200 p-1 font-bold border-r border-slate-300">
          荷受倉庫
        </div>
        <div className="col-span-1 bg-slate-200 p-1 font-bold border-r border-slate-300">
          倉庫名称
        </div>
        <div className="col-span-1 bg-slate-200 p-1 font-bold border-r border-slate-300">単位</div>
        <div className="col-span-1 bg-slate-200 p-1 font-bold border-r border-slate-300">
          収容数
        </div>
        <div className="col-span-1 bg-slate-200 p-1 font-bold border-r border-slate-300">
          保証期間
        </div>
        <div className="col-span-4 bg-slate-200 p-1 font-bold">商品名</div>
      </div>
      <div className="grid grid-cols-12">
        <div className="col-span-1 p-1 border-r border-slate-300">{data.supplierCode}</div>
        <div
          className="col-span-2 p-1 border-r border-slate-300 truncate"
          title={data.supplierName}
        >
          {data.supplierName}
        </div>
        <div className="col-span-1 p-1 border-r border-slate-300">{data.warehouseCode}</div>
        <div className="col-span-1 p-1 border-r border-slate-300">{data.warehouseName}</div>
        <div className="col-span-1 p-1 border-r border-slate-300">{data.unit}</div>
        <div className="col-span-1 p-1 border-r border-slate-300">{data.capacity}</div>
        <div className="col-span-1 p-1 border-r border-slate-300">{data.warrantyPeriod}</div>
        <div className="col-span-4 p-1 truncate" title={data.productName}>
          {data.productName}
        </div>
      </div>
    </div>
  );
}
