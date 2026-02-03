# 出荷用マスタデータ → 各種マスタ自動同期 設計（Draft）

## 背景
出荷用マスタデータ（`shipping_master_raw` / `shipping_master_curated`）はOCR受注登録や出荷票生成に使われているが、既存の得意先・仕入先・倉庫・品番などの各種マスタとは独立しており、同じ情報を別画面で重複登録する運用になっている。Excelインポート後に各種マスタへ自動登録できれば、登録工数と転記ミスを減らせる。

## 目的
- 出荷用マスタデータのExcelインポート後に、必要な各種マスタへ自動同期できる設計を定義する。
- 現時点で不足している情報（単位、倉庫種別など）に対して、同期の可否と補完方針を明確化する。
- 将来的に「出荷用マスタデータ = 各種マスタの集合体」に近づけるための足がかりを作る。

## 非ゴール
- 既存マスタの一括削除や置換は行わない（同期は作成・更新が中心）。
- 出荷用マスタのスキーマ統合や大規模リファクタは本設計の範囲外。
- UIの大幅な改修は行わず、同期の入口と結果表示に限定する。

## 現状整理
- Excelインポートは `POST /shipping-masters/import` で `shipping_master_raw` に保存し、その後 `shipping_master_curated` を生成する。
- `shipping_master_curated` は既存マスタへのFK制約を持たず独立データ。
- 各種マスタは `customers`, `suppliers`, `warehouses`, `supplier_items`, `customer_items`, `delivery_places`, `customer_item_jiku_mappings`, `customer_item_delivery_settings`, `warehouse_delivery_routes` など。

## 同期対象とマッピング（案）
| 対象マスタ | ビジネスキー | 出荷用マスタの参照元 | 反映項目 | 備考 |
| --- | --- | --- | --- | --- |
| `customers` | `customer_code` | `customer_code`, `customer_name` | `customer_name`, `display_name` | 新規時は `customer_name` と `display_name` 両方にセット。 |
| `suppliers` | `supplier_code` | `supplier_code`, `supplier_name` | `supplier_name`, `display_name` | 新規時は両方にセット。 |
| `warehouses` | `warehouse_code` | `shipping_warehouse_code`, `shipping_warehouse_name` | `warehouse_name`, `display_name`, `warehouse_type` | 新規時は `warehouse_name`/`display_name` 両方にセット。`warehouse_type` はオプショナル。 |
| `delivery_places` | `jiku_code + delivery_place_code` | `delivery_place_code`, `delivery_place_name`, `jiku_code`, `customer_code` | `delivery_place_name`, `jiku_code`, `customer_id` | **(次区, 納入先コード) のペアでグローバルに一意**。
### 納入先コード (`delivery_place_code`)
現状の `delivery_places` テーブルでは、 `delivery_place_code` に**グローバルな一意制約** (`uq_delivery_places_code`) が課されています。
- **フィードバック**: 「次区（`jiku_code`）」と「納入先コード（`delivery_place_code`）」のペアでユニーク制約をかける方針で確定しました。これにより、同じコードでも次区が異なれば別場所として扱い、全く同じペアが重複した場合はエラーとします。既存の制約をペアでのユニークに変更するマイグレーションが必要です。
 |
| `supplier_items` | `supplier_id + maker_part_no` | `supplier_code`, `maker_part_no`, `delivery_note_product_name` | `display_name`, `base_unit` | **名称欠落時はスキップ**。`base_unit` はデフォルト `KG`。 |
| `customer_items` | `customer_id + customer_part_no` | `customer_code`, `customer_part_no`, `maker_part_no`, `supplier_code`, `remarks` | `supplier_item_id`, `base_unit`, `special_instructions` | `supplier_item_id` は `supplier_items` から取得。 |
| `customer_item_jiku_mappings` | `customer_item_id + jiku_code` | `jiku_code`, `delivery_place_code` | `delivery_place_id`, `is_default` | 初回同期時に `is_default=true` を立てる。 |
| `customer_item_delivery_settings` | `customer_item_id + delivery_place_id + jiku_code` | `shipping_slip_text`, `transport_lt_days` | `shipment_text`, `lead_time_days` | `delivery_place_id` 取得が必要。 |
| `warehouse_delivery_routes` | `warehouse_id + delivery_place_id + supplier_item_id?` | `shipping_warehouse_code`, `delivery_place_code`, `transport_lt_days` | `transport_lead_time_days` | `transport_lt_days` がある場合のみ。 |
| `product_mappings` | `customer_id + customer_part_code + supplier_id` | `customer_part_no`, `maker_part_no`, `supplier_code` | `supplier_item_id`, `base_unit` | 同期対象。 |

