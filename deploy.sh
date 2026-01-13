#!/bin/bash

# ==============================================================================
# Resume Optimizer - 自动化部署脚本
# ==============================================================================
# 功能：代码拉取、环境检查、构建、部署、SSL配置、健康检查、回滚
# 域名：udefined.cc
# 环境：腾讯云服务器 (预装 Docker, Nginx, MySQL, Redis)
# ==============================================================================

set -e

# ------------------------------------------------------------------------------
# 1. 配置与变量定义
# ------------------------------------------------------------------------------

# 基础路径
PROJECT_ROOT=$(pwd)
LOG_FILE="${PROJECT_ROOT}/deployment.log"
BACKUP_DIR="${PROJECT_ROOT}/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 环境变量设置
ENV="prod"
DOMAIN="udefined.cc"
SKIP_PULL=false
SKIP_BUILD=false
AUTO_SSL=true

# ------------------------------------------------------------------------------
# 2. 辅助函数
# ------------------------------------------------------------------------------

log() {
    local level=$1
    local msg=$2
    local color=$NC
    
    case $level in
        "INFO") color=$GREEN ;;
        "WARN") color=$YELLOW ;;
        "ERROR") color=$RED ;;
        "STEP") color=$BLUE ;;
    esac
    
    local formatted_msg="[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] ${msg}"
    echo -e "${color}${formatted_msg}${NC}" | tee -a "$LOG_FILE"
}

print_usage() {
    echo "用法: $0 [选项]"
    echo "选项:"
    echo "  -e, --env <env>      设置环境 (dev|test|prod)，默认为 prod"
    echo "  -d, --domain <domain> 设置域名，默认为 udefined.cc"
    echo "  --skip-pull          跳过代码拉取"
    echo "  --skip-build         跳过 Docker 构建"
    echo "  --no-ssl             不自动申请 SSL 证书"
    echo "  --rollback           执行回滚到上一个版本"
    echo "  -h, --help           显示此帮助信息"
}

# ------------------------------------------------------------------------------
# 3. 核心功能函数
# ------------------------------------------------------------------------------

# 依赖检查
check_dependencies() {
    log "STEP" "正在检查系统依赖..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log "ERROR" "Docker 未安装，请先安装 Docker。"
        exit 1
    fi
    log "INFO" "✓ Docker 已安装: $(docker --version)"

    # 检查 Docker Compose
    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        log "ERROR" "Docker Compose 未安装。"
        exit 1
    fi
    log "INFO" "✓ Docker Compose 已安装"

    # 检查 Git
    if ! command -v git &> /dev/null; then
        log "ERROR" "Git 未安装。"
        exit 1
    fi
    log "INFO" "✓ Git 已安装"

    # 检查端口占用 (80, 443)
    for port in 80 443; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
            log "WARN" "端口 $port 已被占用。如果是宿主机 Nginx，请确保其配置不会与 Docker 容器冲突。"
        fi
    done
}

# 环境配置准备
setup_env() {
    log "STEP" "正在准备环境变量配置..."
    
    local env_file=".env.${ENV}"
    if [ ! -f "$env_file" ]; then
        if [ -f ".env.${ENV}.example" ]; then
            log "WARN" "配置文件 $env_file 不存在，正在从示例文件创建..."
            cp ".env.${ENV}.example" "$env_file"
            log "INFO" "已创建 $env_file，请根据实际情况更新敏感信息。"
        else
            log "ERROR" "找不到配置文件 .env.${ENV} 或其示例文件。"
            exit 1
        fi
    fi
    
    # 更新域名相关配置
    if [ "$ENV" == "prod" ]; then
        sed -i "s/DOMAIN=.*/DOMAIN=${DOMAIN}/g" "$env_file" || true
        sed -i "s/VITE_API_BASE_URL=.*/VITE_API_BASE_URL=https:\/\/${DOMAIN}\/api\/v1/g" "$env_file" || true
    fi
    
    # 导出变量供 compose 使用
    export $(grep -v '^#' "$env_file" | xargs)
}

# 代码拉取
pull_code() {
    if [ "$SKIP_PULL" = true ]; then
        log "INFO" "跳过代码拉取。"
        return
    fi
    
    log "STEP" "正在拉取最新代码..."
    git pull origin main || log "WARN" "代码拉取失败，尝试继续使用本地代码。"
}

