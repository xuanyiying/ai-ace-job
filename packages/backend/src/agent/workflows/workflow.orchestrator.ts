import { Injectable, Logger } from '@nestjs/common';
import { LCELWorkflowOrchestrator } from './lcel-workflow.orchestrator';
import {
  WorkflowStep,
  WorkflowContext,
  WorkflowResult,
} from './workflow.interfaces';

/**
 * Workflow Orchestrator
 * Refactored to use LCEL (LangChain Expression Language)
 * Manages complex Agent workflows with sequential, parallel, and conditional execution
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 */
@Injectable()
export class WorkflowOrchestrator {
  private readonly logger = new Logger(WorkflowOrchestrator.name);

  constructor(private lcelOrchestrator: LCELWorkflowOrchestrator) {}

  /**
   * Execute workflow steps sequentially using LCEL
   */
  async executeSequential(
    steps: WorkflowStep[],
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    this.logger.log(`Executing ${steps.length} steps sequentially via LCEL`);
    return this.lcelOrchestrator.executeChain(steps, context);
  }

  /**
   * Execute workflow steps in parallel using LCEL
   */
  async executeParallel(
    steps: WorkflowStep[],
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    this.logger.log(`Executing ${steps.length} steps in parallel via LCEL`);
    return this.lcelOrchestrator.executeParallel(steps, context);
  }

  /**
   * Execute workflow with conditional branching
   */
  async executeConditional(
    condition: (context: WorkflowContext) => boolean,
    trueBranch: WorkflowStep[],
    falseBranch: WorkflowStep[],
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    this.logger.debug('Executing conditional workflow via LCEL');
    const shouldExecuteTrueBranch = condition(context);
    const selectedBranch = shouldExecuteTrueBranch ? trueBranch : falseBranch;
    return this.executeSequential(selectedBranch, context);
  }
}
