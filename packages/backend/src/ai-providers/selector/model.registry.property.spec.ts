/**
 * Open Source Model Registry Property Tests
 * Validates correctness properties of the model registry using property-based testing
 * Requirements: 2.2, 2.3, 2.4
 */

import fc from 'fast-check';
import { ModelRegistry } from './model.registry';
import {
  ModelFamily,
  ModelRegistrationData,
  ModelMetrics,
} from '../interfaces/model.interface';

/**
 * Arbitrary generators for property-based testing
 */

// Generate valid provider names
const arbitraryProviderName = (): fc.Arbitrary<string> => {
  return fc.oneof(
    fc.constant('qwen'),
    fc.constant('meta'),
    fc.constant('deepseek'),
    fc.constant('mistral'),
    fc.constant('other')
  );
};

// Generate valid model families
const arbitraryModelFamily = (): fc.Arbitrary<ModelFamily> => {
  return fc.oneof(
    fc.constant(ModelFamily.QWEN),
    fc.constant(ModelFamily.LLAMA),
    fc.constant(ModelFamily.DEEPSEEK),
    fc.constant(ModelFamily.MISTRAL),
    fc.constant(ModelFamily.OTHER)
  );
};

// Generate valid parameter sizes
const arbitraryParameterSize = (): fc.Arbitrary<string> => {
  return fc.oneof(
    fc.constant('3B'),
    fc.constant('7B'),
    fc.constant('8B'),
    fc.constant('16B'),
    fc.constant('32B'),
    fc.constant('70B'),
    fc.constant('72B'),
    fc.constant('671B')
  );
};

// Generate valid model registration data with unique names
const arbitraryModelRegistrationData =
  (): fc.Arbitrary<ModelRegistrationData> => {
    return fc.record({
      name: fc
        .string({ minLength: 1, maxLength: 20 })
        .map((s) => `model-${s.replace(/[^a-z0-9]/g, 'x')}`),
      provider: arbitraryProviderName(),
      family: arbitraryModelFamily(),
      parameterSize: arbitraryParameterSize(),
      contextWindow: fc.integer({ min: 1024, max: 131072 }),
      costPerInputToken: fc
        .integer({ min: 1, max: 100 })
        .map((x) => x / 1000000),
      costPerOutputToken: fc
        .integer({ min: 1, max: 200 })
        .map((x) => x / 1000000),
      avgLatencyMs: fc.integer({ min: 100, max: 5000 }),
      qualityRating: fc.integer({ min: 1, max: 10 }),
      supportedFeatures: fc.array(
        fc.oneof(
          fc.constant('chat'),
          fc.constant('function-calling'),
          fc.constant('reasoning'),
          fc.constant('code')
        ),
        { minLength: 1, maxLength: 4 }
      ),
      isAvailable: fc.boolean(),
      status: fc.oneof(
        fc.constant('active' as const),
        fc.constant('inactive' as const),
        fc.constant('deprecated' as const)
      ),
    });
  };

// Generate valid model metrics
const arbitraryModelMetrics = (): fc.Arbitrary<Partial<ModelMetrics>> => {
  return fc.record({
    avgLatencyMs: fc.integer({ min: 100, max: 5000 }),
    successRate: fc.integer({ min: 0, max: 100 }).map((x) => x / 100),
  });
};