# 构建与部署
deploy() {
    log "STEP" "开始部署流程 (环境: ${ENV})..."
    
    local compose_file="docker-compose.yml"
    if [ "$ENV" == "prod" ]; then
        compose_file="deployment/docker-compose.prod.yml"
    fi

    # 备份当前状态（用于回滚）
    log "INFO" "正在创建当前部署状态备份..."
    mkdir -p "${BACKUP_DIR}"
    docker compose -f "$compose_file" config > "${BACKUP_DIR}/last_deploy_config.yml" 2>/dev/null || true

    # 构建镜像
    if [ "$SKIP_BUILD" = false ]; then
        log "INFO" "正在构建 Docker 镜像..."
        docker compose -f "$compose_file" build --no-cache
    fi

    # 启动服务
    log "INFO" "正在启动容器服务..."
    docker compose -f "$compose_file" up -d

    # 执行数据库迁移
    log "INFO" "正在执行数据库迁移..."
    docker compose -f "$compose_file" run --rm backend npx prisma migrate deploy || log "WARN" "数据库迁移失败，请手动检查。"

    # 健康检查
    health_check
}

# 健康检查
health_check() {
    log "STEP" "正在执行服务健康检查..."
    
    local max_retries=15
    local count=0
    local health_url="http://localhost/health"
    
    if [ "$ENV" == "dev" ]; then
        health_url="http://localhost:3000/health"
    fi

    while [ $count -lt $max_retries ]; do
        if curl -s -f "$health_url" > /dev/null; then
            log "INFO" "✓ 服务健康检查通过！"
            return 0
        fi
        count=$((count + 1))
        log "INFO" "正在等待服务就绪... ($count/$max_retries)"
        sleep 5
    done

    log "ERROR" "健康检查失败！启动回滚流程..."
    rollback
    exit 1
}

# 回滚功能
rollback() {
    log "STEP" "正在执行回滚..."
    
    local compose_file="docker-compose.yml"
    if [ "$ENV" == "prod" ]; then
        compose_file="deployment/docker-compose.prod.yml"
    fi

    # 使用之前的镜像（如果存在）或简单地重启到之前的状态
    log "INFO" "尝试恢复到上一个稳定运行状态..."
    docker compose -f "$compose_file" stop
    # 这里可以根据实际情况更复杂化，比如拉取特定的 tag
    docker compose -f "$compose_file" up -d
    
    log "INFO" "已尝试恢复服务。请人工检查服务状态。"
}

# SSL 配置
setup_ssl() {
    if [ "$ENV" != "prod" ] || [ "$AUTO_SSL" != true ]; then
        return
    fi

    log "STEP" "正在配置 SSL 证书 (Certbot)..."
    
    # 检查是否已经有证书
    if [ -d "./deployment/config/ssl/live/${DOMAIN}" ]; then
        log "INFO" "证书已存在，跳过申请。"
        return
    fi

    # 执行已有的 SSL 脚本
    if [ -f "./deployment/scripts/setup-ssl.sh" ]; then
        bash ./deployment/scripts/setup-ssl.sh
    else
        log "WARN" "找不到 setup-ssl.sh 脚本，跳过自动 SSL 申请。"
    fi
}

# ------------------------------------------------------------------------------
# 4. 脚本执行逻辑
# ------------------------------------------------------------------------------

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env) ENV="$2"; shift 2 ;;
        -d|--domain) DOMAIN="$2"; shift 2 ;;
        --skip-pull) SKIP_PULL=true; shift ;;
        --skip-build) SKIP_BUILD=true; shift ;;
        --no-ssl) AUTO_SSL=false; shift ;;
        --rollback) rollback; exit 0 ;;
        -h|--help) print_usage; exit 0 ;;
        *) log "ERROR" "未知选项: $1"; print_usage; exit 1 ;;
    esac
done

# 开始执行
log "INFO" ">>> 开始 Resume Optimizer 自动化部署 <<<"
check_dependencies
pull_code
setup_env
deploy
setup_ssl

log "INFO" "=========================================="
log "INFO" "部署成功！"
log "INFO" "访问地址: https://${DOMAIN}"
log "INFO" "日志文件: ${LOG_FILE}"
log "INFO" "=========================================="
