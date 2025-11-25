# Forecast Test Data Investigation Report

## Executive Summary

The Lot Management System generates forecast test data through the **Simulation Service** (`seed_simulate_service.py`).

> **Note:** The legacy Simple Seed Service (`seeds_service.py`) was removed in the November 2025 refactoring. All forecast generation is now consolidated in `seed_simulate_service.py`.

The system uses a **header-detail (ヘッダ・明細)** structure with:
- **ForecastHeader**: Parent record linking customer, delivery place, and forecast period
- **ForecastLine**: Detail records with quantities and delivery dates (daily, dekad, monthly)

---

## 1. Data Structure

### Database Models
**Location:** `/backend/app/models/forecast_models.py`

#### ForecastHeader Table
```
forecast_headers (parent table)
├─ id: BigInteger (PK)
├─ customer_id: BigInteger (FK → customers)
├─ delivery_place_id: BigInteger (FK → delivery_places)
├─ forecast_number: String(50) [UNIQUE]
├─ forecast_start_date: Date
├─ forecast_end_date: Date
├─ status: Enum (active|completed|cancelled)
├─ created_at: DateTime
└─ updated_at: DateTime
```

#### ForecastLine Table
```
forecast_lines (detail table)
├─ id: BigInteger (PK)
├─ forecast_id: BigInteger (FK → forecast_headers, CASCADE)
├─ product_id: BigInteger (FK → products)
├─ delivery_date: Date
├─ forecast_quantity: Decimal(15,3)
├─ unit: String(20)
├─ created_at: DateTime
└─ updated_at: DateTime
```

**Backward Compatibility:**
- Alias: `Forecast = ForecastHeader` (line 139 for legacy code)

---

## 2. Test Data Generation (Enhanced Simulation Service)

**Function:** `create_forecast_data()` (in `seed_simulate_service.py`)
**Usage:** Production-grade test data with header-detail structure
**Phase:** 2.5 of `run_seed_simulation()`

### Data Generation Logic

```python
def create_forecast_data(
    db: Session,
    params: dict,  # Contains forecasts flag (1=enabled, 0=disabled)
    masters: dict,  # customers, products, delivery_places
    rng: Random,
    tracker,  # Job tracker for logging
    task_id: str,
) → int  # Returns forecast_line count
```

### Date Ranges (Updated November 2025)

#### Daily Forecasts
- **Start:** `base_date - 31 days`
- **End:** `2 months later, 10th day`
- **Example (2025-11-19):** 2025-10-19 to 2026-01-10 (~83 days)

#### Dekad (旬) Forecasts
- **Period:** `start_date to end of 2 months later`
- **Dates:** 1st, 11th, 21st of each month
- **Example:** 2025-10-19 to 2026-01-31 (~9-10 dekads)

#### Monthly Forecasts
- **Period:** Current month to 3 months ahead (4 months total)
- **Dates:** 1st of each month
- **Example (November 2025):** November, December, January, February

### Product Selection

**All products are included** (not random sample):
```python
products_for_header = list(all_products)  # All products
```

### Dataset Structure

1. **Forecast Headers** (one per delivery place)
   - Forecast period: `daily_start` to `daily_end`
   - Forecast number: `SEED-{delivery_place_code}-{start_date:%Y%m%d}[-{suffix}]`
   - Status: `"active"`
   - Customer ID: Linked from delivery place

2. **Forecast Lines** (three types per header)
   - **Daily:** All products × all days in range
   - **Dekad:** All products × all dekads (1st, 11th, 21st)
   - **Monthly:** All products × 4 months
   - Quantity per line: `Decimal(rng.randint(10, 1000))`
   - Unit: Product's base_unit (e.g., "PCS", "BOX", "SET")

### Total Forecast Records Formula

```
Daily Lines = delivery_places × products × days (~83)
Dekad Lines = delivery_places × products × dekads (~9-10)
Monthly Lines = delivery_places × products × 4

Total Lines = Daily + Dekad + Monthly
```

### Example Calculation

**Input (small profile with 5 delivery places, 40 products):**
```
delivery_places: 5
products: 40
daily_days: 83
dekads: 9
months: 4
```

**Output:**
```
ForecastHeader: 5 records

ForecastLine:
- Daily:   5 × 40 × 83 = 16,600
- Dekad:   5 × 40 × 9  = 1,800
- Monthly: 5 × 40 × 4  = 800
- Total:   19,200 lines
```

---

## 3. Data Insertion Sequence

### Processing Order in Simulation Service

```
Phase 1: Database Reset
└─ Truncate all tables

Phase 2: Master Data Creation
├─ Customers (from params)
├─ Suppliers (from params)
├─ Delivery Places (linked to customers)
├─ Products (from params)
└─ Warehouses (from params)

Phase 2.5: Forecast Data Creation ⭐ KEY PHASE
├─ Check: generate_forecasts flag (from params.forecasts)
├─ Calculate date ranges:
│  ├─ Daily: base_date - 31 to +2 months 10th
│  ├─ Dekad: start_date to +2 months end
│  └─ Monthly: this month to +3 months
├─ Create ForecastHeader per delivery_place
├─ Create ForecastLine for each header:
│  ├─ Daily lines (all products × all days)
│  ├─ Dekad lines (all products × 1st/11th/21st)
│  └─ Monthly lines (all products × 4 months)
└─ Commit

Phase 3: Stock Inventory (Lots)
Phase 4: Orders
Phase 5: Allocations
Phase 6: Post-Check Validation
Phase 7: Snapshot Save (optional)
Phase 8: Results
```

---

## 4. Configuration Parameters

