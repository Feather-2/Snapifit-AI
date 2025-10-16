#!/bin/bash

# 密钥管理脚本 - 用于Docker和K8s部署

set -e

echo "🔐 SnapFit AI 密钥管理脚本"
echo "=================================="

# 检查部署类型
DEPLOYMENT_TYPE=${1:-"docker"}

if [[ "$DEPLOYMENT_TYPE" != "docker" && "$DEPLOYMENT_TYPE" != "k8s" ]]; then
    echo "❌ 错误: 部署类型必须是 'docker' 或 'k8s'"
    echo "用法: $0 [docker|k8s]"
    exit 1
fi

echo "📋 部署类型: $DEPLOYMENT_TYPE"

# 生成随机密钥的函数
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# 创建密钥目录
if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
    SECRETS_DIR="./deployment/docker-security/secrets"
    mkdir -p "$SECRETS_DIR"
    echo "📁 创建Docker密钥目录: $SECRETS_DIR"
else
    SECRETS_DIR="./deployment/k8s/secrets"
    mkdir -p "$SECRETS_DIR"
    echo "📁 创建K8s密钥目录: $SECRETS_DIR"
fi

# 生成密钥文件
echo ""
echo "🔑 生成密钥文件..."

# 数据库密码
if [[ ! -f "$SECRETS_DIR/db_password.txt" ]]; then
    generate_secret > "$SECRETS_DIR/db_password.txt"
    echo "✅ 生成数据库密码"
else
    echo "⚠️  数据库密码已存在，跳过"
fi

# NextAuth 密钥
if [[ ! -f "$SECRETS_DIR/nextauth_secret.txt" ]]; then
    generate_secret > "$SECRETS_DIR/nextauth_secret.txt"
    echo "✅ 生成NextAuth密钥"
else
    echo "⚠️  NextAuth密钥已存在，跳过"
fi

# 加密密钥
if [[ ! -f "$SECRETS_DIR/encryption_key.txt" ]]; then
    generate_secret > "$SECRETS_DIR/encryption_key.txt"
    echo "✅ 生成加密密钥"
else
    echo "⚠️  加密密钥已存在，跳过"
fi

# 设置文件权限
chmod 600 "$SECRETS_DIR"/*.txt
echo "🔒 设置密钥文件权限为 600"

if [[ "$DEPLOYMENT_TYPE" == "k8s" ]]; then
    echo ""
    echo "🚀 创建Kubernetes密钥..."
    
    # 检查kubectl是否可用
    if ! command -v kubectl &> /dev/null; then
        echo "❌ kubectl 未找到，请先安装kubectl"
        exit 1
    fi
    
    # 创建命名空间
    kubectl create namespace snapfit-ai --dry-run=client -o yaml | kubectl apply -f -
    
    # 创建密钥对象
    kubectl create secret generic snapfit-secrets \
        --from-file=db-password="$SECRETS_DIR/db_password.txt" \
        --from-file=nextauth-secret="$SECRETS_DIR/nextauth_secret.txt" \
        --from-file=encryption-key="$SECRETS_DIR/encryption_key.txt" \
        --namespace=snapfit-ai \
        --dry-run=client -o yaml | kubectl apply -f -
    
    echo "✅ Kubernetes密钥已创建"
    
    # 创建配置映射模板
    cat > "$SECRETS_DIR/../configmap.yaml" << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: snapfit-config
  namespace: snapfit-ai
data:
  NODE_ENV: "production"
  DB_PROVIDER: "postgresql"
  NEXT_TELEMETRY_DISABLED: "1"
  DOCKER_BUILD: "true"
  # 根据实际情况填写以下值
  DATABASE_URL: "postgresql://snapfit_user:\$(DB_PASSWORD)@postgres-service:5432/snapfit_ai?sslmode=prefer"
  NEXTAUTH_URL: "https://your-domain.com"
  FROM_EMAIL: "noreply@your-domain.com"
EOF
    
    echo "📝 创建ConfigMap模板: $SECRETS_DIR/../configmap.yaml"
fi

echo ""
echo "📋 密钥文件列表:"
ls -la "$SECRETS_DIR"

echo ""
echo "🎯 下一步操作:"

if [[ "$DEPLOYMENT_TYPE" == "docker" ]]; then
    echo "1. 编辑 .env.production 文件"
    echo "2. 运行: docker-compose -f deployment/docker-security/docker-compose.security.yml up -d"
    echo "3. 检查容器状态: docker-compose ps"
else
    echo "1. 编辑 deployment/k8s/secrets/configmap.yaml"
    echo "2. 应用配置: kubectl apply -f deployment/k8s/"
    echo "3. 检查Pod状态: kubectl get pods -n snapfit-ai"
fi

echo ""
echo "⚠️  重要提醒:"
echo "- 密钥文件包含敏感信息，请妥善保管"
echo "- 不要将密钥文件提交到版本控制系统"
echo "- 定期轮换密钥以提高安全性"
echo "- 备份密钥文件到安全位置"

echo ""
echo "✅ 密钥设置完成！"
