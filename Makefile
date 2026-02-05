.PHONY: help up down restart logs clean test lint format typecheck build deploy

# デフォルトターゲット
.DEFAULT_GOAL := help

##@ General

help: ## このヘルプメッセージを表示
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Docker操作

up: ## すべてのサービスを起動
	docker compose up -d

down: ## すべてのサービスを停止・削除
	docker compose down

restart: ## すべてのサービスを再起動
	docker compose restart

logs: ## すべてのログを表示（フォロー）
	docker compose logs -f

logs-backend: ## バックエンドのログを表示
	docker compose logs -f backend

logs-frontend: ## フロントエンドのログを表示
	docker compose logs -f frontend

clean: ## すべてのボリュームを削除してクリーンアップ
	docker compose down -v
	@echo "Warning: すべてのボリュームが削除されました"

##@ データベース

db-reset: ## データベースをリセット（ボリューム削除 + 再起動）
	docker compose down -v
	docker compose up -d db-postgres
	@echo "データベースをリセットしました。バックエンドが自動でマイグレーションを実行します。"

db-init-sample: ## サンプルデータを投入
	@echo "バックエンドの起動を待機中..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		curl -s http://localhost:8000/api/health > /dev/null 2>&1 && break || sleep 2; \
	done
	@echo "サンプルデータを投入中..."
	curl -X POST http://localhost:8000/api/admin/init-sample-data

db-shell: ## PostgreSQLシェルに接続
	docker compose exec db-postgres psql -U admin -d lot_management

alembic-upgrade: ## マイグレーションを最新に更新
	docker compose exec backend alembic upgrade head

alembic-downgrade: ## マイグレーションを1つ戻す
	docker compose exec backend alembic downgrade -1

alembic-history: ## マイグレーション履歴を表示
	docker compose exec backend alembic history

alembic-current: ## 現在のマイグレーションバージョンを表示
	docker compose exec backend alembic current

alembic-revision: ## 新規マイグレーションファイルを生成 (例: make alembic-revision MSG="message")
	docker compose exec backend uv run alembic revision --autogenerate -m "$(MSG)"

##@ バックエンド

backend-shell: ## バックエンドコンテナにシェルでログイン
	docker compose exec backend bash

backend-lint: ## バックエンドをLint
	docker compose exec backend uv run ruff check app/

backend-lint-fix: ## バックエンドのLintを自動修正
	docker compose exec backend uv run ruff check app/ --fix

backend-format: ## バックエンドをフォーマット
	docker compose exec backend uv run ruff format app/

backend-typecheck: ## バックエンドの型チェック (mypy)
	docker compose exec backend uv run mypy app/

backend-test: ## バックエンドのテストを実行
	docker compose exec backend uv run pytest -v

backend-test-quick: ## バックエンドのテストを実行（詳細なし）
	docker compose exec backend uv run pytest -q

backend-test-coverage: ## バックエンドのテストをカバレッジ付きで実行
	docker compose exec backend uv run pytest --cov=app --cov-report=html

##@ フロントエンド

frontend-shell: ## フロントエンドコンテナにシェルでログイン
	docker compose exec frontend sh

frontend-lint: ## フロントエンドをLint
	docker compose exec -T frontend npm run lint

frontend-lint-fix: ## フロントエンドのLintを自動修正
	docker compose exec -T frontend npm run lint:fix

frontend-format: ## フロントエンドをフォーマット
	docker compose exec -T frontend npm run format

frontend-format-check: ## フロントエンドのフォーマットをチェック
	docker compose exec -T frontend npm run format:check

frontend-typecheck: ## フロントエンドの型チェック
	docker compose exec -T frontend npm run typecheck

frontend-typegen: ## OpenAPI型定義を再生成
	docker compose exec -T frontend npm run typegen:docker

frontend-build: ## フロントエンドをビルド
	docker compose exec -T frontend npm run build

frontend-test: ## フロントエンドのテストを実行
	docker compose exec -T frontend npm run test:run

frontend-test-ui: ## フロントエンドのテストをUIモードで実行
	docker compose exec frontend npm run test:ui

frontend-test-e2e: ## E2Eテストを実行（全て）
	docker compose exec -T frontend npm run test:e2e

frontend-test-e2e-smoke: ## スモークE2Eテストを実行（30秒）
	docker compose exec -T frontend npm run test:e2e:smoke

frontend-test-e2e-p0: ## P0 E2Eテストを実行（クリティカルパス）
	docker compose exec -T frontend npx playwright test --project=p0

##@ 品質チェック（全体）

lint: backend-lint frontend-lint ## 全体をLint

lint-fix: backend-lint-fix frontend-lint-fix ## 全体のLintを自動修正

format: backend-format frontend-format ## 全体をフォーマット

format-check: frontend-format-check ## 全体のフォーマットをチェック

typecheck: backend-typecheck frontend-typecheck ## 全体の型チェック

test: backend-test frontend-test ## 全体のテストを実行

test-quick: backend-test-quick frontend-test ## 全体のテストを高速実行

test-smoke: frontend-test-e2e-smoke ## スモークテストを実行（最速）
	@echo "スモークテストが完了しました！"

test-critical: frontend-test-e2e-p0 ## クリティカルパステストを実行
	@echo "クリティカルパステストが完了しました！"

quality-check: lint-fix format typecheck test-quick ## 品質チェック（自動修正＋テスト）
	@echo "すべての品質チェックが完了しました！"

quality-check-full: lint-fix format typecheck test test-smoke ## 完全品質チェック（E2E含む）
	@echo "完全品質チェックが完了しました！"

ci: lint format-check typecheck test ## CI実行（自動修正なし）
	@echo "CI品質チェックが完了しました！"

ci-smoke: lint format-check typecheck test-quick test-smoke ## CI Smoke（最速）
	@echo "CI Smokeチェックが完了しました！"

##@ デプロイ

typegen: frontend-typegen ## 型定義を再生成（エイリアス）

build: ## 本番デプロイパッケージをビルド（通常モード：npm ci スキップ）
	python scripts/build_deploy_package.py

build-clean: ## 本番デプロイパッケージをビルド（クリーンモード：npm ci 実行）
	python scripts/build_deploy_package.py --clean

deploy: build ## デプロイパッケージを作成（buildのエイリアス）

deploy-clean: build-clean ## デプロイパッケージを作成（クリーンビルド）

##@ 開発ワークフロー

dev-setup: up db-init-sample ## 開発環境のセットアップ（起動＋サンプルデータ）
	@echo "開発環境のセットアップが完了しました！"
	@echo "フロントエンド: http://localhost:5173"
	@echo "バックエンドAPI: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/api/docs"
