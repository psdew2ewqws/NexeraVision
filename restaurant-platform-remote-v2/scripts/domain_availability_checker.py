#!/usr/bin/env python3
"""
Domain Availability Checker for Business Names
==============================================

This script checks domain availability using multiple methods:
1. DNS resolution checks
2. WHOIS database queries
3. HTTP response checks
4. Alternative domain strategy generation

Usage: python domain_availability_checker.py
"""

import socket
import requests
import whois
import dns.resolver
import time
import json
from datetime import datetime
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DomainAvailabilityChecker:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })

        # Promising business name candidates
        self.candidate_names = [
            'VEXOLY', 'ZEPHYX', 'SYNCORA', 'FLOWRIX', 'WASLYX',
            'QUANTYX', 'BYTORA', 'INTEXLY', 'UNIFLUX', 'BONDYX',
            'NEXAFY', 'PIXARA', 'DYNEX', 'XERION', 'VORTYX',
            'FLUXOR', 'ZENRIX', 'NEXBIT', 'SKYRIX', 'PROXLY'
        ]

        # Domain extensions to check (prioritizing .com)
        self.extensions = ['.com', '.net', '.org', '.io', '.app', '.tech', '.ai']

        # Suffix variations to try
        self.suffixes = ['', 'hq', 'io', 'app', 'tech', 'labs', 'sys', 'pro', 'hub']

        self.results = {}

    def check_dns_resolution(self, domain):
        """Check if domain resolves via DNS"""
        try:
            dns.resolver.resolve(domain, 'A')
            return True, "Domain resolves"
        except dns.resolver.NXDOMAIN:
            return False, "NXDOMAIN - Domain does not exist"
        except dns.resolver.NoAnswer:
            return True, "Domain exists but no A record"
        except Exception as e:
            return None, f"DNS check failed: {str(e)}"

    def check_whois(self, domain):
        """Check domain availability via WHOIS"""
        try:
            w = whois.whois(domain)
            if w.domain_name is None:
                return False, "Domain available (no WHOIS record)"
            else:
                creation_date = w.creation_date
                if isinstance(creation_date, list):
                    creation_date = creation_date[0]
                return True, f"Domain registered on {creation_date}"
        except whois.parser.PywhoisError as e:
            if "No match" in str(e) or "not found" in str(e).lower():
                return False, "Domain available (WHOIS: No match)"
            return None, f"WHOIS error: {str(e)}"
        except Exception as e:
            return None, f"WHOIS check failed: {str(e)}"

    def check_http_response(self, domain):
        """Check HTTP response to determine if site exists"""
        protocols = ['https://', 'http://']

        for protocol in protocols:
            try:
                url = f"{protocol}{domain}"
                response = self.session.get(url, timeout=10, allow_redirects=True)

                if response.status_code == 200:
                    return True, f"Active website ({protocol}) - Status: {response.status_code}"
                elif response.status_code == 404:
                    return False, f"No website found ({protocol}) - Status: 404"
                else:
                    return True, f"Website exists ({protocol}) - Status: {response.status_code}"

            except requests.exceptions.ConnectionError:
                continue
            except requests.exceptions.Timeout:
                continue
            except Exception as e:
                continue

        return False, "No HTTP response (likely available)"

    def comprehensive_domain_check(self, domain):
        """Perform comprehensive availability check"""
        logger.info(f"Checking domain: {domain}")

        results = {
            'domain': domain,
            'timestamp': datetime.now().isoformat(),
            'checks': {}
        }

        # DNS Check
        dns_exists, dns_msg = self.check_dns_resolution(domain)
        results['checks']['dns'] = {'exists': dns_exists, 'message': dns_msg}

        # WHOIS Check
        whois_exists, whois_msg = self.check_whois(domain)
        results['checks']['whois'] = {'exists': whois_exists, 'message': whois_msg}

        # HTTP Check
        http_exists, http_msg = self.check_http_response(domain)
        results['checks']['http'] = {'exists': http_exists, 'message': http_msg}

        # Availability Assessment
        availability_score = 0
        total_checks = 0

        for check_type, check_result in results['checks'].items():
            if check_result['exists'] is not None:
                total_checks += 1
                if check_result['exists'] == False:  # Domain appears available
                    availability_score += 1

        if total_checks > 0:
            availability_percentage = (availability_score / total_checks) * 100
            results['availability_score'] = availability_percentage

            if availability_percentage >= 67:  # 2 out of 3 checks suggest available
                results['likely_available'] = True
                results['confidence'] = 'High' if availability_percentage == 100 else 'Medium'
            else:
                results['likely_available'] = False
                results['confidence'] = 'Low'
        else:
            results['likely_available'] = None
            results['confidence'] = 'Unknown'

        return results

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
        logger.info(f"\n=== Checking Business Name: {business_name} ===")

        variations = self.generate_domain_variations(business_name)
        business_results = {
            'business_name': business_name,
            'total_variations': len(variations),
            'domains_checked': [],
            'available_domains': [],
            'registered_domains': [],
            'summary': {}
        }

        # Use ThreadPoolExecutor for concurrent checks
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_domain = {
                executor.submit(self.comprehensive_domain_check, domain): domain
                for domain in variations
            }

            for future in as_completed(future_to_domain):
                domain = future_to_domain[future]
                try:
                    result = future.result()
                    business_results['domains_checked'].append(result)

                    if result['likely_available']:
                        business_results['available_domains'].append({
                            'domain': domain,
                            'confidence': result['confidence'],
                            'score': result['availability_score']
                        })
                    else:
                        business_results['registered_domains'].append(domain)

                except Exception as e:
                    logger.error(f"Error checking {domain}: {str(e)}")

                # Rate limiting
                time.sleep(0.5)

        # Generate summary
        total_checked = len(business_results['domains_checked'])
        total_available = len(business_results['available_domains'])

        business_results['summary'] = {
            'total_domains_checked': total_checked,
            'likely_available': total_available,
            'likely_registered': total_checked - total_available,
            'availability_rate': (total_available / total_checked * 100) if total_checked > 0 else 0,
            'best_com_option': None,
            'best_alternatives': []
        }

        # Find best .com option
        com_options = [d for d in business_results['available_domains'] if d['domain'].endswith('.com')]
        if com_options:
            # Sort by confidence and score
            com_options.sort(key=lambda x: (x['confidence'] == 'High', x['score']), reverse=True)
            business_results['summary']['best_com_option'] = com_options[0]['domain']

        # Find best alternatives
        non_com_options = [d for d in business_results['available_domains'] if not d['domain'].endswith('.com')]
        non_com_options.sort(key=lambda x: (x['confidence'] == 'High', x['score']), reverse=True)
        business_results['summary']['best_alternatives'] = [d['domain'] for d in non_com_options[:3]]

        return business_results

    def run_comprehensive_check(self):
        """Run comprehensive check for all candidate names"""
        logger.info("Starting comprehensive domain availability check...")

        all_results = {
            'check_timestamp': datetime.now().isoformat(),
            'business_names': [],
            'overall_summary': {
                'total_names_checked': len(self.candidate_names),
                'names_with_com_available': 0,
                'best_opportunities': []
            }
        }

        for name in self.candidate_names:
            try:
                business_result = self.check_business_name(name)
                all_results['business_names'].append(business_result)

                # Track .com availability
                if business_result['summary']['best_com_option']:
                    all_results['overall_summary']['names_with_com_available'] += 1
                    all_results['overall_summary']['best_opportunities'].append({
                        'business_name': name,
                        'best_com_domain': business_result['summary']['best_com_option'],
                        'total_available': business_result['summary']['likely_available']
                    })

                logger.info(f"Completed checking {name}")
                time.sleep(1)  # Rate limiting between business names

            except Exception as e:
                logger.error(f"Error processing business name {name}: {str(e)}")

        # Sort best opportunities by total available domains
        all_results['overall_summary']['best_opportunities'].sort(
            key=lambda x: x['total_available'], reverse=True
        )

        return all_results

    def generate_report(self, results):
        """Generate a comprehensive availability report"""
        report = []

        report.append("=" * 80)
        report.append("DOMAIN AVAILABILITY REPORT FOR BUSINESS NAMES")
        report.append("=" * 80)
        report.append(f"Generated: {results['check_timestamp']}")
        report.append(f"Total Business Names Checked: {results['overall_summary']['total_names_checked']}")
        report.append(f"Names with .COM Available: {results['overall_summary']['names_with_com_available']}")
        report.append("")

        # Best Opportunities Section
        report.append("🏆 BEST OPPORTUNITIES (.COM AVAILABLE)")
        report.append("-" * 50)
        for opportunity in results['overall_summary']['best_opportunities'][:10]:
            report.append(f"✅ {opportunity['business_name']}")
            report.append(f"   Best .COM: {opportunity['best_com_domain']}")
            report.append(f"   Total Available Domains: {opportunity['total_available']}")
            report.append("")

        # Detailed Results
        report.append("\n📋 DETAILED RESULTS BY BUSINESS NAME")
        report.append("=" * 80)

        for business in results['business_names']:
            report.append(f"\n🏢 {business['business_name']}")
            report.append("-" * 30)

            summary = business['summary']
            report.append(f"Total Domains Checked: {summary['total_domains_checked']}")
            report.append(f"Likely Available: {summary['likely_available']}")
            report.append(f"Availability Rate: {summary['availability_rate']:.1f}%")

            if summary['best_com_option']:
                report.append(f"🎯 BEST .COM: {summary['best_com_option']}")
            else:
                report.append("❌ No .COM domains available")

            if summary['best_alternatives']:
                report.append("🔄 Best Alternatives:")
                for alt in summary['best_alternatives']:
                    report.append(f"   • {alt}")

            # Show high-confidence available domains
            high_confidence = [
                d['domain'] for d in business['available_domains']
                if d['confidence'] == 'High'
            ]
            if high_confidence:
                report.append("✅ High-Confidence Available:")
                for domain in high_confidence[:5]:  # Show top 5
                    report.append(f"   • {domain}")

            report.append("")

        return "\n".join(report)

