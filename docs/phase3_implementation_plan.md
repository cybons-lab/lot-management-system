# ステップ3: クリーンアーキテクチャ 全面刷新計画

> **アプローチ**: 全面刷新（後方互換性なし）
> **理由**: 開発中のため、エイリアスを残すより一気に移行した方がクリーン

---

## 1. 目標構造

```
backend/app/
├── presentation/           # プレゼンテーション層
│   ├── api/                # FastAPI routes
│   └── schemas/            # リクエスト/レスポンス
│
├── application/            # アプリケーション層
│   └── services/           # アプリケーションサービス
│
├── domain/                 # ドメイン層
│   ├── entities/           # ドメインエンティティ
│   ├── services/           # ドメインサービス
│   ├── events/             # ドメインイベント ✅完成
│   └── repositories/       # リポジトリインターフェース
│
├── infrastructure/         # インフラストラクチャ層
│   ├── persistence/        # SQLAlchemy
│   │   ├── models/         # ORMモデル
│   │   └── repositories/   # リポジトリ実装
│   └── external/           # 外部API
│
└── core/                   # 共通（config, logging, errors）
```

---

## 2. 移行マッピング

| 現在 | 移行先 |
|------|--------|
| `api/` | `presentation/api/` |
| `schemas/` | `presentation/schemas/` |
| `services/` | `application/services/` |
| `domain/` | `domain/` (そのまま) |
| `models/` | `infrastructure/persistence/models/` |
| `repositories/` | `infrastructure/persistence/repositories/` |
| `external/` | `infrastructure/external/` |
| `core/` | `core/` (そのまま) |

---

## 3. 実行ステップ

### Step 1: ディレクトリ作成（5分）
```bash
mkdir -p backend/app/{presentation,application,infrastructure/persistence}
```

### Step 2: ファイル移動（10分）
```bash
# プレゼンテーション層
mv backend/app/api backend/app/presentation/
mv backend/app/schemas backend/app/presentation/

# アプリケーション層
mv backend/app/services backend/app/application/

# インフラ層
mkdir -p backend/app/infrastructure/persistence
mv backend/app/models backend/app/infrastructure/persistence/
mv backend/app/repositories backend/app/infrastructure/persistence/
mv backend/app/external backend/app/infrastructure/
```

### Step 3: インポート一括置換（30分）
```bash
# 主要な置換パターン
find backend -name "*.py" -exec sed -i '' \
  -e 's/from app\.api\./from app.presentation.api./g' \
  -e 's/from app\.schemas\./from app.presentation.schemas./g' \
  -e 's/from app\.services\./from app.application.services./g' \
  -e 's/from app\.models/from app.infrastructure.persistence.models/g' \
  -e 's/from app\.repositories\./from app.infrastructure.persistence.repositories./g' \
  -e 's/from app\.external\./from app.infrastructure.external./g' \
  {} \;
```

### Step 4: __init__.py 配置（5分）
各新ディレクトリに`__init__.py`を作成

### Step 5: main.py 修正（10分）
インポートパスを更新

### Step 6: テスト実行（20分）
```bash
cd backend && uv run pytest -x
```

---

## 4. リスク対策

| リスク | 対策 |
|--------|------|
| 大量のインポートエラー | IDE活用で修正 |
| テスト失敗 | 段階的に修正 |
| 時間超過 | 1日で完了しなければ翌日継続 |

---

## 5. 所要時間（推定）

| ステップ | 時間 |
|----------|------|
| ディレクトリ作成 | 5分 |
| ファイル移動 | 10分 |
| インポート置換 | 30分 |
| __init__.py | 5分 |
| main.py修正 | 10分 |
| テスト・修正 | 60分 |
| **合計** | **約2時間** |
