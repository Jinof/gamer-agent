#!/bin/bash
# GamerAgent 构建脚本 - 自动签名并复制到 Applications

set -e

# 1. 构建项目
echo "正在构建项目..."
xcodebuild -project GamerAgent.xcodeproj -scheme GamerAgent -configuration Debug build

# 2. 找到构建产物
BUILD_DIR=~/Library/Developer/Xcode/DerivedData/GamerAgent-*/Build/Products/Debug
APP_PATH="$BUILD_DIR/GamerAgent.app"

# 使用 glob 找到实际的路径
APP_PATH=$(echo $APP_PATH)

if [ ! -d "$APP_PATH" ]; then
    echo "错误：找不到构建产物"
    exit 1
fi

echo "构建产物: $APP_PATH"

# 3. 复制到 Applications（如果存在则覆盖）
echo "正在复制到 Applications..."
rm -rf /Applications/GamerAgent.app 2>/dev/null || true
cp -R "$APP_PATH" /Applications/

# 4. 重新签名（使用与构建时相同的签名）
echo "正在重新签名..."
codesign --force --sign - /Applications/GamerAgent.app

# 5. 验证签名
echo "验证签名..."
codesign --verify -v /Applications/GamerAgent.app

echo ""
echo "✅ 完成！"
echo ""
echo "请从 /Applications/GamerAgent.app 运行应用"
echo "权限将会正确识别"
