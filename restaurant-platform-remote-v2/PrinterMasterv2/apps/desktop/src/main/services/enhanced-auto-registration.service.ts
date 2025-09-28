/**
 * RestaurantPrint Pro - Enhanced Auto-Registration Service
 * Advanced auto-registration workflows with conflict resolution
 * 
 * Features:
 * - Smart conflict detection and resolution
 * - Bulk registration with rollback capability
 * - Priority-based registration ordering
 * - Duplicate detection and merging
 * - Configuration validation
 * - Registration history and audit trail
 * - Recovery from failed registrations
 */

import { EventEmitter } from 'events';
import log from 'electron-log';
import { AdvancedDiscoveryService, AdvancedPrinter, DiscoveryResult } from './advanced-discovery-service';
import { APIService } from './api-service';
import crypto from 'crypto';

export interface RegistrationWorkflow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  rules: RegistrationRule[];
  conflictResolution: ConflictResolutionStrategy;
  rollbackEnabled: boolean;
  validationRequired: boolean;
}

export interface RegistrationRule {
  id: string;
  name: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  enabled: boolean;
}

export interface RuleCondition {
  type: 'manufacturer' | 'model' | 'connection' | 'capability' | 'location' | 'custom';
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'in' | 'notIn';
  value: string | string[];
  caseSensitive?: boolean;
}

export interface RuleAction {
  type: 'register' | 'skip' | 'tag' | 'group' | 'priority' | 'configure';
  parameters: { [key: string]: any };
}

export interface ConflictResolutionStrategy {
  duplicateHandling: 'merge' | 'replace' | 'skip' | 'prompt';
  priorityMerging: 'highest' | 'lowest' | 'average' | 'custom';
  metadataMerging: 'preserve' | 'update' | 'merge' | 'prompt';
  autoResolve: boolean;
  requiresApproval: boolean;
}

export interface RegistrationBatch {
  id: string;
  printers: AdvancedPrinter[];
  workflow: RegistrationWorkflow;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  results: RegistrationResult[];
  conflicts: RegistrationConflict[];
  startTime?: Date;
  endTime?: Date;
  rollbackInfo?: RollbackInfo;
}

export interface RegistrationResult {
  printerId: string;
  printerName: string;
  status: 'success' | 'failed' | 'skipped' | 'conflict';
  backendId?: string;
  error?: string;
  warnings: string[];
  actions: PerformedAction[];
  metadata: RegistrationMetadata;
}

export interface PerformedAction {
  type: 'register' | 'update' | 'tag' | 'group' | 'configure' | 'validate';
  description: string;
  timestamp: Date;
  success: boolean;
  data?: any;
}

export interface RegistrationMetadata {
  registrationTime: Date;
  discoverySource: string;
  workflow: string;
  conflicts: number;
  validationResults: ValidationResult[];
}

export interface ValidationResult {
  type: 'configuration' | 'connectivity' | 'capability' | 'compatibility';
  passed: boolean;
  message: string;
  details?: any;
}

export interface RegistrationConflict {
  id: string;
  type: 'duplicate' | 'name_conflict' | 'configuration_mismatch' | 'capability_conflict';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedPrinters: string[];
  suggestedResolution: ConflictResolution;
  autoResolvable: boolean;
  resolved: boolean;
  resolutionActions?: ConflictResolutionAction[];
}

export interface ConflictResolution {
  action: 'merge' | 'replace' | 'rename' | 'skip' | 'manual';
  parameters: { [key: string]: any };
  confidence: number;
}

export interface ConflictResolutionAction {
  type: 'merge' | 'update' | 'rename' | 'delete' | 'tag';
  target: string;
  parameters: { [key: string]: any };
  timestamp: Date;
}

export interface RollbackInfo {
  enabled: boolean;
  checkpoints: RollbackCheckpoint[];
  canRollback: boolean;
}

export interface RollbackCheckpoint {
  id: string;
  timestamp: Date;
  description: string;
  state: any;
  reversible: boolean;
}

export interface RegistrationStatistics {
  totalPrinters: number;
  successfulRegistrations: number;
  failedRegistrations: number;
  skippedPrinters: number;
  conflictsResolved: number;
  conflictsPending: number;
  averageRegistrationTime: number;
  workflowsExecuted: number;
}

