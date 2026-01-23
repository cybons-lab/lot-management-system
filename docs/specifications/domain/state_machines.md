# 状態遷移図 (State Machines)

本ドキュメントでは、システム内の主要なエンティティの状態遷移をMermaid図で可視化する。

## 1. ロット予約 (LotReservation)

予約のライフサイクル。根拠: `backend/app/infrastructure/persistence/models/lot_reservations_model.py`

```mermaid
stateDiagram-v2
    [*] --> temporary: 予約作成
    [*] --> active: 直接予約作成
    
    temporary --> active: 本確定
    temporary --> released: 失効/キャンセル
    
    active --> confirmed: SAP登録完了
    active --> released: 予約解放
    
    confirmed --> released: 確定解除（要SAP連携）
    
    released --> [*]: 終端状態
    
    note right of temporary
        一時予約
        expires_at で自動失効
    end note
    
    note right of active
        有効予約
        available_qty に影響しない
        (オーバーブッキング許容)
    end note
    
    note right of confirmed
        確定予約
        available_qty を減少させる
    end note
    
    note right of released
        解放済み
        遷移不可（終端）
    end note
```

### 1.1 遷移ルール詳細

| 遷移前 | 遷移後 | トリガー | 備考 |
|:---|:---|:---|:---|
| - | `temporary` | 仮予約作成 | `expires_at` 必須 |
| - | `active` | 通常予約作成 | |
| `temporary` | `active` | 本確定処理 | |
| `temporary` | `released` | 失効/ユーザーキャンセル | |
| `active` | `confirmed` | SAP登録完了 | `sap_document_no` 設定 |
| `active` | `released` | 予約解放 | |
| `confirmed` | `released` | 確定解除 | **要SAP連携** |

---

## 2. ロット在庫 (Lot)

ロットの状態管理。根拠: `backend/app/infrastructure/persistence/models/inventory_models.py`

```mermaid
stateDiagram-v2
    [*] --> active: 入庫
    
    active --> depleted: 在庫消費（quantity=0）
    active --> expired: 有効期限超過
    active --> quarantine: 品質検査
    active --> locked: 手動ロック
    
    quarantine --> active: 検査合格
    quarantine --> locked: 検査不合格
    
    locked --> active: ロック解除
    
    depleted --> [*]
    expired --> [*]
```

### 2.1 ステータス詳細

| ステータス | 意味 | 引当可否 |
|:---|:---|:---:|
| `active` | 有効 | ○ |
| `depleted` | 枯渇（在庫0） | × |
| `expired` | 有効期限切れ | × |
| `quarantine` | 品質検査中 | × |
| `locked` | 手動ロック中 | × |

---

## 3. 受注明細 (OrderLine)

受注の処理状態。根拠: `backend/app/infrastructure/persistence/models/orders_models.py`

```mermaid
stateDiagram-v2
    [*] --> pending: 受注登録
    
    pending --> allocated: 引当完了
    
    allocated --> shipped: 出荷完了
    allocated --> pending: 引当解除
    
    shipped --> completed: 処理完了
    
    pending --> cancelled: キャンセル
    allocated --> cancelled: キャンセル
    
    completed --> [*]
    cancelled --> [*]
```

### 3.1 ステータス詳細

| ステータス | 意味 | 次アクション |
|:---|:---|:---|
| `pending` | 引当待ち | 引当実行 or キャンセル |
| `allocated` | 引当済み | 出荷 or 引当解除 |
| `shipped` | 出荷済み | 完了処理 |
| `completed` | 完了 | なし（終端） |
| `cancelled` | キャンセル | なし（終端） |

---

## 4. 受注種別 (OrderType)

受注の需要種別分類。

```mermaid
graph TD
    A[受注] --> B{order_type}
    B --> C[FORECAST_LINKED]
    B --> D[KANBAN]
    B --> E[SPOT]
    B --> F[ORDER]
    
    C --> C1[フォーキャスト連動受注]
    D --> D1[かんばん受注]
    E --> E1[スポット受注]
    F --> F1[通常受注]
```

---

## 5. 在庫調整区分 (AdjustmentType)

在庫調整の理由区分。

| 区分 | 意味 | 数量変動 |
|:---|:---|:---:|
| `physical_count` | 棚卸差異 | ± |
| `damage` | 破損 | - |
| `loss` | 紛失 | - |
| `found` | 発見 | + |
| `other` | その他 | ± |
