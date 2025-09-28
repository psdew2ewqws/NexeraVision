#!/usr/bin/env python3
"""
Quick Candidate Check - Test the specific business names from the request
"""

import socket
import urllib.request
import urllib.error
import time

def quick_check(domain):
    """Quick availability check"""
    try:
        socket.gethostbyname(domain)
        return "REGISTERED"
    except socket.gaierror:
        return "AVAILABLE"
    except Exception:
        return "UNKNOWN"

def main():
    """Check the specific candidates mentioned in the request"""
    print("🎯 Quick Check: Specific Business Name Candidates")
    print("=" * 60)

    # Candidates from the request
    candidates = [
        'VEXOLY', 'ZEPHYX', 'SYNCORA', 'FLOWRIX', 'WASLYX',
        'QUANTYX', 'BYTORA', 'INTEXLY', 'UNIFLUX', 'BONDYX'
    ]

    extensions = ['.com', '.io', '.app', '.net']
    suffixes = ['', 'hq', 'app', 'tech']

    results = {
        'available_com': [],
        'available_alternatives': [],
        'registered': []
    }

    for candidate in candidates:
        print(f"\n🏢 Checking: {candidate}")
        print("-" * 30)

        candidate_lower = candidate.lower()
        candidate_results = []

        # Check different variations
        for suffix in suffixes:
            if suffix:
                base_name = f"{candidate_lower}{suffix}"
            else:
                base_name = candidate_lower

            for ext in extensions:
                domain = f"{base_name}{ext}"
                status = quick_check(domain)

                candidate_results.append({
                    'domain': domain,
                    'status': status
                })

                status_icon = "🟢" if status == "AVAILABLE" else "🔴" if status == "REGISTERED" else "❓"
                print(f"  {status_icon} {domain:<25} {status}")

                if status == "AVAILABLE":
                    if domain.endswith('.com'):
                        results['available_com'].append(domain)
                    else:
                        results['available_alternatives'].append(domain)
                elif status == "REGISTERED":
                    results['registered'].append(domain)

                time.sleep(0.1)  # Rate limiting

        # Check if base .com is available
        base_com = f"{candidate_lower}.com"
        base_status = quick_check(base_com)

        if base_status == "AVAILABLE":
            print(f"  ✅ PRIMARY .COM AVAILABLE: {base_com}")
            if base_com not in results['available_com']:
                results['available_com'].append(base_com)

    # Summary
    print("\n" + "=" * 60)
    print("📊 FINAL SUMMARY")
    print("=" * 60)

    print(f"\n🎯 .COM DOMAINS AVAILABLE ({len(results['available_com'])}):")
    if results['available_com']:
        for domain in sorted(results['available_com']):
            print(f"  ✅ {domain}")
    else:
        print("  ❌ No .COM domains available from these candidates")

    print(f"\n🔄 ALTERNATIVE EXTENSIONS AVAILABLE ({len(results['available_alternatives'])}):")
    if results['available_alternatives']:
        for domain in sorted(results['available_alternatives'])[:10]:  # Show top 10
            print(f"  🔵 {domain}")
        if len(results['available_alternatives']) > 10:
            print(f"  ... and {len(results['available_alternatives']) - 10} more")
    else:
        print("  ❌ No alternative extensions available")

    print(f"\n💡 RECOMMENDATIONS:")
    if results['available_com']:
        best_com = sorted(results['available_com'])[0]  # First alphabetically
        print(f"  🏆 BEST .COM CHOICE: {best_com.upper()}")

        # Find the business name
        base_name = best_com.split('.')[0]
        original_name = next((c for c in candidates if c.lower() in base_name), base_name.upper())
        print(f"  🏢 BUSINESS NAME: {original_name}")
    else:
        print("  ⚠️  Consider generating new business name candidates")
        print("  🔄 Or use alternative extensions like .io, .app, .tech")

    # Show count statistics
    total_checked = len(results['available_com']) + len(results['available_alternatives']) + len(results['registered'])
    available_count = len(results['available_com']) + len(results['available_alternatives'])
    availability_rate = (available_count / total_checked * 100) if total_checked > 0 else 0

    print(f"\n📈 STATISTICS:")
    print(f"  Total domains checked: {total_checked}")
    print(f"  Available: {available_count} ({availability_rate:.1f}%)")
    print(f"  Registered: {len(results['registered'])} ({100-availability_rate:.1f}%)")

if __name__ == "__main__":
    main()