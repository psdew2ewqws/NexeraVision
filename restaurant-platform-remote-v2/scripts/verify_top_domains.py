#!/usr/bin/env python3
"""
Verify Top Domains - Double-check the most promising results
"""

import socket
import urllib.request
import urllib.error

def comprehensive_check(domain):
    """More thorough domain check"""
    print(f"\n🔍 Comprehensive check: {domain}")
    print("-" * 40)

    results = {
        'domain': domain,
        'dns_resolves': None,
        'has_website': None,
        'likely_status': 'UNKNOWN'
    }

    # DNS Check
    try:
        ip = socket.gethostbyname(domain)
        print(f"🔴 DNS: Resolves to {ip}")
        results['dns_resolves'] = True
    except socket.gaierror as e:
        print(f"🟢 DNS: Does not resolve - {str(e)}")
        results['dns_resolves'] = False
    except Exception as e:
        print(f"❓ DNS: Error - {str(e)}")
        results['dns_resolves'] = None

    # HTTP Check (only if DNS resolves)
    if results['dns_resolves']:
        for protocol in ['https://', 'http://']:
            try:
                url = f"{protocol}{domain}"
                req = urllib.request.Request(url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })

                with urllib.request.urlopen(req, timeout=10) as response:
                    status = response.getcode()
                    print(f"🔴 HTTP: Active website ({protocol}) - Status {status}")
                    results['has_website'] = True
                    break

            except urllib.error.HTTPError as e:
                if e.code == 404:
                    print(f"🟡 HTTP: Domain parked/no content ({protocol}) - Status 404")
                    results['has_website'] = False
                else:
                    print(f"🟡 HTTP: Website error ({protocol}) - Status {e.code}")
                    results['has_website'] = True
                break
            except urllib.error.URLError:
                continue
            except Exception as e:
                print(f"❓ HTTP: Connection error ({protocol}) - {str(e)}")
                continue

        if results['has_website'] is None:
            print(f"🟡 HTTP: No successful connection")
            results['has_website'] = False
    else:
        results['has_website'] = False

    # Overall assessment
    if results['dns_resolves'] == False:
        results['likely_status'] = 'AVAILABLE'
        print(f"✅ ASSESSMENT: Likely AVAILABLE")
    elif results['dns_resolves'] == True and results['has_website'] == False:
        results['likely_status'] = 'REGISTERED_PARKED'
        print(f"🟡 ASSESSMENT: REGISTERED but possibly parked/unused")
    elif results['dns_resolves'] == True and results['has_website'] == True:
        results['likely_status'] = 'REGISTERED_ACTIVE'
        print(f"🔴 ASSESSMENT: REGISTERED with active website")
    else:
        results['likely_status'] = 'UNKNOWN'
        print(f"❓ ASSESSMENT: Unable to determine")

    return results

def main():
    """Verify the most promising domains"""
    print("🔍 VERIFICATION OF TOP DOMAIN CANDIDATES")
    print("=" * 60)

    # Domains to verify - mix of our top candidates plus some originals
    verify_domains = [
        'bytex.com',
        'prism.com',      # This seems suspicious
        'voxex.com',
        'bondyx.com',     # From original candidates
        'waslyx.com',     # From original candidates
        'intexly.com',    # From original candidates
        'nexova.com',     # New alternative
        'zyxix.com'       # New alternative
    ]

    results = []

    for domain in verify_domains:
        try:
            result = comprehensive_check(domain)
            results.append(result)
        except Exception as e:
            print(f"❌ Error checking {domain}: {str(e)}")

    # Summary
    print(f"\n📊 VERIFICATION SUMMARY")
    print("=" * 60)

    truly_available = []
    registered_parked = []
    registered_active = []

    for result in results:
        if result['likely_status'] == 'AVAILABLE':
            truly_available.append(result['domain'])
        elif result['likely_status'] == 'REGISTERED_PARKED':
            registered_parked.append(result['domain'])
        elif result['likely_status'] == 'REGISTERED_ACTIVE':
            registered_active.append(result['domain'])

    print(f"\n✅ TRULY AVAILABLE .COM DOMAINS ({len(truly_available)}):")
    for domain in truly_available:
        business_name = domain.replace('.com', '').upper()
        print(f"   🎯 {business_name} → {domain}")

    print(f"\n🟡 REGISTERED BUT POTENTIALLY ACQUIRABLE ({len(registered_parked)}):")
    for domain in registered_parked:
        business_name = domain.replace('.com', '').upper()
        print(f"   💰 {business_name} → {domain} (may be for sale)")

    print(f"\n🔴 ACTIVELY USED - NOT AVAILABLE ({len(registered_active)}):")
    for domain in registered_active:
        business_name = domain.replace('.com', '').upper()
        print(f"   ❌ {business_name} → {domain}")

    # Final recommendations
    print(f"\n💡 FINAL VERIFIED RECOMMENDATIONS:")
    print("-" * 40)

    if truly_available:
        print(f"🏆 TOP CHOICE: {truly_available[0].replace('.com', '').upper()}")
        print(f"   Domain: {truly_available[0]}")
        print(f"   Status: Verified available")

        if len(truly_available) > 1:
            print(f"\n🥈 BACKUP CHOICES:")
            for domain in truly_available[1:3]:
                print(f"   • {domain.replace('.com', '').upper()} → {domain}")

        # Generate alternative suggestions
        print(f"\n🎨 BRANDING PACKAGE FOR TOP CHOICE:")
        top_name = truly_available[0].replace('.com', '').upper()
        top_domain = truly_available[0]
        print(f"   Business Name: {top_name}")
        print(f"   Website: {top_domain}")
        print(f"   Email: contact@{top_domain.replace('.com', '.com')}")
        print(f"   Social: @{top_domain.replace('.com', '')} (check availability)")

    else:
        print("⚠️  No domains verified as truly available")
        print("💡 Consider alternative strategies:")
        print("   • Use different extensions (.io, .app, .tech)")
        print("   • Generate new business name candidates")
        print("   • Consider acquiring parked domains")

if __name__ == "__main__":
    main()