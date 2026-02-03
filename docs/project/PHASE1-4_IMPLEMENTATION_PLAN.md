# Phase 1-4: 通知システム・ナビゲーション再編・排他制御 実装計画

**作成日:** 2026-02-03
**ステータス:** 計画中

---

## 📋 全体概要

このドキュメントは、システムのUI/UX改善と機能追加を4つのフェーズに分けて実装する計画をまとめたものです。

### フェーズ一覧

1. **Phase 1: 通知システム改善**（優先度: 高）
   - トースト通知を右下に移動
   - 通知表示戦略の導入（immediate/deferred/persistent）

2. **Phase 2: ナビゲーション再編 + OCR統合**（優先度: 高）
   - グローバルナビを3層構造に再編
   - OCR機能の統合（自動/手動インポート）

3. **Phase 3: システム管理メニュー分割**（優先度: 中）
   - システム設定の分割
   - 管理機能の独立化

4. **Phase 4: 排他制御機能の調査と実装**（優先度: 中）
   - 同時編集の排他制御実装

---

# Phase 1: 通知システム改善 実装計画

## 概要

トースト通知が画面中央に表示されて邪魔な問題を解決し、通知センターを履歴蓄積型に改善します。

**目標:**
- トースト通知を右下に移動（控えめな表示）
- 通知センターに履歴を蓄積（見逃し防止）
- 通知の重要度に応じて表示方法を使い分け（immediate/deferred/persistent）

---

## 現状分析

### 実装済み機能
- **フロントエンド:** Sonner でトースト表示、TanStack Query で 30秒ポーリング
- **バックエンド:** PostgreSQL に通知テーブル、完全な CRUD API 実装済み
- **通知センター:** ベルアイコンのドロップダウンで最大50件表示
- **既読管理:** 個別既読化、一括既読化 API あり

### 問題点
- トースト位置が `top-right`（画面上部右）で作業の邪魔
- トースト表示タイミングが単純（すべての新規通知で表示）
- 通知の重要度による使い分けがない

### 通知生成箇所（現状）
- **SmartRead 処理完了時**（成功/失敗）のみ
- 将来的に他のビジネスロジックでも通知を生成予定

---

## 実装方針

### 1. 通知表示戦略の導入

**重要:** `display_strategy` は「トースト表示の制御」を意味します。**通知センターには全通知が常に履歴として残ります。**

通知を3つのカテゴリに分類し、トースト表示を最適化します:

| カテゴリ | 説明 | トースト表示 | 通知センター | 例 |
|---------|------|------------|------------|---|
| **immediate** | 即座の確認が必要 | ✅ 表示（3-5秒） | ✅ 常に保存 | エラー、警告 |
| **deferred** | 後で確認でも良い | ❌ 表示しない | ✅ 常に保存 | バッチ処理完了、RPA完了 |
| **persistent** | 重要かつ後で確認必要 | ✅ 表示（8秒・長め） | ✅ 常に保存 | 発注承認待ち、期限アラート |

**設計方針:**
- 通知センター = 全通知の履歴（見逃し防止）
- トースト = 即座に気づかせる必要がある通知のみ
- `display_strategy` はトースト出し分けの戦略

### 2. データベーススキーマ拡張

```python
# backend/app/infrastructure/persistence/models/notification_model.py

class Notification(Base):
    # ... 既存フィールド

    # 新規追加
    display_strategy = Column(
        String(20),
        nullable=False,
        default="immediate",
        comment="Toast display strategy: immediate=toast+center, deferred=center only, persistent=toast(long)+center"
    )
```

---

## 詳細実装手順

### ステップ1: バックエンド拡張

#### 1.1 Alembic マイグレーション作成

```bash
make backend-shell
alembic revision --autogenerate -m "add_display_strategy_to_notifications"
```

**マイグレーション内容:**
```python
def upgrade():
    op.add_column(
        'notifications',
        sa.Column(
            'display_strategy',
            sa.String(20),
            nullable=False,
            server_default='immediate',
            comment='Toast display strategy: immediate=toast+center, deferred=center only, persistent=toast(long)+center'
        )
    )

    # バリデーション追加（推奨）
    op.create_check_constraint(
        'check_display_strategy',
        'notifications',
        "display_strategy IN ('immediate', 'deferred', 'persistent')"
    )

def downgrade():
    op.drop_constraint('check_display_strategy', 'notifications', type_='check')
    op.drop_column('notifications', 'display_strategy')
```

