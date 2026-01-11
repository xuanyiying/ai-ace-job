/**
 * Model Selector Property-Based Tests
 * Tests for model selection correctness properties
 * **Feature: smart-model-selector, Property 3: 配置更新即时生效, Property 12: 回退链正确性, Property 13: 回退事件记录正确性**
 * **Validates: Requirements 1.4, 8.1, 8.2, 8.3, 8.4**
 */

import fc from 'fast-check';
import { ModelInfo } from '../interfaces';
import { ModelSelector } from './model.selector';
import { ScenarioModelMappingService } from './scenario-model-mapping.service';
import { ScenarioType as MappingScenarioType } from '../interfaces/model.interface';

describe('ModelSelector Property-Based Tests', () => {
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
      successRate: fc.float({ min: 0.5, max: Math.fround(1.0), noNaN: true }),
      isAvailable: fc.boolean(),
    });
  };

  beforeEach(() => {
    scenarioMappingService = new ScenarioModelMappingService();
    selector = new ModelSelector(scenarioMappingService);
  });

  describe('Property 3: Configuration Update Takes Effect Immediately', () => {
    it('should use updated scenario configuration on next selection', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 10 }),
          (models) => {
            // Ensure at least one model is available
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            // Get initial configuration

            // Update configuration with new weights (different from initial)
            const newWeights = { quality: 0.1, cost: 0.6, latency: 0.3 };
            scenarioMappingService.updateScenarioConfig(
              MappingScenarioType.RESUME_PARSING,
              { weights: newWeights }
            );

            // Get updated configuration
            const updatedConfig = scenarioMappingService.getScenarioConfig(
              MappingScenarioType.RESUME_PARSING
            );

            // Verify configuration was updated
            expect(updatedConfig.weights).toEqual(newWeights);

            // Verify selection uses new configuration
            const selectedModel = selector.selectModelForScenario(
              MappingScenarioType.RESUME_PARSING,
              availableModels
            );

            expect(selectedModel).toBeDefined();
            expect(selectedModel.isAvailable).toBe(true);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reflect primary model changes immediately', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 2, maxLength: 10 }),
          (models) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            // Update primary models
            const newPrimaryModels = [availableModels[0].name];
            scenarioMappingService.updateScenarioConfig(
              MappingScenarioType.RESUME_PARSING,
              { primaryModels: newPrimaryModels }
            );

            // Get updated configuration
            const updatedConfig = scenarioMappingService.getScenarioConfig(
              MappingScenarioType.RESUME_PARSING
            );

            // Verify primary models were updated
            expect(updatedConfig.primaryModels).toEqual(newPrimaryModels);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reflect fallback model changes immediately', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 2, maxLength: 10 }),
          (models) => {
            const availableModels = models.map((m) => ({
              ...m,
              isAvailable: true,
            }));

            // Update fallback models
            const newFallbackModels = [availableModels[1].name];
            scenarioMappingService.updateScenarioConfig(
              MappingScenarioType.RESUME_PARSING,
              { fallbackModels: newFallbackModels }
            );

            // Get updated configuration
            const updatedConfig = scenarioMappingService.getScenarioConfig(
              MappingScenarioType.RESUME_PARSING
            );

            // Verify fallback models were updated
            expect(updatedConfig.fallbackModels).toEqual(newFallbackModels);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 12: Fallback Chain Correctness', () => {
    it('should select first available model in fallback chain', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 3, maxLength: 10 }),
          (models) => {
            // Create models with specific names for testing
            const testModels = [
              { ...models[0], name: 'primary-model', isAvailable: false },
              { ...models[1], name: 'fallback-1', isAvailable: false },
              { ...models[2], name: 'fallback-2', isAvailable: true },
              ...models.slice(3).map((m) => ({ ...m, isAvailable: true })),
            ];

            // Configure scenario with specific fallback chain
            scenarioMappingService.updateScenarioConfig(
              MappingScenarioType.RESUME_PARSING,
              {
                primaryModels: ['primary-model'],
                fallbackModels: ['fallback-1', 'fallback-2'],
              }
            );

            // Select with fallback
            const selectedModel = selector.selectWithFallback(
              MappingScenarioType.RESUME_PARSING,
              testModels
            );

            // Should select fallback-2 (first available in chain)
            expect(selectedModel.name).toBe('fallback-2');

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should skip excluded models in fallback chain', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 3, maxLength: 10 }),
          (models) => {
            const testModels = [
              { ...models[0], name: 'primary-model', isAvailable: true },
              { ...models[1], name: 'fallback-1', isAvailable: true },
              { ...models[2], name: 'fallback-2', isAvailable: true },
              ...models.slice(3).map((m) => ({ ...m, isAvailable: true })),
            ];

            scenarioMappingService.updateScenarioConfig(
              MappingScenarioType.RESUME_PARSING,
              {
                primaryModels: ['primary-model'],
                fallbackModels: ['fallback-1', 'fallback-2'],
              }
            );

            // Exclude primary model
            const selectedModel = selector.selectWithFallback(
              MappingScenarioType.RESUME_PARSING,
              testModels,
              ['primary-model']
            );

            // Should select fallback-1 (first available after exclusion)
            expect(selectedModel.name).toBe('fallback-1');
            expect(selectedModel.name).not.toBe('primary-model');

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should use Ollama as final fallback when all configured models unavailable', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 2, maxLength: 10 }),
          (models) => {
            const testModels = [
              { ...models[0], name: 'primary-model', isAvailable: false },
              { ...models[1], name: 'fallback-1', isAvailable: false },
              { ...models[0], name: 'ollama', isAvailable: true },
              ...models.slice(2).map((m) => ({ ...m, isAvailable: true })),
            ];

            scenarioMappingService.updateScenarioConfig(
              MappingScenarioType.RESUME_PARSING,
              {
                primaryModels: ['primary-model'],
                fallbackModels: ['fallback-1'],
              }
            );

            // Select with fallback
            const selectedModel = selector.selectWithFallback(
              MappingScenarioType.RESUME_PARSING,
              testModels
            );

            // Should select ollama (final fallback)
            expect(selectedModel.name).toBe('ollama');

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should throw error when no model available in entire fallback chain', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 1, maxLength: 5 }),
          (models) => {
            // All models unavailable
            const testModels = models.map((m) => ({
              ...m,
              isAvailable: false,
            }));

            scenarioMappingService.updateScenarioConfig(
              MappingScenarioType.RESUME_PARSING,
              {
                primaryModels: ['primary-model'],
                fallbackModels: ['fallback-1'],
              }
            );

            // Should throw error
            expect(() => {
              selector.selectWithFallback(
                MappingScenarioType.RESUME_PARSING,
                testModels
              );
            }).toThrow();

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain fallback chain order', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 4, maxLength: 10 }),
          (models) => {
            const testModels = [
              { ...models[0], name: 'primary-model', isAvailable: false },
              { ...models[1], name: 'fallback-1', isAvailable: false },
              { ...models[2], name: 'fallback-2', isAvailable: false },
              { ...models[3], name: 'fallback-3', isAvailable: true },
              ...models.slice(4).map((m) => ({ ...m, isAvailable: true })),
            ];

            scenarioMappingService.updateScenarioConfig(
              MappingScenarioType.RESUME_PARSING,
              {
                primaryModels: ['primary-model'],
                fallbackModels: ['fallback-1', 'fallback-2', 'fallback-3'],
              }
            );

            const selectedModel = selector.selectWithFallback(
              MappingScenarioType.RESUME_PARSING,
              testModels
            );

            // Should select fallback-3 (respecting order)
            expect(selectedModel.name).toBe('fallback-3');

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 13: Fallback Event Recording Correctness', () => {
    it('should record fallback event when primary model unavailable', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 2, maxLength: 10 }),
          (models) => {
            const testModels = [
              { ...models[0], name: 'primary-model', isAvailable: false },
              { ...models[1], name: 'fallback-model', isAvailable: true },
              ...models.slice(2).map((m) => ({ ...m, isAvailable: true })),
            ];

            scenarioMappingService.updateScenarioConfig(
              MappingScenarioType.RESUME_PARSING,
              {
                primaryModels: ['primary-model'],
                fallbackModels: ['fallback-model'],
              }
            );

            // Clear log before test
            selector.clearSelectionLog();

            // Select with fallback
            selector.selectWithFallback(
              MappingScenarioType.RESUME_PARSING,
              testModels
            );

            // Get selection log
            const log = selector.getSelectionLog();

            // Should have recorded fallback event
            expect(log.length).toBeGreaterThan(0);

            // Find fallback event
            const fallbackEvent = log.find(
              (d) => d.fallbackEvent !== undefined
            );
            expect(fallbackEvent).toBeDefined();
            expect(fallbackEvent?.fallbackEvent?.originalModel).toBe(
              'primary-model'
            );
            expect(fallbackEvent?.fallbackEvent?.fallbackModel).toBe(
              'fallback-model'
            );

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should include scenario in fallback event', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 2, maxLength: 10 }),
          (models) => {
            const testModels = [
              { ...models[0], name: 'primary-model', isAvailable: false },
              { ...models[1], name: 'fallback-model', isAvailable: true },
              ...models.slice(2).map((m) => ({ ...m, isAvailable: true })),
            ];

            scenarioMappingService.updateScenarioConfig(
              MappingScenarioType.RESUME_OPTIMIZATION,
              {
                primaryModels: ['primary-model'],
                fallbackModels: ['fallback-model'],
              }
            );

            selector.clearSelectionLog();

            selector.selectWithFallback(
              MappingScenarioType.RESUME_OPTIMIZATION,
              testModels
            );

            const log = selector.getSelectionLog();
            const fallbackEvent = log.find(
              (d) => d.fallbackEvent !== undefined
            );

            expect(fallbackEvent?.fallbackEvent?.scenario).toBe(
              MappingScenarioType.RESUME_OPTIMIZATION
            );

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should include excluded models in fallback event', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 3, maxLength: 10 }),
          (models) => {
            const testModels = [
              { ...models[0], name: 'primary-model', isAvailable: true },
              { ...models[1], name: 'fallback-1', isAvailable: true },
              { ...models[2], name: 'fallback-2', isAvailable: true },
              ...models.slice(3).map((m) => ({ ...m, isAvailable: true })),
            ];

            scenarioMappingService.updateScenarioConfig(
              MappingScenarioType.RESUME_PARSING,
              {
                primaryModels: ['primary-model'],
                fallbackModels: ['fallback-1', 'fallback-2'],
              }
            );

            selector.clearSelectionLog();

            const excludedModels = ['primary-model'];
            selector.selectWithFallback(
              MappingScenarioType.RESUME_PARSING,
              testModels,
              excludedModels
            );

            const log = selector.getSelectionLog();
            const fallbackEvent = log.find(
              (d) => d.fallbackEvent !== undefined
            );

            expect(fallbackEvent?.fallbackEvent?.excludedModels).toContain(
              'primary-model'
            );

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should include agent context in fallback event', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 2, maxLength: 10 }),
          (models) => {
            const testModels = [
              { ...models[0], name: 'primary-model', isAvailable: false },
              { ...models[1], name: 'fallback-model', isAvailable: true },
              ...models.slice(2).map((m) => ({ ...m, isAvailable: true })),
            ];

            scenarioMappingService.updateScenarioConfig(
              MappingScenarioType.RESUME_PARSING,
              {
                primaryModels: ['primary-model'],
                fallbackModels: ['fallback-model'],
              }
            );

            selector.clearSelectionLog();

            const agentContext = {
              agentType: 'pitch-perfect',
              workflowStep: 'star-extraction',
              userId: 'user-123',
            };

            selector.selectWithFallback(
              MappingScenarioType.RESUME_PARSING,
              testModels,
              [],
              agentContext
            );

            const log = selector.getSelectionLog();
            const fallbackEvent = log.find(
              (d) => d.fallbackEvent !== undefined
            );

            expect(fallbackEvent?.fallbackEvent?.agentType).toBe(
              'pitch-perfect'
            );
            expect(fallbackEvent?.fallbackEvent?.workflowStep).toBe(
              'star-extraction'
            );
            expect(fallbackEvent?.fallbackEvent?.userId).toBe('user-123');

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should not record fallback event when primary model available', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), { minLength: 2, maxLength: 10 }),
          (models) => {
            const testModels = [
              { ...models[0], name: 'primary-model', isAvailable: true },
              { ...models[1], name: 'fallback-model', isAvailable: true },
              ...models.slice(2).map((m) => ({ ...m, isAvailable: true })),
            ];

            scenarioMappingService.updateScenarioConfig(
              MappingScenarioType.RESUME_PARSING,
              {
                primaryModels: ['primary-model'],
                fallbackModels: ['fallback-model'],
              }
            );

            selector.clearSelectionLog();

            selector.selectWithFallback(
              MappingScenarioType.RESUME_PARSING,
              testModels
            );

            const log = selector.getSelectionLog();

            // Should not have fallback event (primary model was available)
            const fallbackEvent = log.find(
              (d) => d.fallbackEvent !== undefined
            );
            expect(fallbackEvent).toBeUndefined();

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
