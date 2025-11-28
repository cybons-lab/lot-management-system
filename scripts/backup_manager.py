#!/usr/bin/env python3
"""
Backup Manager Script
Handles database backups and cleanup based on retention policy.
"""

import argparse
import os
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List

# Configuration
BACKUP_DIR = Path(__file__).parent.parent / "backups"
DB_NAME = "lot_management"  # Default database name
DB_USER = "postgres"  # Default database user
DATE_FORMAT = "%Y%m%d_%H%M%S"
FILENAME_PREFIX = "backup_"
FILENAME_EXTENSION = ".sql"


def setup_backup_dir():
    """Ensure backup directory exists."""
    if not BACKUP_DIR.exists():
        print(f"Creating backup directory: {BACKUP_DIR}")
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def create_backup(db_name: str, db_user: str, dry_run: bool = False):
    """Create a new database backup."""
    setup_backup_dir()
    timestamp = datetime.now().strftime(DATE_FORMAT)
    filename = f"{FILENAME_PREFIX}{timestamp}{FILENAME_EXTENSION}"
    filepath = BACKUP_DIR / filename

    print(f"Creating backup: {filepath}")
    
    cmd = ["pg_dump", "-U", db_user, "-f", str(filepath), db_name]
    
    if dry_run:
        print(f"[DRY-RUN] Would execute: {' '.join(cmd)}")
        return

    try:
        subprocess.run(cmd, check=True)
        print(f"Backup created successfully: {filepath}")
    except subprocess.CalledProcessError as e:
        print(f"Error creating backup: {e}", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print("Error: pg_dump not found. Please ensure PostgreSQL client tools are installed.", file=sys.stderr)
        sys.exit(1)


def get_backup_files() -> List[Path]:
    """Get list of backup files sorted by modification time (newest first)."""
    if not BACKUP_DIR.exists():
        return []
    
    files = [
        f for f in BACKUP_DIR.glob(f"{FILENAME_PREFIX}*{FILENAME_EXTENSION}")
        if f.is_file()
    ]
    # Sort by timestamp in filename, assuming format backup_YYYYMMDD_HHMMSS.sql
    # This is more robust than mtime if files were moved/copied
    files.sort(key=lambda f: f.name, reverse=True)
    return files


def parse_date_from_filename(filename: str) -> datetime:
    """Extract date from filename."""
    # Remove prefix and extension
    core = filename[len(FILENAME_PREFIX):-len(FILENAME_EXTENSION)]
    try:
        return datetime.strptime(core, DATE_FORMAT)
    except ValueError:
        return datetime.min


def cleanup_backups(dry_run: bool = False):
    """
    Clean up old backups based on retention policy.
    Policy:
    - Keep daily backups for 7 days
    - Keep weekly backups (Sundays) for 4 weeks
    - Keep monthly backups (1st of month) for 6 months
    """
    files = get_backup_files()
    if not files:
        print("No backup files found.")
        return

    now = datetime.now()
    keep_files = set()

    # Retention periods
    daily_retention = timedelta(days=7)
    weekly_retention = timedelta(weeks=4)
    monthly_retention = timedelta(days=30 * 6)  # Approx 6 months

    print("Analyzing backup files for cleanup...")

    for file in files:
        file_date = parse_date_from_filename(file.name)
        if file_date == datetime.min:
            print(f"Skipping file with unknown format: {file.name}")
            keep_files.add(file)
            continue

        age = now - file_date
        
        # Rule 1: Keep daily backups for 7 days
        if age <= daily_retention:
            keep_files.add(file)
            continue

        # Rule 2: Keep weekly backups (Sunday) for 4 weeks
        # weekday(): Monday is 0 and Sunday is 6
        if age <= weekly_retention and file_date.weekday() == 6:
            keep_files.add(file)
            continue

        # Rule 3: Keep monthly backups (1st of month) for 6 months
        if age <= monthly_retention and file_date.day == 1:
            keep_files.add(file)
            continue

    # Identify files to delete
    files_to_delete = [f for f in files if f not in keep_files]

    if not files_to_delete:
        print("No files to delete.")
        return

    print(f"Found {len(files_to_delete)} files to delete.")
    for file in files_to_delete:
        if dry_run:
            print(f"[DRY-RUN] Would delete: {file.name}")
        else:
            print(f"Deleting: {file.name}")
            try:
                file.unlink()
            except OSError as e:
                print(f"Error deleting {file.name}: {e}", file=sys.stderr)


def list_backups():
    """List all available backups."""
    files = get_backup_files()
    if not files:
        print("No backup files found.")
        return

    print(f"{'Filename':<35} {'Size (MB)':<10} {'Created'}")
    print("-" * 60)
    for file in files:
        size_mb = file.stat().st_size / (1024 * 1024)
        created = datetime.fromtimestamp(file.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        print(f"{file.name:<35} {size_mb:<10.2f} {created}")


def main():
    parser = argparse.ArgumentParser(description="Database Backup Manager")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Create command
    create_parser = subparsers.add_parser("create", help="Create a new backup")
    create_parser.add_argument("--db-name", default=DB_NAME, help="Database name")
    create_parser.add_argument("--db-user", default=DB_USER, help="Database user")
    create_parser.add_argument("--dry-run", action="store_true", help="Simulate execution")

    # Cleanup command
    cleanup_parser = subparsers.add_parser("cleanup", help="Clean up old backups")
    cleanup_parser.add_argument("--dry-run", action="store_true", help="Simulate execution")

    # List command
    subparsers.add_parser("list", help="List available backups")

    args = parser.parse_args()

    if args.command == "create":
        create_backup(args.db_name, args.db_user, args.dry_run)
    elif args.command == "cleanup":
        cleanup_backups(args.dry_run)
    elif args.command == "list":
        list_backups()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