**運用方針:**
- **`server_default='immediate'`** は既存行の互換性のため、マイグレーション時のみ使用
- 将来的にデフォルト値を削除する場合は、次のマイグレーションで `server_default` を削除
- アプリケーション側で必ず値を指定するため、DB側デフォルトは不要（移行後に削除推奨）
- **CHECK 制約** で無効な値を DB レベルでブロック（Pydantic に加えて二重防御）

#### 1.2 モデル・スキーマ・サービスの更新

**ファイル:**
- `backend/app/infrastructure/persistence/models/notification_model.py` - モデル拡張
- `backend/app/presentation/schemas/notification_schema.py` - スキーマ拡張
- `backend/app/application/services/smartread/simple_sync_service.py` - display_strategy 追加

---

### ステップ2: フロントエンド改善

#### 2.1 トースト位置変更

**ファイル:** `frontend/src/App.tsx`

```typescript
<Toaster
  position="bottom-right"  // 変更: top-right → bottom-right
  richColors
  closeButton
/>
```

#### 2.2 通知表示ロジック改善

**ファイル:** `frontend/src/features/notifications/hooks/useNotifications.ts`

**重要な改善点:**
1. **複数件の新着通知に対応** - 30秒ポーリング中に2件以上増えた場合も漏れなくトースト表示
2. **ブラウザ通知の条件付き発火** - タブ非アクティブ時 かつ persistent のみ（通知爆撃防止）
3. **トースト表示上限** - 一度に最大3件までトースト表示（それ以上は「他N件の通知」とまとめ）

```typescript
// frontend/src/features/notifications/hooks/useNotifications.ts

useEffect(() => {
  if (notifications.length === 0) return;

  // 初回読み込み時はIDを記録するだけ
  if (lastProcessedIdRef.current === null) {
    lastProcessedIdRef.current = notifications[0].id;
    return;
  }

  // 新着通知を全て取得（ID降順なので、lastProcessedId より大きいものを抽出）
  const newNotifications = notifications.filter(
    (n) => n.id > lastProcessedIdRef.current!
  );

  if (newNotifications.length === 0) return;

  // IDを更新（最新の通知ID）
  lastProcessedIdRef.current = notifications[0].id;

  // 古い順にソート（時系列順に表示）
  const sortedNew = [...newNotifications].reverse();

  // トースト表示対象をフィルタ
  const toastTargets = sortedNew.filter(
    (n) => n.display_strategy === "immediate" || n.display_strategy === "persistent"
  );

  // トースト表示（最大3件）
  const MAX_TOAST = 3;
  toastTargets.slice(0, MAX_TOAST).forEach((notification) => {
    toast(notification.title, {
      description: notification.message,
      action: notification.link ? {
        label: "開く",
        onClick: () => (window.location.href = notification.link!),
      } : undefined,
      duration: notification.display_strategy === "persistent" ? 8000 : 5000,
    });
  });

  // 残りがある場合は「他N件」をまとめ表示
  if (toastTargets.length > MAX_TOAST) {
    toast("新しい通知", {
      description: `他 ${toastTargets.length - MAX_TOAST} 件の通知があります`,
      action: {
        label: "確認",
        onClick: () => {
          // 通知センターを開く（実装は別途）
        },
      },
      duration: 5000,
    });
  }

  // ブラウザ通知（条件: persistent かつ タブ非アクティブ時のみ）
  const persistentNotifications = sortedNew.filter(
    (n) => n.display_strategy === "persistent"
  );

  if (
    persistentNotifications.length > 0 &&
    document.visibilityState !== "visible" &&
    window.Notification?.permission === "granted"
  ) {
    // 最新1件のみブラウザ通知
    const latest = persistentNotifications[0];
    new window.Notification(latest.title, {
      body: latest.message,
    });
  }
}, [notifications]);
```

**ブラウザ通知の権限要求:**
- システム設定ページに「ブラウザ通知を有効化」ボタンを追加
- 初回アクセス時は自動的に権限要求しない（UX配慮）

---

## テスト計画

### バックエンドテスト

**ファイル:** `backend/tests/api/test_notifications.py`

