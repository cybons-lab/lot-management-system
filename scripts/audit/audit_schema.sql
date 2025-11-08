-- ============================================================
-- Audit bootstrap (idempotent)
-- PostgreSQL 15
-- ============================================================

-- 1) 汎用監査関数
CREATE OR REPLACE FUNCTION public.audit_write() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_op  text;
  v_row jsonb;
  v_user text := current_user;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_op := 'I';
    v_row := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_op := 'U';
    v_row := to_jsonb(NEW);
  ELSE
    v_op := 'D';
    v_row := to_jsonb(OLD);
  END IF;

  EXECUTE format(
    'INSERT INTO %I.%I_history(op, changed_at, changed_by, row_data)
     VALUES ($1, now(), $2, $3)',
     TG_TABLE_SCHEMA, TG_TABLE_NAME
  ) USING v_op, v_user, v_row;

  RETURN COALESCE(NEW, OLD);
END
$$;

COMMENT ON FUNCTION public.audit_write() IS
'任意テーブルの *_history に I/U/D と行スナップショット(JSONB)を書き込むトリガ関数';

-- 2) 履歴テーブル作成とトリガ張付け
DO $$
DECLARE
  r record;
  tgt_schema text := 'public';
  tg_ins text;
  tg_upd text;
  tg_del text;
BEGIN
  -- (a) 既に audit_write トリガがあるテーブル + (b) 監査したい候補
  FOR r IN
    WITH t_triggered AS (
      SELECT c.relname AS table_name
      FROM pg_trigger t
      JOIN pg_class   c ON t.tgrelid = c.oid
      JOIN pg_proc    p ON t.tgfoid  = p.oid
      WHERE NOT t.tgisinternal
        AND p.proname = 'audit_write'
    ),
    t_manual AS (
      SELECT unnest(ARRAY[
        'allocations','lots','order_lines','orders','products','warehouses',
        'customers','suppliers','stock_movements','delivery_places',
        'order_line_warehouse_allocation','expiry_rules','unit_conversions',
        'sap_sync_logs','inbound_submissions','lot_current_stock','forecasts','purchase_requests'
      ]) AS table_name
    )
    SELECT DISTINCT s.table_name
    FROM (
      SELECT table_name FROM t_triggered
      UNION ALL
      SELECT table_name FROM t_manual
    ) s
    WHERE to_regclass(format('%I.%I', tgt_schema, s.table_name)) IS NOT NULL
  LOOP
    -- 2-1) 履歴テーブル
    EXECUTE format($fmt$
      CREATE TABLE IF NOT EXISTS %I.%I_history(
        id          BIGSERIAL PRIMARY KEY,
        op          CHAR(1)      NOT NULL,
        changed_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        changed_by  TEXT,
        row_data    JSONB        NOT NULL
      )$fmt$, tgt_schema, r.table_name);

    -- 2-2) インデックス
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I_history (changed_at)',
      r.table_name||'_hist_idx_changed_at', tgt_schema, r.table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I_history (op)',
      r.table_name||'_hist_idx_op', tgt_schema, r.table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I_history ((row_data->>''id''))',
      r.table_name||'_hist_idx_row_id', tgt_schema, r.table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I_history USING GIN (row_data)',
      r.table_name||'_hist_gin_row', tgt_schema, r.table_name);

    -- 2-3) トリガが無ければ作成（IF NOT EXISTS 相当）
    tg_ins := r.table_name||'_audit_ins';
    tg_upd := r.table_name||'_audit_upd';
    tg_del := r.table_name||'_audit_del';

    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid=c.oid
      WHERE c.relname=r.table_name AND t.tgname=tg_ins
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I AFTER INSERT ON %I.%I
           FOR EACH ROW EXECUTE FUNCTION public.audit_write()',
        tg_ins, tgt_schema, r.table_name
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid=c.oid
      WHERE c.relname=r.table_name AND t.tgname=tg_upd
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I AFTER UPDATE ON %I.%I
           FOR EACH ROW EXECUTE FUNCTION public.audit_write()',
        tg_upd, tgt_schema, r.table_name
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid=c.oid
      WHERE c.relname=r.table_name AND t.tgname=tg_del
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I AFTER DELETE ON %I.%I
           FOR EACH ROW EXECUTE FUNCTION public.audit_write()',
        tg_del, tgt_schema, r.table_name
      );
    END IF;

    EXECUTE format('COMMENT ON TABLE %I.%I_history IS %L',
      tgt_schema, r.table_name, r.table_name||' の変更履歴（監査ログ）');
  END LOOP;
END$$;

-- 3) 確認（表示）
\echo
\echo '=== Attached audit triggers ==='
SELECT t.tgname, c.relname AS table_name
FROM pg_trigger t
JOIN pg_class   c ON t.tgrelid = c.oid
JOIN pg_proc    p ON t.tgfoid  = p.oid
WHERE NOT t.tgisinternal
  AND p.proname = 'audit_write'
ORDER BY c.relname, t.tgname;

\echo
\echo '=== History tables ==='
SELECT n.nspname AS schema, c.relname AS history_table
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public' AND c.relname LIKE '%\_history' ESCAPE '\'
ORDER BY c.relname;
