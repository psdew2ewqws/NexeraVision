// Advanced Printer Testing Service - Phase 4 Implementation
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PrintingWebSocketGateway } from '../gateways/printing-websocket.gateway';

interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: PrinterTest[];
  estimatedDuration: number;
}

interface PrinterTest {
  id: string;
  name: string;
  type: 'connectivity' | 'print_quality' | 'performance' | 'stress' | 'paper_handling' | 'diagnostic';
  description: string;
  timeout: number;
  expectedDuration: number;
  parameters?: any;
}

interface TestResult {
  testId: string;
  printerId: string;
  status: 'running' | 'passed' | 'failed' | 'skipped' | 'timeout';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  score?: number; // 0-100
  details: {
    message: string;
    metrics?: any;
    errors?: string[];
    warnings?: string[];
    recommendations?: string[];
  };
  rawData?: any;
}

interface TestReport {
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
  results: TestResult[];
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

@Injectable()
export class PrinterTestingService {
  private readonly logger = new Logger(PrinterTestingService.name);
  private activeTests = new Map<string, TestReport>();
  private testSuites = new Map<string, TestSuite>();

  constructor(
    private prisma: PrismaService,
    private websocketGateway: PrintingWebSocketGateway,
  ) {
    this.logger.log('🧪 [TESTING] Initializing Advanced Printer Testing Service');
    this.initializeTestSuites();
  }

  async getAvailableTestSuites(): Promise<TestSuite[]> {
    return Array.from(this.testSuites.values());
  }

