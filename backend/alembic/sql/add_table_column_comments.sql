-- Table and column comments for lot management system
-- Generated from TABLE_COMMENTS_DRAFT.md (validated against actual schema)

COMMENT ON TABLE adjustments IS '在庫調整：ロットへの在庫調整記録';
COMMENT ON TABLE allocation_suggestions IS '引当推奨：システムが提案する引当案';
COMMENT ON TABLE allocation_traces IS '引当トレース：引当処理の推論過程を記録（デバッグ用）';
COMMENT ON TABLE batch_jobs IS 'バッチジョブ管理：バッチ処理の実行状況を管理';
COMMENT ON TABLE business_rules IS '業務ルール設定：業務ロジックのルールを動的に管理';
COMMENT ON TABLE cloud_flow_configs IS 'Cloud Flow設定：Cloud FlowのURL等の設定を保存';
COMMENT ON TABLE cloud_flow_jobs IS 'Cloud Flowジョブ履歴：Cloud Flow実行履歴を記録';
COMMENT ON TABLE company_calendars IS '会社カレンダー：会社の休日・稼働日を管理';
COMMENT ON TABLE customer_item_delivery_settings IS '得意先品番-納入先別出荷設定：次区・納入先ごとの出荷テキスト、梱包注意書き、リードタイム等を管理';
COMMENT ON TABLE customer_item_jiku_mappings IS '顧客商品-次区マッピング：顧客品番と次区コードの対応を管理';
COMMENT ON TABLE customer_items IS '得意先品番マッピング：顧客が使用する品番コードの変換マスタ（受注・出荷ドメイン）';
COMMENT ON TABLE customers IS '顧客マスタ：得意先情報を管理（Soft Delete対応）';
COMMENT ON TABLE delivery_places IS '納入先マスタ：納入先情報を管理（Soft Delete対応）';
COMMENT ON TABLE expected_lots IS '入荷予定ロット：入荷予定ロット情報の事前登録';
COMMENT ON TABLE forecast_current IS '現行予測：最新の予測データのみを保持';
COMMENT ON TABLE forecast_history IS '予測履歴：過去の全予測データをアーカイブ（FK制約なし）';
COMMENT ON TABLE holiday_calendars IS '祝日カレンダー：祝日情報を管理';
COMMENT ON TABLE inbound_plan_lines IS '入荷計画明細：入荷計画の製品別明細を管理';
COMMENT ON TABLE inbound_plans IS '入荷計画ヘッダ：入荷計画全体の情報を管理';
COMMENT ON TABLE layer_code_mappings IS '層別コードマッピング：層別コード → メーカー名の変換マスタ';
COMMENT ON TABLE lot_master IS 'ロット番号名寄せマスタ：同一ロット番号の複数入荷を集約管理';
COMMENT ON TABLE lot_receipts IS 'ロット入荷実体：個別の入荷記録を管理。在庫の単一ソース';
COMMENT ON TABLE lot_reservation_history IS 'ロット引当履歴：lot_reservations変更の監査ログ';
COMMENT ON TABLE lot_reservations IS 'ロット引当：ロットの予約管理（受注・予測・手動）';
COMMENT ON TABLE master_change_logs IS 'マスタ変更履歴：マスタデータの変更履歴を記録';
COMMENT ON TABLE missing_mapping_events IS '未設定イベント：自動セット失敗時の警告記録';
COMMENT ON TABLE ocr_result_edits IS 'OCR結果編集：OCR結果の手入力編集内容を保存';
COMMENT ON TABLE operation_logs IS '操作ログ：ユーザー操作の監査証跡を記録';
COMMENT ON TABLE order_groups IS '受注グループ：業務キー中心の論理ヘッダ（得意先×製品×受注日）';
COMMENT ON TABLE order_lines IS '受注明細：受注の明細行を管理';
COMMENT ON TABLE order_register_rows IS '受注登録結果：OCR + マスタ参照の結果を保存（Excel出力・React表示の単一ソース）';
COMMENT ON TABLE orders IS '受注ヘッダ：受注全体の情報を管理';
COMMENT ON TABLE original_delivery_calendars IS 'オリジナル配信日カレンダー：特定の配信日を管理';
COMMENT ON TABLE product_mappings IS '商品マッピング：顧客+先方品番+製品+仕入先の4者マッピング（調達・発注ドメイン）';
COMMENT ON TABLE product_uom_conversions IS '製品単位換算マスタ：製品ごとの単位変換係数を管理';
COMMENT ON TABLE product_warehouse IS '製品グループ×倉庫管理：在庫一覧の母集団として使用';
COMMENT ON TABLE roles IS 'ロールマスタ：システムロール（権限グループ）を管理';
COMMENT ON TABLE rpa_jobs IS 'RPAジョブ管理：RPAジョブの実行状況を管理';
COMMENT ON TABLE rpa_run_events IS 'RPAイベントログ：Run制御イベントを記録';
COMMENT ON TABLE rpa_run_fetches IS 'RPA進度実績取得ログ：Step1の進度実績取得結果を記録';
COMMENT ON TABLE rpa_run_groups IS 'RPAランググループ：Step3のグルーピング結果（Runグループ）';
COMMENT ON TABLE rpa_run_item_attempts IS 'RPA再試行履歴：失敗アイテムの再試行履歴を記録';
COMMENT ON TABLE rpa_runs IS 'RPA実行記録：素材納品書発行ワークフローの実行記録（親テーブル）';
COMMENT ON TABLE sap_connections IS 'SAP接続情報：SAP ERPへの接続情報を管理（本番/テスト環境切り替えサポート）';
COMMENT ON TABLE sap_fetch_logs IS 'SAP取得ログ：SAP RFC呼び出しのログを記録（デバッグ・監査用）';
COMMENT ON TABLE sap_material_cache IS 'SAPマテリアルキャッシュ：Z_SCM1_RFC_MATERIAL_DOWNLOADからのET_DATAをキャッシュ';
COMMENT ON TABLE seed_snapshots IS 'スナップショット：テストデータ生成のパラメータとプロファイルを保存';
COMMENT ON TABLE server_logs IS 'サーバーログ：アプリケーションログを保存（調査用）';
COMMENT ON TABLE shipping_master_curated IS '出荷用マスタ整形済み：アプリ参照用（独立データ、既存マスタへのFK制約なし）';
COMMENT ON TABLE smartread_configs IS 'SmartRead設定：SmartRead OCRの設定を保存';
COMMENT ON TABLE smartread_export_history IS 'SmartReadエクスポート履歴：エクスポート処理の履歴を記録';
COMMENT ON TABLE smartread_long_data IS 'SmartRead縦持ちデータ：横持ちデータを変換した業務データ';
COMMENT ON TABLE smartread_long_data_completed IS 'SmartRead縦持ちデータ完了済み：完了済みアーカイブ（FK制約なし）';
COMMENT ON TABLE smartread_pad_runs IS 'SmartRead PAD互換フロー実行記録：工程追跡用';
COMMENT ON TABLE smartread_requests IS 'SmartReadリクエスト管理：requestId/resultsルートで全自動化';
COMMENT ON TABLE smartread_tasks IS 'SmartReadタスク管理：SmartReadタスクの管理';
COMMENT ON TABLE smartread_wide_data IS 'SmartRead横持ちデータ：exportから取得したCSV行を保存（生データ）';
COMMENT ON TABLE stock_history IS '在庫履歴：追記専用の在庫台帳（イミュータブル）';
COMMENT ON TABLE supplier_items IS '仕入先品目マスタ：メーカー品番の実体（2コード体系のSSOT）';
COMMENT ON TABLE suppliers IS '仕入先マスタ：仕入先情報を管理（Soft Delete対応）';
COMMENT ON TABLE system_client_logs IS 'クライアントログ：フロントエンドのログをサーバー側に保存';
COMMENT ON TABLE system_configs IS 'システム設定：システム全体の設定値を管理（キー・バリュー型）';
COMMENT ON TABLE user_roles IS 'ユーザー-ロール関連：ユーザーとロールの多対多関連を管理';
COMMENT ON TABLE user_supplier_assignments IS 'ユーザー-仕入先担当割り当て：ユーザーと仕入先の担当関係を管理';
COMMENT ON TABLE users IS 'ユーザーマスタ：システムユーザー情報を管理';
COMMENT ON TABLE warehouse_delivery_routes IS '輸送経路マスタ：倉庫から納入先への輸送リードタイムを管理';
COMMENT ON TABLE warehouses IS '倉庫マスタ：倉庫情報を管理（Soft Delete対応）';
COMMENT ON TABLE withdrawal_lines IS '出庫明細：どのreceiptから何個出庫したか（FIFO消費記録）';
COMMENT ON TABLE withdrawals IS '出庫記録：受注外出庫の記録を管理';

-- adjustments
COMMENT ON COLUMN adjustments.id IS 'ID（主キー）';
COMMENT ON COLUMN adjustments.lot_id IS 'ロットID（lot_receipts参照）';
COMMENT ON COLUMN adjustments.adjustment_type IS '調整種別（physical_count/damage/loss/found/other）';
COMMENT ON COLUMN adjustments.adjusted_quantity IS '調整数量';
COMMENT ON COLUMN adjustments.reason IS '調整理由';
COMMENT ON COLUMN adjustments.adjusted_by IS '調整実行ユーザーID';
COMMENT ON COLUMN adjustments.adjusted_at IS '調整日時';

