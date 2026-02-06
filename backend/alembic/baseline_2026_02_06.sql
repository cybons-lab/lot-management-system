--
-- PostgreSQL database dump
--


-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: update_lot_master_aggregates(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_lot_master_aggregates() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
        target_lot_id BIGINT;
    BEGIN
        -- Determine affected lot_master_id
        target_lot_id := COALESCE(NEW.lot_master_id, OLD.lot_master_id);
        
        -- Calculate aggregates
        -- We calculate SUM(received_quantity) as 'total_quantity'.
        -- This represents the TOTAL amount ever received for this lot number.
        -- It does NOT reflect current inventory (withdrawals are ignored).
        WITH aggregates AS (
            SELECT
                COALESCE(SUM(received_quantity), 0) as total_qty,
                MIN(received_date) as first_recv,
                MAX(received_date) as last_recv, -- Not currently stored, but calculated for dates
                MAX(expiry_date) as max_expiry
            FROM lot_receipts
            WHERE lot_master_id = target_lot_id
        )
        UPDATE lot_master
        SET
            total_quantity = aggregates.total_qty,
            first_receipt_date = aggregates.first_recv,
            latest_expiry_date = aggregates.max_expiry,
            updated_at = CURRENT_TIMESTAMP
        FROM aggregates
        WHERE id = target_lot_id;
        
        RETURN NULL;
    END;
    $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adjustments (
    id bigint NOT NULL,
    lot_id bigint NOT NULL,
    adjustment_type character varying(20) NOT NULL,
    adjusted_quantity numeric(15,3) NOT NULL,
    reason text NOT NULL,
    adjusted_by bigint NOT NULL,
    adjusted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_adjustments_type CHECK (((adjustment_type)::text = ANY (ARRAY[('physical_count'::character varying)::text, ('damage'::character varying)::text, ('loss'::character varying)::text, ('found'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: COLUMN adjustments.lot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.adjustments.lot_id IS 'ロットID（lot_receipts参照）';


--
-- Name: COLUMN adjustments.adjustment_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.adjustments.adjustment_type IS '調整種別（physical_count/damage/loss/found/other）';


--
-- Name: COLUMN adjustments.adjusted_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.adjustments.adjusted_quantity IS '調整数量';


--
-- Name: COLUMN adjustments.reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.adjustments.reason IS '調整理由';


--
-- Name: COLUMN adjustments.adjusted_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.adjustments.adjusted_by IS '調整実行ユーザーID';


--
-- Name: COLUMN adjustments.adjusted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.adjustments.adjusted_at IS '調整日時';


--
-- Name: adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.adjustments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.adjustments_id_seq OWNED BY public.adjustments.id;


--
-- Name: allocation_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allocation_suggestions (
    id bigint NOT NULL,
    order_line_id bigint,
    forecast_period character varying(20) NOT NULL,
    forecast_id bigint,
    customer_id bigint NOT NULL,
    delivery_place_id bigint NOT NULL,
    supplier_item_id bigint NOT NULL,
    lot_id bigint NOT NULL,
    quantity numeric(15,3) NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    allocation_type character varying(10) NOT NULL,
    source character varying(32) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    coa_issue_date date,
    comment text,
    manual_shipment_date date
);


--
-- Name: TABLE allocation_suggestions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.allocation_suggestions IS '引当推奨：システムが提案する引当案';


--
-- Name: COLUMN allocation_suggestions.order_line_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_suggestions.order_line_id IS '受注明細ID';


--
-- Name: COLUMN allocation_suggestions.forecast_period; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_suggestions.forecast_period IS '予測期間（YYYY-MM or YYYY-MM-DD）';


--
-- Name: COLUMN allocation_suggestions.forecast_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_suggestions.forecast_id IS '予測ID';


--
-- Name: COLUMN allocation_suggestions.customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_suggestions.customer_id IS '顧客ID';


--
-- Name: COLUMN allocation_suggestions.delivery_place_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_suggestions.delivery_place_id IS '納入先ID';


--
-- Name: COLUMN allocation_suggestions.supplier_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_suggestions.supplier_item_id IS '仕入先品目ID（メーカー品番への参照）';


--
-- Name: COLUMN allocation_suggestions.lot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_suggestions.lot_id IS 'ロットID（推奨対象）';


--
-- Name: COLUMN allocation_suggestions.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_suggestions.quantity IS '推奨引当数量';


--
-- Name: COLUMN allocation_suggestions.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_suggestions.priority IS '優先度';


--
-- Name: COLUMN allocation_suggestions.allocation_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_suggestions.allocation_type IS '引当種別（soft/hard）';


--
-- Name: COLUMN allocation_suggestions.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_suggestions.source IS '推奨元（forecast_import等）';


--
-- Name: COLUMN allocation_suggestions.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_suggestions.created_at IS '作成日時';


--
-- Name: COLUMN allocation_suggestions.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_suggestions.updated_at IS '更新日時';


--
-- Name: COLUMN allocation_suggestions.coa_issue_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_suggestions.coa_issue_date IS '成績書発行日';


--
-- Name: COLUMN allocation_suggestions.comment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_suggestions.comment IS '数量別コメント';


--
-- Name: COLUMN allocation_suggestions.manual_shipment_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_suggestions.manual_shipment_date IS '手動設定の出荷日';


--
-- Name: allocation_suggestions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.allocation_suggestions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: allocation_suggestions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.allocation_suggestions_id_seq OWNED BY public.allocation_suggestions.id;


--
-- Name: allocation_traces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allocation_traces (
    id bigint NOT NULL,
    order_line_id bigint NOT NULL,
    lot_id bigint,
    score numeric(15,6),
    decision character varying(20) NOT NULL,
    reason character varying(255) NOT NULL,
    allocated_qty numeric(15,3),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_allocation_traces_decision CHECK (((decision)::text = ANY (ARRAY[('adopted'::character varying)::text, ('rejected'::character varying)::text, ('partial'::character varying)::text])))
);


--
-- Name: TABLE allocation_traces; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.allocation_traces IS '引当トレース：引当処理の推論過程を記録（デバッグ用）';


--
-- Name: COLUMN allocation_traces.order_line_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_traces.order_line_id IS '受注明細ID';


--
-- Name: COLUMN allocation_traces.lot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_traces.lot_id IS 'ロットID（候補ロット）';


--
-- Name: COLUMN allocation_traces.score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_traces.score IS '優先度スコア（FEFOベース等）';


--
-- Name: COLUMN allocation_traces.decision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_traces.decision IS '判定結果（adopted/rejected/partial）';


--
-- Name: COLUMN allocation_traces.reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_traces.reason IS '判定理由（期限切れ/ロック中/FEFO採用/在庫不足等）';


--
-- Name: COLUMN allocation_traces.allocated_qty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_traces.allocated_qty IS '実引当数量（adoptedまたはpartialの場合）';


--
-- Name: COLUMN allocation_traces.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.allocation_traces.created_at IS '作成日時';


--
-- Name: allocation_traces_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.allocation_traces_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: allocation_traces_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.allocation_traces_id_seq OWNED BY public.allocation_traces.id;


--
-- Name: batch_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batch_jobs (
    id bigint NOT NULL,
    job_name character varying(100) NOT NULL,
    job_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    parameters jsonb,
    result_message text,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_batch_jobs_status CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('running'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text]))),
    CONSTRAINT chk_batch_jobs_type CHECK (((job_type)::text = ANY (ARRAY[('allocation_suggestion'::character varying)::text, ('allocation_finalize'::character varying)::text, ('inventory_sync'::character varying)::text, ('data_import'::character varying)::text, ('report_generation'::character varying)::text])))
);


--
-- Name: TABLE batch_jobs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.batch_jobs IS 'バッチジョブ管理：バッチ処理の実行状況を管理';


--
-- Name: COLUMN batch_jobs.job_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.batch_jobs.job_name IS 'ジョブ名';


--
-- Name: COLUMN batch_jobs.job_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.batch_jobs.job_type IS 'ジョブ種別（allocation_suggestion/allocation_finalize/inventory_sync/data_import/report_generation）';


--
-- Name: COLUMN batch_jobs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.batch_jobs.status IS 'ステータス（pending/running/completed/failed）';


--
-- Name: COLUMN batch_jobs.parameters; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.batch_jobs.parameters IS 'パラメータ（JSON形式）';


--
-- Name: COLUMN batch_jobs.result_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.batch_jobs.result_message IS '結果メッセージ';


--
-- Name: COLUMN batch_jobs.started_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.batch_jobs.started_at IS '開始日時';


--
-- Name: COLUMN batch_jobs.completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.batch_jobs.completed_at IS '完了日時';


--
-- Name: COLUMN batch_jobs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.batch_jobs.created_at IS '作成日時';


--
-- Name: batch_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.batch_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: batch_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.batch_jobs_id_seq OWNED BY public.batch_jobs.id;


--
-- Name: business_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_rules (
    id bigint NOT NULL,
    rule_code character varying(50) NOT NULL,
    rule_name character varying(100) NOT NULL,
    rule_type character varying(50) NOT NULL,
    rule_parameters jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_business_rules_type CHECK (((rule_type)::text = ANY (ARRAY[('allocation'::character varying)::text, ('expiry_warning'::character varying)::text, ('kanban'::character varying)::text, ('inventory_sync_alert'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: TABLE business_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.business_rules IS '業務ルール設定：業務ロジックのルールを動的に管理';


--
-- Name: COLUMN business_rules.rule_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_rules.rule_code IS 'ルールコード（ユニーク）';


--
-- Name: COLUMN business_rules.rule_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_rules.rule_name IS 'ルール名';


--
-- Name: COLUMN business_rules.rule_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_rules.rule_type IS 'ルール種別（allocation/expiry_warning/kanban/inventory_sync_alert/other）';


--
-- Name: COLUMN business_rules.rule_parameters; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_rules.rule_parameters IS 'ルールパラメータ（JSON形式）';


--
-- Name: COLUMN business_rules.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_rules.is_active IS '有効フラグ';


--
-- Name: COLUMN business_rules.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_rules.created_at IS '作成日時';


--
-- Name: COLUMN business_rules.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_rules.updated_at IS '更新日時';


--
-- Name: business_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.business_rules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: business_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.business_rules_id_seq OWNED BY public.business_rules.id;


--
-- Name: cloud_flow_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cloud_flow_configs (
    id bigint NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE cloud_flow_configs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cloud_flow_configs IS 'Cloud Flow設定：Cloud FlowのURL等の設定を保存';


--
-- Name: COLUMN cloud_flow_configs.config_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_configs.config_key IS '設定キー（ユニーク）';


--
-- Name: COLUMN cloud_flow_configs.config_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_configs.config_value IS '設定値';


--
-- Name: COLUMN cloud_flow_configs.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_configs.description IS '説明';


--
-- Name: COLUMN cloud_flow_configs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_configs.created_at IS '作成日時';


--
-- Name: COLUMN cloud_flow_configs.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_configs.updated_at IS '更新日時';


--
-- Name: cloud_flow_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cloud_flow_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cloud_flow_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cloud_flow_configs_id_seq OWNED BY public.cloud_flow_configs.id;


--
-- Name: cloud_flow_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cloud_flow_jobs (
    id bigint NOT NULL,
    job_type character varying(50) NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    requested_by_user_id bigint,
    requested_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    result_message text,
    error_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE cloud_flow_jobs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cloud_flow_jobs IS 'Cloud Flowジョブ履歴：Cloud Flow実行履歴を記録';


--
-- Name: COLUMN cloud_flow_jobs.job_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_jobs.job_type IS 'ジョブ種別（progress_download等）';


--
-- Name: COLUMN cloud_flow_jobs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_jobs.status IS 'ステータス（pending/running/completed/failed）';


--
-- Name: COLUMN cloud_flow_jobs.start_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_jobs.start_date IS '開始日';


--
-- Name: COLUMN cloud_flow_jobs.end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_jobs.end_date IS '終了日';


--
-- Name: COLUMN cloud_flow_jobs.requested_by_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_jobs.requested_by_user_id IS '要求ユーザーID';


--
-- Name: COLUMN cloud_flow_jobs.requested_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_jobs.requested_at IS '要求日時';


--
-- Name: COLUMN cloud_flow_jobs.started_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_jobs.started_at IS '開始日時';


--
-- Name: COLUMN cloud_flow_jobs.completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_jobs.completed_at IS '完了日時';


--
-- Name: COLUMN cloud_flow_jobs.result_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_jobs.result_message IS '結果メッセージ';


--
-- Name: COLUMN cloud_flow_jobs.error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_jobs.error_message IS 'エラーメッセージ';


--
-- Name: COLUMN cloud_flow_jobs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_jobs.created_at IS '作成日時';


--
-- Name: COLUMN cloud_flow_jobs.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cloud_flow_jobs.updated_at IS '更新日時';


--
-- Name: cloud_flow_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cloud_flow_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cloud_flow_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cloud_flow_jobs_id_seq OWNED BY public.cloud_flow_jobs.id;


--
-- Name: company_calendars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_calendars (
    id bigint NOT NULL,
    calendar_date date NOT NULL,
    is_workday boolean NOT NULL,
    description character varying(200),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE company_calendars; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.company_calendars IS '会社カレンダー：会社の休日・稼働日を管理';


--
-- Name: COLUMN company_calendars.calendar_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_calendars.calendar_date IS '対象日（ユニーク）';


--
-- Name: COLUMN company_calendars.is_workday; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_calendars.is_workday IS '稼働日フラグ（true=稼働日、false=休日）';


--
-- Name: COLUMN company_calendars.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_calendars.description IS '説明';


--
-- Name: COLUMN company_calendars.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_calendars.created_at IS '作成日時';


--
-- Name: COLUMN company_calendars.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_calendars.updated_at IS '更新日時';


--
-- Name: company_calendars_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.company_calendars_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: company_calendars_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.company_calendars_id_seq OWNED BY public.company_calendars.id;


--
-- Name: customer_item_delivery_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_item_delivery_settings (
    id bigint NOT NULL,
    delivery_place_id bigint,
    jiku_code character varying(50),
    shipment_text text,
    packing_note text,
    lead_time_days integer,
    is_default boolean DEFAULT false NOT NULL,
    valid_from date,
    valid_to date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    customer_item_id bigint NOT NULL,
    notes text,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE customer_item_delivery_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_item_delivery_settings IS '得意先品番-納入先別出荷設定：次区・納入先ごとの出荷テキスト、梱包注意書き、リードタイム等を管理';


--
-- Name: COLUMN customer_item_delivery_settings.delivery_place_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.delivery_place_id IS '納入先ID（NULLの場合はデフォルト設定）';


--
-- Name: COLUMN customer_item_delivery_settings.jiku_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.jiku_code IS '次区コード（NULLの場合は全次区共通）';


--
-- Name: COLUMN customer_item_delivery_settings.shipment_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.shipment_text IS '出荷表テキスト（SAP連携用）';


--
-- Name: COLUMN customer_item_delivery_settings.packing_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.packing_note IS '梱包・注意書き';


--
-- Name: COLUMN customer_item_delivery_settings.lead_time_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.lead_time_days IS 'リードタイム（日）';


--
-- Name: COLUMN customer_item_delivery_settings.is_default; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.is_default IS 'デフォルト設定フラグ';


--
-- Name: COLUMN customer_item_delivery_settings.valid_from; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.valid_from IS '有効開始日';


--
-- Name: COLUMN customer_item_delivery_settings.valid_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.valid_to IS '有効終了日';


--
-- Name: COLUMN customer_item_delivery_settings.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.created_at IS '作成日時';


--
-- Name: COLUMN customer_item_delivery_settings.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.updated_at IS '更新日時';


--
-- Name: COLUMN customer_item_delivery_settings.customer_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.customer_item_id IS '顧客商品ID';


--
-- Name: COLUMN customer_item_delivery_settings.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_delivery_settings.notes IS 'Excel View ページ全体のメモ';


--
-- Name: customer_item_delivery_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_item_delivery_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_item_delivery_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_item_delivery_settings_id_seq OWNED BY public.customer_item_delivery_settings.id;


--
-- Name: customer_item_jiku_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_item_jiku_mappings (
    id bigint NOT NULL,
    jiku_code character varying(50) NOT NULL,
    delivery_place_id bigint NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    customer_item_id bigint NOT NULL,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE customer_item_jiku_mappings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_item_jiku_mappings IS '顧客商品-次区マッピング：顧客品番と次区コードの対応を管理';


--
-- Name: COLUMN customer_item_jiku_mappings.jiku_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_jiku_mappings.jiku_code IS '次区コード';


--
-- Name: COLUMN customer_item_jiku_mappings.delivery_place_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_jiku_mappings.delivery_place_id IS '納入先ID';


--
-- Name: COLUMN customer_item_jiku_mappings.is_default; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_jiku_mappings.is_default IS 'デフォルト次区フラグ';


--
-- Name: COLUMN customer_item_jiku_mappings.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_jiku_mappings.created_at IS '作成日時';


--
-- Name: COLUMN customer_item_jiku_mappings.customer_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_item_jiku_mappings.customer_item_id IS '顧客商品ID';


--
-- Name: customer_item_jiku_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_item_jiku_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_item_jiku_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_item_jiku_mappings_id_seq OWNED BY public.customer_item_jiku_mappings.id;


--
-- Name: customer_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_items (
    customer_id bigint NOT NULL,
    customer_part_no character varying(100) NOT NULL,
    base_unit character varying(20) NOT NULL,
    pack_unit character varying(20),
    pack_quantity integer,
    special_instructions text,
    valid_to date DEFAULT '9999-12-31'::date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id bigint NOT NULL,
    supplier_item_id bigint NOT NULL,
    material_code character varying(50),
    order_flag character varying(50),
    order_existence character varying(20),
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE customer_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customer_items IS '得意先品番マッピング：顧客が使用する品番コードの変換マスタ（受注・出荷ドメイン）';


--
-- Name: COLUMN customer_items.customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_items.customer_id IS '顧客ID';


--
-- Name: COLUMN customer_items.customer_part_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_items.customer_part_no IS '得意先品番（先方品番、得意先が注文時に指定する品番）';


--
-- Name: COLUMN customer_items.base_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_items.base_unit IS '基本単位';


--
-- Name: COLUMN customer_items.pack_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_items.pack_unit IS '梱包単位';


--
-- Name: COLUMN customer_items.pack_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_items.pack_quantity IS '梱包数量';


--
-- Name: COLUMN customer_items.special_instructions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_items.special_instructions IS '特記事項';


--
-- Name: COLUMN customer_items.valid_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_items.valid_to IS '有効終了日（Soft Delete）';


--
-- Name: COLUMN customer_items.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_items.created_at IS '作成日時';


--
-- Name: COLUMN customer_items.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_items.updated_at IS '更新日時';


--
-- Name: COLUMN customer_items.supplier_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_items.supplier_item_id IS '仕入先品目ID';


--
-- Name: customer_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_items_id_seq OWNED BY public.customer_items.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id bigint NOT NULL,
    customer_code character varying(50) NOT NULL,
    customer_name character varying(200) NOT NULL,
    address character varying(500),
    contact_name character varying(100),
    phone character varying(50),
    email character varying(200),
    valid_to date DEFAULT '9999-12-31'::date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    short_name character varying(50),
    display_name character varying(200),
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE customers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.customers IS '顧客マスタ：得意先情報を管理（Soft Delete対応）';


--
-- Name: COLUMN customers.customer_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.customer_code IS '顧客コード（業務キー）';


--
-- Name: COLUMN customers.customer_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.customer_name IS '顧客名';


--
-- Name: COLUMN customers.address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.address IS '住所';


--
-- Name: COLUMN customers.contact_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.contact_name IS '担当者名';


--
-- Name: COLUMN customers.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.phone IS '電話番号';


--
-- Name: COLUMN customers.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.email IS 'メールアドレス';


--
-- Name: COLUMN customers.valid_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.valid_to IS '有効終了日（Soft Delete）';


--
-- Name: COLUMN customers.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.created_at IS '作成日時';


--
-- Name: COLUMN customers.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.updated_at IS '更新日時';


--
-- Name: COLUMN customers.short_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customers.short_name IS '短縮表示名（UI省スペース用）';


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: delivery_places; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_places (
    id bigint NOT NULL,
    jiku_code character varying(50) DEFAULT ''::character varying NOT NULL,
    delivery_place_code character varying(50) NOT NULL,
    delivery_place_name character varying(200) NOT NULL,
    customer_id bigint NOT NULL,
    valid_to date DEFAULT '9999-12-31'::date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    short_name character varying(50),
    display_name character varying(200),
    version integer DEFAULT 1 NOT NULL,
    jiku_match_pattern character varying(100)
);


--
-- Name: TABLE delivery_places; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.delivery_places IS '納入先マスタ：納入先情報を管理（Soft Delete対応）';


--
-- Name: COLUMN delivery_places.jiku_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_places.jiku_code IS '次区コード';


--
-- Name: COLUMN delivery_places.delivery_place_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_places.delivery_place_code IS '納入先コード（業務キー）';


--
-- Name: COLUMN delivery_places.delivery_place_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_places.delivery_place_name IS '納入先名';


--
-- Name: COLUMN delivery_places.customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_places.customer_id IS '顧客ID';


--
-- Name: COLUMN delivery_places.valid_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_places.valid_to IS '有効終了日（Soft Delete）';


--
-- Name: COLUMN delivery_places.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_places.created_at IS '作成日時';


--
-- Name: COLUMN delivery_places.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_places.updated_at IS '更新日時';


--
-- Name: COLUMN delivery_places.short_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.delivery_places.short_name IS '短縮表示名（UI省スペース用）';


--
-- Name: delivery_places_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delivery_places_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delivery_places_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delivery_places_id_seq OWNED BY public.delivery_places.id;


--
-- Name: expected_lots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expected_lots (
    id bigint NOT NULL,
    inbound_plan_line_id bigint NOT NULL,
    expected_lot_number character varying(100),
    expected_quantity numeric(15,3) NOT NULL,
    expected_expiry_date date,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE expected_lots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.expected_lots IS '入荷予定ロット：入荷予定ロット情報の事前登録';


--
-- Name: COLUMN expected_lots.inbound_plan_line_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expected_lots.inbound_plan_line_id IS '入荷計画明細ID';


--
-- Name: COLUMN expected_lots.expected_lot_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expected_lots.expected_lot_number IS '予定ロット番号（入荷時確定の場合はNULL）';


--
-- Name: COLUMN expected_lots.expected_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expected_lots.expected_quantity IS '予定数量';


--
-- Name: COLUMN expected_lots.expected_expiry_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expected_lots.expected_expiry_date IS '予定有効期限';


--
-- Name: COLUMN expected_lots.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expected_lots.created_at IS '作成日時';


--
-- Name: COLUMN expected_lots.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expected_lots.updated_at IS '更新日時';


--
-- Name: expected_lots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expected_lots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expected_lots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expected_lots_id_seq OWNED BY public.expected_lots.id;


--
-- Name: forecast_current; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forecast_current (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    delivery_place_id bigint NOT NULL,
    forecast_date date NOT NULL,
    forecast_quantity numeric(15,3) NOT NULL,
    unit character varying,
    forecast_period character varying(7) NOT NULL,
    snapshot_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    supplier_item_id bigint NOT NULL
);


--
-- Name: TABLE forecast_current; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.forecast_current IS '現行予測：最新の予測データのみを保持';


--
-- Name: COLUMN forecast_current.customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_current.customer_id IS '顧客ID';


--
-- Name: COLUMN forecast_current.delivery_place_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_current.delivery_place_id IS '納入先ID';


--
-- Name: COLUMN forecast_current.forecast_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_current.forecast_date IS '予測日';


--
-- Name: COLUMN forecast_current.forecast_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_current.forecast_quantity IS '予測数量';


--
-- Name: COLUMN forecast_current.unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_current.unit IS '単位';


--
-- Name: COLUMN forecast_current.forecast_period; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_current.forecast_period IS '予測期間（YYYY-MM形式）';


--
-- Name: COLUMN forecast_current.snapshot_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_current.snapshot_at IS 'スナップショット日時';


--
-- Name: COLUMN forecast_current.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_current.created_at IS '作成日時';


--
-- Name: COLUMN forecast_current.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_current.updated_at IS '更新日時';


--
-- Name: forecast_current_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forecast_current_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forecast_current_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forecast_current_id_seq OWNED BY public.forecast_current.id;


--
-- Name: forecast_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forecast_history (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    delivery_place_id bigint NOT NULL,
    supplier_item_id bigint NOT NULL,
    forecast_date date NOT NULL,
    forecast_quantity numeric NOT NULL,
    unit character varying,
    forecast_period character varying(7) NOT NULL,
    snapshot_at timestamp without time zone NOT NULL,
    archived_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: TABLE forecast_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.forecast_history IS '予測履歴：過去の全予測データをアーカイブ（FK制約なし）';


--
-- Name: COLUMN forecast_history.customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_history.customer_id IS '顧客ID（FK制約なし）';


--
-- Name: COLUMN forecast_history.delivery_place_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_history.delivery_place_id IS '納入先ID（FK制約なし）';


--
-- Name: COLUMN forecast_history.forecast_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_history.forecast_date IS '予測日';


--
-- Name: COLUMN forecast_history.forecast_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_history.forecast_quantity IS '予測数量';


--
-- Name: COLUMN forecast_history.unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_history.unit IS '単位';


--
-- Name: COLUMN forecast_history.forecast_period; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_history.forecast_period IS '予測期間（YYYY-MM形式）';


--
-- Name: COLUMN forecast_history.snapshot_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_history.snapshot_at IS 'スナップショット日時';


--
-- Name: COLUMN forecast_history.archived_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_history.archived_at IS 'アーカイブ日時';


--
-- Name: COLUMN forecast_history.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_history.created_at IS '作成日時';


--
-- Name: COLUMN forecast_history.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forecast_history.updated_at IS '更新日時';


--
-- Name: forecast_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forecast_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forecast_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forecast_history_id_seq OWNED BY public.forecast_history.id;


--
-- Name: holiday_calendars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.holiday_calendars (
    id bigint NOT NULL,
    holiday_date date NOT NULL,
    holiday_name character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE holiday_calendars; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.holiday_calendars IS '祝日カレンダー：祝日情報を管理';


--
-- Name: COLUMN holiday_calendars.holiday_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.holiday_calendars.holiday_date IS '祝日（ユニーク）';


--
-- Name: COLUMN holiday_calendars.holiday_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.holiday_calendars.holiday_name IS '祝日名';


--
-- Name: COLUMN holiday_calendars.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.holiday_calendars.created_at IS '作成日時';


--
-- Name: COLUMN holiday_calendars.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.holiday_calendars.updated_at IS '更新日時';


--
-- Name: holiday_calendars_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.holiday_calendars_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: holiday_calendars_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.holiday_calendars_id_seq OWNED BY public.holiday_calendars.id;


--
-- Name: inbound_plan_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inbound_plan_lines (
    id bigint NOT NULL,
    inbound_plan_id bigint NOT NULL,
    planned_quantity numeric(15,3) NOT NULL,
    unit character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    supplier_item_id bigint NOT NULL
);


--
-- Name: TABLE inbound_plan_lines; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inbound_plan_lines IS '入荷計画明細：入荷計画の製品別明細を管理';


--
-- Name: COLUMN inbound_plan_lines.inbound_plan_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inbound_plan_lines.inbound_plan_id IS '入荷計画ヘッダID';


--
-- Name: COLUMN inbound_plan_lines.planned_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inbound_plan_lines.planned_quantity IS '計画数量';


--
-- Name: COLUMN inbound_plan_lines.unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inbound_plan_lines.unit IS '単位';


--
-- Name: COLUMN inbound_plan_lines.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inbound_plan_lines.created_at IS '作成日時';


--
-- Name: COLUMN inbound_plan_lines.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inbound_plan_lines.updated_at IS '更新日時';


--
-- Name: inbound_plan_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inbound_plan_lines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inbound_plan_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inbound_plan_lines_id_seq OWNED BY public.inbound_plan_lines.id;


--
-- Name: inbound_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inbound_plans (
    id bigint NOT NULL,
    plan_number character varying(50) NOT NULL,
    sap_po_number character varying(20),
    supplier_id bigint NOT NULL,
    planned_arrival_date date NOT NULL,
    status character varying(20) DEFAULT 'planned'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_inbound_plans_status CHECK (((status)::text = ANY (ARRAY[('planned'::character varying)::text, ('partially_received'::character varying)::text, ('received'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: TABLE inbound_plans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inbound_plans IS '入荷計画ヘッダ：入荷計画全体の情報を管理';


--
-- Name: COLUMN inbound_plans.plan_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inbound_plans.plan_number IS '計画番号（業務キー）';


--
-- Name: COLUMN inbound_plans.sap_po_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inbound_plans.sap_po_number IS 'SAP購買発注番号（業務キー）';


--
-- Name: COLUMN inbound_plans.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inbound_plans.supplier_id IS '仕入先ID';


--
-- Name: COLUMN inbound_plans.planned_arrival_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inbound_plans.planned_arrival_date IS '入荷予定日';


--
-- Name: COLUMN inbound_plans.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inbound_plans.status IS 'ステータス（planned/partially_received/received/cancelled）';


--
-- Name: COLUMN inbound_plans.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inbound_plans.notes IS '備考';


--
-- Name: COLUMN inbound_plans.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inbound_plans.created_at IS '作成日時';


--
-- Name: COLUMN inbound_plans.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inbound_plans.updated_at IS '更新日時';


--
-- Name: inbound_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inbound_plans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inbound_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inbound_plans_id_seq OWNED BY public.inbound_plans.id;


--
-- Name: makers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.makers (
    id bigint NOT NULL,
    maker_code character varying(50) NOT NULL,
    maker_name character varying(200) NOT NULL,
    display_name character varying(200),
    short_name character varying(50),
    notes text,
    valid_to date DEFAULT '9999-12-31'::date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: layer_code_mappings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.layer_code_mappings AS
 SELECT makers.maker_code AS layer_code,
    makers.maker_name,
    makers.created_at,
    makers.updated_at
   FROM public.makers
  WHERE (makers.valid_to >= CURRENT_DATE);


--
-- Name: lot_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_master (
    id bigint NOT NULL,
    lot_number character varying(100),
    supplier_id bigint,
    first_receipt_date date,
    latest_expiry_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    total_quantity numeric(15,3) DEFAULT '0'::numeric NOT NULL,
    supplier_item_id bigint NOT NULL
);


--
-- Name: TABLE lot_master; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lot_master IS 'ロット番号名寄せマスタ：同一ロット番号の複数入荷を集約管理';


--
-- Name: COLUMN lot_master.lot_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_master.lot_number IS 'ロット番号（仕入先発番、NULL許可）';


--
-- Name: COLUMN lot_master.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_master.supplier_id IS '仕入先ID（仕入元）';


--
-- Name: COLUMN lot_master.first_receipt_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_master.first_receipt_date IS '初回入荷日（自動更新）';


--
-- Name: COLUMN lot_master.latest_expiry_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_master.latest_expiry_date IS '傘下receiptの最長有効期限（表示用）';


--
-- Name: COLUMN lot_master.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_master.created_at IS '作成日時';


--
-- Name: COLUMN lot_master.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_master.updated_at IS '更新日時';


--
-- Name: COLUMN lot_master.total_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_master.total_quantity IS '合計入荷数量（受け入れ時）';


--
-- Name: lot_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lot_master_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lot_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lot_master_id_seq OWNED BY public.lot_master.id;


--
-- Name: lot_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_receipts (
    id bigint NOT NULL,
    warehouse_id bigint NOT NULL,
    supplier_id bigint,
    expected_lot_id bigint,
    received_date date NOT NULL,
    expiry_date date,
    received_quantity numeric(15,3) DEFAULT 0 NOT NULL,
    unit character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    lock_reason text,
    locked_quantity numeric(15,3) DEFAULT 0 NOT NULL,
    inspection_status character varying(20) DEFAULT 'not_required'::character varying NOT NULL,
    inspection_date date,
    inspection_cert_number character varying(100),
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    origin_type character varying(20) DEFAULT 'adhoc'::character varying NOT NULL,
    origin_reference character varying(255),
    temporary_lot_key uuid,
    lot_master_id bigint NOT NULL,
    receipt_key uuid DEFAULT gen_random_uuid() NOT NULL,
    consumed_quantity numeric(15,3) NOT NULL,
    shipping_date date,
    cost_price numeric(10,2),
    sales_price numeric(10,2),
    tax_rate numeric(5,2),
    supplier_item_id bigint NOT NULL, 
    remarks text,
    order_no character varying(100),
    CONSTRAINT chk_lot_receipts_consumed_quantity CHECK ((consumed_quantity >= (0)::numeric)),
    CONSTRAINT chk_lots_current_quantity CHECK ((received_quantity >= (0)::numeric)),
    CONSTRAINT chk_lots_inspection_status CHECK (((inspection_status)::text = ANY (ARRAY[('not_required'::character varying)::text, ('pending'::character varying)::text, ('passed'::character varying)::text, ('failed'::character varying)::text]))),
    CONSTRAINT chk_lots_locked_quantity CHECK ((locked_quantity >= (0)::numeric)),
    CONSTRAINT chk_lots_origin_type CHECK (((origin_type)::text = ANY (ARRAY[('order'::character varying)::text, ('forecast'::character varying)::text, ('sample'::character varying)::text, ('safety_stock'::character varying)::text, ('adhoc'::character varying)::text]))),
    CONSTRAINT chk_lots_status CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('depleted'::character varying)::text, ('expired'::character varying)::text, ('quarantine'::character varying)::text, ('locked'::character varying)::text, ('archived'::character varying)::text])))
);


--
-- Name: TABLE lot_receipts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lot_receipts IS 'ロット入荷実体：個別の入荷記録を管理。在庫の単一ソース';


--
-- Name: COLUMN lot_receipts.warehouse_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.warehouse_id IS '倉庫ID';


--
-- Name: COLUMN lot_receipts.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.supplier_id IS '仕入先ID（仕入元）';


--
-- Name: COLUMN lot_receipts.expected_lot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.expected_lot_id IS '入荷予定ロットID';


--
-- Name: COLUMN lot_receipts.received_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.received_date IS '入荷日';


--
-- Name: COLUMN lot_receipts.expiry_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.expiry_date IS '有効期限（NULL=期限なし）';


--
-- Name: COLUMN lot_receipts.received_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.received_quantity IS '入荷数量（初期入荷時の数量）';


--
-- Name: COLUMN lot_receipts.unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.unit IS '単位';


--
-- Name: COLUMN lot_receipts.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.status IS 'ステータス（active/depleted/expired/quarantine/locked）';


--
-- Name: COLUMN lot_receipts.lock_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.lock_reason IS 'ロック理由';


--
-- Name: COLUMN lot_receipts.locked_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.locked_quantity IS 'ロック数量（手動ロック分）';


--
-- Name: COLUMN lot_receipts.inspection_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.inspection_status IS '検査ステータス（not_required/pending/passed/failed）';


--
-- Name: COLUMN lot_receipts.inspection_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.inspection_date IS '検査日';


--
-- Name: COLUMN lot_receipts.inspection_cert_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.inspection_cert_number IS '検査証明書番号';


--
-- Name: COLUMN lot_receipts.version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.version IS 'バージョン（楽観的ロック用）';


--
-- Name: COLUMN lot_receipts.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.created_at IS '作成日時';


--
-- Name: COLUMN lot_receipts.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.updated_at IS '更新日時';


--
-- Name: COLUMN lot_receipts.origin_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.origin_type IS '起源種別（order/forecast/sample/safety_stock/adhoc）';


--
-- Name: COLUMN lot_receipts.origin_reference; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.origin_reference IS '起源参照（受注ID等）';


--
-- Name: COLUMN lot_receipts.temporary_lot_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.temporary_lot_key IS '仮入庫時の一意識別キー（UUID）';


--
-- Name: COLUMN lot_receipts.lot_master_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.lot_master_id IS 'ロットマスタID（名寄せ親）';


--
-- Name: COLUMN lot_receipts.receipt_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.receipt_key IS '入荷識別UUID（重複防止、NOT NULL）';


--
-- Name: COLUMN lot_receipts.consumed_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.consumed_quantity IS '消費済み数量（出庫確定分の累積）';


--
-- Name: COLUMN lot_receipts.shipping_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.shipping_date IS '出荷予定日';


--
-- Name: COLUMN lot_receipts.cost_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.cost_price IS '仕入単価';


--
-- Name: COLUMN lot_receipts.sales_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.sales_price IS '販売単価';


--
-- Name: COLUMN lot_receipts.tax_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.tax_rate IS '適用税率';


--
-- Name: COLUMN lot_receipts.supplier_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.supplier_item_id IS '仕入先品目ID（メーカー品番の実体、supplier_items参照）';


--
-- Name: COLUMN lot_receipts.remarks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.remarks IS '備考（ロットに関する付加情報）';


--
-- Name: COLUMN lot_receipts.order_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_receipts.order_no IS '発注NO（手入力）';


--
-- Name: lot_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lot_receipts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lot_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lot_receipts_id_seq OWNED BY public.lot_receipts.id;


--
-- Name: lot_reservation_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_reservation_history (
    id bigint NOT NULL,
    reservation_id bigint NOT NULL,
    operation character varying(10) NOT NULL,
    lot_id bigint,
    source_type character varying(20),
    source_id bigint,
    reserved_qty numeric(15,3),
    status character varying(20),
    sap_document_no character varying(20),
    old_lot_id bigint,
    old_source_type character varying(20),
    old_source_id bigint,
    old_reserved_qty numeric(15,3),
    old_status character varying(20),
    old_sap_document_no character varying(20),
    changed_by character varying(100),
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    change_reason character varying(255),
    CONSTRAINT chk_lot_reservation_history_operation CHECK (((operation)::text = ANY (ARRAY[('INSERT'::character varying)::text, ('UPDATE'::character varying)::text, ('DELETE'::character varying)::text])))
);


--
-- Name: TABLE lot_reservation_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lot_reservation_history IS 'ロット引当履歴：lot_reservations変更の監査ログ';


--
-- Name: COLUMN lot_reservation_history.reservation_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.reservation_id IS '引当ID';


--
-- Name: COLUMN lot_reservation_history.operation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.operation IS '操作種別（INSERT/UPDATE/DELETE）';


--
-- Name: COLUMN lot_reservation_history.lot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.lot_id IS '新ロットID';


--
-- Name: COLUMN lot_reservation_history.source_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.source_type IS '新引当元種別';


--
-- Name: COLUMN lot_reservation_history.source_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.source_id IS '新引当元ID';


--
-- Name: COLUMN lot_reservation_history.reserved_qty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.reserved_qty IS '新引当数量';


--
-- Name: COLUMN lot_reservation_history.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.status IS '新ステータス';


--
-- Name: COLUMN lot_reservation_history.sap_document_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.sap_document_no IS '新SAP伝票番号';


--
-- Name: COLUMN lot_reservation_history.old_lot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.old_lot_id IS '旧ロットID';


--
-- Name: COLUMN lot_reservation_history.old_source_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.old_source_type IS '旧引当元種別';


--
-- Name: COLUMN lot_reservation_history.old_source_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.old_source_id IS '旧引当元ID';


--
-- Name: COLUMN lot_reservation_history.old_reserved_qty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.old_reserved_qty IS '旧引当数量';


--
-- Name: COLUMN lot_reservation_history.old_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.old_status IS '旧ステータス';


--
-- Name: COLUMN lot_reservation_history.old_sap_document_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.old_sap_document_no IS '旧SAP伝票番号';


--
-- Name: COLUMN lot_reservation_history.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.changed_by IS '変更ユーザー';


--
-- Name: COLUMN lot_reservation_history.changed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.changed_at IS '変更日時';


--
-- Name: COLUMN lot_reservation_history.change_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservation_history.change_reason IS '変更理由';


--
-- Name: lot_reservation_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lot_reservation_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lot_reservation_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lot_reservation_history_id_seq OWNED BY public.lot_reservation_history.id;


--
-- Name: lot_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_reservations (
    id bigint NOT NULL,
    lot_id bigint NOT NULL,
    source_type character varying(20) NOT NULL,
    source_id bigint,
    reserved_qty numeric(15,3) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone,
    expires_at timestamp without time zone,
    confirmed_at timestamp without time zone,
    released_at timestamp without time zone,
    sap_document_no character varying(20),
    sap_registered_at timestamp without time zone,
    confirmed_by character varying(50),
    cancel_reason character varying(50),
    cancel_note character varying(500),
    cancelled_by character varying(50),
    CONSTRAINT chk_lot_reservations_qty_positive CHECK ((reserved_qty > (0)::numeric)),
    CONSTRAINT chk_lot_reservations_source_type CHECK (((source_type)::text = ANY (ARRAY[('forecast'::character varying)::text, ('order'::character varying)::text, ('manual'::character varying)::text]))),
    CONSTRAINT chk_lot_reservations_status CHECK (((status)::text = ANY (ARRAY[('temporary'::character varying)::text, ('active'::character varying)::text, ('confirmed'::character varying)::text, ('released'::character varying)::text])))
);


--
-- Name: TABLE lot_reservations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lot_reservations IS 'ロット引当：ロットの予約管理（受注・予測・手動）';


--
-- Name: COLUMN lot_reservations.lot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.lot_id IS 'ロットID（lot_receipts参照）';


--
-- Name: COLUMN lot_reservations.source_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.source_type IS '引当元種別（forecast/order/manual）';


--
-- Name: COLUMN lot_reservations.source_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.source_id IS '引当元ID（order_line_id等）';


--
-- Name: COLUMN lot_reservations.reserved_qty; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.reserved_qty IS '引当数量（正数必須）';


--
-- Name: COLUMN lot_reservations.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.status IS 'ステータス（temporary/active/confirmed/released）';


--
-- Name: COLUMN lot_reservations.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.created_at IS '作成日時';


--
-- Name: COLUMN lot_reservations.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.updated_at IS '更新日時';


--
-- Name: COLUMN lot_reservations.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.expires_at IS '有効期限（一時引当用）';


--
-- Name: COLUMN lot_reservations.confirmed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.confirmed_at IS '確定日時';


--
-- Name: COLUMN lot_reservations.released_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.released_at IS '解放日時';


--
-- Name: COLUMN lot_reservations.sap_document_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.sap_document_no IS 'SAP伝票番号（SAP登録成功時にセット）';


--
-- Name: COLUMN lot_reservations.sap_registered_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.sap_registered_at IS 'SAP登録日時';


--
-- Name: COLUMN lot_reservations.confirmed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.confirmed_by IS '確定ユーザー';


--
-- Name: COLUMN lot_reservations.cancel_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.cancel_reason IS 'キャンセル理由（input_error/wrong_quantity等）';


--
-- Name: COLUMN lot_reservations.cancel_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.cancel_note IS 'キャンセル補足';


--
-- Name: COLUMN lot_reservations.cancelled_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lot_reservations.cancelled_by IS 'キャンセル実行ユーザー';


--
-- Name: lot_reservations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lot_reservations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lot_reservations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lot_reservations_id_seq OWNED BY public.lot_reservations.id;


--
-- Name: makers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.makers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: makers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.makers_id_seq OWNED BY public.makers.id;


--
-- Name: master_change_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_change_logs (
    id bigint NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id bigint NOT NULL,
    change_type character varying(20) NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_by bigint NOT NULL,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_master_change_logs_type CHECK (((change_type)::text = ANY (ARRAY[('insert'::character varying)::text, ('update'::character varying)::text, ('delete'::character varying)::text])))
);


--
-- Name: TABLE master_change_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.master_change_logs IS 'マスタ変更履歴：マスタデータの変更履歴を記録';


--
-- Name: COLUMN master_change_logs.table_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_change_logs.table_name IS 'テーブル名';


--
-- Name: COLUMN master_change_logs.record_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_change_logs.record_id IS 'レコードID';


--
-- Name: COLUMN master_change_logs.change_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_change_logs.change_type IS '変更種別（insert/update/delete）';


--
-- Name: COLUMN master_change_logs.old_values; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_change_logs.old_values IS '変更前の値（JSON形式）';


--
-- Name: COLUMN master_change_logs.new_values; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_change_logs.new_values IS '変更後の値（JSON形式）';


--
-- Name: COLUMN master_change_logs.changed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_change_logs.changed_by IS '変更ユーザーID';


--
-- Name: COLUMN master_change_logs.changed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.master_change_logs.changed_at IS '変更日時';


--
-- Name: master_change_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.master_change_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: master_change_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.master_change_logs_id_seq OWNED BY public.master_change_logs.id;


--
-- Name: material_order_forecasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material_order_forecasts (
    id bigint NOT NULL,
    target_month character varying(7) NOT NULL,
    customer_item_id bigint,
    warehouse_id bigint,
    maker_id bigint,
    material_code character varying(50),
    unit character varying(20),
    warehouse_code character varying(50),
    jiku_code character varying(50) NOT NULL,
    delivery_place character varying(50),
    support_division character varying(50),
    procurement_type character varying(50),
    maker_code character varying(50),
    maker_name character varying(200),
    material_name character varying(500),
    delivery_lot numeric(15,3),
    order_quantity numeric(15,3),
    month_start_instruction numeric(15,3),
    manager_name character varying(100),
    monthly_instruction_quantity numeric(15,3),
    next_month_notice numeric(15,3),
    daily_quantities jsonb,
    period_quantities jsonb,
    snapshot_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    imported_by bigint,
    source_file_name character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: material_order_forecasts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.material_order_forecasts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: material_order_forecasts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.material_order_forecasts_id_seq OWNED BY public.material_order_forecasts.id;


--
-- Name: missing_mapping_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.missing_mapping_events (
    id bigint NOT NULL,
    customer_id bigint,
    supplier_item_id bigint,
    supplier_id bigint,
    event_type character varying(50) NOT NULL,
    occurred_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    context_json jsonb,
    created_by bigint,
    resolved_at timestamp without time zone,
    resolved_by bigint,
    resolution_note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE missing_mapping_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.missing_mapping_events IS '未設定イベント：自動セット失敗時の警告記録';


--
-- Name: COLUMN missing_mapping_events.customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.missing_mapping_events.customer_id IS '顧客ID';


--
-- Name: COLUMN missing_mapping_events.supplier_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.missing_mapping_events.supplier_item_id IS '製品グループID';


--
-- Name: COLUMN missing_mapping_events.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.missing_mapping_events.supplier_id IS '仕入先ID';


--
-- Name: COLUMN missing_mapping_events.event_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.missing_mapping_events.event_type IS 'イベント種別（delivery_place_not_found/jiku_mapping_not_found等）';


--
-- Name: COLUMN missing_mapping_events.occurred_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.missing_mapping_events.occurred_at IS '発生日時';


--
-- Name: COLUMN missing_mapping_events.context_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.missing_mapping_events.context_json IS 'エラー発生時のコンテキスト（リクエスト内容等、JSON形式）';


--
-- Name: COLUMN missing_mapping_events.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.missing_mapping_events.created_by IS '作成ユーザーID';


--
-- Name: COLUMN missing_mapping_events.resolved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.missing_mapping_events.resolved_at IS '解決日時（NULL=未解決）';


--
-- Name: COLUMN missing_mapping_events.resolved_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.missing_mapping_events.resolved_by IS '解決ユーザーID';


--
-- Name: COLUMN missing_mapping_events.resolution_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.missing_mapping_events.resolution_note IS '解決メモ';


--
-- Name: COLUMN missing_mapping_events.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.missing_mapping_events.created_at IS '作成日時';


--
-- Name: missing_mapping_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.missing_mapping_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: missing_mapping_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.missing_mapping_events_id_seq OWNED BY public.missing_mapping_events.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50) NOT NULL,
    is_read boolean,
    link character varying(512),
    created_at timestamp with time zone DEFAULT now(),
    display_strategy character varying(20) DEFAULT 'immediate'::character varying NOT NULL,
    CONSTRAINT check_display_strategy CHECK (((display_strategy)::text = ANY ((ARRAY['immediate'::character varying, 'deferred'::character varying, 'persistent'::character varying])::text[])))
);


--
-- Name: COLUMN notifications.display_strategy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.display_strategy IS 'Toast display strategy: immediate=toast+center, deferred=center only, persistent=toast(long)+center';


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: ocr_result_edits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ocr_result_edits (
    id bigint NOT NULL,
    smartread_long_data_id bigint NOT NULL,
    lot_no_1 character varying(100),
    quantity_1 character varying(50),
    lot_no_2 character varying(100),
    quantity_2 character varying(50),
    inbound_no character varying(100),
    shipping_date date,
    shipping_slip_text text,
    shipping_slip_text_edited boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    jiku_code character varying(100),
    material_code character varying(100),
    delivery_quantity character varying(100),
    process_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    error_flags jsonb DEFAULT '{}'::jsonb NOT NULL,
    delivery_date character varying(100),
    inbound_no_2 character varying(100),
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE ocr_result_edits; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ocr_result_edits IS 'OCR結果編集：OCR結果の手入力編集内容を保存';


--
-- Name: COLUMN ocr_result_edits.smartread_long_data_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.smartread_long_data_id IS 'SmartRead縦持ちデータID（ユニーク）';


--
-- Name: COLUMN ocr_result_edits.lot_no_1; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.lot_no_1 IS 'ロット番号1';


--
-- Name: COLUMN ocr_result_edits.quantity_1; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.quantity_1 IS '数量1';


--
-- Name: COLUMN ocr_result_edits.lot_no_2; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.lot_no_2 IS 'ロット番号2';


--
-- Name: COLUMN ocr_result_edits.quantity_2; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.quantity_2 IS '数量2';


--
-- Name: COLUMN ocr_result_edits.inbound_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.inbound_no IS '入荷番号';


--
-- Name: COLUMN ocr_result_edits.shipping_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.shipping_date IS '出荷日';


--
-- Name: COLUMN ocr_result_edits.shipping_slip_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.shipping_slip_text IS '出荷表テキスト';


--
-- Name: COLUMN ocr_result_edits.shipping_slip_text_edited; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.shipping_slip_text_edited IS '出荷表テキスト編集済みフラグ';


--
-- Name: COLUMN ocr_result_edits.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.created_at IS '作成日時';


--
-- Name: COLUMN ocr_result_edits.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.updated_at IS '更新日時';


--
-- Name: COLUMN ocr_result_edits.jiku_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.jiku_code IS '次区コード';


--
-- Name: COLUMN ocr_result_edits.material_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.material_code IS '材料コード';


--
-- Name: COLUMN ocr_result_edits.delivery_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.delivery_quantity IS '納入数量';


--
-- Name: COLUMN ocr_result_edits.process_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.process_status IS '処理ステータス（pending/downloaded/sap_linked/completed）';


--
-- Name: COLUMN ocr_result_edits.error_flags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.error_flags IS 'エラーフラグ（JSON形式）';


--
-- Name: COLUMN ocr_result_edits.delivery_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.delivery_date IS '納入日';


--
-- Name: COLUMN ocr_result_edits.inbound_no_2; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ocr_result_edits.inbound_no_2 IS '入荷番号2';


--
-- Name: ocr_result_edits_completed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ocr_result_edits_completed (
    id bigint NOT NULL,
    original_id bigint,
    smartread_long_data_completed_id bigint NOT NULL,
    lot_no_1 character varying(100),
    quantity_1 character varying(50),
    lot_no_2 character varying(100),
    quantity_2 character varying(50),
    inbound_no character varying(100),
    inbound_no_2 character varying(100),
    shipping_date date,
    shipping_slip_text text,
    shipping_slip_text_edited boolean NOT NULL,
    jiku_code character varying(100),
    material_code character varying(100),
    delivery_quantity character varying(100),
    delivery_date character varying(100),
    sap_match_type character varying(50),
    sap_matched_zkdmat_b character varying(100),
    sap_supplier_code character varying(50),
    sap_supplier_name character varying(255),
    sap_qty_unit character varying(50),
    sap_maker_item character varying(100),
    process_status character varying(20) NOT NULL,
    error_flags jsonb NOT NULL,
    completed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: TABLE ocr_result_edits_completed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ocr_result_edits_completed IS 'OCR結果編集完了済み：完了済みアーカイブ（FK制約なし）';


--
-- Name: ocr_result_edits_completed_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ocr_result_edits_completed_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ocr_result_edits_completed_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ocr_result_edits_completed_id_seq OWNED BY public.ocr_result_edits_completed.id;


--
-- Name: ocr_result_edits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ocr_result_edits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ocr_result_edits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ocr_result_edits_id_seq OWNED BY public.ocr_result_edits.id;


--
-- Name: operation_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operation_logs (
    id bigint NOT NULL,
    user_id bigint,
    operation_type character varying(50) NOT NULL,
    target_table character varying(50) NOT NULL,
    target_id bigint,
    changes jsonb,
    ip_address character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_operation_logs_type CHECK (((operation_type)::text = ANY (ARRAY[('create'::character varying)::text, ('update'::character varying)::text, ('delete'::character varying)::text, ('login'::character varying)::text, ('logout'::character varying)::text, ('export'::character varying)::text])))
);


--
-- Name: TABLE operation_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.operation_logs IS '操作ログ：ユーザー操作の監査証跡を記録';


--
-- Name: COLUMN operation_logs.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.user_id IS 'ユーザーID';


--
-- Name: COLUMN operation_logs.operation_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.operation_type IS '操作種別（create/update/delete/login/logout/export）';


--
-- Name: COLUMN operation_logs.target_table; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.target_table IS '対象テーブル';


--
-- Name: COLUMN operation_logs.target_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.target_id IS '対象レコードID';


--
-- Name: COLUMN operation_logs.changes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.changes IS '変更内容（JSON形式）';


--
-- Name: COLUMN operation_logs.ip_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.ip_address IS 'IPアドレス';


--
-- Name: COLUMN operation_logs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operation_logs.created_at IS '作成日時';


--
-- Name: operation_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operation_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: operation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operation_logs_id_seq OWNED BY public.operation_logs.id;


--
-- Name: order_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_groups (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    supplier_item_id bigint NOT NULL,
    order_date date NOT NULL,
    source_file_name character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE order_groups; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.order_groups IS '受注グループ：業務キー中心の論理ヘッダ（得意先×製品×受注日）';


--
-- Name: COLUMN order_groups.customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_groups.customer_id IS '顧客ID';


--
-- Name: COLUMN order_groups.supplier_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_groups.supplier_item_id IS '仕入先品目ID（メーカー品番への参照）';


--
-- Name: COLUMN order_groups.order_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_groups.order_date IS '受注日';


--
-- Name: COLUMN order_groups.source_file_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_groups.source_file_name IS '取り込み元ファイル名';


--
-- Name: COLUMN order_groups.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_groups.created_at IS '作成日時';


--
-- Name: COLUMN order_groups.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_groups.updated_at IS '更新日時';


--
-- Name: order_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_groups_id_seq OWNED BY public.order_groups.id;


--
-- Name: order_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_lines (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    order_group_id bigint,
    delivery_date date NOT NULL,
    order_quantity numeric(15,3) NOT NULL,
    unit character varying(20) NOT NULL,
    converted_quantity numeric(15,3),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    delivery_place_id bigint NOT NULL, 
    customer_order_no character varying(6),
    customer_order_line_no character varying(10),
    sap_order_no character varying(20),
    sap_order_item_no character varying(6),
    shipping_document_text text,
    order_type character varying(20) DEFAULT 'ORDER'::character varying NOT NULL,
    forecast_reference character varying(100),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    customer_part_no character varying(100),
    supplier_item_id bigint NOT NULL, 
    CONSTRAINT chk_order_lines_order_type CHECK (((order_type)::text = ANY (ARRAY[('FORECAST_LINKED'::character varying)::text, ('KANBAN'::character varying)::text, ('SPOT'::character varying)::text, ('ORDER'::character varying)::text]))),
    CONSTRAINT chk_order_lines_status CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('allocated'::character varying)::text, ('shipped'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text, ('on_hold'::character varying)::text])))
);


--
-- Name: TABLE order_lines; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.order_lines IS '受注明細：受注の明細行を管理';


--
-- Name: COLUMN order_lines.order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.order_id IS '受注ヘッダID';


--
-- Name: COLUMN order_lines.order_group_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.order_group_id IS '受注グループID（得意先×製品×受注日）';


--
-- Name: COLUMN order_lines.delivery_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.delivery_date IS '納期';


--
-- Name: COLUMN order_lines.order_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.order_quantity IS '受注数量';


--
-- Name: COLUMN order_lines.unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.unit IS '単位';


--
-- Name: COLUMN order_lines.converted_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.converted_quantity IS '換算後数量（内部単位）';


--
-- Name: COLUMN order_lines.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.created_at IS '作成日時';


--
-- Name: COLUMN order_lines.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.updated_at IS '更新日時';


--
-- Name: COLUMN order_lines.delivery_place_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.delivery_place_id IS '納入先ID';


--
-- Name: COLUMN order_lines.customer_order_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.customer_order_no IS '得意先6桁受注番号（業務キー）';


--
-- Name: COLUMN order_lines.customer_order_line_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.customer_order_line_no IS '得意先側行番号';


--
-- Name: COLUMN order_lines.sap_order_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.sap_order_no IS 'SAP受注番号（業務キー）';


--
-- Name: COLUMN order_lines.sap_order_item_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.sap_order_item_no IS 'SAP明細番号（業務キー）';


--
-- Name: COLUMN order_lines.shipping_document_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.shipping_document_text IS '出荷表テキスト';


--
-- Name: COLUMN order_lines.order_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.order_type IS '需要種別（FORECAST_LINKED/KANBAN/SPOT/ORDER）';


--
-- Name: COLUMN order_lines.forecast_reference; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.forecast_reference IS 'Forecast業務キー参照（forecast_id FK廃止）';


--
-- Name: COLUMN order_lines.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.status IS 'ステータス（pending/allocated/shipped/completed/cancelled/on_hold）';


--
-- Name: COLUMN order_lines.version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.version IS 'バージョン（楽観的ロック用）';


--
-- Name: COLUMN order_lines.customer_part_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_lines.customer_part_no IS '得意先品番（先方品番、OCR読取時は生データ）';


--
-- Name: order_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_lines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_lines_id_seq OWNED BY public.order_lines.id;


--
-- Name: order_register_rows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_register_rows (
    id bigint NOT NULL,
    long_data_id bigint,
    curated_master_id bigint,
    task_date date NOT NULL,
    lot_no_1 character varying(50),
    quantity_1 integer,
    lot_no_2 character varying(50),
    quantity_2 integer,
    inbound_no character varying(50),
    shipping_date date,
    delivery_date character varying(50),
    delivery_quantity character varying(50),
    item_no character varying(50),
    quantity_unit character varying(20),
    material_code character varying(50),
    jiku_code character varying(50),
    customer_part_no character varying(100),
    maker_part_no character varying(100),
    source character varying(20) DEFAULT 'OCR'::character varying NOT NULL,
    shipping_slip_text text,
    customer_code character varying(50),
    customer_name character varying(100),
    supplier_code character varying(50),
    supplier_name character varying(100),
    shipping_warehouse_code character varying(50),
    shipping_warehouse_name character varying(100),
    delivery_place_code character varying(50),
    delivery_place_name character varying(200),
    remarks text,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    error_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE order_register_rows; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.order_register_rows IS '受注登録結果：OCR + マスタ参照の結果を保存（Excel出力・React表示の単一ソース）';


--
-- Name: COLUMN order_register_rows.long_data_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_register_rows.long_data_id IS 'SmartRead縦持ちデータID（FK制約なし）';


--
-- Name: COLUMN order_register_rows.curated_master_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_register_rows.curated_master_id IS '整形済みマスタID（FK制約なし）';


--
-- Name: COLUMN order_register_rows.task_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_register_rows.task_date IS 'タスク日付';


--
-- Name: COLUMN order_register_rows.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_register_rows.status IS 'ステータス（PENDING/EXPORTED/ERROR）';


--
-- Name: COLUMN order_register_rows.error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_register_rows.error_message IS 'エラーメッセージ';


--
-- Name: COLUMN order_register_rows.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_register_rows.created_at IS '作成日時';


--
-- Name: COLUMN order_register_rows.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_register_rows.updated_at IS '更新日時';


--
-- Name: order_register_rows_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_register_rows_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_register_rows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_register_rows_id_seq OWNED BY public.order_register_rows.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    order_date date NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    locked_by_user_id integer,
    locked_at timestamp with time zone,
    lock_expires_at timestamp with time zone,
    ocr_source_filename character varying(255),
    cancel_reason character varying(255),
    CONSTRAINT chk_orders_status CHECK (((status)::text = ANY (ARRAY[('open'::character varying)::text, ('part_allocated'::character varying)::text, ('allocated'::character varying)::text, ('shipped'::character varying)::text, ('closed'::character varying)::text, ('on_hold'::character varying)::text])))
);


--
-- Name: TABLE orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.orders IS '受注ヘッダ：受注全体の情報を管理';


--
-- Name: COLUMN orders.customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.customer_id IS '顧客ID';


--
-- Name: COLUMN orders.order_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.order_date IS '受注日';


--
-- Name: COLUMN orders.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.status IS 'ステータス（open/part_allocated/allocated/shipped/closed）';


--
-- Name: COLUMN orders.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.created_at IS '作成日時';


--
-- Name: COLUMN orders.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.updated_at IS '更新日時';


--
-- Name: COLUMN orders.locked_by_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.locked_by_user_id IS 'ロック中ユーザーID（楽観的ロック用）';


--
-- Name: COLUMN orders.locked_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.locked_at IS 'ロック取得日時';


--
-- Name: COLUMN orders.lock_expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.lock_expires_at IS 'ロック有効期限';


--
-- Name: COLUMN orders.ocr_source_filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.ocr_source_filename IS 'OCR取込元ファイル名';


--
-- Name: COLUMN orders.cancel_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.cancel_reason IS 'キャンセル・保留理由';


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: original_delivery_calendars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.original_delivery_calendars (
    id bigint NOT NULL,
    delivery_date date NOT NULL,
    description character varying(200),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE original_delivery_calendars; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.original_delivery_calendars IS 'オリジナル配信日カレンダー：特定の配信日を管理';


--
-- Name: COLUMN original_delivery_calendars.delivery_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.original_delivery_calendars.delivery_date IS '配信日（ユニーク）';


--
-- Name: COLUMN original_delivery_calendars.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.original_delivery_calendars.description IS '説明';


--
-- Name: COLUMN original_delivery_calendars.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.original_delivery_calendars.created_at IS '作成日時';


--
-- Name: COLUMN original_delivery_calendars.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.original_delivery_calendars.updated_at IS '更新日時';


--
-- Name: original_delivery_calendars_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.original_delivery_calendars_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: original_delivery_calendars_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.original_delivery_calendars_id_seq OWNED BY public.original_delivery_calendars.id;


--
-- Name: product_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_mappings (
    id bigint NOT NULL,
    customer_id bigint NOT NULL,
    customer_part_code character varying(100) NOT NULL,
    supplier_id bigint NOT NULL,
    supplier_item_id bigint NOT NULL,
    base_unit character varying(20) NOT NULL,
    pack_unit character varying(20),
    pack_quantity integer,
    special_instructions text,
    valid_to date DEFAULT '9999-12-31'::date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE product_mappings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.product_mappings IS '商品マッピング：顧客+先方品番+製品+仕入先の4者マッピング（調達・発注ドメイン）';


--
-- Name: COLUMN product_mappings.customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_mappings.customer_id IS '顧客ID';


--
-- Name: COLUMN product_mappings.customer_part_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_mappings.customer_part_code IS '得意先品番コード';


--
-- Name: COLUMN product_mappings.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_mappings.supplier_id IS '仕入先ID';


--
-- Name: COLUMN product_mappings.supplier_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_mappings.supplier_item_id IS '仕入先品目ID（メーカー品番への参照）';


--
-- Name: COLUMN product_mappings.base_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_mappings.base_unit IS '基本単位';


--
-- Name: COLUMN product_mappings.pack_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_mappings.pack_unit IS '梱包単位';


--
-- Name: COLUMN product_mappings.pack_quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_mappings.pack_quantity IS '梱包数量';


--
-- Name: COLUMN product_mappings.special_instructions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_mappings.special_instructions IS '特記事項';


--
-- Name: COLUMN product_mappings.valid_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_mappings.valid_to IS '有効終了日（Soft Delete）';


--
-- Name: COLUMN product_mappings.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_mappings.created_at IS '作成日時';


--
-- Name: COLUMN product_mappings.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_mappings.updated_at IS '更新日時';


--
-- Name: product_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_mappings_id_seq OWNED BY public.product_mappings.id;


--
-- Name: supplier_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_items (
    id bigint NOT NULL,
    supplier_id bigint NOT NULL,
    lead_time_days integer,
    valid_to date DEFAULT '9999-12-31'::date NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    maker_part_no character varying(100) NOT NULL,
    display_name character varying(200) NOT NULL,
    notes text,
    base_unit character varying(20) NOT NULL,
    net_weight numeric(10,3),
    weight_unit character varying(20),
    internal_unit character varying(20),
    external_unit character varying(20),
    qty_per_internal_unit numeric(10,4),
    consumption_limit_days integer,
    requires_lot_number boolean DEFAULT true NOT NULL,
    maker_code character varying(50),
    maker_name character varying(200),
    capacity numeric(10,3),
    warranty_period_days integer,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE supplier_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.supplier_items IS '仕入先品目マスタ：メーカー品番の実体（2コード体系のSSOT）';


--
-- Name: COLUMN supplier_items.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.supplier_id IS '仕入先ID';


--
-- Name: COLUMN supplier_items.lead_time_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.lead_time_days IS 'リードタイム（日）';


--
-- Name: COLUMN supplier_items.valid_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.valid_to IS '有効終了日（Soft Delete）';


--
-- Name: COLUMN supplier_items.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.created_at IS '作成日時';


--
-- Name: COLUMN supplier_items.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.updated_at IS '更新日時';


--
-- Name: COLUMN supplier_items.maker_part_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.maker_part_no IS 'メーカー品番（仕入先の品番、業務キー）';


--
-- Name: COLUMN supplier_items.display_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.display_name IS '製品名（必須）';


--
-- Name: COLUMN supplier_items.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.notes IS '備考';


--
-- Name: COLUMN supplier_items.base_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.base_unit IS '基本単位（在庫単位、必須）';


--
-- Name: COLUMN supplier_items.net_weight; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.net_weight IS '正味重量';


--
-- Name: COLUMN supplier_items.weight_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.weight_unit IS '重量単位';


--
-- Name: COLUMN supplier_items.internal_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.internal_unit IS '社内単位/引当単位（例: CAN）';


--
-- Name: COLUMN supplier_items.external_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.external_unit IS '外部単位/表示単位（例: KG）';


--
-- Name: COLUMN supplier_items.qty_per_internal_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.qty_per_internal_unit IS '内部単位あたりの数量（例: 1 CAN = 20.0 KG）';


--
-- Name: COLUMN supplier_items.consumption_limit_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.consumption_limit_days IS '消費期限日数';


--
-- Name: COLUMN supplier_items.requires_lot_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.requires_lot_number IS 'ロット番号管理が必要';


--
-- Name: COLUMN supplier_items.capacity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.capacity IS '収容数';


--
-- Name: COLUMN supplier_items.warranty_period_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.supplier_items.warranty_period_days IS '保証期間（日）';


--
-- Name: product_suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_suppliers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_suppliers_id_seq OWNED BY public.supplier_items.id;


--
-- Name: product_uom_conversions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_uom_conversions (
    conversion_id bigint NOT NULL,
    supplier_item_id bigint NOT NULL,
    external_unit character varying(20) NOT NULL,
    factor numeric(15,3) NOT NULL,
    valid_to date DEFAULT '9999-12-31'::date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE product_uom_conversions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.product_uom_conversions IS '製品単位換算マスタ：製品ごとの単位変換係数を管理';


--
-- Name: COLUMN product_uom_conversions.supplier_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_uom_conversions.supplier_item_id IS '仕入先品目ID（メーカー品番への参照）';


--
-- Name: COLUMN product_uom_conversions.external_unit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_uom_conversions.external_unit IS '外部単位';


--
-- Name: COLUMN product_uom_conversions.factor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_uom_conversions.factor IS '変換係数';


--
-- Name: COLUMN product_uom_conversions.valid_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_uom_conversions.valid_to IS '有効終了日（Soft Delete）';


--
-- Name: COLUMN product_uom_conversions.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_uom_conversions.created_at IS '作成日時';


--
-- Name: COLUMN product_uom_conversions.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_uom_conversions.updated_at IS '更新日時';


--
-- Name: product_uom_conversions_conversion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_uom_conversions_conversion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_uom_conversions_conversion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_uom_conversions_conversion_id_seq OWNED BY public.product_uom_conversions.conversion_id;


--
-- Name: product_warehouse; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_warehouse (
    supplier_item_id bigint NOT NULL,
    warehouse_id bigint NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE product_warehouse; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.product_warehouse IS '製品グループ×倉庫管理：在庫一覧の母集団として使用';


--
-- Name: COLUMN product_warehouse.warehouse_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_warehouse.warehouse_id IS '倉庫ID（複合PK）';


--
-- Name: COLUMN product_warehouse.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_warehouse.is_active IS '有効フラグ';


--
-- Name: COLUMN product_warehouse.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_warehouse.created_at IS '作成日時';


--
-- Name: COLUMN product_warehouse.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.product_warehouse.updated_at IS '更新日時';


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    role_code character varying(50) NOT NULL,
    role_name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.roles IS 'ロールマスタ：システムロール（権限グループ）を管理';


--
-- Name: COLUMN roles.role_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.role_code IS 'ロールコード（admin/user/guest等、ユニーク）';


--
-- Name: COLUMN roles.role_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.role_name IS 'ロール名';


--
-- Name: COLUMN roles.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.description IS '説明';


--
-- Name: COLUMN roles.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.created_at IS '作成日時';


--
-- Name: COLUMN roles.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.roles.updated_at IS '更新日時';


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: rpa_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rpa_jobs (
    id uuid NOT NULL,
    job_type character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    target_count integer NOT NULL,
    success_count integer NOT NULL,
    failure_count integer NOT NULL,
    error_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    timeout_at timestamp without time zone
);


--
-- Name: TABLE rpa_jobs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rpa_jobs IS 'RPAジョブ管理：RPAジョブの実行状況を管理';


--
-- Name: COLUMN rpa_jobs.job_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_jobs.job_type IS 'ジョブ種別（sales_order_entry等）';


--
-- Name: COLUMN rpa_jobs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_jobs.status IS 'ステータス（pending/validating/processing/completed/failed）';


--
-- Name: COLUMN rpa_jobs.target_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_jobs.target_count IS '対象件数';


--
-- Name: COLUMN rpa_jobs.success_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_jobs.success_count IS '成功件数';


--
-- Name: COLUMN rpa_jobs.failure_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_jobs.failure_count IS '失敗件数';


--
-- Name: COLUMN rpa_jobs.error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_jobs.error_message IS 'エラーメッセージ';


--
-- Name: COLUMN rpa_jobs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_jobs.created_at IS '作成日時';


--
-- Name: COLUMN rpa_jobs.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_jobs.updated_at IS '更新日時';


--
-- Name: COLUMN rpa_jobs.timeout_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_jobs.timeout_at IS 'タイムアウト日時';


--
-- Name: rpa_run_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rpa_run_events (
    id bigint NOT NULL,
    run_id bigint NOT NULL,
    event_type character varying(50) NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id bigint
);


--
-- Name: TABLE rpa_run_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rpa_run_events IS 'RPAイベントログ：Run制御イベントを記録';


--
-- Name: COLUMN rpa_run_events.run_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_events.run_id IS 'RPA実行記録ID';


--
-- Name: COLUMN rpa_run_events.event_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_events.event_type IS 'イベント種別';


--
-- Name: COLUMN rpa_run_events.message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_events.message IS 'メッセージ';


--
-- Name: COLUMN rpa_run_events.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_events.created_at IS '作成日時';


--
-- Name: COLUMN rpa_run_events.created_by_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_events.created_by_user_id IS '作成ユーザーID';


--
-- Name: rpa_run_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rpa_run_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rpa_run_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rpa_run_events_id_seq OWNED BY public.rpa_run_events.id;


--
-- Name: rpa_run_fetches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rpa_run_fetches (
    id bigint NOT NULL,
    rpa_type character varying(50) DEFAULT 'material_delivery_note'::character varying NOT NULL,
    start_date date,
    end_date date,
    status character varying(20) NOT NULL,
    item_count integer,
    run_created integer,
    run_updated integer,
    message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE rpa_run_fetches; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rpa_run_fetches IS 'RPA進度実績取得ログ：Step1の進度実績取得結果を記録';


--
-- Name: COLUMN rpa_run_fetches.rpa_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_fetches.rpa_type IS 'RPA種別';


--
-- Name: COLUMN rpa_run_fetches.start_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_fetches.start_date IS '開始日';


--
-- Name: COLUMN rpa_run_fetches.end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_fetches.end_date IS '終了日';


--
-- Name: COLUMN rpa_run_fetches.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_fetches.status IS 'ステータス';


--
-- Name: COLUMN rpa_run_fetches.item_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_fetches.item_count IS 'アイテム数';


--
-- Name: COLUMN rpa_run_fetches.run_created; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_fetches.run_created IS 'Run作成数';


--
-- Name: COLUMN rpa_run_fetches.run_updated; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_fetches.run_updated IS 'Run更新数';


--
-- Name: COLUMN rpa_run_fetches.message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_fetches.message IS 'メッセージ';


--
-- Name: COLUMN rpa_run_fetches.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_fetches.created_at IS '作成日時';


--
-- Name: rpa_run_fetches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rpa_run_fetches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rpa_run_fetches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rpa_run_fetches_id_seq OWNED BY public.rpa_run_fetches.id;


--
-- Name: rpa_run_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rpa_run_groups (
    id bigint NOT NULL,
    rpa_type character varying(50) DEFAULT 'material_delivery_note'::character varying NOT NULL,
    grouping_method character varying(50) NOT NULL,
    max_items_per_run integer,
    planned_run_count integer,
    created_by_user_id bigint,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE rpa_run_groups; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rpa_run_groups IS 'RPAランググループ：Step3のグルーピング結果（Runグループ）';


--
-- Name: COLUMN rpa_run_groups.rpa_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_groups.rpa_type IS 'RPA種別';


--
-- Name: COLUMN rpa_run_groups.grouping_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_groups.grouping_method IS 'グルーピング方法';


--
-- Name: COLUMN rpa_run_groups.max_items_per_run; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_groups.max_items_per_run IS 'Run当たり最大アイテム数';


--
-- Name: COLUMN rpa_run_groups.planned_run_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_groups.planned_run_count IS '計画Run数';


--
-- Name: COLUMN rpa_run_groups.created_by_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_groups.created_by_user_id IS '作成ユーザーID';


--
-- Name: COLUMN rpa_run_groups.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_groups.created_at IS '作成日時';


--
-- Name: rpa_run_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rpa_run_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rpa_run_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rpa_run_groups_id_seq OWNED BY public.rpa_run_groups.id;


--
-- Name: rpa_run_item_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rpa_run_item_attempts (
    id bigint NOT NULL,
    run_item_id bigint NOT NULL,
    attempt_no integer NOT NULL,
    status character varying(20) NOT NULL,
    error_code character varying(100),
    error_message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE rpa_run_item_attempts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rpa_run_item_attempts IS 'RPA再試行履歴：失敗アイテムの再試行履歴を記録';


--
-- Name: COLUMN rpa_run_item_attempts.run_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_item_attempts.run_item_id IS 'RPA実行明細ID';


--
-- Name: COLUMN rpa_run_item_attempts.attempt_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_item_attempts.attempt_no IS '試行回数';


--
-- Name: COLUMN rpa_run_item_attempts.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_item_attempts.status IS 'ステータス';


--
-- Name: COLUMN rpa_run_item_attempts.error_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_item_attempts.error_code IS 'エラーコード';


--
-- Name: COLUMN rpa_run_item_attempts.error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_item_attempts.error_message IS 'エラーメッセージ';


--
-- Name: COLUMN rpa_run_item_attempts.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_item_attempts.created_at IS '作成日時';


--
-- Name: rpa_run_item_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rpa_run_item_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rpa_run_item_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rpa_run_item_attempts_id_seq OWNED BY public.rpa_run_item_attempts.id;


--
-- Name: rpa_run_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rpa_run_items (
    id bigint NOT NULL,
    run_id bigint NOT NULL,
    row_no integer NOT NULL,
    status character varying(50),
    jiku_code character varying(50),
    layer_code character varying(50),
    customer_part_no character varying(100),
    delivery_date date,
    delivery_quantity integer,
    shipping_vehicle character varying(50),
    issue_flag boolean DEFAULT true NOT NULL,
    complete_flag boolean DEFAULT false NOT NULL,
    match_result boolean,
    sap_registered boolean,
    order_no character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    lock_flag boolean DEFAULT false NOT NULL,
    item_no character varying(100),
    lot_no character varying(100),
    result_status character varying(20),
    processing_started_at timestamp with time zone,
    complement_customer_id bigint,
    complement_customer_part_no character varying(100),
    complement_match_type character varying(10),
    locked_until timestamp with time zone,
    locked_by character varying(100),
    result_pdf_path character varying(255),
    result_message text,
    last_error_code character varying(50),
    last_error_message text,
    last_error_screenshot_path character varying(255)
);


--
-- Name: COLUMN rpa_run_items.complement_customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_items.complement_customer_id IS '参照したマスタのcustomer_id';


--
-- Name: COLUMN rpa_run_items.complement_customer_part_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_items.complement_customer_part_no IS '参照したマスタのcustomer_part_no';


--
-- Name: COLUMN rpa_run_items.complement_match_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_run_items.complement_match_type IS '検索種別（exact: 完全一致, prefix: 前方一致）';


--
-- Name: rpa_run_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rpa_run_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rpa_run_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rpa_run_items_id_seq OWNED BY public.rpa_run_items.id;


--
-- Name: rpa_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rpa_runs (
    id bigint NOT NULL,
    rpa_type character varying(50) DEFAULT 'material_delivery_note'::character varying NOT NULL,
    status character varying(30) DEFAULT 'step1_done'::character varying NOT NULL,
    started_at timestamp with time zone,
    started_by_user_id bigint,
    step2_executed_at timestamp with time zone,
    step2_executed_by_user_id bigint,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    data_start_date date,
    data_end_date date,
    external_done_at timestamp with time zone,
    external_done_by_user_id bigint,
    step4_executed_at timestamp with time zone,
    customer_id bigint,
    run_group_id bigint,
    progress_percent double precision,
    estimated_minutes integer,
    paused_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    CONSTRAINT chk_rpa_runs_status CHECK (((status)::text = ANY (ARRAY[('step1_done'::character varying)::text, ('step2_confirmed'::character varying)::text, ('step3_running'::character varying)::text, ('step3_done'::character varying)::text, ('step4_checking'::character varying)::text, ('step4_ng_retry'::character varying)::text, ('step4_review'::character varying)::text, ('done'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: TABLE rpa_runs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rpa_runs IS 'RPA実行記録：素材納品書発行ワークフローの実行記録（親テーブル）';


--
-- Name: COLUMN rpa_runs.rpa_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.rpa_type IS 'RPA種別';


--
-- Name: COLUMN rpa_runs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.status IS 'ステータス（downloaded/step2_done/external_done/step4_done/cancelled）';


--
-- Name: COLUMN rpa_runs.started_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.started_at IS '開始日時';


--
-- Name: COLUMN rpa_runs.started_by_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.started_by_user_id IS '開始ユーザーID';


--
-- Name: COLUMN rpa_runs.step2_executed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.step2_executed_at IS 'Step2実行日時';


--
-- Name: COLUMN rpa_runs.step2_executed_by_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.step2_executed_by_user_id IS 'Step2実行ユーザーID';


--
-- Name: COLUMN rpa_runs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.created_at IS '作成日時';


--
-- Name: COLUMN rpa_runs.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.updated_at IS '更新日時';


--
-- Name: COLUMN rpa_runs.data_start_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.data_start_date IS 'データ開始日';


--
-- Name: COLUMN rpa_runs.data_end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.data_end_date IS 'データ終了日';


--
-- Name: COLUMN rpa_runs.external_done_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.external_done_at IS '外部処理完了日時';


--
-- Name: COLUMN rpa_runs.external_done_by_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.external_done_by_user_id IS '外部処理完了ユーザーID';


--
-- Name: COLUMN rpa_runs.step4_executed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.step4_executed_at IS 'Step4実行日時';


--
-- Name: COLUMN rpa_runs.customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.customer_id IS '顧客ID';


--
-- Name: COLUMN rpa_runs.run_group_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.run_group_id IS 'RPAランググループID';


--
-- Name: COLUMN rpa_runs.progress_percent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.progress_percent IS '進捗率（%）';


--
-- Name: COLUMN rpa_runs.estimated_minutes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.estimated_minutes IS '推定所要時間（分）';


--
-- Name: COLUMN rpa_runs.paused_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.paused_at IS '一時停止日時';


--
-- Name: COLUMN rpa_runs.cancelled_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.rpa_runs.cancelled_at IS 'キャンセル日時';


--
-- Name: rpa_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rpa_runs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rpa_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rpa_runs_id_seq OWNED BY public.rpa_runs.id;


--
-- Name: sap_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_connections (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    environment character varying(20) NOT NULL,
    description text,
    ashost character varying(255) NOT NULL,
    sysnr character varying(10) NOT NULL,
    client character varying(10) NOT NULL,
    user_name character varying(100) NOT NULL,
    passwd_encrypted text NOT NULL,
    lang character varying(10) DEFAULT 'JA'::character varying NOT NULL,
    default_bukrs character varying(10) DEFAULT '10'::character varying NOT NULL,
    default_kunnr character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE sap_connections; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sap_connections IS 'SAP接続情報：SAP ERPへの接続情報を管理（本番/テスト環境切り替えサポート）';


--
-- Name: COLUMN sap_connections.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_connections.name IS '接続名（本番/テスト等）';


--
-- Name: COLUMN sap_connections.environment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_connections.environment IS '環境識別子（production/test）';


--
-- Name: COLUMN sap_connections.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_connections.description IS '説明';


--
-- Name: COLUMN sap_connections.ashost; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_connections.ashost IS 'SAPホスト';


--
-- Name: COLUMN sap_connections.sysnr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_connections.sysnr IS 'システム番号';


--
-- Name: COLUMN sap_connections.client; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_connections.client IS 'クライアント番号';


--
-- Name: COLUMN sap_connections.user_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_connections.user_name IS 'ユーザー名';


--
-- Name: COLUMN sap_connections.passwd_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_connections.passwd_encrypted IS '暗号化パスワード';


--
-- Name: COLUMN sap_connections.lang; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_connections.lang IS '言語';


--
-- Name: COLUMN sap_connections.default_bukrs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_connections.default_bukrs IS 'デフォルト会社コード';


--
-- Name: COLUMN sap_connections.default_kunnr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_connections.default_kunnr IS 'デフォルト得意先コード';


--
-- Name: COLUMN sap_connections.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_connections.is_active IS '有効フラグ';


--
-- Name: COLUMN sap_connections.is_default; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_connections.is_default IS 'デフォルト接続フラグ';


--
-- Name: COLUMN sap_connections.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_connections.created_at IS '作成日時';


--
-- Name: COLUMN sap_connections.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_connections.updated_at IS '更新日時';


--
-- Name: sap_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sap_connections_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sap_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sap_connections_id_seq OWNED BY public.sap_connections.id;


--
-- Name: sap_fetch_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_fetch_logs (
    id bigint NOT NULL,
    connection_id bigint NOT NULL,
    fetch_batch_id character varying(50) NOT NULL,
    rfc_name character varying(100) NOT NULL,
    params jsonb NOT NULL,
    status character varying(20) NOT NULL,
    record_count integer,
    error_message text,
    duration_ms integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE sap_fetch_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sap_fetch_logs IS 'SAP取得ログ：SAP RFC呼び出しのログを記録（デバッグ・監査用）';


--
-- Name: COLUMN sap_fetch_logs.connection_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_fetch_logs.connection_id IS 'SAP接続ID';


--
-- Name: COLUMN sap_fetch_logs.fetch_batch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_fetch_logs.fetch_batch_id IS '取得バッチID';


--
-- Name: COLUMN sap_fetch_logs.rfc_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_fetch_logs.rfc_name IS 'RFC名';


--
-- Name: COLUMN sap_fetch_logs.params; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_fetch_logs.params IS '呼び出しパラメータ（JSON形式）';


--
-- Name: COLUMN sap_fetch_logs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_fetch_logs.status IS 'ステータス（SUCCESS/ERROR）';


--
-- Name: COLUMN sap_fetch_logs.record_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_fetch_logs.record_count IS '取得件数';


--
-- Name: COLUMN sap_fetch_logs.error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_fetch_logs.error_message IS 'エラーメッセージ';


--
-- Name: COLUMN sap_fetch_logs.duration_ms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_fetch_logs.duration_ms IS '処理時間（ミリ秒）';


--
-- Name: COLUMN sap_fetch_logs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_fetch_logs.created_at IS '作成日時';


--
-- Name: sap_fetch_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sap_fetch_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sap_fetch_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sap_fetch_logs_id_seq OWNED BY public.sap_fetch_logs.id;


--
-- Name: sap_material_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_material_cache (
    id bigint NOT NULL,
    connection_id bigint NOT NULL,
    zkdmat_b character varying(100) NOT NULL,
    kunnr character varying(20) NOT NULL,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    fetched_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fetch_batch_id character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE sap_material_cache; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sap_material_cache IS 'SAPマテリアルキャッシュ：Z_SCM1_RFC_MATERIAL_DOWNLOADからのET_DATAをキャッシュ';


--
-- Name: COLUMN sap_material_cache.connection_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_material_cache.connection_id IS 'SAP接続ID';


--
-- Name: COLUMN sap_material_cache.zkdmat_b; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_material_cache.zkdmat_b IS '先方品番（SAPのZKDMAT_B）';


--
-- Name: COLUMN sap_material_cache.kunnr; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_material_cache.kunnr IS '得意先コード';


--
-- Name: COLUMN sap_material_cache.raw_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_material_cache.raw_data IS 'ET_DATAの生データ（ZKDMAT_B以外の列、JSON形式）';


--
-- Name: COLUMN sap_material_cache.fetched_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_material_cache.fetched_at IS '取得日時';


--
-- Name: COLUMN sap_material_cache.fetch_batch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_material_cache.fetch_batch_id IS '取得バッチID（同一取得を識別）';


--
-- Name: COLUMN sap_material_cache.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_material_cache.created_at IS '作成日時';


--
-- Name: COLUMN sap_material_cache.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sap_material_cache.updated_at IS '更新日時';


--
-- Name: sap_material_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sap_material_cache_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sap_material_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sap_material_cache_id_seq OWNED BY public.sap_material_cache.id;


--
-- Name: seed_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seed_snapshots (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    params_json jsonb NOT NULL,
    profile_json jsonb,
    csv_dir text,
    summary_json jsonb
);


--
-- Name: TABLE seed_snapshots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.seed_snapshots IS 'スナップショット：テストデータ生成のパラメータとプロファイルを保存';


--
-- Name: COLUMN seed_snapshots.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seed_snapshots.name IS 'スナップショット名';


--
-- Name: COLUMN seed_snapshots.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seed_snapshots.created_at IS '作成日時';


--
-- Name: COLUMN seed_snapshots.params_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seed_snapshots.params_json IS '展開後の最終パラメータ（profile解決後、JSON形式）';


--
-- Name: COLUMN seed_snapshots.profile_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seed_snapshots.profile_json IS '使用したプロファイル設定（JSON形式）';


--
-- Name: COLUMN seed_snapshots.csv_dir; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seed_snapshots.csv_dir IS 'CSVエクスポートディレクトリ（オプション）';


--
-- Name: COLUMN seed_snapshots.summary_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.seed_snapshots.summary_json IS '生成結果のサマリ（件数、検証結果など、JSON形式）';


--
-- Name: seed_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seed_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seed_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.seed_snapshots_id_seq OWNED BY public.seed_snapshots.id;


--
-- Name: server_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.server_logs (
    id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    level character varying(20) NOT NULL,
    logger character varying(255) NOT NULL,
    event text,
    message text NOT NULL,
    request_id character varying(64),
    user_id bigint,
    username character varying(255),
    method character varying(16),
    path text,
    extra jsonb
);


--
-- Name: TABLE server_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.server_logs IS 'サーバーログ：アプリケーションログを保存（調査用）';


--
-- Name: COLUMN server_logs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.server_logs.created_at IS '作成日時';


--
-- Name: COLUMN server_logs.level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.server_logs.level IS 'ログレベル（DEBUG/INFO/WARNING/ERROR）';


--
-- Name: COLUMN server_logs.logger; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.server_logs.logger IS 'ロガー名';


--
-- Name: COLUMN server_logs.event; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.server_logs.event IS 'イベント名';


--
-- Name: COLUMN server_logs.message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.server_logs.message IS 'メッセージ';


--
-- Name: COLUMN server_logs.request_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.server_logs.request_id IS 'リクエストID';


--
-- Name: COLUMN server_logs.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.server_logs.user_id IS 'ユーザーID';


--
-- Name: COLUMN server_logs.username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.server_logs.username IS 'ユーザー名';


--
-- Name: COLUMN server_logs.method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.server_logs.method IS 'HTTPメソッド';


--
-- Name: COLUMN server_logs.path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.server_logs.path IS 'リクエストパス';


--
-- Name: COLUMN server_logs.extra; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.server_logs.extra IS '追加情報（JSON形式）';


--
-- Name: server_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.server_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: server_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.server_logs_id_seq OWNED BY public.server_logs.id;


--
-- Name: shipping_master_curated; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_master_curated (
    id bigint NOT NULL,
    raw_id bigint,
    customer_code character varying(50) NOT NULL,
    material_code character varying(50) NOT NULL,
    jiku_code character varying(50) NOT NULL,
    warehouse_code character varying(50),
    customer_name character varying(100),
    delivery_note_product_name text,
    customer_part_no character varying(100),
    maker_part_no character varying(100),
    maker_code character varying(50),
    maker_name character varying(100),
    supplier_code character varying(50),
    supplier_name character varying(100),
    delivery_place_code character varying(50),
    delivery_place_name character varying(200),
    shipping_warehouse character varying(100),
    shipping_slip_text text,
    transport_lt_days integer,
    has_order boolean NOT NULL,
    remarks text,
    has_duplicate_warning boolean NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    staff_name character varying(100),
    delivery_place_abbr character varying(100),
    order_existence character varying(20),
    order_flag character varying(50),
    version integer DEFAULT 1 NOT NULL,
    jiku_match_pattern character varying(100)
);


--
-- Name: TABLE shipping_master_curated; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.shipping_master_curated IS '出荷用マスタ整形済み：アプリ参照用（独立データ、既存マスタへのFK制約なし）';


--
-- Name: COLUMN shipping_master_curated.raw_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipping_master_curated.raw_id IS '生データID（shipping_master_raw参照）';


--
-- Name: COLUMN shipping_master_curated.customer_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipping_master_curated.customer_code IS '顧客コード（業務キー）';


--
-- Name: COLUMN shipping_master_curated.material_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipping_master_curated.material_code IS '材料コード（業務キー）';


--
-- Name: COLUMN shipping_master_curated.jiku_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipping_master_curated.jiku_code IS '次区コード（業務キー）';


--
-- Name: COLUMN shipping_master_curated.warehouse_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipping_master_curated.warehouse_code IS '倉庫コード';


--
-- Name: COLUMN shipping_master_curated.customer_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipping_master_curated.customer_name IS '顧客名';


--
-- Name: COLUMN shipping_master_curated.has_duplicate_warning; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipping_master_curated.has_duplicate_warning IS '重複警告フラグ';


--
-- Name: COLUMN shipping_master_curated.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipping_master_curated.created_at IS '作成日時';


--
-- Name: COLUMN shipping_master_curated.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.shipping_master_curated.updated_at IS '更新日時';


--
-- Name: shipping_master_curated_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shipping_master_curated_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shipping_master_curated_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shipping_master_curated_id_seq OWNED BY public.shipping_master_curated.id;


--
-- Name: shipping_master_raw; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_master_raw (
    id bigint NOT NULL,
    customer_code character varying(50),
    material_code character varying(50),
    jiku_code character varying(50),
    warehouse_code character varying(50),
    delivery_note_product_name text,
    customer_part_no character varying(100),
    maker_part_no character varying(100),
    order_flag character varying(20),
    maker_code character varying(50),
    maker_name character varying(100),
    supplier_code character varying(50),
    staff_name character varying(100),
    delivery_place_abbr character varying(100),
    delivery_place_code character varying(50),
    delivery_place_name character varying(200),
    shipping_warehouse character varying(100),
    shipping_slip_text text,
    transport_lt_days integer,
    order_existence character varying(20),
    remarks text,
    row_index integer NOT NULL,
    import_batch_id character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    jiku_match_pattern character varying(100)
);


--
-- Name: TABLE shipping_master_raw; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.shipping_master_raw IS '出荷用マスタ生データ：外部システムからの取得データを保存';


--
-- Name: shipping_master_raw_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shipping_master_raw_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shipping_master_raw_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shipping_master_raw_id_seq OWNED BY public.shipping_master_raw.id;


--
-- Name: smartread_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smartread_configs (
    id bigint NOT NULL,
    endpoint text NOT NULL,
    api_key text NOT NULL,
    template_ids text,
    export_type character varying(20) DEFAULT 'json'::character varying NOT NULL,
    aggregation_type character varying(50),
    watch_dir text,
    export_dir text,
    input_exts character varying(100) DEFAULT 'pdf,png,jpg,jpeg'::character varying,
    name character varying(100) DEFAULT 'default'::character varying NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_default boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE smartread_configs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.smartread_configs IS 'SmartRead設定：SmartRead OCRの設定を保存';


--
-- Name: COLUMN smartread_configs.endpoint; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_configs.endpoint IS 'エンドポイントURL';


--
-- Name: COLUMN smartread_configs.api_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_configs.api_key IS 'APIキー';


--
-- Name: COLUMN smartread_configs.template_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_configs.template_ids IS 'テンプレートID（カンマ区切り）';


--
-- Name: COLUMN smartread_configs.export_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_configs.export_type IS 'エクスポート形式（json/csv）';


--
-- Name: COLUMN smartread_configs.aggregation_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_configs.aggregation_type IS '集約タイプ';


--
-- Name: COLUMN smartread_configs.watch_dir; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_configs.watch_dir IS '監視ディレクトリ';


--
-- Name: COLUMN smartread_configs.export_dir; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_configs.export_dir IS 'エクスポートディレクトリ';


--
-- Name: COLUMN smartread_configs.input_exts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_configs.input_exts IS '入力ファイル拡張子';


--
-- Name: COLUMN smartread_configs.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_configs.name IS '設定名';


--
-- Name: COLUMN smartread_configs.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_configs.description IS '説明';


--
-- Name: COLUMN smartread_configs.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_configs.is_active IS '有効フラグ';


--
-- Name: COLUMN smartread_configs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_configs.created_at IS '作成日時';


--
-- Name: COLUMN smartread_configs.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_configs.updated_at IS '更新日時';


--
-- Name: COLUMN smartread_configs.is_default; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_configs.is_default IS 'デフォルト設定フラグ';


--
-- Name: smartread_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.smartread_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: smartread_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.smartread_configs_id_seq OWNED BY public.smartread_configs.id;


--
-- Name: smartread_export_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smartread_export_history (
    id bigint NOT NULL,
    config_id bigint NOT NULL,
    task_id character varying(255) NOT NULL,
    export_id character varying(255) NOT NULL,
    task_date date NOT NULL,
    filename character varying(500),
    wide_row_count integer NOT NULL,
    long_row_count integer NOT NULL,
    status character varying(20) NOT NULL,
    error_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE smartread_export_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.smartread_export_history IS 'SmartReadエクスポート履歴：エクスポート処理の履歴を記録';


--
-- Name: COLUMN smartread_export_history.config_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_export_history.config_id IS 'SmartRead設定ID';


--
-- Name: COLUMN smartread_export_history.task_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_export_history.task_id IS 'タスクID';


--
-- Name: COLUMN smartread_export_history.export_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_export_history.export_id IS 'エクスポートID';


--
-- Name: COLUMN smartread_export_history.task_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_export_history.task_date IS 'タスク日付';


--
-- Name: COLUMN smartread_export_history.filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_export_history.filename IS 'ファイル名';


--
-- Name: COLUMN smartread_export_history.wide_row_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_export_history.wide_row_count IS '横持ちデータ行数';


--
-- Name: COLUMN smartread_export_history.long_row_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_export_history.long_row_count IS '縦持ちデータ行数';


--
-- Name: COLUMN smartread_export_history.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_export_history.status IS 'ステータス（SUCCESS/FAILED）';


--
-- Name: COLUMN smartread_export_history.error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_export_history.error_message IS 'エラーメッセージ';


--
-- Name: COLUMN smartread_export_history.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_export_history.created_at IS '作成日時';


--
-- Name: smartread_export_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.smartread_export_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: smartread_export_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.smartread_export_history_id_seq OWNED BY public.smartread_export_history.id;


--
-- Name: smartread_long_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smartread_long_data (
    id bigint NOT NULL,
    wide_data_id bigint,
    config_id bigint NOT NULL,
    task_id character varying(255) NOT NULL,
    task_date date NOT NULL,
    row_index integer NOT NULL,
    content jsonb NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    error_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    request_id_ref bigint,
    rpa_job_id uuid,
    sap_order_no character varying(50),
    verification_result jsonb,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE smartread_long_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.smartread_long_data IS 'SmartRead縦持ちデータ：横持ちデータを変換した業務データ';


--
-- Name: COLUMN smartread_long_data.wide_data_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data.wide_data_id IS '横持ちデータID（smartread_wide_data参照）';


--
-- Name: COLUMN smartread_long_data.config_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data.config_id IS 'SmartRead設定ID';


--
-- Name: COLUMN smartread_long_data.task_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data.task_id IS 'タスクID';


--
-- Name: COLUMN smartread_long_data.task_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data.task_date IS 'タスク日付';


--
-- Name: COLUMN smartread_long_data.row_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data.row_index IS '行インデックス';


--
-- Name: COLUMN smartread_long_data.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data.content IS 'コンテンツ（JSON形式）';


--
-- Name: COLUMN smartread_long_data.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data.status IS 'ステータス（PENDING/IMPORTED/ERROR/PROCESSING）';


--
-- Name: COLUMN smartread_long_data.error_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data.error_reason IS 'エラー理由';


--
-- Name: COLUMN smartread_long_data.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data.created_at IS '作成日時';


--
-- Name: COLUMN smartread_long_data.request_id_ref; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data.request_id_ref IS 'リクエストID参照（smartread_requests）';


--
-- Name: COLUMN smartread_long_data.rpa_job_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data.rpa_job_id IS 'RPAジョブID';


--
-- Name: COLUMN smartread_long_data.sap_order_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data.sap_order_no IS 'SAP受注番号';


--
-- Name: COLUMN smartread_long_data.verification_result; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data.verification_result IS '検証結果（JSON形式）';


--
-- Name: smartread_long_data_completed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smartread_long_data_completed (
    id bigint NOT NULL,
    original_id bigint,
    wide_data_id bigint,
    config_id bigint NOT NULL,
    task_id character varying(255) NOT NULL,
    task_date date NOT NULL,
    request_id_ref bigint,
    row_index integer NOT NULL,
    content jsonb NOT NULL,
    status character varying(20) NOT NULL,
    sap_order_no character varying(50),
    completed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone NOT NULL
);


--
-- Name: TABLE smartread_long_data_completed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.smartread_long_data_completed IS 'SmartRead縦持ちデータ完了済み：完了済みアーカイブ（FK制約なし）';


--
-- Name: COLUMN smartread_long_data_completed.original_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data_completed.original_id IS '元ID（smartread_long_data）';


--
-- Name: COLUMN smartread_long_data_completed.wide_data_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data_completed.wide_data_id IS '横持ちデータID（FK制約なし）';


--
-- Name: COLUMN smartread_long_data_completed.config_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data_completed.config_id IS 'SmartRead設定ID（FK制約なし）';


--
-- Name: COLUMN smartread_long_data_completed.task_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data_completed.task_id IS 'タスクID';


--
-- Name: COLUMN smartread_long_data_completed.task_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data_completed.task_date IS 'タスク日付';


--
-- Name: COLUMN smartread_long_data_completed.request_id_ref; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data_completed.request_id_ref IS 'リクエストID参照（FK制約なし）';


--
-- Name: COLUMN smartread_long_data_completed.row_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data_completed.row_index IS '行インデックス';


--
-- Name: COLUMN smartread_long_data_completed.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data_completed.content IS 'コンテンツ（JSON形式）';


--
-- Name: COLUMN smartread_long_data_completed.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data_completed.status IS 'ステータス';


--
-- Name: COLUMN smartread_long_data_completed.sap_order_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data_completed.sap_order_no IS 'SAP受注番号';


--
-- Name: COLUMN smartread_long_data_completed.completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data_completed.completed_at IS '完了日時';


--
-- Name: COLUMN smartread_long_data_completed.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_long_data_completed.created_at IS '作成日時';


--
-- Name: smartread_long_data_completed_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.smartread_long_data_completed_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: smartread_long_data_completed_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.smartread_long_data_completed_id_seq OWNED BY public.smartread_long_data_completed.id;


--
-- Name: smartread_long_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.smartread_long_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: smartread_long_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.smartread_long_data_id_seq OWNED BY public.smartread_long_data.id;


--
-- Name: smartread_pad_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smartread_pad_runs (
    id bigint NOT NULL,
    run_id character varying(36) NOT NULL,
    config_id bigint NOT NULL,
    status character varying(20) DEFAULT 'RUNNING'::character varying NOT NULL,
    step character varying(30) DEFAULT 'CREATED'::character varying NOT NULL,
    task_id character varying(255),
    export_id character varying(255),
    filenames jsonb,
    wide_data_count integer NOT NULL,
    long_data_count integer NOT NULL,
    error_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    heartbeat_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp without time zone,
    retry_count integer NOT NULL,
    max_retries integer NOT NULL
);


--
-- Name: TABLE smartread_pad_runs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.smartread_pad_runs IS 'SmartRead PAD互換フロー実行記録：工程追跡用';


--
-- Name: COLUMN smartread_pad_runs.run_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_pad_runs.run_id IS 'ランID（UUID、ユニーク）';


--
-- Name: COLUMN smartread_pad_runs.config_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_pad_runs.config_id IS 'SmartRead設定ID';


--
-- Name: COLUMN smartread_pad_runs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_pad_runs.status IS 'ステータス（RUNNING/SUCCEEDED/FAILED/STALE）';


--
-- Name: COLUMN smartread_pad_runs.step; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_pad_runs.step IS 'ステップ';


--
-- Name: COLUMN smartread_pad_runs.task_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_pad_runs.task_id IS 'タスクID';


--
-- Name: COLUMN smartread_pad_runs.export_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_pad_runs.export_id IS 'エクスポートID';


--
-- Name: COLUMN smartread_pad_runs.filenames; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_pad_runs.filenames IS 'ファイル名リスト（JSON配列）';


--
-- Name: COLUMN smartread_pad_runs.wide_data_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_pad_runs.wide_data_count IS '横持ちデータ件数';


--
-- Name: COLUMN smartread_pad_runs.long_data_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_pad_runs.long_data_count IS '縦持ちデータ件数';


--
-- Name: COLUMN smartread_pad_runs.error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_pad_runs.error_message IS 'エラーメッセージ';


--
-- Name: COLUMN smartread_pad_runs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_pad_runs.created_at IS '作成日時';


--
-- Name: COLUMN smartread_pad_runs.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_pad_runs.updated_at IS '更新日時';


--
-- Name: COLUMN smartread_pad_runs.heartbeat_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_pad_runs.heartbeat_at IS 'ハートビート日時';


--
-- Name: COLUMN smartread_pad_runs.completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_pad_runs.completed_at IS '完了日時';


--
-- Name: COLUMN smartread_pad_runs.retry_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_pad_runs.retry_count IS 'リトライ回数';


--
-- Name: COLUMN smartread_pad_runs.max_retries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_pad_runs.max_retries IS '最大リトライ回数';


--
-- Name: smartread_pad_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.smartread_pad_runs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: smartread_pad_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.smartread_pad_runs_id_seq OWNED BY public.smartread_pad_runs.id;


--
-- Name: smartread_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smartread_requests (
    id bigint NOT NULL,
    request_id character varying(255) NOT NULL,
    task_id_ref bigint,
    task_id character varying(255) NOT NULL,
    task_date date NOT NULL,
    config_id bigint NOT NULL,
    filename character varying(500),
    num_of_pages integer,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    state character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    result_json jsonb,
    error_message text,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE smartread_requests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.smartread_requests IS 'SmartReadリクエスト管理：requestId/resultsルートで全自動化';


--
-- Name: COLUMN smartread_requests.request_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_requests.request_id IS 'リクエストID（ユニーク）';


--
-- Name: COLUMN smartread_requests.task_id_ref; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_requests.task_id_ref IS 'タスクID参照（smartread_tasks）';


--
-- Name: COLUMN smartread_requests.task_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_requests.task_id IS 'タスクID';


--
-- Name: COLUMN smartread_requests.task_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_requests.task_date IS 'タスク日付';


--
-- Name: COLUMN smartread_requests.config_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_requests.config_id IS 'SmartRead設定ID';


--
-- Name: COLUMN smartread_requests.filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_requests.filename IS 'ファイル名';


--
-- Name: COLUMN smartread_requests.num_of_pages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_requests.num_of_pages IS 'ページ数';


--
-- Name: COLUMN smartread_requests.submitted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_requests.submitted_at IS '送信日時';


--
-- Name: COLUMN smartread_requests.state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_requests.state IS '状態（PENDING/PROCESSING/COMPLETED/FAILED）';


--
-- Name: COLUMN smartread_requests.result_json; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_requests.result_json IS '結果JSON';


--
-- Name: COLUMN smartread_requests.error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_requests.error_message IS 'エラーメッセージ';


--
-- Name: COLUMN smartread_requests.completed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_requests.completed_at IS '完了日時';


--
-- Name: COLUMN smartread_requests.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_requests.created_at IS '作成日時';


--
-- Name: smartread_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.smartread_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: smartread_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.smartread_requests_id_seq OWNED BY public.smartread_requests.id;


--
-- Name: smartread_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smartread_tasks (
    id bigint NOT NULL,
    config_id bigint NOT NULL,
    task_id character varying(255) NOT NULL,
    task_date date NOT NULL,
    name character varying(255),
    state character varying(50),
    synced_at timestamp without time zone,
    skip_today boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    data_version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE smartread_tasks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.smartread_tasks IS 'SmartReadタスク管理：SmartReadタスクの管理';


--
-- Name: COLUMN smartread_tasks.config_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_tasks.config_id IS 'SmartRead設定ID';


--
-- Name: COLUMN smartread_tasks.task_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_tasks.task_id IS 'タスクID（ユニーク）';


--
-- Name: COLUMN smartread_tasks.task_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_tasks.task_date IS 'タスク日付';


--
-- Name: COLUMN smartread_tasks.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_tasks.name IS 'タスク名';


--
-- Name: COLUMN smartread_tasks.state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_tasks.state IS '状態';


--
-- Name: COLUMN smartread_tasks.synced_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_tasks.synced_at IS '同期日時';


--
-- Name: COLUMN smartread_tasks.skip_today; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_tasks.skip_today IS '本日スキップフラグ';


--
-- Name: COLUMN smartread_tasks.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_tasks.created_at IS '作成日時';


--
-- Name: smartread_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.smartread_tasks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: smartread_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.smartread_tasks_id_seq OWNED BY public.smartread_tasks.id;


--
-- Name: smartread_wide_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smartread_wide_data (
    id bigint NOT NULL,
    config_id bigint NOT NULL,
    task_id character varying(255) NOT NULL,
    task_date date NOT NULL,
    export_id character varying(255),
    filename character varying(500),
    row_index integer NOT NULL,
    content jsonb NOT NULL,
    row_fingerprint character varying(64) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    request_id_ref bigint,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE smartread_wide_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.smartread_wide_data IS 'SmartRead横持ちデータ：exportから取得したCSV行を保存（生データ）';


--
-- Name: COLUMN smartread_wide_data.config_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_wide_data.config_id IS 'SmartRead設定ID';


--
-- Name: COLUMN smartread_wide_data.task_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_wide_data.task_id IS 'タスクID';


--
-- Name: COLUMN smartread_wide_data.task_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_wide_data.task_date IS 'タスク日付';


--
-- Name: COLUMN smartread_wide_data.export_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_wide_data.export_id IS 'エクスポートID';


--
-- Name: COLUMN smartread_wide_data.filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_wide_data.filename IS 'ファイル名';


--
-- Name: COLUMN smartread_wide_data.row_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_wide_data.row_index IS '行インデックス';


--
-- Name: COLUMN smartread_wide_data.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_wide_data.content IS 'コンテンツ（JSON形式）';


--
-- Name: COLUMN smartread_wide_data.row_fingerprint; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_wide_data.row_fingerprint IS '行フィンガープリント（重複防止用ハッシュ）';


--
-- Name: COLUMN smartread_wide_data.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_wide_data.created_at IS '作成日時';


--
-- Name: COLUMN smartread_wide_data.request_id_ref; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smartread_wide_data.request_id_ref IS 'リクエストID参照（smartread_requests）';


--
-- Name: smartread_wide_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.smartread_wide_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: smartread_wide_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.smartread_wide_data_id_seq OWNED BY public.smartread_wide_data.id;


--
-- Name: stock_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_history (
    id bigint NOT NULL,
    lot_id bigint NOT NULL,
    transaction_type character varying(20) NOT NULL,
    quantity_change numeric(15,3) NOT NULL,
    quantity_after numeric(15,3) NOT NULL,
    reference_type character varying(50),
    reference_id bigint,
    transaction_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_stock_history_type CHECK (((transaction_type)::text = ANY (ARRAY[('inbound'::character varying)::text, ('allocation'::character varying)::text, ('shipment'::character varying)::text, ('adjustment'::character varying)::text, ('return'::character varying)::text, ('allocation_hold'::character varying)::text, ('allocation_release'::character varying)::text, ('withdrawal'::character varying)::text])))
);


--
-- Name: TABLE stock_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.stock_history IS '在庫履歴：追記専用の在庫台帳（イミュータブル）';


--
-- Name: COLUMN stock_history.lot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stock_history.lot_id IS 'ロットID（lot_receipts参照）';


--
-- Name: COLUMN stock_history.transaction_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stock_history.transaction_type IS 'トランザクション種別（inbound/allocation/shipment/adjustment/return/withdrawal）';


--
-- Name: COLUMN stock_history.quantity_change; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stock_history.quantity_change IS '数量変動（±）';


--
-- Name: COLUMN stock_history.quantity_after; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stock_history.quantity_after IS '変動後在庫数';


--
-- Name: COLUMN stock_history.reference_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stock_history.reference_type IS '参照種別（order/forecast等）';


--
-- Name: COLUMN stock_history.reference_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stock_history.reference_id IS '参照ID';


--
-- Name: COLUMN stock_history.transaction_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stock_history.transaction_date IS 'トランザクション日時';


--
-- Name: stock_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_history_id_seq OWNED BY public.stock_history.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id bigint NOT NULL,
    supplier_code character varying(50) NOT NULL,
    supplier_name character varying(200) NOT NULL,
    valid_to date DEFAULT '9999-12-31'::date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    short_name character varying(50),
    display_name character varying(200),
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE suppliers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.suppliers IS '仕入先マスタ：仕入先情報を管理（Soft Delete対応）';


--
-- Name: COLUMN suppliers.supplier_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.supplier_code IS '仕入先コード（業務キー）';


--
-- Name: COLUMN suppliers.supplier_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.supplier_name IS '仕入先名';


--
-- Name: COLUMN suppliers.valid_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.valid_to IS '有効終了日（Soft Delete）';


--
-- Name: COLUMN suppliers.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.created_at IS '作成日時';


--
-- Name: COLUMN suppliers.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.updated_at IS '更新日時';


--
-- Name: COLUMN suppliers.short_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.suppliers.short_name IS '短縮表示名（UI省スペース用）';


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: system_client_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_client_logs (
    id bigint NOT NULL,
    user_id bigint,
    level character varying(20) DEFAULT 'info'::character varying NOT NULL,
    message text NOT NULL,
    user_agent character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    request_id character varying(64)
);


--
-- Name: TABLE system_client_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_client_logs IS 'クライアントログ：フロントエンドのログをサーバー側に保存';


--
-- Name: COLUMN system_client_logs.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_client_logs.user_id IS 'ユーザーID';


--
-- Name: COLUMN system_client_logs.level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_client_logs.level IS 'ログレベル（debug/info/warning/error）';


--
-- Name: COLUMN system_client_logs.message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_client_logs.message IS 'メッセージ';


--
-- Name: COLUMN system_client_logs.user_agent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_client_logs.user_agent IS 'ユーザーエージェント';


--
-- Name: COLUMN system_client_logs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_client_logs.created_at IS '作成日時';


--
-- Name: COLUMN system_client_logs.request_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_client_logs.request_id IS 'リクエストID';


--
-- Name: system_client_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_client_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_client_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_client_logs_id_seq OWNED BY public.system_client_logs.id;


--
-- Name: system_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_configs (
    id bigint NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE system_configs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_configs IS 'システム設定：システム全体の設定値を管理（キー・バリュー型）';


--
-- Name: COLUMN system_configs.config_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.config_key IS '設定キー（ユニーク）';


--
-- Name: COLUMN system_configs.config_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.config_value IS '設定値';


--
-- Name: COLUMN system_configs.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.description IS '説明';


--
-- Name: COLUMN system_configs.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.created_at IS '作成日時';


--
-- Name: COLUMN system_configs.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.system_configs.updated_at IS '更新日時';


--
-- Name: system_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_configs_id_seq OWNED BY public.system_configs.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_id bigint NOT NULL,
    role_id bigint NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE user_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_roles IS 'ユーザー-ロール関連：ユーザーとロールの多対多関連を管理';


--
-- Name: COLUMN user_roles.role_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_roles.role_id IS 'ロールID（複合PK）';


--
-- Name: COLUMN user_roles.assigned_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_roles.assigned_at IS '割り当て日時';


--
-- Name: user_supplier_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_supplier_assignments (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    supplier_id bigint NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE user_supplier_assignments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_supplier_assignments IS 'ユーザー-仕入先担当割り当て：ユーザーと仕入先の担当関係を管理';


--
-- Name: COLUMN user_supplier_assignments.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_supplier_assignments.user_id IS 'ユーザーID';


--
-- Name: COLUMN user_supplier_assignments.supplier_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_supplier_assignments.supplier_id IS '仕入先ID';


--
-- Name: COLUMN user_supplier_assignments.is_primary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_supplier_assignments.is_primary IS '主担当フラグ（1仕入先につき1人のみ）';


--
-- Name: COLUMN user_supplier_assignments.assigned_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_supplier_assignments.assigned_at IS '割り当て日時';


--
-- Name: COLUMN user_supplier_assignments.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_supplier_assignments.created_at IS '作成日時';


--
-- Name: COLUMN user_supplier_assignments.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_supplier_assignments.updated_at IS '更新日時';


--
-- Name: user_supplier_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_supplier_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_supplier_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_supplier_assignments_id_seq OWNED BY public.user_supplier_assignments.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    auth_provider character varying(50) DEFAULT 'local'::character varying NOT NULL,
    azure_object_id character varying(100),
    password_hash character varying(255),
    display_name character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_system_user boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'ユーザーマスタ：システムユーザー情報を管理';


--
-- Name: COLUMN users.username; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.username IS 'ユーザー名（ログインID、ユニーク）';


--
-- Name: COLUMN users.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.email IS 'メールアドレス（ユニーク）';


--
-- Name: COLUMN users.auth_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.auth_provider IS '認証プロバイダ（local/azure等）';


--
-- Name: COLUMN users.azure_object_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.azure_object_id IS 'Azure AD オブジェクトID（ユニーク）';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_hash IS 'パスワードハッシュ';


--
-- Name: COLUMN users.display_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.display_name IS '表示名';


--
-- Name: COLUMN users.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.is_active IS 'アクティブフラグ';


--
-- Name: COLUMN users.last_login_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.last_login_at IS '最終ログイン日時';


--
-- Name: COLUMN users.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.created_at IS '作成日時';


--
-- Name: COLUMN users.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.updated_at IS '更新日時';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: v_customer_daily_products; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_customer_daily_products AS
 SELECT DISTINCT f.customer_id,
    f.supplier_item_id
   FROM public.forecast_current f
  WHERE (f.forecast_period IS NOT NULL);


--
-- Name: v_lot_allocations; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lot_allocations AS
 SELECT lot_reservations.lot_id,
    sum(lot_reservations.reserved_qty) AS allocated_quantity
   FROM public.lot_reservations
  WHERE ((lot_reservations.status)::text = 'confirmed'::text)
  GROUP BY lot_reservations.lot_id;


--
-- Name: withdrawal_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawal_lines (
    id bigint NOT NULL,
    withdrawal_id bigint NOT NULL,
    lot_receipt_id bigint NOT NULL,
    quantity numeric(15,3) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_withdrawal_lines_quantity CHECK ((quantity > (0)::numeric))
);


--
-- Name: TABLE withdrawal_lines; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.withdrawal_lines IS '出庫明細：どのreceiptから何個出庫したか（FIFO消費記録）';


--
-- Name: COLUMN withdrawal_lines.withdrawal_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawal_lines.withdrawal_id IS '出庫ID';


--
-- Name: COLUMN withdrawal_lines.lot_receipt_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawal_lines.lot_receipt_id IS 'ロット入荷ID（lot_receipts参照）';


--
-- Name: COLUMN withdrawal_lines.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawal_lines.quantity IS '出庫数量';


--
-- Name: COLUMN withdrawal_lines.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawal_lines.created_at IS '作成日時';


--
-- Name: withdrawals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawals (
    id bigint NOT NULL,
    lot_id bigint,
    quantity numeric(15,3),
    withdrawal_type character varying(20) NOT NULL,
    customer_id bigint,
    delivery_place_id bigint,
    ship_date date,
    reason text,
    reference_number character varying(100),
    withdrawn_by bigint,
    withdrawn_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cancelled_at timestamp without time zone,
    cancelled_by bigint,
    cancel_reason character varying(50),
    cancel_note text,
    due_date date NOT NULL,
    planned_ship_date date,
    CONSTRAINT chk_withdrawals_quantity CHECK ((quantity > (0)::numeric)),
    CONSTRAINT chk_withdrawals_type CHECK (((withdrawal_type)::text = ANY (ARRAY[('order_manual'::character varying)::text, ('internal_use'::character varying)::text, ('disposal'::character varying)::text, ('return'::character varying)::text, ('sample'::character varying)::text, ('other'::character varying)::text])))
);


--
-- Name: TABLE withdrawals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.withdrawals IS '出庫記録：受注外出庫の記録を管理';


--
-- Name: COLUMN withdrawals.lot_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.lot_id IS 'ロットID（レガシー：withdrawal_lines移行後は未使用）';


--
-- Name: COLUMN withdrawals.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.quantity IS '数量（レガシー：withdrawal_lines移行後は未使用）';


--
-- Name: COLUMN withdrawals.withdrawal_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.withdrawal_type IS '出庫種別（order_manual/internal_use/disposal/return/sample/other）';


--
-- Name: COLUMN withdrawals.customer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.customer_id IS '顧客ID';


--
-- Name: COLUMN withdrawals.delivery_place_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.delivery_place_id IS '納入先ID';


--
-- Name: COLUMN withdrawals.ship_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.ship_date IS '出荷日';


--
-- Name: COLUMN withdrawals.reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.reason IS '理由';


--
-- Name: COLUMN withdrawals.reference_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.reference_number IS '参照番号';


--
-- Name: COLUMN withdrawals.withdrawn_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.withdrawn_by IS '出庫実行ユーザーID';


--
-- Name: COLUMN withdrawals.withdrawn_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.withdrawn_at IS '出庫日時';


--
-- Name: COLUMN withdrawals.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.created_at IS '作成日時';


--
-- Name: COLUMN withdrawals.cancelled_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.cancelled_at IS 'キャンセル日時';


--
-- Name: COLUMN withdrawals.cancelled_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.cancelled_by IS 'キャンセル実行ユーザーID';


--
-- Name: COLUMN withdrawals.cancel_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.cancel_reason IS 'キャンセル理由';


--
-- Name: COLUMN withdrawals.cancel_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.cancel_note IS 'キャンセル補足';


--
-- Name: COLUMN withdrawals.due_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.due_date IS '納期（必須）';


--
-- Name: COLUMN withdrawals.planned_ship_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.withdrawals.planned_ship_date IS '予定出荷日（任意、LT計算用）';


--
-- Name: v_lot_available_qty; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lot_available_qty AS
 SELECT lr.id AS lot_id,
    lr.supplier_item_id,
    lr.warehouse_id,
    GREATEST((((lr.received_quantity - COALESCE(wl_sum.total_withdrawn, (0)::numeric)) - COALESCE(la.allocated_quantity, (0)::numeric)) - lr.locked_quantity), (0)::numeric) AS available_qty,
    lr.received_date AS receipt_date,
    lr.expiry_date,
    lr.status AS lot_status
   FROM ((public.lot_receipts lr
     LEFT JOIN public.v_lot_allocations la ON ((lr.id = la.lot_id)))
     LEFT JOIN ( SELECT wl.lot_receipt_id,
            sum(wl.quantity) AS total_withdrawn
           FROM (public.withdrawal_lines wl
             JOIN public.withdrawals wd ON ((wl.withdrawal_id = wd.id)))
          WHERE (wd.cancelled_at IS NULL)
          GROUP BY wl.lot_receipt_id) wl_sum ON ((wl_sum.lot_receipt_id = lr.id)))
  WHERE (((lr.status)::text = 'active'::text) AND ((lr.expiry_date IS NULL) OR (lr.expiry_date >= CURRENT_DATE)) AND ((((lr.received_quantity - COALESCE(wl_sum.total_withdrawn, (0)::numeric)) - COALESCE(la.allocated_quantity, (0)::numeric)) - lr.locked_quantity) > (0)::numeric));


--
-- Name: v_order_line_context; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_order_line_context AS
 SELECT ol.id AS order_line_id,
    o.id AS order_id,
    o.customer_id,
    ol.supplier_item_id,
    ol.delivery_place_id,
    ol.order_quantity AS quantity
   FROM (public.order_lines ol
     JOIN public.orders o ON ((o.id = ol.order_id)));


--
-- Name: v_candidate_lots_by_order_line; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_candidate_lots_by_order_line AS
 SELECT c.order_line_id,
    l.lot_id,
    l.supplier_item_id,
    l.warehouse_id,
    l.available_qty,
    l.receipt_date,
    l.expiry_date
   FROM ((public.v_order_line_context c
     JOIN public.v_customer_daily_products f ON (((f.customer_id = c.customer_id) AND (f.supplier_item_id = c.supplier_item_id))))
     JOIN public.v_lot_available_qty l ON (((l.supplier_item_id = c.supplier_item_id) AND (l.available_qty > (0)::numeric))))
  ORDER BY c.order_line_id, l.expiry_date, l.receipt_date, l.lot_id;


--
-- Name: v_customer_code_to_id; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_customer_code_to_id AS
 SELECT c.customer_code,
    c.id AS customer_id,
    COALESCE(c.customer_name, '[削除済み得意先]'::character varying) AS customer_name,
        CASE
            WHEN ((c.valid_to IS NOT NULL) AND (c.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS is_deleted
   FROM public.customers c;


--
-- Name: v_customer_item_jiku_mappings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_customer_item_jiku_mappings AS
 SELECT cijm.id,
    ci.customer_id,
    COALESCE(c.customer_code, ''::character varying) AS customer_code,
    COALESCE(c.customer_name, '[削除済み得意先]'::character varying) AS customer_name,
    ci.customer_part_no,
    cijm.jiku_code,
    cijm.delivery_place_id,
    COALESCE(dp.delivery_place_code, ''::character varying) AS delivery_place_code,
    COALESCE(dp.delivery_place_name, '[削除済み納入先]'::character varying) AS delivery_place_name,
    cijm.is_default,
    cijm.created_at,
        CASE
            WHEN ((c.valid_to IS NOT NULL) AND (c.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS customer_deleted,
        CASE
            WHEN ((dp.valid_to IS NOT NULL) AND (dp.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS delivery_place_deleted
   FROM (((public.customer_item_jiku_mappings cijm
     JOIN public.customer_items ci ON ((cijm.customer_item_id = ci.id)))
     LEFT JOIN public.customers c ON ((ci.customer_id = c.id)))
     LEFT JOIN public.delivery_places dp ON ((cijm.delivery_place_id = dp.id)));


--
-- Name: VIEW v_customer_item_jiku_mappings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_customer_item_jiku_mappings IS '顧客商品-次区マッピングビュー（soft-delete対応）';


--
-- Name: v_delivery_place_code_to_id; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_delivery_place_code_to_id AS
 SELECT d.delivery_place_code,
    d.id AS delivery_place_id,
    COALESCE(d.delivery_place_name, '[削除済み納入先]'::character varying) AS delivery_place_name,
        CASE
            WHEN ((d.valid_to IS NOT NULL) AND (d.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS is_deleted
   FROM public.delivery_places d;


--
-- Name: v_forecast_order_pairs; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_forecast_order_pairs AS
 SELECT DISTINCT f.id AS forecast_id,
    f.customer_id,
    f.supplier_item_id,
    o.id AS order_id,
    ol.delivery_place_id
   FROM ((public.forecast_current f
     JOIN public.orders o ON ((o.customer_id = f.customer_id)))
     JOIN public.order_lines ol ON (((ol.order_id = o.id) AND (ol.supplier_item_id = f.supplier_item_id))));


--
-- Name: v_lot_active_reservations; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lot_active_reservations AS
 SELECT lot_reservations.lot_id,
    sum(lot_reservations.reserved_qty) AS reserved_quantity_active
   FROM public.lot_reservations
  WHERE ((lot_reservations.status)::text = 'active'::text)
  GROUP BY lot_reservations.lot_id;


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouses (
    id bigint NOT NULL,
    warehouse_code character varying(50) NOT NULL,
    warehouse_name character varying(200) NOT NULL,
    warehouse_type character varying(20),
    valid_to date DEFAULT '9999-12-31'::date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    default_transport_lead_time_days integer,
    short_name character varying(50),
    display_name character varying(200),
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT chk_warehouse_type CHECK (((warehouse_type IS NULL) OR ((warehouse_type)::text = ANY ((ARRAY['internal'::character varying, 'external'::character varying, 'supplier'::character varying])::text[]))))
);


--
-- Name: TABLE warehouses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.warehouses IS '倉庫マスタ：倉庫情報を管理（Soft Delete対応）';


--
-- Name: COLUMN warehouses.warehouse_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouses.warehouse_code IS '倉庫コード（業務キー）';


--
-- Name: COLUMN warehouses.warehouse_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouses.warehouse_name IS '倉庫名';


--
-- Name: COLUMN warehouses.warehouse_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouses.warehouse_type IS '倉庫種別（internal/external/supplier）';


--
-- Name: COLUMN warehouses.valid_to; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouses.valid_to IS '有効終了日（Soft Delete）';


--
-- Name: COLUMN warehouses.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouses.created_at IS '作成日時';


--
-- Name: COLUMN warehouses.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouses.updated_at IS '更新日時';


--
-- Name: COLUMN warehouses.default_transport_lead_time_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouses.default_transport_lead_time_days IS 'デフォルト輸送リードタイム（日）';


--
-- Name: COLUMN warehouses.short_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouses.short_name IS '短縮表示名（UI省スペース用）';


--
-- Name: v_lot_receipt_stock; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lot_receipt_stock AS
 SELECT lr.id AS receipt_id,
    lm.id AS lot_master_id,
    lm.lot_number,
    lr.supplier_item_id,
    p.maker_part_no AS product_code,
    p.maker_part_no AS maker_part_code,
    p.maker_part_no,
    p.display_name AS product_name,
    p.display_name,
    p.capacity,
    p.warranty_period_days,
    lr.warehouse_id,
    w.warehouse_code,
    w.warehouse_name,
    COALESCE(w.short_name, ("left"((w.warehouse_name)::text, 10))::character varying) AS warehouse_short_name,
    lm.supplier_id,
    s.supplier_code,
    s.supplier_name,
    COALESCE(s.short_name, ("left"((s.supplier_name)::text, 10))::character varying) AS supplier_short_name,
    lr.received_date,
    lr.expiry_date,
    lr.unit,
    lr.status,
    lr.received_quantity AS initial_quantity,
    COALESCE(wl_sum.total_withdrawn, (0)::numeric) AS withdrawn_quantity,
    GREATEST(((lr.received_quantity - COALESCE(wl_sum.total_withdrawn, (0)::numeric)) - lr.locked_quantity), (0)::numeric) AS remaining_quantity,
    COALESCE(la.allocated_quantity, (0)::numeric) AS reserved_quantity,
    COALESCE(lar.reserved_quantity_active, (0)::numeric) AS reserved_quantity_active,
    GREATEST((((lr.received_quantity - COALESCE(wl_sum.total_withdrawn, (0)::numeric)) - lr.locked_quantity) - COALESCE(la.allocated_quantity, (0)::numeric)), (0)::numeric) AS available_quantity,
    lr.locked_quantity,
    lr.lock_reason,
    lr.inspection_status,
    lr.receipt_key,
    lr.created_at,
    lr.updated_at,
        CASE
            WHEN (lr.expiry_date IS NOT NULL) THEN (lr.expiry_date - CURRENT_DATE)
            ELSE NULL::integer
        END AS days_to_expiry
   FROM (((((((public.lot_receipts lr
     JOIN public.lot_master lm ON ((lr.lot_master_id = lm.id)))
     LEFT JOIN public.supplier_items p ON ((lr.supplier_item_id = p.id)))
     LEFT JOIN public.warehouses w ON ((lr.warehouse_id = w.id)))
     LEFT JOIN public.suppliers s ON ((lm.supplier_id = s.id)))
     LEFT JOIN ( SELECT wl.lot_receipt_id,
            sum(wl.quantity) AS total_withdrawn
           FROM (public.withdrawal_lines wl
             JOIN public.withdrawals wd ON ((wl.withdrawal_id = wd.id)))
          WHERE (wd.cancelled_at IS NULL)
          GROUP BY wl.lot_receipt_id) wl_sum ON ((wl_sum.lot_receipt_id = lr.id)))
     LEFT JOIN public.v_lot_allocations la ON ((lr.id = la.lot_id)))
     LEFT JOIN public.v_lot_active_reservations lar ON ((lr.id = lar.lot_id)))
  WHERE ((lr.status)::text = 'active'::text);


--
-- Name: VIEW v_lot_receipt_stock; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_lot_receipt_stock IS '在庫一覧（残量は集計で算出、current_quantityキャッシュ化対応準備済み）';


--
-- Name: v_inventory_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_inventory_summary AS
 SELECT pw.supplier_item_id,
    pw.warehouse_id,
    COALESCE(agg.active_lot_count, (0)::bigint) AS active_lot_count,
    COALESCE(agg.total_quantity, (0)::numeric) AS total_quantity,
    COALESCE(agg.allocated_quantity, (0)::numeric) AS allocated_quantity,
    COALESCE(agg.locked_quantity, (0)::numeric) AS locked_quantity,
    COALESCE(agg.available_quantity, (0)::numeric) AS available_quantity,
    COALESCE(agg.provisional_stock, (0)::numeric) AS provisional_stock,
    COALESCE(agg.available_with_provisional, (0)::numeric) AS available_with_provisional,
    COALESCE((agg.last_updated)::timestamp with time zone, pw.updated_at) AS last_updated,
        CASE
            WHEN (COALESCE(agg.active_lot_count, (0)::bigint) = 0) THEN 'no_lots'::text
            WHEN (COALESCE(agg.available_quantity, (0)::numeric) > (0)::numeric) THEN 'in_stock'::text
            ELSE 'depleted_only'::text
        END AS inventory_state
   FROM (public.product_warehouse pw
     LEFT JOIN ( SELECT lrs.supplier_item_id,
            lrs.warehouse_id,
            count(*) AS active_lot_count,
            sum(lrs.remaining_quantity) AS total_quantity,
            sum(lrs.reserved_quantity) AS allocated_quantity,
            sum(lrs.locked_quantity) AS locked_quantity,
            sum(lrs.available_quantity) AS available_quantity,
            COALESCE(sum(ipl.planned_quantity), (0)::numeric) AS provisional_stock,
            GREATEST((sum(lrs.available_quantity) + COALESCE(sum(ipl.planned_quantity), (0)::numeric)), (0)::numeric) AS available_with_provisional,
            max(lrs.updated_at) AS last_updated
           FROM ((public.v_lot_receipt_stock lrs
             LEFT JOIN public.inbound_plan_lines ipl ON ((lrs.supplier_item_id = ipl.supplier_item_id)))
             LEFT JOIN public.inbound_plans ip ON (((ipl.inbound_plan_id = ip.id) AND ((ip.status)::text = 'planned'::text))))
          GROUP BY lrs.supplier_item_id, lrs.warehouse_id) agg ON (((agg.supplier_item_id = pw.supplier_item_id) AND (agg.warehouse_id = pw.warehouse_id))))
  WHERE (pw.is_active = true);


--
-- Name: VIEW v_inventory_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_inventory_summary IS '在庫集計ビュー（product_warehouse起点、lot_receipts対応）';


--
-- Name: v_lot_current_stock; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lot_current_stock AS
 SELECT lr.id AS lot_id,
    lr.supplier_item_id,
    lr.warehouse_id,
    lr.received_quantity AS current_quantity,
    lr.updated_at AS last_updated
   FROM public.lot_receipts lr
  WHERE (lr.received_quantity > (0)::numeric);


--
-- Name: v_lot_details; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lot_details AS
 SELECT lr.id AS lot_id,
    lm.lot_number,
    lr.supplier_item_id,
    COALESCE(p.maker_part_no, ''::character varying) AS product_code,
    COALESCE(p.maker_part_no, ''::character varying) AS maker_part_code,
    COALESCE(p.maker_part_no, ''::character varying) AS maker_part_no,
    COALESCE(p.display_name, '[削除済み製品]'::character varying) AS product_name,
    COALESCE(p.display_name, '[削除済み製品]'::character varying) AS display_name,
    lr.warehouse_id,
    COALESCE(w.warehouse_code, ''::character varying) AS warehouse_code,
    COALESCE(w.warehouse_name, '[削除済み倉庫]'::character varying) AS warehouse_name,
    COALESCE(w.short_name, ("left"((w.warehouse_name)::text, 10))::character varying) AS warehouse_short_name,
    lm.supplier_id,
    COALESCE(s.supplier_code, ''::character varying) AS supplier_code,
    COALESCE(s.supplier_name, '[削除済み仕入先]'::character varying) AS supplier_name,
    COALESCE(s.short_name, ("left"((s.supplier_name)::text, 10))::character varying) AS supplier_short_name,
    lr.received_date,
    lr.expiry_date,
    lr.received_quantity,
    COALESCE(wl_sum.total_withdrawn, (0)::numeric) AS withdrawn_quantity,
    GREATEST(((lr.received_quantity - COALESCE(wl_sum.total_withdrawn, (0)::numeric)) - lr.locked_quantity), (0)::numeric) AS remaining_quantity,
    GREATEST(((lr.received_quantity - COALESCE(wl_sum.total_withdrawn, (0)::numeric)) - lr.locked_quantity), (0)::numeric) AS current_quantity,
    COALESCE(la.allocated_quantity, (0)::numeric) AS allocated_quantity,
    COALESCE(lar.reserved_quantity_active, (0)::numeric) AS reserved_quantity_active,
    lr.locked_quantity,
    GREATEST((((lr.received_quantity - COALESCE(wl_sum.total_withdrawn, (0)::numeric)) - lr.locked_quantity) - COALESCE(la.allocated_quantity, (0)::numeric)), (0)::numeric) AS available_quantity,
    lr.unit,
    lr.status,
    lr.lock_reason,
    lr.inspection_status,
    lr.inspection_date,
    lr.inspection_cert_number,
        CASE
            WHEN (lr.expiry_date IS NOT NULL) THEN (lr.expiry_date - CURRENT_DATE)
            ELSE NULL::integer
        END AS days_to_expiry,
    lr.temporary_lot_key,
    lr.receipt_key,
    lr.lot_master_id,
    lr.order_no,
    si.maker_part_no AS supplier_maker_part_no,
    ci_primary.customer_part_no,
    ci_primary.customer_id AS primary_customer_id,
        CASE
            WHEN (lr.supplier_item_id IS NULL) THEN 'no_supplier_item'::text
            WHEN (ci_primary.id IS NULL) THEN 'no_primary_mapping'::text
            ELSE 'mapped'::text
        END AS mapping_status,
    lr.origin_type,
    lr.origin_reference,
    lr.shipping_date,
    lr.cost_price,
    lr.sales_price,
    lr.tax_rate,
    lr.remarks,
    usa_primary.user_id AS primary_user_id,
    u_primary.username AS primary_username,
    u_primary.display_name AS primary_user_display_name,
        CASE
            WHEN ((p.valid_to IS NOT NULL) AND (p.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS product_deleted,
        CASE
            WHEN ((w.valid_to IS NOT NULL) AND (w.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS warehouse_deleted,
        CASE
            WHEN ((s.valid_to IS NOT NULL) AND (s.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS supplier_deleted,
    lr.created_at,
    lr.updated_at
   FROM (((((((((((public.lot_receipts lr
     JOIN public.lot_master lm ON ((lr.lot_master_id = lm.id)))
     LEFT JOIN public.v_lot_allocations la ON ((lr.id = la.lot_id)))
     LEFT JOIN public.v_lot_active_reservations lar ON ((lr.id = lar.lot_id)))
     LEFT JOIN public.supplier_items p ON ((lr.supplier_item_id = p.id)))
     LEFT JOIN public.warehouses w ON ((lr.warehouse_id = w.id)))
     LEFT JOIN public.suppliers s ON ((lm.supplier_id = s.id)))
     LEFT JOIN public.supplier_items si ON ((lr.supplier_item_id = si.id)))
     LEFT JOIN ( SELECT DISTINCT ON (customer_items.supplier_item_id) customer_items.supplier_item_id,
            customer_items.customer_part_no,
            customer_items.customer_id,
            customer_items.id
           FROM public.customer_items
          ORDER BY customer_items.supplier_item_id, customer_items.id) ci_primary ON ((ci_primary.supplier_item_id = lr.supplier_item_id)))
     LEFT JOIN ( SELECT wl.lot_receipt_id,
            sum(wl.quantity) AS total_withdrawn
           FROM (public.withdrawal_lines wl
             JOIN public.withdrawals wd ON ((wl.withdrawal_id = wd.id)))
          WHERE (wd.cancelled_at IS NULL)
          GROUP BY wl.lot_receipt_id) wl_sum ON ((wl_sum.lot_receipt_id = lr.id)))
     LEFT JOIN public.user_supplier_assignments usa_primary ON (((usa_primary.supplier_id = lm.supplier_id) AND (usa_primary.is_primary = true))))
     LEFT JOIN public.users u_primary ON ((u_primary.id = usa_primary.user_id)));


--
-- Name: VIEW v_lot_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_lot_details IS 'ロット詳細ビュー（担当者情報含む、soft-delete対応、仮入庫対応、Phase2 先方品番表示対応）';


--
-- Name: v_material_order_forecasts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_material_order_forecasts AS
 WITH dp_one AS (
         SELECT delivery_places.jiku_code,
            delivery_places.delivery_place_name,
            row_number() OVER (PARTITION BY delivery_places.jiku_code ORDER BY delivery_places.id) AS rn
           FROM public.delivery_places
          WHERE (delivery_places.valid_to >= CURRENT_DATE)
        ), mk_one AS (
         SELECT makers.maker_code,
            makers.maker_name,
            row_number() OVER (PARTITION BY makers.maker_code ORDER BY makers.id) AS rn
           FROM public.makers
          WHERE (makers.valid_to >= CURRENT_DATE)
        )
 SELECT mof.id,
    mof.target_month,
    mof.customer_item_id,
    mof.warehouse_id,
    mof.maker_id,
    mof.material_code,
    mof.unit,
    mof.warehouse_code,
    COALESCE(NULLIF((mof.jiku_code)::text, ''::text), (dp.jiku_code)::text, ''::text) AS jiku_code,
    COALESCE(NULLIF((mof.delivery_place)::text, ''::text), (dp.delivery_place_name)::text) AS delivery_place,
    mof.support_division,
    mof.procurement_type,
    mof.maker_code,
    COALESCE(NULLIF((mof.maker_name)::text, ''::text), (mk.maker_name)::text) AS maker_name,
    mof.material_name,
    mof.delivery_lot,
    mof.order_quantity,
    mof.month_start_instruction,
    mof.manager_name,
    mof.monthly_instruction_quantity,
    mof.next_month_notice,
    mof.daily_quantities,
    mof.period_quantities,
    mof.snapshot_at,
    mof.imported_by,
    mof.source_file_name,
    mof.created_at,
    mof.updated_at
   FROM ((public.material_order_forecasts mof
     LEFT JOIN dp_one dp ON (((NULLIF((mof.jiku_code)::text, ''::text) = (dp.jiku_code)::text) AND (dp.rn = 1))))
     LEFT JOIN mk_one mk ON ((((mof.maker_code)::text = (mk.maker_code)::text) AND (mk.rn = 1))));


--
-- Name: VIEW v_material_order_forecasts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_material_order_forecasts IS '材料発注フォーキャスト（納入先/メーカーマスタ動的補完）';


--
-- Name: v_ocr_results; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ocr_results AS
 SELECT ld.id,
    ld.wide_data_id,
    ld.config_id,
    ld.task_id,
    ld.task_date,
    ld.request_id_ref,
    ld.row_index,
    ld.status,
    ld.error_reason,
    ld.content,
    ld.created_at,
    COALESCE((ld.content ->> '得意先コード'::text), '100427105'::text) AS customer_code,
    COALESCE(oe.material_code, ((ld.content ->> '材質コード'::text))::character varying, ((ld.content ->> '材料コード'::text))::character varying) AS material_code,
    COALESCE(oe.jiku_code, ((ld.content ->> '次区'::text))::character varying) AS input_jiku_code,
    COALESCE(m_exact.jiku_code, m_pattern.jiku_code, COALESCE(oe.jiku_code, ((ld.content ->> '次区'::text))::character varying)) AS jiku_code,
        CASE
            WHEN (m_exact.id IS NOT NULL) THEN 'exact'::text
            WHEN (m_pattern.id IS NOT NULL) THEN 'pattern'::text
            ELSE 'input'::text
        END AS jiku_match_type,
    COALESCE(oe.delivery_date, ((ld.content ->> '納期'::text))::character varying, ((ld.content ->> '納入日'::text))::character varying) AS delivery_date,
    COALESCE(oe.delivery_quantity, ((ld.content ->> '納入量'::text))::character varying) AS delivery_quantity,
    COALESCE((ld.content ->> 'アイテムNo'::text), (ld.content ->> 'アイテム'::text)) AS item_no,
    COALESCE((ld.content ->> '数量単位'::text), (ld.content ->> '単位'::text)) AS order_unit,
    (ld.content ->> '入庫No'::text) AS inbound_no,
    COALESCE((ld.content ->> 'Lot No1'::text), (ld.content ->> 'Lot No'::text), (ld.content ->> 'ロットNo'::text)) AS lot_no,
    COALESCE(oe.lot_no_1, ((ld.content ->> 'Lot No1'::text))::character varying, ((ld.content ->> 'Lot No'::text))::character varying) AS lot_no_1,
    COALESCE(oe.quantity_1, ((ld.content ->> '数量1'::text))::character varying, ((ld.content ->> '数量'::text))::character varying) AS quantity_1,
    COALESCE(oe.lot_no_2, ((ld.content ->> 'Lot No2'::text))::character varying) AS lot_no_2,
    COALESCE(oe.quantity_2, ((ld.content ->> '数量2'::text))::character varying) AS quantity_2,
    oe.lot_no_1 AS manual_lot_no_1,
    oe.quantity_1 AS manual_quantity_1,
    oe.lot_no_2 AS manual_lot_no_2,
    oe.quantity_2 AS manual_quantity_2,
    oe.inbound_no AS manual_inbound_no,
    oe.inbound_no_2 AS manual_inbound_no_2,
    oe.shipping_date AS manual_shipping_date,
    oe.shipping_slip_text AS manual_shipping_slip_text,
    oe.shipping_slip_text_edited AS manual_shipping_slip_text_edited,
    oe.jiku_code AS manual_jiku_code,
    oe.material_code AS manual_material_code,
    oe.delivery_quantity AS manual_delivery_quantity,
    oe.delivery_date AS manual_delivery_date,
    oe.updated_at AS manual_updated_at,
    COALESCE(oe.version, 0) AS manual_version,
    COALESCE(oe.process_status, 'pending'::character varying) AS process_status,
    COALESCE(oe.error_flags, '{}'::jsonb) AS error_flags,
    COALESCE(m_exact.id, m_pattern.id) AS master_id,
    COALESCE(m_exact.customer_name, m_pattern.customer_name) AS customer_name,
    COALESCE(m_exact.supplier_code, m_pattern.supplier_code) AS supplier_code,
    COALESCE(m_exact.maker_name, m_pattern.maker_name) AS supplier_name,
    COALESCE(m_exact.delivery_place_code, m_pattern.delivery_place_code) AS delivery_place_code,
    COALESCE(m_exact.delivery_place_name, m_pattern.delivery_place_name) AS delivery_place_name,
    COALESCE(m_exact.warehouse_code, m_pattern.warehouse_code) AS shipping_warehouse_code,
    COALESCE(m_exact.shipping_warehouse, m_pattern.shipping_warehouse) AS shipping_warehouse_name,
    COALESCE(m_exact.shipping_slip_text, m_pattern.shipping_slip_text) AS shipping_slip_text,
    COALESCE(m_exact.transport_lt_days, m_pattern.transport_lt_days) AS transport_lt_days,
    COALESCE(m_exact.customer_part_no, m_pattern.customer_part_no) AS customer_part_no,
    COALESCE(m_exact.maker_part_no, m_pattern.maker_part_no) AS maker_part_no,
    COALESCE(m_exact.has_order, m_pattern.has_order, false) AS has_order,
        CASE
            WHEN (sap_exact.id IS NOT NULL) THEN 'exact'::text
            WHEN (sap_prefix.id IS NOT NULL) THEN 'prefix'::text
            ELSE 'not_found'::text
        END AS sap_match_type,
    COALESCE(sap_exact.zkdmat_b, sap_prefix.zkdmat_b) AS sap_matched_zkdmat_b,
    COALESCE(sap_exact.raw_data, sap_prefix.raw_data) AS sap_raw_data,
        CASE
            WHEN (COALESCE(m_exact.id, m_pattern.id) IS NULL) THEN true
            ELSE false
        END AS master_not_found,
        CASE
            WHEN ((sap_exact.id IS NULL) AND (sap_prefix.id IS NULL)) THEN true
            ELSE false
        END AS sap_not_found,
        CASE
            WHEN ((COALESCE(m_exact.jiku_code, m_pattern.jiku_code, COALESCE(oe.jiku_code, ((ld.content ->> '次区'::text))::character varying)) IS NOT NULL) AND ((COALESCE(m_exact.jiku_code, m_pattern.jiku_code, COALESCE(oe.jiku_code, ((ld.content ->> '次区'::text))::character varying)))::text !~ '^[A-Za-z][0-9]+$'::text)) THEN true
            ELSE false
        END AS jiku_format_error,
        CASE
            WHEN ((COALESCE(oe.delivery_date, ((ld.content ->> '納期'::text))::character varying) IS NOT NULL) AND ((COALESCE(oe.delivery_date, ((ld.content ->> '納期'::text))::character varying))::text !~ '^\d{4}[-/]\d{1,2}[-/]\d{1,2}$'::text)) THEN true
            ELSE false
        END AS date_format_error,
        CASE
            WHEN ((ld.status)::text = 'ERROR'::text) THEN true
            WHEN (COALESCE(m_exact.id, m_pattern.id) IS NULL) THEN true
            WHEN ((COALESCE(m_exact.jiku_code, m_pattern.jiku_code, COALESCE(oe.jiku_code, ((ld.content ->> '次区'::text))::character varying)) IS NOT NULL) AND ((COALESCE(m_exact.jiku_code, m_pattern.jiku_code, COALESCE(oe.jiku_code, ((ld.content ->> '次区'::text))::character varying)))::text !~ '^[A-Za-z][0-9]+$'::text)) THEN true
            WHEN ((COALESCE(oe.delivery_date, ((ld.content ->> '納期'::text))::character varying) IS NOT NULL) AND ((COALESCE(oe.delivery_date, ((ld.content ->> '納期'::text))::character varying))::text !~ '^\d{4}[-/]\d{1,2}[-/]\d{1,2}$'::text)) THEN true
            ELSE false
        END AS has_error,
        CASE
            WHEN ((ld.status)::text = 'ERROR'::text) THEN 'error'::text
            WHEN (COALESCE(m_exact.id, m_pattern.id) IS NULL) THEN 'error'::text
            WHEN ((sap_exact.id IS NULL) AND (sap_prefix.id IS NULL)) THEN 'error'::text
            WHEN ((sap_prefix.id IS NOT NULL) AND (sap_exact.id IS NULL)) THEN 'warning'::text
            WHEN ((COALESCE(m_exact.jiku_code, m_pattern.jiku_code, COALESCE(oe.jiku_code, ((ld.content ->> '次区'::text))::character varying)) IS NOT NULL) AND ((COALESCE(m_exact.jiku_code, m_pattern.jiku_code, COALESCE(oe.jiku_code, ((ld.content ->> '次区'::text))::character varying)))::text !~ '^[A-Za-z][0-9]+$'::text)) THEN 'error'::text
            WHEN ((COALESCE(oe.delivery_date, ((ld.content ->> '納期'::text))::character varying) IS NOT NULL) AND ((COALESCE(oe.delivery_date, ((ld.content ->> '納期'::text))::character varying))::text !~ '^\d{4}[-/]\d{1,2}[-/]\d{1,2}$'::text)) THEN 'warning'::text
            ELSE 'ok'::text
        END AS overall_reconcile_status
   FROM (((((public.smartread_long_data ld
     LEFT JOIN public.ocr_result_edits oe ON ((oe.smartread_long_data_id = ld.id)))
     LEFT JOIN public.shipping_master_curated m_exact ON (((COALESCE((ld.content ->> '得意先コード'::text), '100427105'::text) = (m_exact.customer_code)::text) AND ((COALESCE(oe.material_code, ((ld.content ->> '材質コード'::text))::character varying, ((ld.content ->> '材料コード'::text))::character varying))::text = (m_exact.material_code)::text) AND ((COALESCE(oe.jiku_code, ((ld.content ->> '次区'::text))::character varying))::text = (m_exact.jiku_code)::text))))
     LEFT JOIN LATERAL ( SELECT m.id,
            m.customer_name,
            m.supplier_code,
            m.maker_name,
            m.delivery_place_code,
            m.delivery_place_name,
            m.warehouse_code,
            m.shipping_warehouse,
            m.shipping_slip_text,
            m.transport_lt_days,
            m.customer_part_no,
            m.maker_part_no,
            m.has_order,
            m.jiku_code
           FROM public.shipping_master_curated m
          WHERE ((m_exact.id IS NULL) AND (COALESCE((ld.content ->> '得意先コード'::text), '100427105'::text) = (m.customer_code)::text) AND ((COALESCE(oe.material_code, ((ld.content ->> '材質コード'::text))::character varying, ((ld.content ->> '材料コード'::text))::character varying))::text = (m.material_code)::text) AND (m.jiku_match_pattern IS NOT NULL) AND ((COALESCE(oe.jiku_code, ((ld.content ->> '次区'::text))::character varying))::text ~~ replace((m.jiku_match_pattern)::text, '*'::text, '%'::text)))
          ORDER BY (length(replace((m.jiku_match_pattern)::text, '*'::text, ''::text))) DESC, (length((m.jiku_match_pattern)::text)) DESC, m.id
         LIMIT 1) m_pattern ON (true))
     LEFT JOIN public.sap_material_cache sap_exact ON ((((sap_exact.kunnr)::text = COALESCE((ld.content ->> '得意先コード'::text), '100427105'::text)) AND ((sap_exact.zkdmat_b)::text = (COALESCE(oe.material_code, ((ld.content ->> '材質コード'::text))::character varying, ((ld.content ->> '材料コード'::text))::character varying))::text))))
     LEFT JOIN LATERAL ( SELECT sc.id,
            sc.zkdmat_b,
            sc.raw_data
           FROM ( SELECT sap_material_cache.id,
                    sap_material_cache.zkdmat_b,
                    sap_material_cache.raw_data,
                    count(*) OVER () AS cnt
                   FROM public.sap_material_cache
                  WHERE (((sap_material_cache.kunnr)::text = COALESCE((ld.content ->> '得意先コード'::text), '100427105'::text)) AND ((sap_material_cache.zkdmat_b)::text ~~ ((COALESCE(oe.material_code, ((ld.content ->> '材質コード'::text))::character varying, ((ld.content ->> '材料コード'::text))::character varying))::text || '%'::text)))) sc
          WHERE ((sc.cnt = 1) AND (sap_exact.id IS NULL))
         LIMIT 1) sap_prefix ON (true));


--
-- Name: VIEW v_ocr_results; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_ocr_results IS 'OCR結果ビュー（SmartRead縦持ちデータ + 出荷用マスタJOIN、エラー検出含む）';


--
-- Name: v_order_line_details; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_order_line_details AS
 SELECT o.id AS order_id,
    o.order_date,
    o.customer_id,
    COALESCE(c.customer_code, ''::character varying) AS customer_code,
    COALESCE(c.customer_name, '[削除済み得意先]'::character varying) AS customer_name,
    ol.id AS line_id,
    ol.supplier_item_id,
    ol.delivery_date,
    ol.order_quantity,
    ol.unit,
    ol.delivery_place_id,
    ol.status AS line_status,
    ol.shipping_document_text,
    COALESCE(p.maker_part_no, ''::character varying) AS product_code,
    COALESCE(p.maker_part_no, ''::character varying) AS maker_part_code,
    COALESCE(p.maker_part_no, ''::character varying) AS maker_part_no,
    COALESCE(p.display_name, '[削除済み製品]'::character varying) AS product_name,
    COALESCE(p.display_name, '[削除済み製品]'::character varying) AS display_name,
    p.internal_unit AS product_internal_unit,
    p.external_unit AS product_external_unit,
    p.qty_per_internal_unit AS product_qty_per_internal_unit,
    COALESCE(dp.delivery_place_code, ''::character varying) AS delivery_place_code,
    COALESCE(dp.delivery_place_name, '[削除済み納入先]'::character varying) AS delivery_place_name,
    dp.jiku_code,
    ci.customer_part_no,
    COALESCE(s.supplier_name, '[削除済み仕入先]'::character varying) AS supplier_name,
    COALESCE(res_sum.allocated_qty, (0)::numeric) AS allocated_quantity,
        CASE
            WHEN ((c.valid_to IS NOT NULL) AND (c.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS customer_deleted,
        CASE
            WHEN ((p.valid_to IS NOT NULL) AND (p.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS product_deleted,
        CASE
            WHEN ((dp.valid_to IS NOT NULL) AND (dp.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS delivery_place_deleted
   FROM (((((((public.orders o
     LEFT JOIN public.customers c ON ((o.customer_id = c.id)))
     LEFT JOIN public.order_lines ol ON ((ol.order_id = o.id)))
     LEFT JOIN public.supplier_items p ON ((ol.supplier_item_id = p.id)))
     LEFT JOIN public.delivery_places dp ON ((ol.delivery_place_id = dp.id)))
     LEFT JOIN public.customer_items ci ON (((ci.customer_id = o.customer_id) AND (ci.supplier_item_id = ol.supplier_item_id))))
     LEFT JOIN public.suppliers s ON ((p.supplier_id = s.id)))
     LEFT JOIN ( SELECT lot_reservations.source_id,
            sum(lot_reservations.reserved_qty) AS allocated_qty
           FROM public.lot_reservations
          WHERE (((lot_reservations.source_type)::text = 'ORDER'::text) AND ((lot_reservations.status)::text = ANY ((ARRAY['active'::character varying, 'confirmed'::character varying])::text[])))
          GROUP BY lot_reservations.source_id) res_sum ON ((res_sum.source_id = ol.id)));


--
-- Name: VIEW v_order_line_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_order_line_details IS '受注明細の詳細情報ビュー（soft-delete対応）';


--
-- Name: v_product_code_to_id; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_product_code_to_id AS
 SELECT p.maker_part_no AS product_code,
    p.maker_part_no AS maker_part_code,
    p.maker_part_no,
    p.id AS supplier_item_id,
    COALESCE(p.display_name, '[削除済み製品]'::character varying) AS product_name,
    COALESCE(p.display_name, '[削除済み製品]'::character varying) AS display_name,
        CASE
            WHEN ((p.valid_to IS NOT NULL) AND (p.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS is_deleted
   FROM public.supplier_items p;


--
-- Name: v_supplier_code_to_id; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_supplier_code_to_id AS
 SELECT s.supplier_code,
    s.id AS supplier_id,
    COALESCE(s.supplier_name, '[削除済み仕入先]'::character varying) AS supplier_name,
        CASE
            WHEN ((s.valid_to IS NOT NULL) AND (s.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS is_deleted
   FROM public.suppliers s;


--
-- Name: VIEW v_supplier_code_to_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_supplier_code_to_id IS '仕入先コード→IDマッピング（soft-delete対応）';


--
-- Name: v_user_supplier_assignments; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_user_supplier_assignments AS
 SELECT usa.id,
    usa.user_id,
    u.username,
    u.display_name,
    usa.supplier_id,
    COALESCE(s.supplier_code, ''::character varying) AS supplier_code,
    COALESCE(s.supplier_name, '[削除済み仕入先]'::character varying) AS supplier_name,
    usa.is_primary,
    usa.assigned_at,
    usa.created_at,
    usa.updated_at,
        CASE
            WHEN ((s.valid_to IS NOT NULL) AND (s.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS supplier_deleted
   FROM ((public.user_supplier_assignments usa
     JOIN public.users u ON ((usa.user_id = u.id)))
     LEFT JOIN public.suppliers s ON ((usa.supplier_id = s.id)));


--
-- Name: VIEW v_user_supplier_assignments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_user_supplier_assignments IS 'ユーザー-仕入先担当割り当てビュー（soft-delete対応）';


--
-- Name: v_warehouse_code_to_id; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_warehouse_code_to_id AS
 SELECT w.warehouse_code,
    w.id AS warehouse_id,
    COALESCE(w.warehouse_name, '[削除済み倉庫]'::character varying) AS warehouse_name,
    w.warehouse_type,
        CASE
            WHEN ((w.valid_to IS NOT NULL) AND (w.valid_to <= CURRENT_DATE)) THEN true
            ELSE false
        END AS is_deleted
   FROM public.warehouses w;


--
-- Name: VIEW v_warehouse_code_to_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_warehouse_code_to_id IS '倉庫コード→IDマッピング（soft-delete対応）';


--
-- Name: warehouse_delivery_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouse_delivery_routes (
    id bigint NOT NULL,
    warehouse_id bigint NOT NULL,
    delivery_place_id bigint NOT NULL,
    supplier_item_id bigint,
    transport_lead_time_days integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE warehouse_delivery_routes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.warehouse_delivery_routes IS '輸送経路マスタ：倉庫から納入先への輸送リードタイムを管理';


--
-- Name: COLUMN warehouse_delivery_routes.warehouse_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouse_delivery_routes.warehouse_id IS '倉庫ID';


--
-- Name: COLUMN warehouse_delivery_routes.delivery_place_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouse_delivery_routes.delivery_place_id IS '納入先ID';


--
-- Name: COLUMN warehouse_delivery_routes.supplier_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouse_delivery_routes.supplier_item_id IS '仕入先品目ID（メーカー品番への参照、NULLの場合は経路デフォルト）';


--
-- Name: COLUMN warehouse_delivery_routes.transport_lead_time_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouse_delivery_routes.transport_lead_time_days IS '輸送リードタイム（日）';


--
-- Name: COLUMN warehouse_delivery_routes.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouse_delivery_routes.is_active IS '有効フラグ';


--
-- Name: COLUMN warehouse_delivery_routes.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouse_delivery_routes.notes IS '備考';


--
-- Name: COLUMN warehouse_delivery_routes.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouse_delivery_routes.created_at IS '作成日時';


--
-- Name: COLUMN warehouse_delivery_routes.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.warehouse_delivery_routes.updated_at IS '更新日時';


--
-- Name: warehouse_delivery_routes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouse_delivery_routes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouse_delivery_routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouse_delivery_routes_id_seq OWNED BY public.warehouse_delivery_routes.id;


--
-- Name: warehouses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouses_id_seq OWNED BY public.warehouses.id;


--
-- Name: withdrawal_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.withdrawal_lines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: withdrawal_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.withdrawal_lines_id_seq OWNED BY public.withdrawal_lines.id;


--
-- Name: withdrawals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.withdrawals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: withdrawals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.withdrawals_id_seq OWNED BY public.withdrawals.id;


--
-- Name: adjustments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adjustments ALTER COLUMN id SET DEFAULT nextval('public.adjustments_id_seq'::regclass);


--
-- Name: allocation_suggestions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions ALTER COLUMN id SET DEFAULT nextval('public.allocation_suggestions_id_seq'::regclass);


--
-- Name: allocation_traces id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_traces ALTER COLUMN id SET DEFAULT nextval('public.allocation_traces_id_seq'::regclass);


--
-- Name: batch_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_jobs ALTER COLUMN id SET DEFAULT nextval('public.batch_jobs_id_seq'::regclass);


--
-- Name: business_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_rules ALTER COLUMN id SET DEFAULT nextval('public.business_rules_id_seq'::regclass);


--
-- Name: cloud_flow_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cloud_flow_configs ALTER COLUMN id SET DEFAULT nextval('public.cloud_flow_configs_id_seq'::regclass);


--
-- Name: cloud_flow_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cloud_flow_jobs ALTER COLUMN id SET DEFAULT nextval('public.cloud_flow_jobs_id_seq'::regclass);


--
-- Name: company_calendars id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_calendars ALTER COLUMN id SET DEFAULT nextval('public.company_calendars_id_seq'::regclass);


--
-- Name: customer_item_delivery_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_delivery_settings ALTER COLUMN id SET DEFAULT nextval('public.customer_item_delivery_settings_id_seq'::regclass);


--
-- Name: customer_item_jiku_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_jiku_mappings ALTER COLUMN id SET DEFAULT nextval('public.customer_item_jiku_mappings_id_seq'::regclass);


--
-- Name: customer_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_items ALTER COLUMN id SET DEFAULT nextval('public.customer_items_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: delivery_places id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_places ALTER COLUMN id SET DEFAULT nextval('public.delivery_places_id_seq'::regclass);


--
-- Name: expected_lots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expected_lots ALTER COLUMN id SET DEFAULT nextval('public.expected_lots_id_seq'::regclass);


--
-- Name: forecast_current id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_current ALTER COLUMN id SET DEFAULT nextval('public.forecast_current_id_seq'::regclass);


--
-- Name: forecast_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_history ALTER COLUMN id SET DEFAULT nextval('public.forecast_history_id_seq'::regclass);


--
-- Name: holiday_calendars id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holiday_calendars ALTER COLUMN id SET DEFAULT nextval('public.holiday_calendars_id_seq'::regclass);


--
-- Name: inbound_plan_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plan_lines ALTER COLUMN id SET DEFAULT nextval('public.inbound_plan_lines_id_seq'::regclass);


--
-- Name: inbound_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plans ALTER COLUMN id SET DEFAULT nextval('public.inbound_plans_id_seq'::regclass);


--
-- Name: lot_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_master ALTER COLUMN id SET DEFAULT nextval('public.lot_master_id_seq'::regclass);


--
-- Name: lot_receipts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_receipts ALTER COLUMN id SET DEFAULT nextval('public.lot_receipts_id_seq'::regclass);


--
-- Name: lot_reservation_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_reservation_history ALTER COLUMN id SET DEFAULT nextval('public.lot_reservation_history_id_seq'::regclass);


--
-- Name: lot_reservations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_reservations ALTER COLUMN id SET DEFAULT nextval('public.lot_reservations_id_seq'::regclass);


--
-- Name: makers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.makers ALTER COLUMN id SET DEFAULT nextval('public.makers_id_seq'::regclass);


--
-- Name: master_change_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_change_logs ALTER COLUMN id SET DEFAULT nextval('public.master_change_logs_id_seq'::regclass);


--
-- Name: material_order_forecasts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_order_forecasts ALTER COLUMN id SET DEFAULT nextval('public.material_order_forecasts_id_seq'::regclass);


--
-- Name: missing_mapping_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missing_mapping_events ALTER COLUMN id SET DEFAULT nextval('public.missing_mapping_events_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: ocr_result_edits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ocr_result_edits ALTER COLUMN id SET DEFAULT nextval('public.ocr_result_edits_id_seq'::regclass);


--
-- Name: ocr_result_edits_completed id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ocr_result_edits_completed ALTER COLUMN id SET DEFAULT nextval('public.ocr_result_edits_completed_id_seq'::regclass);


--
-- Name: operation_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_logs ALTER COLUMN id SET DEFAULT nextval('public.operation_logs_id_seq'::regclass);


--
-- Name: order_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_groups ALTER COLUMN id SET DEFAULT nextval('public.order_groups_id_seq'::regclass);


--
-- Name: order_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines ALTER COLUMN id SET DEFAULT nextval('public.order_lines_id_seq'::regclass);


--
-- Name: order_register_rows id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_register_rows ALTER COLUMN id SET DEFAULT nextval('public.order_register_rows_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: original_delivery_calendars id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.original_delivery_calendars ALTER COLUMN id SET DEFAULT nextval('public.original_delivery_calendars_id_seq'::regclass);


--
-- Name: product_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_mappings ALTER COLUMN id SET DEFAULT nextval('public.product_mappings_id_seq'::regclass);


--
-- Name: product_uom_conversions conversion_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_uom_conversions ALTER COLUMN conversion_id SET DEFAULT nextval('public.product_uom_conversions_conversion_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: rpa_run_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_run_events ALTER COLUMN id SET DEFAULT nextval('public.rpa_run_events_id_seq'::regclass);


--
-- Name: rpa_run_fetches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_run_fetches ALTER COLUMN id SET DEFAULT nextval('public.rpa_run_fetches_id_seq'::regclass);


--
-- Name: rpa_run_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_run_groups ALTER COLUMN id SET DEFAULT nextval('public.rpa_run_groups_id_seq'::regclass);


--
-- Name: rpa_run_item_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_run_item_attempts ALTER COLUMN id SET DEFAULT nextval('public.rpa_run_item_attempts_id_seq'::regclass);


--
-- Name: rpa_run_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_run_items ALTER COLUMN id SET DEFAULT nextval('public.rpa_run_items_id_seq'::regclass);


--
-- Name: rpa_runs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_runs ALTER COLUMN id SET DEFAULT nextval('public.rpa_runs_id_seq'::regclass);


--
-- Name: sap_connections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_connections ALTER COLUMN id SET DEFAULT nextval('public.sap_connections_id_seq'::regclass);


--
-- Name: sap_fetch_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_fetch_logs ALTER COLUMN id SET DEFAULT nextval('public.sap_fetch_logs_id_seq'::regclass);


--
-- Name: sap_material_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_material_cache ALTER COLUMN id SET DEFAULT nextval('public.sap_material_cache_id_seq'::regclass);


--
-- Name: seed_snapshots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seed_snapshots ALTER COLUMN id SET DEFAULT nextval('public.seed_snapshots_id_seq'::regclass);


--
-- Name: server_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_logs ALTER COLUMN id SET DEFAULT nextval('public.server_logs_id_seq'::regclass);


--
-- Name: shipping_master_curated id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_master_curated ALTER COLUMN id SET DEFAULT nextval('public.shipping_master_curated_id_seq'::regclass);


--
-- Name: shipping_master_raw id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_master_raw ALTER COLUMN id SET DEFAULT nextval('public.shipping_master_raw_id_seq'::regclass);


--
-- Name: smartread_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_configs ALTER COLUMN id SET DEFAULT nextval('public.smartread_configs_id_seq'::regclass);


--
-- Name: smartread_export_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_export_history ALTER COLUMN id SET DEFAULT nextval('public.smartread_export_history_id_seq'::regclass);


--
-- Name: smartread_long_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_long_data ALTER COLUMN id SET DEFAULT nextval('public.smartread_long_data_id_seq'::regclass);


--
-- Name: smartread_long_data_completed id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_long_data_completed ALTER COLUMN id SET DEFAULT nextval('public.smartread_long_data_completed_id_seq'::regclass);


--
-- Name: smartread_pad_runs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_pad_runs ALTER COLUMN id SET DEFAULT nextval('public.smartread_pad_runs_id_seq'::regclass);


--
-- Name: smartread_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_requests ALTER COLUMN id SET DEFAULT nextval('public.smartread_requests_id_seq'::regclass);


--
-- Name: smartread_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_tasks ALTER COLUMN id SET DEFAULT nextval('public.smartread_tasks_id_seq'::regclass);


--
-- Name: smartread_wide_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_wide_data ALTER COLUMN id SET DEFAULT nextval('public.smartread_wide_data_id_seq'::regclass);


--
-- Name: stock_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_history ALTER COLUMN id SET DEFAULT nextval('public.stock_history_id_seq'::regclass);


--
-- Name: supplier_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_items ALTER COLUMN id SET DEFAULT nextval('public.product_suppliers_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: system_client_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_client_logs ALTER COLUMN id SET DEFAULT nextval('public.system_client_logs_id_seq'::regclass);


--
-- Name: system_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs ALTER COLUMN id SET DEFAULT nextval('public.system_configs_id_seq'::regclass);


--
-- Name: user_supplier_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_supplier_assignments ALTER COLUMN id SET DEFAULT nextval('public.user_supplier_assignments_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: warehouse_delivery_routes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_delivery_routes ALTER COLUMN id SET DEFAULT nextval('public.warehouse_delivery_routes_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Name: withdrawal_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_lines ALTER COLUMN id SET DEFAULT nextval('public.withdrawal_lines_id_seq'::regclass);


--
-- Name: withdrawals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals ALTER COLUMN id SET DEFAULT nextval('public.withdrawals_id_seq'::regclass);


--
-- Name: adjustments adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adjustments
    ADD CONSTRAINT adjustments_pkey PRIMARY KEY (id);


--
-- Name: allocation_suggestions allocation_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT allocation_suggestions_pkey PRIMARY KEY (id);


--
-- Name: allocation_traces allocation_traces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_traces
    ADD CONSTRAINT allocation_traces_pkey PRIMARY KEY (id);


--
-- Name: batch_jobs batch_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_jobs
    ADD CONSTRAINT batch_jobs_pkey PRIMARY KEY (id);


--
-- Name: business_rules business_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_rules
    ADD CONSTRAINT business_rules_pkey PRIMARY KEY (id);


--
-- Name: cloud_flow_configs cloud_flow_configs_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cloud_flow_configs
    ADD CONSTRAINT cloud_flow_configs_config_key_key UNIQUE (config_key);


--
-- Name: cloud_flow_configs cloud_flow_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cloud_flow_configs
    ADD CONSTRAINT cloud_flow_configs_pkey PRIMARY KEY (id);


--
-- Name: cloud_flow_jobs cloud_flow_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cloud_flow_jobs
    ADD CONSTRAINT cloud_flow_jobs_pkey PRIMARY KEY (id);


--
-- Name: company_calendars company_calendars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_calendars
    ADD CONSTRAINT company_calendars_pkey PRIMARY KEY (id);


--
-- Name: customer_item_delivery_settings customer_item_delivery_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_delivery_settings
    ADD CONSTRAINT customer_item_delivery_settings_pkey PRIMARY KEY (id);


--
-- Name: customer_item_jiku_mappings customer_item_jiku_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_jiku_mappings
    ADD CONSTRAINT customer_item_jiku_mappings_pkey PRIMARY KEY (id);


--
-- Name: customer_items customer_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_items
    ADD CONSTRAINT customer_items_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: delivery_places delivery_places_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_places
    ADD CONSTRAINT delivery_places_pkey PRIMARY KEY (id);


--
-- Name: expected_lots expected_lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expected_lots
    ADD CONSTRAINT expected_lots_pkey PRIMARY KEY (id);


--
-- Name: forecast_current forecast_current_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_current
    ADD CONSTRAINT forecast_current_pkey PRIMARY KEY (id);


--
-- Name: forecast_history forecast_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_history
    ADD CONSTRAINT forecast_history_pkey PRIMARY KEY (id);


--
-- Name: holiday_calendars holiday_calendars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holiday_calendars
    ADD CONSTRAINT holiday_calendars_pkey PRIMARY KEY (id);


--
-- Name: inbound_plan_lines inbound_plan_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plan_lines
    ADD CONSTRAINT inbound_plan_lines_pkey PRIMARY KEY (id);


--
-- Name: inbound_plans inbound_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plans
    ADD CONSTRAINT inbound_plans_pkey PRIMARY KEY (id);


--
-- Name: lot_master lot_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_master
    ADD CONSTRAINT lot_master_pkey PRIMARY KEY (id);


--
-- Name: lot_reservation_history lot_reservation_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_reservation_history
    ADD CONSTRAINT lot_reservation_history_pkey PRIMARY KEY (id);


--
-- Name: lot_reservations lot_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_reservations
    ADD CONSTRAINT lot_reservations_pkey PRIMARY KEY (id);


--
-- Name: lot_receipts lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_receipts
    ADD CONSTRAINT lots_pkey PRIMARY KEY (id);


--
-- Name: makers makers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.makers
    ADD CONSTRAINT makers_pkey PRIMARY KEY (id);


--
-- Name: master_change_logs master_change_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_change_logs
    ADD CONSTRAINT master_change_logs_pkey PRIMARY KEY (id);


--
-- Name: material_order_forecasts material_order_forecasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_order_forecasts
    ADD CONSTRAINT material_order_forecasts_pkey PRIMARY KEY (id);


--
-- Name: missing_mapping_events missing_mapping_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missing_mapping_events
    ADD CONSTRAINT missing_mapping_events_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: ocr_result_edits_completed ocr_result_edits_completed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ocr_result_edits_completed
    ADD CONSTRAINT ocr_result_edits_completed_pkey PRIMARY KEY (id);


--
-- Name: ocr_result_edits ocr_result_edits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ocr_result_edits
    ADD CONSTRAINT ocr_result_edits_pkey PRIMARY KEY (id);


--
-- Name: operation_logs operation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_logs
    ADD CONSTRAINT operation_logs_pkey PRIMARY KEY (id);


--
-- Name: order_groups order_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_groups
    ADD CONSTRAINT order_groups_pkey PRIMARY KEY (id);


--
-- Name: order_lines order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_pkey PRIMARY KEY (id);


--
-- Name: order_register_rows order_register_rows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_register_rows
    ADD CONSTRAINT order_register_rows_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: original_delivery_calendars original_delivery_calendars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.original_delivery_calendars
    ADD CONSTRAINT original_delivery_calendars_pkey PRIMARY KEY (id);


--
-- Name: product_mappings product_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_mappings
    ADD CONSTRAINT product_mappings_pkey PRIMARY KEY (id);


--
-- Name: supplier_items product_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_items
    ADD CONSTRAINT product_suppliers_pkey PRIMARY KEY (id);


--
-- Name: product_uom_conversions product_uom_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_uom_conversions
    ADD CONSTRAINT product_uom_conversions_pkey PRIMARY KEY (conversion_id);


--
-- Name: product_warehouse product_warehouse_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_warehouse
    ADD CONSTRAINT product_warehouse_pkey PRIMARY KEY (supplier_item_id, warehouse_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: rpa_jobs rpa_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_jobs
    ADD CONSTRAINT rpa_jobs_pkey PRIMARY KEY (id);


--
-- Name: rpa_run_events rpa_run_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_run_events
    ADD CONSTRAINT rpa_run_events_pkey PRIMARY KEY (id);


--
-- Name: rpa_run_fetches rpa_run_fetches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_run_fetches
    ADD CONSTRAINT rpa_run_fetches_pkey PRIMARY KEY (id);


--
-- Name: rpa_run_groups rpa_run_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_run_groups
    ADD CONSTRAINT rpa_run_groups_pkey PRIMARY KEY (id);


--
-- Name: rpa_run_item_attempts rpa_run_item_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_run_item_attempts
    ADD CONSTRAINT rpa_run_item_attempts_pkey PRIMARY KEY (id);


--
-- Name: rpa_run_items rpa_run_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_run_items
    ADD CONSTRAINT rpa_run_items_pkey PRIMARY KEY (id);


--
-- Name: rpa_runs rpa_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_runs
    ADD CONSTRAINT rpa_runs_pkey PRIMARY KEY (id);


--
-- Name: sap_connections sap_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_connections
    ADD CONSTRAINT sap_connections_pkey PRIMARY KEY (id);


--
-- Name: sap_fetch_logs sap_fetch_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_fetch_logs
    ADD CONSTRAINT sap_fetch_logs_pkey PRIMARY KEY (id);


--
-- Name: sap_material_cache sap_material_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_material_cache
    ADD CONSTRAINT sap_material_cache_pkey PRIMARY KEY (id);


--
-- Name: seed_snapshots seed_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seed_snapshots
    ADD CONSTRAINT seed_snapshots_pkey PRIMARY KEY (id);


--
-- Name: server_logs server_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_logs
    ADD CONSTRAINT server_logs_pkey PRIMARY KEY (id);


--
-- Name: shipping_master_curated shipping_master_curated_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_master_curated
    ADD CONSTRAINT shipping_master_curated_pkey PRIMARY KEY (id);


--
-- Name: shipping_master_raw shipping_master_raw_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_master_raw
    ADD CONSTRAINT shipping_master_raw_pkey PRIMARY KEY (id);


--
-- Name: smartread_configs smartread_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_configs
    ADD CONSTRAINT smartread_configs_pkey PRIMARY KEY (id);


--
-- Name: smartread_export_history smartread_export_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_export_history
    ADD CONSTRAINT smartread_export_history_pkey PRIMARY KEY (id);


--
-- Name: smartread_long_data_completed smartread_long_data_completed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_long_data_completed
    ADD CONSTRAINT smartread_long_data_completed_pkey PRIMARY KEY (id);


--
-- Name: smartread_long_data smartread_long_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_long_data
    ADD CONSTRAINT smartread_long_data_pkey PRIMARY KEY (id);


--
-- Name: smartread_pad_runs smartread_pad_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_pad_runs
    ADD CONSTRAINT smartread_pad_runs_pkey PRIMARY KEY (id);


--
-- Name: smartread_requests smartread_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_requests
    ADD CONSTRAINT smartread_requests_pkey PRIMARY KEY (id);


--
-- Name: smartread_requests smartread_requests_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_requests
    ADD CONSTRAINT smartread_requests_request_id_key UNIQUE (request_id);


--
-- Name: smartread_tasks smartread_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_tasks
    ADD CONSTRAINT smartread_tasks_pkey PRIMARY KEY (id);


--
-- Name: smartread_tasks smartread_tasks_task_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_tasks
    ADD CONSTRAINT smartread_tasks_task_id_key UNIQUE (task_id);


--
-- Name: smartread_wide_data smartread_wide_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_wide_data
    ADD CONSTRAINT smartread_wide_data_pkey PRIMARY KEY (id);


--
-- Name: stock_history stock_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_history
    ADD CONSTRAINT stock_history_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: system_client_logs system_client_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_client_logs
    ADD CONSTRAINT system_client_logs_pkey PRIMARY KEY (id);


--
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- Name: business_rules uq_business_rules_rule_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_rules
    ADD CONSTRAINT uq_business_rules_rule_code UNIQUE (rule_code);


--
-- Name: company_calendars uq_company_calendars_date; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_calendars
    ADD CONSTRAINT uq_company_calendars_date UNIQUE (calendar_date);


--
-- Name: customer_item_delivery_settings uq_customer_item_delivery_settings; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_delivery_settings
    ADD CONSTRAINT uq_customer_item_delivery_settings UNIQUE (customer_item_id, delivery_place_id, jiku_code);


--
-- Name: customer_item_jiku_mappings uq_customer_item_jiku; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_jiku_mappings
    ADD CONSTRAINT uq_customer_item_jiku UNIQUE (customer_item_id, jiku_code);


--
-- Name: customer_items uq_customer_items_customer_part; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_items
    ADD CONSTRAINT uq_customer_items_customer_part UNIQUE (customer_id, customer_part_no);


--
-- Name: customers uq_customers_customer_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT uq_customers_customer_code UNIQUE (customer_code);


--
-- Name: delivery_places uq_delivery_places_jiku_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_places
    ADD CONSTRAINT uq_delivery_places_jiku_code UNIQUE (jiku_code, delivery_place_code);


--
-- Name: holiday_calendars uq_holiday_calendars_date; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holiday_calendars
    ADD CONSTRAINT uq_holiday_calendars_date UNIQUE (holiday_date);


--
-- Name: inbound_plans uq_inbound_plans_plan_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plans
    ADD CONSTRAINT uq_inbound_plans_plan_number UNIQUE (plan_number);


--
-- Name: inbound_plans uq_inbound_plans_sap_po_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plans
    ADD CONSTRAINT uq_inbound_plans_sap_po_number UNIQUE (sap_po_number);


--
-- Name: lot_receipts uq_lot_receipts_lot_master_received_date; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_receipts
    ADD CONSTRAINT uq_lot_receipts_lot_master_received_date UNIQUE (lot_master_id, received_date);


--
-- Name: lot_receipts uq_lot_receipts_receipt_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_receipts
    ADD CONSTRAINT uq_lot_receipts_receipt_key UNIQUE (receipt_key);


--
-- Name: lot_receipts uq_lot_receipts_temporary_lot_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_receipts
    ADD CONSTRAINT uq_lot_receipts_temporary_lot_key UNIQUE (temporary_lot_key);


--
-- Name: lot_receipts uq_lots_temporary_lot_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_receipts
    ADD CONSTRAINT uq_lots_temporary_lot_key UNIQUE (temporary_lot_key);


--
-- Name: makers uq_makers_maker_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.makers
    ADD CONSTRAINT uq_makers_maker_code UNIQUE (maker_code);


--
-- Name: ocr_result_edits uq_ocr_result_edits_long_data_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ocr_result_edits
    ADD CONSTRAINT uq_ocr_result_edits_long_data_id UNIQUE (smartread_long_data_id);


--
-- Name: order_groups uq_order_groups_business_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_groups
    ADD CONSTRAINT uq_order_groups_business_key UNIQUE (customer_id, supplier_item_id, order_date);


--
-- Name: order_lines uq_order_lines_customer_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT uq_order_lines_customer_key UNIQUE (order_group_id, customer_order_no);


--
-- Name: original_delivery_calendars uq_original_delivery_calendars_date; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.original_delivery_calendars
    ADD CONSTRAINT uq_original_delivery_calendars_date UNIQUE (delivery_date);


--
-- Name: product_mappings uq_product_mappings_cust_part_supp; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_mappings
    ADD CONSTRAINT uq_product_mappings_cust_part_supp UNIQUE (customer_id, customer_part_code, supplier_id);


--
-- Name: roles uq_roles_role_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT uq_roles_role_code UNIQUE (role_code);


--
-- Name: sap_material_cache uq_sap_material_cache_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_material_cache
    ADD CONSTRAINT uq_sap_material_cache_key UNIQUE (connection_id, zkdmat_b, kunnr);


--
-- Name: shipping_master_curated uq_shipping_master_curated_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_master_curated
    ADD CONSTRAINT uq_shipping_master_curated_key UNIQUE (customer_code, material_code, jiku_code);


--
-- Name: supplier_items uq_supplier_items_supplier_maker; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_items
    ADD CONSTRAINT uq_supplier_items_supplier_maker UNIQUE (supplier_id, maker_part_no);


--
-- Name: suppliers uq_suppliers_supplier_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT uq_suppliers_supplier_code UNIQUE (supplier_code);


--
-- Name: system_configs uq_system_configs_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT uq_system_configs_key UNIQUE (config_key);


--
-- Name: product_uom_conversions uq_uom_conversions_product_unit; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_uom_conversions
    ADD CONSTRAINT uq_uom_conversions_product_unit UNIQUE (supplier_item_id, external_unit);


--
-- Name: user_supplier_assignments uq_user_supplier_assignments_user_supplier; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_supplier_assignments
    ADD CONSTRAINT uq_user_supplier_assignments_user_supplier UNIQUE (user_id, supplier_id);


--
-- Name: users uq_users_azure_object_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_azure_object_id UNIQUE (azure_object_id);


--
-- Name: users uq_users_email; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_email UNIQUE (email);


--
-- Name: users uq_users_username; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_username UNIQUE (username);


--
-- Name: warehouses uq_warehouses_warehouse_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT uq_warehouses_warehouse_code UNIQUE (warehouse_code);


--
-- Name: smartread_wide_data uq_wide_data_fingerprint; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_wide_data
    ADD CONSTRAINT uq_wide_data_fingerprint UNIQUE (config_id, task_date, row_fingerprint);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: user_supplier_assignments user_supplier_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_supplier_assignments
    ADD CONSTRAINT user_supplier_assignments_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: warehouse_delivery_routes warehouse_delivery_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_delivery_routes
    ADD CONSTRAINT warehouse_delivery_routes_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: withdrawal_lines withdrawal_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_lines
    ADD CONSTRAINT withdrawal_lines_pkey PRIMARY KEY (id);


--
-- Name: withdrawals withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_pkey PRIMARY KEY (id);


--
-- Name: idx_adjustments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adjustments_date ON public.adjustments USING btree (adjusted_at);


--
-- Name: idx_adjustments_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adjustments_lot ON public.adjustments USING btree (lot_id);


--
-- Name: idx_allocation_suggestions_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_suggestions_customer ON public.allocation_suggestions USING btree (customer_id);


--
-- Name: idx_allocation_suggestions_forecast; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_suggestions_forecast ON public.allocation_suggestions USING btree (forecast_id);


--
-- Name: idx_allocation_suggestions_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_suggestions_lot ON public.allocation_suggestions USING btree (lot_id);


--
-- Name: idx_allocation_suggestions_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_suggestions_period ON public.allocation_suggestions USING btree (forecast_period);


--
-- Name: idx_allocation_suggestions_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_suggestions_product ON public.allocation_suggestions USING btree (supplier_item_id);


--
-- Name: idx_allocation_traces_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_traces_created_at ON public.allocation_traces USING btree (created_at);


--
-- Name: idx_allocation_traces_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_traces_lot ON public.allocation_traces USING btree (lot_id);


--
-- Name: idx_allocation_traces_order_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allocation_traces_order_line ON public.allocation_traces USING btree (order_line_id);


--
-- Name: idx_batch_jobs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_batch_jobs_created ON public.batch_jobs USING btree (created_at);


--
-- Name: idx_batch_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_batch_jobs_status ON public.batch_jobs USING btree (status);


--
-- Name: idx_batch_jobs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_batch_jobs_type ON public.batch_jobs USING btree (job_type);


--
-- Name: idx_business_rules_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_rules_active ON public.business_rules USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_business_rules_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_rules_type ON public.business_rules USING btree (rule_type);


--
-- Name: idx_cids_customer_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cids_customer_item ON public.customer_item_delivery_settings USING btree (customer_item_id);


--
-- Name: idx_cids_delivery_place; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cids_delivery_place ON public.customer_item_delivery_settings USING btree (delivery_place_id);


--
-- Name: idx_cids_jiku_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cids_jiku_code ON public.customer_item_delivery_settings USING btree (jiku_code);


--
-- Name: idx_cijm_customer_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cijm_customer_item ON public.customer_item_jiku_mappings USING btree (customer_item_id);


--
-- Name: idx_cloud_flow_jobs_requested_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cloud_flow_jobs_requested_at ON public.cloud_flow_jobs USING btree (requested_at);


--
-- Name: idx_cloud_flow_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cloud_flow_jobs_status ON public.cloud_flow_jobs USING btree (status);


--
-- Name: idx_cloud_flow_jobs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cloud_flow_jobs_type ON public.cloud_flow_jobs USING btree (job_type);


--
-- Name: idx_company_calendars_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_calendars_date ON public.company_calendars USING btree (calendar_date);


--
-- Name: idx_company_calendars_is_workday; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_calendars_is_workday ON public.company_calendars USING btree (is_workday);


--
-- Name: idx_customer_items_supplier_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_items_supplier_item ON public.customer_items USING btree (supplier_item_id);


--
-- Name: idx_customer_items_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_items_valid_to ON public.customer_items USING btree (valid_to);


--
-- Name: idx_customers_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_valid_to ON public.customers USING btree (valid_to);


--
-- Name: idx_delivery_places_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_places_customer ON public.delivery_places USING btree (customer_id);


--
-- Name: idx_delivery_places_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_places_valid_to ON public.delivery_places USING btree (valid_to);


--
-- Name: idx_expected_lots_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expected_lots_line ON public.expected_lots USING btree (inbound_plan_line_id);


--
-- Name: idx_expected_lots_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expected_lots_number ON public.expected_lots USING btree (expected_lot_number);


--
-- Name: idx_holiday_calendars_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holiday_calendars_date ON public.holiday_calendars USING btree (holiday_date);


--
-- Name: idx_inbound_plan_lines_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_plan_lines_plan ON public.inbound_plan_lines USING btree (inbound_plan_id);


--
-- Name: idx_inbound_plans_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_plans_date ON public.inbound_plans USING btree (planned_arrival_date);


--
-- Name: idx_inbound_plans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_plans_status ON public.inbound_plans USING btree (status);


--
-- Name: idx_inbound_plans_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_plans_supplier ON public.inbound_plans USING btree (supplier_id);


--
-- Name: idx_lot_master_lot_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_master_lot_number ON public.lot_master USING btree (lot_number);


--
-- Name: idx_lot_master_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_master_supplier ON public.lot_master USING btree (supplier_id);


--
-- Name: idx_lot_receipts_expiry_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_receipts_expiry_date ON public.lot_receipts USING btree (expiry_date) WHERE (expiry_date IS NOT NULL);


--
-- Name: idx_lot_receipts_lot_master_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_receipts_lot_master_warehouse ON public.lot_receipts USING btree (lot_master_id, warehouse_id);


--
-- Name: idx_lot_receipts_origin_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_receipts_origin_type ON public.lot_receipts USING btree (origin_type);


--
-- Name: idx_lot_receipts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_receipts_status ON public.lot_receipts USING btree (status);


--
-- Name: idx_lot_receipts_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_receipts_supplier ON public.lot_receipts USING btree (supplier_id);


--
-- Name: idx_lot_receipts_supplier_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_receipts_supplier_item ON public.lot_receipts USING btree (supplier_item_id);


--
-- Name: idx_lot_receipts_temporary_lot_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_receipts_temporary_lot_key ON public.lot_receipts USING btree (temporary_lot_key) WHERE (temporary_lot_key IS NOT NULL);


--
-- Name: idx_lot_receipts_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_receipts_warehouse ON public.lot_receipts USING btree (warehouse_id);


--
-- Name: idx_lot_reservation_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_reservation_history_changed_at ON public.lot_reservation_history USING btree (changed_at);


--
-- Name: idx_lot_reservation_history_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_reservation_history_lot ON public.lot_reservation_history USING btree (lot_id);


--
-- Name: idx_lot_reservation_history_reservation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_reservation_history_reservation ON public.lot_reservation_history USING btree (reservation_id);


--
-- Name: idx_lot_reservations_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_reservations_expires_at ON public.lot_reservations USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_lot_reservations_lot_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_reservations_lot_status ON public.lot_reservations USING btree (lot_id, status);


--
-- Name: idx_lot_reservations_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_reservations_source ON public.lot_reservations USING btree (source_type, source_id);


--
-- Name: idx_lot_reservations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_reservations_status ON public.lot_reservations USING btree (status);


--
-- Name: idx_makers_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_makers_valid_to ON public.makers USING btree (valid_to);


--
-- Name: idx_master_change_logs_changed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_change_logs_changed ON public.master_change_logs USING btree (changed_at);


--
-- Name: idx_master_change_logs_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_change_logs_record ON public.master_change_logs USING btree (record_id);


--
-- Name: idx_master_change_logs_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_change_logs_table ON public.master_change_logs USING btree (table_name);


--
-- Name: idx_master_change_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_change_logs_user ON public.master_change_logs USING btree (changed_by);


--
-- Name: idx_missing_mapping_events_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_missing_mapping_events_customer ON public.missing_mapping_events USING btree (customer_id);


--
-- Name: idx_missing_mapping_events_occurred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_missing_mapping_events_occurred ON public.missing_mapping_events USING btree (occurred_at);


--
-- Name: idx_missing_mapping_events_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_missing_mapping_events_product ON public.missing_mapping_events USING btree (supplier_item_id);


--
-- Name: idx_missing_mapping_events_unresolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_missing_mapping_events_unresolved ON public.missing_mapping_events USING btree (event_type, occurred_at) WHERE (resolved_at IS NULL);


--
-- Name: idx_mof_customer_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mof_customer_item ON public.material_order_forecasts USING btree (customer_item_id);


--
-- Name: idx_mof_jiku_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mof_jiku_code ON public.material_order_forecasts USING btree (jiku_code);


--
-- Name: idx_mof_maker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mof_maker ON public.material_order_forecasts USING btree (maker_id);


--
-- Name: idx_mof_maker_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mof_maker_code ON public.material_order_forecasts USING btree (maker_code);


--
-- Name: idx_mof_material_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mof_material_code ON public.material_order_forecasts USING btree (material_code);


--
-- Name: idx_mof_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mof_snapshot ON public.material_order_forecasts USING btree (snapshot_at);


--
-- Name: idx_mof_target_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mof_target_month ON public.material_order_forecasts USING btree (target_month);


--
-- Name: idx_operation_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_logs_created ON public.operation_logs USING btree (created_at);


--
-- Name: idx_operation_logs_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_logs_table ON public.operation_logs USING btree (target_table);


--
-- Name: idx_operation_logs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_logs_type ON public.operation_logs USING btree (operation_type);


--
-- Name: idx_operation_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_logs_user ON public.operation_logs USING btree (user_id);


--
-- Name: idx_order_groups_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_groups_customer ON public.order_groups USING btree (customer_id);


--
-- Name: idx_order_groups_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_groups_date ON public.order_groups USING btree (order_date);


--
-- Name: idx_order_groups_supplier_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_groups_supplier_item ON public.order_groups USING btree (supplier_item_id);


--
-- Name: idx_order_lines_customer_order_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_customer_order_no ON public.order_lines USING btree (customer_order_no) WHERE (customer_order_no IS NOT NULL);


--
-- Name: idx_order_lines_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_date ON public.order_lines USING btree (delivery_date);


--
-- Name: idx_order_lines_delivery_place; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_delivery_place ON public.order_lines USING btree (delivery_place_id);


--
-- Name: idx_order_lines_forecast_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_forecast_reference ON public.order_lines USING btree (forecast_reference) WHERE (forecast_reference IS NOT NULL);


--
-- Name: idx_order_lines_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_order ON public.order_lines USING btree (order_id);


--
-- Name: idx_order_lines_order_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_order_group ON public.order_lines USING btree (order_group_id);


--
-- Name: idx_order_lines_order_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_order_type ON public.order_lines USING btree (order_type);


--
-- Name: idx_order_lines_sap_order_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_sap_order_no ON public.order_lines USING btree (sap_order_no) WHERE (sap_order_no IS NOT NULL);


--
-- Name: idx_order_lines_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_lines_status ON public.order_lines USING btree (status);


--
-- Name: idx_orders_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer ON public.orders USING btree (customer_id);


--
-- Name: idx_orders_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_date ON public.orders USING btree (order_date);


--
-- Name: idx_orders_lock_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_lock_expires ON public.orders USING btree (lock_expires_at) WHERE (lock_expires_at IS NOT NULL);


--
-- Name: idx_orders_locked_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_locked_by ON public.orders USING btree (locked_by_user_id);


--
-- Name: idx_original_delivery_calendars_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_original_delivery_calendars_date ON public.original_delivery_calendars USING btree (delivery_date);


--
-- Name: idx_product_mappings_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_mappings_customer ON public.product_mappings USING btree (customer_id);


--
-- Name: idx_product_mappings_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_mappings_supplier ON public.product_mappings USING btree (supplier_id);


--
-- Name: idx_product_mappings_supplier_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_mappings_supplier_item ON public.product_mappings USING btree (supplier_item_id);


--
-- Name: idx_product_mappings_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_mappings_valid_to ON public.product_mappings USING btree (valid_to);


--
-- Name: idx_product_uom_conversions_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_uom_conversions_valid_to ON public.product_uom_conversions USING btree (valid_to);


--
-- Name: idx_rpa_run_items_locked_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rpa_run_items_locked_until ON public.rpa_run_items USING btree (locked_until);


--
-- Name: idx_rpa_run_items_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rpa_run_items_run_id ON public.rpa_run_items USING btree (run_id);


--
-- Name: idx_rpa_run_items_run_row; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_rpa_run_items_run_row ON public.rpa_run_items USING btree (run_id, row_no);


--
-- Name: idx_rpa_runs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rpa_runs_created_at ON public.rpa_runs USING btree (created_at);


--
-- Name: idx_rpa_runs_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rpa_runs_customer_id ON public.rpa_runs USING btree (customer_id);


--
-- Name: idx_rpa_runs_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rpa_runs_group_id ON public.rpa_runs USING btree (run_group_id);


--
-- Name: idx_rpa_runs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rpa_runs_status ON public.rpa_runs USING btree (status);


--
-- Name: idx_rpa_runs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rpa_runs_type ON public.rpa_runs USING btree (rpa_type);


--
-- Name: idx_rri_complement_master; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rri_complement_master ON public.rpa_run_items USING btree (complement_customer_id, complement_customer_part_no);


--
-- Name: idx_server_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_server_logs_created_at ON public.server_logs USING btree (created_at);


--
-- Name: idx_server_logs_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_server_logs_level ON public.server_logs USING btree (level);


--
-- Name: idx_server_logs_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_server_logs_request_id ON public.server_logs USING btree (request_id);


--
-- Name: idx_stock_history_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_history_date ON public.stock_history USING btree (transaction_date);


--
-- Name: idx_stock_history_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_history_lot ON public.stock_history USING btree (lot_id);


--
-- Name: idx_stock_history_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_history_type ON public.stock_history USING btree (transaction_type);


--
-- Name: idx_supplier_items_maker_part; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_items_maker_part ON public.supplier_items USING btree (maker_part_no);


--
-- Name: idx_supplier_items_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_items_supplier ON public.supplier_items USING btree (supplier_id);


--
-- Name: idx_supplier_items_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_items_valid_to ON public.supplier_items USING btree (valid_to);


--
-- Name: idx_suppliers_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_valid_to ON public.suppliers USING btree (valid_to);


--
-- Name: idx_system_client_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_client_logs_created_at ON public.system_client_logs USING btree (created_at);


--
-- Name: idx_system_client_logs_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_client_logs_request_id ON public.system_client_logs USING btree (request_id);


--
-- Name: idx_system_client_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_client_logs_user_id ON public.system_client_logs USING btree (user_id);


--
-- Name: idx_system_configs_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_key ON public.system_configs USING btree (config_key);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);


--
-- Name: idx_user_supplier_assignments_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_supplier_assignments_primary ON public.user_supplier_assignments USING btree (is_primary) WHERE (is_primary = true);


--
-- Name: idx_user_supplier_assignments_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_supplier_assignments_supplier ON public.user_supplier_assignments USING btree (supplier_id);


--
-- Name: idx_user_supplier_assignments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_supplier_assignments_user ON public.user_supplier_assignments USING btree (user_id);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_active ON public.users USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_users_auth_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_auth_provider ON public.users USING btree (auth_provider);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: idx_warehouses_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouses_type ON public.warehouses USING btree (warehouse_type);


--
-- Name: idx_warehouses_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_warehouses_valid_to ON public.warehouses USING btree (valid_to);


--
-- Name: idx_wdr_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wdr_active ON public.warehouse_delivery_routes USING btree (is_active);


--
-- Name: idx_wdr_delivery_place; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wdr_delivery_place ON public.warehouse_delivery_routes USING btree (delivery_place_id);


--
-- Name: idx_wdr_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wdr_product ON public.warehouse_delivery_routes USING btree (supplier_item_id);


--
-- Name: idx_wdr_warehouse; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wdr_warehouse ON public.warehouse_delivery_routes USING btree (warehouse_id);


--
-- Name: idx_withdrawal_lines_lot_receipt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawal_lines_lot_receipt ON public.withdrawal_lines USING btree (lot_receipt_id);


--
-- Name: idx_withdrawal_lines_receipt_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawal_lines_receipt_date ON public.withdrawal_lines USING btree (lot_receipt_id, created_at);


--
-- Name: idx_withdrawal_lines_withdrawal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawal_lines_withdrawal ON public.withdrawal_lines USING btree (withdrawal_id);


--
-- Name: idx_withdrawals_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_customer ON public.withdrawals USING btree (customer_id);


--
-- Name: idx_withdrawals_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_date ON public.withdrawals USING btree (ship_date);


--
-- Name: idx_withdrawals_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_due_date ON public.withdrawals USING btree (due_date);


--
-- Name: idx_withdrawals_lot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_lot ON public.withdrawals USING btree (lot_id);


--
-- Name: idx_withdrawals_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_type ON public.withdrawals USING btree (withdrawal_type);


--
-- Name: ix_forecast_history_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_forecast_history_key ON public.forecast_history USING btree (customer_id, delivery_place_id, supplier_item_id);


--
-- Name: ix_notifications_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_id ON public.notifications USING btree (id);


--
-- Name: ix_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: ix_sap_fetch_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sap_fetch_logs_created_at ON public.sap_fetch_logs USING btree (created_at);


--
-- Name: ix_sap_fetch_logs_fetch_batch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sap_fetch_logs_fetch_batch_id ON public.sap_fetch_logs USING btree (fetch_batch_id);


--
-- Name: ix_sap_material_cache_fetched_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sap_material_cache_fetched_at ON public.sap_material_cache USING btree (fetched_at);


--
-- Name: ix_sap_material_cache_kunnr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sap_material_cache_kunnr ON public.sap_material_cache USING btree (kunnr);


--
-- Name: ix_sap_material_cache_zkdmat_b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sap_material_cache_zkdmat_b ON public.sap_material_cache USING btree (zkdmat_b);


--
-- Name: ix_smartread_pad_runs_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_smartread_pad_runs_run_id ON public.smartread_pad_runs USING btree (run_id);


--
-- Name: ux_mof_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_mof_unique ON public.material_order_forecasts USING btree (target_month, material_code, jiku_code, maker_code);


--
-- Name: lot_receipts trg_update_lot_master_aggregates; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_lot_master_aggregates AFTER INSERT OR DELETE OR UPDATE ON public.lot_receipts FOR EACH ROW EXECUTE FUNCTION public.update_lot_master_aggregates();


--
-- Name: adjustments adjustments_adjusted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adjustments
    ADD CONSTRAINT adjustments_adjusted_by_fkey FOREIGN KEY (adjusted_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: adjustments adjustments_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adjustments
    ADD CONSTRAINT adjustments_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lot_receipts(id) ON DELETE RESTRICT;


--
-- Name: allocation_suggestions allocation_suggestions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT allocation_suggestions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: allocation_suggestions allocation_suggestions_delivery_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT allocation_suggestions_delivery_place_id_fkey FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE CASCADE;


--
-- Name: allocation_suggestions allocation_suggestions_forecast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT allocation_suggestions_forecast_id_fkey FOREIGN KEY (forecast_id) REFERENCES public.forecast_current(id) ON DELETE CASCADE;


--
-- Name: allocation_suggestions allocation_suggestions_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_suggestions
    ADD CONSTRAINT allocation_suggestions_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lot_receipts(id) ON DELETE CASCADE;


--
-- Name: allocation_traces allocation_traces_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_traces
    ADD CONSTRAINT allocation_traces_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lot_receipts(id) ON DELETE CASCADE;


--
-- Name: allocation_traces allocation_traces_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allocation_traces
    ADD CONSTRAINT allocation_traces_order_line_id_fkey FOREIGN KEY (order_line_id) REFERENCES public.order_lines(id) ON DELETE CASCADE;


--
-- Name: cloud_flow_jobs cloud_flow_jobs_requested_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cloud_flow_jobs
    ADD CONSTRAINT cloud_flow_jobs_requested_by_user_id_fkey FOREIGN KEY (requested_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: customer_item_delivery_settings customer_item_delivery_settings_delivery_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_delivery_settings
    ADD CONSTRAINT customer_item_delivery_settings_delivery_place_id_fkey FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE SET NULL;


--
-- Name: customer_item_jiku_mappings customer_item_jiku_mappings_delivery_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_jiku_mappings
    ADD CONSTRAINT customer_item_jiku_mappings_delivery_place_id_fkey FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE CASCADE;


--
-- Name: customer_items customer_items_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_items
    ADD CONSTRAINT customer_items_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_items customer_items_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_items
    ADD CONSTRAINT customer_items_supplier_item_id_fkey FOREIGN KEY (supplier_item_id) REFERENCES public.supplier_items(id) ON DELETE SET NULL;


--
-- Name: delivery_places delivery_places_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_places
    ADD CONSTRAINT delivery_places_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: expected_lots expected_lots_inbound_plan_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expected_lots
    ADD CONSTRAINT expected_lots_inbound_plan_line_id_fkey FOREIGN KEY (inbound_plan_line_id) REFERENCES public.inbound_plan_lines(id) ON DELETE CASCADE;


--
-- Name: customer_item_delivery_settings fk_cids_customer_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_delivery_settings
    ADD CONSTRAINT fk_cids_customer_item FOREIGN KEY (customer_item_id) REFERENCES public.customer_items(id) ON DELETE CASCADE;


--
-- Name: customer_item_jiku_mappings fk_cijm_customer_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_item_jiku_mappings
    ADD CONSTRAINT fk_cijm_customer_item FOREIGN KEY (customer_item_id) REFERENCES public.customer_items(id) ON DELETE CASCADE;


--
-- Name: lot_master fk_lot_master_supplier_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_master
    ADD CONSTRAINT fk_lot_master_supplier_id FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: lot_receipts fk_lot_receipts_lot_master_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_receipts
    ADD CONSTRAINT fk_lot_receipts_lot_master_id FOREIGN KEY (lot_master_id) REFERENCES public.lot_master(id) ON DELETE RESTRICT;


--
-- Name: missing_mapping_events fk_missing_mapping_events_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missing_mapping_events
    ADD CONSTRAINT fk_missing_mapping_events_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: missing_mapping_events fk_missing_mapping_events_customer_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missing_mapping_events
    ADD CONSTRAINT fk_missing_mapping_events_customer_id FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: missing_mapping_events fk_missing_mapping_events_resolved_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missing_mapping_events
    ADD CONSTRAINT fk_missing_mapping_events_resolved_by FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: missing_mapping_events fk_missing_mapping_events_supplier_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.missing_mapping_events
    ADD CONSTRAINT fk_missing_mapping_events_supplier_id FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: material_order_forecasts fk_mof_customer_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_order_forecasts
    ADD CONSTRAINT fk_mof_customer_item FOREIGN KEY (customer_item_id) REFERENCES public.customer_items(id) ON DELETE SET NULL;


--
-- Name: material_order_forecasts fk_mof_imported_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_order_forecasts
    ADD CONSTRAINT fk_mof_imported_by FOREIGN KEY (imported_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: material_order_forecasts fk_mof_maker; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_order_forecasts
    ADD CONSTRAINT fk_mof_maker FOREIGN KEY (maker_id) REFERENCES public.makers(id) ON DELETE SET NULL;


--
-- Name: material_order_forecasts fk_mof_warehouse; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_order_forecasts
    ADD CONSTRAINT fk_mof_warehouse FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;


--
-- Name: rpa_runs fk_rpa_runs_customer_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_runs
    ADD CONSTRAINT fk_rpa_runs_customer_id FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: rpa_runs fk_rpa_runs_run_group_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_runs
    ADD CONSTRAINT fk_rpa_runs_run_group_id FOREIGN KEY (run_group_id) REFERENCES public.rpa_run_groups(id) ON DELETE SET NULL;


--
-- Name: smartread_long_data fk_smartread_long_data_request_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_long_data
    ADD CONSTRAINT fk_smartread_long_data_request_id FOREIGN KEY (request_id_ref) REFERENCES public.smartread_requests(id) ON DELETE SET NULL;


--
-- Name: smartread_long_data fk_smartread_long_data_rpa_job_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_long_data
    ADD CONSTRAINT fk_smartread_long_data_rpa_job_id FOREIGN KEY (rpa_job_id) REFERENCES public.rpa_jobs(id) ON DELETE SET NULL;


--
-- Name: smartread_wide_data fk_smartread_wide_data_request_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_wide_data
    ADD CONSTRAINT fk_smartread_wide_data_request_id FOREIGN KEY (request_id_ref) REFERENCES public.smartread_requests(id) ON DELETE SET NULL;


--
-- Name: withdrawal_lines fk_withdrawal_lines_lot_receipt_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_lines
    ADD CONSTRAINT fk_withdrawal_lines_lot_receipt_id FOREIGN KEY (lot_receipt_id) REFERENCES public.lot_receipts(id) ON DELETE RESTRICT;


--
-- Name: withdrawal_lines fk_withdrawal_lines_withdrawal_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_lines
    ADD CONSTRAINT fk_withdrawal_lines_withdrawal_id FOREIGN KEY (withdrawal_id) REFERENCES public.withdrawals(id) ON DELETE CASCADE;


--
-- Name: withdrawals fk_withdrawals_cancelled_by_users; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT fk_withdrawals_cancelled_by_users FOREIGN KEY (cancelled_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: forecast_current forecast_current_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_current
    ADD CONSTRAINT forecast_current_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: forecast_current forecast_current_delivery_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_current
    ADD CONSTRAINT forecast_current_delivery_place_id_fkey FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE RESTRICT;


--
-- Name: forecast_current forecast_current_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_current
    ADD CONSTRAINT forecast_current_supplier_item_id_fkey FOREIGN KEY (supplier_item_id) REFERENCES public.supplier_items(id) ON DELETE RESTRICT;


--
-- Name: inbound_plan_lines inbound_plan_lines_inbound_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plan_lines
    ADD CONSTRAINT inbound_plan_lines_inbound_plan_id_fkey FOREIGN KEY (inbound_plan_id) REFERENCES public.inbound_plans(id) ON DELETE CASCADE;


--
-- Name: inbound_plan_lines inbound_plan_lines_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plan_lines
    ADD CONSTRAINT inbound_plan_lines_supplier_item_id_fkey FOREIGN KEY (supplier_item_id) REFERENCES public.supplier_items(id) ON DELETE RESTRICT;


--
-- Name: inbound_plans inbound_plans_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_plans
    ADD CONSTRAINT inbound_plans_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: lot_master lot_master_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_master
    ADD CONSTRAINT lot_master_supplier_item_id_fkey FOREIGN KEY (supplier_item_id) REFERENCES public.supplier_items(id) ON DELETE RESTRICT;


--
-- Name: lot_receipts lot_receipts_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_receipts
    ADD CONSTRAINT lot_receipts_supplier_item_id_fkey FOREIGN KEY (supplier_item_id) REFERENCES public.supplier_items(id) ON DELETE SET NULL;


--
-- Name: lot_reservations lot_reservations_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_reservations
    ADD CONSTRAINT lot_reservations_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lot_receipts(id) ON DELETE RESTRICT;


--
-- Name: lot_receipts lots_expected_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_receipts
    ADD CONSTRAINT lots_expected_lot_id_fkey FOREIGN KEY (expected_lot_id) REFERENCES public.expected_lots(id) ON DELETE SET NULL;


--
-- Name: lot_receipts lots_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_receipts
    ADD CONSTRAINT lots_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: lot_receipts lots_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_receipts
    ADD CONSTRAINT lots_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;


--
-- Name: master_change_logs master_change_logs_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_change_logs
    ADD CONSTRAINT master_change_logs_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ocr_result_edits ocr_result_edits_smartread_long_data_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ocr_result_edits
    ADD CONSTRAINT ocr_result_edits_smartread_long_data_id_fkey FOREIGN KEY (smartread_long_data_id) REFERENCES public.smartread_long_data(id) ON DELETE CASCADE;


--
-- Name: operation_logs operation_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_logs
    ADD CONSTRAINT operation_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: order_groups order_groups_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_groups
    ADD CONSTRAINT order_groups_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: order_groups order_groups_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_groups
    ADD CONSTRAINT order_groups_supplier_item_id_fkey FOREIGN KEY (supplier_item_id) REFERENCES public.supplier_items(id) ON DELETE RESTRICT;


--
-- Name: order_lines order_lines_delivery_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_delivery_place_id_fkey FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE RESTRICT;


--
-- Name: order_lines order_lines_order_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_order_group_id_fkey FOREIGN KEY (order_group_id) REFERENCES public.order_groups(id) ON DELETE SET NULL;


--
-- Name: order_lines order_lines_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_lines order_lines_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_lines
    ADD CONSTRAINT order_lines_supplier_item_id_fkey FOREIGN KEY (supplier_item_id) REFERENCES public.supplier_items(id) ON DELETE RESTRICT;


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: orders orders_locked_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_locked_by_user_id_fkey FOREIGN KEY (locked_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: product_mappings product_mappings_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_mappings
    ADD CONSTRAINT product_mappings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: product_mappings product_mappings_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_mappings
    ADD CONSTRAINT product_mappings_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: product_mappings product_mappings_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_mappings
    ADD CONSTRAINT product_mappings_supplier_item_id_fkey FOREIGN KEY (supplier_item_id) REFERENCES public.supplier_items(id) ON DELETE RESTRICT;


--
-- Name: product_warehouse product_warehouse_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_warehouse
    ADD CONSTRAINT product_warehouse_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;


--
-- Name: rpa_run_events rpa_run_events_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_run_events
    ADD CONSTRAINT rpa_run_events_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: rpa_run_events rpa_run_events_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_run_events
    ADD CONSTRAINT rpa_run_events_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.rpa_runs(id) ON DELETE CASCADE;


--
-- Name: rpa_run_groups rpa_run_groups_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_run_groups
    ADD CONSTRAINT rpa_run_groups_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: rpa_run_item_attempts rpa_run_item_attempts_run_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_run_item_attempts
    ADD CONSTRAINT rpa_run_item_attempts_run_item_id_fkey FOREIGN KEY (run_item_id) REFERENCES public.rpa_run_items(id) ON DELETE CASCADE;


--
-- Name: rpa_run_items rpa_run_items_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_run_items
    ADD CONSTRAINT rpa_run_items_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.rpa_runs(id) ON DELETE CASCADE;


--
-- Name: rpa_runs rpa_runs_external_done_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_runs
    ADD CONSTRAINT rpa_runs_external_done_by_user_id_fkey FOREIGN KEY (external_done_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: rpa_runs rpa_runs_started_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_runs
    ADD CONSTRAINT rpa_runs_started_by_user_id_fkey FOREIGN KEY (started_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: rpa_runs rpa_runs_step2_executed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rpa_runs
    ADD CONSTRAINT rpa_runs_step2_executed_by_user_id_fkey FOREIGN KEY (step2_executed_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sap_fetch_logs sap_fetch_logs_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_fetch_logs
    ADD CONSTRAINT sap_fetch_logs_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.sap_connections(id) ON DELETE CASCADE;


--
-- Name: sap_material_cache sap_material_cache_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_material_cache
    ADD CONSTRAINT sap_material_cache_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.sap_connections(id) ON DELETE CASCADE;


--
-- Name: shipping_master_curated shipping_master_curated_raw_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_master_curated
    ADD CONSTRAINT shipping_master_curated_raw_id_fkey FOREIGN KEY (raw_id) REFERENCES public.shipping_master_raw(id) ON DELETE SET NULL;


--
-- Name: smartread_export_history smartread_export_history_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_export_history
    ADD CONSTRAINT smartread_export_history_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.smartread_configs(id) ON DELETE CASCADE;


--
-- Name: smartread_long_data smartread_long_data_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_long_data
    ADD CONSTRAINT smartread_long_data_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.smartread_configs(id) ON DELETE CASCADE;


--
-- Name: smartread_long_data smartread_long_data_wide_data_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_long_data
    ADD CONSTRAINT smartread_long_data_wide_data_id_fkey FOREIGN KEY (wide_data_id) REFERENCES public.smartread_wide_data(id) ON DELETE CASCADE;


--
-- Name: smartread_pad_runs smartread_pad_runs_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_pad_runs
    ADD CONSTRAINT smartread_pad_runs_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.smartread_configs(id) ON DELETE CASCADE;


--
-- Name: smartread_requests smartread_requests_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_requests
    ADD CONSTRAINT smartread_requests_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.smartread_configs(id) ON DELETE CASCADE;


--
-- Name: smartread_requests smartread_requests_task_id_ref_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_requests
    ADD CONSTRAINT smartread_requests_task_id_ref_fkey FOREIGN KEY (task_id_ref) REFERENCES public.smartread_tasks(id) ON DELETE CASCADE;


--
-- Name: smartread_tasks smartread_tasks_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_tasks
    ADD CONSTRAINT smartread_tasks_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.smartread_configs(id) ON DELETE CASCADE;


--
-- Name: smartread_wide_data smartread_wide_data_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smartread_wide_data
    ADD CONSTRAINT smartread_wide_data_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.smartread_configs(id) ON DELETE CASCADE;


--
-- Name: stock_history stock_history_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_history
    ADD CONSTRAINT stock_history_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lot_receipts(id) ON DELETE CASCADE;


--
-- Name: supplier_items supplier_items_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_items
    ADD CONSTRAINT supplier_items_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- Name: system_client_logs system_client_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_client_logs
    ADD CONSTRAINT system_client_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_supplier_assignments user_supplier_assignments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_supplier_assignments
    ADD CONSTRAINT user_supplier_assignments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: user_supplier_assignments user_supplier_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_supplier_assignments
    ADD CONSTRAINT user_supplier_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: warehouse_delivery_routes warehouse_delivery_routes_delivery_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_delivery_routes
    ADD CONSTRAINT warehouse_delivery_routes_delivery_place_id_fkey FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE CASCADE;


--
-- Name: warehouse_delivery_routes warehouse_delivery_routes_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_delivery_routes
    ADD CONSTRAINT warehouse_delivery_routes_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;


--
-- Name: withdrawals withdrawals_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: withdrawals withdrawals_delivery_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_delivery_place_id_fkey FOREIGN KEY (delivery_place_id) REFERENCES public.delivery_places(id) ON DELETE RESTRICT;


--
-- Name: withdrawals withdrawals_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lot_receipts(id) ON DELETE RESTRICT;


--
-- Name: withdrawals withdrawals_withdrawn_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_withdrawn_by_fkey FOREIGN KEY (withdrawn_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

--
-- Initial roles setup
--
INSERT INTO public.roles (role_code, role_name, description)
VALUES
    ('admin', '管理者', NULL),
    ('user', '一般ユーザー', NULL),
    ('guest', 'Guest', 'Guest user with read-only access')
ON CONFLICT (role_code) DO NOTHING;

--
-- Initial users setup
-- admin password: admin123
-- testuser password: test123
-- guest: no password (system user)
--
INSERT INTO public.users (username, email, password_hash, display_name, is_active, is_system_user)
VALUES
    ('admin', 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqK5WxZvFe', 'Admin User', true, true),
    ('testuser', 'testuser@example.com', '$2b$12$9Z9OZFhR4gKXf.nGxvP0yeG3MZ9v8nQXmZ6rL4KZQj4K8XZJqL4zO', 'Test User', true, false),
    ('guest', 'guest@example.com', NULL, 'ゲストユーザー', true, true)
ON CONFLICT (username) DO NOTHING;

--
-- User-role assignments
--
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM public.users u, public.roles r
WHERE (u.username = 'admin' AND r.role_code = 'admin')
   OR (u.username = 'testuser' AND r.role_code = 'user')
   OR (u.username = 'guest' AND r.role_code = 'guest')
ON CONFLICT DO NOTHING;
