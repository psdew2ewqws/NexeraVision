import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { 
  SecurityVulnerability, 
  SecurityScanResult, 
  PenetrationTestResult,
  VulnerabilityType,
  SecuritySeverity
} from '../interfaces/security.interface';

@Injectable()
export class SecurityScannerService {
  private readonly commonVulnerabilities = [
    'SQL_INJECTION',
    'XSS_REFLECTED',
    'XSS_STORED',
    'CSRF',
    'WEAK_AUTHENTICATION',
    'INSECURE_DIRECT_OBJECT_REFERENCE',
    'SECURITY_MISCONFIGURATION',
    'INSECURE_CRYPTOGRAPHIC_STORAGE',
    'INSUFFICIENT_TRANSPORT_LAYER_PROTECTION',
    'UNVALIDATED_REDIRECTS',
    'INJECTION_FLAWS',
    'BROKEN_ACCESS_CONTROL',
    'SENSITIVE_DATA_EXPOSURE',
    'XXE_INJECTION',
    'BROKEN_AUTHENTICATION',
    'USING_COMPONENTS_WITH_KNOWN_VULNERABILITIES'
  ];

  async performComprehensiveScan(): Promise<SecurityScanResult> {
    console.log('🔍 Starting comprehensive security scan...');
    
    const scanStart = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];

    // Authentication and Authorization Tests
    console.log('🔐 Scanning authentication and authorization...');
    const authVulns = await this.scanAuthentication();
    vulnerabilities.push(...authVulns);

    // Input Validation Tests
    console.log('📝 Scanning input validation...');
    const inputVulns = await this.scanInputValidation();
    vulnerabilities.push(...inputVulns);

    // API Security Tests
    console.log('🌐 Scanning API security...');
    const apiVulns = await this.scanApiSecurity();
    vulnerabilities.push(...apiVulns);

    // Data Protection Tests
    console.log('🔒 Scanning data protection...');
    const dataVulns = await this.scanDataProtection();
    vulnerabilities.push(...dataVulns);

    // Infrastructure Security Tests
    console.log('🏗️ Scanning infrastructure security...');
    const infraVulns = await this.scanInfrastructure();
    vulnerabilities.push(...infraVulns);

    // Third-party Dependencies
    console.log('📦 Scanning dependencies...');
    const depVulns = await this.scanDependencies();
    vulnerabilities.push(...depVulns);

    // Configuration Security
    console.log('⚙️ Scanning configuration security...');
    const configVulns = await this.scanConfiguration();
    vulnerabilities.push(...configVulns);

    const scanDuration = Date.now() - scanStart;
    const severity = this.calculateOverallSeverity(vulnerabilities);

    console.log(`✅ Security scan completed in ${scanDuration}ms`);
    console.log(`📊 Found ${vulnerabilities.length} vulnerabilities (${severity} severity)`);

