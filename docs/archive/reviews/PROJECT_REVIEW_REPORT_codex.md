# Lot Management System アーキテクチャレビュー_codex

本ドキュメントは、外部レビュー向けに本リポジトリの現状分析と改善提案を集約したものです。範囲はバックエンド／フロントエンド／DB／運用を含む全体レビューです。

---

## 1. システムの責務・境界・重要不変条件
- **目的**: OCR取込した受注に対し正しいロットをFEFOで引当し、不足時は仮発注を自動起票する在庫・ロット管理システム。
- **レイヤー境界**: Presentation(API整形) / Application(ユースケースとトランザクション) / Domain(純粋ロジック) / Infrastructure(DB・外部連携)。DomainがPresentation型に依存する箇所が残存し、層違反がある。
- **在庫不変条件**: `current_quantity, locked_quantity, reserved_qty` は非負。Available = Current − Locked − Confirmed予約。予約ステータスは不可逆（temporary→active→confirmed→released）。ロットの一意性 `(lot_number, product_id, warehouse_id)`。
- **ロット引当ルール**: FEFOを採用。期限切れ・非active・available<=0を除外すべきだが、候補抽出が期限/倉庫/ロックを未考慮の箇所あり。

## 2. 全体所見（良い点 / リスク）
- **良い点**
  - FEFOドメインロジックと計算トレースが用意され、純粋関数化されている部分がある。
  - DB制約（Check/Unique）で基本整合性を確保、LotReservationステートマシンも定義済み。
  - CIで型チェック・lint・schema syncを走らせるワークフローが用意されている。
- **最大リスク**
  1. OCR取込〜仮発注起票の主要要件が実装されておらず、業務フローが成立していない。
  2. 引当候補抽出が倉庫/期限/ロック量を考慮せず、誤配・期限切れ採用リスクが高い。
  3. 予約コミットが非冪等（再実行で二重予約）かつCIでバックエンドテストが常時無効化され、品質劣化を検知できない。

## 3. 現状 vs 望ましい形
- **現状**: レイヤー分離の方針はあるが、DomainがPresentation型に依存。引当はFEFOソートのみで倉庫・期限・ロックを十分に考慮しない。OCR/仮発注フローが欠落し、CIテストはスキップ。
- **望ましい形**: Domainは独立したDTO/Enumで完結し、FEFO候補抽出は倉庫・期限・ロック・有効在庫を一貫して判定。OCR取込→受注→引当→不足→仮発注までをAPI/DBで一貫実装し、CIでテストを常時実行。

## 4. 主要な問題点（抜粋15件）
1. OCR取込APIが存在せず、受注自動登録が不可。  
2. 不足時の仮発注（purchase_request相当）テーブル/サービス未実装。  
3. FEFO候補抽出が倉庫を見ず、別倉庫在庫を誤引当。  
4. 候補抽出で期限切れ/安全日数を考慮せず、期限切れロット採用の恐れ。  
5. DomainロジックがPresentationスキーマ型に依存し層違反。  
6. LotReservationのsource_idに外部キー制約がなく孤児予約を許容。  
7. 予約コミットが非冪等（既存予約を確認せず毎回INSERT）。  
8. 確定処理がlocked_quantityを考慮しないためロック在庫を消費しうる。  
9. 入荷受入がデフォルト倉庫固定で計画倉庫を無視。  
10. ビュー(v_order_line_details等)がAlembicに含まれず環境差異が起こる。  
11. React Queryのキャッシュキー衝突でリスト/明細キャッシュが混線。  
12. CIでバックエンドpytestが常時スキップされ品質回帰を検知できない。  
13. Available>=0をDB/コードで強制せず、調整で負在庫が残存しうる。  
14. ロット採番がCOUNTベースで並列受入時に衝突しやすい。  
15. 予約・出荷がStockHistoryに記録されず監査トレーサビリティが不足。

## 5. 優先順位付きアクション
- **今週**: ✅(3)倉庫/期限/ロック考慮のFEFO候補化、✅(7)予約コミット冪等化、✅(8)確定時のロック考慮、✅(11)フロントQueryキー整理、✅(12)CIテスト有効化。  
- **今月**: (1)(2) OCR取込と仮発注フロー実装、✅(5)Domain依存解消→調査完了・現状維持（[詳細](../docs/architecture/layer-dependencies.md)）、(6)source FK/孤児クリーンアップ、(9)(10)(13)整合性補強。  
- **四半期**: (14)(15) 監査性と並行性の強化、SAP/OCR実稼働E2Eテスト追加。

## 6. 最初の3コミット提案
1. **chore(ci): enable backend tests and stabilize fixtures** — pytestを有効化し、テストDB初期化を安定化。  
2. **fix(allocation): apply warehouse/expiry filters and make FEFO commit idempotent** — 候補抽出に倉庫・期限・ロックを反映し、再実行で二重予約しないよう上書き/ロックを導入。  
3. **feat(integration): add OCR intake and provisional purchase creation** — OCR取込APIと不足検知→仮発注テーブル/サービスを追加し主要ユースケースを成立させる。

## 7. 追加で確認したい事項
- OCR入力のフォーマット、重複判定キー、再取込時の期待動作。  
- 仮発注の起票先（SAP/メール/CSV）と承認フロー、リードタイム算出ルール。  
- 倉庫間引当の可否（クロスドック・直送）と賞味期限マージン日数。  
- locked_quantity付与/解除の運用主体とSAP側での整合ポリシー。  
- 本番でビュー(v_order_line_details等)をいつ/どこで作成するか（デプロイ手順）。  