未同期の項目: `material_code`, `maker_code`, `maker_name`, `has_order` は現状の各種マスタに受け皿がないため同期対象外。

## 同期フロー（案）
1. Excelインポート完了後に `shipping_master_raw.import_batch_id` を取得。
2. `curate_from_raw(batch_id)` で当該バッチのみ整形済みを生成。
3. `ShippingMasterSyncService` が `shipping_master_curated` を読み込み、1行ずつバリデーション・正規化。
4. 依存順に upsert を実行。
5. 同期結果をサマリとして返却し、詳細はログに保存。

同期順序の例: `customers` → `suppliers` → `warehouses` → `delivery_places` → `supplier_items` → `customer_items` → `customer_item_jiku_mappings` → `customer_item_delivery_settings` → `warehouse_delivery_routes` → `product_mappings(任意)`

## 反映ポリシー
- デフォルトは `create-only`（既存レコードは更新しない）。
- オプションで `upsert` / `update-if-empty` を選べるようにする。
- `update-if-empty` では、対象項目が **NULL または空文字** の場合に「empty」とみなし上書きを許容する。
- いずれのモードでも削除は行わない（`valid_to` の変更は行わない）。

## 追加API・UI（案）
- `POST /shipping-masters/import` に `sync=true` を追加して即時同期する。
- もしくは `POST /shipping-masters/sync` を新設し、バッチID or 期間 or curated_id 指定で同期可能にする。
- フロントは「インポート後に自動同期」チェックボックスを追加し、結果サマリ（作成件数、警告、失敗理由）を表示。

## 決定事項（2026-02-03 更新）
- `supplier_items.base_unit` のデフォルト値は **KG**。
- `warehouses.warehouse_type` は **オプショナル（NULL/空）** に変更し、同期時は空を許容。
- `customers`, `suppliers`, `warehouses` に **`display_name`** カラムを追加する。
- `product_mappings` は同期対象に含める。
- `customer_item_delivery_settings` / `warehouse_delivery_routes` の重複は **エラー扱い**（上書きしない）。
- `remarks` は `customer_items.special_instructions` に保存する。
- `delivery_place_code` の一意制約は **`(jiku_code, delivery_place_code)` のペアでグローバル一意** に変更する。
- `supplier_items` の名称欠落時は **行単位でスキップ** する。

## 追加設定（案）
- `system_configs` に同期用デフォルト値を追加。
- 例: `shipping_master_sync.default_base_unit = "KG"`。

## 例外・警告ハンドリング
- 必須キー欠落（`customer_code` など）の行は同期対象外とし、警告リストに記録。
- `supplier_items.base_unit` はデフォルト **KG** で補完。
- `warehouse_type` は NULL 許容のため未設定で保存可。
- 名称などの必須属性が欠落している場合は「同期スキップ」または「デフォルト補完」に分岐できるようにする。
- 既存レコードとの矛盾（名称の変更など）は `update-if-empty` では上書きしない。
- `delivery_place_code` の顧客跨ぎ重複が発生した場合は **当該行のみスキップ** して警告に記録する。

## 実装ポイント（案）
- `ShippingMasterService.import_raw_data` が `batch_id` を返却できるように変更する。
- `ShippingMasterSyncService` を追加し、同期の単位を `batch_id` で扱えるようにする。
- 既存の `MasterImportService` と重複する upsert ロジックは共通化を検討する。
- 同期結果は `MasterChangeLog` を利用して履歴を残し、必要なら `shipping_master_sync_logs` の新設も検討する。
- `warehouses.warehouse_type` を NULL 許容にするためのスキーマ変更が必要（DDL/ORM/バリデーションの更新）。

## 要確認事項（残り）
- なし

## 将来的な展望：ビューへの移行

本設計の「自動同期」が安定し、運用上ほとんどのデータが各種マスタに登録されている状態になった後は、`shipping_master_curated` を物理テーブルから **VIEW** に移行することを目指します。

- **メリット**: 二重管理の完全撤廃、各種マスタ変更の即時反映。
- **移行の条件**:
  - 同期成功率が十分に高く、`curated` にしか存在しないデータがほぼゼロになること。
  - 複雑な JOIN によるパフォーマンス低下を解消できること（必要に応じてマテリアライズドビューの検討）。

---

## 結論（現時点の評価）
Excelインポート後に各種マスタへ値を渡すことは技術的に可能。`supplier_items.base_unit` はデフォルト `KG` で補完し、`warehouses.warehouse_type` は NULL 許容へ変更する前提とする。まずは `create-only` で自動同期を導入し、運用を見ながら更新ポリシーや項目拡張を進める。