```python
def test_create_notification_with_display_strategy(client: TestClient, test_user):
    """display_strategy を指定して通知を作成できる"""
    response = client.post(
        "/api/notifications",
        json={
            "user_id": test_user["id"],
            "title": "Test Notification",
            "message": "Test message",
            "type": "info",
            "display_strategy": "deferred",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["display_strategy"] == "deferred"


def test_notification_default_display_strategy(client: TestClient, test_user):
    """display_strategy を省略した場合、immediate がデフォルト"""
    response = client.post(
        "/api/notifications",
        json={
            "user_id": test_user["id"],
            "title": "Test Notification",
            "message": "Test message",
            "type": "info",
            # display_strategy 省略
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["display_strategy"] == "immediate"


def test_invalid_display_strategy_rejected(client: TestClient, test_user):
    """無効な display_strategy は 422 エラー"""
    response = client.post(
        "/api/notifications",
        json={
            "user_id": test_user["id"],
            "title": "Test Notification",
            "message": "Test message",
            "type": "info",
            "display_strategy": "invalid_value",  # 無効値
        },
    )
    assert response.status_code == 422  # Pydantic validation error


def test_get_notifications_includes_display_strategy(client: TestClient, test_user):
    """一覧取得時に display_strategy が含まれる"""
    # 通知を作成
    client.post(
        "/api/notifications",
        json={
            "user_id": test_user["id"],
            "title": "Test",
            "message": "Test",
            "display_strategy": "persistent",
        },
    )

    # 一覧取得
    response = client.get("/api/notifications")
    assert response.status_code == 200
    notifications = response.json()
    assert len(notifications) > 0
    assert "display_strategy" in notifications[0]
    assert notifications[0]["display_strategy"] in ["immediate", "deferred", "persistent"]
```

### フロントエンドテスト（E2E推奨）

**手動テスト手順:**

1. **immediate（エラー通知）:**
   - SmartRead でエラーを発生させる
   - トースト通知が右下に3-5秒表示される
   - 通知センターにも履歴が残る

2. **deferred（成功通知）:**
   - SmartRead で正常にファイルを処理
   - トースト通知が **表示されない**
   - 通知センターのベルアイコンに未読バッジが表示される
   - ベルをクリックして通知を確認

3. **persistent（重要通知）:**
   - 発注承認待ち通知などを生成（管理画面から手動作成）
   - トースト通知が右下に8秒間表示される（通常より長い）
   - 通知センターにも履歴が残る
   - タブを非アクティブにした状態で通知を生成
   - ブラウザ通知（OS通知）が表示される

4. **複数件同時発生:**
   - API経由で5件の immediate 通知を連続作成
   - 最大3件のトーストが表示される
   - 「他 2件の通知があります」のまとめトーストが表示される
   - 通知センターには全5件が履歴として残る

---

## 影響範囲

### 変更ファイル一覧

**バックエンド:**
- `backend/app/infrastructure/persistence/models/notification_model.py`
- `backend/app/presentation/schemas/notification_schema.py`
- `backend/app/application/services/smartread/simple_sync_service.py`
- `backend/alembic/versions/xxxxx_add_display_strategy_to_notifications.py`
- `backend/tests/api/test_notifications.py`

**フロントエンド:**
- `frontend/src/features/notifications/types.ts`
- `frontend/src/features/notifications/hooks/useNotifications.ts`
- `frontend/src/App.tsx`

**破壊的変更:** なし（既存の通知は `display_strategy="immediate"` でデフォルト動作）

---

## 完了条件

- [ ] トースト通知が画面右下に表示される
- [ ] `display_strategy="deferred"` の通知はトースト表示されない
- [ ] `display_strategy="immediate"` の通知はトースト表示される
- [ ] 通知センターに全通知が履歴として残る
- [ ] 既存の通知機能が正常動作する（破壊的変更なし）
- [ ] すべてのテストがパスする
- [ ] 品質チェック（Lint, Format, Typecheck）がパスする

---

# Phase 2: ナビゲーション再編 + OCR統合 実装計画

## 概要

グローバルナビゲーションを論理的に整理し、OCR機能を統合して使いやすくします。

**目標:**
- グローバルナビを3層構造（業務/自動化/管理）に再編
- 受注管理メニューをOCR結果と統合
- 発注管理を「入荷予定」に名称変更
- RPA機能をトップレベルに移動
- OCR取込機能を統合（自動インポート + 手動選択）

---

## 実装方針

### 新しいメニュー構成（3層構造）

