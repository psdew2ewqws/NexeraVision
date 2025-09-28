# Phase 4 Frontend Integration Guide
## RestaurantPrint Pro - Advanced Monitoring & Testing

### 🎯 Phase 4 Implementation Overview

Phase 4 introduces enterprise-grade monitoring, advanced analytics, and comprehensive testing capabilities to the RestaurantPrint Pro system. This document outlines the frontend integration points and real-time features.

## 🔧 Backend API Endpoints

### Advanced Analytics Endpoints

```typescript
// Printer Metrics
GET /api/v1/printing/phase4/analytics/printer/:printerId/metrics
Response: {
  printerId: string;
  printerName: string;
  performance: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    successRate: number;
    averageJobTime: number;
    throughputPerHour: number;
    peakHourThroughput: number;
    uptime: number;
  };
  health: {
    status: string;
    lastSeen: Date;
    consecutiveFailures: number;
    paperLevel: number;
    temperature: number;
    errorRate: number;
    maintenanceScore: number;
  };
  usage: {
    busyHours: Array<{ hour: number; jobCount: number }>;
    dailyVolume: Array<{ date: string; volume: number }>;
    weeklyTrend: number;
    monthlyTrend: number;
  };
  predictive: {
    nextMaintenanceDate: Date;
    expectedFailureRisk: number;
    paperRefillPrediction: Date;
    performanceTrend: 'improving' | 'stable' | 'declining';
    recommendations: string[];
  };
}

// System Analytics
GET /api/v1/printing/phase4/analytics/system
Response: {
  overview: {
    totalPrinters: number;
    activePrinters: number;
    healthyPrinters: number;
    systemUptime: number;
    totalJobsToday: number;
    systemEfficiency: number;
  };
  performance: {
    averageResponseTime: number;
    peakLoadCapacity: number;
    currentLoad: number;
    bottlenecks: Array<{
      printerId: string;
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
  };
  trends: {
    hourlyDistribution: Array<{ hour: number; volume: number; efficiency: number }>;
    dailyComparison: Array<{ date: string; jobs: number; efficiency: number }>;
    failurePatterns: Array<{ pattern: string; frequency: number; impact: string }>;
  };
  alerts: {
    critical: number;
    warning: number;
    info: number;
    recentAlerts: Array<{
      id: string;
      type: string;
      message: string;
      timestamp: Date;
      resolved: boolean;
    }>;
  };
}

// Performance Report
GET /api/v1/printing/phase4/analytics/performance/report?period=day
Response: {
  period: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  printerUtilization: Array<{
    printerId: string;
    name: string;
    jobCount: number;
    utilization: number;
  }>;
  timeDistribution: Array<{ label: string; count: number }>;
  errorAnalysis: {
    totalErrors: number;
    errorRate: number;
    commonErrors: Array<{ error: string; count: number }>;
  };
  recommendations: string[];
}

// Predictive Maintenance
GET /api/v1/printing/phase4/analytics/predictive/maintenance
Response: Array<{
  printerId: string;
  printerName: string;
  alertType: 'maintenance_due' | 'performance_decline' | 'failure_risk' | 'paper_low';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  prediction: {
    confidence: number;
    timeframe: string;
    basedOn: string[];
  };
  recommendations: string[];
}>
```

### Advanced Testing Endpoints

```typescript
// Available Test Suites
GET /api/v1/printing/phase4/testing/suites
Response: Array<{
  id: string;
  name: string;
  description: string;
  tests: Array<{
    id: string;
    name: string;
    type: 'connectivity' | 'print_quality' | 'performance' | 'stress' | 'paper_handling' | 'diagnostic';
    description: string;
    timeout: number;
    expectedDuration: number;
  }>;
  estimatedDuration: number;
}>

// Run Test Suite
POST /api/v1/printing/phase4/testing/printer/:printerId/suite/:suiteId
Body: {
  skipTests?: string[];
  parameters?: any;
}
Response: {
  id: string;
  printerId: string;
  printerName: string;
  suiteId: string;
  suiteName: string;
  startTime: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  estimatedDuration: number;
}

// Quick Test
POST /api/v1/printing/phase4/testing/printer/:printerId/quick
Response: {
  testId: string;
  printerId: string;
  status: 'running' | 'passed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  score?: number;
  details: {
    message: string;
    metrics?: any;
    errors?: string[];
    warnings?: string[];
    recommendations?: string[];
  };
}

// Network Latency Test
POST /api/v1/printing/phase4/testing/printer/:printerId/network
Response: {
  latency: number;
  throughput: number;
  packetLoss: number;
  stability: number;
  details: {
    pingResults: Array<{ time: number; success: boolean }>;
    jitter: number;
    bandwidth: number;
  };
}

// Test Report
GET /api/v1/printing/phase4/testing/report/:reportId
Response: {
  id: string;
  printerId: string;
  printerName: string;
  suiteId: string;
  suiteName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  overallScore: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results: Array<{
    testId: string;
    status: 'running' | 'passed' | 'failed' | 'skipped';
    startTime: Date;
    endTime?: Date;
    duration?: number;
    score?: number;
    details: {
      message: string;
      metrics?: any;
      errors?: string[];
      warnings?: string[];
      recommendations?: string[];
    };
  }>;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    warnings: number;
    criticalIssues: number;
  };
  recommendations: string[];
  networkMetrics?: {
    latency: number;
    throughput: number;
    packetLoss: number;
    stability: number;
  };
}

// Test History
GET /api/v1/printing/phase4/testing/history?printerId=xxx&limit=50
Response: Array<{
  id: string;
  printerId: string;
  printerName: string;
  suiteName: string;
  status: string;
  overallScore: number;
  startTime: Date;
  duration?: number;
  summary: any;
}>
```

