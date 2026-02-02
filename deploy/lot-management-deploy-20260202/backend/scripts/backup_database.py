#!/usr/bin/env python3
"""Database backup script with data.

Creates a complete SQL dump including schema and data from PostgreSQL database.
Useful before running migrations or major updates.

Usage:
    python scripts/backup_database.py
    python scripts/backup_database.py --output backups/my_backup.sql
    python scripts/backup_database.py --compress  # Creates .sql.gz
"""

import argparse
import gzip
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def get_db_connection_params() -> dict[str, str]:
    """Get database connection parameters from environment variables.

    Returns:
        dict with host, port, database, user, password
    """
    return {
        "host": os.getenv("POSTGRES_HOST", "localhost"),
        "port": os.getenv("POSTGRES_PORT", "5432"),
        "database": os.getenv("POSTGRES_DB", "lot_management_db"),
        "user": os.getenv("POSTGRES_USER", "postgres"),
        "password": os.getenv("POSTGRES_PASSWORD", "postgres"),
    }


def create_backup(output_path: Path, compress: bool = False) -> None:
    """Create database backup using pg_dump.

    Args:
        output_path: Path to save the backup file
        compress: Whether to compress the output with gzip
    """
    params = get_db_connection_params()

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Build pg_dump command
    cmd = [
        "pg_dump",
        f"--host={params['host']}",
        f"--port={params['port']}",
        f"--username={params['user']}",
        f"--dbname={params['database']}",
        "--format=plain",  # Plain SQL format
        "--no-owner",  # Don't output ownership commands
        "--no-acl",  # Don't output ACL commands
        "--data-only" if compress else "--verbose",  # Options
    ]

    # Set PGPASSWORD environment variable for authentication
    env = os.environ.copy()
    env["PGPASSWORD"] = params["password"]

    print(f"📦 Creating backup: {output_path}")
    print(f"   Database: {params['database']}@{params['host']}:{params['port']}")

    try:
        if compress:
            # Compress output with gzip
            output_path = output_path.with_suffix(output_path.suffix + ".gz")
            print(f"   Compressing to: {output_path}")

            with gzip.open(output_path, "wt", encoding="utf-8") as gz_file:
                result = subprocess.run(
                    cmd,
                    env=env,
                    capture_output=True,
                    text=True,
                    check=True,
                )
                gz_file.write(result.stdout)
        else:
            # Write plain SQL file
            with open(output_path, "w", encoding="utf-8") as f:
                result = subprocess.run(
                    cmd,
                    env=env,
                    stdout=f,
                    stderr=subprocess.PIPE,
                    text=True,
                    check=True,
                )

        # Check file size
        size_mb = output_path.stat().st_size / (1024 * 1024)
        print(f"✅ Backup created successfully: {size_mb:.2f} MB")

        # Show sample restore command
        print("\n📝 To restore this backup:")
        if compress:
            print(
                f"   gunzip -c {output_path} | psql -h {params['host']} "
                f"-p {params['port']} -U {params['user']} -d {params['database']}"
            )
        else:
            print(
                f"   psql -h {params['host']} -p {params['port']} "
                f"-U {params['user']} -d {params['database']} < {output_path}"
            )

    except subprocess.CalledProcessError as e:
        print(f"❌ Backup failed: {e}", file=sys.stderr)
        if e.stderr:
            print(f"   Error details: {e.stderr}", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print("❌ Error: pg_dump command not found", file=sys.stderr)
        print("   Make sure PostgreSQL client tools are installed", file=sys.stderr)
        print("   macOS: brew install postgresql", file=sys.stderr)
        print("   Ubuntu: sudo apt install postgresql-client", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    """Main function."""
    parser = argparse.ArgumentParser(
        description="Create a complete backup of the database (schema + data)"
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        help="Output file path (default: backups/backup_YYYYMMDD_HHMMSS.sql)",
    )
    parser.add_argument(
        "--compress",
        "-c",
        action="store_true",
        help="Compress output with gzip (.sql.gz)",
    )

    args = parser.parse_args()

    # Generate default filename if not provided
    if args.output:
        output_path = args.output
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = Path(f"backups/backup_{timestamp}.sql")

    create_backup(output_path, compress=args.compress)


if __name__ == "__main__":
    main()