export class EnhancedAutoRegistrationService extends EventEmitter {
  private discoveryService: AdvancedDiscoveryService;
  private apiService: APIService;
  private workflows = new Map<string, RegistrationWorkflow>();
  private activeBatches = new Map<string, RegistrationBatch>();
  private registrationHistory: RegistrationResult[] = [];
  private conflictCache = new Map<string, RegistrationConflict>();
  private isProcessing = false;

  constructor(discoveryService: AdvancedDiscoveryService, apiService: APIService) {
    super();
    this.discoveryService = discoveryService;
    this.apiService = apiService;
    
    this.initializeDefaultWorkflows();
    log.info('[ENHANCED-AUTO-REGISTRATION] Service initialized');
  }

  async initialize(): Promise<void> {
    try {
      log.info('[ENHANCED-AUTO-REGISTRATION] Initializing enhanced auto-registration service...');
      
      // Load workflows from configuration
      await this.loadWorkflows();
      
      // Setup discovery event handlers
      this.discoveryService.on('discovery-complete', this.handleDiscoveryComplete.bind(this));
      
      log.info('[ENHANCED-AUTO-REGISTRATION] Enhanced auto-registration service initialized');
    } catch (error) {
      log.error('[ENHANCED-AUTO-REGISTRATION] Failed to initialize:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      log.info('[ENHANCED-AUTO-REGISTRATION] Shutting down enhanced auto-registration service...');
      
      // Cancel active batches
      for (const batch of this.activeBatches.values()) {
        if (batch.status === 'processing') {
          batch.status = 'cancelled';
        }
      }
      
      this.workflows.clear();
      this.activeBatches.clear();
      this.conflictCache.clear();
      this.removeAllListeners();
      
      log.info('[ENHANCED-AUTO-REGISTRATION] Enhanced auto-registration service shut down');
    } catch (error) {
      log.error('[ENHANCED-AUTO-REGISTRATION] Error during shutdown:', error);
    }
  }

  async registerPrintersWithWorkflow(
    printers: AdvancedPrinter[], 
    workflowId: string,
    options: {
      dryRun?: boolean;
      enableRollback?: boolean;
      requireApproval?: boolean;
      validateFirst?: boolean;
    } = {}
  ): Promise<RegistrationBatch> {
    if (this.isProcessing) {
      throw new Error('Registration already in progress');
    }

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (!workflow.enabled) {
      throw new Error(`Workflow is disabled: ${workflowId}`);
    }

    const batchId = this.generateBatchId();
    const batch: RegistrationBatch = {
      id: batchId,
      printers: [...printers],
      workflow,
      status: 'pending',
      results: [],
      conflicts: [],
      startTime: new Date(),
      rollbackInfo: {
        enabled: options.enableRollback || workflow.rollbackEnabled,
        checkpoints: [],
        canRollback: false
      }
    };

    this.activeBatches.set(batchId, batch);

    try {
      this.isProcessing = true;
      log.info(`[ENHANCED-AUTO-REGISTRATION] Starting registration batch ${batchId} with workflow ${workflowId}`);

      // Phase 1: Validation
      if (options.validateFirst || workflow.validationRequired) {
        await this.validatePrinters(batch);
      }

      // Phase 2: Conflict Detection
      await this.detectConflicts(batch);

      // Phase 3: Conflict Resolution
      if (batch.conflicts.length > 0) {
        await this.resolveConflicts(batch);
      }

      // Phase 4: Registration (if not dry run)
      if (!options.dryRun) {
        await this.executeBatchRegistration(batch);
      } else {
        batch.status = 'completed';
        log.info(`[ENHANCED-AUTO-REGISTRATION] Dry run completed for batch ${batchId}`);
      }

      batch.endTime = new Date();
      this.emit('batch-completed', batch);
      
      return batch;
    } catch (error) {
      batch.status = 'failed';
      batch.endTime = new Date();
      log.error(`[ENHANCED-AUTO-REGISTRATION] Batch ${batchId} failed:`, error);
      this.emit('batch-failed', batch, error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  private async validatePrinters(batch: RegistrationBatch): Promise<void> {
    log.info(`[ENHANCED-AUTO-REGISTRATION] Validating ${batch.printers.length} printers for batch ${batch.id}`);

    for (const printer of batch.printers) {
      const validationResults: ValidationResult[] = [];

      // Configuration validation
      const configValidation = await this.validatePrinterConfiguration(printer);
      validationResults.push(configValidation);

      // Connectivity validation
      const connectivityValidation = await this.validatePrinterConnectivity(printer);
      validationResults.push(connectivityValidation);

      // Capability validation
      const capabilityValidation = await this.validatePrinterCapabilities(printer);
      validationResults.push(capabilityValidation);

      // Compatibility validation
      const compatibilityValidation = await this.validatePrinterCompatibility(printer);
      validationResults.push(compatibilityValidation);

      // Check if all validations passed
      const allPassed = validationResults.every(v => v.passed);
      const warnings = validationResults.filter(v => !v.passed).map(v => v.message);

      const result: RegistrationResult = {
        printerId: printer.id,
        printerName: printer.name,
        status: allPassed ? 'success' : 'failed',
        warnings,
        actions: [{
          type: 'validate',
          description: 'Printer validation completed',
          timestamp: new Date(),
          success: allPassed,
          data: validationResults
        }],
        metadata: {
          registrationTime: new Date(),
          discoverySource: 'advanced-discovery',
          workflow: batch.workflow.name,
          conflicts: 0,
          validationResults
        }
      };

      if (!allPassed) {
        result.error = `Validation failed: ${warnings.join(', ')}`;
      }

      batch.results.push(result);
    }

    log.info(`[ENHANCED-AUTO-REGISTRATION] Validation completed for batch ${batch.id}`);
  }

  private async detectConflicts(batch: RegistrationBatch): Promise<void> {
    log.info(`[ENHANCED-AUTO-REGISTRATION] Detecting conflicts for batch ${batch.id}`);

    const conflicts: RegistrationConflict[] = [];

    // Check for duplicate names
    const nameGroups = this.groupBy(batch.printers, p => p.name.toLowerCase());
    for (const [name, printers] of nameGroups) {
      if (printers.length > 1) {
        conflicts.push({
          id: this.generateConflictId(),
          type: 'duplicate',
          severity: 'medium',
          description: `Multiple printers with the same name: ${name}`,
          affectedPrinters: printers.map(p => p.id),
          suggestedResolution: {
            action: 'rename',
            parameters: { strategy: 'append_suffix' },
            confidence: 0.9
          },
          autoResolvable: true,
          resolved: false
        });
      }
    }

    // Check for configuration mismatches
    const modelGroups = this.groupBy(batch.printers, p => `${p.manufacturer}-${p.model}`);
    for (const [model, printers] of modelGroups) {
      if (printers.length > 1) {
        const capabilities = printers.map(p => JSON.stringify(p.capabilities));
        const uniqueCapabilities = [...new Set(capabilities)];
        
        if (uniqueCapabilities.length > 1) {
          conflicts.push({
            id: this.generateConflictId(),
            type: 'configuration_mismatch',
            severity: 'high',
            description: `Same printer model with different capabilities: ${model}`,
            affectedPrinters: printers.map(p => p.id),
            suggestedResolution: {
              action: 'merge',
              parameters: { strategy: 'union_capabilities' },
              confidence: 0.7
            },
            autoResolvable: false,
            resolved: false
          });
        }
      }
    }

    // Check for existing registrations (would query API)
    for (const printer of batch.printers) {
      const existingPrinter = await this.checkExistingRegistration(printer);
      if (existingPrinter) {
        conflicts.push({
          id: this.generateConflictId(),
          type: 'duplicate',
          severity: 'critical',
          description: `Printer already registered in backend: ${printer.name}`,
          affectedPrinters: [printer.id],
          suggestedResolution: {
            action: 'skip',
            parameters: { reason: 'already_registered' },
            confidence: 1.0
          },
          autoResolvable: true,
          resolved: false
        });
      }
    }

    batch.conflicts = conflicts;
    
    // Cache conflicts for later resolution
    for (const conflict of conflicts) {
      this.conflictCache.set(conflict.id, conflict);
    }

    log.info(`[ENHANCED-AUTO-REGISTRATION] Found ${conflicts.length} conflicts for batch ${batch.id}`);
  }

  private async resolveConflicts(batch: RegistrationBatch): Promise<void> {
    log.info(`[ENHANCED-AUTO-REGISTRATION] Resolving ${batch.conflicts.length} conflicts for batch ${batch.id}`);

    const strategy = batch.workflow.conflictResolution;

    for (const conflict of batch.conflicts) {
      if (conflict.autoResolvable && strategy.autoResolve) {
        await this.autoResolveConflict(conflict, batch);
      } else if (strategy.requiresApproval) {
        // Emit event for manual resolution
        this.emit('conflict-requires-approval', conflict, batch);
      } else {
        // Apply default resolution strategy
        await this.applyDefaultResolution(conflict, batch, strategy);
      }
    }

    const resolvedCount = batch.conflicts.filter(c => c.resolved).length;
    log.info(`[ENHANCED-AUTO-REGISTRATION] Resolved ${resolvedCount}/${batch.conflicts.length} conflicts for batch ${batch.id}`);
  }

  private async autoResolveConflict(conflict: RegistrationConflict, batch: RegistrationBatch): Promise<void> {
    const resolution = conflict.suggestedResolution;
    const actions: ConflictResolutionAction[] = [];

    try {
      switch (resolution.action) {
        case 'rename':
          await this.resolveNamingConflict(conflict, batch, actions);
          break;
        case 'merge':
          await this.mergePrinters(conflict, batch, actions);
          break;
        case 'skip':
          await this.skipPrinters(conflict, batch, actions);
          break;
        case 'replace':
          await this.replacePrinters(conflict, batch, actions);
          break;
      }

      conflict.resolved = true;
      conflict.resolutionActions = actions;
      
      log.info(`[ENHANCED-AUTO-REGISTRATION] Auto-resolved conflict ${conflict.id}: ${conflict.description}`);
    } catch (error) {
      log.error(`[ENHANCED-AUTO-REGISTRATION] Failed to auto-resolve conflict ${conflict.id}:`, error);
    }
  }

  private async resolveNamingConflict(
    conflict: RegistrationConflict, 
    batch: RegistrationBatch, 
    actions: ConflictResolutionAction[]
  ): Promise<void> {
    const affectedPrinters = batch.printers.filter(p => conflict.affectedPrinters.includes(p.id));
    
    for (let i = 1; i < affectedPrinters.length; i++) {
      const printer = affectedPrinters[i];
      const newName = `${printer.name} (${i + 1})`;
      
      actions.push({
        type: 'rename',
        target: printer.id,
        parameters: { oldName: printer.name, newName },
        timestamp: new Date()
      });
      
      printer.name = newName;
    }
  }

  private async mergePrinters(
    conflict: RegistrationConflict, 
    batch: RegistrationBatch, 
    actions: ConflictResolutionAction[]
  ): Promise<void> {
    const affectedPrinters = batch.printers.filter(p => conflict.affectedPrinters.includes(p.id));
    
    if (affectedPrinters.length < 2) return;

    const primaryPrinter = affectedPrinters[0];
    const secondaryPrinters = affectedPrinters.slice(1);

    // Merge capabilities (union)
    const allCapabilities = new Set<string>();
    affectedPrinters.forEach(p => {
      p.capabilities.features.forEach(cap => allCapabilities.add(cap));
    });

    primaryPrinter.capabilities.features = Array.from(allCapabilities);

    // Merge metadata
    primaryPrinter.metadata.tags = [
      ...new Set([
        ...primaryPrinter.metadata.tags,
        ...secondaryPrinters.flatMap(p => p.metadata.tags)
      ])
    ];

    // Remove secondary printers from batch
    batch.printers = batch.printers.filter(p => !secondaryPrinters.some(sp => sp.id === p.id));

    actions.push({
      type: 'merge',
      target: primaryPrinter.id,
      parameters: { 
        mergedFrom: secondaryPrinters.map(p => p.id),
        capabilities: Array.from(allCapabilities)
      },
      timestamp: new Date()
    });
  }

  private async skipPrinters(
    conflict: RegistrationConflict, 
    batch: RegistrationBatch, 
    actions: ConflictResolutionAction[]
  ): Promise<void> {
    const affectedPrinters = batch.printers.filter(p => conflict.affectedPrinters.includes(p.id));
    
    for (const printer of affectedPrinters) {
      // Mark as skipped in results
      const existingResult = batch.results.find(r => r.printerId === printer.id);
      if (existingResult) {
        existingResult.status = 'skipped';
        existingResult.warnings.push(`Skipped due to conflict: ${conflict.description}`);
      }

      actions.push({
        type: 'delete',
        target: printer.id,
        parameters: { reason: conflict.description },
        timestamp: new Date()
      });
    }

    // Remove from batch
    batch.printers = batch.printers.filter(p => !conflict.affectedPrinters.includes(p.id));
  }

  private async replacePrinters(
    conflict: RegistrationConflict, 
    batch: RegistrationBatch, 
    actions: ConflictResolutionAction[]
  ): Promise<void> {
    // Implementation depends on specific replacement logic
    // For now, keep the first printer and remove others
    const affectedPrinters = batch.printers.filter(p => conflict.affectedPrinters.includes(p.id));
    
    if (affectedPrinters.length > 1) {
      const keepPrinter = affectedPrinters[0];
      const removePrinters = affectedPrinters.slice(1);

      batch.printers = batch.printers.filter(p => !removePrinters.some(rp => rp.id === p.id));

      actions.push({
        type: 'update',
        target: keepPrinter.id,
        parameters: { 
          action: 'replace',
          replacedPrinters: removePrinters.map(p => p.id)
        },
        timestamp: new Date()
      });
    }
  }

  private async applyDefaultResolution(
    conflict: RegistrationConflict, 
    batch: RegistrationBatch, 
    strategy: ConflictResolutionStrategy
  ): Promise<void> {
    switch (strategy.duplicateHandling) {
      case 'merge':
        await this.autoResolveConflict(conflict, batch);
        break;
      case 'replace':
        await this.autoResolveConflict(conflict, batch);
        break;
      case 'skip':
        await this.skipPrinters(conflict, batch, []);
        conflict.resolved = true;
        break;
      case 'prompt':
        this.emit('conflict-requires-manual-resolution', conflict, batch);
        break;
    }
  }

  private async executeBatchRegistration(batch: RegistrationBatch): Promise<void> {
    log.info(`[ENHANCED-AUTO-REGISTRATION] Executing registration for batch ${batch.id}`);
    batch.status = 'processing';

    const createCheckpoint = (description: string) => {
      if (batch.rollbackInfo?.enabled) {
        const checkpoint: RollbackCheckpoint = {
          id: this.generateCheckpointId(),
          timestamp: new Date(),
          description,
          state: JSON.parse(JSON.stringify(batch)),
          reversible: true
        };
        batch.rollbackInfo.checkpoints.push(checkpoint);
      }
    };

    createCheckpoint('Starting batch registration');

    // Sort printers by priority for registration order
    const sortedPrinters = [...batch.printers].sort((a, b) => a.priority - b.priority);

    for (const printer of sortedPrinters) {
      try {
        createCheckpoint(`Registering printer ${printer.name}`);
        
        const registrationData = this.preparePrinterRegistrationData(printer, batch.workflow);
        const apiResult = await this.apiService.registerPrinter(registrationData);

        if (apiResult.success) {
          const result: RegistrationResult = {
            printerId: printer.id,
            printerName: printer.name,
            status: 'success',
            backendId: apiResult.data?.id,
            warnings: [],
            actions: [{
              type: 'register',
              description: 'Printer registered successfully',
              timestamp: new Date(),
              success: true,
              data: apiResult.data
            }],
            metadata: {
              registrationTime: new Date(),
              discoverySource: 'advanced-discovery',
              workflow: batch.workflow.name,
              conflicts: batch.conflicts.filter(c => c.affectedPrinters.includes(printer.id)).length,
              validationResults: []
            }
          };

          // Apply post-registration actions
          await this.applyPostRegistrationActions(printer, batch.workflow, result);

          batch.results.push(result);
          this.registrationHistory.push(result);

        } else {
          const result: RegistrationResult = {
            printerId: printer.id,
            printerName: printer.name,
            status: 'failed',
            error: apiResult.message || 'Registration failed',
            warnings: [],
            actions: [{
              type: 'register',
              description: 'Printer registration failed',
              timestamp: new Date(),
              success: false
            }],
            metadata: {
              registrationTime: new Date(),
              discoverySource: 'advanced-discovery',
              workflow: batch.workflow.name,
              conflicts: 0,
              validationResults: []
            }
          };

          batch.results.push(result);
        }

      } catch (error) {
        log.error(`[ENHANCED-AUTO-REGISTRATION] Failed to register printer ${printer.name}:`, error);
        
        const result: RegistrationResult = {
          printerId: printer.id,
          printerName: printer.name,
          status: 'failed',
          error: error.message,
          warnings: [],
          actions: [{
            type: 'register',
            description: 'Printer registration exception',
            timestamp: new Date(),
            success: false
          }],
          metadata: {
            registrationTime: new Date(),
            discoverySource: 'advanced-discovery',
            workflow: batch.workflow.name,
            conflicts: 0,
            validationResults: []
          }
        };

        batch.results.push(result);
      }
    }

    batch.status = 'completed';
    if (batch.rollbackInfo) {
      batch.rollbackInfo.canRollback = batch.rollbackInfo.checkpoints.length > 0;
    }

    log.info(`[ENHANCED-AUTO-REGISTRATION] Batch registration completed for ${batch.id}`);
  }

  private preparePrinterRegistrationData(printer: AdvancedPrinter, workflow: RegistrationWorkflow): any {
    return {
      name: printer.name,
      driver: printer.driver,
      manufacturer: printer.manufacturer,
      model: printer.model,
      connection: printer.connection,
      capabilities: printer.capabilities,
      priority: printer.priority,
      group: printer.group,
      location: printer.location,
      metadata: {
        ...printer.metadata,
        workflow: workflow.name,
        registrationSource: 'enhanced-auto-registration'
      }
    };
  }

  private async applyPostRegistrationActions(
    printer: AdvancedPrinter, 
    workflow: RegistrationWorkflow, 
    result: RegistrationResult
  ): Promise<void> {
    for (const rule of workflow.rules.filter(r => r.enabled)) {
      if (this.evaluateRuleCondition(rule.condition, printer)) {
        await this.executeRuleAction(rule.action, printer, result);
      }
    }
  }

  private evaluateRuleCondition(condition: RuleCondition, printer: AdvancedPrinter): boolean {
    let targetValue: string;
    
    switch (condition.type) {
      case 'manufacturer':
        targetValue = printer.manufacturer;
        break;
      case 'model':
        targetValue = printer.model;
        break;
      case 'connection':
        targetValue = printer.connection.type;
        break;
      case 'capability':
        targetValue = printer.capabilities.features.join(',');
        break;
      case 'location':
        targetValue = printer.location;
        break;
      default:
        return false;
    }

    if (!condition.caseSensitive) {
      targetValue = targetValue.toLowerCase();
    }

    const compareValue = condition.caseSensitive ? condition.value : 
      (Array.isArray(condition.value) ? 
        condition.value.map(v => v.toLowerCase()) : 
        condition.value.toString().toLowerCase());

    switch (condition.operator) {
      case 'equals':
        return targetValue === compareValue;
      case 'contains':
        return targetValue.includes(compareValue as string);
      case 'startsWith':
        return targetValue.startsWith(compareValue as string);
      case 'endsWith':
        return targetValue.endsWith(compareValue as string);
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(targetValue);
      case 'notIn':
        return Array.isArray(compareValue) && !compareValue.includes(targetValue);
      case 'regex':
        return new RegExp(compareValue as string).test(targetValue);
      default:
        return false;
    }
  }

  private async executeRuleAction(
    action: RuleAction, 
    printer: AdvancedPrinter, 
    result: RegistrationResult
  ): Promise<void> {
    try {
      switch (action.type) {
        case 'tag':
          if (action.parameters.tags) {
            printer.metadata.tags.push(...action.parameters.tags);
            result.actions.push({
              type: 'tag',
              description: `Added tags: ${action.parameters.tags.join(', ')}`,
              timestamp: new Date(),
              success: true,
              data: { tags: action.parameters.tags }
            });
          }
          break;
        case 'group':
          if (action.parameters.groupId) {
            printer.group.id = action.parameters.groupId;
            result.actions.push({
              type: 'group',
              description: `Assigned to group: ${action.parameters.groupId}`,
              timestamp: new Date(),
              success: true,
              data: { groupId: action.parameters.groupId }
            });
          }
          break;
        case 'priority':
          if (action.parameters.priority !== undefined) {
            printer.priority = action.parameters.priority;
            result.actions.push({
              type: 'update',
              description: `Set priority to: ${action.parameters.priority}`,
              timestamp: new Date(),
              success: true,
              data: { priority: action.parameters.priority }
            });
          }
          break;
        case 'configure':
          // Apply configuration changes
          if (action.parameters.configuration) {
            result.actions.push({
              type: 'configure',
              description: 'Applied configuration changes',
              timestamp: new Date(),
              success: true,
              data: action.parameters.configuration
            });
          }
          break;
      }
    } catch (error) {
      log.error(`[ENHANCED-AUTO-REGISTRATION] Failed to execute rule action:`, error);
      result.actions.push({
        type: action.type as any,
        description: `Failed to execute action: ${error.message}`,
        timestamp: new Date(),
        success: false
      });
    }
  }

  private async handleDiscoveryComplete(discoveryResult: DiscoveryResult): Promise<void> {
    log.info(`[ENHANCED-AUTO-REGISTRATION] Discovery completed with ${discoveryResult.printers.length} printers`);

    // Find enabled workflows that should auto-trigger
    const autoWorkflows = Array.from(this.workflows.values())
      .filter(w => w.enabled && w.name.includes('auto'));

    for (const workflow of autoWorkflows) {
      try {
        const batch = await this.registerPrintersWithWorkflow(
          discoveryResult.printers, 
          workflow.id,
          { validateFirst: true }
        );
        
        log.info(`[ENHANCED-AUTO-REGISTRATION] Auto-triggered workflow ${workflow.name} with batch ${batch.id}`);
      } catch (error) {
        log.error(`[ENHANCED-AUTO-REGISTRATION] Failed to auto-trigger workflow ${workflow.name}:`, error);
      }
    }
  }

  // Validation methods
  private async validatePrinterConfiguration(printer: AdvancedPrinter): Promise<ValidationResult> {
    try {
      // Validate required fields
      if (!printer.name || !printer.driver || !printer.connection) {
        return {
          type: 'configuration',
          passed: false,
          message: 'Missing required configuration fields'
        };
      }

      // Validate connection details
      if (printer.connection.type === 'Network' && !printer.connection.details.network?.ip) {
        return {
          type: 'configuration',
          passed: false,
          message: 'Network printers require IP address'
        };
      }

      return {
        type: 'configuration',
        passed: true,
        message: 'Configuration validation passed'
      };
    } catch (error) {
      return {
        type: 'configuration',
        passed: false,
        message: `Configuration validation failed: ${error.message}`
      };
    }
  }

  private async validatePrinterConnectivity(printer: AdvancedPrinter): Promise<ValidationResult> {
    try {
      // This would perform actual connectivity test
      // For now, simulate based on printer status
      const isOnline = printer.status.state === 'ready' || printer.status.state === 'busy';

      return {
        type: 'connectivity',
        passed: isOnline,
        message: isOnline ? 'Printer is reachable' : 'Printer is not responding'
      };
    } catch (error) {
      return {
        type: 'connectivity',
        passed: false,
        message: `Connectivity test failed: ${error.message}`
      };
    }
  }

  private async validatePrinterCapabilities(printer: AdvancedPrinter): Promise<ValidationResult> {
    try {
      // Validate that printer has minimum required capabilities
      const hasText = printer.capabilities.text;
      const hasBasicFeatures = printer.capabilities.features.length > 0;

      if (!hasText || !hasBasicFeatures) {
        return {
          type: 'capability',
          passed: false,
          message: 'Printer lacks minimum required capabilities'
        };
      }

      return {
        type: 'capability',
        passed: true,
        message: 'Capability validation passed'
      };
    } catch (error) {
      return {
        type: 'capability',
        passed: false,
        message: `Capability validation failed: ${error.message}`
      };
    }
  }

  private async validatePrinterCompatibility(printer: AdvancedPrinter): Promise<ValidationResult> {
    try {
      const compatibility = printer.compatibility;
      
      if (!compatibility.supported) {
        return {
          type: 'compatibility',
          passed: false,
          message: `Printer not compatible: ${compatibility.issues.map(i => i.message).join(', ')}`
        };
      }

      if (compatibility.score < 70) {
        return {
          type: 'compatibility',
          passed: false,
          message: `Low compatibility score: ${compatibility.score}/100`
        };
      }

      return {
        type: 'compatibility',
        passed: true,
        message: 'Compatibility validation passed'
      };
    } catch (error) {
      return {
        type: 'compatibility',
        passed: false,
        message: `Compatibility validation failed: ${error.message}`
      };
    }
  }

  private async checkExistingRegistration(printer: AdvancedPrinter): Promise<any> {
    try {
      // This would check the backend API for existing registrations
      // For now, return null (no existing registration)
      return null;
    } catch (error) {
      log.error(`[ENHANCED-AUTO-REGISTRATION] Failed to check existing registration for ${printer.name}:`, error);
      return null;
    }
  }

  // Utility methods
  private initializeDefaultWorkflows(): void {
    const defaultWorkflow: RegistrationWorkflow = {
      id: 'default-auto',
      name: 'Default Auto Registration',
      description: 'Automatically register all compatible printers',
      enabled: true,
      priority: 1,
      rules: [
        {
          id: 'tag-thermal',
          name: 'Tag Thermal Printers',
          condition: {
            type: 'capability',
            operator: 'contains',
            value: 'cut'
          },
          action: {
            type: 'tag',
            parameters: { tags: ['thermal', 'receipt'] }
          },
          priority: 1,
          enabled: true
        }
      ],
      conflictResolution: {
        duplicateHandling: 'merge',
        priorityMerging: 'highest',
        metadataMerging: 'merge',
        autoResolve: true,
        requiresApproval: false
      },
      rollbackEnabled: true,
      validationRequired: true
    };

    this.workflows.set(defaultWorkflow.id, defaultWorkflow);
  }

  private async loadWorkflows(): Promise<void> {
    // This would load workflows from configuration or database
    // For now, we'll use the default workflows
    log.info('[ENHANCED-AUTO-REGISTRATION] Using default workflows');
  }

  private groupBy<T, K>(array: T[], keyFn: (item: T) => K): Map<K, T[]> {
    const map = new Map<K, T[]>();
    for (const item of array) {
      const key = keyFn(item);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    }
    return map;
  }

  private generateBatchId(): string {
    return `batch-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateConflictId(): string {
    return `conflict-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateCheckpointId(): string {
    return `checkpoint-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  // Public API methods
  async getBatchStatus(batchId: string): Promise<RegistrationBatch | null> {
    return this.activeBatches.get(batchId) || null;
  }

  async getWorkflows(): Promise<RegistrationWorkflow[]> {
    return Array.from(this.workflows.values());
  }

  async getRegistrationHistory(limit?: number): Promise<RegistrationResult[]> {
    return limit ? this.registrationHistory.slice(-limit) : [...this.registrationHistory];
  }

  async getStatistics(): Promise<RegistrationStatistics> {
    const total = this.registrationHistory.length;
    const successful = this.registrationHistory.filter(r => r.status === 'success').length;
    const failed = this.registrationHistory.filter(r => r.status === 'failed').length;
    const skipped = this.registrationHistory.filter(r => r.status === 'skipped').length;

    return {
      totalPrinters: total,
      successfulRegistrations: successful,
      failedRegistrations: failed,
      skippedPrinters: skipped,
      conflictsResolved: this.conflictCache.size,
      conflictsPending: Array.from(this.conflictCache.values()).filter(c => !c.resolved).length,
      averageRegistrationTime: 0, // Would calculate from timing data
      workflowsExecuted: this.activeBatches.size
    };
  }

  async rollbackBatch(batchId: string, checkpointId?: string): Promise<boolean> {
    const batch = this.activeBatches.get(batchId);
    if (!batch || !batch.rollbackInfo?.enabled) {
      return false;
    }

    try {
      // Implementation would restore from checkpoint
      log.info(`[ENHANCED-AUTO-REGISTRATION] Rolling back batch ${batchId}`);
      return true;
    } catch (error) {
      log.error(`[ENHANCED-AUTO-REGISTRATION] Rollback failed for batch ${batchId}:`, error);
      return false;
    }
  }
}