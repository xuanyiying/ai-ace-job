# IntervAI 部署指南

本指南将协助您将 IntervAI 项目完整部署到腾讯云服务器。

## 1. 环境预要求

在开始部署之前，请确保服务器已安装以下基础服务：
- **Docker**: >= 20.10
- **Docker Compose**: >= 2.0
- **Git**: 用于拉取最新代码
- **Nginx/MySQL/Redis**: 虽然脚本使用容器化的服务，但服务器预装的这些服务可作为备选或通过配置连接。

## 2. 快速开始

### 2.1 获取代码
```bash
git clone <your-repo-url>
cd ai-resume
```

### 2.2 配置环境变量
复制生产环境示例配置并根据实际情况修改：
```bash
cp .env.production.example .env.production
# 编辑 .env.production，确保设置了正确的数据库密码、API 密钥等
nano .env.production
```

### 2.3 执行部署
使用一键部署脚本：
```bash
# 默认部署到生产环境，域名为 udefined.cc
./deploy.sh

# 自定义域名部署
./deploy.sh --domain yourdomain.com
```

## 3. 部署脚本功能说明 (`deploy.sh`)

该脚本集成了以下功能：
- **依赖检查**: 验证 Docker、Git 等环境是否就绪。
- **代码管理**: 自动从仓库拉取最新代码（可选）。
- **环境配置**: 自动管理 `.env` 文件，并根据域名更新配置。
- **自动化构建**: 使用 Docker Compose 进行生产级镜像构建。
- **零停机部署**: 通过服务编排实现容器平滑启动。
- **SSL 自动申请**: 集成 Certbot，自动申请并配置 Let's Encrypt 证书。
- **健康检查**: 部署后自动验证服务可用性。
- **自动回滚**: 若新版本健康检查失败，自动回滚到上一个运行状态。

## 4. 参数说明

| 参数 | 缩写 | 说明 | 默认值 |
| :--- | :--- | :--- | :--- |
| `--env` | `-e` | 部署环境 (`dev`, `test`, `prod`) | `prod` |
| `--domain` | `-d` | 部署域名 | `udefined.cc` |
| `--skip-pull` | - | 跳过代码拉取 | `false` |
| `--skip-build` | - | 跳过 Docker 镜像构建 | `false` |
| `--no-ssl` | - | 禁用自动 SSL 申请 | `false` |
| `--rollback` | - | 执行手动回滚 | - |

## 5. 服务监控与告警建议

为确保生产环境稳定性，建议配置以下监控方案：

### 5.1 容器监控 (Prometheus + Grafana)
项目已内置 Prometheus 配置（见 `packages/backend/prometheus.yml`），建议：
- 监控容器 CPU、内存使用率。
- 监控后端 API 响应时间与错误率。
- 监控数据库连接数与慢查询。

### 5.2 日志管理 (ELK 或 Loki)
- 后端日志已配置为 JSON 格式，方便接入日志收集系统。
- 建议监控 `deployment.log` 中的 `[ERROR]` 关键字。

### 5.3 告警机制
- **端口监控**: 监控 80/443 端口可用性。
- **SSL 到期提醒**: 虽有自动续期，但建议增加到期监控。
- **资源阈值告警**: 内存 > 90% 或 CPU > 80% 时发送通知（钉钉/企业微信/邮件）。

## 6. 常见问题排查

- **SSL 申请失败**: 确保域名已正确解析到服务器 IP，且 80 端口未被其他服务占用。
- **容器启动失败**: 使用 `docker compose -f deployment/docker-compose.prod.yml logs` 查看详细日志。
- **数据库连接错误**: 检查 `.env.production` 中的 `DATABASE_URL` 是否与容器名及密码匹配。

---
*Powered by IntervAI Deployment Team*
