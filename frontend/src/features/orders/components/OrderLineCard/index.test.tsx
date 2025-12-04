import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OrderLineCard } from './index'
import * as hooks from '@/features/orders/hooks/useOrderLineComputed'
import * as allocHooks from '@/features/allocations/hooks'

// Mock child components to avoid deep rendering and dependency issues
vi.mock('@/features/orders/components/display/OrderLineHeader', () => ({
    OrderLineHeader: ({ productName }: { productName: string }) => <div data-testid="order-line-header">{productName}</div>
}))

vi.mock('@/features/allocations/components', () => ({
    AllocationProgress: () => <div data-testid="allocation-progress">Progress</div>
}))

vi.mock('@/features/orders/components', () => ({
    ForecastSection: () => <div data-testid="forecast-section">Forecast</div>,
    LotListWithAllocation: ({ onAllocate, onCancelAllocation }: any) => (
        <div data-testid="lot-list">
            <button onClick={() => onAllocate(1, 10)}>Allocate</button>
            <button onClick={() => onCancelAllocation(100)}>Cancel</button>
        </div>
    )
}))

describe('OrderLineCard', () => {
    const mockCreateAlloc = { mutate: vi.fn() }
    const mockCancelAlloc = { mutate: vi.fn() }
    const mockOnRematch = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()

        // Mock useOrderLineComputed
        vi.spyOn(hooks, 'useOrderLineComputed').mockReturnValue({
            lineId: 1,
            productId: 101,
            productName: 'Test Product',
            productCode: 'TP-001',
            status: 'open',
            totalQty: 100,
            unit: 'EA',
            allocatedTotal: 0,
            remainingQty: 100,
            progressPct: 0,
            customerCode: 'CUST-001',
            customerName: 'Test Customer',
            orderDate: '2025-01-01',
            dueDate: '2025-01-10',
            plannedShipDate: '2025-01-09',
            shippingLeadTime: '1 day',
            ids: { orderId: 1, lineId: 1 },
        } as any)

        // Mock useAllocationActions
        vi.spyOn(allocHooks, 'useAllocationActions').mockReturnValue({
            candidatesQ: { data: { items: [], warnings: [] }, isLoading: false } as any,
            createAlloc: mockCreateAlloc as any,
            cancelAlloc: mockCancelAlloc as any,
            saveWareAlloc: { mutate: vi.fn() } as any,
            enabled: true,
        })
    })

    it('renders order information correctly', () => {
        render(<OrderLineCard order={null} line={null} />)

        expect(screen.getByTestId('order-line-header')).toHaveTextContent('Test Product')
        expect(screen.getByText('Test Product')).toBeInTheDocument()
        expect(screen.getByText('100 EA')).toBeInTheDocument()
        expect(screen.getByText('CUST-001 Test Customer')).toBeInTheDocument()
    })

    it('renders allocation progress and forecast section', () => {
        render(<OrderLineCard order={null} line={null} />)

        expect(screen.getByTestId('allocation-progress')).toBeInTheDocument()
        expect(screen.getByTestId('forecast-section')).toBeInTheDocument()
    })

    it('calls onRematch when rematch button is clicked', () => {
        render(<OrderLineCard order={null} line={null} onRematch={mockOnRematch} />)

        const rematchButton = screen.getByText('ロット再マッチ')
        fireEvent.click(rematchButton)

        expect(mockOnRematch).toHaveBeenCalledTimes(1)
    })

    it('calls createAlloc.mutate when allocate is triggered', () => {
        render(<OrderLineCard order={null} line={null} />)

        const allocateButton = screen.getByText('Allocate')
        fireEvent.click(allocateButton)

        expect(mockCreateAlloc.mutate).toHaveBeenCalledWith(
            { allocations: [{ lot_id: 1, quantity: 10 }] },
            expect.any(Object)
        )
    })

    it('calls cancelAlloc.mutate when cancel is triggered', () => {
        render(<OrderLineCard order={null} line={null} />)

        const cancelButton = screen.getByText('Cancel')
        fireEvent.click(cancelButton)

        expect(mockCancelAlloc.mutate).toHaveBeenCalledWith(
            { allocation_ids: [100] },
            expect.any(Object)
        )
    })
})
