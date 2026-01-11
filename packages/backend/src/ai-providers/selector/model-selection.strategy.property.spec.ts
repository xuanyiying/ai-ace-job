/**
 * Property-Based Tests for Model Selection Strategies
 * Tests correctness properties of model selection strategies
 * **Feature: smart-model-selector, Property 6: 质量优化选择正确性**
 * **Validates: Requirements 3.2, 3.4**
 */

import * as fc from 'fast-check';
import { ModelInfo } from '../interfaces';
import {
  QualityOptimizedStrategy,
  CostOptimizedStrategy,
  LatencyOptimizedStrategy,
  BalancedStrategy,
} from './model-selection.strategy';

/**
 * Arbitrary generator for ModelInfo
 */
const arbitraryModelInfo = (): fc.Arbitrary<ModelInfo> => {
  return fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    provider: fc.string({ minLength: 1, maxLength: 20 }),
    contextWindow: fc.integer({ min: 512, max: 200000 }),
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

/**
 * Arbitrary generator for available ModelInfo (isAvailable = true)
 */
const arbitraryAvailableModelInfo = (): fc.Arbitrary<ModelInfo> => {
  return arbitraryModelInfo().map((model) => ({
    ...model,
    isAvailable: true,
  }));
};

describe('Model Selection Strategies - Property-Based Tests', () => {
  /**
   * Property 6: 质量优化选择正确性
   * For any list of available models, the quality optimized strategy should select
   * the model with the highest quality rank in the ranking list.
   * If the highest quality model is not available, it should select the next highest quality model.
   * Validates: Requirements 3.2, 3.4
   */
  describe('Property 6: 质量优化选择正确性', () => {
    let strategy: QualityOptimizedStrategy;

    beforeEach(() => {
      strategy = new QualityOptimizedStrategy({});
    });

    it('should select the highest quality available model from ranking', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryAvailableModelInfo(), {
            minLength: 1,
            maxLength: 10,
          }),
          (models) => {
            const selected = strategy.selectModel(models, {
              scenario: 'test',
            });

            // Selected model must be available
            expect(selected.isAvailable).toBe(true);

            // Selected model must be in the input list
            expect(models).toContain(selected);

            // Get quality ranks for all models
            const ranks = models.map((m) => ({
              model: m,
              rank: strategy.getModelQualityRank(m.name),
            }));

            // Find the highest rank among available models
            const maxRank = Math.max(
              ...ranks.map((r) => (r.model.isAvailable ? r.rank : -1))
            );

            // If there's a ranked model, selected should have the highest rank
            if (maxRank >= 0) {
              const selectedRank = strategy.getModelQualityRank(selected.name);
              expect(selectedRank).toBe(maxRank);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should degrade to next quality model when highest is unavailable', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelInfo(), {
            minLength: 2,
            maxLength: 10,
          }),
          (models) => {
            // Ensure at least one model is available
            const modelsWithAvailable = models.map((m, i) => ({
              ...m,
              isAvailable: i === 0 || i === 1, // At least first two are available
            }));

            const selected = strategy.selectModel(modelsWithAvailable, {
              scenario: 'test',
            });

            // Selected model must be available
            expect(selected.isAvailable).toBe(true);

            // Get available models
            const availableModels = modelsWithAvailable.filter(
              (m) => m.isAvailable
            );

            // Selected must be one of the available models
            expect(availableModels).toContain(selected);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle custom quality ranking', () => {
      const customRanking = [
        'model-a',
        'model-b',
        'model-c',
        'model-d',
        'model-e',
      ];
      const customStrategy = new QualityOptimizedStrategy({
        qualityRanking: customRanking,
      });

      fc.assert(
        fc.property(
          fc.array(arbitraryAvailableModelInfo(), {
            minLength: 1,
            maxLength: 5,
          }),
          (models) => {
            // Replace model names with custom ranking names
            const customModels = models.map((m, i) => ({
              ...m,
              name: customRanking[i % customRanking.length],
            }));

            const selected = customStrategy.selectModel(customModels, {
              scenario: 'test',
            });

            // Selected model must be in custom ranking
            expect(customRanking).toContain(selected.name);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update quality ranking dynamically', () => {
      const initialRanking = ['model-a', 'model-b', 'model-c'];
      const updatedRanking = ['model-x', 'model-y', 'model-z'];

      const testStrategy = new QualityOptimizedStrategy({
        qualityRanking: initialRanking,
      });

      // Verify initial ranking
      expect(testStrategy.getQualityRanking()).toEqual(initialRanking);

      // Update ranking
      testStrategy.updateQualityRanking(updatedRanking);

      // Verify updated ranking
      expect(testStrategy.getQualityRanking()).toEqual(updatedRanking);
    });

    it('should return first available model when none are in ranking', () => {
      const strategy = new QualityOptimizedStrategy({
        qualityRanking: ['ranked-model-1'],
      });

      fc.assert(
        fc.property(
          fc.array(arbitraryAvailableModelInfo(), {
            minLength: 1,
            maxLength: 5,
          }),
          (models) => {
            // Ensure no models match the ranking
            const unrankedModels = models.map((m) => ({
              ...m,
              name: `unranked-${Math.random()}`,
            }));

            const selected = strategy.selectModel(unrankedModels, {
              scenario: 'test',
            });

            // Should return first available model
            expect(selected).toBe(unrankedModels[0]);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error when no models available', () => {
      expect(() => {
        strategy.selectModel([], { scenario: 'test' });
      }).toThrow('No available models for selection');
    });

    it('should handle case-insensitive model name matching', () => {
      const ranking = ['GPT-4', 'Claude-3'];
      const testStrategy = new QualityOptimizedStrategy({
        qualityRanking: ranking,
      });

      const models: ModelInfo[] = [
        {
          name: 'gpt-4',
          provider: 'openai',
          contextWindow: 8192,
          costPerInputToken: 0.03,
          costPerOutputToken: 0.06,
          latency: 1000,
          successRate: 0.99,
          isAvailable: true,
        },
      ];

      const selected = testStrategy.selectModel(models, { scenario: 'test' });

      // Should match despite case difference
      expect(selected.name).toBe('gpt-4');
    });

    it('should handle partial name matching with hyphens', () => {
      const ranking = ['Qwen2.5-72B'];
      const testStrategy = new QualityOptimizedStrategy({
        qualityRanking: ranking,
      });

      const models: ModelInfo[] = [
        {
          name: 'Qwen2.5-72B-Instruct',
          provider: 'qwen',
          contextWindow: 32768,
          costPerInputToken: 0.0006,
          costPerOutputToken: 0.0012,
          latency: 3000,
          successRate: 0.96,
          isAvailable: true,
        },
      ];

      const selected = testStrategy.selectModel(models, { scenario: 'test' });

      // Should match with partial name
      expect(selected.name).toBe('Qwen2.5-72B-Instruct');
    });

    it('should prefer higher ranked model over lower ranked', () => {
      const ranking = ['model-low', 'model-high'];
      const testStrategy = new QualityOptimizedStrategy({
        qualityRanking: ranking,
      });

      const models: ModelInfo[] = [
        {
          name: 'model-low',
          provider: 'provider1',
          contextWindow: 4096,
          costPerInputToken: 0.001,
          costPerOutputToken: 0.002,
          latency: 500,
          successRate: 0.9,
          isAvailable: true,
        },
        {
          name: 'model-high',
          provider: 'provider2',
          contextWindow: 8192,
          costPerInputToken: 0.01,
          costPerOutputToken: 0.02,
          latency: 2000,
          successRate: 0.99,
          isAvailable: true,
        },
      ];

      const selected = testStrategy.selectModel(models, { scenario: 'test' });

      // Should select higher ranked model
      expect(selected.name).toBe('model-high');
    });

    it('should degrade gracefully when higher ranked models are unavailable', () => {
      const ranking = ['model-1', 'model-2', 'model-3'];
      const testStrategy = new QualityOptimizedStrategy({
        qualityRanking: ranking,
      });

      const models: ModelInfo[] = [
        {
          name: 'model-1',
          provider: 'provider1',
          contextWindow: 4096,
          costPerInputToken: 0.001,
          costPerOutputToken: 0.002,
          latency: 500,
          successRate: 0.9,
          isAvailable: false, // Unavailable
        },
        {
          name: 'model-2',
          provider: 'provider2',
          contextWindow: 8192,
          costPerInputToken: 0.01,
          costPerOutputToken: 0.02,
          latency: 2000,
          successRate: 0.95,
          isAvailable: false, // Also unavailable
        },
        {
          name: 'model-3',
          provider: 'provider3',
          contextWindow: 16384,
          costPerInputToken: 0.05,
          costPerOutputToken: 0.1,
          latency: 3000,
          successRate: 0.99,
          isAvailable: true, // Available
        },
      ];

      const selected = testStrategy.selectModel(models, { scenario: 'test' });

      // Should select model-3 (highest available in ranking)
      expect(selected.name).toBe('model-3');
    });

    it('should get correct quality rank for models', () => {
      const ranking = ['model-a', 'model-b', 'model-c'];
      const testStrategy = new QualityOptimizedStrategy({
        qualityRanking: ranking,
      });

      // Test exact matches
      expect(testStrategy.getModelQualityRank('model-a')).toBe(0);
      expect(testStrategy.getModelQualityRank('model-b')).toBe(1);
      expect(testStrategy.getModelQualityRank('model-c')).toBe(2);

      // Test non-existent model
      expect(testStrategy.getModelQualityRank('model-unknown')).toBe(-1);

      // Test case-insensitive match
      expect(testStrategy.getModelQualityRank('MODEL-A')).toBe(0);

      // Test partial match with hyphen
      expect(testStrategy.getModelQualityRank('model-a-instruct')).toBe(0);
    });
  });

  /**
   * Cost Optimized Strategy Tests
   */
  describe('Cost Optimized Strategy', () => {
    let strategy: CostOptimizedStrategy;

    beforeEach(() => {
      strategy = new CostOptimizedStrategy({});
    });

    it('should select lowest cost model', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryAvailableModelInfo(), {
            minLength: 1,
            maxLength: 10,
          }),
          (models) => {
            const selected = strategy.selectModel(models, {
              scenario: 'test',
            });

            const selectedCost =
              selected.costPerInputToken + selected.costPerOutputToken;
            const minCost = Math.min(
              ...models.map((m) => m.costPerInputToken + m.costPerOutputToken)
            );

            expect(selectedCost).toBe(minCost);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 7: 成本优化选择正确性
     * For any list of available models and a quality threshold,
     * the cost optimized strategy should select the lowest cost model
     * that meets the quality threshold. If no models meet the threshold,
     * it should select the lowest cost model overall.
     * Validates: Requirements 4.1, 4.2, 4.3
     */
    it('should select lowest cost model meeting quality threshold', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryAvailableModelInfo(), {
            minLength: 1,
            maxLength: 10,
          }),
          fc.float({ min: 1, max: 10 }),
          (models, qualityThreshold) => {
            const testStrategy = new CostOptimizedStrategy({
              minQualityThreshold: qualityThreshold,
            });

            const selected = testStrategy.selectModel(models, {
              scenario: 'test',
            });

            // Selected model must be available
            expect(selected.isAvailable).toBe(true);

            // Selected model must be in the input list
            expect(models).toContain(selected);

            // Get models that meet quality threshold
            const qualifiedModels = models.filter((m) => {
              const qualityRating = (
                m as ModelInfo & { qualityRating?: number }
              ).qualityRating;
              return (
                qualityRating === undefined || qualityRating >= qualityThreshold
              );
            });

            if (qualifiedModels.length > 0) {
              // If there are qualified models, selected should be one of them
              expect(qualifiedModels).toContain(selected);

              // Selected should have the lowest cost among qualified models
              const selectedCost =
                selected.costPerInputToken + selected.costPerOutputToken;
              const minQualifiedCost = Math.min(
                ...qualifiedModels.map(
                  (m) => m.costPerInputToken + m.costPerOutputToken
                )
              );
              expect(selectedCost).toBe(minQualifiedCost);
            } else {
              // If no qualified models, selected should be lowest cost overall
              const selectedCost =
                selected.costPerInputToken + selected.costPerOutputToken;
              const minCost = Math.min(
                ...models.map((m) => m.costPerInputToken + m.costPerOutputToken)
              );
              expect(selectedCost).toBe(minCost);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect cost constraint if specified', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryAvailableModelInfo(), {
            minLength: 1,
            maxLength: 10,
          }),
          fc.float({ min: 0, max: Math.fround(0.1) }),
          (models, maxCost) => {
            const selected = strategy.selectModel(models, {
              scenario: 'test',
              maxCost: maxCost,
            });

            const selectedCost =
              selected.costPerInputToken + selected.costPerOutputToken;

            // Selected cost should be <= maxCost or be the minimum available
            const modelsWithinCost = models.filter(
              (m) => m.costPerInputToken + m.costPerOutputToken <= maxCost
            );

            if (modelsWithinCost.length > 0) {
              expect(selectedCost).toBeLessThanOrEqual(maxCost);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate total cost correctly', () => {
      const model: ModelInfo = {
        name: 'test-model',
        provider: 'test',
        contextWindow: 4096,
        costPerInputToken: 0.001,
        costPerOutputToken: 0.002,
        latency: 500,
        successRate: 0.95,
        isAvailable: true,
      };

      // Test with default token estimates
      const defaultCost = strategy.calculateTotalCost(model);
      expect(defaultCost).toBe(0.001 * 1000 + 0.002 * 500); // 1.0 + 1.0 = 2.0

      // Test with custom token estimates
      const customCost = strategy.calculateTotalCost(model, 2000, 1000);
      expect(customCost).toBe(0.001 * 2000 + 0.002 * 1000); // 2.0 + 2.0 = 4.0
    });

    it('should manage quality threshold configuration', () => {
      const initialThreshold = 6;
      const testStrategy = new CostOptimizedStrategy({
        minQualityThreshold: initialThreshold,
      });

      expect(testStrategy.getMinQualityThreshold()).toBe(initialThreshold);

      // Update threshold
      testStrategy.setMinQualityThreshold(8);
      expect(testStrategy.getMinQualityThreshold()).toBe(8);

      // Test boundary values
      testStrategy.setMinQualityThreshold(0);
      expect(testStrategy.getMinQualityThreshold()).toBe(1); // Clamped to 1

      testStrategy.setMinQualityThreshold(15);
      expect(testStrategy.getMinQualityThreshold()).toBe(10); // Clamped to 10
    });

    it('should manage low-cost models list', () => {
      const defaultLowCostModels = strategy.getLowCostModels();
      expect(defaultLowCostModels.length).toBeGreaterThan(0);

      const customModels = ['model-a', 'model-b', 'model-c'];
      strategy.setLowCostModels(customModels);

      expect(strategy.getLowCostModels()).toEqual(customModels);
    });

    it('should throw error when no models available', () => {
      expect(() => {
        strategy.selectModel([], { scenario: 'test' });
      }).toThrow('No available models for selection');
    });

    it('should handle models with quality ratings', () => {
      const testStrategy = new CostOptimizedStrategy({
        minQualityThreshold: 7,
      });

      const models: ModelInfo[] = [
        {
          name: 'low-quality-cheap',
          provider: 'test',
          contextWindow: 4096,
          costPerInputToken: 0.0001,
          costPerOutputToken: 0.0002,
          latency: 500,
          successRate: 0.95,
          isAvailable: true,
          qualityRating: 5, // Below threshold
        } as ModelInfo & { qualityRating: number },
        {
          name: 'high-quality-expensive',
          provider: 'test',
          contextWindow: 8192,
          costPerInputToken: 0.001,
          costPerOutputToken: 0.002,
          latency: 1000,
          successRate: 0.99,
          isAvailable: true,
          qualityRating: 9, // Above threshold
        } as ModelInfo & { qualityRating: number },
      ];

      const selected = testStrategy.selectModel(models, {
        scenario: 'test',
      });

      // Should select high-quality model even though it's more expensive
      expect(selected.name).toBe('high-quality-expensive');
    });

    it('should fallback to lowest cost when no models meet quality threshold', () => {
      const testStrategy = new CostOptimizedStrategy({
        minQualityThreshold: 9,
      });

      const models: ModelInfo[] = [
        {
          name: 'model-a',
          provider: 'test',
          contextWindow: 4096,
          costPerInputToken: 0.001,
          costPerOutputToken: 0.002,
          latency: 500,
          successRate: 0.95,
          isAvailable: true,
          qualityRating: 5, // Below threshold
        } as ModelInfo & { qualityRating: number },
        {
          name: 'model-b',
          provider: 'test',
          contextWindow: 8192,
          costPerInputToken: 0.0001,
          costPerOutputToken: 0.0002,
          latency: 1000,
          successRate: 0.99,
          isAvailable: true,
          qualityRating: 6, // Below threshold
        } as ModelInfo & { qualityRating: number },
      ];

      const selected = testStrategy.selectModel(models, {
        scenario: 'test',
      });

      // Should select lowest cost model (model-b) since none meet threshold
      expect(selected.name).toBe('model-b');
    });
  });

  /**
   * Latency Optimized Strategy Tests
   * **Feature: smart-model-selector, Property 8: 延迟优化选择正确性**
   * **Feature: smart-model-selector, Property 9: 延迟阈值处理正确性**
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
   */
  describe('Latency Optimized Strategy', () => {
    let strategy: LatencyOptimizedStrategy;

    beforeEach(() => {
      strategy = new LatencyOptimizedStrategy({});
    });

    /**
     * Property 8: 延迟优化选择正确性
     * For any list of available models, the latency optimized strategy should select
     * the model with the lowest latency.
     * Validates: Requirements 5.1, 5.2
     */
    it('should select lowest latency model', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryAvailableModelInfo(), {
            minLength: 1,
            maxLength: 10,
          }),
          (models) => {
            const selected = strategy.selectModel(models, {
              scenario: 'test',
            });

            const minLatency = Math.min(...models.map((m) => m.latency));

            // Selected model must have the minimum latency
            expect(selected.latency).toBe(minLatency);

            // Selected model must be in the input list
            expect(models).toContain(selected);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 9: 延迟阈值处理正确性
     * For any list of available models and a latency threshold,
     * if all models exceed the threshold, the strategy should select
     * the model with the lowest latency and log a warning.
     * If some models are within the threshold, only those should be considered.
     * Validates: Requirements 5.3, 5.4
     */
    it('should respect latency threshold when models are within threshold', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryAvailableModelInfo(), {
            minLength: 1,
            maxLength: 10,
          }),
          fc.integer({ min: 100, max: 5000 }),
          (models, threshold) => {
            const selected = strategy.selectModel(models, {
              scenario: 'test',
              maxLatency: threshold,
            });

            // Get models within threshold
            const modelsWithinThreshold = models.filter(
              (m) => m.latency <= threshold
            );

            if (modelsWithinThreshold.length > 0) {
              // If there are models within threshold, selected should be one of them
              expect(modelsWithinThreshold).toContain(selected);

              // Selected should have the lowest latency among those within threshold
              const minLatencyWithinThreshold = Math.min(
                ...modelsWithinThreshold.map((m) => m.latency)
              );
              expect(selected.latency).toBe(minLatencyWithinThreshold);
            } else {
              // If no models within threshold, selected should be the one with lowest latency overall
              const minLatency = Math.min(...models.map((m) => m.latency));
              expect(selected.latency).toBe(minLatency);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log warning when all models exceed latency threshold', () => {
      const mockLogger = {
        warn: jest.fn(),
      };

      const testStrategy = new LatencyOptimizedStrategy({
        maxLatencyThreshold: 500,
      }); // Very low threshold
      testStrategy.setLogger(mockLogger);

      const models: ModelInfo[] = [
        {
          name: 'slow-model-1',
          provider: 'provider1',
          contextWindow: 4096,
          costPerInputToken: 0.001,
          costPerOutputToken: 0.002,
          latency: 2000, // Exceeds threshold
          successRate: 0.9,
          isAvailable: true,
        },
        {
          name: 'slow-model-2',
          provider: 'provider2',
          contextWindow: 8192,
          costPerInputToken: 0.01,
          costPerOutputToken: 0.02,
          latency: 3000, // Exceeds threshold
          successRate: 0.95,
          isAvailable: true,
        },
      ];

      const selected = testStrategy.selectModel(models, {
        scenario: 'test',
      });

      // Should select the model with lowest latency
      expect(selected.name).toBe('slow-model-1');

      // Should have logged a warning
      expect(mockLogger.warn).toHaveBeenCalled();
      const warningMessage = mockLogger.warn.mock.calls[0][0];
      expect(warningMessage).toContain('latency threshold');
      expect(warningMessage).toContain('500');
    });

    it('should select lowest latency model within threshold', () => {
      const testStrategy = new LatencyOptimizedStrategy({
        maxLatencyThreshold: 1500,
      });

      const models: ModelInfo[] = [
        {
          name: 'fast-model',
          provider: 'provider1',
          contextWindow: 4096,
          costPerInputToken: 0.001,
          costPerOutputToken: 0.002,
          latency: 800, // Within threshold
          successRate: 0.9,
          isAvailable: true,
        },
        {
          name: 'medium-model',
          provider: 'provider2',
          contextWindow: 8192,
          costPerInputToken: 0.01,
          costPerOutputToken: 0.02,
          latency: 1200, // Within threshold
          successRate: 0.95,
          isAvailable: true,
        },
        {
          name: 'slow-model',
          provider: 'provider3',
          contextWindow: 16384,
          costPerInputToken: 0.05,
          costPerOutputToken: 0.1,
          latency: 3000, // Exceeds threshold
          successRate: 0.99,
          isAvailable: true,
        },
      ];

      const selected = testStrategy.selectModel(models, {
        scenario: 'test',
      });

      // Should select the fastest model within threshold
      expect(selected.name).toBe('fast-model');
    });

    it('should manage latency threshold configuration', () => {
      const initialThreshold = 2000;
      const testStrategy = new LatencyOptimizedStrategy({
        maxLatencyThreshold: initialThreshold,
      });

      expect(testStrategy.getMaxLatencyThreshold()).toBe(initialThreshold);

      // Update threshold
      testStrategy.setMaxLatencyThreshold(3000);
      expect(testStrategy.getMaxLatencyThreshold()).toBe(3000);

      // Test with zero threshold
      testStrategy.setMaxLatencyThreshold(0);
      expect(testStrategy.getMaxLatencyThreshold()).toBe(0);

      // Test with negative threshold (should be clamped to 0)
      testStrategy.setMaxLatencyThreshold(-100);
      expect(testStrategy.getMaxLatencyThreshold()).toBe(0);
    });

    it('should use context maxLatency over configured threshold', () => {
      const testStrategy = new LatencyOptimizedStrategy({
        maxLatencyThreshold: 1000,
      }); // Configured threshold

      const models: ModelInfo[] = [
        {
          name: 'model-1',
          provider: 'provider1',
          contextWindow: 4096,
          costPerInputToken: 0.001,
          costPerOutputToken: 0.002,
          latency: 800,
          successRate: 0.9,
          isAvailable: true,
        },
        {
          name: 'model-2',
          provider: 'provider2',
          contextWindow: 8192,
          costPerInputToken: 0.01,
          costPerOutputToken: 0.02,
          latency: 1500,
          successRate: 0.95,
          isAvailable: true,
        },
      ];

      // Use context maxLatency that's higher than configured threshold
      const selected = testStrategy.selectModel(models, {
        scenario: 'test',
        maxLatency: 2000, // Context threshold overrides configured 1000
      });

      // Should select model-2 because context threshold allows it
      expect(selected.name).toBe('model-1'); // Still selects lowest latency
    });

    it('should throw error when no models available', () => {
      expect(() => {
        strategy.selectModel([], { scenario: 'test' });
      }).toThrow('No available models for selection');
    });

    it('should handle models with identical latency', () => {
      const models: ModelInfo[] = [
        {
          name: 'model-a',
          provider: 'provider1',
          contextWindow: 4096,
          costPerInputToken: 0.001,
          costPerOutputToken: 0.002,
          latency: 1000,
          successRate: 0.9,
          isAvailable: true,
        },
        {
          name: 'model-b',
          provider: 'provider2',
          contextWindow: 8192,
          costPerInputToken: 0.01,
          costPerOutputToken: 0.02,
          latency: 1000, // Same latency
          successRate: 0.95,
          isAvailable: true,
        },
      ];

      const selected = strategy.selectModel(models, {
        scenario: 'test',
      });

      // Should select one of the models with minimum latency
      expect(selected.latency).toBe(1000);
      expect([models[0], models[1]]).toContain(selected);
    });

    it('should handle single model', () => {
      const models: ModelInfo[] = [
        {
          name: 'only-model',
          provider: 'provider1',
          contextWindow: 4096,
          costPerInputToken: 0.001,
          costPerOutputToken: 0.002,
          latency: 1000,
          successRate: 0.9,
          isAvailable: true,
        },
      ];

      const selected = strategy.selectModel(models, {
        scenario: 'test',
      });

      expect(selected.name).toBe('only-model');
    });

    it('should handle very high latency threshold', () => {
      const testStrategy = new LatencyOptimizedStrategy({
        maxLatencyThreshold: 100000,
      }); // Very high threshold

      const models: ModelInfo[] = [
        {
          name: 'model-1',
          provider: 'provider1',
          contextWindow: 4096,
          costPerInputToken: 0.001,
          costPerOutputToken: 0.002,
          latency: 5000,
          successRate: 0.9,
          isAvailable: true,
        },
        {
          name: 'model-2',
          provider: 'provider2',
          contextWindow: 8192,
          costPerInputToken: 0.01,
          costPerOutputToken: 0.02,
          latency: 3000,
          successRate: 0.95,
          isAvailable: true,
        },
      ];

      const selected = testStrategy.selectModel(models, {
        scenario: 'test',
      });

      // Should select lowest latency model
      expect(selected.name).toBe('model-2');
    });

    it('should handle very low latency threshold', () => {
      const testStrategy = new LatencyOptimizedStrategy({
        maxLatencyThreshold: 100,
      }); // Very low threshold

      const mockLogger = {
        warn: jest.fn(),
      };
      testStrategy.setLogger(mockLogger);

      const models: ModelInfo[] = [
        {
          name: 'model-1',
          provider: 'provider1',
          contextWindow: 4096,
          costPerInputToken: 0.001,
          costPerOutputToken: 0.002,
          latency: 5000,
          successRate: 0.9,
          isAvailable: true,
        },
        {
          name: 'model-2',
          provider: 'provider2',
          contextWindow: 8192,
          costPerInputToken: 0.01,
          costPerOutputToken: 0.02,
          latency: 3000,
          successRate: 0.95,
          isAvailable: true,
        },
      ];

      const selected = testStrategy.selectModel(models, {
        scenario: 'test',
      });

      // Should select lowest latency model and log warning
      expect(selected.name).toBe('model-2');
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  /**
   * Balanced Strategy Tests
   */
  describe('Balanced Strategy', () => {
    let strategy: BalancedStrategy;

    beforeEach(() => {
      strategy = new BalancedStrategy();
    });

    it('should select a model that balances cost, latency, and quality', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryAvailableModelInfo(), {
            minLength: 1,
            maxLength: 10,
          }),
          (models) => {
            const selected = strategy.selectModel(models, {
              scenario: 'test',
            });

            // Selected model must be available
            expect(selected.isAvailable).toBe(true);

            // Selected model must be in the input list
            expect(models).toContain(selected);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
