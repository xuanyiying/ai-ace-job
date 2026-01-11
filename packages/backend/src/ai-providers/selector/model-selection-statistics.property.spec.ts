/**
 * Model Selection Statistics Property-Based Tests
 * Tests for statistics functionality correctness properties
 * **Feature: smart-model-selector, Property 10: 选择日志完整性, Property 11: 统计数据正确性**
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
 */

import fc from 'fast-check';
import { ModelInfo } from '../interfaces';
import { ModelSelector } from './model.selector';
import { ScenarioModelMappingService } from './scenario-model-mapping.service';
import { ScenarioType as MappingScenarioType } from '../interfaces/model.interface';

describe('Model Selection Statistics Property-Based Tests', () => {
  let selector: ModelSelector;
  let scenarioMappingService: ScenarioModelMappingService;

  // Arbitraries for property testing
  const arbitraryModelInfo = (): fc.Arbitrary<ModelInfo> => {
    return fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      provider: fc.oneof(
        fc.constant('openai'),
        fc.constant('qwen'),
        fc.constant('deepseek'),
        fc.constant('ollama'),
        fc.constant('meta')
      ),
      contextWindow: fc.integer({ min: 1024, max: 128000 }),
      costPerInputToken: fc.float({
        min: 0,
        max: Math.fround(0.1),
        noNaN: true,
      }),
      costPerOutputToken: fc.float({
        min: 0,
        max: Math.fround(0.1),
        noNaN: true,
      }),
      latency: fc.integer({ min: 100, max: 5000 }),
      successRate: fc.float({
        min: 0.5,
        max: Math.fround(1.0),
        noNaN: true,
      }),
      isAvailable: fc.boolean(),
    });
  };

  const arbitraryScenario = (): fc.Arbitrary<MappingScenarioType> => {
    return fc.oneof(
      fc.constant(MappingScenarioType.RESUME_PARSING),
      fc.constant(MappingScenarioType.RESUME_OPTIMIZATION),
      fc.constant(MappingScenarioType.INTERVIEW_QUESTION_GENERATION),
      fc.constant(MappingScenarioType.MATCH_SCORE_CALCULATION),
      fc.constant(MappingScenarioType.AGENT_RESPONSE_PROCESSING)
    );
  };

  beforeEach(() => {
    scenarioMappingService = new ScenarioModelMappingService();
    selector = new ModelSelector(scenarioMappingService);
  });

  describe('Property 10: Selection Log Completeness', () => {
    it('should record complete selection decision information', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          arbitraryScenario(),
          (models, scenario) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            // Perform selection
            selector.selectModelForScenario(scenario, availableModels);

            // Get selection log
            const log = selector.getSelectionLog();

            // Verify log has at least one entry
            expect(log.length).toBeGreaterThan(0);

            // Get the latest decision
            const decision = log[log.length - 1];

            // Verify all required fields are present (Requirements: 7.1)
            expect(decision.timestamp).toBeDefined();
            expect(decision.scenario).toBe(scenario);
            expect(decision.selectedModel).toBeDefined();
            expect(decision.selectedProvider).toBeDefined();
            expect(decision.availableModelsCount).toBeGreaterThan(0);
            expect(decision.strategyUsed).toBeDefined();
            expect(decision.modelCost).toBeDefined();
            expect(decision.modelLatency).toBeDefined();
            expect(decision.modelSuccessRate).toBeDefined();

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should record scenario in selection log', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          arbitraryScenario(),
          (models, scenario) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            selector.selectModelForScenario(scenario, availableModels);

            const log = selector.getSelectionLog();
            const decision = log[log.length - 1];

            // Verify scenario is correctly recorded
            expect(decision.scenario).toBe(scenario);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should record selected model name in log', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          arbitraryScenario(),
          (models, scenario) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            const selectedModel = selector.selectModelForScenario(
              scenario,
              availableModels
            );

            const log = selector.getSelectionLog();
            const decision = log[log.length - 1];

            // Verify selected model is recorded
            expect(decision.selectedModel).toBe(selectedModel.name);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should record available models count in log', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          arbitraryScenario(),
          (models, scenario) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            selector.selectModelForScenario(scenario, availableModels);

            const log = selector.getSelectionLog();
            const decision = log[log.length - 1];

            // Verify available models count is recorded
            expect(decision.availableModelsCount).toBe(availableModels.length);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should record strategy used in log', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          arbitraryScenario(),
          (models, scenario) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            selector.selectModelForScenario(scenario, availableModels);

            const log = selector.getSelectionLog();
            const decision = log[log.length - 1];

            // Verify strategy is recorded
            expect(decision.strategyUsed).toBeDefined();
            expect(decision.strategyUsed.length).toBeGreaterThan(0);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should record model cost in log', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          arbitraryScenario(),
          (models, scenario) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            const selectedModel = selector.selectModelForScenario(
              scenario,
              availableModels
            );

            const log = selector.getSelectionLog();
            const decision = log[log.length - 1];

            // Verify model cost is recorded correctly
            const expectedCost =
              selectedModel.costPerInputToken +
              selectedModel.costPerOutputToken;
            expect(decision.modelCost).toBe(expectedCost);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should record model latency in log', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          arbitraryScenario(),
          (models, scenario) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            const selectedModel = selector.selectModelForScenario(
              scenario,
              availableModels
            );

            const log = selector.getSelectionLog();
            const decision = log[log.length - 1];

            // Verify model latency is recorded correctly
            expect(decision.modelLatency).toBe(selectedModel.latency);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should record model success rate in log', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          arbitraryScenario(),
          (models, scenario) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            const selectedModel = selector.selectModelForScenario(
              scenario,
              availableModels
            );

            const log = selector.getSelectionLog();
            const decision = log[log.length - 1];

            // Verify model success rate is recorded correctly
            expect(decision.modelSuccessRate).toBe(selectedModel.successRate);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 11: Statistics Data Correctness', () => {
    it('should calculate correct scenario statistics', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          fc.array(arbitraryScenario(), { minLength: 1, maxLength: 5 }),
          (models, scenarios) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            // Perform multiple selections with different scenarios
            for (const scenario of scenarios) {
              selector.selectModelForScenario(scenario, availableModels);
            }

            // Get statistics
            const stats = selector.getSelectionStatistics();

            // Verify scenario statistics are recorded (Requirements: 7.2)
            for (const scenario of scenarios) {
              expect(stats.scenarioStats[scenario]).toBeDefined();
              expect(stats.scenarioStats[scenario].count).toBeGreaterThan(0);
            }

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should calculate correct model statistics', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          arbitraryScenario(),
          (models, scenario) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            // Perform multiple selections
            for (let i = 0; i < 5; i++) {
              selector.selectModelForScenario(scenario, availableModels);
            }

            // Get statistics
            const stats = selector.getSelectionStatistics();

            // Verify model statistics are recorded (Requirements: 7.3)
            for (const modelName in stats.modelStats) {
              const modelStat = stats.modelStats[modelName];
              expect(modelStat.count).toBeGreaterThan(0);
              expect(modelStat.scenarios).toBeDefined();
              expect(modelStat.successRate).toBeDefined();
              expect(modelStat.avgCost).toBeDefined();
              expect(modelStat.avgLatency).toBeDefined();
            }

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should calculate correct model success rate', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          arbitraryScenario(),
          (models, scenario) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            // Perform multiple selections
            for (let i = 0; i < 10; i++) {
              selector.selectModelForScenario(scenario, availableModels);
            }

            // Get statistics
            const stats = selector.getSelectionStatistics();

            // Verify success rate calculation
            for (const modelName in stats.modelStats) {
              const modelStat = stats.modelStats[modelName];
              // Success rate should be between 0 and 1
              expect(modelStat.successRate).toBeGreaterThanOrEqual(0);
              expect(modelStat.successRate).toBeLessThanOrEqual(1);
            }

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should calculate correct average cost per model', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          arbitraryScenario(),
          (models, scenario) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            // Perform multiple selections
            for (let i = 0; i < 5; i++) {
              selector.selectModelForScenario(scenario, availableModels);
            }

            // Get statistics
            const stats = selector.getSelectionStatistics();

            // Verify average cost is calculated
            for (const modelName in stats.modelStats) {
              const modelStat = stats.modelStats[modelName];
              expect(modelStat.avgCost).toBeGreaterThanOrEqual(0);
            }

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should calculate correct average latency per model', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          arbitraryScenario(),
          (models, scenario) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            // Perform multiple selections
            for (let i = 0; i < 5; i++) {
              selector.selectModelForScenario(scenario, availableModels);
            }

            // Get statistics
            const stats = selector.getSelectionStatistics();

            // Verify average latency is calculated
            for (const modelName in stats.modelStats) {
              const modelStat = stats.modelStats[modelName];
              expect(modelStat.avgLatency).toBeGreaterThan(0);
            }

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should support time range filtering', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          arbitraryScenario(),
          (models, scenario) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            // Perform selections at different times
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

            for (let i = 0; i < 5; i++) {
              selector.selectModelForScenario(scenario, availableModels);
            }

            // Get statistics with time range filter (Requirements: 7.4)
            const allStats = selector.getSelectionStatistics();
            const recentStats = selector.getSelectionStatistics(
              oneHourAgo,
              now
            );

            // Verify time filtering works
            expect(recentStats.totalSelections).toBeLessThanOrEqual(
              allStats.totalSelections
            );

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should track model distribution per scenario', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 2, maxLength: 10 }),
          arbitraryScenario(),
          (models, scenario) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            // Perform multiple selections
            for (let i = 0; i < 10; i++) {
              selector.selectModelForScenario(scenario, availableModels);
            }

            // Get statistics
            const stats = selector.getSelectionStatistics();

            // Verify model distribution is tracked per scenario
            if (stats.scenarioStats[scenario]) {
              const scenarioStat = stats.scenarioStats[scenario];
              expect(scenarioStat.models).toBeDefined();
              expect(scenarioStat.models.size).toBeGreaterThan(0);

              // Verify model counts sum to scenario count
              let totalModelCount = 0;
              scenarioStat.models.forEach((count) => {
                totalModelCount += count;
              });
              expect(totalModelCount).toBe(scenarioStat.count);
            }

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should track scenario distribution per model', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          fc.array(arbitraryScenario(), { minLength: 1, maxLength: 5 }),
          (models, scenarios) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            // Perform selections with different scenarios
            for (const scenario of scenarios) {
              for (let i = 0; i < 3; i++) {
                selector.selectModelForScenario(scenario, availableModels);
              }
            }

            // Get statistics
            const stats = selector.getSelectionStatistics();

            // Verify scenario distribution is tracked per model
            for (const modelName in stats.modelStats) {
              const modelStat = stats.modelStats[modelName];
              expect(modelStat.scenarios).toBeDefined();
              expect(modelStat.scenarios.size).toBeGreaterThan(0);
            }

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain total selections count', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          fc.array(arbitraryScenario(), { minLength: 1, maxLength: 5 }),
          (models, scenarios) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            selector.clearSelectionLog();

            // Perform selections
            let expectedCount = 0;
            for (const scenario of scenarios) {
              for (let i = 0; i < 3; i++) {
                selector.selectModelForScenario(scenario, availableModels);
                expectedCount++;
              }
            }

            // Get statistics
            const stats = selector.getSelectionStatistics();

            // Verify total selections count
            expect(stats.totalSelections).toBe(expectedCount);

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
