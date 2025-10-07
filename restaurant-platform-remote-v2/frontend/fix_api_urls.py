#!/usr/bin/env python3
"""
Fix hardcoded API URLs across the frontend codebase.
This script replaces incorrect URL patterns with correct ones.
"""

import os
import re
from pathlib import Path

# Base directory
FRONTEND_DIR = Path("/home/admin/restaurant-platform-remote-v2/frontend")

# Patterns to fix
PATTERNS = [
    # Pattern 1: Doubled /api/v1 in fallback
    (
        r"process\.env\.NEXT_PUBLIC_API_URL \|\| 'http://localhost:3001/api/v1'",
        "process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'"
    ),
    # Pattern 2: Hardcoded with /api/v1
    (
        r"'http://localhost:3001/api/v1",
        "'http://localhost:3001"
    ),
    # Pattern 3: Double-quoted hardcoded with /api/v1
    (
        r'"http://localhost:3001/api/v1',
        '"http://localhost:3001'
    ),
]

def fix_file(file_path):
    """Fix API URLs in a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        changes_made = 0

        for pattern, replacement in PATTERNS:
            content, count = re.subn(pattern, replacement, content)
            changes_made += count

        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return changes_made
        return 0
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return 0

def find_files_with_issues():
    """Find all TypeScript files with hardcoded URLs."""
    files_to_fix = []

    for directory in ['pages', 'src']:
        dir_path = FRONTEND_DIR / directory
        if not dir_path.exists():
            continue

        for file_path in dir_path.rglob('*.ts*'):
            # Skip node_modules and .next
            if 'node_modules' in str(file_path) or '.next' in str(file_path):
                continue

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Check if file has issues (excluding printer port and health checks)
                if 'localhost:3001' in content:
                    # Skip if it's only printer port or health check
                    if '8182' not in content and 'health-check' not in content:
                        files_to_fix.append(file_path)
            except Exception as e:
                print(f"Error reading {file_path}: {e}")

    return files_to_fix

def main():
    print("=" * 50)
    print("API URL Fix Script")
    print("=" * 50)
    print()

    os.chdir(FRONTEND_DIR)

    # Find files
    print("Scanning for files with hardcoded URLs...")
    files_to_fix = find_files_with_issues()

    if not files_to_fix:
        print("No files with hardcoded URLs found!")
        return

    print(f"Found {len(files_to_fix)} files to fix")
    print()

    # Fix files
    total_changes = 0
    fixed_files = 0

    for file_path in files_to_fix:
        relative_path = file_path.relative_to(FRONTEND_DIR)
        changes = fix_file(file_path)
        if changes > 0:
            fixed_files += 1
            total_changes += changes
            print(f"✓ Fixed {relative_path} ({changes} changes)")

    print()
    print("=" * 50)
    print("Summary")
    print("=" * 50)
    print(f"Files scanned: {len(files_to_fix)}")
    print(f"Files modified: {fixed_files}")
    print(f"Total changes: {total_changes}")
    print()

    # Verify
    print("Verification:")
    remaining = find_files_with_issues()
    if remaining:
        print(f"⚠ {len(remaining)} files still have issues (may need manual review)")
        for f in remaining[:10]:  # Show first 10
            print(f"  - {f.relative_to(FRONTEND_DIR)}")
    else:
        print("✓ All files fixed!")

if __name__ == "__main__":
    main()
