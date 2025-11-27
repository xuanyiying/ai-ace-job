# AI Providers Module

This module provides a unified interface for integrating multiple AI/LLM providers into the application.

## Structure

```
ai-providers/
├── interfaces/           # TypeScript interfaces and types
│   ├── ai-provider.interface.ts    # Core AIProvider interface
│   ├── model-config.interface.ts   # Configuration interfaces
│   └── index.ts
├── config/              # Configuration management
│   ├── provider.config.ts          # Provider configuration service
│   └── index.ts
├── utils/               # Utility functions and classes
│   ├── ai-error.ts                 # Error handling
│   ├── retry-handler.ts            # Retry logic with exponential backoff
│   └── index.ts
├── providers/           # Provider implementations (to be added)
│   ├── openai.provider.ts          # OpenAI implementation
│   ├── qwen.provider.ts            # Alibaba Qwen implementation
│   ├── deepseek.provider.ts        # DeepSeek implementation
│   ├── gemini.provider.ts          # Google Gemini implementation
│   └── ollama.provider.ts          # Ollama implementation
├── ai-providers.module.ts          # NestJS module
└── index.ts                        # Main exports
```

## Core Interfaces

### AIProvider

All AI providers must implement the `AIProvider` interface:

```typescript
interface AIProvider {
  readonly name: string;
  call(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest): AsyncIterable<AIStreamChunk>;
  healthCheck(): Promise<boolean>;
  listModels(): Promise<string[]>;
  getModelInfo(modelName: string): Promise<ModelInfo>;
}
```

### AIRequest

Unified request format:

```typescript
interface AIRequest {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  metadata?: Record<string, unknown>;
}
```

### AIResponse

Unified response format:

```typescript
interface AIResponse {
  content: string;
  model: string;
  provider: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  metadata?: Record<string, unknown>;
}
```

## Configuration

Provider configurations can be loaded from two sources:

1. **Environment Variables** (highest priority)
2. **YAML Configuration File** (lower priority)
3. **Default Values** (lowest priority)

### Configuration Methods

#### Method 1: Environment Variables

Set environment variables in your `.env` file:

```bash
# OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_ENDPOINT=https://api.openai.com/v1
OPENAI_ORGANIZATION=your-org-id
OPENAI_DEFAULT_TEMPERATURE=0.7
OPENAI_DEFAULT_MAX_TOKENS=2000
OPENAI_TIMEOUT=30000

# Qwen (Alibaba)
QWEN_API_KEY=your-qwen-api-key
QWEN_ENDPOINT=https://dashscope.aliyuncs.com/api/v1
QWEN_DEFAULT_TEMPERATURE=0.7
QWEN_DEFAULT_MAX_TOKENS=2000
QWEN_TIMEOUT=30000

# DeepSeek
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_ENDPOINT=https://api.deepseek.com/v1
DEEPSEEK_DEFAULT_TEMPERATURE=0.7
DEEPSEEK_DEFAULT_MAX_TOKENS=2000
DEEPSEEK_TIMEOUT=30000

# Gemini (Google)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/models
GEMINI_DEFAULT_TEMPERATURE=0.7
GEMINI_DEFAULT_MAX_TOKENS=2000
GEMINI_TIMEOUT=30000

# Ollama (Local)
OLLAMA_ENABLED=false
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_TEMPERATURE=0.7
OLLAMA_DEFAULT_MAX_TOKENS=2000
OLLAMA_TIMEOUT=60000
```

#### Method 2: YAML Configuration File

Create an `AI-config.yaml` file in the backend root directory:

```yaml
providers:
  openai:
    apiKey: 'your-openai-api-key'
    endpoint: 'https://api.openai.com/v1'
    defaultTemperature: 0.7
    defaultMaxTokens: 2000
    timeout: 30000
    isActive: true

  qwen:
    apiKey: 'your-qwen-api-key'
    endpoint: 'https://dashscope.aliyuncs.com/api/v1'
    defaultTemperature: 0.7
    defaultMaxTokens: 2000
    timeout: 30000
    isActive: true

  # ... other providers
```

See `AI-config.example.yaml` for a complete example with all providers and advanced settings.

### Provider-Specific Configuration

#### OpenAI

**Getting Started:**

1. Create an account at https://platform.openai.com
2. Generate an API key at https://platform.openai.com/api-keys
3. Set `OPENAI_API_KEY` environment variable

