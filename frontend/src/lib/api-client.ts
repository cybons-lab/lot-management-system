import type { Lot, CreateLotInput, UpdateLotInput, Shipment, CreateShipmentInput } from '@/types'

const API_BASE_URL = 'http://localhost:8000/api'

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || 'API request failed')
  }
  return response.json()
}

export const api = {
  // Lot endpoints
  async getLots(): Promise<Lot[]> {
    const response = await fetch(`${API_BASE_URL}/lots`)
    return handleResponse<Lot[]>(response)
  },

  async getLot(id: number): Promise<Lot> {
    const response = await fetch(`${API_BASE_URL}/lots/${id}`)
    return handleResponse<Lot>(response)
  },

  async createLot(data: CreateLotInput): Promise<Lot> {
    const response = await fetch(`${API_BASE_URL}/lots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse<Lot>(response)
  },

  async updateLot(id: number, data: UpdateLotInput): Promise<Lot> {
    const response = await fetch(`${API_BASE_URL}/lots/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse<Lot>(response)
  },

  async deleteLot(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/lots/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('Failed to delete lot')
    }
  },

  // Shipment endpoints
  async getShipments(): Promise<Shipment[]> {
    const response = await fetch(`${API_BASE_URL}/shipments`)
    return handleResponse<Shipment[]>(response)
  },

  async createShipment(data: CreateShipmentInput): Promise<Shipment> {
    const response = await fetch(`${API_BASE_URL}/shipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse<Shipment>(response)
  },

  // Admin endpoints
  async resetDatabase(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/admin/reset-db`, {
      method: 'POST',
    })
    return handleResponse<{ message: string }>(response)
  },
}
