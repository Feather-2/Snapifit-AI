/**
 * 简单的数学验证码服务
 * 用于防止自动化攻击和滥用
 */

import crypto from 'crypto'

// 内存存储验证码会话（生产环境建议使用Redis）
const captchaSessions = new Map<string, {
  answer: number
  createdAt: number
  attempts: number
}>()

// 验证码配置
const CAPTCHA_CONFIG = {
  // 验证码有效期（5分钟）
  EXPIRY_TIME: 5 * 60 * 1000,
  // 最大尝试次数
  MAX_ATTEMPTS: 3,
  // 数字范围
  MIN_NUMBER: 1,
  MAX_NUMBER: 20,
  // 清理间隔（10分钟）
  CLEANUP_INTERVAL: 10 * 60 * 1000
}

// 定期清理过期的验证码会话
setInterval(() => {
  const now = Date.now()
  for (const [sessionId, session] of captchaSessions.entries()) {
    if (now - session.createdAt > CAPTCHA_CONFIG.EXPIRY_TIME) {
      captchaSessions.delete(sessionId)
    }
  }
}, CAPTCHA_CONFIG.CLEANUP_INTERVAL)

/**
 * 生成数学验证码
 * @returns 验证码信息
 */
export function generateMathCaptcha(): {
  sessionId: string
  question: string
  answer: number
} {
  // 生成随机数
  const num1 = Math.floor(Math.random() * (CAPTCHA_CONFIG.MAX_NUMBER - CAPTCHA_CONFIG.MIN_NUMBER + 1)) + CAPTCHA_CONFIG.MIN_NUMBER
  const num2 = Math.floor(Math.random() * (CAPTCHA_CONFIG.MAX_NUMBER - CAPTCHA_CONFIG.MIN_NUMBER + 1)) + CAPTCHA_CONFIG.MIN_NUMBER
  
  // 随机选择运算符
  const operators = ['+', '-', '*']
  const operator = operators[Math.floor(Math.random() * operators.length)]
  
  let answer: number
  let question: string
  
  switch (operator) {
    case '+':
      answer = num1 + num2
      question = `${num1} + ${num2} = ?`
      break
    case '-':
      // 确保结果为正数
      const larger = Math.max(num1, num2)
      const smaller = Math.min(num1, num2)
      answer = larger - smaller
      question = `${larger} - ${smaller} = ?`
      break
    case '*':
      // 使用较小的数字进行乘法
      const smallNum1 = Math.floor(Math.random() * 10) + 1
      const smallNum2 = Math.floor(Math.random() * 10) + 1
      answer = smallNum1 * smallNum2
      question = `${smallNum1} × ${smallNum2} = ?`
      break
    default:
      answer = num1 + num2
      question = `${num1} + ${num2} = ?`
  }
  
  // 生成会话ID
  const sessionId = crypto.randomBytes(16).toString('hex')
  
  // 存储验证码会话
  captchaSessions.set(sessionId, {
    answer,
    createdAt: Date.now(),
    attempts: 0
  })
  
  return {
    sessionId,
    question,
    answer // 注意：实际使用时不应该返回答案给前端
  }
}

/**
 * 验证数学验证码
 * @param sessionId 会话ID
 * @param userAnswer 用户答案
 * @returns 验证结果
 */
export function verifyCaptcha(sessionId: string, userAnswer: number): boolean {
  const session = captchaSessions.get(sessionId)
  
  if (!session) {
    console.log('❌ 验证码会话不存在或已过期')
    return false
  }
  
  // 检查是否过期
  if (Date.now() - session.createdAt > CAPTCHA_CONFIG.EXPIRY_TIME) {
    captchaSessions.delete(sessionId)
    console.log('❌ 验证码已过期')
    return false
  }
  
  // 检查尝试次数
  if (session.attempts >= CAPTCHA_CONFIG.MAX_ATTEMPTS) {
    captchaSessions.delete(sessionId)
    console.log('❌ 验证码尝试次数超限')
    return false
  }
  
  // 增加尝试次数
  session.attempts++
  
  // 验证答案
  const isCorrect = session.answer === userAnswer
  
  if (isCorrect) {
    // 验证成功，删除会话
    captchaSessions.delete(sessionId)
    console.log('✅ 验证码验证成功')
  } else {
    console.log('❌ 验证码答案错误')
  }
  
  return isCorrect
}

/**
 * 获取验证码统计信息（用于监控）
 */
export function getCaptchaStats(): {
  activeSessions: number
  totalGenerated: number
  successRate: number
} {
  return {
    activeSessions: captchaSessions.size,
    totalGenerated: 0, // 可以添加计数器
    successRate: 0 // 可以添加成功率统计
  }
}

/**
 * 清理所有验证码会话（用于测试或维护）
 */
export function clearAllCaptchaSessions(): void {
  captchaSessions.clear()
  console.log('🧹 已清理所有验证码会话')
}
