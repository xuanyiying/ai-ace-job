#!/bin/bash
# ==============================================================================
# IntervAI - 统一自动化部署脚本
# ==============================================================================

# 设置严格模式
set -e

# 1. 路径定义 (使用绝对路径)
# 获取脚本所在目录的绝对路径作为项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT" || exit 1
DEPLOY_DIR="${PROJECT_ROOT}/deployment"
SCRIPTS_DIR="${DEPLOY_DIR}/scripts"

# 2. 加载工具库
if [ -f "${SCRIPTS_DIR}/utils.sh" ]; then
    source "${SCRIPTS_DIR}/utils.sh"
else
    echo "错误: 找不到工具库 ${SCRIPTS_DIR}/utils.sh"
    exit 1
fi

# 默认配置
ENV="dev"
SKIP_BUILD=false
SKIP_PULL=false
SETUP_SSL=false

# 帮助信息
show_help() {
    cat << EOF
IntervAI 部署脚本

用法: $0 [选项]

选项:
  -e, --env <env>       部署环境: dev (默认) 或 prod
  --skip-build          跳过 Docker 镜像构建
  --skip-pull           跳过代码拉取 (git pull)
  --ssl                 配置 SSL 证书 (仅 prod)
  --backup              部署前备份数据库
  --help                显示此帮助信息

示例:
  $0 --env dev                  # 部署开发环境
  $0 --env prod --ssl           # 部署生产环境并配置 SSL
  $0 --env prod --skip-build    # 快速重启生产环境
EOF
}

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env) ENV="$2"; shift 2 ;;
        --skip-build) SKIP_BUILD=true; shift ;;
        --skip-pull) SKIP_PULL=true; shift ;;
        --ssl) SETUP_SSL=true; shift ;;
        --backup)
            log_info "执行数据库备份..."
            if [ -f "${SCRIPTS_DIR}/manage-db.sh" ]; then
                bash "${SCRIPTS_DIR}/manage-db.sh" backup
            else
                log_error "找不到备份脚本: ${SCRIPTS_DIR}/manage-db.sh"
                exit 1
            fi
            shift
            ;;
        -h|--help) show_help; exit 0 ;;
        *) log_error "未知参数: $1"; show_help; exit 1 ;;
    esac
done

# 部署流程
main() {
    log_info ">>> 开始部署 IntervAI ($ENV) <<<"
    log_info "项目根目录: $PROJECT_ROOT"

    # 1. 环境准备
    local env_file="${PROJECT_ROOT}/.env"
    local compose_file="${DEPLOY_DIR}/docker-compose.yml"

    if [ "$ENV" == "prod" ]; then
        env_file="${PROJECT_ROOT}/.env.production"
        compose_file="${DEPLOY_DIR}/docker-compose.prod.yml"

        # 检查 prod 配置文件
        if [ ! -f "$env_file" ]; then
             # 尝试寻找示例文件
            local example_file="${PROJECT_ROOT}/.env.production.example"
            if [ -f "$example_file" ]; then
                log_warn "未找到 $env_file，从示例文件创建..."
                cp "$example_file" "$env_file"
                log_info "请编辑 $env_file 配置生产环境参数"
                exit 1
            else
                log_error "找不到 .env.production 或示例文件"
                # 不强制退出，因为可能已经配置在环境变量中
                # 但通常需要文件，这里给个警告
                log_warn "将尝试使用系统环境变量"
            fi
        fi
    fi

    # 校验 compose 文件是否存在
    if [ ! -f "$compose_file" ]; then
        log_error "找不到 Docker Compose 配置文件: $compose_file"
        exit 1
    fi

    # 加载环境变量
    if [ -f "$env_file" ]; then
        load_env "$env_file"
    else
        log_warn "环境变量文件不存在: $env_file (继续执行)"
    fi

    # 2. 拉取代码
    if [ "$SKIP_PULL" = false ]; then
        log_step "拉取最新代码..."
        # 确保在项目根目录执行 git
        if [ -d "$PROJECT_ROOT/.git" ]; then
            git -C "$PROJECT_ROOT" pull origin main || log_warn "代码拉取失败，使用本地版本继续"
        else
            log_warn "不是 git 仓库，跳过拉取"
        fi
    else
        log_info "跳过代码拉取"
    fi

    # 3. 依赖检查
    check_command docker
    check_command docker-compose || check_command docker

    # 4. 构建镜像
    if [ "$SKIP_BUILD" = false ]; then
        log_step "构建 Docker 镜像..."
        # 确保使用正确的 compose 文件
        docker compose --env-file "$env_file" -f "$compose_file" build --no-cache
    else
        log_info "跳过镜像构建"
    fi

    # 5. 启动服务
    log_step "启动服务..."
    docker compose --env-file "$env_file" -f "$compose_file" up -d

    # 6. 数据库迁移
    log_step "执行数据库迁移..."
    # 确保 backend 服务存在且运行
    docker compose --env-file "$env_file" -f "$compose_file" run --rm backend npx prisma migrate deploy

    # 7. SSL 配置 (仅 prod)
    if [ "$ENV" == "prod" ] && [ "$SETUP_SSL" == true ]; then
        log_step "配置 SSL..."
        if [ -f "${SCRIPTS_DIR}/setup-ssl.sh" ]; then
            bash "${SCRIPTS_DIR}/setup-ssl.sh"
        else
            log_error "找不到 SSL 配置脚本: ${SCRIPTS_DIR}/setup-ssl.sh"
        fi
    fi

    # 8. 健康检查
    log_step "执行健康检查..."
    local health_url="http://localhost:3000/health"
    if [ "$ENV" == "prod" ]; then
        health_url="http://localhost/health"
        if [ "$SETUP_SSL" == true ]; then
             health_url="https://${DOMAIN:-localhost}/health"
        fi
    fi

    # 简单的重试逻辑
    for i in {1..12}; do
        if curl -s -f "$health_url" > /dev/null; then
            log_info "✓ 服务健康检查通过"
            log_info "部署成功! 访问地址: $health_url"
            exit 0
        fi
        echo -n "."
        sleep 5
    done
    echo "" # 换行

    log_warn "服务启动可能超时，请手动检查: docker compose -f $compose_file logs"
}

main
