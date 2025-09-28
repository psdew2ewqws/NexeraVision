#!/usr/bin/env python3
"""
Test Domain Checker - Quick test of the domain checking functionality
"""

import socket
import urllib.request
import urllib.error

def test_domain_check(domain):
    """Test domain availability check"""
    print(f"\nTesting: {domain}")
    print("-" * 40)

    # DNS Check
    try:
        ip = socket.gethostbyname(domain)
        print(f"✅ DNS: Resolves to {ip}")
        dns_exists = True
    except socket.gaierror as e:
        print(f"❌ DNS: Does not resolve ({str(e)})")
        dns_exists = False

    # HTTP Check (only if DNS resolves)
    if dns_exists:
        protocols = ['https://', 'http://']
        for protocol in protocols:
            try:
                url = f"{protocol}{domain}"
                req = urllib.request.Request(url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })

                with urllib.request.urlopen(req, timeout=5) as response:
                    status_code = response.getcode()
                    print(f"✅ HTTP: Active website ({protocol}) - Status: {status_code}")
                    return "REGISTERED"

            except urllib.error.HTTPError as e:
                if e.code == 404:
                    print(f"❌ HTTP: No content ({protocol}) - Status: 404")
                else:
                    print(f"⚠️  HTTP: Error ({protocol}) - Status: {e.code}")
            except urllib.error.URLError as e:
                print(f"❌ HTTP: Connection failed ({protocol}) - {str(e)}")
            except Exception as e:
                print(f"❌ HTTP: Error ({protocol}) - {str(e)}")

        return "DOMAIN_EXISTS_NO_SITE"
    else:
        return "LIKELY_AVAILABLE"

def main():
    """Test with specific domains from the candidate list"""
    print("🧪 Testing Domain Availability Checker")
    print("=" * 50)

    # Test domains - mix of likely available and definitely registered
    test_domains = [
        "google.com",          # Definitely registered
        "vexoly.com",          # Candidate from request
        "zephyx.com",          # Candidate from request
        "syncora.com",         # Candidate from request
        "quantyx.io",          # Alternative extension
        "nonexistentdomain12345.com"  # Likely available
    ]

    results = {}

    for domain in test_domains:
        try:
            result = test_domain_check(domain)
            results[domain] = result
        except Exception as e:
            print(f"❌ Error testing {domain}: {str(e)}")
            results[domain] = "ERROR"

    print("\n" + "=" * 50)
    print("📊 SUMMARY RESULTS")
    print("=" * 50)

    for domain, status in results.items():
        status_icon = {
            "REGISTERED": "🔴",
            "DOMAIN_EXISTS_NO_SITE": "🟡",
            "LIKELY_AVAILABLE": "🟢",
            "ERROR": "⚫"
        }.get(status, "❓")

        print(f"{status_icon} {domain:<25} → {status}")

    # Show likely available domains
    available = [domain for domain, status in results.items() if status == "LIKELY_AVAILABLE"]
    if available:
        print(f"\n✅ Likely available domains: {', '.join(available)}")

if __name__ == "__main__":
    main()