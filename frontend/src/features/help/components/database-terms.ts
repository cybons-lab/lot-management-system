/**
 * database-terms.ts
 *
 * データベース用語定義
 */

export const DATABASE_TERMS = [
  {
    term: "仕入先 / 仕入元",
    definition: "商品を仕入れる会社。英語では Supplier。",
  },
  {
    term: "仕入先コード",
    definition: "仕入先を識別するコード。suppliers.supplier_code。",
  },
  {
    term: "得意先 / 顧客",
    definition: "商品を販売する先の会社。英語では Customer。",
  },
  {
    term: "得意先コード",
    definition: "得意先を識別するコード。customers.customer_code。",
  },
  {
    term: "メーカー品番",
    definition: "仕入先が自社商品に付けている品番。在庫管理の実体。supplier_items.maker_part_no。",
  },
  {
    term: "得意先品番 / 先方品番",
    definition:
      "得意先が注文時に指定する品番。customer_items.customer_part_no。メーカー品番に変換される。",
  },
  {
    term: "仕入先品目ID",
    definition:
      "supplier_items.id への参照。メーカー品番の実体を指す。歴史的に supplier_item_id という名前のカラムもあるが、同じ意味。",
  },
  {
    term: "ロット",
    definition:
      "入荷時の製造ロット番号。同じメーカー品番でも、ロットごとに有効期限や品質が異なる。",
  },
  {
    term: "FEFO",
    definition: "First Expiry First Out。有効期限が早いものから優先的に出荷する在庫管理手法。",
  },
  {
    term: "引当",
    definition: "受注に対して在庫ロットを割り当てること。lot_reservations テーブルで管理。",
  },
] as const;