### Enterprise Monitoring Endpoints

```typescript
// Company Dashboard
GET /api/v1/printing/phase4/enterprise/company/:companyId/dashboard
Response: {
  companyId: string;
  companyName: string;
  overview: {
    totalBranches: number;
    totalPrinters: number;
    activePrinters: number;
    systemHealth: number;
    totalJobsToday: number;
    systemEfficiency: number;
  };
  branches: Array<{
    branchId: string;
    branchName: string;
    printers: {
      total: number;
      online: number;
      offline: number;
      error: number;
      utilization: number;
    };
    performance: {
      totalJobs: number;
      completedJobs: number;
      failedJobs: number;
      successRate: number;
      averageJobTime: number;
    };
    alerts: {
      critical: number;
      warning: number;
      info: number;
    };
    health: {
      score: number;
      status: 'excellent' | 'good' | 'fair' | 'poor';
      issues: string[];
    };
    lastUpdate: Date;
  }>;
  alerts: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    recent: Array<{
      id: string;
      branchId: string;
      branchName: string;
      type: string;
      severity: string;
      message: string;
      timestamp: Date;
    }>;
  };
  trends: {
    dailyVolume: Array<{ date: string; volume: number; efficiency: number }>;
    branchComparison: Array<{
      branchId: string;
      branchName: string;
      volume: number;
      efficiency: number;
      health: number;
    }>;
    performanceMetrics: {
      averageResponseTime: number;
      peakThroughput: number;
      systemLoad: number;
    };
  };
  recommendations: Array<{
    type: 'performance' | 'maintenance' | 'optimization' | 'alert';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    branchId?: string;
    printerId?: string;
    estimatedImpact: string;
    actionRequired: string;
  }>;
}

// System-Wide Metrics (Super Admin Only)
GET /api/v1/printing/phase4/enterprise/system/metrics
Response: {
  overview: {
    totalCompanies: number;
    totalBranches: number;
    totalPrinters: number;
    activePrinters: number;
    systemUptime: number;
    totalJobsToday: number;
  };
  geographic: {
    regions: Array<{
      region: string;
      companies: number;
      branches: number;
      printers: number;
      performance: number;
    }>;
  };
  performance: {
    globalThroughput: number;
    averageResponseTime: number;
    systemEfficiency: number;
    topPerformingBranches: Array<{
      branchId: string;
      branchName: string;
      companyName: string;
      score: number;
    }>;
  };
  issues: {
    criticalAlerts: number;
    offlinePrinters: number;
    underperformingBranches: number;
    systemBottlenecks: Array<{
      type: string;
      description: string;
      affectedBranches: number;
      impact: string;
    }>;
  };
}

// Branch Monitoring
GET /api/v1/printing/phase4/enterprise/branch/:branchId/monitoring
Response: {
  branchId: string;
  branchName: string;
  companyId: string;
  companyName: string;
  printers: {
    total: number;
    online: number;
    offline: number;
    error: number;
    utilization: number;
  };
  performance: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    successRate: number;
    averageJobTime: number;
  };
  alerts: {
    critical: number;
    warning: number;
    info: number;
  };
  health: {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
  };
  lastUpdate: Date;
}

// Multi-Branch Comparison
POST /api/v1/printing/phase4/enterprise/branches/compare
Body: { branchIds: string[] }
Response: Array<{
  branchId: string;
  branchName: string;
  metrics: {
    printers: number;
    utilization: number;
    efficiency: number;
    healthScore: number;
    alertCount: number;
  };
  ranking: number;
  insights: string[];
}>

// Optimization Report
GET /api/v1/printing/phase4/enterprise/optimization/report
Response: {
  overview: {
    optimizationPotential: number;
    estimatedSavings: string;
    keyRecommendations: number;
  };
  categories: Array<{
    category: 'performance' | 'cost' | 'reliability' | 'efficiency';
    score: number;
    recommendations: Array<{
      title: string;
      description: string;
      impact: 'low' | 'medium' | 'high';
      effort: 'low' | 'medium' | 'high';
      branchesAffected: number;
      estimatedBenefit: string;
      actionSteps: string[];
    }>;
  }>;
  branchSpecific: Array<{
    branchId: string;
    branchName: string;
    optimizations: Array<{
      type: string;
      description: string;
      impact: string;
      actionRequired: string;
    }>;
  }>;
}

// Create Alert Rule
POST /api/v1/printing/phase4/enterprise/alerts/rule
Body: {
  name: string;
  description: string;
  conditions: Array<{
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
    value: number;
    timeWindow: number;
  }>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actions: {
    email?: boolean;
    webhook?: string;
    escalation?: {
      after: number;
      to: string[];
    };
  };
}
Response: {
  id: string;
  status: 'active' | 'pending';
  message: string;
}

// Alert History
GET /api/v1/printing/phase4/enterprise/alerts/history?branchId=xxx&severity=critical&limit=100
Response: Array<{
  id: string;
  branchId: string;
  branchName: string;
  printerId?: string;
  printerName?: string;
  type: string;
  severity: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  duration?: number;
}>
```

