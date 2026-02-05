#!/usr/bin/env python3
"""
Database Helper Script

Usage:
    python scripts/db-helper.py dev    # Connect to development database
    python scripts/db-helper.py test   # Connect to test database
    python scripts/db-helper.py info   # Show database connection info

Or via poe:
    poe docker:db-shell    # Development DB
    poe docker:db-test     # Test DB
"""

import os
import subprocess
import sys


DB_CONFIGS = {
    "dev": {
        "host": "localhost",
        "port": "15432",
        "user": "lot_user",
        "password": "lot_password",
        "database": "lot_management",
        "description": "Development Database",
    },
    "test": {
        "host": "localhost",
        "port": "15433",
        "user": "lot_user_test",
        "password": "lot_password_test",
        "database": "lot_management_test",
        "description": "Test Database",
    },
}


def print_info():
    """Print database connection information."""
    print("\n=== Database Connection Info ===\n")
    for env, config in DB_CONFIGS.items():
        print(f"[{env.upper()}] {config['description']}")
        print(f"  Host: {config['host']}:{config['port']}")
        print(f"  User: {config['user']}")
        print(f"  Database: {config['database']}")
        print(f"  Command: poe docker:db-{env}\n")


def connect_db(env: str):
    """Connect to database using psql."""
    if env not in DB_CONFIGS:
        print(f"Error: Unknown environment '{env}'")
        print(f"Available: {', '.join(DB_CONFIGS.keys())}")
        sys.exit(1)

    config = DB_CONFIGS[env]
    print(f"Connecting to {config['description']}...")
    print(f"  {config['host']}:{config['port']}/{config['database']}")
    print()

    # Set environment variable for password
    env_vars = os.environ.copy()
    env_vars["PGPASSWORD"] = config["password"]

    # Execute psql
    try:
        subprocess.run(
            [
                "docker",
                "compose",
                "exec",
                f"db-postgres{'-test' if env == 'test' else ''}",
                "psql",
                "-U",
                config["user"],
                "-d",
                config["database"],
            ],
            env=env_vars,
            check=False,
        )
    except KeyboardInterrupt:
        print("\nDisconnected.")
    except FileNotFoundError:
        print("Error: docker compose not found. Please install Docker.")
        sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print_info()
        sys.exit(0)

    command = sys.argv[1]

    if command == "info":
        print_info()
    elif command in DB_CONFIGS:
        connect_db(command)
    else:
        print(f"Error: Unknown command '{command}'")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