def main():
    """Main execution function"""
    checker = DomainAvailabilityChecker()

    logger.info("🚀 Starting Domain Availability Checker")
    logger.info(f"Checking {len(checker.candidate_names)} business names")
    logger.info(f"Testing {len(checker.extensions)} extensions with {len(checker.suffixes)} suffix variations")

    # Run comprehensive check
    results = checker.run_comprehensive_check()

    # Generate and save report
    report = checker.generate_report(results)

    # Save results to files
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Save JSON results
    json_filename = f"/home/admin/restaurant-platform-remote-v2/scripts/domain_check_results_{timestamp}.json"
    with open(json_filename, 'w') as f:
        json.dump(results, f, indent=2)

    # Save text report
    report_filename = f"/home/admin/restaurant-platform-remote-v2/scripts/domain_availability_report_{timestamp}.txt"
    with open(report_filename, 'w') as f:
        f.write(report)

    print("\n" + "=" * 80)
    print("DOMAIN AVAILABILITY CHECK COMPLETED")
    print("=" * 80)
    print(f"📊 JSON Results: {json_filename}")
    print(f"📄 Text Report: {report_filename}")
    print("\n" + report)

    # Quick summary for console
    best_opportunities = results['overall_summary']['best_opportunities'][:5]
    if best_opportunities:
        print("\n🎯 TOP 5 OPPORTUNITIES WITH .COM AVAILABLE:")
        print("-" * 50)
        for i, opp in enumerate(best_opportunities, 1):
            print(f"{i}. {opp['business_name']} → {opp['best_com_domain']}")

if __name__ == "__main__":
    main()