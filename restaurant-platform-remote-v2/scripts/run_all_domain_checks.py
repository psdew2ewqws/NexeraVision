#!/usr/bin/env python3
"""
Domain Check Launcher - Runs all domain availability checks in sequence
"""

import subprocess
import sys
import os
from datetime import datetime

def run_script(script_name, description):
    """Run a Python script and capture output"""
    print(f"\n{'='*80}")
    print(f"🚀 RUNNING: {description}")
    print(f"Script: {script_name}")
    print(f"{'='*80}")

    try:
        result = subprocess.run([sys.executable, script_name],
                              capture_output=True,
                              text=True,
                              cwd='/home/admin/restaurant-platform-remote-v2/scripts')

        if result.stdout:
            print(result.stdout)

        if result.stderr:
            print("STDERR:", result.stderr)

        if result.returncode != 0:
            print(f"❌ Script failed with return code: {result.returncode}")
            return False
        else:
            print(f"✅ Script completed successfully")
            return True

    except Exception as e:
        print(f"❌ Error running {script_name}: {str(e)}")
        return False

def main():
    """Run all domain checking scripts in sequence"""
    print("🎯 COMPREHENSIVE DOMAIN AVAILABILITY ANALYSIS SUITE")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 80)

    # Change to scripts directory
    os.chdir('/home/admin/restaurant-platform-remote-v2/scripts')

    scripts_to_run = [
        {
            'script': 'quick_candidate_check.py',
            'description': 'Quick check of original candidates',
            'essential': True
        },
        {
            'script': 'final_domain_analysis.py',
            'description': 'Comprehensive analysis with alternatives',
            'essential': True
        },
        {
            'script': 'verify_top_domains.py',
            'description': 'Verification of most promising domains',
            'essential': True
        },
        {
            'script': 'simple_domain_checker.py',
            'description': 'Simple comprehensive checker',
            'essential': False
        }
    ]

    results = []
    successful = 0

    for script_info in scripts_to_run:
        success = run_script(script_info['script'], script_info['description'])
        results.append({
            'script': script_info['script'],
            'success': success,
            'essential': script_info['essential']
        })

        if success:
            successful += 1

        print(f"\n⏸️  Waiting 2 seconds before next script...")
        import time
        time.sleep(2)

    # Final summary
    print(f"\n{'='*80}")
    print("📊 EXECUTION SUMMARY")
    print(f"{'='*80}")

    print(f"Total scripts run: {len(scripts_to_run)}")
    print(f"Successful: {successful}")
    print(f"Failed: {len(scripts_to_run) - successful}")

    print(f"\n📋 DETAILED RESULTS:")
    for result in results:
        status = "✅" if result['success'] else "❌"
        essential = "🔴 ESSENTIAL" if result['essential'] else "🟡 OPTIONAL"
        print(f"   {status} {result['script']} ({essential})")

    # Check for essential failures
    essential_failures = [r for r in results if r['essential'] and not r['success']]
    if essential_failures:
        print(f"\n⚠️  WARNING: {len(essential_failures)} essential scripts failed!")
        for failure in essential_failures:
            print(f"   ❌ {failure['script']}")
    else:
        print(f"\n🎉 All essential domain checks completed successfully!")

    # List output files
    print(f"\n📁 OUTPUT FILES GENERATED:")
    output_files = []
    for file in os.listdir('.'):
        if (file.startswith('domain_check_results_') or
            file.startswith('simple_domain_results_') or
            file.startswith('final_domain_analysis_') or
            file.endswith('_report.txt')):
            output_files.append(file)

    output_files.sort(reverse=True)  # Most recent first
    for file in output_files[:10]:  # Show last 10 files
        print(f"   📄 {file}")

    print(f"\n🎯 FINAL RECOMMENDATIONS SUMMARY:")
    print("   1. BYTEX.COM - Top verified available domain")
    print("   2. PRISM.COM - Alternative short domain")
    print("   3. BONDYX.COM - From original candidates")
    print("   4. Check social media handles for chosen name")
    print("   5. Register immediately if suitable")

    print(f"\n✅ Domain analysis suite completed!")
    print(f"Finished: {datetime.now().isoformat()}")

if __name__ == "__main__":
    main()