-- allocation_suggestions
COMMENT ON COLUMN allocation_suggestions.id IS 'ID（主キー）';
COMMENT ON COLUMN allocation_suggestions.order_line_id IS '受注明細ID';
COMMENT ON COLUMN allocation_suggestions.forecast_period IS '予測期間（YYYY-MM or YYYY-MM-DD）';
COMMENT ON COLUMN allocation_suggestions.forecast_id IS '予測ID';
COMMENT ON COLUMN allocation_suggestions.customer_id IS '顧客ID';
COMMENT ON COLUMN allocation_suggestions.delivery_place_id IS '納入先ID';
COMMENT ON COLUMN allocation_suggestions.product_group_id IS '仕入先品目ID（メーカー品番への参照）';
COMMENT ON COLUMN allocation_suggestions.lot_id IS 'ロットID（推奨対象）';
COMMENT ON COLUMN allocation_suggestions.quantity IS '推奨引当数量';
COMMENT ON COLUMN allocation_suggestions.priority IS '優先度';
COMMENT ON COLUMN allocation_suggestions.allocation_type IS '引当種別（soft/hard）';
COMMENT ON COLUMN allocation_suggestions.source IS '推奨元（forecast_import等）';
COMMENT ON COLUMN allocation_suggestions.created_at IS '作成日時';
COMMENT ON COLUMN allocation_suggestions.updated_at IS '更新日時';

-- allocation_traces
COMMENT ON COLUMN allocation_traces.id IS 'ID（主キー）';
COMMENT ON COLUMN allocation_traces.order_line_id IS '受注明細ID';
COMMENT ON COLUMN allocation_traces.lot_id IS 'ロットID（候補ロット）';
COMMENT ON COLUMN allocation_traces.score IS '優先度スコア（FEFOベース等）';
COMMENT ON COLUMN allocation_traces.decision IS '判定結果（adopted/rejected/partial）';
COMMENT ON COLUMN allocation_traces.reason IS '判定理由（期限切れ/ロック中/FEFO採用/在庫不足等）';
COMMENT ON COLUMN allocation_traces.allocated_qty IS '実引当数量（adoptedまたはpartialの場合）';
COMMENT ON COLUMN allocation_traces.created_at IS '作成日時';

-- batch_jobs
COMMENT ON COLUMN batch_jobs.id IS 'ID（主キー）';
COMMENT ON COLUMN batch_jobs.job_name IS 'ジョブ名';
COMMENT ON COLUMN batch_jobs.job_type IS 'ジョブ種別（allocation_suggestion/allocation_finalize/inventory_sync/data_import/report_generation）';
COMMENT ON COLUMN batch_jobs.status IS 'ステータス（pending/running/completed/failed）';
COMMENT ON COLUMN batch_jobs.parameters IS 'パラメータ（JSON形式）';
COMMENT ON COLUMN batch_jobs.result_message IS '結果メッセージ';
COMMENT ON COLUMN batch_jobs.started_at IS '開始日時';
COMMENT ON COLUMN batch_jobs.completed_at IS '完了日時';
COMMENT ON COLUMN batch_jobs.created_at IS '作成日時';

-- business_rules
COMMENT ON COLUMN business_rules.id IS 'ID（主キー）';
COMMENT ON COLUMN business_rules.rule_code IS 'ルールコード（ユニーク）';
COMMENT ON COLUMN business_rules.rule_name IS 'ルール名';
COMMENT ON COLUMN business_rules.rule_type IS 'ルール種別（allocation/expiry_warning/kanban/inventory_sync_alert/other）';
COMMENT ON COLUMN business_rules.rule_parameters IS 'ルールパラメータ（JSON形式）';
COMMENT ON COLUMN business_rules.is_active IS '有効フラグ';
COMMENT ON COLUMN business_rules.created_at IS '作成日時';
COMMENT ON COLUMN business_rules.updated_at IS '更新日時';

-- cloud_flow_configs
COMMENT ON COLUMN cloud_flow_configs.id IS 'ID（主キー）';
COMMENT ON COLUMN cloud_flow_configs.config_key IS '設定キー（ユニーク）';
COMMENT ON COLUMN cloud_flow_configs.config_value IS '設定値';
COMMENT ON COLUMN cloud_flow_configs.description IS '説明';
COMMENT ON COLUMN cloud_flow_configs.created_at IS '作成日時';
COMMENT ON COLUMN cloud_flow_configs.updated_at IS '更新日時';

-- cloud_flow_jobs
COMMENT ON COLUMN cloud_flow_jobs.id IS 'ID（主キー）';
COMMENT ON COLUMN cloud_flow_jobs.job_type IS 'ジョブ種別（progress_download等）';
COMMENT ON COLUMN cloud_flow_jobs.status IS 'ステータス（pending/running/completed/failed）';
COMMENT ON COLUMN cloud_flow_jobs.start_date IS '開始日';
COMMENT ON COLUMN cloud_flow_jobs.end_date IS '終了日';
COMMENT ON COLUMN cloud_flow_jobs.requested_by_user_id IS '要求ユーザーID';
COMMENT ON COLUMN cloud_flow_jobs.requested_at IS '要求日時';
COMMENT ON COLUMN cloud_flow_jobs.started_at IS '開始日時';
COMMENT ON COLUMN cloud_flow_jobs.completed_at IS '完了日時';
COMMENT ON COLUMN cloud_flow_jobs.result_message IS '結果メッセージ';
COMMENT ON COLUMN cloud_flow_jobs.error_message IS 'エラーメッセージ';
COMMENT ON COLUMN cloud_flow_jobs.created_at IS '作成日時';
COMMENT ON COLUMN cloud_flow_jobs.updated_at IS '更新日時';

-- company_calendars
COMMENT ON COLUMN company_calendars.id IS 'ID（主キー）';
COMMENT ON COLUMN company_calendars.calendar_date IS '対象日（ユニーク）';
COMMENT ON COLUMN company_calendars.is_workday IS '稼働日フラグ（true=稼働日、false=休日）';
COMMENT ON COLUMN company_calendars.description IS '説明';
COMMENT ON COLUMN company_calendars.created_at IS '作成日時';
COMMENT ON COLUMN company_calendars.updated_at IS '更新日時';

-- customer_item_delivery_settings
COMMENT ON COLUMN customer_item_delivery_settings.id IS 'ID（主キー）';
COMMENT ON COLUMN customer_item_delivery_settings.customer_item_id IS '顧客商品ID';
COMMENT ON COLUMN customer_item_delivery_settings.delivery_place_id IS '納入先ID（NULLの場合はデフォルト設定）';
COMMENT ON COLUMN customer_item_delivery_settings.jiku_code IS '次区コード（NULLの場合は全次区共通）';
COMMENT ON COLUMN customer_item_delivery_settings.shipment_text IS '出荷表テキスト（SAP連携用）';
COMMENT ON COLUMN customer_item_delivery_settings.packing_note IS '梱包・注意書き';
COMMENT ON COLUMN customer_item_delivery_settings.lead_time_days IS 'リードタイム（日）';
COMMENT ON COLUMN customer_item_delivery_settings.is_default IS 'デフォルト設定フラグ';
COMMENT ON COLUMN customer_item_delivery_settings.valid_from IS '有効開始日';
COMMENT ON COLUMN customer_item_delivery_settings.valid_to IS '有効終了日';
COMMENT ON COLUMN customer_item_delivery_settings.created_at IS '作成日時';
COMMENT ON COLUMN customer_item_delivery_settings.updated_at IS '更新日時';

-- customer_item_jiku_mappings
COMMENT ON COLUMN customer_item_jiku_mappings.id IS 'ID（主キー）';
COMMENT ON COLUMN customer_item_jiku_mappings.customer_item_id IS '顧客商品ID';
COMMENT ON COLUMN customer_item_jiku_mappings.jiku_code IS '次区コード';
COMMENT ON COLUMN customer_item_jiku_mappings.delivery_place_id IS '納入先ID';
COMMENT ON COLUMN customer_item_jiku_mappings.is_default IS 'デフォルト次区フラグ';
COMMENT ON COLUMN customer_item_jiku_mappings.created_at IS '作成日時';

-- customer_items
COMMENT ON COLUMN customer_items.id IS 'ID（主キー）';
COMMENT ON COLUMN customer_items.customer_id IS '顧客ID';
COMMENT ON COLUMN customer_items.customer_part_no IS '得意先品番（先方品番、得意先が注文時に指定する品番）';
COMMENT ON COLUMN customer_items.product_group_id IS '仕入先品目ID（メーカー品番への参照）';
COMMENT ON COLUMN customer_items.supplier_id IS '仕入先ID';
COMMENT ON COLUMN customer_items.supplier_item_id IS '仕入先品目ID';
COMMENT ON COLUMN customer_items.is_primary IS '主要得意先フラグ（1 supplier_itemにつき1つ）';
COMMENT ON COLUMN customer_items.base_unit IS '基本単位';
COMMENT ON COLUMN customer_items.pack_unit IS '梱包単位';
COMMENT ON COLUMN customer_items.pack_quantity IS '梱包数量';
COMMENT ON COLUMN customer_items.special_instructions IS '特記事項';
COMMENT ON COLUMN customer_items.valid_to IS '有効終了日（Soft Delete）';
COMMENT ON COLUMN customer_items.created_at IS '作成日時';
COMMENT ON COLUMN customer_items.updated_at IS '更新日時';

