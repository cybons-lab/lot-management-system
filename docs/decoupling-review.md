# 現状の問題点（疎結合の観点）

## バックエンド
- **Lotモデルが受注寄りの前提を内包**: `origin_type` のデフォルトが `order` で、`Allocation` リレーションを直にもつため、ロット生成・在庫計算が常に受注起点で設計されている。【F:backend/app/infrastructure/persistence/models/inventory_models.py†L54-L190】
- **引当確定処理がロットと受注明細を同一サービスで操作**: `persist_allocation_entities` は `OrderLine` の状態更新とロット在庫更新を同じトランザクションで実施し、ロットが受注の状態遷移を直接知っている。【F:backend/app/application/services/allocations/actions.py†L49-L148】
- **LotService が受注専用バリデーションを内包**: ロット作成時に `origin_type=order` を特別扱いし、サプライヤ必須やロット番号自動生成などを一箇所で判定しており、受注依存のルールがロットサービスに埋め込まれている。【F:backend/app/application/services/inventory/lot_service.py†L340-L419】

## フロントエンド
- **受注画面がロット割当 UI を内包**: `OrderDetailPage` が `LotAllocationPanel` を直接マウントし、受注詳細とロット操作の UI 責務が分離されていない。【F:frontend/src/features/orders/pages/OrderDetailPage.tsx†L230-L299】
- **フックで受注・ロット両方の状態を集約管理**: `useOrderLineAllocation` が受注明細の状態とローカルのロット配分編集を一体で扱い、API 呼び出しも受注 API に依存している。【F:frontend/src/features/orders/hooks/useOrderLineAllocation.ts†L23-L139】
- **型/正規化がロットと受注を混在**: `LotUI` や `OrderLineUI` の正規化ヘルパーでロット関連フィールドと受注フィールドが混在し、ロット表示用データ構造が受注の補助フィールドに依存している。【F:frontend/src/shared/libs/normalize.ts†L178-L206】【F:frontend/src/shared/libs/normalize.ts†L266-L280】

# 推奨するモジュール構造

- **コア在庫（Lot, StockHistory, LotTransaction）**: 在庫生成・消費・移動を受注非依存で管理。`origin_type` のデフォルトを中立値にし、消費イベントは抽象化したトランザクション経由で記録。
- **消費イベントレイヤ（Allocation/Withdrawal/Adjustment）**: Lot への数量変化はイベント種別（受注割当、棚卸差異、廃棄など）で表現し、受注割当はその一種として扱う。
- **需要側（Order/Forecast）**: 受注・予測は「どのイベントでどれだけ消費したか」を参照するだけに限定し、在庫計算はコア在庫レイヤに委譲。
- **サービス分割**: `LotService` は在庫操作専用、`AllocationService` は受注とのひも付け専用、`OrderService` は受注明細管理に限定。状態遷移や在庫反映はイベント経由で疎結合に連携。

# 段階的リファクタリングプラン

1. **Phase 1: インターフェース分離**
   - ロット作成/更新 API から受注専用バリデーションを切り出し、`AllocationService` 側でサプライヤ必須などの業務判定を行う。
   - フロントでロット一覧・払出 UI を受注画面から分離し、割当ダイアログを独立したモジュールとして読み込む。
2. **Phase 2: イベント化**
   - 在庫変動を `LotTransaction`（在庫増減イベント）に統一し、`Allocation` もイベントとして記録するよう変更。`Lot` から `allocations` リレーションを段階的に縮退させる。
   - API で「ロット候補取得」「ロット消費（割当）」エンドポイントを独立させ、受注明細 API とは別ルートにまとめる。
3. **Phase 3: デフォルト前提の是正**
   - `origin_type` のデフォルトを `adhoc` など中立値に変更し、受注起点ロット生成は明示的に指定させる。
   - フロント型定義をロット中心に再構成し、受注明細用の派生型は別 DTO として拡張する。

# 影響範囲と注意点

- **DB/ORM 影響**: `allocations` のリレーションを緩める場合はマイグレーションとクエリ修正が必要（バックフィルやビューで互換層を用意）。
- **API 互換**: 受注 API からロット候補・割当系を切り出す際、フロントの呼び先変更とスキーマ互換のための変換層が必要。
- **UI 影響**: 受注画面に組み込まれている割当 UI を独立させると、状態管理とテストの切り直しが発生するが、再利用性が向上する。
- **トランザクション管理**: 在庫変動イベントを共通化することでトランザクション境界を再設計する必要があり、並行更新のロック戦略を見直すこと。
