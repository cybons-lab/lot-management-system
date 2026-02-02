#!/usr/bin/env python3
"""
Phase1 Migration View Fix Script - Test Environment Preset
テスト環境用のプリセット設定版

Usage:
    python scripts/fix_phase1_views_test.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Import main script
from fix_phase1_views import main as run_fix
import argparse

if __name__ == "__main__":
    # Override sys.argv with test environment defaults
    sys.argv = [
        sys.argv[0],
        '--container', 'lot-db-postgres-test',
        '--user', 'testuser',
        '--db', 'lot_management_test'
    ]
    run_fix()