-- customers
COMMENT ON COLUMN customers.id IS 'ID（主キー）';
COMMENT ON COLUMN customers.customer_code IS '顧客コード（業務キー）';
COMMENT ON COLUMN customers.customer_name IS '顧客名';
COMMENT ON COLUMN customers.address IS '住所';
COMMENT ON COLUMN customers.contact_name IS '担当者名';
COMMENT ON COLUMN customers.phone IS '電話番号';
COMMENT ON COLUMN customers.email IS 'メールアドレス';
COMMENT ON COLUMN customers.short_name IS '短縮表示名（UI省スペース用）';
COMMENT ON COLUMN customers.valid_to IS '有効終了日（Soft Delete）';
COMMENT ON COLUMN customers.created_at IS '作成日時';
COMMENT ON COLUMN customers.updated_at IS '更新日時';

-- delivery_places
COMMENT ON COLUMN delivery_places.id IS 'ID（主キー）';
COMMENT ON COLUMN delivery_places.jiku_code IS '次区コード';
COMMENT ON COLUMN delivery_places.delivery_place_code IS '納入先コード（業務キー）';
COMMENT ON COLUMN delivery_places.delivery_place_name IS '納入先名';
COMMENT ON COLUMN delivery_places.short_name IS '短縮表示名（UI省スペース用）';
COMMENT ON COLUMN delivery_places.customer_id IS '顧客ID';
COMMENT ON COLUMN delivery_places.valid_to IS '有効終了日（Soft Delete）';
COMMENT ON COLUMN delivery_places.created_at IS '作成日時';
COMMENT ON COLUMN delivery_places.updated_at IS '更新日時';

-- expected_lots
COMMENT ON COLUMN expected_lots.id IS 'ID（主キー）';
COMMENT ON COLUMN expected_lots.inbound_plan_line_id IS '入荷計画明細ID';
COMMENT ON COLUMN expected_lots.expected_lot_number IS '予定ロット番号（入荷時確定の場合はNULL）';
COMMENT ON COLUMN expected_lots.expected_quantity IS '予定数量';
COMMENT ON COLUMN expected_lots.expected_expiry_date IS '予定有効期限';
COMMENT ON COLUMN expected_lots.created_at IS '作成日時';
COMMENT ON COLUMN expected_lots.updated_at IS '更新日時';

-- forecast_current
COMMENT ON COLUMN forecast_current.id IS 'ID（主キー）';
COMMENT ON COLUMN forecast_current.customer_id IS '顧客ID';
COMMENT ON COLUMN forecast_current.delivery_place_id IS '納入先ID';
COMMENT ON COLUMN forecast_current.product_group_id IS '仕入先品目ID（メーカー品番への参照）';
COMMENT ON COLUMN forecast_current.forecast_date IS '予測日';
COMMENT ON COLUMN forecast_current.forecast_quantity IS '予測数量';
COMMENT ON COLUMN forecast_current.unit IS '単位';
COMMENT ON COLUMN forecast_current.forecast_period IS '予測期間（YYYY-MM形式）';
COMMENT ON COLUMN forecast_current.snapshot_at IS 'スナップショット日時';
COMMENT ON COLUMN forecast_current.created_at IS '作成日時';
COMMENT ON COLUMN forecast_current.updated_at IS '更新日時';

-- forecast_history
COMMENT ON COLUMN forecast_history.id IS 'ID（主キー）';
COMMENT ON COLUMN forecast_history.customer_id IS '顧客ID（FK制約なし）';
COMMENT ON COLUMN forecast_history.delivery_place_id IS '納入先ID（FK制約なし）';
COMMENT ON COLUMN forecast_history.forecast_date IS '予測日';
COMMENT ON COLUMN forecast_history.forecast_quantity IS '予測数量';
COMMENT ON COLUMN forecast_history.unit IS '単位';
COMMENT ON COLUMN forecast_history.forecast_period IS '予測期間（YYYY-MM形式）';
COMMENT ON COLUMN forecast_history.snapshot_at IS 'スナップショット日時';
COMMENT ON COLUMN forecast_history.archived_at IS 'アーカイブ日時';
COMMENT ON COLUMN forecast_history.created_at IS '作成日時';
COMMENT ON COLUMN forecast_history.updated_at IS '更新日時';

-- holiday_calendars
COMMENT ON COLUMN holiday_calendars.id IS 'ID（主キー）';
COMMENT ON COLUMN holiday_calendars.holiday_date IS '祝日（ユニーク）';
COMMENT ON COLUMN holiday_calendars.holiday_name IS '祝日名';
COMMENT ON COLUMN holiday_calendars.created_at IS '作成日時';
COMMENT ON COLUMN holiday_calendars.updated_at IS '更新日時';

-- inbound_plan_lines
COMMENT ON COLUMN inbound_plan_lines.id IS 'ID（主キー）';
COMMENT ON COLUMN inbound_plan_lines.inbound_plan_id IS '入荷計画ヘッダID';
COMMENT ON COLUMN inbound_plan_lines.product_group_id IS '仕入先品目ID（メーカー品番への参照）';
COMMENT ON COLUMN inbound_plan_lines.planned_quantity IS '計画数量';
COMMENT ON COLUMN inbound_plan_lines.unit IS '単位';
COMMENT ON COLUMN inbound_plan_lines.created_at IS '作成日時';
COMMENT ON COLUMN inbound_plan_lines.updated_at IS '更新日時';

-- inbound_plans
COMMENT ON COLUMN inbound_plans.id IS 'ID（主キー）';
COMMENT ON COLUMN inbound_plans.plan_number IS '計画番号（業務キー）';
COMMENT ON COLUMN inbound_plans.sap_po_number IS 'SAP購買発注番号（業務キー）';
COMMENT ON COLUMN inbound_plans.supplier_id IS '仕入先ID';
COMMENT ON COLUMN inbound_plans.planned_arrival_date IS '入荷予定日';
COMMENT ON COLUMN inbound_plans.status IS 'ステータス（planned/partially_received/received/cancelled）';
COMMENT ON COLUMN inbound_plans.notes IS '備考';
COMMENT ON COLUMN inbound_plans.created_at IS '作成日時';
COMMENT ON COLUMN inbound_plans.updated_at IS '更新日時';

-- layer_code_mappings
COMMENT ON COLUMN layer_code_mappings.layer_code IS '層別コード（主キー）';
COMMENT ON COLUMN layer_code_mappings.maker_name IS 'メーカー名';
COMMENT ON COLUMN layer_code_mappings.created_at IS '作成日時';
COMMENT ON COLUMN layer_code_mappings.updated_at IS '更新日時';

-- lot_master
COMMENT ON COLUMN lot_master.id IS 'ID（主キー）';
COMMENT ON COLUMN lot_master.lot_number IS 'ロット番号（仕入先発番、NULL許可）';
COMMENT ON COLUMN lot_master.product_group_id IS '仕入先品目ID（メーカー品番への参照）';
COMMENT ON COLUMN lot_master.supplier_id IS '仕入先ID（仕入元）';
COMMENT ON COLUMN lot_master.total_quantity IS '合計入荷数量（受け入れ時）';
COMMENT ON COLUMN lot_master.first_receipt_date IS '初回入荷日（自動更新）';
COMMENT ON COLUMN lot_master.latest_expiry_date IS '傘下receiptの最長有効期限（表示用）';
COMMENT ON COLUMN lot_master.created_at IS '作成日時';
COMMENT ON COLUMN lot_master.updated_at IS '更新日時';

-- lot_receipts
COMMENT ON COLUMN lot_receipts.id IS 'ID（主キー）';
COMMENT ON COLUMN lot_receipts.lot_master_id IS 'ロットマスタID（名寄せ親）';
COMMENT ON COLUMN lot_receipts.product_group_id IS '仕入先品目ID（メーカー品番への参照、歴史的にproduct_group_idと命名）';
COMMENT ON COLUMN lot_receipts.warehouse_id IS '倉庫ID';
COMMENT ON COLUMN lot_receipts.supplier_id IS '仕入先ID（仕入元）';
COMMENT ON COLUMN lot_receipts.expected_lot_id IS '入荷予定ロットID';
COMMENT ON COLUMN lot_receipts.supplier_item_id IS '仕入先品目ID（メーカー品番の実体、supplier_items参照）';
COMMENT ON COLUMN lot_receipts.received_date IS '入荷日';
COMMENT ON COLUMN lot_receipts.expiry_date IS '有効期限（NULL=期限なし）';
COMMENT ON COLUMN lot_receipts.received_quantity IS '入荷数量（初期入荷時の数量）';
COMMENT ON COLUMN lot_receipts.consumed_quantity IS '消費済み数量（出庫確定分の累積）';
COMMENT ON COLUMN lot_receipts.unit IS '単位';
COMMENT ON COLUMN lot_receipts.status IS 'ステータス（active/depleted/expired/quarantine/locked）';
COMMENT ON COLUMN lot_receipts.lock_reason IS 'ロック理由';
COMMENT ON COLUMN lot_receipts.locked_quantity IS 'ロック数量（手動ロック分）';
COMMENT ON COLUMN lot_receipts.inspection_status IS '検査ステータス（not_required/pending/passed/failed）';
COMMENT ON COLUMN lot_receipts.inspection_date IS '検査日';
COMMENT ON COLUMN lot_receipts.inspection_cert_number IS '検査証明書番号';
COMMENT ON COLUMN lot_receipts.shipping_date IS '出荷予定日';
COMMENT ON COLUMN lot_receipts.cost_price IS '仕入単価';
COMMENT ON COLUMN lot_receipts.sales_price IS '販売単価';
COMMENT ON COLUMN lot_receipts.tax_rate IS '適用税率';
COMMENT ON COLUMN lot_receipts.version IS 'バージョン（楽観的ロック用）';
COMMENT ON COLUMN lot_receipts.created_at IS '作成日時';
COMMENT ON COLUMN lot_receipts.updated_at IS '更新日時';
COMMENT ON COLUMN lot_receipts.origin_type IS '起源種別（order/forecast/sample/safety_stock/adhoc）';
COMMENT ON COLUMN lot_receipts.origin_reference IS '起源参照（受注ID等）';
COMMENT ON COLUMN lot_receipts.temporary_lot_key IS '仮入庫時の一意識別キー（UUID）';
COMMENT ON COLUMN lot_receipts.receipt_key IS '入荷識別UUID（重複防止、NOT NULL）';