## 🔄 Real-Time WebSocket Events

### Connection & Subscription

```typescript
// Connect to WebSocket
const socket = io('http://localhost:3001/printing', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Subscribe to company updates
socket.emit('subscribeToCompanyUpdates', { 
  companyId: 'company-uuid' 
});

// Subscribe to branch updates
socket.emit('subscribeToBranchUpdates', { 
  branchId: 'branch-uuid' 
});

// Request real-time metrics
socket.emit('requestRealTimeMetrics', {
  type: 'company', // 'printer' | 'branch' | 'company' | 'system'
  id: 'company-uuid',
  interval: 30 // seconds (minimum 10)
});
```

### Real-Time Event Listeners

```typescript
// Phase 4 Enhanced Events

// System Analytics Updates
socket.on('systemAnalyticsUpdate', (data) => {
  console.log('System Analytics:', data);
  // Update dashboard with new analytics
  updateSystemDashboard(data.analytics);
});

// Company Dashboard Updates
socket.on('companyDashboardUpdate', (data) => {
  console.log('Company Dashboard:', data);
  // Update company dashboard
  updateCompanyDashboard(data.companyId, data.dashboard);
});

// Printer Test Progress
socket.on('printerTestProgress', (data) => {
  console.log('Test Progress:', data);
  // Update test progress UI
  updateTestProgress(data.reportId, data.progress);
});

// Predictive Maintenance Alerts
socket.on('predictiveMaintenanceAlert', (data) => {
  console.log('Predictive Alert:', data);
  // Show predictive maintenance notification
  showPredictiveAlert(data);
});

// Performance Metrics Updates
socket.on('performanceMetricsUpdate', (data) => {
  console.log('Performance Metrics:', data);
  // Update performance charts
  updatePerformanceCharts(data.metrics);
});

// Network Test Results
socket.on('networkLatencyTestCompleted', (data) => {
  console.log('Network Test:', data);
  // Display network test results
  displayNetworkResults(data);
});

// Enterprise Alerts
socket.on('enterpriseAlert', (data) => {
  console.log('Enterprise Alert:', data);
  // Show enterprise-level alert
  showEnterpriseAlert(data);
});

// Optimization Recommendations
socket.on('optimizationRecommendation', (data) => {
  console.log('Optimization:', data);
  // Display optimization recommendation
  showOptimizationRecommendation(data);
});

// Real-Time Metrics Stream
socket.on('realTimeMetrics', (data) => {
  console.log('Real-Time Metrics:', data);
  // Update real-time metric displays
  updateRealTimeMetrics(data.type, data.id, data.metrics);
});

// Test Completion Events
socket.on('printerTestCompleted', (data) => {
  console.log('Test Completed:', data);
  // Show test completion notification
  showTestCompletion(data);
});

socket.on('printerQuickTestCompleted', (data) => {
  console.log('Quick Test Completed:', data);
  // Update quick test status
  updateQuickTestStatus(data.printerId, data.result);
});

// Printer Test Started
socket.on('printerTestStarted', (data) => {
  console.log('Test Started:', data);
  // Show test started notification
  showTestStarted(data);
});

// Critical Maintenance Alerts
socket.on('criticalMaintenanceAlerts', (data) => {
  console.log('Critical Maintenance:', data);
  // Show critical maintenance notifications
  showCriticalMaintenance(data.alerts);
});

// Subscription Confirmations
socket.on('subscriptionConfirmed', (data) => {
  console.log('Subscription:', data);
  // Confirm subscription
  confirmSubscription(data);
});

// Real-Time Metrics Control
socket.on('realTimeMetricsStarted', (data) => {
  console.log('Metrics Started:', data);
  // Show metrics streaming indicator
  showMetricsStreaming(data);
});

socket.on('realTimeMetricsStopped', (data) => {
  console.log('Metrics Stopped:', data);
  // Hide metrics streaming indicator
  hideMetricsStreaming();
});
```

