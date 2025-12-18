# Code Quality Ignore Comments - Accepted as of 2025-12-07

このファイルは、プロジェクト内のコード品質無視コメント（`# type: ignore`, `# noqa`, `eslint-disable`）の使用理由と許容判断を記録します。

---

## Backend: Mypy `# type: ignore` (40件) - 全て許容

### エラータイプ別内訳

| エラータイプ | 件数 | 状態 | 許容理由 |
|-------------|------|------|---------|
| `[attr-defined]` | 14 | ✅ 許容 | SQLAlchemy動的属性アクセス（ORM設計上不可避） |
| `[arg-type]` | 6 | ✅ 許容 | FastAPI exception handlerの型推論限界 |
| `[override]` | 6 | ✅ 許容 | BaseCRUD汎用設計（リファクタは大規模変更） |
| `[assignment]` | 5 | ✅ 許容 | SQLAlchemy select型推論の限界 |
| その他 | 9 | ✅ 許容 | union-attr, misc等 |

**判断**: これ以上の削減は投資対効果が低い。残り40件は正当な理由があり、許容範囲内。

---

## Backend: Ruff `# noqa` (53件) - 全て許容

| コード | 説明 | 件数 | 許容理由 |
|-------|------|------|---------|
| **F403** | `import *` in `__init__.py` | 36 | パッケージ公開API（Pythonの慣習） |
| **E402** | Import not at top | 8 | scripts/testsでのsys.path設定後import（必須） |
| **F401** | Unused import | 5 | 側面効果import、alembic（必須） |
| **E712** | `== True` | 1 | PostgreSQLインデックス定義（DB要件） |
| **UP046** | Genericクラス | 1 | BaseService設計（Python 3.9互換性） |
| その他 | - | 2 | 特殊なケース |

**判断**: 全て正当な理由があり、削減不要。

---

## Frontend: ESLint `eslint-disable` (22件) - 全て許容

| ルール | 件数 | 許容理由 |
|-------|------|---------|
| `max-lines-per-function` | 18 | 分割すると可読性低下（テーブル定義、複合フック等） |
| `complexity` | 3 | サブコンポーネント分離済み、これ以上は過剰 |
| `@typescript-eslint/no-explicit-any` | 1 | external-modules.d.tsの型定義ファイル（必須） |

**代表例**:
- `useOrderLineAllocation.ts`: 引当関連の状態と処理を一箇所にまとめた複合フック（分割すると状態管理が複雑化）
- `OrderInfoColumns.tsx`: テーブル列定義（分割すると列の並びが分かりにくい）
- `BatchJobsPage.tsx`: ページコンポーネント（SAP sync + batch jobs listの複数セクション）

**判断**: 全て正当な理由があり、コメント付きで許容。

---

## Frontend: TypeScript (0件) - Clean

`@ts-ignore`や`@ts-expect-error`は一切使用されていません。完璧な状態です。

---

## 総合評価

| 種類 | 当初 | 現在 | 削減 | 状態 |
|------|------|------|------|------|
| **Mypy** | 83 | 40 | 43件 (52%) | ✅ 許容範囲内 |
| **Ruff** | 53 | 53 | - | ✅ 全て許容可 |
| **ESLint** | 22 | 22 | - | ✅ 全て許容可 |
| **TypeScript** | 0 | 0 | - | ✅ Clean |
| **合計** | **163** | **115** | **48件 (30%)** | ✅ 達成 |

**最終判断** (2025-12-07):
- 残り115件の無視コメントは全て正当な理由があり、許容範囲内
- これ以上の削減は投資対効果が低く、コードの可読性を損なう可能性がある
- 本ファイルをもって、コード品質無視コメントの調査・削減作業を**完了**とする