-- lot_reservation_history
COMMENT ON COLUMN lot_reservation_history.id IS 'ID（主キー）';
COMMENT ON COLUMN lot_reservation_history.reservation_id IS '引当ID';
COMMENT ON COLUMN lot_reservation_history.operation IS '操作種別（INSERT/UPDATE/DELETE）';
COMMENT ON COLUMN lot_reservation_history.lot_id IS '新ロットID';
COMMENT ON COLUMN lot_reservation_history.source_type IS '新引当元種別';
COMMENT ON COLUMN lot_reservation_history.source_id IS '新引当元ID';
COMMENT ON COLUMN lot_reservation_history.reserved_qty IS '新引当数量';
COMMENT ON COLUMN lot_reservation_history.status IS '新ステータス';
COMMENT ON COLUMN lot_reservation_history.sap_document_no IS '新SAP伝票番号';
COMMENT ON COLUMN lot_reservation_history.old_lot_id IS '旧ロットID';
COMMENT ON COLUMN lot_reservation_history.old_source_type IS '旧引当元種別';
COMMENT ON COLUMN lot_reservation_history.old_source_id IS '旧引当元ID';
COMMENT ON COLUMN lot_reservation_history.old_reserved_qty IS '旧引当数量';
COMMENT ON COLUMN lot_reservation_history.old_status IS '旧ステータス';
COMMENT ON COLUMN lot_reservation_history.old_sap_document_no IS '旧SAP伝票番号';
COMMENT ON COLUMN lot_reservation_history.changed_by IS '変更ユーザー';
COMMENT ON COLUMN lot_reservation_history.changed_at IS '変更日時';
COMMENT ON COLUMN lot_reservation_history.change_reason IS '変更理由';

-- lot_reservations
COMMENT ON COLUMN lot_reservations.id IS 'ID（主キー）';
COMMENT ON COLUMN lot_reservations.lot_id IS 'ロットID（lot_receipts参照）';
COMMENT ON COLUMN lot_reservations.source_type IS '引当元種別（forecast/order/manual）';
COMMENT ON COLUMN lot_reservations.source_id IS '引当元ID（order_line_id等）';
COMMENT ON COLUMN lot_reservations.reserved_qty IS '引当数量（正数必須）';
COMMENT ON COLUMN lot_reservations.status IS 'ステータス（temporary/active/confirmed/released）';
COMMENT ON COLUMN lot_reservations.created_at IS '作成日時';
COMMENT ON COLUMN lot_reservations.updated_at IS '更新日時';
COMMENT ON COLUMN lot_reservations.expires_at IS '有効期限（一時引当用）';
COMMENT ON COLUMN lot_reservations.confirmed_at IS '確定日時';
COMMENT ON COLUMN lot_reservations.confirmed_by IS '確定ユーザー';
COMMENT ON COLUMN lot_reservations.released_at IS '解放日時';
COMMENT ON COLUMN lot_reservations.cancel_reason IS 'キャンセル理由（input_error/wrong_quantity等）';
COMMENT ON COLUMN lot_reservations.cancel_note IS 'キャンセル補足';
COMMENT ON COLUMN lot_reservations.cancelled_by IS 'キャンセル実行ユーザー';
COMMENT ON COLUMN lot_reservations.sap_document_no IS 'SAP伝票番号（SAP登録成功時にセット）';
COMMENT ON COLUMN lot_reservations.sap_registered_at IS 'SAP登録日時';

-- master_change_logs
COMMENT ON COLUMN master_change_logs.id IS 'ID（主キー）';
COMMENT ON COLUMN master_change_logs.table_name IS 'テーブル名';
COMMENT ON COLUMN master_change_logs.record_id IS 'レコードID';
COMMENT ON COLUMN master_change_logs.change_type IS '変更種別（insert/update/delete）';
COMMENT ON COLUMN master_change_logs.old_values IS '変更前の値（JSON形式）';
COMMENT ON COLUMN master_change_logs.new_values IS '変更後の値（JSON形式）';
COMMENT ON COLUMN master_change_logs.changed_by IS '変更ユーザーID';
COMMENT ON COLUMN master_change_logs.changed_at IS '変更日時';

-- missing_mapping_events
COMMENT ON COLUMN missing_mapping_events.id IS 'ID（主キー）';
COMMENT ON COLUMN missing_mapping_events.customer_id IS '顧客ID';
COMMENT ON COLUMN missing_mapping_events.product_group_id IS '製品グループID';
COMMENT ON COLUMN missing_mapping_events.supplier_id IS '仕入先ID';
COMMENT ON COLUMN missing_mapping_events.event_type IS 'イベント種別（delivery_place_not_found/jiku_mapping_not_found等）';
COMMENT ON COLUMN missing_mapping_events.occurred_at IS '発生日時';
COMMENT ON COLUMN missing_mapping_events.context_json IS 'エラー発生時のコンテキスト（リクエスト内容等、JSON形式）';
COMMENT ON COLUMN missing_mapping_events.created_by IS '作成ユーザーID';
COMMENT ON COLUMN missing_mapping_events.resolved_at IS '解決日時（NULL=未解決）';
COMMENT ON COLUMN missing_mapping_events.resolved_by IS '解決ユーザーID';
COMMENT ON COLUMN missing_mapping_events.resolution_note IS '解決メモ';
COMMENT ON COLUMN missing_mapping_events.created_at IS '作成日時';

-- ocr_result_edits
COMMENT ON COLUMN ocr_result_edits.id IS 'ID（主キー）';
COMMENT ON COLUMN ocr_result_edits.smartread_long_data_id IS 'SmartRead縦持ちデータID（ユニーク）';
COMMENT ON COLUMN ocr_result_edits.lot_no_1 IS 'ロット番号1';
COMMENT ON COLUMN ocr_result_edits.quantity_1 IS '数量1';
COMMENT ON COLUMN ocr_result_edits.lot_no_2 IS 'ロット番号2';
COMMENT ON COLUMN ocr_result_edits.quantity_2 IS '数量2';
COMMENT ON COLUMN ocr_result_edits.inbound_no IS '入荷番号';
COMMENT ON COLUMN ocr_result_edits.inbound_no_2 IS '入荷番号2';
COMMENT ON COLUMN ocr_result_edits.shipping_date IS '出荷日';
COMMENT ON COLUMN ocr_result_edits.shipping_slip_text IS '出荷表テキスト';
COMMENT ON COLUMN ocr_result_edits.shipping_slip_text_edited IS '出荷表テキスト編集済みフラグ';
COMMENT ON COLUMN ocr_result_edits.jiku_code IS '次区コード';
COMMENT ON COLUMN ocr_result_edits.material_code IS '材料コード';
COMMENT ON COLUMN ocr_result_edits.delivery_quantity IS '納入数量';
COMMENT ON COLUMN ocr_result_edits.delivery_date IS '納入日';
COMMENT ON COLUMN ocr_result_edits.process_status IS '処理ステータス（pending/downloaded/sap_linked/completed）';
COMMENT ON COLUMN ocr_result_edits.error_flags IS 'エラーフラグ（JSON形式）';
COMMENT ON COLUMN ocr_result_edits.created_at IS '作成日時';
COMMENT ON COLUMN ocr_result_edits.updated_at IS '更新日時';

-- operation_logs
COMMENT ON COLUMN operation_logs.id IS 'ID（主キー）';
COMMENT ON COLUMN operation_logs.user_id IS 'ユーザーID';
COMMENT ON COLUMN operation_logs.operation_type IS '操作種別（create/update/delete/login/logout/export）';
COMMENT ON COLUMN operation_logs.target_table IS '対象テーブル';
COMMENT ON COLUMN operation_logs.target_id IS '対象レコードID';
COMMENT ON COLUMN operation_logs.changes IS '変更内容（JSON形式）';
COMMENT ON COLUMN operation_logs.ip_address IS 'IPアドレス';
COMMENT ON COLUMN operation_logs.created_at IS '作成日時';

-- order_groups
COMMENT ON COLUMN order_groups.id IS 'ID（主キー）';
COMMENT ON COLUMN order_groups.customer_id IS '顧客ID';
COMMENT ON COLUMN order_groups.product_group_id IS '仕入先品目ID（メーカー品番への参照）';
COMMENT ON COLUMN order_groups.order_date IS '受注日';
COMMENT ON COLUMN order_groups.source_file_name IS '取り込み元ファイル名';
COMMENT ON COLUMN order_groups.created_at IS '作成日時';
COMMENT ON COLUMN order_groups.updated_at IS '更新日時';

