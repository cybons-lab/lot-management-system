import { BigStatColumn } from "./subcomponents/BigStatColumn";
import { DateGrid } from "./subcomponents/DateGrid";
import { LotInfoGroups } from "./subcomponents/LotInfoGroups";
import { ShipmentTable } from "./subcomponents/ShipmentTable";
import { type LotBlockData } from "./types";

interface Props {
  lot: LotBlockData;
  dateColumns: string[];
}

export function LotSection({ lot, dateColumns }: Props) {
  const { lotInfo, destinations, totalStock, totalShipment } = lot;

  return (
    <div className="border border-slate-300 mt-6 text-xs bg-white shadow-sm rounded-md overflow-hidden min-w-max">
      <div className="flex shrink-0">
        {/* 1. Lot Information (Fixed) */}
        <LotInfoGroups lotInfo={lotInfo} />

        {/* 2. Inbound Qty (Big Vertical) */}
        <BigStatColumn
          label="入庫数"
          value={lotInfo.inboundQty}
          unit={lotInfo.unit}
          variant="blue"
        />

        {/* 3. Destination and Shipment Total */}
        <ShipmentTable destinations={destinations} totalShipment={totalShipment} />

        {/* 4. Current Stock (Big Vertical) */}
        <BigStatColumn
          label="現在の在庫"
          value={totalStock}
          unit={lotInfo.unit}
          variant="emerald"
        />

        {/* 5. Date Columns (Scrollable Area) */}
        <DateGrid dateColumns={dateColumns} destinations={destinations} />
      </div>
    </div>
  );
}
