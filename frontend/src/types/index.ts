export interface Lot {
  id: number
  lot_id: string
  product_name: string
  quantity: number
  received_date: string
  expiry_date?: string
  status: 'active' | 'shipped' | 'expired'
  location?: string
  supplier?: string
  notes?: string
}

export interface CreateLotInput {
  lot_id: string
  product_name: string
  quantity: number
  received_date: string
  expiry_date?: string
  location?: string
  supplier?: string
  notes?: string
}

export interface UpdateLotInput extends Partial<CreateLotInput> {
  status?: 'active' | 'shipped' | 'expired'
}

export interface Shipment {
  id: number
  lot_id: number
  quantity_shipped: number
  shipped_date: string
  destination?: string
  notes?: string
}

export interface CreateShipmentInput {
  lot_id: number
  quantity_shipped: number
  shipped_date: string
  destination?: string
  notes?: string
}
