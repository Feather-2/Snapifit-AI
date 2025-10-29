#!/usr/bin/env node

/**
 * UI 版本适配验证脚本
 *
 * 用于验证四个版本的 UI 是否正确适配
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

function checkFileContains(filePath, patterns) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const results = {};

    for (const [key, pattern] of Object.entries(patterns)) {
      if (typeof pattern === 'string') {
        results[key] = content.includes(pattern);
      } else {
        results[key] = pattern.test(content);
      }
    }

    return results;
  } catch (error) {
    return null;
  }
}

const checks = [
  {
    name: '设置页面 - 功能特性导入',
    file: 'app/[locale]/settings/page.tsx',
    patterns: {
      'useFeature导入': /import\s*{\s*useFeature\s*}\s*from\s*['"]@\/hooks\/use-feature['"]/,
      'hasInviteSystem声明': /hasInviteSystem\s*=\s*useFeature/,
      'hasSharedKeys声明': /hasSharedKeys\s*=\s*useFeature/,
    },
  },
  {
    name: '设置页面 - 邀请码标签过滤',
    file: 'app/[locale]/settings/page.tsx',
    patterns: {
      'validTabs动态生成': /validTabs.*useMemo/s,
      '邀请码标签条件渲染': /hasInviteSystem.*inviteCodes/s,
    },
  },
  {
    name: '设置页面 - 共享密钥选项过滤',
    file: 'app/[locale]/settings/page.tsx',
    patterns: {
      'agentModel共享选项': /hasSharedKeys.*agent-shared/s,
      'chatModel共享选项': /hasSharedKeys.*chat-shared/s,
      'visionModel共享选项': /hasSharedKeys.*vision-shared/s,
    },
  },
  {
    name: '管理面板 - 版本保护',
    file: 'app/[locale]/admin/page.tsx',
    patterns: {
      'useFeature导入': /import\s*{\s*useFeature\s*}\s*from\s*['"]@\/hooks\/use-feature['"]/,
      'hasAdminPanel声明': /hasAdminPanel\s*=\s*useFeature/,
      '版本检查': /hasAdminPanel.*router\.push/s,
    },
  },
  {
    name: '邀请码页面 - 版本保护',
    file: 'app/[locale]/invite-codes/page.tsx',
    patterns: {
      'useFeature导入': /import\s*{\s*useFeature\s*}\s*from\s*['"]@\/hooks\/use-feature['"]/,
      'hasInviteSystem声明': /hasInviteSystem\s*=\s*useFeature/,
      '版本检查': /hasInviteSystem.*router\.push/s,
    },
  },
  {
    name: '版本保护组件 - 存在性检查',
    file: 'components/version-guard.tsx',
    patterns: {
      'VersionGuard组件': /export\s+function\s+VersionGuard/,
      'ConditionalFeature组件': /export\s+function\s+ConditionalFeature/,
    },
  },
];

log('\n' + '='.repeat(60), colors.cyan);
log('UI 版本适配验证', colors.bright + colors.cyan);
log('='.repeat(60) + '\n', colors.cyan);

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

checks.forEach((check, index) => {
  log(`\n[${index + 1}/${checks.length}] ${check.name}`, colors.bright);
  log(`文件: ${check.file}`, colors.blue);

  const filePath = path.join(process.cwd(), check.file);

  if (!fs.existsSync(filePath)) {
    log(`  ✗ 文件不存在`, colors.red);
    failedChecks += Object.keys(check.patterns).length;
    totalChecks += Object.keys(check.patterns).length;
    return;
  }

  const results = checkFileContains(filePath, check.patterns);

  if (!results) {
    log(`  ✗ 无法读取文件`, colors.red);
    failedChecks += Object.keys(check.patterns).length;
    totalChecks += Object.keys(check.patterns).length;
    return;
  }

  for (const [key, passed] of Object.entries(results)) {
    totalChecks++;
    if (passed) {
      log(`  ✓ ${key}`, colors.green);
      passedChecks++;
    } else {
      log(`  ✗ ${key}`, colors.red);
      failedChecks++;
    }
  }
});

// 总结
log('\n' + '='.repeat(60), colors.cyan);
log('验证结果', colors.bright + colors.cyan);
log('='.repeat(60), colors.cyan);

const percentage = Math.round((passedChecks / totalChecks) * 100);
const statusColor = percentage === 100 ? colors.green : percentage >= 70 ? colors.yellow : colors.red;

log(`\n总计检查项: ${totalChecks}`, colors.bright);
log(`通过: ${passedChecks}`, colors.green);
log(`失败: ${failedChecks}`, failedChecks > 0 ? colors.red : colors.green);
log(`完成度: ${percentage}%`, statusColor);

if (percentage === 100) {
  log('\n🎉 所有检查项均已通过！', colors.green + colors.bright);
} else if (percentage >= 70) {
  log('\n⚠️  大部分检查项已通过，但仍有改进空间', colors.yellow);
} else {
  log('\n❌ 许多检查项未通过，需要进一步修复', colors.red);
}

log('\n' + '='.repeat(60) + '\n', colors.cyan);

// 返回退出码
process.exit(failedChecks > 0 ? 1 : 0);
