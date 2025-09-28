export interface SecurityVulnerability {
  type: VulnerabilityType;
  severity: SecuritySeverity;
  title: string;
  description: string;
  details: string;
  recommendation: string;
  cveId: string | null;
  affectedEndpoints: string[] | null;
  riskScore: number;
  discoveredAt?: Date;
  remediated?: boolean;
  remediationDate?: Date;
}

export enum VulnerabilityType {
  SQL_INJECTION = 'SQL_INJECTION',
  XSS_REFLECTED = 'XSS_REFLECTED',
  XSS_STORED = 'XSS_STORED',
  CSRF = 'CSRF',
  WEAK_AUTHENTICATION = 'WEAK_AUTHENTICATION',
  INSECURE_DIRECT_OBJECT_REFERENCE = 'INSECURE_DIRECT_OBJECT_REFERENCE',
  SECURITY_MISCONFIGURATION = 'SECURITY_MISCONFIGURATION',
  INSECURE_CRYPTOGRAPHIC_STORAGE = 'INSECURE_CRYPTOGRAPHIC_STORAGE',
  INSUFFICIENT_TRANSPORT_LAYER_PROTECTION = 'INSUFFICIENT_TRANSPORT_LAYER_PROTECTION',
  UNVALIDATED_REDIRECTS = 'UNVALIDATED_REDIRECTS',
  INJECTION_FLAWS = 'INJECTION_FLAWS',
  BROKEN_ACCESS_CONTROL = 'BROKEN_ACCESS_CONTROL',
  SENSITIVE_DATA_EXPOSURE = 'SENSITIVE_DATA_EXPOSURE',
  XXE_INJECTION = 'XXE_INJECTION',
  BROKEN_AUTHENTICATION = 'BROKEN_AUTHENTICATION',
  USING_COMPONENTS_WITH_KNOWN_VULNERABILITIES = 'USING_COMPONENTS_WITH_KNOWN_VULNERABILITIES'
}

export enum SecuritySeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export interface SecurityScanResult {
  scanId: string;
  timestamp: Date;
  duration: number;
  overallSeverity: SecuritySeverity;
  vulnerabilitiesFound: number;
  vulnerabilities: SecurityVulnerability[];
  recommendations: string[];
  complianceStatus: {
    owasp: string;
    pciDss: string;
    gdpr: string;
    issues: string[];
  };
  riskScore: number;
  scanType?: 'automated' | 'manual' | 'penetration_test';
  scanScope?: string[];
  environment?: string;
}

export interface PenetrationTestResult {
  testId: string;
  testName: string;
  timestamp: Date;
  duration: number;
  tester: string;
  scope: string[];
  methodology: string[];
  findings: SecurityVulnerability[];
  executiveSummary: string;
  technicalSummary: string;
  remediationPlan: RemediationPlan[];
  riskMatrix: RiskMatrix;
  compliance: ComplianceAssessment;
  nextSteps: string[];
}

export interface RemediationPlan {
  vulnerabilityId: string;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  timeframe: string;
  effort: 'low' | 'medium' | 'high';
  resources: string[];
  steps: string[];
  validationCriteria: string[];
  owner: string;
  dueDate?: Date;
}

export interface RiskMatrix {
  critical: {
    count: number;
    items: string[];
  };
  high: {
    count: number;
    items: string[];
  };
  medium: {
    count: number;
    items: string[];
  };
  low: {
    count: number;
    items: string[];
  };
  totalRiskScore: number;
  riskTrend: 'increasing' | 'decreasing' | 'stable';
}

export interface ComplianceAssessment {
  standards: {
    owasp: {
      status: 'compliant' | 'partially_compliant' | 'non_compliant';
      score: number;
      gaps: string[];
    };
    pciDss: {
      status: 'compliant' | 'partially_compliant' | 'non_compliant';
      score: number;
      requirements: ComplianceRequirement[];
    };
    gdpr: {
      status: 'compliant' | 'partially_compliant' | 'non_compliant';
      score: number;
      articles: ComplianceArticle[];
    };
    iso27001: {
      status: 'compliant' | 'partially_compliant' | 'non_compliant';
      score: number;
      controls: ComplianceControl[];
    };
  };
  overallCompliance: number;
  recommendedActions: string[];
}

export interface ComplianceRequirement {
  id: string;
  title: string;
  status: 'met' | 'partially_met' | 'not_met';
  description: string;
  evidence?: string;
  gaps?: string[];
}

export interface ComplianceArticle {
  article: string;
  title: string;
  status: 'compliant' | 'partially_compliant' | 'non_compliant';
  requirements: string[];
  gaps?: string[];
}

export interface ComplianceControl {
  id: string;
  category: string;
  title: string;
  status: 'implemented' | 'partially_implemented' | 'not_implemented';
  description: string;
  maturityLevel: 1 | 2 | 3 | 4 | 5;
}

