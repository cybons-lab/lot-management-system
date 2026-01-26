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
}

export interface LotBlockData {
  lotId: number;
  lotInfo: LotInfo;
  destinations: DestinationRowData[];
  totalStock: number;
  totalShipment: number;
}

export interface ExcelViewData {
  header: ProductHeaderInfo;
  involvedDestinations: DestinationInfo[];
  dateColumns: string[]; // ISO date strings
  lots: LotBlockData[];
}