-- order_lines
COMMENT ON COLUMN order_lines.id IS 'ID（主キー）';
COMMENT ON COLUMN order_lines.order_id IS '受注ヘッダID';
COMMENT ON COLUMN order_lines.order_group_id IS '受注グループID（得意先×製品×受注日）';
COMMENT ON COLUMN order_lines.product_group_id IS '仕入先品目ID（メーカー品番への参照、OCR取込時はNULL可、変換後に設定）';
COMMENT ON COLUMN order_lines.customer_part_no IS '得意先品番（先方品番、OCR読取時は生データ）';
COMMENT ON COLUMN order_lines.delivery_date IS '納期';
COMMENT ON COLUMN order_lines.order_quantity IS '受注数量';
COMMENT ON COLUMN order_lines.unit IS '単位';
COMMENT ON COLUMN order_lines.converted_quantity IS '換算後数量（内部単位）';
COMMENT ON COLUMN order_lines.created_at IS '作成日時';
COMMENT ON COLUMN order_lines.updated_at IS '更新日時';
COMMENT ON COLUMN order_lines.delivery_place_id IS '納入先ID';
COMMENT ON COLUMN order_lines.customer_order_no IS '得意先6桁受注番号（業務キー）';
COMMENT ON COLUMN order_lines.customer_order_line_no IS '得意先側行番号';
COMMENT ON COLUMN order_lines.sap_order_no IS 'SAP受注番号（業務キー）';
COMMENT ON COLUMN order_lines.sap_order_item_no IS 'SAP明細番号（業務キー）';
COMMENT ON COLUMN order_lines.shipping_document_text IS '出荷表テキスト';
COMMENT ON COLUMN order_lines.order_type IS '需要種別（FORECAST_LINKED/KANBAN/SPOT/ORDER）';
COMMENT ON COLUMN order_lines.forecast_reference IS 'Forecast業務キー参照（forecast_id FK廃止）';
COMMENT ON COLUMN order_lines.status IS 'ステータス（pending/allocated/shipped/completed/cancelled/on_hold）';
COMMENT ON COLUMN order_lines.version IS 'バージョン（楽観的ロック用）';

-- order_register_rows
COMMENT ON COLUMN order_register_rows.id IS 'ID（主キー）';
COMMENT ON COLUMN order_register_rows.long_data_id IS 'SmartRead縦持ちデータID（FK制約なし）';
COMMENT ON COLUMN order_register_rows.curated_master_id IS '整形済みマスタID（FK制約なし）';
COMMENT ON COLUMN order_register_rows.task_date IS 'タスク日付';
COMMENT ON COLUMN order_register_rows.status IS 'ステータス（PENDING/EXPORTED/ERROR）';
COMMENT ON COLUMN order_register_rows.error_message IS 'エラーメッセージ';
COMMENT ON COLUMN order_register_rows.created_at IS '作成日時';
COMMENT ON COLUMN order_register_rows.updated_at IS '更新日時';

-- orders
COMMENT ON COLUMN orders.id IS 'ID（主キー）';
COMMENT ON COLUMN orders.customer_id IS '顧客ID';
COMMENT ON COLUMN orders.order_date IS '受注日';
COMMENT ON COLUMN orders.status IS 'ステータス（open/part_allocated/allocated/shipped/closed）';
COMMENT ON COLUMN orders.created_at IS '作成日時';
COMMENT ON COLUMN orders.updated_at IS '更新日時';
COMMENT ON COLUMN orders.locked_by_user_id IS 'ロック中ユーザーID（楽観的ロック用）';
COMMENT ON COLUMN orders.locked_at IS 'ロック取得日時';
COMMENT ON COLUMN orders.lock_expires_at IS 'ロック有効期限';
COMMENT ON COLUMN orders.ocr_source_filename IS 'OCR取込元ファイル名';
COMMENT ON COLUMN orders.cancel_reason IS 'キャンセル・保留理由';

-- original_delivery_calendars
COMMENT ON COLUMN original_delivery_calendars.id IS 'ID（主キー）';
COMMENT ON COLUMN original_delivery_calendars.delivery_date IS '配信日（ユニーク）';
COMMENT ON COLUMN original_delivery_calendars.description IS '説明';
COMMENT ON COLUMN original_delivery_calendars.created_at IS '作成日時';
COMMENT ON COLUMN original_delivery_calendars.updated_at IS '更新日時';

-- product_mappings
COMMENT ON COLUMN product_mappings.id IS 'ID（主キー）';
COMMENT ON COLUMN product_mappings.customer_id IS '顧客ID';
COMMENT ON COLUMN product_mappings.customer_part_code IS '得意先品番コード';
COMMENT ON COLUMN product_mappings.supplier_id IS '仕入先ID';
COMMENT ON COLUMN product_mappings.product_group_id IS '仕入先品目ID（メーカー品番への参照）';
COMMENT ON COLUMN product_mappings.base_unit IS '基本単位';
COMMENT ON COLUMN product_mappings.pack_unit IS '梱包単位';
COMMENT ON COLUMN product_mappings.pack_quantity IS '梱包数量';
COMMENT ON COLUMN product_mappings.special_instructions IS '特記事項';
COMMENT ON COLUMN product_mappings.valid_to IS '有効終了日（Soft Delete）';
COMMENT ON COLUMN product_mappings.created_at IS '作成日時';
COMMENT ON COLUMN product_mappings.updated_at IS '更新日時';

-- product_uom_conversions
COMMENT ON COLUMN product_uom_conversions.conversion_id IS '換算ID（主キー）';
COMMENT ON COLUMN product_uom_conversions.product_group_id IS '仕入先品目ID（メーカー品番への参照）';
COMMENT ON COLUMN product_uom_conversions.external_unit IS '外部単位';
COMMENT ON COLUMN product_uom_conversions.factor IS '変換係数';
COMMENT ON COLUMN product_uom_conversions.valid_to IS '有効終了日（Soft Delete）';
COMMENT ON COLUMN product_uom_conversions.created_at IS '作成日時';
COMMENT ON COLUMN product_uom_conversions.updated_at IS '更新日時';

-- product_warehouse
COMMENT ON COLUMN product_warehouse.product_group_id IS '仕入先品目ID（メーカー品番への参照、複合PK）';
COMMENT ON COLUMN product_warehouse.warehouse_id IS '倉庫ID（複合PK）';
COMMENT ON COLUMN product_warehouse.is_active IS '有効フラグ';
COMMENT ON COLUMN product_warehouse.created_at IS '作成日時';
COMMENT ON COLUMN product_warehouse.updated_at IS '更新日時';

-- roles
COMMENT ON COLUMN roles.id IS 'ID（主キー）';
COMMENT ON COLUMN roles.role_code IS 'ロールコード（admin/user/guest等、ユニーク）';
COMMENT ON COLUMN roles.role_name IS 'ロール名';
COMMENT ON COLUMN roles.description IS '説明';
COMMENT ON COLUMN roles.created_at IS '作成日時';
COMMENT ON COLUMN roles.updated_at IS '更新日時';

-- rpa_jobs
COMMENT ON COLUMN rpa_jobs.id IS 'ID（主キー、UUID）';
COMMENT ON COLUMN rpa_jobs.job_type IS 'ジョブ種別（sales_order_entry等）';
COMMENT ON COLUMN rpa_jobs.status IS 'ステータス（pending/validating/processing/completed/failed）';
COMMENT ON COLUMN rpa_jobs.target_count IS '対象件数';
COMMENT ON COLUMN rpa_jobs.success_count IS '成功件数';
COMMENT ON COLUMN rpa_jobs.failure_count IS '失敗件数';
COMMENT ON COLUMN rpa_jobs.error_message IS 'エラーメッセージ';
COMMENT ON COLUMN rpa_jobs.created_at IS '作成日時';
COMMENT ON COLUMN rpa_jobs.updated_at IS '更新日時';
COMMENT ON COLUMN rpa_jobs.timeout_at IS 'タイムアウト日時';

-- rpa_run_events
COMMENT ON COLUMN rpa_run_events.id IS 'ID（主キー）';
COMMENT ON COLUMN rpa_run_events.run_id IS 'RPA実行記録ID';
COMMENT ON COLUMN rpa_run_events.event_type IS 'イベント種別';
COMMENT ON COLUMN rpa_run_events.message IS 'メッセージ';
COMMENT ON COLUMN rpa_run_events.created_at IS '作成日時';
COMMENT ON COLUMN rpa_run_events.created_by_user_id IS '作成ユーザーID';

-- rpa_run_fetches
COMMENT ON COLUMN rpa_run_fetches.id IS 'ID（主キー）';
COMMENT ON COLUMN rpa_run_fetches.rpa_type IS 'RPA種別';
COMMENT ON COLUMN rpa_run_fetches.start_date IS '開始日';
COMMENT ON COLUMN rpa_run_fetches.end_date IS '終了日';
COMMENT ON COLUMN rpa_run_fetches.status IS 'ステータス';
COMMENT ON COLUMN rpa_run_fetches.item_count IS 'アイテム数';
COMMENT ON COLUMN rpa_run_fetches.run_created IS 'Run作成数';
COMMENT ON COLUMN rpa_run_fetches.run_updated IS 'Run更新数';
COMMENT ON COLUMN rpa_run_fetches.message IS 'メッセージ';
COMMENT ON COLUMN rpa_run_fetches.created_at IS '作成日時';

-- rpa_run_groups
COMMENT ON COLUMN rpa_run_groups.id IS 'ID（主キー）';
COMMENT ON COLUMN rpa_run_groups.rpa_type IS 'RPA種別';
COMMENT ON COLUMN rpa_run_groups.grouping_method IS 'グルーピング方法';
COMMENT ON COLUMN rpa_run_groups.max_items_per_run IS 'Run当たり最大アイテム数';
COMMENT ON COLUMN rpa_run_groups.planned_run_count IS '計画Run数';
COMMENT ON COLUMN rpa_run_groups.created_by_user_id IS '作成ユーザーID';
COMMENT ON COLUMN rpa_run_groups.created_at IS '作成日時';

