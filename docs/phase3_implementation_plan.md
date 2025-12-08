# ステップ3: クリーンアーキテクチャ ディレクトリ再配置

## 1. 現状分析

### 現在の構造
```
backend/app/
├── api/              # 48ファイル（routes）
├── core/             # 7ファイル（config, logging, errors）
├── domain/           # 5サブディレクトリ
│   ├── allocation/   # FEFO計算ロジック
│   ├── events/       # ★新規追加
│   ├── lot/          # ロットポリシー
│   ├── order/        # 受注ポリシー
│   └── errors.py
├── models/           # 16ファイル（SQLAlchemy）
├── repositories/     # 6ファイル
├── schemas/          # 41ファイル（Pydantic）
└── services/         # 65ファイル（18サブディレクトリ）
    ├── allocations/  # 8ファイル
    ├── inventory/    # 7ファイル
    ├── orders/       # 3ファイル
    └── ...
```

### 問題点
1. **services/** にビジネスロジックとDB操作が混在
2. **リポジトリパターン**が一部のみ適用
3. **ドメイン層**がSQLAlchemyモデルに依存

---

## 2. 目標構造

```
backend/app/
├── presentation/           # プレゼンテーション層
│   ├── api/                # FastAPI routes（現api/から移動）
│   └── schemas/            # リクエスト/レスポンス（現schemas/から移動）
│
├── application/            # アプリケーション層
│   ├── use_cases/          # ユースケース（ワークフロー）
│   └── services/           # アプリケーションサービス
│
├── domain/                 # ドメイン層（純粋なビジネスロジック）
│   ├── entities/           # ドメインエンティティ（ORMから独立）
│   ├── value_objects/      # 値オブジェクト
│   ├── services/           # ドメインサービス
│   ├── events/             # ドメインイベント ★完成
│   └── repositories/       # リポジトリインターフェース
│
└── infrastructure/         # インフラストラクチャ層
    ├── persistence/        # SQLAlchemy実装
    │   ├── models/         # ORMモデル
    │   └── repositories/   # リポジトリ実装
    └── external/           # 外部API（SAP等）
```

---

## 3. 段階的移行プラン

### フェーズ3-A: 準備（0.5日）
- [ ] 新ディレクトリ構造を作成
- [ ] `__init__.py` を配置
- [ ] インポートパスのエイリアスを設定

### フェーズ3-B: allocation ドメインの移行（1日）
**最初のパイロット: 引当ドメイン**

| 現在 | 移行先 |
|------|--------|
| `domain/allocation/` | `domain/services/allocation/` |
| `services/allocations/` | `application/services/allocation/` |
| `repositories/allocation_repository.py` | `infrastructure/persistence/repositories/` |

タスク:
- [ ] `domain/repositories/allocation.py` にインターフェース定義
- [ ] 現 `repositories/allocation_repository.py` を実装として移動
- [ ] サービスの依存注入を調整
- [ ] テスト実行

### フェーズ3-C: inventory ドメインの移行（1日）
| 現在 | 移行先 |
|------|--------|
| `domain/lot/` | `domain/services/lot/` |
| `services/inventory/` | `application/services/inventory/` |

### フェーズ3-D: 残りのドメイン移行（1〜2日）
- orders, forecasts, masters
- 各ドメインで同じパターンを適用

### フェーズ3-E: プレゼンテーション層の整理（0.5日）
- [ ] `api/` → `presentation/api/`
- [ ] `schemas/` → `presentation/schemas/`

---

## 4. リスク対策

| リスク | 対策 |
|--------|------|
| インポート破損 | エイリアスで後方互換性維持 |
| テスト失敗 | 各フェーズ後にテスト実行 |
| 大規模コンフリクト | 別ブランチで作業、段階的マージ |

---

## 5. 推奨アプローチ

> **Option A（推奨）**: 新規コードのみ新構造で書く
> 既存コードはそのまま維持し、新機能を追加する際に新構造を適用

> **Option B**: 完全移行
> 全ファイルを新構造に移動（破壊的変更、3〜5日必要）

**判断ポイント**: チームの状況と優先度に応じて選択
