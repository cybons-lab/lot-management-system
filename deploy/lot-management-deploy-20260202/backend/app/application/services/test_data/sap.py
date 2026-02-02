"""SAP test data generator.

Generate sample SAP data for testing:
- SapConnection: SAP connection configurations (production/test)
- SapMaterialCache: Cached SAP material data
- SapFetchLog: SAP fetch operation logs
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.sap_models import (
    SapConnection,
    SapFetchLog,
    SapMaterialCache,
)


def clear_sap_data(db: Session) -> None:
    """Clear existing SAP data."""
    # Delete in correct order (respecting FK constraints)
    db.query(SapFetchLog).delete()
    db.query(SapMaterialCache).delete()
    db.query(SapConnection).delete()


def generate_sap_connections(db: Session) -> list[SapConnection]:
    """Generate SAP connection configurations."""
    connections = [
        SapConnection(
            name="本番環境",
            environment="production",
            description="本番SAP環境への接続設定",
            ashost="sap-prod.example.com",
            sysnr="00",
            client="100",
            user_name="SAPUSER01",
            passwd_encrypted="encrypted_password_123",  # In real app, use actual encryption
            lang="JA",
            default_bukrs="10",
            default_kunnr="100427105",
            is_active=True,
            is_default=True,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        ),
        SapConnection(
            name="テスト環境",
            environment="test",
            description="テスト/開発用SAP環境",
            ashost="sap-test.example.com",
            sysnr="01",
            client="200",
            user_name="SAPTEST01",
            passwd_encrypted="encrypted_password_456",
            lang="JA",
            default_bukrs="10",
            default_kunnr="100427105",
            is_active=True,
            is_default=False,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        ),
    ]

    db.add_all(connections)
    db.flush()
    return connections


def generate_sap_material_cache(db: Session, connections: list[SapConnection]) -> None:
    """Generate SAP material cache data with supplier and unit information."""
    # Use production connection for cache data
    prod_conn = next((c for c in connections if c.environment == "production"), connections[0])

    customer_code = "100427105"  # Default customer code

    # Material code → (supplier_code, qty_unit) mapping
    # Matches the pattern in smartread.py test data
    material_mapping = {
        "M001": ("S001", "KG"),
        "M002": ("S002", "PC"),
        "M003": ("S001", "M"),
        "M004": ("S002", "KG"),
        "M005": ("S999", "EA"),  # Fallback for unmapped materials
    }

    cache_entries = []
    for i, (mat_code, (supplier_code, qty_unit)) in enumerate(material_mapping.items(), start=1):
        cache_entries.append(
            SapMaterialCache(
                connection_id=prod_conn.id,
                zkdmat_b=mat_code,  # 先方品番
                kunnr=customer_code,  # 得意先コード
                raw_data={
                    "MAKTX": f"サンプル材料{i}",
                    "MTART": "ROH",  # Raw material
                    "MEINS": qty_unit,  # 数量単位
                    "MATKL": "MAT001",
                    "WERKS": "1000",
                    "LGORT": "0001",
                    "ZLIFNR_H": supplier_code,  # SAP仕入先コード
                    "ZMKMAT_B": f"SAP-MK-{mat_code[-3:]}",  # SAP優先のメーカー品番
                    "description": f"テスト用材料データ {mat_code}",
                    "weight": f"{i * 100}",
                    "dimension": f"{i * 100}x{i * 50}x{i * 10}",
                },
                fetched_at=datetime.now(UTC) - timedelta(days=1),
                fetch_batch_id=f"BATCH-{datetime.now(UTC).strftime('%Y%m%d')}-001",
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
        )

    db.add_all(cache_entries)


def generate_sap_fetch_logs(db: Session, connections: list[SapConnection]) -> None:
    """Generate SAP fetch operation logs."""
    prod_conn = next((c for c in connections if c.environment == "production"), connections[0])

    batch_id_success = f"BATCH-{datetime.now(UTC).strftime('%Y%m%d')}-001"
    batch_id_error = f"BATCH-{datetime.now(UTC).strftime('%Y%m%d')}-002"

    # Successful fetch logs
    logs = [
        SapFetchLog(
            connection_id=prod_conn.id,
            fetch_batch_id=batch_id_success,
            rfc_name="Z_SCM1_RFC_MATERIAL_DOWNLOAD",
            params={"BUKRS": "10", "KUNNR": "100427105"},
            status="SUCCESS",
            record_count=5,
            error_message=None,
            duration_ms=1500,
            created_at=datetime.now(UTC) - timedelta(hours=2),
        ),
        SapFetchLog(
            connection_id=prod_conn.id,
            fetch_batch_id=batch_id_success,
            rfc_name="Z_SCM1_RFC_MATERIAL_DOWNLOAD",
            params={"BUKRS": "10", "KUNNR": "100427105", "ZKDMAT_B": "M001"},
            status="SUCCESS",
            record_count=1,
            error_message=None,
            duration_ms=800,
            created_at=datetime.now(UTC) - timedelta(hours=1),
        ),
        # Failed fetch log (connection error)
        SapFetchLog(
            connection_id=prod_conn.id,
            fetch_batch_id=batch_id_error,
            rfc_name="Z_SCM1_RFC_MATERIAL_DOWNLOAD",
            params={"BUKRS": "10", "KUNNR": "INVALID"},
            status="ERROR",
            record_count=0,
            error_message="Invalid customer code: INVALID",
            duration_ms=500,
            created_at=datetime.now(UTC) - timedelta(minutes=30),
        ),
        # Timeout error
        SapFetchLog(
            connection_id=prod_conn.id,
            fetch_batch_id=batch_id_error,
            rfc_name="Z_SCM1_RFC_STOCK_CHECK",
            params={"BUKRS": "10", "WERKS": "1000", "ZKDMAT_B": "M003"},
            status="ERROR",
            record_count=0,
            error_message="SAP connection timeout after 30 seconds",
            duration_ms=30000,
            created_at=datetime.now(UTC) - timedelta(minutes=15),
        ),
    ]

    db.add_all(logs)


def generate_sap_data(db: Session) -> None:
    """Generate all SAP test data.

    Creates:
    - 2 SAP connections (production/test)
    - 5 material cache entries
    - 4 fetch log entries (2 success, 2 error)
    """
    clear_sap_data(db)

    connections = generate_sap_connections(db)
    generate_sap_material_cache(db, connections)
    generate_sap_fetch_logs(db, connections)

    db.flush()