describe('ModelRegistry - Property Tests', () => {
  let registry: ModelRegistry;

  beforeEach(() => {
    registry = new ModelRegistry();
  });

  afterEach(() => {
    registry.clear();
  });

  /**
   * Property 4: Model Attribute Storage Completeness
   * For any registered model, retrieving it should return all attributes unchanged
   * Validates: Requirements 2.2
   */
  describe('Property 4: Model Attribute Storage Completeness', () => {
    it('should store and retrieve all model attributes unchanged', () => {
      fc.assert(
        fc.property(arbitraryModelRegistrationData(), (modelData) => {
          registry.clear(); // Clear before each property test run

          // Register the model
          registry.registerModel(modelData);

          // Retrieve the model
          const retrieved = registry.getModel(modelData.name);

          // Verify all attributes are preserved
          if (!retrieved) return false;

          return (
            retrieved.name === modelData.name &&
            retrieved.provider === modelData.provider &&
            retrieved.family === modelData.family &&
            retrieved.parameterSize === modelData.parameterSize &&
            retrieved.contextWindow === modelData.contextWindow &&
            retrieved.costPerInputToken === modelData.costPerInputToken &&
            retrieved.costPerOutputToken === modelData.costPerOutputToken &&
            retrieved.avgLatencyMs === modelData.avgLatencyMs &&
            retrieved.qualityRating === modelData.qualityRating &&
            retrieved.supportedFeatures.length ===
              modelData.supportedFeatures.length &&
            retrieved.supportedFeatures.every((feature) =>
              modelData.supportedFeatures.includes(feature)
            ) &&
            retrieved.isAvailable === modelData.isAvailable &&
            retrieved.status === modelData.status
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve model attributes across multiple registrations', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelRegistrationData(), {
            minLength: 1,
            maxLength: 10,
          }),
          (modelDataArray) => {
            registry.clear(); // Clear before each property test run

            // Make names unique by appending index
            const uniqueModels = modelDataArray.map((data, index) => ({
              ...data,
              name: `${data.name}-${index}`,
            }));

            // Register all unique models
            for (const modelData of uniqueModels) {
              registry.registerModel(modelData);
            }

            // Verify all models are retrievable with correct attributes
            for (const modelData of uniqueModels) {
              const retrieved = registry.getModel(modelData.name);
              if (!retrieved) return false;

              if (
                retrieved.name !== modelData.name ||
                retrieved.qualityRating !== modelData.qualityRating
              ) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 5: Model Status Transition Consistency
   * For any model status change, the new status should be immediately reflected
   * and model selection should respect the new status
   * Validates: Requirements 2.3, 2.4
   */
  describe('Property 5: Model Status Transition Consistency', () => {
    it('should reflect status changes immediately', () => {
      fc.assert(
        fc.property(
          arbitraryModelRegistrationData(),
          fc.boolean(),
          (modelData, newStatus) => {
            registry.clear(); // Clear before each property test run

            // Register the model
            registry.registerModel(modelData);

            // Update status
            registry.updateModelStatus(modelData.name, newStatus);

            // Verify status is updated
            const retrieved = registry.getModel(modelData.name);
            if (!retrieved) return false;

            return retrieved.isAvailable === newStatus;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should exclude unavailable models from available models list', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelRegistrationData(), {
            minLength: 1,
            maxLength: 10,
          }),
          fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
          (modelDataArray, statusArray) => {
            registry.clear(); // Clear before each property test run

            // Make names unique by appending index
            const uniqueModels = modelDataArray.map((data, index) => ({
              ...data,
              name: `${data.name}-${index}`,
            }));

            // Register all unique models
            for (const modelData of uniqueModels) {
              registry.registerModel(modelData);
            }

            // Update statuses
            for (
              let i = 0;
              i < uniqueModels.length && i < statusArray.length;
              i++
            ) {
              registry.updateModelStatus(uniqueModels[i].name, statusArray[i]);
            }

            // Verify available models list only contains available models
            const availableModels = registry.getAvailableModels();
            for (const model of availableModels) {
              if (!model.isAvailable) return false;
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should mark unhealthy models as unavailable', () => {
      fc.assert(
        fc.property(arbitraryModelRegistrationData(), (modelData) => {
          registry.clear(); // Clear before each property test run

          // Register the model
          registry.registerModel(modelData);

          // Mark as unhealthy
          registry.updateModelHealthStatus(modelData.name, 'unhealthy');

          // Verify model is marked unavailable
          const retrieved = registry.getModel(modelData.name);
          if (!retrieved) return false;

          return (
            retrieved.healthStatus === 'unhealthy' &&
            retrieved.isAvailable === false
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency between status and availability', () => {
      fc.assert(
        fc.property(
          arbitraryModelRegistrationData(),
          fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
          (modelData, statusSequence) => {
            registry.clear(); // Clear before each property test run

            // Register the model
            registry.registerModel(modelData);

            // Apply status changes
            for (const status of statusSequence) {
              registry.updateModelStatus(modelData.name, status);

              // Verify consistency
              const retrieved = registry.getModel(modelData.name);
              if (!retrieved) return false;

              if (retrieved.isAvailable !== status) return false;

              // Verify it appears in available models list iff available
              const availableModels = registry.getAvailableModels();
              const isInAvailableList = availableModels.some(
                (m) => m.name === modelData.name
              );

              if (status && !isInAvailableList) return false;
              if (!status && isInAvailableList) return false;
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Additional property: Model metrics update consistency
   * For any model metrics update, the new metrics should be reflected
   */
  describe('Model Metrics Update Consistency', () => {
    it('should update and reflect model metrics correctly', () => {
      fc.assert(
        fc.property(
          arbitraryModelRegistrationData(),
          arbitraryModelMetrics(),
          (modelData, metrics) => {
            registry.clear(); // Clear before each property test run

            // Register the model
            registry.registerModel(modelData);

            // Update metrics
            registry.updateModelMetrics(modelData.name, metrics);

            // Verify metrics are updated
            const retrieved = registry.getModel(modelData.name);
            if (!retrieved) return false;

            if (metrics.avgLatencyMs !== undefined) {
              if (retrieved.avgLatencyMs !== metrics.avgLatencyMs) return false;
            }

            if (metrics.successRate !== undefined) {
              if (retrieved.successRate !== metrics.successRate) return false;
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Model family grouping consistency
   * For any model registered with a family, it should appear in getModelsByFamily
   */
  describe('Model Family Grouping Consistency', () => {
    it('should correctly group models by family', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelRegistrationData(), {
            minLength: 1,
            maxLength: 10,
          }),
          (modelDataArray) => {
            registry.clear(); // Clear before each property test run

            // Make names unique by appending index
            const uniqueModels = modelDataArray.map((data, index) => ({
              ...data,
              name: `${data.name}-${index}`,
            }));

            // Register all unique models
            for (const modelData of uniqueModels) {
              registry.registerModel(modelData);
            }

            // Verify each model appears in its family group
            for (const modelData of uniqueModels) {
              const familyModels = registry.getModelsByFamily(modelData.family);
              const found = familyModels.some((m) => m.name === modelData.name);

              if (!found) return false;
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Additional property: Registry count consistency
   * The count of available models should match the actual available models list
   */
  describe('Registry Count Consistency', () => {
    it('should maintain consistent model counts', () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryModelRegistrationData(), {
            minLength: 1,
            maxLength: 10,
          }),
          (modelDataArray) => {
            registry.clear(); // Clear before each property test run

            // Make names unique by appending index
            const uniqueModels = modelDataArray.map((data, index) => ({
              ...data,
              name: `${data.name}-${index}`,
            }));

            // Register all unique models
            for (const modelData of uniqueModels) {
              registry.registerModel(modelData);
            }

            // Verify counts
            const totalCount = registry.getModelCount();
            const allModels = registry.getAllModels();

            if (totalCount !== allModels.length) return false;

            const availableCount = registry.getAvailableModelCount();
            const availableModels = registry.getAvailableModels();

            if (availableCount !== availableModels.length) return false;

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