    return {
      scanId: this.generateScanId(),
      timestamp: new Date(),
      duration: scanDuration,
      overallSeverity: severity,
      vulnerabilitiesFound: vulnerabilities.length,
      vulnerabilities,
      recommendations: this.generateRecommendations(vulnerabilities),
      complianceStatus: this.assessCompliance(vulnerabilities),
      riskScore: this.calculateRiskScore(vulnerabilities)
    };
  }

  private async scanAuthentication(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Test weak password policies
    const weakPasswordTest = await this.testWeakPasswordPolicies();
    if (weakPasswordTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.WEAK_AUTHENTICATION,
        severity: SecuritySeverity.HIGH,
        title: 'Weak Password Policy',
        description: 'Password policy does not meet security requirements',
        details: weakPasswordTest.details,
        recommendation: 'Implement strong password requirements: minimum 12 characters, complexity requirements, password history',
        cveId: null,
        affectedEndpoints: ['/auth/login', '/users/register'],
        riskScore: 8.5
      });
    }

    // Test JWT token security
    const jwtTest = await this.testJwtSecurity();
    if (jwtTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.BROKEN_AUTHENTICATION,
        severity: SecuritySeverity.CRITICAL,
        title: 'JWT Token Vulnerabilities',
        description: 'JWT tokens are not properly secured',
        details: jwtTest.details,
        recommendation: 'Use strong signing algorithms (RS256), implement proper expiration, secure token storage',
        cveId: null,
        affectedEndpoints: ['/auth/*'],
        riskScore: 9.2
      });
    }

    // Test session management
    const sessionTest = await this.testSessionManagement();
    if (sessionTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.BROKEN_AUTHENTICATION,
        severity: SecuritySeverity.MEDIUM,
        title: 'Insecure Session Management',
        description: 'Session management has security weaknesses',
        details: sessionTest.details,
        recommendation: 'Implement secure session management with proper timeout, secure cookies, CSRF protection',
        cveId: null,
        affectedEndpoints: ['/auth/session'],
        riskScore: 6.8
      });
    }

    // Test multi-factor authentication
    const mfaTest = await this.testMfaImplementation();
    if (mfaTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.WEAK_AUTHENTICATION,
        severity: SecuritySeverity.MEDIUM,
        title: 'Missing Multi-Factor Authentication',
        description: 'MFA is not implemented for sensitive operations',
        details: mfaTest.details,
        recommendation: 'Implement MFA for admin accounts and sensitive operations',
        cveId: null,
        affectedEndpoints: ['/admin/*', '/users/sensitive-operations'],
        riskScore: 7.1
      });
    }

    return vulnerabilities;
  }

  private async scanInputValidation(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // SQL Injection Tests
    const sqlInjectionTest = await this.testSqlInjection();
    if (sqlInjectionTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.SQL_INJECTION,
        severity: SecuritySeverity.CRITICAL,
        title: 'SQL Injection Vulnerability',
        description: 'Application is vulnerable to SQL injection attacks',
        details: sqlInjectionTest.details,
        recommendation: 'Use parameterized queries, input validation, and ORM frameworks',
        cveId: 'CWE-89',
        affectedEndpoints: sqlInjectionTest.endpoints,
        riskScore: 9.8
      });
    }

    // XSS Tests
    const xssTest = await this.testXssVulnerabilities();
    if (xssTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.XSS_REFLECTED,
        severity: SecuritySeverity.HIGH,
        title: 'Cross-Site Scripting (XSS)',
        description: 'Application is vulnerable to XSS attacks',
        details: xssTest.details,
        recommendation: 'Implement proper input sanitization, output encoding, CSP headers',
        cveId: 'CWE-79',
        affectedEndpoints: xssTest.endpoints,
        riskScore: 8.7
      });
    }

    // Command Injection Tests
    const cmdInjectionTest = await this.testCommandInjection();
    if (cmdInjectionTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.INJECTION_FLAWS,
        severity: SecuritySeverity.CRITICAL,
        title: 'Command Injection',
        description: 'Application allows command injection through user input',
        details: cmdInjectionTest.details,
        recommendation: 'Avoid system calls, use safe APIs, validate and sanitize all input',
        cveId: 'CWE-78',
        affectedEndpoints: cmdInjectionTest.endpoints,
        riskScore: 9.5
      });
    }

    // LDAP Injection Tests
    const ldapTest = await this.testLdapInjection();
    if (ldapTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.INJECTION_FLAWS,
        severity: SecuritySeverity.HIGH,
        title: 'LDAP Injection',
        description: 'LDAP queries are vulnerable to injection attacks',
        details: ldapTest.details,
        recommendation: 'Use parameterized LDAP queries and input validation',
        cveId: 'CWE-90',
        affectedEndpoints: ldapTest.endpoints,
        riskScore: 8.2
      });
    }

    return vulnerabilities;
  }

  private async scanApiSecurity(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // API Rate Limiting
    const rateLimitTest = await this.testRateLimiting();
    if (rateLimitTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.BROKEN_ACCESS_CONTROL,
        severity: SecuritySeverity.MEDIUM,
        title: 'Missing Rate Limiting',
        description: 'API endpoints lack proper rate limiting',
        details: rateLimitTest.details,
        recommendation: 'Implement rate limiting, throttling, and API quotas',
        cveId: null,
        affectedEndpoints: rateLimitTest.endpoints,
        riskScore: 6.5
      });
    }

    // API Authorization
    const authzTest = await this.testApiAuthorization();
    if (authzTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.BROKEN_ACCESS_CONTROL,
        severity: SecuritySeverity.HIGH,
        title: 'Broken API Authorization',
        description: 'API endpoints have authorization vulnerabilities',
        details: authzTest.details,
        recommendation: 'Implement proper RBAC, validate permissions on every request',
        cveId: null,
        affectedEndpoints: authzTest.endpoints,
        riskScore: 8.9
      });
    }

    // CORS Misconfiguration
    const corsTest = await this.testCorsMisconfiguration();
    if (corsTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.SECURITY_MISCONFIGURATION,
        severity: SecuritySeverity.MEDIUM,
        title: 'CORS Misconfiguration',
        description: 'CORS is misconfigured allowing potential attacks',
        details: corsTest.details,
        recommendation: 'Configure CORS properly, restrict origins, credentials handling',
        cveId: null,
        affectedEndpoints: corsTest.endpoints,
        riskScore: 6.8
      });
    }

    // API Versioning Security
    const versionTest = await this.testApiVersioning();
    if (versionTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.SECURITY_MISCONFIGURATION,
        severity: SecuritySeverity.LOW,
        title: 'API Versioning Issues',
        description: 'Old API versions with known vulnerabilities are still accessible',
        details: versionTest.details,
        recommendation: 'Deprecate old API versions, implement version-specific security controls',
        cveId: null,
        affectedEndpoints: versionTest.endpoints,
        riskScore: 4.2
      });
    }

    return vulnerabilities;
  }

  private async scanDataProtection(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Encryption at Rest
    const encryptionTest = await this.testDataEncryption();
    if (encryptionTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.INSECURE_CRYPTOGRAPHIC_STORAGE,
        severity: SecuritySeverity.HIGH,
        title: 'Insecure Data Storage',
        description: 'Sensitive data is not properly encrypted at rest',
        details: encryptionTest.details,
        recommendation: 'Implement AES-256 encryption for sensitive data, secure key management',
        cveId: 'CWE-312',
        affectedEndpoints: ['/users/*', '/payments/*'],
        riskScore: 8.6
      });
    }

    // Data Leakage Tests
    const leakageTest = await this.testDataLeakage();
    if (leakageTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.SENSITIVE_DATA_EXPOSURE,
        severity: SecuritySeverity.HIGH,
        title: 'Sensitive Data Exposure',
        description: 'Sensitive information is exposed in API responses',
        details: leakageTest.details,
        recommendation: 'Implement data filtering, remove sensitive fields from responses',
        cveId: 'CWE-200',
        affectedEndpoints: leakageTest.endpoints,
        riskScore: 8.3
      });
    }

    // PII Protection
    const piiTest = await this.testPiiProtection();
    if (piiTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.SENSITIVE_DATA_EXPOSURE,
        severity: SecuritySeverity.MEDIUM,
        title: 'PII Protection Issues',
        description: 'Personally Identifiable Information is not adequately protected',
        details: piiTest.details,
        recommendation: 'Implement PII masking, data minimization, consent management',
        cveId: null,
        affectedEndpoints: ['/users/profile', '/delivery/addresses'],
        riskScore: 7.4
      });
    }

    // Backup Security
    const backupTest = await this.testBackupSecurity();
    if (backupTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.INSECURE_CRYPTOGRAPHIC_STORAGE,
        severity: SecuritySeverity.MEDIUM,
        title: 'Insecure Backup Storage',
        description: 'Database backups are not properly secured',
        details: backupTest.details,
        recommendation: 'Encrypt backups, secure backup storage, implement retention policies',
        cveId: null,
        affectedEndpoints: null,
        riskScore: 6.9
      });
    }

    return vulnerabilities;
  }

  private async scanInfrastructure(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // SSL/TLS Configuration
    const tlsTest = await this.testTlsConfiguration();
    if (tlsTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.INSUFFICIENT_TRANSPORT_LAYER_PROTECTION,
        severity: SecuritySeverity.HIGH,
        title: 'Weak TLS Configuration',
        description: 'TLS configuration has security weaknesses',
        details: tlsTest.details,
        recommendation: 'Use TLS 1.3, strong cipher suites, proper certificate management',
        cveId: null,
        affectedEndpoints: ['*'],
        riskScore: 8.1
      });
    }

    // Security Headers
    const headersTest = await this.testSecurityHeaders();
    if (headersTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.SECURITY_MISCONFIGURATION,
        severity: SecuritySeverity.MEDIUM,
        title: 'Missing Security Headers',
        description: 'Important security headers are missing',
        details: headersTest.details,
        recommendation: 'Implement HSTS, CSP, X-Frame-Options, X-Content-Type-Options headers',
        cveId: null,
        affectedEndpoints: ['*'],
        riskScore: 6.7
      });
    }

    // Server Information Disclosure
    const infoDisclosureTest = await this.testInformationDisclosure();
    if (infoDisclosureTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.SENSITIVE_DATA_EXPOSURE,
        severity: SecuritySeverity.LOW,
        title: 'Information Disclosure',
        description: 'Server exposes sensitive information',
        details: infoDisclosureTest.details,
        recommendation: 'Remove server version headers, error message sanitization',
        cveId: null,
        affectedEndpoints: ['*'],
        riskScore: 3.8
      });
    }

    // Network Security
    const networkTest = await this.testNetworkSecurity();
    if (networkTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.SECURITY_MISCONFIGURATION,
        severity: SecuritySeverity.HIGH,
        title: 'Network Security Issues',
        description: 'Network configuration has security vulnerabilities',
        details: networkTest.details,
        recommendation: 'Implement proper firewall rules, network segmentation, intrusion detection',
        cveId: null,
        affectedEndpoints: null,
        riskScore: 8.4
      });
    }

    return vulnerabilities;
  }

  private async scanDependencies(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Known Vulnerable Dependencies
    const depTest = await this.testVulnerableDependencies();
    if (depTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.USING_COMPONENTS_WITH_KNOWN_VULNERABILITIES,
        severity: SecuritySeverity.HIGH,
        title: 'Vulnerable Dependencies',
        description: 'Application uses components with known vulnerabilities',
        details: depTest.details,
        recommendation: 'Update dependencies, implement security scanning in CI/CD',
        cveId: depTest.cveIds?.join(', '),
        affectedEndpoints: null,
        riskScore: 8.8
      });
    }

    // License Compliance
    const licenseTest = await this.testLicenseCompliance();
    if (licenseTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.SECURITY_MISCONFIGURATION,
        severity: SecuritySeverity.LOW,
        title: 'License Compliance Issues',
        description: 'Some dependencies have license compliance issues',
        details: licenseTest.details,
        recommendation: 'Review license compatibility, replace non-compliant dependencies',
        cveId: null,
        affectedEndpoints: null,
        riskScore: 3.2
      });
    }

    return vulnerabilities;
  }

  private async scanConfiguration(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Environment Variables
    const envTest = await this.testEnvironmentSecurity();
    if (envTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.SECURITY_MISCONFIGURATION,
        severity: SecuritySeverity.MEDIUM,
        title: 'Insecure Environment Configuration',
        description: 'Environment variables contain security issues',
        details: envTest.details,
        recommendation: 'Secure sensitive environment variables, use secrets management',
        cveId: null,
        affectedEndpoints: null,
        riskScore: 6.5
      });
    }

    // Default Credentials
    const credentialsTest = await this.testDefaultCredentials();
    if (credentialsTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.WEAK_AUTHENTICATION,
        severity: SecuritySeverity.CRITICAL,
        title: 'Default Credentials',
        description: 'Default or weak credentials are in use',
        details: credentialsTest.details,
        recommendation: 'Change all default credentials, implement strong password policies',
        cveId: null,
        affectedEndpoints: ['/admin', '/database'],
        riskScore: 9.7
      });
    }

    // Debug Mode
    const debugTest = await this.testDebugMode();
    if (debugTest.vulnerable) {
      vulnerabilities.push({
        type: VulnerabilityType.SECURITY_MISCONFIGURATION,
        severity: SecuritySeverity.MEDIUM,
        title: 'Debug Mode Enabled',
        description: 'Application is running in debug mode in production',
        details: debugTest.details,
        recommendation: 'Disable debug mode in production environments',
        cveId: null,
        affectedEndpoints: ['*'],
        riskScore: 7.1
      });
    }

    return vulnerabilities;
  }

  // Test Implementation Methods (Simulated for demonstration)
  private async testWeakPasswordPolicies(): Promise<{ vulnerable: boolean; details: string }> {
    // Simulate password policy testing
    const hasMinLength = true;
    const hasComplexity = false;
    const hasHistory = false;
    
    return {
      vulnerable: !hasComplexity || !hasHistory,
      details: `Password policy analysis: Min length: ${hasMinLength}, Complexity: ${hasComplexity}, History: ${hasHistory}`
    };
  }

  private async testJwtSecurity(): Promise<{ vulnerable: boolean; details: string }> {
    // Simulate JWT security testing
    const usesWeakAlgorithm = true;
    const hasShortExpiration = false;
    
    return {
      vulnerable: usesWeakAlgorithm || hasShortExpiration,
      details: `JWT analysis: Weak algorithm: ${usesWeakAlgorithm}, Short expiration: ${hasShortExpiration}`
    };
  }

  private async testSessionManagement(): Promise<{ vulnerable: boolean; details: string }> {
    return {
      vulnerable: false,
      details: 'Session management appears secure'
    };
  }

  private async testMfaImplementation(): Promise<{ vulnerable: boolean; details: string }> {
    return {
      vulnerable: true,
      details: 'MFA is not implemented for admin operations'
    };
  }

  private async testSqlInjection(): Promise<{ vulnerable: boolean; details: string; endpoints: string[] }> {
    return {
      vulnerable: false,
      details: 'No SQL injection vulnerabilities found - using parameterized queries',
      endpoints: []
    };
  }

  private async testXssVulnerabilities(): Promise<{ vulnerable: boolean; details: string; endpoints: string[] }> {
    return {
      vulnerable: true,
      details: 'Potential XSS vulnerability in user input fields',
      endpoints: ['/delivery/notes', '/users/profile']
    };
  }

  private async testCommandInjection(): Promise<{ vulnerable: boolean; details: string; endpoints: string[] }> {
    return {
      vulnerable: false,
      details: 'No command injection vulnerabilities detected',
      endpoints: []
    };
  }

  private async testLdapInjection(): Promise<{ vulnerable: boolean; details: string; endpoints: string[] }> {
    return {
      vulnerable: false,
      details: 'LDAP injection not applicable - LDAP not used',
      endpoints: []
    };
  }

  private async testRateLimiting(): Promise<{ vulnerable: boolean; details: string; endpoints: string[] }> {
    return {
      vulnerable: true,
      details: 'Rate limiting not implemented on authentication endpoints',
      endpoints: ['/auth/login', '/auth/register']
    };
  }

  private async testApiAuthorization(): Promise<{ vulnerable: boolean; details: string; endpoints: string[] }> {
    return {
      vulnerable: false,
      details: 'API authorization properly implemented',
      endpoints: []
    };
  }

  private async testCorsMisconfiguration(): Promise<{ vulnerable: boolean; details: string; endpoints: string[] }> {
    return {
      vulnerable: true,
      details: 'CORS allows all origins in development mode',
      endpoints: ['*']
    };
  }

  private async testApiVersioning(): Promise<{ vulnerable: boolean; details: string; endpoints: string[] }> {
    return {
      vulnerable: false,
      details: 'API versioning properly managed',
      endpoints: []
    };
  }

  private async testDataEncryption(): Promise<{ vulnerable: boolean; details: string }> {
    return {
      vulnerable: true,
      details: 'Some sensitive data fields are not encrypted at rest'
    };
  }

  private async testDataLeakage(): Promise<{ vulnerable: boolean; details: string; endpoints: string[] }> {
    return {
      vulnerable: true,
      details: 'Internal IDs and timestamps exposed in API responses',
      endpoints: ['/users/profile', '/delivery/orders']
    };
  }

  private async testPiiProtection(): Promise<{ vulnerable: boolean; details: string }> {
    return {
      vulnerable: true,
      details: 'PII data is not masked in logs and error messages'
    };
  }

  private async testBackupSecurity(): Promise<{ vulnerable: boolean; details: string }> {
    return {
      vulnerable: true,
      details: 'Database backups are not encrypted'
    };
  }

  private async testTlsConfiguration(): Promise<{ vulnerable: boolean; details: string }> {
    return {
      vulnerable: false,
      details: 'TLS configuration is secure (TLS 1.2+, strong ciphers)'
    };
  }

  private async testSecurityHeaders(): Promise<{ vulnerable: boolean; details: string }> {
    return {
      vulnerable: true,
      details: 'Missing CSP, HSTS, and X-Frame-Options headers'
    };
  }

  private async testInformationDisclosure(): Promise<{ vulnerable: boolean; details: string }> {
    return {
      vulnerable: true,
      details: 'Server version and technology stack exposed in headers'
    };
  }

  private async testNetworkSecurity(): Promise<{ vulnerable: boolean; details: string }> {
    return {
      vulnerable: false,
      details: 'Network security properly configured'
    };
  }

  private async testVulnerableDependencies(): Promise<{ vulnerable: boolean; details: string; cveIds?: string[] }> {
    return {
      vulnerable: true,
      details: 'Found 3 dependencies with known vulnerabilities',
      cveIds: ['CVE-2023-1234', 'CVE-2023-5678']
    };
  }

  private async testLicenseCompliance(): Promise<{ vulnerable: boolean; details: string }> {
    return {
      vulnerable: false,
      details: 'All dependencies have compatible licenses'
    };
  }

  private async testEnvironmentSecurity(): Promise<{ vulnerable: boolean; details: string }> {
    return {
      vulnerable: true,
      details: 'Some environment variables contain sensitive data in plain text'
    };
  }

  private async testDefaultCredentials(): Promise<{ vulnerable: boolean; details: string }> {
    return {
      vulnerable: false,
      details: 'No default credentials detected'
    };
  }

  private async testDebugMode(): Promise<{ vulnerable: boolean; details: string }> {
    return {
      vulnerable: process.env.NODE_ENV === 'development',
      details: `Debug mode status: ${process.env.NODE_ENV}`
    };
  }

  // Helper Methods
  private calculateOverallSeverity(vulnerabilities: SecurityVulnerability[]): SecuritySeverity {
    if (vulnerabilities.some(v => v.severity === SecuritySeverity.CRITICAL)) {
      return SecuritySeverity.CRITICAL;
    }
    if (vulnerabilities.some(v => v.severity === SecuritySeverity.HIGH)) {
      return SecuritySeverity.HIGH;
    }
    if (vulnerabilities.some(v => v.severity === SecuritySeverity.MEDIUM)) {
      return SecuritySeverity.MEDIUM;
    }
    return SecuritySeverity.LOW;
  }

  private calculateRiskScore(vulnerabilities: SecurityVulnerability[]): number {
    if (vulnerabilities.length === 0) return 0;
    
    const totalRisk = vulnerabilities.reduce((sum, vuln) => sum + vuln.riskScore, 0);
    return Math.round((totalRisk / vulnerabilities.length) * 10) / 10;
  }

  private generateRecommendations(vulnerabilities: SecurityVulnerability[]): string[] {
    const recommendations = new Set<string>();
    
    vulnerabilities.forEach(vuln => {
      recommendations.add(vuln.recommendation);
    });
    
    // Add general recommendations
    recommendations.add('Implement regular security scanning in CI/CD pipeline');
    recommendations.add('Conduct regular security training for development team');
    recommendations.add('Establish incident response procedures');
    recommendations.add('Implement security monitoring and logging');
    
    return Array.from(recommendations);
  }

  private assessCompliance(vulnerabilities: SecurityVulnerability[]): { 
    owasp: string; 
    pciDss: string; 
    gdpr: string; 
    issues: string[] 
  } {
    const criticalVulns = vulnerabilities.filter(v => v.severity === SecuritySeverity.CRITICAL);
    const highVulns = vulnerabilities.filter(v => v.severity === SecuritySeverity.HIGH);
    
    const issues: string[] = [];
    
    let owaspStatus = 'COMPLIANT';
    let pciStatus = 'COMPLIANT';
    let gdprStatus = 'COMPLIANT';
    
    if (criticalVulns.length > 0) {
      owaspStatus = 'NON_COMPLIANT';
      pciStatus = 'NON_COMPLIANT';
      issues.push('Critical vulnerabilities must be addressed for compliance');
    }
    
    if (highVulns.length > 2) {
      owaspStatus = 'PARTIALLY_COMPLIANT';
      if (highVulns.some(v => v.type === VulnerabilityType.SENSITIVE_DATA_EXPOSURE)) {
        pciStatus = 'NON_COMPLIANT';
        gdprStatus = 'NON_COMPLIANT';
        issues.push('Data protection vulnerabilities affect PCI DSS and GDPR compliance');
      }
    }
    
    return {
      owasp: owaspStatus,
      pciDss: pciStatus,
      gdpr: gdprStatus,
      issues
    };
  }

  private generateScanId(): string {
    return `scan-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }
}