```
┌─────────────────────────────────────────┐
│ 業務メニュー                             │
├─────────────────────────────────────────┤
│ 🏠 ダッシュボード                        │
│ 📦 在庫管理                              │
│ 📋 受注管理（旧OCR結果統合）             │
│ 🚚 出荷管理                              │
│ 📥 入荷予定（旧発注管理）                │
│ 📊 マスタ                                │
│ 📅 カレンダー                            │
├─────────────────────────────────────────┤
│ 業務自動化                               │
├─────────────────────────────────────────┤
│ 🤖 RPA                                   │
│ 🔗 SAP連携                               │
└─────────────────────────────────────────┘

非表示（将来統合予定）:
- 旧「受注管理」(/orders) → 機能的に OCR結果に統合予定
```

---

## 詳細実装手順

### ステップ1: 受注管理メニューの名称変更

**目標:**
- 現在の「OCR結果」メニューを「受注管理」に名称変更
- 旧「受注管理」を非表示化（feature flag で制御）

**変更ファイル:**
- `frontend/src/config/feature-config.ts`
- `frontend/src/components/layouts/GlobalNavigation.tsx`
- `frontend/src/features/auth/permissions/config.ts`

### ステップ2: 発注管理を「入荷予定」に名称変更

**変更ファイル:**
- `frontend/src/config/feature-config.ts`
- `frontend/src/components/layouts/GlobalNavigation.tsx`
- `frontend/src/features/inbound-plans/pages/InboundPlansListPage.tsx`

### ステップ3: RPA機能のナビゲーション整理

**変更内容:**
- 「業務自動化」セクションを追加
- RPA メニューをトップレベルに移動
- アイコンを Settings → Bot に変更

### ステップ4: OCR取込機能の統合

#### 4.1 OCR取込ページの作成

**新規ファイル:** `frontend/src/features/ocr-results/pages/OcrImportPage.tsx`

**機能:**
- 手動取込: ファイル選択 → OCR実行 → 結果表示
- 自動取込設定: 監視間隔、監視ディレクトリ設定

#### 4.2 バックエンド: 自動取込スケジューラー

**新規ファイル:** `backend/app/infrastructure/scheduler/smartread_scheduler.py`

**機能:**
- APScheduler を使用して1分おきにディレクトリを監視
- 新しいPDFファイルを自動的に取り込み
- 処理成功/失敗でファイルを移動（processed/failed ディレクトリ）

**⚠️ 運用上の重要な注意事項:**

BackgroundScheduler を API プロセスに載せる方式は、環境次第で事故が起きやすい設計です。実装前に以下の観点を必ず検討してください:

1. **複数プロセス/Worker 問題:**
   - `uvicorn --workers 4` や `gunicorn` で複数 worker を起動した場合、各プロセスでスケジューラーが起動し、**同じPDFを複数回処理**する
   - 対策: スケジューラーは別プロセス（Celery Beat, cron 等）に分離するか、単一 worker 運用を保証
   - または、ファイル名ベースの**分散ロック**（Redis, DB ロックテーブル）を実装

2. **ファイル処理の冪等性・排他制御:**
   - 処理中のファイルを別プロセスが掴む可能性
   - 対策:
     - ファイルを `processing/` に移動してからOCR処理
     - 拡張子を一時変更（`.pdf` → `.pdf.processing`）
     - ファイルロック（`fcntl.flock`）
   - `rename()` の失敗を想定したエラーハンドリング

3. **watch_directory のセキュリティ:**
   - UI から自由入力させると、任意のディレクトリをスキャンされるリスク
   - 対策:
     - ホワイトリスト方式（設定ファイルで許可ディレクトリを定義）
     - パス正規化（`os.path.abspath`, `Path.resolve`）
     - 権限チェック（Admin ロールのみ設定可能）

4. **処理失敗時のリトライ:**
   - 一時的なエラー（ネットワーク障害等）で `failed/` に移動すると、手動復旧が必要
   - 対策: リトライカウンタ付きの `retry/` ディレクトリを追加（最大3回まで再処理等）

5. **ログとアラート:**
   - 処理失敗が連続した場合の管理者通知（メール、Slack 等）
   - ディスク容量監視（`processed/` が肥大化しないよう定期削除 or アーカイブ）

**推奨アーキテクチャ（将来）:**
- スケジューラーを Celery Beat に移行（非同期タスクキューとして Celery を導入）
- または、cron ジョブで専用スクリプトを実行（単純で堅い）
- API プロセスとスケジューラーを分離することで、スケーラビリティと信頼性を向上

---

## 影響範囲

### 変更ファイル一覧

