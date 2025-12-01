# Frequently Asked Questions (FAQ)

## General

### What is AI Resume Optimizer?
AI Resume Optimizer is an open-source SaaS platform that helps job seekers improve their resumes using advanced AI algorithms. It analyzes your resume against job descriptions, provides targeted improvement suggestions, and generates professional PDF documents.

### Is it free to use?
The project is open-source and you can self-host it for free. We also offer a hosted version with tiered subscription plans (Free, Pro, Enterprise) for those who prefer a managed service.

### Which AI models are supported?
We currently support OpenAI (GPT-4, GPT-3.5), Qwen (Tongyi Qianwen), DeepSeek, Google Gemini, and Ollama (for local models).

## Installation & Configuration

### How do I install the project locally?
Please refer to the [Getting Started](README.md#getting-started) section in our README for detailed installation instructions.

### Can I run it with Docker?
Yes, we provide `docker-compose.yml` files for both development and production environments. See the [Deployment](README.md#deployment) section for more details.

### I'm getting a memory error during build. What should I do?
This is a known issue with some Node.js versions. Try increasing the memory limit:
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```
Or use the provided scripts in `package.json` which already handle this.

## Usage

### How do I add my own API keys?
You can configure your API keys in the `.env` file in the `packages/backend` directory. See `.env.example` for the required format.

### Can I use my own custom templates?
Currently, template customization requires code changes. We are working on a plugin system to allow easier template additions in the future.

## Contributing

### How can I contribute?
We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) first.

### Where can I report bugs?
Please report bugs on our [GitHub Issues](https://github.com/xuanyiying/ai-resume/issues) page.

## License

### What license is this project under?
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