export interface SecurityTestCase {
  id: string;
  name: string;
  category: string;
  description: string;
  severity: SecuritySeverity;
  testSteps: string[];
  expectedResult: string;
  actualResult?: string;
  status: 'pass' | 'fail' | 'skip' | 'pending';
  evidence?: string[];
  recommendations?: string[];
}

export interface SecurityTestSuite {
  id: string;
  name: string;
  description: string;
  testCases: SecurityTestCase[];
  environment: string;
  timestamp: Date;
  tester: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    successRate: number;
  };
}

export interface ThreatModel {
  id: string;
  name: string;
  description: string;
  scope: string[];
  assets: ThreatAsset[];
  threats: Threat[];
  vulnerabilities: SecurityVulnerability[];
  mitigations: Mitigation[];
  residualRisk: number;
  lastUpdated: Date;
  reviewDate: Date;
}

export interface ThreatAsset {
  id: string;
  name: string;
  type: 'data' | 'system' | 'process' | 'network';
  value: 'high' | 'medium' | 'low';
  description: string;
  location: string;
  owner: string;
  dependencies: string[];
}

export interface Threat {
  id: string;
  name: string;
  description: string;
  category: string;
  likelihood: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  impact: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  threatActor: string;
  attackVector: string[];
  affectedAssets: string[];
  mitigations: string[];
}

export interface Mitigation {
  id: string;
  name: string;
  type: 'preventive' | 'detective' | 'corrective';
  description: string;
  implementation: 'implemented' | 'planned' | 'not_implemented';
  effectiveness: 'high' | 'medium' | 'low';
  cost: 'high' | 'medium' | 'low';
  owner: string;
  dueDate?: Date;
  threats: string[];
}

export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: SecuritySeverity;
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  discoveredAt: Date;
  reportedBy: string;
  assignedTo: string;
  category: string;
  affectedSystems: string[];
  impactAssessment: {
    confidentiality: 'high' | 'medium' | 'low' | 'none';
    integrity: 'high' | 'medium' | 'low' | 'none';
    availability: 'high' | 'medium' | 'low' | 'none';
    usersAffected: number;
    dataCompromised: boolean;
  };
  timeline: IncidentTimelineEvent[];
  containmentActions: string[];
  remediationActions: string[];
  lessonsLearned: string[];
  preventiveMeasures: string[];
  rootCause?: string;
  resolvedAt?: Date;
}

export interface IncidentTimelineEvent {
  timestamp: Date;
  event: string;
  description: string;
  actor: string;
  evidence?: string[];
}

export interface SecurityPolicy {
  id: string;
  name: string;
  version: string;
  description: string;
  scope: string[];
  owner: string;
  approvedBy: string;
  effectiveDate: Date;
  reviewDate: Date;
  status: 'draft' | 'active' | 'deprecated';
  sections: PolicySection[];
  procedures: SecurityProcedure[];
  exceptions: PolicyException[];
}

export interface PolicySection {
  id: string;
  title: string;
  content: string;
  requirements: string[];
  controls: string[];
  responsibilities: Record<string, string[]>;
}

export interface SecurityProcedure {
  id: string;
  name: string;
  description: string;
  steps: ProcedureStep[];
  frequency: string;
  owner: string;
  approver: string;
  lastReview: Date;
  nextReview: Date;
}

export interface ProcedureStep {
  stepNumber: number;
  description: string;
  responsible: string;
  tools: string[];
  expectedOutcome: string;
  documentation: string[];
}

export interface PolicyException {
  id: string;
  description: string;
  justification: string;
  requestedBy: string;
  approvedBy: string;
  approvalDate: Date;
  expiryDate: Date;
  compensatingControls: string[];
  reviewSchedule: string;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: Date;
  event: string;
  category: 'authentication' | 'authorization' | 'data_access' | 'configuration' | 'system';
  user: string;
  source: string;
  target: string;
  action: string;
  result: 'success' | 'failure' | 'error';
  details: Record<string, any>;
  riskLevel: 'high' | 'medium' | 'low';
  correlationId?: string;
}

export interface SecurityMetrics {
  period: {
    start: Date;
    end: Date;
  };
  vulnerabilities: {
    total: number;
    bySeverity: Record<SecuritySeverity, number>;
    byType: Record<string, number>;
    resolved: number;
    avgTimeToResolve: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
  incidents: {
    total: number;
    bySeverity: Record<SecuritySeverity, number>;
    avgTimeToDetect: number;
    avgTimeToResolve: number;
    recurrence: number;
  };
  compliance: {
    overallScore: number;
    byStandard: Record<string, number>;
    gaps: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
  threats: {
    detected: number;
    blocked: number;
    false_positives: number;
    effectiveness: number;
  };
  training: {
    completionRate: number;
    phishingSimulation: {
      clickRate: number;
      reportRate: number;
      improvement: number;
    };
  };
}