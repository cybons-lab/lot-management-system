export interface ProductHeaderInfo {
  supplierCode: string;
  supplierName: string;
  warehouseCode: string;
  warehouseName: string;
  unit: string;
  capacity: string;
  warrantyPeriod: string;
  productName: string;
  productCode: string;
  // Customer item info (when filtering by customer_item)
  customerName?: string;
  customerCode?: string;
  customerPartNo?: string;
}

export interface DestinationInfo {
  deliveryPlaceId: number;
  customerCode: string;
  customerName: string;
  deliveryPlaceName: string;
  deliveryPlaceCode: string;
  customerPartNo: string;
  makerPartNo: string;
  deliveryType: string;
  coaRecipient: string;
}

export interface LotInfo {
  inboundDate: string;
  lotNo: string;
  inboundNo: string;
  orderNo: string;
  expiryDate: string;
  inboundQty: number;
  unit: string;
}

export interface ShipmentPlan {
  date: string;
  quantity: number;
}

export interface DestinationRowData {
  deliveryPlaceId: number;
  customerId: number;
  destination: DestinationInfo;
  shipmentQtyByDate: Record<string, number>; // date string -> quantity
  coaIssueDate?: string;
  totalShipmentQty: number;
  // Phase 9: Cell-level comments and manual shipment dates
  commentByDate?: Record<string, string>; // date string -> comment
  manualShipmentDateByDate?: Record<string, string>; // date string -> manual shipment date
}

export interface LotBlockData {
  lotId: number;
  lotInfo: LotInfo;
  lotNumber?: string | null;
  destinations: DestinationRowData[];
  totalStock: number;
  totalShipment: number;
  // ステータス判定用の追加フィールド
  status?: string;
  inspectionStatus?: string;
  receivedDate?: string | null;
  expiryDate?: string | null;
  // 倉庫情報（全倉庫統合表示のため）
  warehouseName?: string;
  warehouseCode?: string;
  // Phase 9: Remarks field
  remarks?: string | null;
}

export interface ExcelViewData {
  header: ProductHeaderInfo;
  involvedDestinations: DestinationInfo[];
  dateColumns: string[]; // ISO date strings
  lots: LotBlockData[];
  // Phase 9: Page-level notes
  pageNotes?: string | null;
  deliverySettingId?: number | null; // For saving page notes
  deliverySettingVersion?: number | null; // For optimistic locking
}
