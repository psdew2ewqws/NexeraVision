#!/usr/bin/env python3
"""
Final Domain Analysis - Comprehensive availability check with alternatives
"""

import socket
import time
from datetime import datetime

def check_domain_availability(domain):
    """Check if domain is available via DNS"""
    try:
        socket.gethostbyname(domain)
        return False  # Domain is registered
    except socket.gaierror:
        return True   # Domain appears available
    except Exception:
        return None   # Unknown status

def generate_business_alternatives():
    """Generate additional business name alternatives"""
    # Tech-sounding combinations
    tech_bases = ['nex', 'vox', 'zyx', 'flux', 'byte', 'sync', 'flow', 'quant']
    tech_suffixes = ['ly', 'ix', 'ex', 'or', 'ar', 'yx', 'ra', 'on']

    alternatives = []

    # Generate combinations
    for base in tech_bases:
        for suffix in tech_suffixes:
            if base + suffix not in ['nexly', 'voxly']:  # Skip awkward combinations
                alternatives.append((base + suffix).upper())

    # Add some hand-picked good options
    handpicked = [
        'NEXOVA', 'VIXORA', 'ZYPHER', 'FLUXEN', 'BYTEX', 'VORTEX',
        'ZENITH', 'NEXUS', 'PIXEL', 'QUORUM', 'VERTEX', 'MATRIX',
        'AXIOM', 'PRISM', 'SYNTH', 'ORBIT', 'HELIX', 'ZENIT'
    ]

    return alternatives[:20] + handpicked

def main():
    """Comprehensive domain analysis"""
    print("🎯 FINAL DOMAIN AVAILABILITY ANALYSIS")
    print("=" * 60)

    # Original candidates from the request
    original_candidates = [
        'WASLYX', 'INTEXLY', 'BONDYX'  # These had .com available
    ]

    # Generate additional alternatives
    additional_candidates = generate_business_alternatives()

    all_candidates = original_candidates + additional_candidates

    print(f"Analyzing {len(all_candidates)} business name candidates...")

    available_com_domains = []
    available_alternatives = []

    for candidate in all_candidates:
        candidate_lower = candidate.lower()

        # Check base .com domain
        com_domain = f"{candidate_lower}.com"
        is_available = check_domain_availability(com_domain)

        if is_available:
            available_com_domains.append({
                'name': candidate,
                'domain': com_domain,
                'length': len(candidate),
                'pronounceable': not any(char*3 in candidate_lower for char in 'bcdfghjklmnpqrstvwxyz')
            })

        # Also check some key alternatives for top candidates
        if candidate in original_candidates or len(available_com_domains) < 10:
            alternatives = [
                f"{candidate_lower}.io",
                f"{candidate_lower}.app",
                f"{candidate_lower}hq.com",
                f"{candidate_lower}app.com"
            ]

            for alt_domain in alternatives:
                alt_available = check_domain_availability(alt_domain)
                if alt_available:
                    available_alternatives.append({
                        'name': candidate,
                        'domain': alt_domain,
                        'type': alt_domain.split('.')[-1]
                    })

        # Rate limiting
        time.sleep(0.05)

    # Sort results
    available_com_domains.sort(key=lambda x: (x['length'], x['name']))
    available_alternatives.sort(key=lambda x: (x['name'], x['domain']))

    # Generate final report
    print(f"\n🏆 TOP .COM DOMAINS AVAILABLE ({len(available_com_domains)}):")
    print("-" * 50)

    if available_com_domains:
        for i, domain_info in enumerate(available_com_domains[:15], 1):
            length_indicator = "📏" if domain_info['length'] <= 6 else "📐" if domain_info['length'] <= 8 else "📏📏"
            pronounce_indicator = "🗣️" if domain_info['pronounceable'] else "🤐"

            print(f"{i:2d}. {domain_info['name']:<12} → {domain_info['domain']:<20} {length_indicator} {pronounce_indicator}")
    else:
        print("   No .COM domains available from tested candidates")

    print(f"\n🔄 ALTERNATIVE EXTENSIONS AVAILABLE:")
    print("-" * 50)

    # Group alternatives by type
    alternatives_by_type = {}
    for alt in available_alternatives:
        alt_type = alt['type']
        if alt_type not in alternatives_by_type:
            alternatives_by_type[alt_type] = []
        alternatives_by_type[alt_type].append(alt)

    for ext_type in ['.io', '.app', '.com']:  # Prioritize these extensions
        if ext_type in alternatives_by_type:
            print(f"\n   {ext_type.upper()} domains:")
            for alt in alternatives_by_type[ext_type][:8]:
                print(f"     🔵 {alt['domain']}")

    # Final recommendations
    print(f"\n💡 FINAL RECOMMENDATIONS:")
    print("=" * 50)

    if available_com_domains:
        # Top 3 .com recommendations
        top_com = available_com_domains[:3]

        print("🥇 PRIMARY RECOMMENDATIONS (.COM):")
        for i, rec in enumerate(top_com, 1):
            reasons = []
            if rec['length'] <= 6:
                reasons.append("short")
            if rec['pronounceable']:
                reasons.append("pronounceable")
            if rec['name'] in original_candidates:
                reasons.append("original candidate")

            reason_str = f" ({', '.join(reasons)})" if reasons else ""
            print(f"   {i}. {rec['name']} → {rec['domain']}{reason_str}")

        print(f"\n🎯 BUSINESS NAME DECISION MATRIX:")
        print(f"   • BEST OVERALL: {top_com[0]['name']} ({top_com[0]['domain']})")
        print(f"   • BACKUP CHOICE: {top_com[1]['name']} ({top_com[1]['domain']})" if len(top_com) > 1 else "")

        # Show branding considerations
        print(f"\n🎨 BRANDING CONSIDERATIONS:")
        for rec in top_com[:2]:
            print(f"   • {rec['name']}:")
            print(f"     - Domain: {rec['domain']}")
            print(f"     - Email: hello@{rec['domain'].replace('.com', '')}.com")
            print(f"     - Length: {rec['length']} characters")
            print(f"     - Memorable: {'Yes' if rec['pronounceable'] and rec['length'] <= 7 else 'Moderate'}")

    else:
        print("   ⚠️  No .COM domains available from generated candidates")
        print("   🔄 Consider using .io or .app extensions")
        print("   💭 Generate new business name candidates")

    # Usage instructions
    print(f"\n📝 NEXT STEPS:")
    print(f"   1. Verify domain availability using a registrar (GoDaddy, Namecheap)")
    print(f"   2. Check trademark conflicts")
    print(f"   3. Test social media handle availability")
    print(f"   4. Register domain immediately if suitable")

    # Save results to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"/home/admin/restaurant-platform-remote-v2/scripts/final_domain_analysis_{timestamp}.txt"

    with open(filename, 'w') as f:
        f.write("FINAL DOMAIN AVAILABILITY ANALYSIS\n")
        f.write("=" * 60 + "\n")
        f.write(f"Generated: {datetime.now().isoformat()}\n\n")

        f.write("AVAILABLE .COM DOMAINS:\n")
        f.write("-" * 30 + "\n")
        for domain_info in available_com_domains:
            f.write(f"{domain_info['name']} → {domain_info['domain']}\n")

        f.write(f"\nTOP RECOMMENDATIONS:\n")
        f.write("-" * 20 + "\n")
        for i, rec in enumerate(available_com_domains[:5], 1):
            f.write(f"{i}. {rec['name']} ({rec['domain']})\n")

    print(f"\n📁 Detailed results saved to: {filename}")

if __name__ == "__main__":
    main()