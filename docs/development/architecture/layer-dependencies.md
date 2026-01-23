# レイヤー依存関係調査報告

**調査日**: 2024-12-22  
**対象**: CODEXレビュー報告書 項目(5) 「DomainロジックがPresentationスキーマ型に依存し層違反」

---

## 調査結果

### Domain層

**結論: 問題なし ✅**

`app/domain/` ディレクトリ内のファイルは `app.presentation` への依存がありません。
Domain層は純粋なビジネスロジックとして適切に分離されています。

### Application層

**結論: 36ファイルが Presentation.schemas に依存**

`app/application/` ディレクトリ内の36ファイルが `app.presentation.schemas` をインポートしています。

主な使用パターン:
- サービス層でPydanticスキーマを直接使用（リクエスト/レスポンス型として）
- DTOとしてのスキーマ再利用

---

## 対応方針の選択肢

### Option A: 実用的な妥協（現状維持）

**メリット**:
- 追加作業不要
- コード量を抑えられる
- Pydanticスキーマの再利用による一貫性

**デメリット**:
- 厳密なClean Architectureからの逸脱
- Application層がPresentation層に依存

### Option B: DTO層を新設（完全分離）

**メリット**:
- 厳密な層分離
- 将来的なAPI変更への耐性

**デメリット**:
- 36ファイル以上の大規模リファクタリング
- DTO変換コードの増加
- 短期的なROIが低い

---

## 結論

現時点では **Option A（現状維持）** を採用。

理由:
1. Domain層は適切に分離されており、最も重要な層違反は発生していない
2. Application層のPresentation依存は、Pydanticスキーマの再利用という実用的な設計判断
3. 完全分離のためのリファクタリングコストが高く、優先度の高い機能開発に影響

将来的に以下の条件が発生した場合は再検討:
- 複数のPresentation層（GraphQL、gRPC等）が必要になった場合
- スキーマの変更頻度が高くなり、Application層への影響が顕著になった場合
