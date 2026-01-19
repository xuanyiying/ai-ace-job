#!/bin/bash
# ==============================================================================
# 通用工具脚本 - IntervAI
# ==============================================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志文件
LOG_FILE="${PROJECT_ROOT:-.}/deployment.log"

# 日志函数
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

    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local formatted_msg="[${timestamp}] [${level}] ${msg}"

    # 输出到控制台
    echo -e "${color}${formatted_msg}${NC}"

    # 写入日志文件（去除颜色代码）
    echo "${formatted_msg}" | sed 's/\x1b\[[0-9;]*m//g' >> "${LOG_FILE}"
}

log_info() { log "INFO" "$1"; }
log_warn() { log "WARN" "$1"; }
log_error() { log "ERROR" "$1"; }
log_step() { log "STEP" "$1"; }

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "命令未找到: $1"
        return 1
    fi
    return 0
}

# 加载环境变量
load_env() {
    local env_file="$1"
    if [ -f "$env_file" ]; then
        log_info "加载环境变量: $env_file"
        set -a
        source "$env_file"
        set +a
    else
        log_warn "环境变量文件不存在: $env_file"
        return 1
    fi
}

# 检查必要变量
check_required_vars() {
    local missing=0
    for var in "$@"; do
        if [ -z "${!var}" ]; then
            log_error "缺少必要环境变量: $var"
            missing=1
        fi
    done
    return $missing
}