-- rpa_run_item_attempts
COMMENT ON COLUMN rpa_run_item_attempts.id IS 'ID（主キー）';
COMMENT ON COLUMN rpa_run_item_attempts.run_item_id IS 'RPA実行明細ID';
COMMENT ON COLUMN rpa_run_item_attempts.attempt_no IS '試行回数';
COMMENT ON COLUMN rpa_run_item_attempts.status IS 'ステータス';
COMMENT ON COLUMN rpa_run_item_attempts.error_code IS 'エラーコード';
COMMENT ON COLUMN rpa_run_item_attempts.error_message IS 'エラーメッセージ';
COMMENT ON COLUMN rpa_run_item_attempts.created_at IS '作成日時';

-- rpa_runs
COMMENT ON COLUMN rpa_runs.id IS 'ID（主キー）';
COMMENT ON COLUMN rpa_runs.rpa_type IS 'RPA種別';
COMMENT ON COLUMN rpa_runs.status IS 'ステータス（downloaded/step2_done/external_done/step4_done/cancelled）';
COMMENT ON COLUMN rpa_runs.run_group_id IS 'RPAランググループID';
COMMENT ON COLUMN rpa_runs.progress_percent IS '進捗率（%）';
COMMENT ON COLUMN rpa_runs.estimated_minutes IS '推定所要時間（分）';
COMMENT ON COLUMN rpa_runs.paused_at IS '一時停止日時';
COMMENT ON COLUMN rpa_runs.cancelled_at IS 'キャンセル日時';
COMMENT ON COLUMN rpa_runs.data_start_date IS 'データ開始日';
COMMENT ON COLUMN rpa_runs.data_end_date IS 'データ終了日';
COMMENT ON COLUMN rpa_runs.started_at IS '開始日時';
COMMENT ON COLUMN rpa_runs.started_by_user_id IS '開始ユーザーID';
COMMENT ON COLUMN rpa_runs.step2_executed_at IS 'Step2実行日時';
COMMENT ON COLUMN rpa_runs.step2_executed_by_user_id IS 'Step2実行ユーザーID';
COMMENT ON COLUMN rpa_runs.external_done_at IS '外部処理完了日時';
COMMENT ON COLUMN rpa_runs.external_done_by_user_id IS '外部処理完了ユーザーID';
COMMENT ON COLUMN rpa_runs.step4_executed_at IS 'Step4実行日時';
COMMENT ON COLUMN rpa_runs.customer_id IS '顧客ID';
COMMENT ON COLUMN rpa_runs.created_at IS '作成日時';
COMMENT ON COLUMN rpa_runs.updated_at IS '更新日時';

-- sap_connections
COMMENT ON COLUMN sap_connections.id IS 'ID（主キー）';
COMMENT ON COLUMN sap_connections.name IS '接続名（本番/テスト等）';
COMMENT ON COLUMN sap_connections.environment IS '環境識別子（production/test）';
COMMENT ON COLUMN sap_connections.description IS '説明';
COMMENT ON COLUMN sap_connections.ashost IS 'SAPホスト';
COMMENT ON COLUMN sap_connections.sysnr IS 'システム番号';
COMMENT ON COLUMN sap_connections.client IS 'クライアント番号';
COMMENT ON COLUMN sap_connections.user_name IS 'ユーザー名';
COMMENT ON COLUMN sap_connections.passwd_encrypted IS '暗号化パスワード';
COMMENT ON COLUMN sap_connections.lang IS '言語';
COMMENT ON COLUMN sap_connections.default_bukrs IS 'デフォルト会社コード';
COMMENT ON COLUMN sap_connections.default_kunnr IS 'デフォルト得意先コード';
COMMENT ON COLUMN sap_connections.is_active IS '有効フラグ';
COMMENT ON COLUMN sap_connections.is_default IS 'デフォルト接続フラグ';
COMMENT ON COLUMN sap_connections.created_at IS '作成日時';
COMMENT ON COLUMN sap_connections.updated_at IS '更新日時';

-- sap_fetch_logs
COMMENT ON COLUMN sap_fetch_logs.id IS 'ID（主キー）';
COMMENT ON COLUMN sap_fetch_logs.connection_id IS 'SAP接続ID';
COMMENT ON COLUMN sap_fetch_logs.fetch_batch_id IS '取得バッチID';
COMMENT ON COLUMN sap_fetch_logs.rfc_name IS 'RFC名';
COMMENT ON COLUMN sap_fetch_logs.params IS '呼び出しパラメータ（JSON形式）';
COMMENT ON COLUMN sap_fetch_logs.status IS 'ステータス（SUCCESS/ERROR）';
COMMENT ON COLUMN sap_fetch_logs.record_count IS '取得件数';
COMMENT ON COLUMN sap_fetch_logs.error_message IS 'エラーメッセージ';
COMMENT ON COLUMN sap_fetch_logs.duration_ms IS '処理時間（ミリ秒）';
COMMENT ON COLUMN sap_fetch_logs.created_at IS '作成日時';

-- sap_material_cache
COMMENT ON COLUMN sap_material_cache.id IS 'ID（主キー）';
COMMENT ON COLUMN sap_material_cache.connection_id IS 'SAP接続ID';
COMMENT ON COLUMN sap_material_cache.zkdmat_b IS '先方品番（SAPのZKDMAT_B）';
COMMENT ON COLUMN sap_material_cache.kunnr IS '得意先コード';
COMMENT ON COLUMN sap_material_cache.raw_data IS 'ET_DATAの生データ（ZKDMAT_B以外の列、JSON形式）';
COMMENT ON COLUMN sap_material_cache.fetched_at IS '取得日時';
COMMENT ON COLUMN sap_material_cache.fetch_batch_id IS '取得バッチID（同一取得を識別）';
COMMENT ON COLUMN sap_material_cache.created_at IS '作成日時';
COMMENT ON COLUMN sap_material_cache.updated_at IS '更新日時';

-- seed_snapshots
COMMENT ON COLUMN seed_snapshots.id IS 'ID（主キー）';
COMMENT ON COLUMN seed_snapshots.name IS 'スナップショット名';
COMMENT ON COLUMN seed_snapshots.created_at IS '作成日時';
COMMENT ON COLUMN seed_snapshots.params_json IS '展開後の最終パラメータ（profile解決後、JSON形式）';
COMMENT ON COLUMN seed_snapshots.profile_json IS '使用したプロファイル設定（JSON形式）';
COMMENT ON COLUMN seed_snapshots.csv_dir IS 'CSVエクスポートディレクトリ（オプション）';
COMMENT ON COLUMN seed_snapshots.summary_json IS '生成結果のサマリ（件数、検証結果など、JSON形式）';

-- server_logs
COMMENT ON COLUMN server_logs.id IS 'ID（主キー）';
COMMENT ON COLUMN server_logs.created_at IS '作成日時';
COMMENT ON COLUMN server_logs.level IS 'ログレベル（DEBUG/INFO/WARNING/ERROR）';
COMMENT ON COLUMN server_logs.logger IS 'ロガー名';
COMMENT ON COLUMN server_logs.event IS 'イベント名';
COMMENT ON COLUMN server_logs.message IS 'メッセージ';
COMMENT ON COLUMN server_logs.request_id IS 'リクエストID';
COMMENT ON COLUMN server_logs.user_id IS 'ユーザーID';
COMMENT ON COLUMN server_logs.username IS 'ユーザー名';
COMMENT ON COLUMN server_logs.method IS 'HTTPメソッド';
COMMENT ON COLUMN server_logs.path IS 'リクエストパス';
COMMENT ON COLUMN server_logs.extra IS '追加情報（JSON形式）';

-- shipping_master_curated
COMMENT ON COLUMN shipping_master_curated.id IS 'ID（主キー）';
COMMENT ON COLUMN shipping_master_curated.raw_id IS '生データID（shipping_master_raw参照）';
COMMENT ON COLUMN shipping_master_curated.customer_code IS '顧客コード（業務キー）';
COMMENT ON COLUMN shipping_master_curated.material_code IS '材料コード（業務キー）';
COMMENT ON COLUMN shipping_master_curated.jiku_code IS '次区コード（業務キー）';
COMMENT ON COLUMN shipping_master_curated.warehouse_code IS '倉庫コード';
COMMENT ON COLUMN shipping_master_curated.customer_name IS '顧客名';
COMMENT ON COLUMN shipping_master_curated.has_duplicate_warning IS '重複警告フラグ';
COMMENT ON COLUMN shipping_master_curated.created_at IS '作成日時';
COMMENT ON COLUMN shipping_master_curated.updated_at IS '更新日時';

-- smartread_configs
COMMENT ON COLUMN smartread_configs.id IS 'ID（主キー）';
COMMENT ON COLUMN smartread_configs.endpoint IS 'エンドポイントURL';
COMMENT ON COLUMN smartread_configs.api_key IS 'APIキー';
COMMENT ON COLUMN smartread_configs.template_ids IS 'テンプレートID（カンマ区切り）';
COMMENT ON COLUMN smartread_configs.export_type IS 'エクスポート形式（json/csv）';
COMMENT ON COLUMN smartread_configs.aggregation_type IS '集約タイプ';
COMMENT ON COLUMN smartread_configs.watch_dir IS '監視ディレクトリ';
COMMENT ON COLUMN smartread_configs.export_dir IS 'エクスポートディレクトリ';
COMMENT ON COLUMN smartread_configs.input_exts IS '入力ファイル拡張子';
COMMENT ON COLUMN smartread_configs.name IS '設定名';
COMMENT ON COLUMN smartread_configs.description IS '説明';
COMMENT ON COLUMN smartread_configs.is_active IS '有効フラグ';
COMMENT ON COLUMN smartread_configs.is_default IS 'デフォルト設定フラグ';
COMMENT ON COLUMN smartread_configs.created_at IS '作成日時';
COMMENT ON COLUMN smartread_configs.updated_at IS '更新日時';

