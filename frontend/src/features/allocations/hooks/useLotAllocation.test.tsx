import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLotAllocation } from './useLotAllocation'
import * as api from '../api'
import * as ordersHook from './api/useOrdersForAllocation'
import * as mastersHook from '@/hooks/api/useMastersQuery'

// Mock API
vi.mock('../api', () => ({
    getAllocationCandidates: vi.fn(),
    saveManualAllocations: vi.fn(),
}))

// Mock Hooks
vi.mock('./api/useOrdersForAllocation', () => ({
    useOrdersForAllocation: vi.fn(),
}))

vi.mock('@/hooks/api/useMastersQuery', () => ({
    useCustomersQuery: vi.fn(),
    useProductsQuery: vi.fn(),
}))

describe('useLotAllocation', () => {
    let queryClient: QueryClient

    const mockOrders = [
        {
            id: 1,
            order_number: 'ORD-001',
            lines: [
                {
                    id: 101,
                    product_id: 1,
                    order_quantity: 10,
                    allocated_quantity: 0,
                },
            ],
        },
    ]

    const mockCandidates = {
        items: [
            {
                lot_id: 1,
                lot_number: 'LOT-A',
                quantity: 50,
                current_quantity: '50',
                allocated_quantity: '0',
                available_quantity: '50',
                product_id: 1,
                status: 'clean',
                expiry_date: '2025-12-31',
                warehouse_id: 1,
                warehouse_name: 'Main Warehouse',
                created_at: '2025-01-01',
            },
            {
                lot_id: 2,
                lot_number: 'LOT-B',
                quantity: 50,
                current_quantity: '50',
                allocated_quantity: '0',
                available_quantity: '50',
                product_id: 1,
                status: 'clean',
                expiry_date: '2026-01-01',
                warehouse_id: 1,
                warehouse_name: 'Main Warehouse',
                created_at: '2025-01-02',
            },
        ],
        total: 2,
    }

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        })

        // Setup default mocks
        vi.mocked(ordersHook.useOrdersForAllocation).mockReturnValue({
            data: mockOrders,
            isLoading: false,
        } as any)

        vi.mocked(mastersHook.useCustomersQuery).mockReturnValue({
            data: [],
            isLoading: false,
        } as any)

        vi.mocked(mastersHook.useProductsQuery).mockReturnValue({
            data: [],
            isLoading: false,
        } as any)

        vi.mocked(api.getAllocationCandidates).mockResolvedValue(mockCandidates)
        vi.mocked(api.saveManualAllocations).mockResolvedValue({ success: true })
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient} > {children} </QueryClientProvider>
    )

    it('loads initial data', async () => {
        const { result } = renderHook(() => useLotAllocation(), { wrapper })

        expect(result.current.orders).toEqual(mockOrders)
        expect(result.current.isLoadingOrders).toBe(false)
    })

    it('updates allocation state with changeAllocation', () => {
        const { result } = renderHook(() => useLotAllocation(), { wrapper })

        act(() => {
            result.current.changeAllocation(101, 1, 5)
        })

        expect(result.current.allocationsByLine[101]).toEqual({ 1: 5 })
        expect(result.current.getAllocationsForLine(101)).toEqual({ 1: 5 })
    })

    it('auto-allocates using FEFO strategy', async () => {
        const { result } = renderHook(() => useLotAllocation(), { wrapper })

        // Wait for candidates to be fetched
        await waitFor(() => {
            expect(result.current.isCandidatesLoading).toBe(false)
        })

        await act(async () => {
            await result.current.autoAllocate(101)
        })

        expect(result.current.allocationsByLine[101]).toEqual({ 1: 10 })
    })

    it('saves allocations correctly', async () => {
        const { result } = renderHook(() => useLotAllocation(), { wrapper })

        act(() => {
            result.current.changeAllocation(101, 1, 5)
        })

        await act(async () => {
            await result.current.saveAllocations(101)
        })

        expect(api.saveManualAllocations).toHaveBeenCalledWith({
            order_line_id: 101,
            allocations: [
                {
                    lot_id: 1,
                    quantity: 5,
                },
            ],
        })

        expect(result.current.toast).toEqual({
            message: '引当を登録しました',
            variant: 'success',
        })
    })

    it('detects over-allocation', () => {
        const { result } = renderHook(() => useLotAllocation(), { wrapper })

        act(() => {
            result.current.changeAllocation(101, 1, 15) // Order qty is 10
        })

        expect(result.current.isOverAllocated(101)).toBe(true)
    })
})
