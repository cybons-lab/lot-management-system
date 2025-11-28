# tools/generate_er.py
# Python 3.12 / SQLAlchemy 2.x
import argparse
from pathlib import Path
from typing import List, Set, Tuple

from sqlalchemy import MetaData, create_engine


def simplify_type(type_str: str) -> str:
    """
    Mermaidの属性行は型表記が自由だが、トークン分割で誤認されにくい短い単語に正規化する。
    代表例:
      - DOUBLE PRECISION -> FLOAT
      - TIMESTAMP [WITHOUT/ WITH TIME ZONE] -> TIMESTAMP
      - CHARACTER VARYING / VARCHAR(n) -> VARCHAR
      - NUMERIC(p,s) / DECIMAL(p,s) -> NUMERIC
    """
    t = type_str.upper().strip()

    # 括弧を除去（NUMERIC(10,2) -> NUMERIC）
    import re

    base = re.sub(r"\([^)]*\)", "", t)
    base = " ".join(base.split())  # 余分な空白を1つに

    # 代表名への正規化
    replacements = {
        "DOUBLE PRECISION": "FLOAT",
        "REAL": "FLOAT",
        "FLOAT8": "FLOAT",
        "FLOAT4": "FLOAT",
        "TIMESTAMP WITHOUT TIME ZONE": "TIMESTAMP",
        "TIMESTAMP WITH TIME ZONE": "TIMESTAMP",
        "TIMESTAMP": "TIMESTAMP",
        "DATE": "DATE",
        "TIME WITHOUT TIME ZONE": "TIME",
        "TIME WITH TIME ZONE": "TIME",
        "TIME": "TIME",
        "CHARACTER VARYING": "VARCHAR",
        "VARCHAR": "VARCHAR",
        "CHARACTER": "CHAR",
        "CHAR": "CHAR",
        "TEXT": "TEXT",
        "UUID": "UUID",
        "BIGINT": "BIGINT",
        "INTEGER": "INTEGER",
        "INT": "INTEGER",
        "SMALLINT": "SMALLINT",
        "NUMERIC": "NUMERIC",
        "DECIMAL": "NUMERIC",
        "BOOLEAN": "BOOLEAN",
        "BYTEA": "BYTEA",
        "JSONB": "JSONB",
        "JSON": "JSON",
    }

    # 最長一致で置換
    for k in sorted(replacements.keys(), key=len, reverse=True):
        if base.startswith(k):
            return replacements[k]

    # 未知タイプはスペース・アンダースコアを除去して1語に
    base = base.replace("_", "")
    base = base.replace(" ", "")
    return base if base else "VARCHAR"


def build_mermaid(metadata: MetaData) -> str:
    lines: List[str] = ["erDiagram"]

    # エンティティ定義
    for t in metadata.sorted_tables:
        lines.append(f"  {t.name} {{")
        pks = {c.name for c in t.primary_key}
        fk_cols = {fk.parent.name for fk in t.foreign_keys}

        for c in t.columns:
            typ = simplify_type(str(c.type))
            flags: List[str] = []
            if c.name in pks:
                flags.append("PK")
            if c.name in fk_cols:
                flags.append("FK")

            # 1属性=1行（余計なトークンを混ぜない）
            if flags:
                lines.append(f"    {typ} {c.name} {' '.join(flags)}")
            else:
                lines.append(f"    {typ} {c.name}")
        lines.append("  }")

    # リレーション定義（重複排除）
    rels: Set[Tuple[str, str, str]] = set()
    for t in metadata.sorted_tables:
        for fk in t.foreign_keys:
            child = t.name
            parent = fk.column.table.name
            label = f"{fk.parent.name}_to_{fk.column.name}"
            key = (child, parent, label)
            if key in rels:
                continue
            rels.add(key)
            # 子(多, optional) }o -- || 親(1)
            lines.append(f"  {child} }}o--|| {parent} : {label}")

    return "\n".join(lines)


def build_graphviz_svg(metadata: MetaData, out_stem: Path) -> None:
    """
    ドキュメント用の簡易SVG。厳密型やNOT NULL等はここにラベルとして残せる。
    依存: graphviz (Pythonパッケージ) と OS側のGraphviz 本体（dot）
    """
    try:
        from graphviz import Digraph
    except Exception:
        # Graphviz未導入環境でもMermaid生成は続行できる
        return

    g = Digraph("ER", format="svg")
    g.attr(rankdir="LR", fontsize="10", labelloc="t")
    g.node_attr.update(shape="record", fontsize="9")

    for table in metadata.sorted_tables:
        cols = []
        pks = {c.name for c in table.primary_key}
        for c in table.columns:
            typ = str(c.type)
            mark = " (PK)" if c.name in pks else ""
            nn = " NOT NULL" if not c.nullable else ""
            cols.append(f"{c.name}: {typ}{mark}{nn}")
        label = "{%s|%s}" % (table.name, r"\l".join(cols) + r"\l")
        g.node(table.name, label=label)

    for table in metadata.sorted_tables:
        for fk in table.foreign_keys:
            src = table.name
            dst = fk.column.table.name
            g.edge(
                src, dst, label=f"{fk.parent.name}→{fk.column.name}", arrowsize="0.7"
            )

    g.render(out_stem.with_suffix(""), cleanup=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True, help="SQLAlchemy URL")
    ap.add_argument("--schema", default="public")
    ap.add_argument("--out", default="docs/schema/er_diagram")
    ap.add_argument(
        "--no-svg", action="store_true", help="Graphviz SVGの出力をスキップ"
    )
    args = ap.parse_args()

    engine = create_engine(args.url, future=True)
    metadata = MetaData()
    metadata.reflect(bind=engine, schema=args.schema)

    out_stem = Path(args.out)
    out_stem.parent.mkdir(parents=True, exist_ok=True)

    # Mermaid
    mmd_text = build_mermaid(metadata)
    mmd_path = out_stem.with_suffix(".mmd")
    mmd_path.write_text(mmd_text, encoding="utf-8")
    print(f"[OK] Mermaid: {mmd_path}")

    # Graphviz SVG（任意）
    if not args.no_svg:
        try:
            build_graphviz_svg(metadata, out_stem)
            print(f"[OK] SVG: {out_stem.with_suffix('.svg')}")
        except Exception as e:
            print(f"[WARN] SVG生成をスキップしました: {e}")


if __name__ == "__main__":
    main()
