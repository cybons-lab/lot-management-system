#!/bin/bash
# Phase1 Migration View Fix Script
# 各環境のDB状態をチェックして適切なビュー定義を適用します

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Phase1 View Fix Script ==="
echo ""

# PostgreSQL接続情報を環境変数またはデフォルト値から取得
POSTGRES_USER=${POSTGRES_USER:-admin}
POSTGRES_DB=${POSTGRES_DB:-lot_management}
POSTGRES_CONTAINER=${POSTGRES_CONTAINER:-lot-db-postgres}

echo "Using PostgreSQL connection:"
echo "  Container: $POSTGRES_CONTAINER"
echo "  User: $POSTGRES_USER"
echo "  Database: $POSTGRES_DB"
echo ""

# 関数: SQL実行
execute_sql() {
    docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -A -c "$1" 2>/dev/null || echo "ERROR"
}

# 関数: テーブル存在チェック
check_table_exists() {
    local table_name=$1
    local result=$(execute_sql "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table_name');")
    echo "$result"
}

# 関数: カラム存在チェック
check_column_exists() {
    local table_name=$1
    local column_name=$2
    local result=$(execute_sql "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table_name' AND column_name = '$column_name');")
    echo "$result"
}

# 関数: ビューのカラム存在チェック
check_view_column() {
    local view_name=$1
    local column_name=$2
    local result=$(execute_sql "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$view_name' AND column_name = '$column_name');")
    echo "$result"
}

echo "Step 1: 環境の状態をチェック..."
echo ""

# 1. products vs product_groups vs supplier_items
echo -n "  [CHECK] products テーブル: "
HAS_PRODUCTS=$(check_table_exists "products")
if [ "$HAS_PRODUCTS" = "t" ]; then
    echo -e "${YELLOW}存在 (Phase1未適用)${NC}"
else
    echo -e "${GREEN}なし${NC}"
fi

echo -n "  [CHECK] product_groups テーブル: "
HAS_PRODUCT_GROUPS=$(check_table_exists "product_groups")
if [ "$HAS_PRODUCT_GROUPS" = "t" ]; then
    echo -e "${YELLOW}存在 (Phase1途中)${NC}"
    PRODUCT_TABLE="product_groups"
else
    echo -e "${GREEN}なし${NC}"
fi

echo -n "  [CHECK] supplier_items テーブル: "
HAS_SUPPLIER_ITEMS=$(check_table_exists "supplier_items")
if [ "$HAS_SUPPLIER_ITEMS" = "t" ]; then
    echo -e "${GREEN}存在 (Phase1完了)${NC}"
    PRODUCT_TABLE="supplier_items"
else
    echo -e "${RED}なし (異常)${NC}"
fi

# 2. lot_receipts の supplier_item_id カラム
echo -n "  [CHECK] lot_receipts.supplier_item_id: "
HAS_LR_SUPPLIER_ITEM=$(check_column_exists "lot_receipts" "supplier_item_id")
if [ "$HAS_LR_SUPPLIER_ITEM" = "t" ]; then
    echo -e "${GREEN}存在${NC}"
else
    echo -e "${RED}なし (Phase1未完了)${NC}"
fi

# 3. v_lot_receipt_stock ビューの状態
echo -n "  [CHECK] v_lot_receipt_stock ビュー: "
HAS_VIEW=$(check_table_exists "v_lot_receipt_stock")
if [ "$HAS_VIEW" = "t" ]; then
    echo -e "${GREEN}存在${NC}"

    echo -n "  [CHECK] v_lot_receipt_stock.supplier_item_id: "
    HAS_VIEW_SUPPLIER_ITEM=$(check_view_column "v_lot_receipt_stock" "supplier_item_id")
    if [ "$HAS_VIEW_SUPPLIER_ITEM" = "t" ]; then
        echo -e "${GREEN}存在${NC}"
    else
        echo -e "${RED}なし (要修正)${NC}"
        NEEDS_FIX=true
    fi
else
    echo -e "${RED}なし (要作成)${NC}"
    NEEDS_FIX=true
fi

echo ""
echo "Step 2: 環境判定..."
echo ""

# 環境タイプを判定
if [ "$HAS_PRODUCTS" = "t" ]; then
    ENV_TYPE="pre-phase1"
    echo -e "${YELLOW}環境タイプ: Phase1未適用 (products テーブル使用)${NC}"
    echo "  ⚠️  この環境では Phase1 マイグレーションを先に実行してください"
    echo "  docker compose exec backend alembic upgrade head"
    exit 1
