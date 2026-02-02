"""Check delivery_places jiku_code data."""

import os
import sys


sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text

from app.core.config import settings


engine = create_engine(str(settings.DATABASE_URL))

with engine.connect() as conn:
    result = conn.execute(
        text("""
        SELECT 
            jiku_code, 
            delivery_place_code, 
            delivery_place_name,
            customer_id
        FROM delivery_places 
        ORDER BY jiku_code NULLS LAST 
        LIMIT 20
    """)
    )

    print("現在のdelivery_placesデータ:")
    print("-" * 80)
    for row in result:
        print(
            f"次区: {row.jiku_code or '(NULL)':15s} | 納入先コード: {row.delivery_place_code:20s} | {row.delivery_place_name}"
        )

    print("\n" + "=" * 80)

    # 統計情報
    stats = conn.execute(
        text("""
        SELECT 
            COUNT(*) as total,
            COUNT(jiku_code) as with_jiku,
            COUNT(*) - COUNT(jiku_code) as without_jiku,
            COUNT(DISTINCT jiku_code) as unique_jiku
        FROM delivery_places
    """)
    ).first()

    if stats:
        print("\n統計情報:")
        print(f"  総納入先数: {stats.total}")
        print(f"  次区コードあり: {stats.with_jiku}")
        print(f"  次区コードなし: {stats.without_jiku}")
        print(f"  ユニークな次区コード数: {stats.unique_jiku}")
    else:
        print("\n統計情報: データなし")

    # 重複チェック
    duplicates = conn.execute(
        text("""        SELECT jiku_code, COUNT(*) as cnt
        FROM delivery_places
        WHERE jiku_code IS NOT NULL
        GROUP BY jiku_code
        HAVING COUNT(*) > 1
    """)
    )

    dup_list = list(duplicates)
    if dup_list:
        print("\n⚠️  重複している次区コード:")
        for row in dup_list:
            print(f"  {row.jiku_code}: {row.cnt}件")
    else:
        print("\n✅ 次区コードの重複なし（1:1関係）")
