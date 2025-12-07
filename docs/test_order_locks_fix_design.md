# test_order_locks.py セッション管理問題 - 設計ドキュメント

## 概要

`backend/tests/api/test_order_locks.py` の6件中5件のテストがセッション管理問題により失敗している。
このドキュメントは問題の根本原因と、解決のための設計案を記録する。

---

## 現状

### テスト状況

| テスト名 | 状態 | 問題 |
|---------|------|------|
| `test_acquire_lock_success` | ⚠️ 不安定（順序依存） | 他テストの後だと401 |
| `test_acquire_lock_renew` | ❌ xfail | 401 Unauthorized |
| `test_acquire_lock_conflict` | ❌ xfail | 401 Unauthorized |
| `test_acquire_lock_expired` | ❌ xfail | 401 Unauthorized |
| `test_release_lock_success` | ❌ xfail | 401 Unauthorized |
| `test_release_lock_forbidden` | ❌ xfail | 401 Unauthorized |

### 症状

APIリクエスト時に `401 Unauthorized` エラーが発生。
エラーメッセージ: "User not found or inactive"

---

## 根本原因分析

### 1. テスト構造

```
conftest.py
├── db fixture (function scope)
│   └── Transactional session for test
├── client fixture (function scope)
│   └── Overrides get_db → uses db session
├── normal_user fixture
│   └── Creates User, db.flush()
└── normal_user_token_headers fixture
    └── Creates JWT with user_id + username
```

### 2. 問題の流れ

1. **テスト開始**: `normal_user` fixtureがユーザーを作成し`db.flush()`（コミットではない）
2. **トークン作成**: `normal_user_token_headers`がJWTトークンを作成
3. **APIリクエスト**: `client`がトークン付きでAPIを呼び出し
4. **認証処理**: `auth_service.get_current_user()`がトークンからusernameを取得
5. **🔴 問題発生**: `user_service.get_by_username(username)`が**ユーザーを見つけられない**

### 3. なぜ見つけられないか

```
[Test Session] ─────────────────────────────────────────────
│
├── db.add(User)
├── db.flush()  ← ここでIDは付与されるがコミットされていない
│
└── API Request ──────────────────────────────────────────
    │
    ├── get_db() → オーバーライドで同じdbセッションを使用
    │              ★ 理論上は同じセッションなので見えるはず
    │
    └── user_service.get_by_username()
        │
        └── SELECT FROM users WHERE username = 'test_user_normal'
            ★ しかし、実際にはユーザーが見つからない
```

### 4. 推定される真の原因

1. **複数のセッションインスタンス**: `get_db()`オーバーライドが正しく適用されていない可能性
2. **トランザクション分離**: APIリクエスト処理中に新しいトランザクションが開始される可能性
3. **順序依存**: 最初のテストでは成功するが、2番目以降で失敗するパターン

### 5. 証拠

- `test_acquire_lock_success`は**単独実行では成功**
- しかし`test_auth.py`の後では**401で失敗**
- `auth_service.py`は新しいセッション接続を開始している可能性（ログに新しいBEGINが記録される）

---

## 解決案

### 案1: ユーザーをコミットする（推奨・最も簡単）

**概要**: テスト用ユーザーを実際にDBにコミットする

**変更箇所**:
```python
# conftest.py

@pytest.fixture
def normal_user(db):
    user = User(...)
    db.add(user)
    db.commit()  # ← flush() → commit() に変更
    return user
```

**メリット**:
- 最も簡単な修正
- APIリクエストで別セッションが開かれても見える

**デメリット**:
- テストデータが実際にDBにコミットされる
- テスト後のクリーンアップ（TRUNCATE or DELETE）が必要

**実装工数**: 30分

---

### 案2: session-scoped fixtureでユーザーを事前作成

**概要**: テストセッション開始時に一度だけユーザーを作成

