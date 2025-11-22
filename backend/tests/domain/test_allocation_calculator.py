"""Property-based tests for allocation calculator using Hypothesis.

These tests verify invariant properties that should always hold true,
regardless of the specific input data.
"""

from datetime import date, timedelta
from decimal import Decimal

from hypothesis import given, strategies as st

from app.domain.allocation import (
    AllocationRequest,
    LotCandidate,
    calculate_allocation,
)


# Strategy for generating valid lot candidates
@st.composite
def lot_candidate_strategy(draw, lot_id=None):
    """Generate a valid LotCandidate for testing."""
    if lot_id is None:
        lot_id = draw(st.integers(min_value=1, max_value=10000))
    
    lot_number = draw(st.text(min_size=5, max_size=20, alphabet=st.characters(whitelist_categories=("Lu", "Nd"))))
    
    # Generate expiry date (None or future date)
    has_expiry = draw(st.booleans())
    if has_expiry:
        days_to_expiry = draw(st.integers(min_value=-30, max_value=365))
        expiry_date = date.today() + timedelta(days=days_to_expiry)
    else:
        expiry_date = None
    
    # Generate quantities (ensure available_quantity <= current_quantity)
    current_quantity = draw(st.decimals(min_value=Decimal("0.001"), max_value=1000, places=3))
    allocated_quantity = draw(st.decimals(min_value=0, max_value=current_quantity, places=3))
    available_quantity = current_quantity - allocated_quantity
    
    status = draw(st.sampled_from(["active", "depleted", "expired", "quarantine"]))
    
    return LotCandidate(
        lot_id=lot_id,
        lot_number=lot_number,
        expiry_date=expiry_date,
        available_quantity=available_quantity,
        current_quantity=current_quantity,
        allocated_quantity=allocated_quantity,
        status=status,
    )


# Strategy for generating unique list of lot candidates
@st.composite
def lot_candidates_strategy(draw):
    """Generate a list of unique lot candidates."""
    size = draw(st.integers(min_value=0, max_value=20))
    candidates = []
    used_ids = set()
    
    for _ in range(size):
        # Generate unique lot_id
        lot_id = draw(st.integers(min_value=1, max_value=10000).filter(lambda x: x not in used_ids))
        used_ids.add(lot_id)
        candidate = draw(lot_candidate_strategy(lot_id=lot_id))
        candidates.append(candidate)
    
    return candidates


# Strategy for generating allocation requests
@st.composite
def allocation_request_strategy(draw):
    """Generate a valid AllocationRequest for testing."""
    order_line_id = draw(st.integers(min_value=1, max_value=1000))
    required_quantity = draw(st.decimals(min_value=Decimal("0.001"), max_value=1000, places=3))
    reference_date = date.today()
    allow_partial = draw(st.booleans())
    
    return AllocationRequest(
        order_line_id=order_line_id,
        required_quantity=required_quantity,
        reference_date=reference_date,
        allow_partial=allow_partial,
    )