elif [ "$HAS_PRODUCT_GROUPS" = "t" ]; then
    ENV_TYPE="phase1-intermediate"
    echo -e "${YELLOW}環境タイプ: Phase1途中 (product_groups テーブル使用)${NC}"
    PRODUCT_REF_TABLE="product_groups"
    PRODUCT_CODE_COL="maker_part_code"
    PRODUCT_NAME_COL="product_name"
elif [ "$HAS_SUPPLIER_ITEMS" = "t" ] && [ "$HAS_LR_SUPPLIER_ITEM" = "t" ]; then
    ENV_TYPE="phase1-complete"
    echo -e "${GREEN}環境タイプ: Phase1完了 (supplier_items テーブル使用)${NC}"
    PRODUCT_REF_TABLE="supplier_items"
    PRODUCT_CODE_COL="product_code"
    PRODUCT_NAME_COL="display_name"
else
    echo -e "${RED}環境タイプ: 不明 (異常な状態)${NC}"
    exit 1
fi

echo ""

# 修正が不要ならスキップ
if [ "$NEEDS_FIX" != "true" ]; then
    echo -e "${GREEN}✅ ビューは正常です。修正不要。${NC}"
    exit 0
fi

echo "Step 3: ビューを修正..."
echo ""

# ビュー定義を生成
if [ "$ENV_TYPE" = "phase1-intermediate" ]; then
    # product_groups を使用
    SQL=$(cat <<'EOF'
CREATE OR REPLACE VIEW v_lot_receipt_stock AS
SELECT
    lr.id AS receipt_id,
    lm.id AS lot_master_id,
    lm.lot_number,
    lr.product_group_id,
    lr.supplier_item_id,
    p.maker_part_code AS product_code,
    p.product_name,
    lr.warehouse_id,
    w.warehouse_code,
    w.warehouse_name,
    COALESCE(w.short_name, LEFT(w.warehouse_name, 10)) AS warehouse_short_name,
    lm.supplier_id,
    s.supplier_code,
    s.supplier_name,
    COALESCE(s.short_name, LEFT(s.supplier_name, 10)) AS supplier_short_name,
    lr.received_date,
    lr.expiry_date,
    lr.unit,
    lr.status,
    lr.received_quantity AS initial_quantity,
    COALESCE(wl_sum.total_withdrawn, 0) AS withdrawn_quantity,
    GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0) AS remaining_quantity,
    COALESCE(la.allocated_quantity, 0) AS reserved_quantity,
    COALESCE(lar.reserved_quantity_active, 0) AS reserved_quantity_active,
    GREATEST(
        lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0)
        - lr.locked_quantity - COALESCE(la.allocated_quantity, 0),
        0
    ) AS available_quantity,
    lr.locked_quantity,
    lr.lock_reason,
    lr.inspection_status,
    lr.receipt_key,
    lr.created_at,
    lr.updated_at,
    CASE
        WHEN lr.expiry_date IS NOT NULL
        THEN (lr.expiry_date - CURRENT_DATE)::INTEGER
        ELSE NULL
    END AS days_to_expiry