**変更箇所**:
```python
# conftest.py

@pytest.fixture(scope="session")
def test_users(engine):
    """Session-scoped: テスト用ユーザーを作成しコミット"""
    with Session(engine) as session:
        normal = User(username="test_user_normal", ...)
        super_ = User(username="test_superuser", ...)
        session.add_all([normal, super_])
        session.commit()
        return {"normal": normal.id, "super": super_.id}

@pytest.fixture
def normal_user(db, test_users):
    """既存ユーザーを取得"""
    return db.query(User).get(test_users["normal"])
```

**メリット**:
- ユーザー作成は一度だけ
- 各テストは既存ユーザーを参照

**デメリット**:
- Fixture依存関係が複雑になる
- セッション終了時のクリーンアップが必要

**実装工数**: 1時間

---

### 案3: get_current_userをモックする（最も確実）

**概要**: AuthService.get_current_userを直接モックしてテスト用ユーザーを返す

**変更箇所**:
```python
# conftest.py

@pytest.fixture
def client_with_normal_user(db, normal_user):
    """認証付きテストクライアント"""
    from app.services.auth.auth_service import AuthService
    
    def override_get_current_user():
        return normal_user
    
    app.dependency_overrides[AuthService.get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = lambda: db
    
    with TestClient(app) as c:
        yield c
    
    app.dependency_overrides.clear()
```

**メリット**:
- セッション問題を完全に回避
- テストが安定する

**デメリット**:
- 実際の認証フローをテストしていない
- 各ユーザー種別ごとにfixtureが必要

**実装工数**: 1時間

---

### 案4: 統一されたget_dbを使用（根本修正）

**概要**: `app.api.deps.get_db`と`app.core.database.get_db`を統一

**変更箇所**:
1. `auth_router.py`の`get_db`インポートを`app.api.deps`から行う
2. または`app.core.database.get_db`を削除して`app.api.deps`に一本化

```python
# auth_router.py
from app.api.deps import get_db  # ← app.core.database ではなく
```

**メリット**:
- 根本的な問題を解決
- 他のテストにも良い影響

**デメリット**:
- 本番コードの変更が必要
- 他の箇所への影響調査が必要

**実装工数**: 2時間（影響調査含む）

---

## 推奨案

### 短期対応: 案1（コミットする）

```python
# conftest.py の normal_user, superuser fixture を変更

@pytest.fixture
def normal_user(db):
    user = User(...)
    db.add(user)
    db.commit()  # ← 変更点
    yield user
    # クリーンアップ（オプション）
    db.delete(user)
    db.commit()
```

### 中長期対応: 案4（get_db統一）

本番コードの`get_db`を一箇所に統一し、全てのルートで同じ依存関数を使用する。

---

## 検証方法

### 修正後の確認コマンド

```bash
# 単独テスト
python3 -m pytest tests/api/test_order_locks.py -v

# 順序依存確認（他テストと一緒に実行）
python3 -m pytest tests/test_auth.py tests/api/test_order_locks.py -v

# 全テスト
python3 -m pytest --tb=no -q
```

### 期待結果

```
6 passed  # test_order_locks.py の全テスト
278+ passed, 0 failed  # 全テスト
```

---

## 対応結果 (2025-12-07)

### 実施内容

推奨案の**案1（ユーザーをコミットする）**を採用し、以下の修正を行いました。

1. **`backend/tests/conftest.py` の修正**:
    - `normal_user`, `superuser` fixture を変更し、`db.flush()` ではなく `db.commit()` するようにしました。
    - `return` を `yield` に変更し、テスト終了後に `db.delete()` と `db.commit()` を実行するクリーンアップ処理を追加しました。

2. **`backend/tests/api/test_order_locks.py` の修正**:
    - 全てのテストケースから `@pytest.mark.xfail` マーカーを削除しました。

### 検証結果

`test_auth.py` との結合テストを実施し、全てパスすることを確認しました。

```bash
$ python3 -m pytest tests/test_auth.py tests/api/test_order_locks.py -v
...
================= 10 passed in 2.34s =================
```

また、`test_order_locks.py` 単体実行も成功しています。

---

## 作成日

2025-12-07