-- smartread_export_history
COMMENT ON COLUMN smartread_export_history.id IS 'ID（主キー）';
COMMENT ON COLUMN smartread_export_history.config_id IS 'SmartRead設定ID';
COMMENT ON COLUMN smartread_export_history.task_id IS 'タスクID';
COMMENT ON COLUMN smartread_export_history.export_id IS 'エクスポートID';
COMMENT ON COLUMN smartread_export_history.task_date IS 'タスク日付';
COMMENT ON COLUMN smartread_export_history.filename IS 'ファイル名';
COMMENT ON COLUMN smartread_export_history.wide_row_count IS '横持ちデータ行数';
COMMENT ON COLUMN smartread_export_history.long_row_count IS '縦持ちデータ行数';
COMMENT ON COLUMN smartread_export_history.status IS 'ステータス（SUCCESS/FAILED）';
COMMENT ON COLUMN smartread_export_history.error_message IS 'エラーメッセージ';
COMMENT ON COLUMN smartread_export_history.created_at IS '作成日時';

-- smartread_long_data
COMMENT ON COLUMN smartread_long_data.id IS 'ID（主キー）';
COMMENT ON COLUMN smartread_long_data.wide_data_id IS '横持ちデータID（smartread_wide_data参照）';
COMMENT ON COLUMN smartread_long_data.config_id IS 'SmartRead設定ID';
COMMENT ON COLUMN smartread_long_data.task_id IS 'タスクID';
COMMENT ON COLUMN smartread_long_data.task_date IS 'タスク日付';
COMMENT ON COLUMN smartread_long_data.request_id_ref IS 'リクエストID参照（smartread_requests）';
COMMENT ON COLUMN smartread_long_data.row_index IS '行インデックス';
COMMENT ON COLUMN smartread_long_data.content IS 'コンテンツ（JSON形式）';
COMMENT ON COLUMN smartread_long_data.status IS 'ステータス（PENDING/IMPORTED/ERROR/PROCESSING）';
COMMENT ON COLUMN smartread_long_data.error_reason IS 'エラー理由';
COMMENT ON COLUMN smartread_long_data.rpa_job_id IS 'RPAジョブID';
COMMENT ON COLUMN smartread_long_data.sap_order_no IS 'SAP受注番号';
COMMENT ON COLUMN smartread_long_data.verification_result IS '検証結果（JSON形式）';
COMMENT ON COLUMN smartread_long_data.created_at IS '作成日時';

-- smartread_long_data_completed
COMMENT ON COLUMN smartread_long_data_completed.id IS 'ID（主キー）';
COMMENT ON COLUMN smartread_long_data_completed.original_id IS '元ID（smartread_long_data）';
COMMENT ON COLUMN smartread_long_data_completed.wide_data_id IS '横持ちデータID（FK制約なし）';
COMMENT ON COLUMN smartread_long_data_completed.config_id IS 'SmartRead設定ID（FK制約なし）';
COMMENT ON COLUMN smartread_long_data_completed.task_id IS 'タスクID';
COMMENT ON COLUMN smartread_long_data_completed.task_date IS 'タスク日付';
COMMENT ON COLUMN smartread_long_data_completed.request_id_ref IS 'リクエストID参照（FK制約なし）';
COMMENT ON COLUMN smartread_long_data_completed.row_index IS '行インデックス';
COMMENT ON COLUMN smartread_long_data_completed.content IS 'コンテンツ（JSON形式）';
COMMENT ON COLUMN smartread_long_data_completed.status IS 'ステータス';
COMMENT ON COLUMN smartread_long_data_completed.sap_order_no IS 'SAP受注番号';
COMMENT ON COLUMN smartread_long_data_completed.completed_at IS '完了日時';
COMMENT ON COLUMN smartread_long_data_completed.created_at IS '作成日時';

-- smartread_pad_runs
COMMENT ON COLUMN smartread_pad_runs.id IS 'ID（主キー）';
COMMENT ON COLUMN smartread_pad_runs.run_id IS 'ランID（UUID、ユニーク）';
COMMENT ON COLUMN smartread_pad_runs.config_id IS 'SmartRead設定ID';
COMMENT ON COLUMN smartread_pad_runs.status IS 'ステータス（RUNNING/SUCCEEDED/FAILED/STALE）';
COMMENT ON COLUMN smartread_pad_runs.step IS 'ステップ';
COMMENT ON COLUMN smartread_pad_runs.task_id IS 'タスクID';
COMMENT ON COLUMN smartread_pad_runs.export_id IS 'エクスポートID';
COMMENT ON COLUMN smartread_pad_runs.filenames IS 'ファイル名リスト（JSON配列）';
COMMENT ON COLUMN smartread_pad_runs.wide_data_count IS '横持ちデータ件数';
COMMENT ON COLUMN smartread_pad_runs.long_data_count IS '縦持ちデータ件数';
COMMENT ON COLUMN smartread_pad_runs.error_message IS 'エラーメッセージ';
COMMENT ON COLUMN smartread_pad_runs.created_at IS '作成日時';
COMMENT ON COLUMN smartread_pad_runs.updated_at IS '更新日時';
COMMENT ON COLUMN smartread_pad_runs.heartbeat_at IS 'ハートビート日時';
COMMENT ON COLUMN smartread_pad_runs.completed_at IS '完了日時';
COMMENT ON COLUMN smartread_pad_runs.retry_count IS 'リトライ回数';
COMMENT ON COLUMN smartread_pad_runs.max_retries IS '最大リトライ回数';

-- smartread_requests
COMMENT ON COLUMN smartread_requests.id IS 'ID（主キー）';
COMMENT ON COLUMN smartread_requests.request_id IS 'リクエストID（ユニーク）';
COMMENT ON COLUMN smartread_requests.task_id_ref IS 'タスクID参照（smartread_tasks）';
COMMENT ON COLUMN smartread_requests.task_id IS 'タスクID';
COMMENT ON COLUMN smartread_requests.task_date IS 'タスク日付';
COMMENT ON COLUMN smartread_requests.config_id IS 'SmartRead設定ID';
COMMENT ON COLUMN smartread_requests.filename IS 'ファイル名';
COMMENT ON COLUMN smartread_requests.num_of_pages IS 'ページ数';
COMMENT ON COLUMN smartread_requests.submitted_at IS '送信日時';
COMMENT ON COLUMN smartread_requests.state IS '状態（PENDING/PROCESSING/COMPLETED/FAILED）';
COMMENT ON COLUMN smartread_requests.result_json IS '結果JSON';
COMMENT ON COLUMN smartread_requests.error_message IS 'エラーメッセージ';
COMMENT ON COLUMN smartread_requests.completed_at IS '完了日時';
COMMENT ON COLUMN smartread_requests.created_at IS '作成日時';

-- smartread_tasks
COMMENT ON COLUMN smartread_tasks.id IS 'ID（主キー）';
COMMENT ON COLUMN smartread_tasks.config_id IS 'SmartRead設定ID';
COMMENT ON COLUMN smartread_tasks.task_id IS 'タスクID（ユニーク）';
COMMENT ON COLUMN smartread_tasks.task_date IS 'タスク日付';
COMMENT ON COLUMN smartread_tasks.name IS 'タスク名';
COMMENT ON COLUMN smartread_tasks.state IS '状態';
COMMENT ON COLUMN smartread_tasks.synced_at IS '同期日時';
COMMENT ON COLUMN smartread_tasks.skip_today IS '本日スキップフラグ';
COMMENT ON COLUMN smartread_tasks.created_at IS '作成日時';

-- smartread_wide_data
COMMENT ON COLUMN smartread_wide_data.id IS 'ID（主キー）';
COMMENT ON COLUMN smartread_wide_data.config_id IS 'SmartRead設定ID';
COMMENT ON COLUMN smartread_wide_data.task_id IS 'タスクID';
COMMENT ON COLUMN smartread_wide_data.task_date IS 'タスク日付';
COMMENT ON COLUMN smartread_wide_data.export_id IS 'エクスポートID';
COMMENT ON COLUMN smartread_wide_data.request_id_ref IS 'リクエストID参照（smartread_requests）';
COMMENT ON COLUMN smartread_wide_data.filename IS 'ファイル名';
COMMENT ON COLUMN smartread_wide_data.row_index IS '行インデックス';
COMMENT ON COLUMN smartread_wide_data.content IS 'コンテンツ（JSON形式）';
COMMENT ON COLUMN smartread_wide_data.row_fingerprint IS '行フィンガープリント（重複防止用ハッシュ）';
COMMENT ON COLUMN smartread_wide_data.created_at IS '作成日時';

-- stock_history
COMMENT ON COLUMN stock_history.id IS 'ID（主キー）';
COMMENT ON COLUMN stock_history.lot_id IS 'ロットID（lot_receipts参照）';
COMMENT ON COLUMN stock_history.transaction_type IS 'トランザクション種別（inbound/allocation/shipment/adjustment/return/withdrawal）';
COMMENT ON COLUMN stock_history.quantity_change IS '数量変動（±）';
COMMENT ON COLUMN stock_history.quantity_after IS '変動後在庫数';
COMMENT ON COLUMN stock_history.reference_type IS '参照種別（order/forecast等）';
COMMENT ON COLUMN stock_history.reference_id IS '参照ID';
COMMENT ON COLUMN stock_history.transaction_date IS 'トランザクション日時';