**Environment Variables:**

- `OPENAI_API_KEY` - API key (required)
- `OPENAI_ENDPOINT` - Custom endpoint (optional, default: https://api.openai.com/v1)
- `OPENAI_ORGANIZATION` - Organization ID (optional)
- `OPENAI_DEFAULT_TEMPERATURE` - Default temperature (default: 0.7)
- `OPENAI_DEFAULT_MAX_TOKENS` - Default max tokens (default: 2000)
- `OPENAI_TIMEOUT` - Request timeout in ms (default: 30000)

**Available Models:**

- `gpt-4` - Most capable, best for complex tasks
- `gpt-4-turbo` - Faster and cheaper than gpt-4
- `gpt-3.5-turbo` - Fast and cost-effective

#### Qwen (Alibaba)

**Getting Started:**

1. Create an account at https://www.aliyun.com
2. Access DashScope at https://dashscope.console.aliyun.com/
3. Create an API key
4. Set `QWEN_API_KEY` environment variable

**Environment Variables:**

- `QWEN_API_KEY` - API key (required)
- `QWEN_ENDPOINT` - API endpoint (default: https://dashscope.aliyuncs.com/api/v1)
- `QWEN_DEFAULT_TEMPERATURE` - Default temperature (default: 0.7)
- `QWEN_DEFAULT_MAX_TOKENS` - Default max tokens (default: 2000)
- `QWEN_TIMEOUT` - Request timeout in ms (default: 30000)

**Available Models:**

- `qwen-max` - Most capable model
- `qwen-plus` - Balanced performance and cost
- `qwen-turbo` - Fast and cost-effective

#### DeepSeek

**Getting Started:**

1. Create an account at https://platform.deepseek.com
2. Generate an API key at https://platform.deepseek.com/
3. Set `DEEPSEEK_API_KEY` environment variable

**Environment Variables:**

- `DEEPSEEK_API_KEY` - API key (required)
- `DEEPSEEK_ENDPOINT` - API endpoint (default: https://api.deepseek.com/v1)
- `DEEPSEEK_DEFAULT_TEMPERATURE` - Default temperature (default: 0.7)
- `DEEPSEEK_DEFAULT_MAX_TOKENS` - Default max tokens (default: 2000)
- `DEEPSEEK_TIMEOUT` - Request timeout in ms (default: 30000)

**Available Models:**

- `deepseek-chat` - General purpose chat model
- `deepseek-coder` - Specialized for code generation

#### Gemini (Google)

**Getting Started:**

1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Set `GEMINI_API_KEY` environment variable

**Environment Variables:**

- `GEMINI_API_KEY` - API key (required)
- `GEMINI_ENDPOINT` - Custom endpoint (optional)
- `GEMINI_DEFAULT_TEMPERATURE` - Default temperature (default: 0.7)
- `GEMINI_DEFAULT_MAX_TOKENS` - Default max tokens (default: 2000)
- `GEMINI_TIMEOUT` - Request timeout in ms (default: 30000)

**Available Models:**

- `gemini-pro` - General purpose model
- `gemini-pro-vision` - Multimodal model with vision capabilities

**Note:** Gemini has a free tier with rate limits. Check https://ai.google.dev/pricing for details.

#### Ollama (Local Deployment)

**Getting Started:**

1. Download Ollama from https://ollama.ai/
2. Install and run Ollama
3. Pull a model: `ollama pull llama2`
4. Set `OLLAMA_ENABLED=true` and `OLLAMA_BASE_URL=http://localhost:11434`

**Environment Variables:**

- `OLLAMA_ENABLED` - Enable Ollama (default: false)
- `OLLAMA_BASE_URL` - Ollama server URL (default: http://localhost:11434)
- `OLLAMA_DEFAULT_TEMPERATURE` - Default temperature (default: 0.7)
- `OLLAMA_DEFAULT_MAX_TOKENS` - Default max tokens (default: 2000)
- `OLLAMA_TIMEOUT` - Request timeout in ms (default: 60000)

**Available Models:**

- `llama2` - Meta's Llama 2 model
- `mistral` - Mistral 7B model
- `neural-chat` - Intel's Neural Chat model
- And many others available at https://ollama.ai/library

**Advantages:**

- No API key required
- Runs locally, no data sent to external servers
- Free to use
- Good for development and testing

### Configuration Priority

When multiple configuration sources are available, the system uses this priority:

1. **Environment Variables** (highest priority)
   - Useful for production deployments
   - Can be set via `.env` file or system environment

2. **YAML Configuration File** (medium priority)
   - Useful for complex configurations
   - Supports scenario-based model selection
   - Supports prompt templates

3. **Default Values** (lowest priority)
   - Built-in defaults for all parameters
   - Used when no other configuration is provided

### Configuration Examples

#### Example 1: Development with OpenAI

```bash
# .env file
OPENAI_API_KEY=sk-...
OPENAI_DEFAULT_TEMPERATURE=0.7
OPENAI_DEFAULT_MAX_TOKENS=2000
```

#### Example 2: Production with Multiple Providers

```yaml
# AI-config.yaml
providers:
  openai:
    apiKey: '${OPENAI_API_KEY}'
    isActive: true

  qwen:
    apiKey: '${QWEN_API_KEY}'
    isActive: true

  ollama:
    baseUrl: 'http://localhost:11434'
    isActive: true

scenarios:
  resumeParsing:
    strategy: 'cost-optimized'
    preferredModels:
      - 'gpt-3.5-turbo'
      - 'qwen-turbo'
```

#### Example 3: Local Development with Ollama

```bash
# .env file
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
```

Then run:

```bash
ollama pull llama2
ollama serve
```

### Validating Configuration

The system automatically validates provider configurations on startup:

1. Checks if API keys are provided
2. Attempts to connect to each provider
3. Marks unavailable providers as inactive
4. Logs detailed error messages for debugging

Check the application logs for configuration validation results:

```
[AI Providers] Initializing providers...
[AI Providers] OpenAI: ✓ Connected
[AI Providers] Qwen: ✓ Connected
[AI Providers] DeepSeek: ✗ Failed (Invalid API key)
[AI Providers] Gemini: ✓ Connected
[AI Providers] Ollama: ✗ Failed (Connection refused)
```

### Troubleshooting Configuration

**Issue: "Provider not found" error**

- Solution: Check that the provider's API key is set in environment variables or YAML config

**Issue: "Invalid API key" error**

- Solution: Verify your API key is correct and hasn't expired
- Check provider's console for key status

**Issue: "Connection timeout" error**

- Solution: Check network connectivity
- Verify endpoint URL is correct
- For Ollama, ensure it's running on the specified URL

**Issue: "Rate limit exceeded" error**

- Solution: Check your provider's rate limits
- Consider using a different provider or upgrading your plan
- Implement request queuing or caching

## Error Handling

The module provides standardized error handling with the following error codes:

- `PROVIDER_UNAVAILABLE` - Provider service is unavailable
- `RATE_LIMIT_EXCEEDED` - API rate limit exceeded
- `AUTHENTICATION_FAILED` - Invalid or expired API key
- `INVALID_REQUEST` - Invalid request format or parameters
- `TIMEOUT` - Request timeout
- `MODEL_NOT_FOUND` - Requested model not found
- `INSUFFICIENT_QUOTA` - Insufficient API quota
- `CONTENT_FILTER` - Content filtered by provider
- `UNKNOWN_ERROR` - Unknown error

## Retry Logic

The `RetryHandler` class implements exponential backoff retry logic:

- Maximum retries: 3 (configurable)
- Initial delay: 1000ms (configurable)
- Maximum delay: 10000ms (configurable)
- Backoff multiplier: 2 (configurable)
- Jitter: 0-30% random variation

Retryable errors:

- Network errors
- Timeout errors
- Rate limit errors
- Service unavailable errors

Non-retryable errors:

- Authentication errors
- Invalid request errors
- Model not found errors
- Content filter errors

## Usage

```typescript
import { AIProvidersModule } from './ai-providers';

@Module({
  imports: [AIProvidersModule],
  // ...
})
export class AppModule {}
```

## Quick Start Guide

### Step 1: Copy Configuration Files

```bash
# Copy environment variables example
cp packages/backend/.env.example packages/backend/.env

# Copy YAML configuration example
cp packages/backend/AI-config.example.yaml packages/backend/AI-config.yaml
```

### Step 2: Add Your API Keys

Edit `packages/backend/.env`:

```bash
# Uncomment and fill in your API keys
OPENAI_API_KEY=your-actual-api-key
# QWEN_API_KEY=your-actual-api-key
# DEEPSEEK_API_KEY=your-actual-api-key
# GEMINI_API_KEY=your-actual-api-key
```

Or edit `packages/backend/AI-config.yaml`:

```yaml
providers:
  openai:
    apiKey: 'your-actual-api-key'
    isActive: true
```

### Step 3: Verify Configuration

The system will automatically validate your configuration on startup. Check the logs:

```bash
npm run start
```

Look for messages like:

```
[AI Providers] OpenAI: ✓ Connected
[AI Providers] Qwen: ✓ Connected
```

### Step 4: Use the AI Providers

```typescript
import { AIProvidersModule } from './ai-providers';

@Module({
  imports: [AIProvidersModule],
})
export class AppModule {}
```

Then inject and use:

```typescript
import { AIEngineService } from './ai-providers';

@Injectable()
export class MyService {
  constructor(private aiEngine: AIEngineService) {}

  async generateText() {
    const response = await this.aiEngine.call({
      model: 'gpt-4',
      prompt: 'Hello, world!',
    });
    console.log(response.content);
  }
}
```

## Configuration File Reference

### .env.example

Located at `packages/backend/.env.example`, this file contains all environment variables for configuring AI providers.

**Key sections:**

- OpenAI Configuration
- Alibaba Qwen Configuration
- DeepSeek Configuration
- Google Gemini Configuration
- Ollama Configuration

### AI-config.example.yaml

Located at `packages/backend/AI-config.example.yaml`, this file provides comprehensive YAML-based configuration.

**Key sections:**

- Provider configurations with detailed parameters
- Scenario-based model selection strategies
- Prompt templates for different use cases
- Monitoring and alerting thresholds
- Security configuration

### README.md (this file)

Comprehensive documentation for:

- Module structure
- Core interfaces
- Configuration methods
- Provider-specific setup
- Troubleshooting guide

## Supported Scenarios

The system supports the following predefined scenarios with automatic model selection:

1. **Resume Parsing** - Cost-optimized strategy
   - Extracts structured information from resumes
   - Uses cheapest available model

2. **Resume Optimization** - Quality-optimized strategy
   - Generates improvement suggestions
   - Uses most capable model (GPT-4)

3. **Interview Question Generation** - Balanced strategy
   - Generates interview questions
   - Balances quality and speed

4. **Job Description Parsing** - Cost-optimized strategy
   - Extracts structured job information
   - Uses cheapest available model

5. **Match Score Calculation** - Latency-optimized strategy
   - Calculates resume-job match score
   - Uses fastest available model

## Monitoring and Alerting

The system includes built-in monitoring for:

- **Performance Metrics**
  - Average response time
  - Success/failure rates
  - Model availability

- **Cost Tracking**
  - Per-model costs
  - Per-scenario costs
  - Daily/monthly totals

- **Alerts**
  - High failure rates (>10%)
  - Slow responses (>30s)
  - Cost thresholds exceeded

Configure thresholds in `AI-config.yaml`:

```yaml
monitoring:
  performance:
    maxAverageLatency: 30000
    maxFailureRate: 10
  cost:
    maxDailyCost: 100
    maxMonthlyCost: 3000
```

## Security Best Practices

1. **Never commit API keys** - Use `.env` files and `.gitignore`
2. **Rotate keys regularly** - Set `keyRotationInterval` in config
3. **Use environment variables** - Don't hardcode keys in code
4. **Enable audit logging** - Track API key access
5. **Mask sensitive data** - Logs automatically mask API keys
6. **Encrypt stored keys** - Database encryption enabled by default

## Next Steps

The following tasks will implement:

1. Individual provider implementations (OpenAI, Qwen, DeepSeek, Gemini, Ollama)
2. Provider factory for creating provider instances
3. Model selector for choosing optimal models
4. Prompt template manager
5. Cost tracking and usage monitoring
6. Performance monitoring
7. Security and access control

## Support and Resources

- **OpenAI Documentation**: https://platform.openai.com/docs
- **Qwen Documentation**: https://help.aliyun.com/zh/dashscope/
- **DeepSeek Documentation**: https://platform.deepseek.com/docs
- **Gemini Documentation**: https://ai.google.dev/docs
- **Ollama Documentation**: https://ollama.ai/

## Contributing

When adding new providers or features:

1. Update `.env.example` with new environment variables
2. Update `AI-config.example.yaml` with new configuration options
3. Update this README with setup instructions
4. Add provider-specific documentation
5. Include examples in the configuration files