  async runTestSuite(
    printerId: string,
    suiteId: string,
    options?: {
      skipTests?: string[];
      parameters?: any;
      companyId?: string;
    }
  ): Promise<TestReport> {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite ${suiteId} not found`);
    }

    const printer = await this.prisma.printer.findUnique({
      where: { id: printerId },
      include: {
        company: { select: { name: true } },
        branch: { select: { name: true } }
      }
    });

    if (!printer) {
      throw new Error(`Printer ${printerId} not found`);
    }

    // Validate company access if provided
    if (options?.companyId && printer.companyId !== options.companyId) {
      throw new Error('Access denied to printer');
    }

    const reportId = `test_${printerId}_${Date.now()}`;
    const report: TestReport = {
      id: reportId,
      printerId,
      printerName: printer.name,
      suiteId,
      suiteName: suite.name,
      startTime: new Date(),
      overallScore: 0,
      status: 'running',
      results: [],
      summary: {
        totalTests: suite.tests.length,
        passed: 0,
        failed: 0,
        skipped: 0,
        warnings: 0,
        criticalIssues: 0
      },
      recommendations: []
    };

    this.activeTests.set(reportId, report);

    this.logger.log(`🧪 [TEST-START] Starting test suite '${suite.name}' for printer '${printer.name}'`);

    // Broadcast test start
    this.websocketGateway.server.emit('printerTestStarted', {
      reportId,
      printerId,
      printerName: printer.name,
      suiteName: suite.name,
      estimatedDuration: suite.estimatedDuration
    });

    // Run tests asynchronously
    this.executeTestSuite(report, suite, printer, options).catch(error => {
      this.logger.error(`Test suite execution failed: ${error.message}`);
      report.status = 'failed';
      report.endTime = new Date();
      report.duration = report.endTime.getTime() - report.startTime.getTime();
    });

    return report;
  }

  async getTestReport(reportId: string): Promise<TestReport | null> {
    return this.activeTests.get(reportId) || null;
  }

  async getTestHistory(
    printerId?: string,
    limit: number = 50,
    companyId?: string
  ): Promise<Array<{
    id: string;
    printerId: string;
    printerName: string;
    suiteName: string;
    status: string;
    overallScore: number;
    startTime: Date;
    duration?: number;
    summary: any;
  }>> {
    // In a real implementation, this would query from database
    // For now, return recent active tests
    const allTests = Array.from(this.activeTests.values());
    
    let filteredTests = allTests;
    if (printerId) {
      filteredTests = allTests.filter(t => t.printerId === printerId);
    }

    return filteredTests
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit)
      .map(test => ({
        id: test.id,
        printerId: test.printerId,
        printerName: test.printerName,
        suiteName: test.suiteName,
        status: test.status,
        overallScore: test.overallScore,
        startTime: test.startTime,
        duration: test.duration,
        summary: test.summary
      }));
  }

  async runQuickTest(printerId: string, companyId?: string): Promise<TestResult> {
    const printer = await this.prisma.printer.findUnique({
      where: { id: printerId }
    });

    if (!printer) {
      throw new Error(`Printer ${printerId} not found`);
    }

    if (companyId && printer.companyId !== companyId) {
      throw new Error('Access denied to printer');
    }

    this.logger.log(`🧪 [QUICK-TEST] Running quick test for printer '${printer.name}'`);

    const testResult: TestResult = {
      testId: 'quick_test',
      printerId,
      status: 'running',
      startTime: new Date(),
      details: {
        message: 'Running quick connectivity and print test...'
      }
    };

    // Broadcast test start
    this.websocketGateway.server.emit('printerQuickTestStarted', {
      printerId,
      printerName: printer.name
    });

    try {
      // Run quick connectivity test
      const connectivityResult = await this.testConnectivity(printer);
      
      if (!connectivityResult.success) {
        testResult.status = 'failed';
        testResult.score = 0;
        testResult.details = {
          message: 'Connectivity test failed',
          errors: [connectivityResult.error || 'Connection failed'],
          recommendations: [
            'Check printer power and connections',
            'Verify network connectivity',
            'Ensure printer is not in error state'
          ]
        };
      } else {
        // Run print test if connectivity passed
        const printResult = await this.testPrintQuality(printer, { quick: true });
        
        testResult.status = printResult.success ? 'passed' : 'failed';
        testResult.score = printResult.success ? 100 : 50;
        testResult.details = {
          message: printResult.success ? 'Quick test passed' : 'Print test failed',
          metrics: {
            connectivity: connectivityResult.metrics,
            printTest: printResult.metrics
          },
          errors: printResult.success ? [] : [printResult.error || 'Print test failed'],
          recommendations: printResult.success ? [] : [
            'Check paper supply and alignment',
            'Verify printer driver settings',
            'Test with different content'
          ]
        };
      }

      testResult.endTime = new Date();
      testResult.duration = testResult.endTime.getTime() - testResult.startTime.getTime();

      // Broadcast test completion
      this.websocketGateway.server.emit('printerQuickTestCompleted', {
        printerId,
        printerName: printer.name,
        result: testResult
      });

      // Update printer status
      await this.prisma.printer.update({
        where: { id: printerId },
        data: {
          status: testResult.status === 'passed' ? 'online' : 'error',
          lastSeen: new Date()
        }
      });

      return testResult;

    } catch (error) {
      testResult.status = 'failed';
      testResult.endTime = new Date();
      testResult.duration = testResult.endTime.getTime() - testResult.startTime.getTime();
      testResult.score = 0;
      testResult.details = {
        message: 'Quick test failed with error',
        errors: [error.message],
        recommendations: [
          'Check printer status and connectivity',
          'Verify printer configuration',
          'Contact technical support if issue persists'
        ]
      };

      return testResult;
    }
  }

  async runNetworkLatencyTest(printerId: string): Promise<{
    latency: number;
    throughput: number;
    packetLoss: number;
    stability: number;
    details: any;
  }> {
    const printer = await this.prisma.printer.findUnique({
      where: { id: printerId }
    });

    if (!printer) {
      throw new Error(`Printer ${printerId} not found`);
    }

    this.logger.log(`🌐 [NETWORK-TEST] Running network latency test for '${printer.name}'`);

    // Simulate network testing - in real implementation would use actual network tools
    const results = {
      latency: 10 + Math.random() * 50, // 10-60ms
      throughput: 50 + Math.random() * 950, // 50-1000 KB/s
      packetLoss: Math.random() * 2, // 0-2%
      stability: 90 + Math.random() * 10, // 90-100%
      details: {
        pingResults: Array.from({ length: 10 }, () => ({
          time: 10 + Math.random() * 50,
          success: Math.random() > 0.05
        })),
        jitter: Math.random() * 10,
        bandwidth: 100 + Math.random() * 900
      }
    };

    // Broadcast network test results
    this.websocketGateway.server.emit('networkLatencyTestCompleted', {
      printerId,
      printerName: printer.name,
      results
    });

    return results;
  }

  async cancelTest(reportId: string): Promise<boolean> {
    const report = this.activeTests.get(reportId);
    if (!report) {
      return false;
    }

    if (report.status === 'running') {
      report.status = 'cancelled';
      report.endTime = new Date();
      report.duration = report.endTime.getTime() - report.startTime.getTime();

      this.websocketGateway.server.emit('printerTestCancelled', {
        reportId,
        printerId: report.printerId,
        printerName: report.printerName
      });

      this.logger.log(`🧪 [TEST-CANCEL] Cancelled test suite for printer '${report.printerName}'`);
      return true;
    }

    return false;
  }

  private async executeTestSuite(
    report: TestReport,
    suite: TestSuite,
    printer: any,
    options?: any
  ): Promise<void> {
    try {
      for (const test of suite.tests) {
        // Skip test if in skip list
        if (options?.skipTests?.includes(test.id)) {
          const result: TestResult = {
            testId: test.id,
            printerId: printer.id,
            status: 'skipped',
            startTime: new Date(),
            endTime: new Date(),
            duration: 0,
            score: 0,
            details: {
              message: 'Test skipped by user'
            }
          };
          report.results.push(result);
          report.summary.skipped++;
          continue;
        }

        // Check if test was cancelled
        if (report.status === 'cancelled') {
          break;
        }

        this.logger.log(`🧪 [TEST-RUN] Running test '${test.name}' for printer '${printer.name}'`);

        const result = await this.executeTest(test, printer, options?.parameters);
        report.results.push(result);

        // Update summary
        switch (result.status) {
          case 'passed':
            report.summary.passed++;
            break;
          case 'failed':
            report.summary.failed++;
            if (result.details.errors && result.details.errors.length > 0) {
              report.summary.criticalIssues++;
            }
            break;
          case 'skipped':
            report.summary.skipped++;
            break;
        }

        if (result.details.warnings && result.details.warnings.length > 0) {
          report.summary.warnings++;
        }

        // Broadcast test progress
        this.websocketGateway.server.emit('printerTestProgress', {
          reportId: report.id,
          printerId: printer.id,
          testName: test.name,
          testResult: result,
          progress: (report.results.length / suite.tests.length) * 100
        });

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Calculate overall score and complete report
      this.completeTestReport(report);

    } catch (error) {
      this.logger.error(`Test suite execution failed: ${error.message}`);
      report.status = 'failed';
      report.endTime = new Date();
      report.duration = report.endTime.getTime() - report.startTime.getTime();
    }
  }

  private async executeTest(test: PrinterTest, printer: any, parameters?: any): Promise<TestResult> {
    const result: TestResult = {
      testId: test.id,
      printerId: printer.id,
      status: 'running',
      startTime: new Date(),
      details: {
        message: `Running ${test.name}...`
      }
    };

    try {
      switch (test.type) {
        case 'connectivity':
          return await this.runConnectivityTest(result, printer, test);
        case 'print_quality':
          return await this.runPrintQualityTest(result, printer, test);
        case 'performance':
          return await this.runPerformanceTest(result, printer, test);
        case 'stress':
          return await this.runStressTest(result, printer, test);
        case 'paper_handling':
          return await this.runPaperHandlingTest(result, printer, test);
        case 'diagnostic':
          return await this.runDiagnosticTest(result, printer, test);
        default:
          result.status = 'failed';
          result.details.message = `Unknown test type: ${test.type}`;
          return result;
      }
    } catch (error) {
      result.status = 'failed';
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();
      result.details = {
        message: `Test failed: ${error.message}`,
        errors: [error.message]
      };
      return result;
    }
  }

  private async runConnectivityTest(result: TestResult, printer: any, test: PrinterTest): Promise<TestResult> {
    const connectivityResult = await this.testConnectivity(printer);
    
    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();
    result.status = connectivityResult.success ? 'passed' : 'failed';
    result.score = connectivityResult.success ? 100 : 0;
    result.details = {
      message: connectivityResult.success ? 'Connectivity test passed' : 'Connectivity test failed',
      metrics: connectivityResult.metrics,
      errors: connectivityResult.success ? [] : [connectivityResult.error || 'Connection failed'],
      recommendations: connectivityResult.success ? [] : [
        'Check printer power and network connection',
        'Verify printer IP address and port',
        'Ensure firewall allows printer communication'
      ]
    };

    return result;
  }

  private async runPrintQualityTest(result: TestResult, printer: any, test: PrinterTest): Promise<TestResult> {
    const printResult = await this.testPrintQuality(printer, test.parameters);
    
    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();
    result.status = printResult.success ? 'passed' : 'failed';
    result.score = printResult.score || (printResult.success ? 100 : 0);
    result.details = {
      message: printResult.success ? 'Print quality test passed' : 'Print quality test failed',
      metrics: printResult.metrics,
      errors: printResult.success ? [] : [printResult.error || 'Print failed'],
      warnings: printResult.warnings || [],
      recommendations: printResult.recommendations || []
    };

    return result;
  }

  private async runPerformanceTest(result: TestResult, printer: any, test: PrinterTest): Promise<TestResult> {
    const performanceResult = await this.testPerformance(printer, test.parameters);
    
    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();
    result.status = performanceResult.success ? 'passed' : 'failed';
    result.score = performanceResult.score || 0;
    result.details = {
      message: performanceResult.success ? 'Performance test passed' : 'Performance test failed',
      metrics: performanceResult.metrics,
      errors: performanceResult.errors || [],
      warnings: performanceResult.warnings || [],
      recommendations: performanceResult.recommendations || []
    };

    return result;
  }

  private async runStressTest(result: TestResult, printer: any, test: PrinterTest): Promise<TestResult> {
    const stressResult = await this.testStress(printer, test.parameters);
    
    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();
    result.status = stressResult.success ? 'passed' : 'failed';
    result.score = stressResult.score || 0;
    result.details = {
      message: stressResult.success ? 'Stress test passed' : 'Stress test failed',
      metrics: stressResult.metrics,
      errors: stressResult.errors || [],
      warnings: stressResult.warnings || [],
      recommendations: stressResult.recommendations || []
    };

    return result;
  }

  private async runPaperHandlingTest(result: TestResult, printer: any, test: PrinterTest): Promise<TestResult> {
    const paperResult = await this.testPaperHandling(printer, test.parameters);
    
    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();
    result.status = paperResult.success ? 'passed' : 'failed';
    result.score = paperResult.score || 0;
    result.details = {
      message: paperResult.success ? 'Paper handling test passed' : 'Paper handling test failed',
      metrics: paperResult.metrics,
      errors: paperResult.errors || [],
      warnings: paperResult.warnings || [],
      recommendations: paperResult.recommendations || []
    };

    return result;
  }

  private async runDiagnosticTest(result: TestResult, printer: any, test: PrinterTest): Promise<TestResult> {
    const diagnosticResult = await this.testDiagnostics(printer, test.parameters);
    
    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();
    result.status = diagnosticResult.success ? 'passed' : 'failed';
    result.score = diagnosticResult.score || 0;
    result.details = {
      message: diagnosticResult.success ? 'Diagnostic test passed' : 'Diagnostic test failed',
      metrics: diagnosticResult.metrics,
      errors: diagnosticResult.errors || [],
      warnings: diagnosticResult.warnings || [],
      recommendations: diagnosticResult.recommendations || []
    };

    return result;
  }

  // Individual test implementations
  private async testConnectivity(printer: any): Promise<{
    success: boolean;
    error?: string;
    metrics: any;
  }> {
    // Simulate connectivity test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const success = Math.random() > 0.1; // 90% success rate
    
    return {
      success,
      error: success ? undefined : 'Connection timeout',
      metrics: {
        responseTime: 10 + Math.random() * 50,
        connectionType: printer.connection,
        status: success ? 'online' : 'offline'
      }
    };
  }

  private async testPrintQuality(printer: any, parameters: any = {}): Promise<{
    success: boolean;
    error?: string;
    score?: number;
    metrics: any;
    warnings?: string[];
    recommendations?: string[];
  }> {
    // Simulate print quality test
    const duration = parameters.quick ? 1000 : 5000;
    await new Promise(resolve => setTimeout(resolve, duration));
    
    const success = Math.random() > 0.15; // 85% success rate
    const score = success ? 70 + Math.random() * 30 : Math.random() * 40;
    
    const warnings = [];
    const recommendations = [];
    
    if (score < 90) {
      warnings.push('Print quality could be improved');
      recommendations.push('Check print head alignment');
    }
    
    if (score < 70) {
      recommendations.push('Clean print head', 'Check paper quality');
    }
    
    return {
      success,
      error: success ? undefined : 'Print job failed',
      score,
      metrics: {
        printTime: duration,
        qualityScore: score,
        alignment: 'good',
        density: 'optimal'
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async testPerformance(printer: any, parameters: any = {}): Promise<{
    success: boolean;
    score: number;
    metrics: any;
    errors?: string[];
    warnings?: string[];
    recommendations?: string[];
  }> {
    // Simulate performance test
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const jobsPerMinute = 15 + Math.random() * 25; // 15-40 jobs/min
    const averageJobTime = 1500 + Math.random() * 1000; // 1.5-2.5 seconds
    const success = jobsPerMinute > 10 && averageJobTime < 3000;
    
    const score = Math.min(100, (jobsPerMinute / 40) * 50 + ((3000 - averageJobTime) / 3000) * 50);
    
    const warnings = [];
    const recommendations = [];
    
    if (jobsPerMinute < 20) {
      warnings.push('Below optimal throughput');
      recommendations.push('Check for processing bottlenecks');
    }
    
    if (averageJobTime > 2000) {
      warnings.push('Slower than expected processing time');
      recommendations.push('Optimize print job complexity');
    }
    
    return {
      success,
      score,
      metrics: {
        jobsPerMinute,
        averageJobTime,
        throughput: jobsPerMinute,
        efficiency: score
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async testStress(printer: any, parameters: any = {}): Promise<{
    success: boolean;
    score: number;
    metrics: any;
    errors?: string[];
    warnings?: string[];
    recommendations?: string[];
  }> {
    // Simulate stress test
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const jobCount = parameters.jobCount || 50;
    const successfulJobs = Math.floor(jobCount * (0.8 + Math.random() * 0.2));
    const failedJobs = jobCount - successfulJobs;
    
    const success = successfulJobs / jobCount > 0.9;
    const score = (successfulJobs / jobCount) * 100;
    
    const warnings = [];
    const recommendations = [];
    
    if (score < 95) {
      warnings.push(`${failedJobs} jobs failed during stress test`);
      recommendations.push('Monitor printer during high load periods');
    }
    
    if (score < 80) {
      recommendations.push('Consider load balancing', 'Check printer cooling');
    }
    
    return {
      success,
      score,
      metrics: {
        totalJobs: jobCount,
        successfulJobs,
        failedJobs,
        successRate: score,
        peakThroughput: 30 + Math.random() * 20
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async testPaperHandling(printer: any, parameters: any = {}): Promise<{
    success: boolean;
    score: number;
    metrics: any;
    errors?: string[];
    warnings?: string[];
    recommendations?: string[];
  }> {
    // Simulate paper handling test
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const jamRate = Math.random() * 5; // 0-5% jam rate
    const feedAccuracy = 95 + Math.random() * 5; // 95-100% accuracy
    const success = jamRate < 2 && feedAccuracy > 98;
    
    const score = Math.min(100, ((5 - jamRate) / 5) * 50 + (feedAccuracy / 100) * 50);
    
    const warnings = [];
    const recommendations = [];
    
    if (jamRate > 1) {
      warnings.push('Higher than normal jam rate detected');
      recommendations.push('Check paper path for obstructions', 'Verify paper specifications');
    }
    
    if (feedAccuracy < 99) {
      warnings.push('Paper feed accuracy below optimal');
      recommendations.push('Calibrate paper feed mechanism');
    }
    
    return {
      success,
      score,
      metrics: {
        jamRate,
        feedAccuracy,
        paperAlignment: 'good',
        cutterFunction: 'operational'
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async testDiagnostics(printer: any, parameters: any = {}): Promise<{
    success: boolean;
    score: number;
    metrics: any;
    errors?: string[];
    warnings?: string[];
    recommendations?: string[];
  }> {
    // Simulate diagnostic test
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    const temperature = 35 + Math.random() * 15; // 35-50°C
    const voltage = 11.8 + Math.random() * 0.4; // 11.8-12.2V
    const memoryUsage = 30 + Math.random() * 40; // 30-70%
    
    const success = temperature < 45 && voltage > 11.9 && voltage < 12.1 && memoryUsage < 80;
    
    let score = 100;
    if (temperature > 40) score -= 10;
    if (voltage < 11.9 || voltage > 12.1) score -= 15;
    if (memoryUsage > 70) score -= 10;
    
    const warnings = [];
    const recommendations = [];
    
    if (temperature > 40) {
      warnings.push('Operating temperature above optimal range');
      recommendations.push('Check ventilation', 'Reduce ambient temperature');
    }
    
    if (voltage < 11.9 || voltage > 12.1) {
      warnings.push('Power supply voltage outside normal range');
      recommendations.push('Check power supply and connections');
    }
    
    if (memoryUsage > 70) {
      warnings.push('High memory usage detected');
      recommendations.push('Restart printer to clear memory');
    }
    
    return {
      success,
      score,
      metrics: {
        temperature,
        voltage,
        memoryUsage,
        firmwareVersion: '1.2.3',
        hardwareRevision: 'Rev C'
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private completeTestReport(report: TestReport): void {
    report.status = 'completed';
    report.endTime = new Date();
    report.duration = report.endTime.getTime() - report.startTime.getTime();

    // Calculate overall score
    const scoredResults = report.results.filter(r => r.score !== undefined);
    if (scoredResults.length > 0) {
      report.overallScore = Math.round(
        scoredResults.reduce((sum, r) => sum + (r.score || 0), 0) / scoredResults.length
      );
    }

    // Collect all recommendations
    const allRecommendations = new Set<string>();
    report.results.forEach(result => {
      if (result.details.recommendations) {
        result.details.recommendations.forEach(rec => allRecommendations.add(rec));
      }
    });
    report.recommendations = Array.from(allRecommendations);

    // Broadcast test completion
    this.websocketGateway.server.emit('printerTestCompleted', {
      reportId: report.id,
      printerId: report.printerId,
      printerName: report.printerName,
      overallScore: report.overallScore,
      summary: report.summary,
      recommendations: report.recommendations
    });

    this.logger.log(`🧪 [TEST-COMPLETE] Test suite completed for printer '${report.printerName}' - Score: ${report.overallScore}%`);

    // Clean up old reports (keep only last 50)
    const allReports = Array.from(this.activeTests.entries());
    if (allReports.length > 50) {
      const sortedReports = allReports.sort((a, b) => 
        (b[1].endTime?.getTime() || 0) - (a[1].endTime?.getTime() || 0)
      );
      
      // Remove oldest reports
      for (let i = 50; i < sortedReports.length; i++) {
        this.activeTests.delete(sortedReports[i][0]);
      }
    }
  }

  private initializeTestSuites(): void {
    // Comprehensive Test Suite
    this.testSuites.set('comprehensive', {
      id: 'comprehensive',
      name: 'Comprehensive Test Suite',
      description: 'Complete printer evaluation including all test categories',
      estimatedDuration: 300000, // 5 minutes
      tests: [
        {
          id: 'connectivity_basic',
          name: 'Basic Connectivity',
          type: 'connectivity',
          description: 'Test basic printer connectivity and response',
          timeout: 30000,
          expectedDuration: 5000
        },
        {
          id: 'print_quality_standard',
          name: 'Standard Print Quality',
          type: 'print_quality',
          description: 'Test print quality with standard content',
          timeout: 60000,
          expectedDuration: 15000
        },
        {
          id: 'performance_throughput',
          name: 'Performance Throughput',
          type: 'performance',
          description: 'Measure printer performance and throughput',
          timeout: 120000,
          expectedDuration: 30000
        },
        {
          id: 'stress_load',
          name: 'Stress Load Test',
          type: 'stress',
          description: 'Test printer under heavy load conditions',
          timeout: 300000,
          expectedDuration: 120000,
          parameters: { jobCount: 20 }
        },
        {
          id: 'paper_handling',
          name: 'Paper Handling',
          type: 'paper_handling',
          description: 'Test paper feed and cutting mechanisms',
          timeout: 90000,
          expectedDuration: 20000
        },
        {
          id: 'diagnostic_check',
          name: 'Diagnostic Check',
          type: 'diagnostic',
          description: 'System diagnostic and health check',
          timeout: 60000,
          expectedDuration: 15000
        }
      ]
    });

    // Quick Test Suite
    this.testSuites.set('quick', {
      id: 'quick',
      name: 'Quick Test Suite',
      description: 'Fast connectivity and basic functionality test',
      estimatedDuration: 60000, // 1 minute
      tests: [
        {
          id: 'connectivity_basic',
          name: 'Basic Connectivity',
          type: 'connectivity',
          description: 'Test basic printer connectivity',
          timeout: 15000,
          expectedDuration: 3000
        },
        {
          id: 'print_quality_quick',
          name: 'Quick Print Test',
          type: 'print_quality',
          description: 'Quick print functionality test',
          timeout: 30000,
          expectedDuration: 8000,
          parameters: { quick: true }
        }
      ]
    });

    // Performance Test Suite
    this.testSuites.set('performance', {
      id: 'performance',
      name: 'Performance Test Suite',
      description: 'Detailed performance and stress testing',
      estimatedDuration: 180000, // 3 minutes
      tests: [
        {
          id: 'connectivity_basic',
          name: 'Connectivity Check',
          type: 'connectivity',
          description: 'Verify printer connectivity before performance tests',
          timeout: 15000,
          expectedDuration: 3000
        },
        {
          id: 'performance_baseline',
          name: 'Performance Baseline',
          type: 'performance',
          description: 'Establish performance baseline metrics',
          timeout: 60000,
          expectedDuration: 20000
        },
        {
          id: 'stress_light',
          name: 'Light Stress Test',
          type: 'stress',
          description: 'Light stress test for sustained performance',
          timeout: 120000,
          expectedDuration: 45000,
          parameters: { jobCount: 10 }
        },
        {
          id: 'performance_peak',
          name: 'Peak Performance',
          type: 'performance',
          description: 'Test peak performance capabilities',
          timeout: 90000,
          expectedDuration: 30000,
          parameters: { intensive: true }
        }
      ]
    });

    // Diagnostic Test Suite
    this.testSuites.set('diagnostic', {
      id: 'diagnostic',
      name: 'Diagnostic Test Suite',
      description: 'Hardware and system diagnostic tests',
      estimatedDuration: 120000, // 2 minutes
      tests: [
        {
          id: 'connectivity_basic',
          name: 'Connectivity Check',
          type: 'connectivity',
          description: 'Basic connectivity verification',
          timeout: 15000,
          expectedDuration: 3000
        },
        {
          id: 'diagnostic_full',
          name: 'Full System Diagnostic',
          type: 'diagnostic',
          description: 'Complete system diagnostic and health check',
          timeout: 60000,
          expectedDuration: 20000
        },
        {
          id: 'paper_handling',
          name: 'Paper Mechanism Test',
          type: 'paper_handling',
          description: 'Test paper handling mechanisms',
          timeout: 45000,
          expectedDuration: 15000
        }
      ]
    });

    this.logger.log(`🧪 [INIT] Initialized ${this.testSuites.size} test suites`);
  }
}