### Simulation Request (admin_simulate_schema.py)
```python
SimulateSeedRequest:
  profile: str | None  # small, medium, large_near
  random_seed: int | None  # Default: current timestamp
  warehouses: 1-10 (default: 2)
  customers: int | None  # Profile default
  suppliers: int | None
  products: int | None
  lots: int | None
  orders: int | None
  forecasts: 0 | 1 | None  # 0=disabled, 1=enabled
  lot_split_max_per_line: 1-3 (default: 1)
  order_line_items_per_order: 1-5 (default: 1)
  save_snapshot: bool (default: True)
```

### Control Parameters Reference

| Parameter | Type | Range | Default | Impact |
|-----------|------|-------|---------|--------|
| `forecasts` | int | 0 or 1 | 0 | Enables/disables all forecast generation |
| `profile` | str | small, medium, large_near | None | Sets default counts from YAML |
| `warehouses` | int | 1-10 | 2 | Overrides profile |
| `customers` | int | ≥0 | Profile | Affects delivery places |
| `products` | int | ≥0 | Profile | Products per forecast header |
| `random_seed` | int | Any | timestamp | Reproducibility |

---

## 5. API Endpoints

### POST /api/admin/simulate-seed-data
**Request:**
```json
{
  "profile": "small",
  "warehouses": 2,
  "forecasts": 1,
  "random_seed": 42,
  "save_snapshot": true
}
```

**Response:**
```json
{
  "task_id": "task_abc123",
  "message": "Seed simulation started (reset → insert)"
}
```

### GET /api/admin/simulate-progress/{task_id}
**Response:**
```json
{
  "task_id": "task_abc123",
  "status": "running",
  "phase": "MASTERS",
  "progress_pct": 25,
  "logs": [
    "Phase 2.5: Creating forecast data",
    "→ Date ranges: daily=2025-10-19 to 2026-01-10, dekad=2025-10-19 to 2026-01-31, monthly=2025-11-01 to +3 months",
    "→ Inserting 19200 forecast lines...",
    "✓ Created 19200 forecast line entries (headers=5, products=40)"
  ]
}
```

### GET /api/admin/simulate-result/{task_id}
**Response (on completion):**
```json
{
  "success": true,
  "summary": {
    "warehouses": 2,
    "forecasts": 19200,
    "orders": 4000,
    "order_lines": 8000,
    "lots": 6000,
    "allocations": 4800
  },
  "snapshot_id": 42
}
```

---

## 6. Key Findings & Important Notes

### ✅ Strengths

1. **Comprehensive Date Coverage:**
   - Daily: 31 days back to 2 months ahead
   - Dekad: Full coverage with 10-day periods
   - Monthly: 4 months of planning horizon

2. **All Products Included:**
   - No longer limited to random 5 products
   - Better represents real-world scenarios

3. **Header-Detail Separation:**
   - Properly normalized database structure
   - Supports customer-specific delivery windows
   - Enables complex business rules

4. **Parameter Flexibility:**
   - YAML profiles for reusable configurations
   - API overrides for ad-hoc testing
   - Seed value for reproducibility

### ⚠️ Important Caveats

1. **Forecasts Disabled by Default:**
   ```
   Must explicitly set forecasts=1 to enable
   ```

2. **Large Data Volume:**
   - With many products, forecast lines can be 10,000+
   - Consider database performance for large profiles

3. **Forecasts Not Used by Other Phases:**
   - Generated but not consumed by orders/allocations
   - Useful for UI testing and reporting

### 📊 Record Count Formula

```
Total ForecastHeader = delivery_places
Total ForecastLine = delivery_places × products × (daily_days + dekads + months)

Example (5 delivery places, 40 products):
= 5 × 40 × (83 + 9 + 4)
= 5 × 40 × 96
= 19,200 lines
```

---

## 7. Migration Notes (November 2025)

### Removed Components

1. **Legacy Simple Seed Service:**
   - `seed_forecasts()` function removed from `seeds_service.py`
   - Flat Forecast model generation deprecated
   - `forecasts` field removed from `SeedRequest` schema

2. **Legacy Forecast Router:**
   - `/api/forecast/*` endpoints removed
   - `/api/forecast/bulk` endpoint removed
   - Use `/api/forecasts/*` (header-detail API) instead

3. **Legacy Schemas:**
   - `LegacyForecast*` schemas removed from `forecast_schema.py`
   - Use `ForecastHeader*` and `ForecastLine*` schemas

4. **Test Data File:**
   - `backend/data/forecast_daily_PRD999_v1.json` removed

### Updated Components

1. **Enhanced Simulation Service:**
   - Extended date ranges (31 days back to 2+ months ahead)
   - Added dekad and monthly forecast lines
   - All products included (not random 5)

2. **Helper Functions Added:**
   - `_create_daily_forecast_lines()`
   - `_create_dekad_forecast_lines()`
   - `_create_monthly_forecast_lines()`

---

## Summary

| Aspect | Value |
|--------|-------|
| **Model** | ForecastHeader + ForecastLine |
| **Entry Point** | `create_forecast_data()` |
| **Control** | `params["forecasts"]` (0 or 1) |
| **Daily Range** | -31 days to +2 months 10th day |
| **Dekad Range** | start to +2 months end |
| **Monthly Range** | Current month to +3 months |
| **Products** | All products (全件) |
| **Default Enabled** | No (requires `forecasts=1`) |

## TODO: Historical Daily Forecast Archive

- **Context:** The UI now prefers to render the daily grid for the "current" planning month. When older months are still present in `forecast_lines`, the component falls back to the latest month that contains data (see `frontend/src/features/forecasts/components/ForecastDetailCard.tsx`).
- **Next Step:** Move past-month daily rows into a dedicated archive table so that the active table contains future months only.
- **Follow-up:** Once the archive migration is complete, remove the fallback logic noted in the component and always rely on the active dataset for determining the display month.
