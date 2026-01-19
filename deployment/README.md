# 部署文档

本文档说明 Interview AI 的部署流程和脚本使用方法。

## 目录结构

```
deployment/
├── README.md           # 本文档
├── docker-compose.prod.yml # 生产环境 Docker Compose 配置
├── scripts/            # 部署脚本目录
│   ├── manage-db.sh    # 数据库管理（备份/恢复/迁移）
│   ├── setup-ssl.sh    # SSL 证书配置
│   └── utils.sh        # 通用工具函数
└── config/             # 配置文件目录（Nginx, SSL 等）
deploy.sh               # 根目录下的统一入口脚本
```

## 快速开始

所有部署操作均通过根目录下的 `deploy.sh` 脚本执行。

### 1. 开发环境部署

```bash
# 默认部署开发环境
./deploy.sh

# 或显式指定
./deploy.sh --env dev
```

### 2. 生产环境部署

```bash
# 首次部署（需配置 .env.production）
./deploy.sh --env prod --ssl

# 更新代码并重启（不重新构建镜像）
./deploy.sh --env prod --skip-build

# 仅重启服务
./deploy.sh --env prod --skip-pull --skip-build
```

### 3. 数据库管理

```bash
# 备份数据库（备份文件存放在 backups/postgres/）
bash deployment/scripts/manage-db.sh backup

# 恢复数据库
bash deployment/scripts/manage-db.sh restore <backup_file>

# 列出所有备份
bash deployment/scripts/manage-db.sh list

# 手动执行迁移
bash deployment/scripts/manage-db.sh migrate
```

## 环境变量

部署前请确保正确配置环境变量文件：

- 开发环境：`.env`
- 生产环境：`.env.production`

示例文件可在 `.env.example` 和 `.env.production.example` 中找到。

## SSL 配置

在生产环境中，使用 `--ssl` 参数可自动配置 SSL 证书（基于 Let's Encrypt）：

```bash
./deploy.sh --env prod --ssl
```

确保 `.env.production` 中配置了正确的 `DOMAIN` 和 `LETSENCRYPT_EMAIL`。

## 常见问题

**Q: 部署失败，提示端口被占用？**
A: 请检查是否运行了其他占用 80/443/3000 端口的服务。使用 `lsof -i :80` 查看。

**Q: 数据库恢复失败？**
A: 恢复操作会清空当前数据库。请确保 Docker 服务正在运行，并且备份文件路径正确。

**Q: SSL 证书申请失败？**
A: 请检查域名 DNS 解析是否正确指向服务器 IP。可先尝试 `LETSENCRYPT_STAGING=true` 进行测试。
