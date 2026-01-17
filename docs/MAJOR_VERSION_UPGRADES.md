# メジャーバージョンアップが必要なパッケージ

このドキュメントは、将来的に対応が必要なメジャーバージョンアップをまとめています。

**最終更新日:** 2026-01-17

---

## Frontend (npm)

### 1. @types/node: 24.x → 25.x

- **現在のバージョン:** 24.10.9
- **最新バージョン:** 25.0.9
- **影響範囲:** Node.js型定義
- **優先度:** 低
- **備考:** Node.js 22 → 23の型定義変更。互換性を確認してアップデート。

### 2. zod: 3.x → 4.x

- **現在のバージョン:** 3.25.76
- **最新バージョン:** 4.3.5
- **影響範囲:** バリデーション全般、フォーム、API型定義
- **優先度:** 高
- **備考:**
  - Zodはプロジェクト全体で広く使用されている
  - Breaking changesを確認してから移行
  - react-hook-formとzod-to-json-schemaの互換性も確認が必要
  - 関連パッケージ: `@hookform/resolvers`, `zod-to-json-schema`

### 3. lucide-react: 0.552.x → 0.562.x

- **現在のバージョン:** 0.552.0
- **最新バージョン:** 0.562.0
- **影響範囲:** アイコンコンポーネント
- **優先度:** 低
- **備考:** マイナーバージョンの変更だが、0.xなので実質的にメジャー変更の可能性あり

---

## Backend (Python)

### 1. bcrypt: 4.x → 5.x

- **現在のバージョン:** 4.0.1 (pinned)
- **最新バージョン:** 5.0.0
- **影響範囲:** パスワードハッシュ化
- **優先度:** 中
- **備考:**
  - `bcrypt==4.0.1`でピン留めされている（理由要確認）
  - `passlib[bcrypt]`との互換性を確認
  - 既存のハッシュ化されたパスワードとの互換性を確認

### 2. websockets: 15.x → 16.x

- **現在のバージョン:** 15.0.1
- **最新バージョン:** 16.0
- **影響範囲:** WebSocket通信（現在未使用の可能性あり）
- **優先度:** 低
- **備考:**
  - uvicornの依存パッケージ
  - 直接使用していない場合は影響なし

### 3. pathspec: 0.12.x → 1.x (既にアップデート済み)

- **現在のバージョン:** 1.0.3 ✅
- **旧バージョン:** 0.12.1
- **影響範囲:** ファイルパスマッチング（Ruffの依存パッケージ）
- **優先度:** N/A
- **備考:**
  - 自動的にアップデートされた
  - Ruffの依存パッケージなので直接使用していない
  - 問題が発生した場合は0.12.xにロールバック検討

---

## アップデート手順（参考）

### Frontend

```bash
# Docker環境で実行
docker compose exec frontend npm install <package>@<version>

# ローカルで実行
cd frontend
npm install <package>@<version>
npm run typecheck
npm run lint
npm test
```

### Backend

```bash
# Docker環境で実行
docker compose exec backend uv pip install <package>==<version>

# pyproject.tomlを編集後
docker compose exec backend uv pip install -e .
docker compose exec backend pytest
docker compose exec backend ruff check app/
```

---

## 優先度の定義

- **高:** プロジェクト全体に影響する、セキュリティ上重要
- **中:** 一部機能に影響する、パフォーマンス改善がある
- **低:** 影響範囲が限定的、新機能追加のみ

---

## 次のステップ

1. Zod 4.xへの移行計画を立てる（高優先度）
2. bcrypt 5.xへの移行検討（中優先度）
3. @types/node 25.xの互換性確認（低優先度）

---

## 関連リンク

- [Zod v4 Release Notes](https://github.com/colinhacks/zod/releases)
- [bcrypt Changelog](https://github.com/pyca/bcrypt/blob/main/CHANGELOG.rst)
- [Node.js Types](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node)