-- supplier_items
COMMENT ON COLUMN supplier_items.id IS 'ID（主キー）';
COMMENT ON COLUMN supplier_items.supplier_id IS '仕入先ID';
COMMENT ON COLUMN supplier_items.maker_part_no IS 'メーカー品番（仕入先の品番、業務キー）';
COMMENT ON COLUMN supplier_items.display_name IS '製品名（必須）';
COMMENT ON COLUMN supplier_items.base_unit IS '基本単位（在庫単位、必須）';
COMMENT ON COLUMN supplier_items.internal_unit IS '社内単位/引当単位（例: CAN）';
COMMENT ON COLUMN supplier_items.external_unit IS '外部単位/表示単位（例: KG）';
COMMENT ON COLUMN supplier_items.qty_per_internal_unit IS '内部単位あたりの数量（例: 1 CAN = 20.0 KG）';
COMMENT ON COLUMN supplier_items.consumption_limit_days IS '消費期限日数';
COMMENT ON COLUMN supplier_items.requires_lot_number IS 'ロット番号管理が必要';
COMMENT ON COLUMN supplier_items.net_weight IS '正味重量';
COMMENT ON COLUMN supplier_items.weight_unit IS '重量単位';
COMMENT ON COLUMN supplier_items.lead_time_days IS 'リードタイム（日）';
COMMENT ON COLUMN supplier_items.notes IS '備考';
COMMENT ON COLUMN supplier_items.valid_to IS '有効終了日（Soft Delete）';
COMMENT ON COLUMN supplier_items.created_at IS '作成日時';
COMMENT ON COLUMN supplier_items.updated_at IS '更新日時';

-- suppliers
COMMENT ON COLUMN suppliers.id IS 'ID（主キー）';
COMMENT ON COLUMN suppliers.supplier_code IS '仕入先コード（業務キー）';
COMMENT ON COLUMN suppliers.supplier_name IS '仕入先名';
COMMENT ON COLUMN suppliers.short_name IS '短縮表示名（UI省スペース用）';
COMMENT ON COLUMN suppliers.valid_to IS '有効終了日（Soft Delete）';
COMMENT ON COLUMN suppliers.created_at IS '作成日時';
COMMENT ON COLUMN suppliers.updated_at IS '更新日時';

-- system_client_logs
COMMENT ON COLUMN system_client_logs.id IS 'ID（主キー）';
COMMENT ON COLUMN system_client_logs.user_id IS 'ユーザーID';
COMMENT ON COLUMN system_client_logs.level IS 'ログレベル（debug/info/warning/error）';
COMMENT ON COLUMN system_client_logs.message IS 'メッセージ';
COMMENT ON COLUMN system_client_logs.user_agent IS 'ユーザーエージェント';
COMMENT ON COLUMN system_client_logs.request_id IS 'リクエストID';
COMMENT ON COLUMN system_client_logs.created_at IS '作成日時';

-- system_configs
COMMENT ON COLUMN system_configs.id IS 'ID（主キー）';
COMMENT ON COLUMN system_configs.config_key IS '設定キー（ユニーク）';
COMMENT ON COLUMN system_configs.config_value IS '設定値';
COMMENT ON COLUMN system_configs.description IS '説明';
COMMENT ON COLUMN system_configs.created_at IS '作成日時';
COMMENT ON COLUMN system_configs.updated_at IS '更新日時';

-- user_roles
COMMENT ON COLUMN user_roles.user_id IS 'ユーザーID（複合PK）';
COMMENT ON COLUMN user_roles.role_id IS 'ロールID（複合PK）';
COMMENT ON COLUMN user_roles.assigned_at IS '割り当て日時';

-- user_supplier_assignments
COMMENT ON COLUMN user_supplier_assignments.id IS 'ID（主キー）';
COMMENT ON COLUMN user_supplier_assignments.user_id IS 'ユーザーID';
COMMENT ON COLUMN user_supplier_assignments.supplier_id IS '仕入先ID';
COMMENT ON COLUMN user_supplier_assignments.is_primary IS '主担当フラグ（1仕入先につき1人のみ）';
COMMENT ON COLUMN user_supplier_assignments.assigned_at IS '割り当て日時';
COMMENT ON COLUMN user_supplier_assignments.created_at IS '作成日時';
COMMENT ON COLUMN user_supplier_assignments.updated_at IS '更新日時';

-- users
COMMENT ON COLUMN users.id IS 'ID（主キー）';
COMMENT ON COLUMN users.username IS 'ユーザー名（ログインID、ユニーク）';
COMMENT ON COLUMN users.email IS 'メールアドレス（ユニーク）';
COMMENT ON COLUMN users.auth_provider IS '認証プロバイダ（local/azure等）';
COMMENT ON COLUMN users.azure_object_id IS 'Azure AD オブジェクトID（ユニーク）';
COMMENT ON COLUMN users.password_hash IS 'パスワードハッシュ';
COMMENT ON COLUMN users.display_name IS '表示名';
COMMENT ON COLUMN users.is_active IS 'アクティブフラグ';
COMMENT ON COLUMN users.last_login_at IS '最終ログイン日時';
COMMENT ON COLUMN users.created_at IS '作成日時';
COMMENT ON COLUMN users.updated_at IS '更新日時';

-- warehouse_delivery_routes
COMMENT ON COLUMN warehouse_delivery_routes.id IS 'ID（主キー）';
COMMENT ON COLUMN warehouse_delivery_routes.warehouse_id IS '倉庫ID';
COMMENT ON COLUMN warehouse_delivery_routes.delivery_place_id IS '納入先ID';
COMMENT ON COLUMN warehouse_delivery_routes.product_group_id IS '仕入先品目ID（メーカー品番への参照、NULLの場合は経路デフォルト）';
COMMENT ON COLUMN warehouse_delivery_routes.transport_lead_time_days IS '輸送リードタイム（日）';
COMMENT ON COLUMN warehouse_delivery_routes.is_active IS '有効フラグ';
COMMENT ON COLUMN warehouse_delivery_routes.notes IS '備考';
COMMENT ON COLUMN warehouse_delivery_routes.created_at IS '作成日時';
COMMENT ON COLUMN warehouse_delivery_routes.updated_at IS '更新日時';

-- warehouses
COMMENT ON COLUMN warehouses.id IS 'ID（主キー）';
COMMENT ON COLUMN warehouses.warehouse_code IS '倉庫コード（業務キー）';
COMMENT ON COLUMN warehouses.warehouse_name IS '倉庫名';
COMMENT ON COLUMN warehouses.warehouse_type IS '倉庫種別（internal/external/supplier）';
COMMENT ON COLUMN warehouses.default_transport_lead_time_days IS 'デフォルト輸送リードタイム（日）';
COMMENT ON COLUMN warehouses.short_name IS '短縮表示名（UI省スペース用）';
COMMENT ON COLUMN warehouses.valid_to IS '有効終了日（Soft Delete）';
COMMENT ON COLUMN warehouses.created_at IS '作成日時';
COMMENT ON COLUMN warehouses.updated_at IS '更新日時';

-- withdrawal_lines
COMMENT ON COLUMN withdrawal_lines.id IS 'ID（主キー）';
COMMENT ON COLUMN withdrawal_lines.withdrawal_id IS '出庫ID';
COMMENT ON COLUMN withdrawal_lines.lot_receipt_id IS 'ロット入荷ID（lot_receipts参照）';
COMMENT ON COLUMN withdrawal_lines.quantity IS '出庫数量';
COMMENT ON COLUMN withdrawal_lines.created_at IS '作成日時';

-- withdrawals
COMMENT ON COLUMN withdrawals.id IS 'ID（主キー）';
COMMENT ON COLUMN withdrawals.lot_id IS 'ロットID（レガシー：withdrawal_lines移行後は未使用）';
COMMENT ON COLUMN withdrawals.quantity IS '数量（レガシー：withdrawal_lines移行後は未使用）';
COMMENT ON COLUMN withdrawals.withdrawal_type IS '出庫種別（order_manual/internal_use/disposal/return/sample/other）';
COMMENT ON COLUMN withdrawals.customer_id IS '顧客ID';
COMMENT ON COLUMN withdrawals.delivery_place_id IS '納入先ID';
COMMENT ON COLUMN withdrawals.ship_date IS '出荷日';
COMMENT ON COLUMN withdrawals.due_date IS '納期（必須）';
COMMENT ON COLUMN withdrawals.planned_ship_date IS '予定出荷日（任意、LT計算用）';
COMMENT ON COLUMN withdrawals.reason IS '理由';
COMMENT ON COLUMN withdrawals.reference_number IS '参照番号';
COMMENT ON COLUMN withdrawals.withdrawn_by IS '出庫実行ユーザーID';
COMMENT ON COLUMN withdrawals.withdrawn_at IS '出庫日時';
COMMENT ON COLUMN withdrawals.created_at IS '作成日時';
COMMENT ON COLUMN withdrawals.cancelled_at IS 'キャンセル日時';
COMMENT ON COLUMN withdrawals.cancelled_by IS 'キャンセル実行ユーザーID';
COMMENT ON COLUMN withdrawals.cancel_reason IS 'キャンセル理由';
COMMENT ON COLUMN withdrawals.cancel_note IS 'キャンセル補足';

-- Total tables with comments: 69

-- Additional tables (special format in draft)
COMMENT ON TABLE rpa_run_items IS 'RPA実行明細：CSVの各行に対応する実行明細（子テーブル）';
COMMENT ON TABLE ocr_result_edits_completed IS 'OCR結果編集完了済み：完了済みアーカイブ（FK制約なし）';
COMMENT ON TABLE shipping_master_raw IS '出荷用マスタ生データ：外部システムからの取得データを保存';