FROM lot_receipts lr
JOIN lot_master lm ON lr.lot_master_id = lm.id
LEFT JOIN product_groups p ON lr.product_group_id = p.id
LEFT JOIN warehouses w ON lr.warehouse_id = w.id
LEFT JOIN suppliers s ON lm.supplier_id = s.id
LEFT JOIN (
    SELECT wl.lot_receipt_id, SUM(wl.quantity) AS total_withdrawn
    FROM withdrawal_lines wl
    JOIN withdrawals wd ON wl.withdrawal_id = wd.id
    WHERE wd.status != 'cancelled'
    GROUP BY wl.lot_receipt_id
) wl_sum ON wl_sum.lot_receipt_id = lr.id
LEFT JOIN (
    SELECT lot_receipt_id, SUM(quantity) as allocated_quantity
    FROM lot_allocations
    WHERE status NOT IN ('cancelled', 'withdrawn')
    GROUP BY lot_receipt_id
) la ON la.lot_receipt_id = lr.id
LEFT JOIN (
    SELECT source_id, SUM(reserved_qty) AS reserved_quantity_active
    FROM lot_reservations
    WHERE status = 'active' AND source_type = 'ORDER'
    GROUP BY source_id
) lar ON lar.source_id = lr.id;
EOF
)
elif [ "$ENV_TYPE" = "phase1-complete" ]; then
    # supplier_items を使用
    SQL=$(cat <<'EOF'
CREATE OR REPLACE VIEW v_lot_receipt_stock AS
SELECT
    lr.id AS receipt_id,
    lm.id AS lot_master_id,
    lm.lot_number,
    lr.product_group_id,
    lr.supplier_item_id,
    si.product_code,
    si.display_name AS product_name,
    lr.warehouse_id,
    w.warehouse_code,
    w.warehouse_name,
    COALESCE(w.short_name, LEFT(w.warehouse_name, 10)) AS warehouse_short_name,
    lm.supplier_id,
    s.supplier_code,
    s.supplier_name,
    COALESCE(s.short_name, LEFT(s.supplier_name, 10)) AS supplier_short_name,
    lr.received_date,
    lr.expiry_date,
    lr.unit,
    lr.status,
    lr.received_quantity AS initial_quantity,
    COALESCE(wl_sum.total_withdrawn, 0) AS withdrawn_quantity,
    GREATEST(lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0) - lr.locked_quantity, 0) AS remaining_quantity,
    COALESCE(la.allocated_quantity, 0) AS reserved_quantity,
    COALESCE(lar.reserved_quantity_active, 0) AS reserved_quantity_active,
    GREATEST(
        lr.received_quantity - COALESCE(wl_sum.total_withdrawn, 0)
        - lr.locked_quantity - COALESCE(la.allocated_quantity, 0),
        0
    ) AS available_quantity,
    lr.locked_quantity,
    lr.lock_reason,
    lr.inspection_status,
    lr.receipt_key,
    lr.created_at,
    lr.updated_at,
    CASE
        WHEN lr.expiry_date IS NOT NULL
        THEN (lr.expiry_date - CURRENT_DATE)::INTEGER
        ELSE NULL
    END AS days_to_expiry
FROM lot_receipts lr
JOIN lot_master lm ON lr.lot_master_id = lm.id
LEFT JOIN supplier_items si ON lr.supplier_item_id = si.id
LEFT JOIN warehouses w ON lr.warehouse_id = w.id
LEFT JOIN suppliers s ON lm.supplier_id = s.id
LEFT JOIN (
    SELECT wl.lot_receipt_id, SUM(wl.quantity) AS total_withdrawn
    FROM withdrawal_lines wl
    JOIN withdrawals wd ON wl.withdrawal_id = wd.id
    WHERE wd.status != 'cancelled'
    GROUP BY wl.lot_receipt_id
) wl_sum ON wl_sum.lot_receipt_id = lr.id
LEFT JOIN (
    SELECT lot_receipt_id, SUM(quantity) as allocated_quantity
    FROM lot_allocations
    WHERE status NOT IN ('cancelled', 'withdrawn')
    GROUP BY lot_receipt_id
) la ON la.lot_receipt_id = lr.id
LEFT JOIN (
    SELECT source_id, SUM(reserved_qty) AS reserved_quantity_active
    FROM lot_reservations
    WHERE status = 'active' AND source_type = 'ORDER'
    GROUP BY source_id
) lar ON lar.source_id = lr.id;
EOF
)
fi

# SQL実行
echo "  [実行] ビュー再作成..."
docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<< "$SQL"

if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✅ ビュー再作成成功${NC}"
else
    echo -e "  ${RED}❌ ビュー再作成失敗${NC}"
    exit 1
fi

echo ""
echo "Step 4: 修正結果を確認..."
echo ""

# 確認
HAS_VIEW_SUPPLIER_ITEM_AFTER=$(check_view_column "v_lot_receipt_stock" "supplier_item_id")
if [ "$HAS_VIEW_SUPPLIER_ITEM_AFTER" = "t" ]; then
    echo -e "${GREEN}✅ v_lot_receipt_stock.supplier_item_id が存在します${NC}"
    echo ""
    echo -e "${GREEN}修正完了！バックエンドを再起動してください:${NC}"
    echo "  docker compose restart backend"
else
    echo -e "${RED}❌ supplier_item_id カラムが見つかりません${NC}"
    exit 1
fi
