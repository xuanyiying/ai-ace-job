/**
 * Property-Based Tests for ScenarioModelMappingService
 * Tests correctness properties of scenario model mapping
 * Requirements: 1.1, 1.2, 1.3
 */

import * as fc from 'fast-check';
import { ScenarioModelMappingService } from './scenario-model-mapping.service';
import { SelectionStrategyType } from '../interfaces/model.interface';

describe('ScenarioModelMappingService - Property-Based Tests', () => {
  let service: ScenarioModelMappingService;

  beforeEach(() => {
    service = new ScenarioModelMappingService();
  });

  /**
   * Property 1: 场景配置完整性
   * For any registered scenario type, getScenarioConfig should return a valid configuration
   * with non-empty primary and fallback model lists
   * Validates: Requirements 1.1, 1.2
   */
  describe('Property 1: 场景配置完整性', () => {
    it('should return complete configuration for all registered scenarios', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...service.getAllScenarios()),
          (scenario) => {
            const config = service.getScenarioConfig(scenario);

            // Configuration must exist
            expect(config).toBeDefined();

            // Scenario must match
            expect(config.scenario).toBe(scenario);

            // Primary models must be non-empty
            expect(config.primaryModels).toBeDefined();
            expect(Array.isArray(config.primaryModels)).toBe(true);
            expect(config.primaryModels.length).toBeGreaterThan(0);

            // Fallback models must be non-empty
            expect(config.fallbackModels).toBeDefined();
            expect(Array.isArray(config.fallbackModels)).toBe(true);
            expect(config.fallbackModels.length).toBeGreaterThan(0);

            // Strategy must be valid
            expect(Object.values(SelectionStrategyType)).toContain(
              config.strategy
            );

            // Weights must exist
            expect(config.weights).toBeDefined();
            expect(config.weights.quality).toBeDefined();
            expect(config.weights.cost).toBeDefined();
            expect(config.weights.latency).toBeDefined();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return a copy of configuration to prevent external modifications', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...service.getAllScenarios()),
          (scenario) => {
            const config1 = service.getScenarioConfig(scenario);
            const config2 = service.getScenarioConfig(scenario);

            // Configurations should have same values
            expect(config1.scenario).toBe(config2.scenario);
            expect(config1.strategy).toBe(config2.strategy);

            // But should be different objects
            expect(config1).not.toBe(config2);
            expect(config1.primaryModels).not.toBe(config2.primaryModels);
            expect(config1.fallbackModels).not.toBe(config2.fallbackModels);
            expect(config1.weights).not.toBe(config2.weights);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: 配置权重有效性
   * For any scenario configuration, the weights must sum to 1.0 and each weight
   * must be in the range [0, 1]
   * Validates: Requirements 1.3
   */
  describe('Property 2: 配置权重有效性', () => {
    it('should have valid weights for all scenarios', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...service.getAllScenarios()),
          (scenario) => {
            const config = service.getScenarioConfig(scenario);
            const { quality, cost, latency } = config.weights;

            // Each weight must be in [0, 1]
            expect(quality).toBeGreaterThanOrEqual(0);
            expect(quality).toBeLessThanOrEqual(1);
            expect(cost).toBeGreaterThanOrEqual(0);
            expect(cost).toBeLessThanOrEqual(1);
            expect(latency).toBeGreaterThanOrEqual(0);
            expect(latency).toBeLessThanOrEqual(1);

            // Weights must sum to 1.0 (with small tolerance for floating point)
            const sum = quality + cost + latency;
            const tolerance = 0.0001;
            expect(Math.abs(sum - 1.0)).toBeLessThan(tolerance);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid weights when updating configuration', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...service.getAllScenarios()),
          fc.float({ min: 0, max: 1 }),
          fc.float({ min: 0, max: 1 }),
          (scenario, weight1, weight2) => {
            // Create invalid weights that don't sum to 1.0
            const invalidWeights = {
              quality: weight1,
              cost: weight2,
              latency: 0.5, // This will likely not sum to 1.0
            };

            const sum = weight1 + weight2 + 0.5;
            const tolerance = 0.0001;

            if (Math.abs(sum - 1.0) > tolerance) {
              // Should throw error for invalid weights
              expect(() => {
                service.updateScenarioConfig(scenario, {
                  weights: invalidWeights,
                });
              }).toThrow();
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 3: 配置更新即时生效
   * For any scenario configuration update, the new configuration should be
   * immediately returned by getScenarioConfig
   * Validates: Requirements 1.4
   */
  describe('Property 3: 配置更新即时生效', () => {
    it('should apply configuration updates immediately', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...service.getAllScenarios()),
          fc.array(fc.string({ minLength: 1 }), {
            minLength: 1,
            maxLength: 3,
          }),
          (scenario, newPrimaryModels) => {
            const originalConfig = service.getScenarioConfig(scenario);

            // Update with new primary models
            service.updateScenarioConfig(scenario, {
              primaryModels: newPrimaryModels,
            });

            // Get updated configuration
            const updatedConfig = service.getScenarioConfig(scenario);

            // New primary models should be applied
            expect(updatedConfig.primaryModels).toEqual(newPrimaryModels);

            // Other properties should remain unchanged
            expect(updatedConfig.fallbackModels).toEqual(
              originalConfig.fallbackModels
            );
            expect(updatedConfig.strategy).toBe(originalConfig.strategy);
            expect(updatedConfig.weights).toEqual(originalConfig.weights);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should apply weight updates immediately', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...service.getAllScenarios()),
          fc.float({ min: 0, max: 1 }),
          (scenario, newQuality) => {
            // Generate cost and latency that sum with quality to 1.0
            const remainingWeight = 1.0 - newQuality;
            const newCost = remainingWeight * 0.5; // Half of remaining
            const newLatency = remainingWeight * 0.5; // Other half

            // Ensure all values are valid numbers (not NaN)
            if (
              !Number.isFinite(newQuality) ||
              !Number.isFinite(newCost) ||
              !Number.isFinite(newLatency)
            ) {
              return true;
            }

            const newWeights = {
              quality: newQuality,
              cost: newCost,
              latency: newLatency,
            };

            // Update weights
            service.updateScenarioConfig(scenario, { weights: newWeights });

            // Get updated configuration
            const updatedConfig = service.getScenarioConfig(scenario);

            // New weights should be applied
            expect(updatedConfig.weights.quality).toBeCloseTo(newQuality);
            expect(updatedConfig.weights.cost).toBeCloseTo(newCost);
            expect(updatedConfig.weights.latency).toBeCloseTo(newLatency);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Additional test: getRecommendedModels returns all primary and fallback models
   */
  describe('getRecommendedModels', () => {
    it('should return all primary and fallback models', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...service.getAllScenarios()),
          (scenario) => {
            const config = service.getScenarioConfig(scenario);
            const recommendedModels = service.getRecommendedModels(scenario);

            // Should contain all primary models
            config.primaryModels.forEach((model) => {
              expect(recommendedModels).toContain(model);
            });

            // Should contain all fallback models
            config.fallbackModels.forEach((model) => {
              expect(recommendedModels).toContain(model);
            });

            // Should have exactly primary + fallback count
            expect(recommendedModels.length).toBe(
              config.primaryModels.length + config.fallbackModels.length
            );

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional test: getPrimaryModels and getFallbackModels
   */
  describe('getPrimaryModels and getFallbackModels', () => {
    it('should return correct primary and fallback models', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...service.getAllScenarios()),
          (scenario) => {
            const config = service.getScenarioConfig(scenario);
            const primaryModels = service.getPrimaryModels(scenario);
            const fallbackModels = service.getFallbackModels(scenario);

            // Should match configuration
            expect(primaryModels).toEqual(config.primaryModels);
            expect(fallbackModels).toEqual(config.fallbackModels);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional test: getSelectionStrategy
   */
  describe('getSelectionStrategy', () => {
    it('should return correct selection strategy', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...service.getAllScenarios()),
          (scenario) => {
            const config = service.getScenarioConfig(scenario);
            const strategy = service.getSelectionStrategy(scenario);

            expect(strategy).toBe(config.strategy);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional test: getSelectionWeights
   */
  describe('getSelectionWeights', () => {
    it('should return correct selection weights', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...service.getAllScenarios()),
          (scenario) => {
            const config = service.getScenarioConfig(scenario);
            const weights = service.getSelectionWeights(scenario);

            expect(weights.quality).toBe(config.weights.quality);
            expect(weights.cost).toBe(config.weights.cost);
            expect(weights.latency).toBe(config.weights.latency);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