class TestAllocationCalculatorProperties:
    """Property-based tests for allocation calculator."""
    
    @given(
        request=allocation_request_strategy(),
        candidates=lot_candidates_strategy(),
    )
    def test_allocation_never_exceeds_available(self, request, candidates):
        """Property: 引当合計数が在庫総数を超えないこと.
        
        どんな入力でも、引き当てられた数量の合計は、
        利用可能な在庫の合計を超えてはならない。
        """
        # Calculate total available quantity
        total_available = sum(
            lot.available_quantity
            for lot in candidates
            if lot.status == "active"
            and (lot.expiry_date is None or lot.expiry_date >= request.reference_date)
        )
        
        # Run allocation
        result = calculate_allocation(request, candidates)
        
        # Verify property
        assert result.total_allocated <= total_available, (
            f"Allocated {result.total_allocated} exceeds available {total_available}"
        )
    
    @given(
        request=allocation_request_strategy(),
        candidates=lot_candidates_strategy(),
    )
    def test_no_expired_lots_allocated(self, request, candidates):
        """Property: 期限切れロットが引当結果に含まれないこと.
        
        基準日時点で期限切れのロットは、
        引き当てられたロットリストに含まれてはならない。
        """
        result = calculate_allocation(request, candidates)
        
        for decision in result.allocated_lots:
            # Find the corresponding lot
            lot = next((c for c in candidates if c.lot_id == decision.lot_id), None)
            assert lot is not None, f"Allocated lot {decision.lot_id} not found in candidates"
            
            # Check expiry date
            if lot.expiry_date is not None:
                assert lot.expiry_date >= request.reference_date, (
                    f"Expired lot {lot.lot_number} (expiry: {lot.expiry_date}) "
                    f"was allocated on {request.reference_date}"
                )
    
    @given(
        request=allocation_request_strategy(),
        candidates=lot_candidates_strategy(),
    )
    def test_fefo_order_respected(self, request, candidates):
        """Property: FEFO順序が正しく適用されること.
        
        有効期限がある場合、より早く期限が切れるロットから
        優先的に引き当てられるべき。
        """
        result = calculate_allocation(request, candidates)
        
        # Extract allocated lots with expiry dates
        allocated_with_expiry = [
            decision for decision in result.allocated_lots
            if any(c.lot_id == decision.lot_id and c.expiry_date is not None for c in candidates)
        ]
        
        # Check FEFO order (should be sorted by expiry date ascending)
        for i in range(len(allocated_with_expiry) - 1):
            current_lot = next(
                c for c in candidates if c.lot_id == allocated_with_expiry[i].lot_id
            )
            next_lot = next(
                c for c in candidates if c.lot_id == allocated_with_expiry[i + 1].lot_id
            )
            
            if current_lot.expiry_date and next_lot.expiry_date:
                assert current_lot.expiry_date <= next_lot.expiry_date, (
                    f"FEFO order violated: lot {current_lot.lot_number} "
                    f"(expiry: {current_lot.expiry_date}) allocated after "
                    f"lot {next_lot.lot_number} (expiry: {next_lot.expiry_date})"
                )
    
    @given(
        request=allocation_request_strategy(),
        candidates=lot_candidates_strategy(),
    )
    def test_partial_allocation_respects_limit(self, request, candidates):
        """Property: 分納時に利用可能数量を超えないこと.
        
        各ロットからの引当数量は、そのロットの利用可能数量を
        超えてはならない。
        """
        result = calculate_allocation(request, candidates)
        
        for decision in result.allocated_lots:
            # Find the corresponding lot
            lot = next((c for c in candidates if c.lot_id == decision.lot_id), None)
            assert lot is not None
            
            # Check allocated quantity does not exceed available
            assert decision.allocated_qty <= lot.available_quantity, (
                f"Lot {lot.lot_number}: allocated {decision.allocated_qty} "
                f"exceeds available {lot.available_quantity}"
            )
    
    @given(
        request=allocation_request_strategy(),
        candidates=lot_candidates_strategy(),
    )
    def test_shortage_calculation_correctness(self, request, candidates):
        """Property: 不足数量の計算が正しいこと.
        
        不足数量 = 必要数量 - 引当合計数量
        """
        result = calculate_allocation(request, candidates)
        
        expected_shortage = request.required_quantity - result.total_allocated
        assert result.shortage == expected_shortage, (
            f"Shortage calculation incorrect: expected {expected_shortage}, "
            f"got {result.shortage}"
        )
    
    @given(
        request=allocation_request_strategy(),
        candidates=lot_candidates_strategy(),
    )
    def test_trace_logs_completeness(self, request, candidates):
        """Property: トレースログがすべての候補ロットをカバーすること.
        
        トレースログには、active状態のすべてのロットについて
        採用/不採用の記録が含まれるべき。
        """
        result = calculate_allocation(request, candidates)
        
        # At minimum, trace logs should record decisions for all active, valid lots
        # or have a rejection reason for lots that couldn't be used
        assert len(result.trace_logs) > 0 or len(candidates) == 0, (
            "Trace logs should not be empty when candidates exist"
        )
        
        # Verify all allocated lots are in trace logs
        allocated_lot_ids = {decision.lot_id for decision in result.allocated_lots}
        trace_lot_ids = {decision.lot_id for decision in result.trace_logs if decision.lot_id is not None}
        
        assert allocated_lot_ids.issubset(trace_lot_ids), (
            "All allocated lots should be present in trace logs"
        )