### Stop Real-Time Updates

```typescript
// Stop real-time metrics
socket.emit('stopRealTimeMetrics');

// Disconnect from WebSocket
socket.disconnect();
```

## 🎨 Frontend UI Components

### Phase 4 Dashboard Components

```typescript
// Advanced Analytics Dashboard
interface AnalyticsDashboardProps {
  companyId?: string;
  branchId?: string;
  realTime?: boolean;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  companyId,
  branchId,
  realTime = true
}) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial analytics
    fetchSystemAnalytics();
    
    if (realTime) {
      // Subscribe to real-time updates
      subscribeToAnalytics();
    }
  }, []);

  return (
    <div className="analytics-dashboard">
      <div className="overview-cards">
        <OverviewCard title="System Health" value={analytics?.overview.systemUptime} />
        <OverviewCard title="Active Printers" value={analytics?.overview.activePrinters} />
        <OverviewCard title="Jobs Today" value={analytics?.overview.totalJobsToday} />
        <OverviewCard title="Efficiency" value={analytics?.overview.systemEfficiency} />
      </div>
      
      <div className="charts-section">
        <PerformanceChart data={analytics?.trends.hourlyDistribution} />
        <BottlenecksChart data={analytics?.performance.bottlenecks} />
      </div>
      
      <div className="alerts-section">
        <AlertsPanel alerts={analytics?.alerts.recentAlerts} />
      </div>
    </div>
  );
};

// Printer Testing Interface
interface PrinterTestingProps {
  printerId: string;
  printerName: string;
}

const PrinterTesting: React.FC<PrinterTestingProps> = ({
  printerId,
  printerName
}) => {
  const [testSuites, setTestSuites] = useState([]);
  const [runningTests, setRunningTests] = useState(new Map());
  const [testHistory, setTestHistory] = useState([]);

  const runQuickTest = async () => {
    try {
      const result = await fetch(`/api/v1/printing/phase4/testing/printer/${printerId}/quick`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await result.json();
      
      // Show test progress
      showTestProgress(data);
    } catch (error) {
      console.error('Quick test failed:', error);
    }
  };

  const runTestSuite = async (suiteId: string) => {
    try {
      const result = await fetch(`/api/v1/printing/phase4/testing/printer/${printerId}/suite/${suiteId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parameters: { /* test parameters */ }
        })
      });
      const data = await result.json();
      
      // Track running test
      setRunningTests(prev => new Map(prev.set(data.id, data)));
      
      // Subscribe to test progress
      subscribeToTestProgress(data.id);
    } catch (error) {
      console.error('Test suite failed:', error);
    }
  };

  return (
    <div className="printer-testing">
      <div className="test-actions">
        <button onClick={runQuickTest} className="quick-test-btn">
          Quick Test
        </button>
        
        <div className="test-suites">
          {testSuites.map(suite => (
            <button 
              key={suite.id}
              onClick={() => runTestSuite(suite.id)}
              className="test-suite-btn"
            >
              {suite.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="running-tests">
        {Array.from(runningTests.values()).map(test => (
          <TestProgressCard key={test.id} test={test} />
        ))}
      </div>
      
      <div className="test-history">
        <TestHistoryTable history={testHistory} />
      </div>
    </div>
  );
};

// Enterprise Monitoring Dashboard
interface EnterpriseMonitoringProps {
  companyId: string;
}

const EnterpriseMonitoring: React.FC<EnterpriseMonitoringProps> = ({
  companyId
}) => {
  const [dashboard, setDashboard] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);

  useEffect(() => {
    // Fetch company dashboard
    fetchCompanyDashboard();
    
    // Subscribe to company updates
    subscribeToCompanyUpdates();
  }, []);

  return (
    <div className="enterprise-monitoring">
      <div className="company-overview">
        <CompanyOverviewCards data={dashboard?.overview} />
      </div>
      
      <div className="branches-grid">
        {dashboard?.branches.map(branch => (
          <BranchCard 
            key={branch.branchId}
            branch={branch}
            onClick={() => setSelectedBranch(branch)}
          />
        ))}
      </div>
      
      <div className="trends-section">
        <TrendsCharts data={dashboard?.trends} />
      </div>
      
      <div className="recommendations">
        <RecommendationsPanel recommendations={dashboard?.recommendations} />
      </div>
      
      {selectedBranch && (
        <BranchDetailModal 
          branch={selectedBranch}
          onClose={() => setSelectedBranch(null)}
        />
      )}
    </div>
  );
};
```

## 🔧 Integration Examples

### Complete Phase 4 Integration

```typescript
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const Phase4Dashboard: React.FC = () => {
  const [socket, setSocket] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [testResults, setTestResults] = useState(new Map());
  const [enterpriseData, setEnterpriseData] = useState(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const socketConnection = io('http://localhost:3001/printing', {
      auth: { token: localStorage.getItem('jwt') }
    });

    // Setup Phase 4 event listeners
    setupPhase4Listeners(socketConnection);
    
    setSocket(socketConnection);

    return () => {
      socketConnection.disconnect();
    };
  }, []);

  const setupPhase4Listeners = (socket) => {
    // Analytics updates
    socket.on('systemAnalyticsUpdate', (data) => {
      setAnalytics(data.analytics);
    });

    // Test progress
    socket.on('printerTestProgress', (data) => {
      setTestResults(prev => new Map(prev.set(data.reportId, data)));
    });

    // Predictive alerts
    socket.on('predictiveMaintenanceAlert', (data) => {
      showPredictiveMaintenanceNotification(data);
    });

    // Enterprise alerts
    socket.on('enterpriseAlert', (data) => {
      showEnterpriseAlert(data);
    });

    // Real-time metrics
    socket.on('realTimeMetrics', (data) => {
      updateRealTimeDisplays(data);
    });
  };

  const startRealTimeMonitoring = () => {
    socket.emit('requestRealTimeMetrics', {
      type: 'system',
      interval: 30
    });
  };

  const runSystemHealthCheck = async () => {
    try {
      const response = await fetch('/api/v1/printing/phase4/health/detailed', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt')}` }
      });
      const healthData = await response.json();
      
      console.log('System Health:', healthData);
      displayHealthStatus(healthData);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  return (
    <div className="phase4-dashboard">
      <div className="control-panel">
        <button onClick={startRealTimeMonitoring}>
          Start Real-Time Monitoring
        </button>
        <button onClick={runSystemHealthCheck}>
          System Health Check
        </button>
      </div>

      <div className="analytics-section">
        <AnalyticsDashboard data={analytics} />
      </div>

      <div className="testing-section">
        <TestingInterface results={testResults} />
      </div>

      <div className="enterprise-section">
        <EnterpriseMonitoring data={enterpriseData} />
      </div>
    </div>
  );
};
```

## 🎯 Key Phase 4 Features Implemented

### ✅ Advanced Analytics
- Real-time printer metrics and performance analytics
- Predictive maintenance with AI-powered recommendations
- System-wide performance monitoring and reporting
- Historical trend analysis and forecasting

### ✅ Comprehensive Testing
- Multi-tier test suites (Quick, Performance, Comprehensive, Diagnostic)
- Real-time test progress monitoring
- Network latency and throughput testing
- Automated test result analysis and recommendations

### ✅ Enterprise Monitoring
- Multi-location printer management
- Company-wide dashboard with branch comparison
- Advanced alerting and notification system
- Performance optimization recommendations

### ✅ Real-Time Integration
- WebSocket-based real-time updates
- Live metrics streaming
- Instant alert notifications
- Progressive test result updates

## 🚀 Next Steps

1. **Frontend Implementation**: Build React components using the provided API endpoints
2. **WebSocket Integration**: Implement real-time event handling
3. **Dashboard Creation**: Create comprehensive monitoring dashboards
4. **Testing Interface**: Build intuitive testing and diagnostics interface
5. **Alert System**: Implement notification and alert management system

This Phase 4 implementation provides enterprise-grade monitoring, testing, and analytics capabilities that can scale to manage hundreds of printers across multiple locations with real-time insights and predictive maintenance features.