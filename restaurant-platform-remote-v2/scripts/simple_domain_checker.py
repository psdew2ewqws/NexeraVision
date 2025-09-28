#!/usr/bin/env python3
"""
Simple Domain Availability Checker (No External Dependencies)
============================================================

This script checks domain availability using built-in Python libraries:
1. Socket-based DNS resolution checks
2. HTTP response checks using urllib
3. Basic availability assessment

Usage: python simple_domain_checker.py
"""

import socket
import urllib.request
import urllib.error
import json
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

class SimpleDomainChecker:
    def __init__(self):
        # Promising business name candidates from the request
        self.candidate_names = [
            'VEXOLY', 'ZEPHYX', 'SYNCORA', 'FLOWRIX', 'WASLYX',
            'QUANTYX', 'BYTORA', 'INTEXLY', 'UNIFLUX', 'BONDYX',
            # Additional promising candidates
            'NEXAFY', 'PIXARA', 'DYNEX', 'XERION', 'VORTYX',
            'FLUXOR', 'ZENRIX', 'NEXBIT', 'SKYRIX', 'PROXLY',
            'ZYLUX', 'NUVEX', 'RYTEX', 'QOREX', 'VEXAR'
        ]

        # Domain extensions to check (prioritizing .com)
        self.extensions = ['.com', '.net', '.org', '.io', '.app']

        # Suffix variations to try
        self.suffixes = ['', 'hq', 'io', 'app', 'tech', 'labs', 'hub']

    def check_dns_exists(self, domain):
        """Check if domain exists via DNS resolution"""
        try:
            socket.gethostbyname(domain)
            return True, "Domain resolves to IP"
        except socket.gaierror as e:
            if "Name or service not known" in str(e) or "nodename nor servname provided" in str(e):
                return False, "Domain does not resolve (likely available)"
            return None, f"DNS error: {str(e)}"
        except Exception as e:
            return None, f"DNS check failed: {str(e)}"

    def check_http_exists(self, domain):
        """Check if domain has active website"""
        protocols = ['https://', 'http://']

        for protocol in protocols:
            try:
                url = f"{protocol}{domain}"
                req = urllib.request.Request(url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })

                with urllib.request.urlopen(req, timeout=10) as response:
                    status_code = response.getcode()
                    if status_code == 200:
                        return True, f"Active website ({protocol}) - Status: {status_code}"
                    else:
                        return True, f"Website exists ({protocol}) - Status: {status_code}"

            except urllib.error.HTTPError as e:
                if e.code == 404:
                    return False, f"No website content ({protocol}) - Status: 404"
                else:
                    return True, f"Website exists but error ({protocol}) - Status: {e.code}"
            except urllib.error.URLError:
                continue  # Try next protocol
            except Exception:
                continue

        return False, "No HTTP response (likely no active website)"

    def quick_availability_check(self, domain):
        """Quick availability assessment using basic checks"""
        print(f"  Checking: {domain}")

        result = {
            'domain': domain,
            'timestamp': datetime.now().isoformat(),
            'dns_exists': None,
            'http_exists': None,
            'likely_available': None,
            'confidence': 'Unknown'
        }

        # DNS Check
        dns_exists, dns_msg = self.check_dns_exists(domain)
        result['dns_exists'] = dns_exists
        result['dns_message'] = dns_msg

        # HTTP Check (only if DNS resolves)
        if dns_exists:
            http_exists, http_msg = self.check_http_exists(domain)
            result['http_exists'] = http_exists
            result['http_message'] = http_msg
        else:
            result['http_exists'] = False
            result['http_message'] = "No DNS resolution, no HTTP check needed"

        # Simple availability assessment
        if dns_exists == False:
            result['likely_available'] = True
            result['confidence'] = 'High'
            result['reason'] = 'Domain does not resolve'
        elif dns_exists == True and http_exists == False:
            result['likely_available'] = False  # Domain exists but no active site
            result['confidence'] = 'Medium'
            result['reason'] = 'Domain resolves but no active website'
        elif dns_exists == True and http_exists == True:
            result['likely_available'] = False
            result['confidence'] = 'High'
            result['reason'] = 'Domain has active website'
        else:
            result['likely_available'] = None
            result['confidence'] = 'Unknown'
            result['reason'] = 'Unable to determine status'

        return result

    def generate_domain_variations(self, base_name):
        """Generate domain variations for a business name"""
        variations = []
        base_lower = base_name.lower()

        for suffix in self.suffixes:
            if suffix:
                domain_name = f"{base_lower}{suffix}"
            else:
                domain_name = base_lower

            for ext in self.extensions:
                variations.append(f"{domain_name}{ext}")

        return variations

    def check_business_name(self, business_name):
        """Check all variations of a business name"""
        print(f"\n=== {business_name} ===")

        variations = self.generate_domain_variations(business_name)
        results = {
            'business_name': business_name,
            'domains_checked': [],
            'available_domains': [],
            'registered_domains': [],
            'best_com_option': None,
            'best_alternatives': []
        }

        # Check each domain variation
        for domain in variations:
            try:
                result = self.quick_availability_check(domain)
                results['domains_checked'].append(result)

                if result['likely_available']:
                    results['available_domains'].append({
                        'domain': domain,
                        'confidence': result['confidence'],
                        'reason': result['reason']
                    })
                else:
                    results['registered_domains'].append(domain)

                # Small delay to be respectful
                time.sleep(0.2)

            except Exception as e:
                print(f"    Error checking {domain}: {str(e)}")

        # Find best options
        available_coms = [d for d in results['available_domains'] if d['domain'].endswith('.com')]
        if available_coms:
            # Sort by confidence
            available_coms.sort(key=lambda x: x['confidence'] == 'High', reverse=True)
            results['best_com_option'] = available_coms[0]['domain']

        # Best alternatives (non-.com)
        alternatives = [d for d in results['available_domains'] if not d['domain'].endswith('.com')]
        alternatives.sort(key=lambda x: x['confidence'] == 'High', reverse=True)
        results['best_alternatives'] = [d['domain'] for d in alternatives[:3]]

        # Print immediate results
        print(f"  Total variations checked: {len(variations)}")
        print(f"  Likely available: {len(results['available_domains'])}")

        if results['best_com_option']:
            print(f"  ✅ BEST .COM: {results['best_com_option']}")
        else:
            print(f"  ❌ No .COM available")

        if results['best_alternatives']:
            print(f"  🔄 Best alternatives: {', '.join(results['best_alternatives'][:2])}")

        return results

    def run_check(self):
        """Run availability check for all candidate names"""
        print("🚀 Starting Simple Domain Availability Check")
        print(f"Checking {len(self.candidate_names)} business names...")
        print("=" * 60)

        all_results = {
            'timestamp': datetime.now().isoformat(),
            'total_names': len(self.candidate_names),
            'business_results': [],
            'summary': {
                'names_with_com': [],
                'best_opportunities': []
            }
        }

        for name in self.candidate_names:
            try:
                business_result = self.check_business_name(name)
                all_results['business_results'].append(business_result)

                # Track .com availability
                if business_result['best_com_option']:
                    all_results['summary']['names_with_com'].append({
                        'name': name,
                        'domain': business_result['best_com_option']
                    })

                # Track best opportunities (most available domains)
                all_results['summary']['best_opportunities'].append({
                    'name': name,
                    'com_available': business_result['best_com_option'] is not None,
                    'total_available': len(business_result['available_domains']),
                    'best_com': business_result['best_com_option'],
                    'alternatives': business_result['best_alternatives'][:2]
                })

            except Exception as e:
                print(f"Error processing {name}: {str(e)}")

        # Sort opportunities by .com availability and total available domains
        all_results['summary']['best_opportunities'].sort(
            key=lambda x: (x['com_available'], x['total_available']), reverse=True
        )

        return all_results

    def generate_summary_report(self, results):
        """Generate a summary report"""
        lines = []

        lines.append("=" * 80)
        lines.append("🏆 DOMAIN AVAILABILITY SUMMARY REPORT")
        lines.append("=" * 80)
        lines.append(f"Generated: {results['timestamp']}")
        lines.append(f"Total Business Names Analyzed: {results['total_names']}")
        lines.append(f"Names with .COM Available: {len(results['summary']['names_with_com'])}")
        lines.append("")

        # Best .COM opportunities
        lines.append("🎯 BEST .COM OPPORTUNITIES:")
        lines.append("-" * 40)
        com_opportunities = [opp for opp in results['summary']['best_opportunities'] if opp['com_available']]

        if com_opportunities:
            for i, opp in enumerate(com_opportunities[:10], 1):
                lines.append(f"{i:2d}. {opp['name']:<12} → {opp['best_com']}")
        else:
            lines.append("   No .COM domains appear to be available")

        lines.append("")

        # Overall best opportunities
        lines.append("📊 OVERALL BEST OPPORTUNITIES (by total available domains):")
        lines.append("-" * 60)
        for i, opp in enumerate(results['summary']['best_opportunities'][:15], 1):
            com_status = "✅ .COM" if opp['com_available'] else "❌ no .COM"
            alternatives = f" | Alt: {', '.join(opp['alternatives'])}" if opp['alternatives'] else ""
            lines.append(f"{i:2d}. {opp['name']:<12} ({opp['total_available']} available) - {com_status}{alternatives}")

        lines.append("")

        # Quick recommendations
        lines.append("💡 QUICK RECOMMENDATIONS:")
        lines.append("-" * 30)
        if com_opportunities:
            top_com = com_opportunities[0]
            lines.append(f"• PRIMARY CHOICE: {top_com['name']} → {top_com['best_com']}")

            if len(com_opportunities) > 1:
                second_com = com_opportunities[1]
                lines.append(f"• BACKUP CHOICE: {second_com['name']} → {second_com['best_com']}")
        else:
            top_overall = results['summary']['best_opportunities'][0]
            lines.append(f"• BEST OVERALL: {top_overall['name']} (no .COM, but {top_overall['total_available']} alternatives)")

        return "\n".join(lines)

def main():
    """Main execution function"""
    checker = SimpleDomainChecker()

    # Run the check
    results = checker.run_check()

    # Generate report
    report = checker.generate_summary_report(results)

    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Save JSON results
    json_filename = f"/home/admin/restaurant-platform-remote-v2/scripts/simple_domain_results_{timestamp}.json"
    with open(json_filename, 'w') as f:
        json.dump(results, f, indent=2)

    # Save text report
    report_filename = f"/home/admin/restaurant-platform-remote-v2/scripts/simple_domain_report_{timestamp}.txt"
    with open(report_filename, 'w') as f:
        f.write(report)

    print("\n" + report)

    print(f"\n📁 Results saved to:")
    print(f"   JSON: {json_filename}")
    print(f"   Report: {report_filename}")

if __name__ == "__main__":
    main()