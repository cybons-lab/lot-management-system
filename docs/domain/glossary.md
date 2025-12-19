# 用語集 (Glossary)

## ロット・在庫関連 (Lot & Inventory)
| 用語 (JP) | 用語 (EN) | 定義 |
| :--- | :--- | :--- |
| **ロット** | Lot | 製品、倉庫（、仕入先）ごとに管理される在庫の最小単位。ロット番号で識別される。 |
| **現在在庫** | Current Quantity | 倉庫に物理的に存在する在庫総数。不良品ロック分なども含む。 |
| **有効在庫** | Available Quantity | 引当計算に使用可能な在庫数。`現在在庫 - ロック数量 - 確定引当済数量` で算出される。 |
| **仮ロット** | Temporary Lot | 入庫予定はあるが、正式なロット番号が未定または未入力の状態のロット。`TMP-` プレフィックスが付く。 |
| **FEFO** | First Expiry First Out | 期限優先先出し。有効期限が近いものから順に出庫する原則。本システムの基本引当ルール。 |

## 引当・予約関連 (Allocation & Reservation)
| 用語 (JP) | 用語 (EN) | 定義 |
| :--- | :--- | :--- |
| **引当** | Allocation | 注文に対して在庫を確保する行為。システム上は `LotReservation` レコードを作成することで実現される。 |
| **予約** | Reservation | `Allocation` の新名称（P3移行後）。ForecastやOrderなど、在庫を拘束する全ての行為を指す。 |
| **仮引当** | Active/Provisional Reservation | ロジックにより引当候補として選定された状態。まだ在庫計算上の「有効在庫」からは減算されない（オーバーブッキング許容）。 |
| **確定引当** | Confirmed Reservation | SAP連携などが完了し、確実に出庫が必要な状態。有効在庫から減算される。 |
| **引当推奨** | Allocation Suggestion | システムが提案する引当案。ユーザーが確認または自動承認することで予約となる。 |

## 製品・品番関連 (Product & Part Numbers)
| 用語 (JP) | 用語 (EN) | 定義 |
| :--- | :--- | :--- |
| **製品コード** | Product Code | 社内で製品を一意に識別するためのコード。DB上は `products.maker_part_code` カラムに格納。API/スキーマでは `product_code` として公開。 |
| **先方品番** | Customer Part No | 得意先（顧客）が使用する品番。得意先ごとに異なる場合がある。DB上は `products.customer_part_no` カラム。 |
| **メーカー品番** | Maker Item Code | 仕入先（メーカー）が使用する品番。仕入先からの納品書等で使用される。DB上は `products.maker_item_code` カラム。 |
| **外部製品コード** | External Product Code | 顧客品目マスタ（`customer_items`）で使用される、得意先固有の製品識別コード。先方品番と同義の場合も多い。 |

> [!NOTE]
> **品番体系の注意点**
> - DBカラム名 `maker_part_code` は歴史的経緯により命名されているが、実際の用途は「社内製品コード」です
> - `maker_item_code` が「メーカー（仕入先）の品番」を表します
> - 外部システム連携時は、どの品番体系を使用するか明確にする必要があります

## 入出荷関連 (Shipping & Receiving)
| 用語 (JP) | 用語 (EN) | 定義 |
| :--- | :--- | :--- |
| **入庫** | Inbound | 外部から倉庫へ物品を受け入れること。`active` なロット在庫が生成される。 |
| **出庫** | Outbound/Shipment | 倉庫から物品を搬出すること。在庫が減る。 |
| **在庫調整** | Adjustment | システム上の在庫数と実在庫数の差異を修正すること。棚卸、破損等が理由となる。 |
