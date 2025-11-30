import os
import re
from pathlib import Path
from typing import Set, List, Dict

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
FRONTEND_ROOT = PROJECT_ROOT / "frontend/src"
BACKEND_ROOT = PROJECT_ROOT / "backend/app"

# Frontend Configuration
FRONTEND_EXTENSIONS = {".ts", ".tsx"}
FRONTEND_ENTRY_POINTS = {
    "main.tsx",
    "vite-env.d.ts",
    "App.tsx", # Often imported by main.tsx but good to whitelist
}
FRONTEND_IGNORE_PATTERNS = {
    r"\.test\.tsx?$",
    r"\.spec\.tsx?$",
    r"setupTests\.ts",
}

# Backend Configuration
BACKEND_EXTENSIONS = {".py"}
BACKEND_ENTRY_POINTS = {
    "main.py",
    "prestart.py",
    "__init__.py",
}
BACKEND_IGNORE_PATTERNS = {
    r"tests/.*",
    r"alembic/.*",
    r"migrations/.*",
}

def get_all_files(root_dir: Path, extensions: Set[str], ignore_patterns: Set[str]) -> Set[Path]:
    all_files = set()
    for ext in extensions:
        for path in root_dir.rglob(f"*{ext}"):
            # Check ignore patterns
            rel_path = path.relative_to(root_dir)
            if any(re.search(pattern, str(rel_path)) for pattern in ignore_patterns):
                continue
            all_files.add(path)
    return all_files

def resolve_frontend_import(import_path: str, current_file: Path) -> Path | None:
    # Handle alias
    if import_path.startswith("@/"):
        return FRONTEND_ROOT / import_path[2:]
    
    # Handle relative imports
    if import_path.startswith("."):
        return (current_file.parent / import_path).resolve()
    
    # Ignore node_modules (non-relative, non-alias)
    return None

def find_frontend_imports(file_path: Path) -> Set[Path]:
    imports = set()
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return imports

    # Regex for imports
    # import ... from '...'
    # import '...'
    # require('...')
    # import('...')
    patterns = [
        r'from\s+[\'"]([^\'"]+)[\'"]',
        r'import\s+[\'"]([^\'"]+)[\'"]',
        r'import\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)',
        r'require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)',
    ]

    for pattern in patterns:
        matches = re.findall(pattern, content)
        for match in matches:
            resolved = resolve_frontend_import(match, file_path)
            if resolved:
                # Try adding extensions
                for ext in ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]:
                    candidate = Path(str(resolved) + ext)
                    if candidate.exists() and candidate.is_file():
                        imports.add(candidate)
                        break
    return imports

def resolve_backend_import(import_path: str, current_file: Path) -> Path | None:
    # Convert dot notation to path
    # app.models.user -> app/models/user.py
    
    # Remove leading dots for relative imports
    relative_level = 0
    while import_path.startswith("."):
        import_path = import_path[1:]
        relative_level += 1
    
    if relative_level > 0:
        # Relative import
        # .models -> current_dir/models.py
        base_dir = current_file.parent
        for _ in range(relative_level - 1):
            base_dir = base_dir.parent
        
        parts = import_path.split(".")
        candidate_base = base_dir.joinpath(*parts)
    else:
        # Absolute import (assuming starting from app root or python path)
        # app.models -> backend/app/models.py
        # But wait, imports in backend usually start with "app." or are relative
        if import_path.startswith("app."):
            parts = import_path.split(".")[1:] # remove 'app'
            candidate_base = BACKEND_ROOT.joinpath(*parts)
        else:
            # Might be third party or root level
            return None

    # Try finding the file
    # It could be a file.py or a package/__init__.py
    
    # Case 1: file.py
    candidate = candidate_base.with_suffix(".py")
    if candidate.exists():
        return candidate
    
    # Case 2: package/__init__.py
    candidate = candidate_base / "__init__.py"
    if candidate.exists():
        return candidate
        
    return None

def find_backend_imports(file_path: Path) -> Set[Path]:
    imports = set()
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return imports

    # Regex for imports
    # from ... import ...
    # import ...
    patterns = [
        r'from\s+([\w\.]+)\s+import',
        r'import\s+([\w\.]+)',
    ]

    for pattern in patterns:
        matches = re.findall(pattern, content)
        for match in matches:
            resolved = resolve_backend_import(match, file_path)
            if resolved:
                imports.add(resolved)
    return imports

def main():
    print("=== Orphan File Detection Report ===\n")

    # --- Frontend Analysis ---
    print("Checking Frontend (frontend/src)...")
    fe_files = get_all_files(FRONTEND_ROOT, FRONTEND_EXTENSIONS, FRONTEND_IGNORE_PATTERNS)
    fe_referenced = set()

    for f in fe_files:
        imports = find_frontend_imports(f)
        fe_referenced.update(imports)

    fe_orphans = []
    for f in fe_files:
        rel_path = f.relative_to(FRONTEND_ROOT)
        if str(rel_path) in FRONTEND_ENTRY_POINTS:
            continue
        if f not in fe_referenced:
            fe_orphans.append(rel_path)

    if fe_orphans:
        print(f"Found {len(fe_orphans)} potential orphan files in Frontend:")
        for orphan in sorted(fe_orphans):
            print(f"  - {orphan}")
    else:
        print("No orphan files found in Frontend.")
    print("\n")

    # --- Backend Analysis ---
    print("Checking Backend (backend/app)...")
    be_files = get_all_files(BACKEND_ROOT, BACKEND_EXTENSIONS, BACKEND_IGNORE_PATTERNS)
    be_referenced = set()

    for f in be_files:
        imports = find_backend_imports(f)
        be_referenced.update(imports)

    be_orphans = []
    for f in be_files:
        rel_path = f.relative_to(BACKEND_ROOT)
        if str(rel_path) in BACKEND_ENTRY_POINTS:
            continue
        if f not in be_referenced:
            be_orphans.append(rel_path)

    if be_orphans:
        print(f"Found {len(be_orphans)} potential orphan files in Backend:")
        for orphan in sorted(be_orphans):
            print(f"  - {orphan}")
    else:
        print("No orphan files found in Backend.")

if __name__ == "__main__":
    main()