**フロントエンド:**
- `frontend/src/config/feature-config.ts`
- `frontend/src/components/layouts/GlobalNavigation.tsx`
- `frontend/src/features/auth/permissions/config.ts`
- `frontend/src/constants/routes.ts`
- `frontend/src/MainRoutes.tsx`
- `frontend/src/features/ocr-results/pages/OcrImportPage.tsx` - 新規
- `frontend/src/features/ocr-results/components/ManualImportSection.tsx` - 新規
- `frontend/src/features/ocr-results/components/AutoImportSettingsSection.tsx` - 新規

**バックエンド:**
- `backend/app/infrastructure/scheduler/smartread_scheduler.py` - 新規
- `backend/app/presentation/api/routes/rpa/smartread_auto_import_router.py` - 新規
- `backend/app/infrastructure/persistence/repositories/settings_repository.py`
- `backend/main.py` - スケジューラー起動コード追加

**依存関係:**
- `backend/requirements.txt` に `APScheduler` 追加

---

## 完了条件

- [ ] グローバルナビゲーションが3層構造で表示される
- [ ] 「受注管理」メニューが `/ocr-results` にリンクされている
- [ ] 「入荷予定」メニューが表示されている
- [ ] 旧「受注管理」が非表示になっている（feature flag で制御可能）
- [ ] RPA メニューが「業務自動化」セクションに表示される
- [ ] OCR取込ページが `/ocr-results/import` で表示される
- [ ] 手動取込機能が正常動作する
- [ ] 自動取込設定が保存・読み込みできる
- [ ] 自動取込スケジューラーが1分おきに動作する
- [ ] すべてのテストがパスする
- [ ] 品質チェック（Lint, Format, Typecheck）がパスする

---

# Phase 3: システム管理メニュー分割 実装計画

## 概要

システム設定に詰め込みすぎた機能を分割し、管理しやすくします。

**目標:**
- システム設定を3つのセクションに分割
- ユーザー管理を独立メニュー化
- ログビューアを独立メニュー化
- 通知設定を独立メニュー化（将来拡張用）

---

## 実装方針

### 新しい管理メニュー構成

```
┌─────────────────────────────────────────┐
│ システム管理（Adminのみ）                │
├─────────────────────────────────────────┤
│ ⚙️  システム設定                         │
│    ├─ セキュリティ・アクセス制御         │
│    ├─ 機能表示設定                       │
│    └─ 基本設定                           │
│                                          │
│ 👥 ユーザー管理（独立）                  │
│    ├─ ユーザー一覧                       │
│    ├─ ロール管理                         │
│    └─ 招待・登録                         │
│                                          │
│ 📜 ログビューア（独立）                  │
│                                          │
│ 🔔 通知設定（新規・独立）                │
│    ├─ 通知ルール                         │
│    ├─ メール通知設定                     │
│    └─ Slack連携（将来）                  │
└─────────────────────────────────────────┘
```

---

## 詳細実装手順

### ステップ1: GlobalNavigation の「管理」セクション追加

**変更ファイル:** `frontend/src/components/layouts/GlobalNavigation.tsx`

**追加内容:**
- 「システム管理」セクション区切り
- システム設定メニュー（タブ構造）
- ユーザー管理メニュー
- ログビューアメニュー
- 通知設定メニュー

### ステップ2: システム設定ページの分割

**変更ファイル:** `frontend/src/features/admin/pages/SystemSettingsPage.tsx`

**タブ構造:**
- セキュリティ・アクセス制御
- 機能表示設定
- 基本設定

### ステップ3: ユーザー管理ページの独立化

**新規ファイル:** `frontend/src/features/admin/pages/UsersManagementPage.tsx`

**タブ構造:**
- ユーザー一覧
- ロール管理
- 招待・登録

### ステップ4: 通知設定ページの作成

**新規ファイル:** `frontend/src/features/admin/pages/NotificationSettingsPage.tsx`

**タブ構造:**
- 通知ルール
- メール通知設定
- Slack連携（準備中）

---

## 影響範囲

### 変更ファイル一覧

**フロントエンド:**
- `frontend/src/components/layouts/GlobalNavigation.tsx`
- `frontend/src/constants/routes.ts`
- `frontend/src/MainRoutes.tsx`
- `frontend/src/features/auth/permissions/config.ts`
- `frontend/src/features/admin/pages/SystemSettingsPage.tsx`
- `frontend/src/features/admin/pages/UsersManagementPage.tsx` - 新規
- `frontend/src/features/admin/pages/NotificationSettingsPage.tsx` - 新規
- `frontend/src/features/admin/components/NotificationRulesSection.tsx` - 新規

**バックエンド:**
- 影響なし（フロントエンドのみの変更）

---

## 完了条件

- [ ] グローバルナビゲーションに「システム管理」セクションが表示される
- [ ] システム設定ページがタブ構造で表示される
- [ ] ユーザー管理ページが独立している
- [ ] ログビューアページが独立している
- [ ] 通知設定ページが表示される
- [ ] Admin ロール以外はシステム管理セクションが表示されない
- [ ] すべてのテストがパスする
- [ ] 品質チェック（Lint, Format, Typecheck）がパスする

---

# Phase 4: 排他制御機能の調査と実装計画

## 概要

OCR結果など複数ユーザーが同時に編集する可能性があるデータに対して、行単位の排他制御を実装します。

**目標:**
- 現在誰が編集中かをリアルタイムで表示
- 行単位でのロック機能（楽観的ロックまたは悲観的ロック）
- 編集競合の検出と通知
- ロックの自動解放（タイムアウト）

---

## 調査項目

### 1. 現状の排他制御実装

**調査対象:**
- OCR結果編集機能の実装状況
- 現在のデータ更新フロー
- 楽観的ロック（`version` カラム）の有無
- 悲観的ロック（`SELECT FOR UPDATE`）の使用状況

### 2. 同時編集の可能性があるテーブル

**調査対象:**
- `ocr_results` テーブル
- `orders` テーブル
- `lots` テーブル
- その他、複数ユーザーが編集する可能性があるテーブル

### 3. 既存の排他制御パターン

**調査対象:**
- `backend/app/infrastructure/persistence/repositories/` 配下のリポジトリ
- `acquire_lock()` メソッドの使用状況
- トランザクション管理のパターン

---

## 実装方針（調査後に決定）

### オプション1: 楽観的ロック（推奨）

**メリット:**
- パフォーマンスが良い
- デッドロックが発生しない
- 実装がシンプル

**デメリット:**
- 競合時にユーザーに再試行を促す必要がある

**実装:**
- `version` カラムをテーブルに追加
- 更新時に `version` をチェック
- 競合時に HTTP 409 Conflict を返す

### オプション2: 悲観的ロック（複雑だが確実）

**メリット:**
- 競合が確実に防げる
- ロック中のユーザーを明示可能

**デメリット:**
- デッドロックの可能性
- パフォーマンスへの影響

**実装:**
- `SELECT FOR UPDATE NOWAIT` でロック取得
- ロックテーブル（`edit_locks`）でロック情報を管理
- タイムアウト後にロックを自動解放

### オプション3: ハイブリッド（リアルタイム表示 + 楽観的ロック）

**実装:**
- WebSocketで編集中ユーザーをリアルタイム表示
- 実際の保存時は楽観的ロックで競合検出

---

## 調査フェーズの成果物

### 1. 調査レポート

**内容:**
- 現状の排他制御実装の分析
- 同時編集の発生頻度の推定
- 推奨実装方式の提案
- 実装工数の見積もり

### 2. 実装設計書

**内容:**
- データベーススキーマ変更
- API設計（ロック取得・解放）
- フロントエンド実装（編集中表示）
- エラーハンドリング

---

## Phase 4 完了条件

- [ ] 現状の排他制御実装を調査完了
- [ ] 同時編集の可能性があるテーブルを特定
- [ ] 推奨実装方式を決定
- [ ] 実装設計書を作成
- [ ] （実装フェーズ）楽観的ロックまたは悲観的ロックを実装
- [ ] （実装フェーズ）編集中ユーザー表示機能を実装
- [ ] （実装フェーズ）テストとドキュメント作成

---

# 全体の実装順序

## 推奨実装順序

1. **Phase 1** を完了（通知システム改善）
2. **Phase 2** を完了（ナビゲーション再編 + OCR統合）
3. **Phase 3** を完了（システム管理メニュー分割）
4. **Phase 4** を完了（排他制御機能の調査と実装）

各フェーズ完了後、品質チェックとテストを実施してから次のフェーズに進むことを推奨します。

---

## 品質チェックコマンド

```bash
# 全体の品質チェック
make quality-check

# バックエンド
make backend-lint-fix
make backend-format
make backend-test

# フロントエンド
make frontend-lint-fix
make frontend-format
make frontend-typecheck

# CI相当のチェック（自動修正なし）
make ci
```

---

## 関連ドキュメント

- **CLAUDE.md** - プロジェクト開発ガイドライン
- **CHANGELOG.md** - 変更履歴
- **docs/project/BACKLOG.md** - タスクバックログ
