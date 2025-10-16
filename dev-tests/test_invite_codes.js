// 测试新的邀请码生成算法

class InviteCodeTester {
  static generateCode() {
    // 排除容易混淆的字符：0,O,1,I,L
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    
    // 生成3段，每段4位
    const segments = []
    
    for (let segment = 0; segment < 3; segment++) {
      let segmentCode = ''
      
      if (segment === 0) {
        // 第一段：时间戳编码 + 随机字符
        const timeBase = Date.now().toString(36).toUpperCase().slice(-2)
        // 确保时间戳字符在允许的字符集中
        let timeEncoded = ''
        for (const char of timeBase) {
          if (chars.includes(char)) {
            timeEncoded += char
          } else {
            // 如果字符不在允许集合中，用随机字符替换
            timeEncoded += chars.charAt(Math.floor(Math.random() * chars.length))
          }
        }
        segmentCode = timeEncoded.padEnd(2, chars.charAt(Math.floor(Math.random() * chars.length)))
        
        // 补充2位随机字符
        for (let i = 0; i < 2; i++) {
          segmentCode += chars.charAt(Math.floor(Math.random() * chars.length))
        }
      } else if (segment === 1) {
        // 第二段：完全随机
        for (let i = 0; i < 4; i++) {
          segmentCode += chars.charAt(Math.floor(Math.random() * chars.length))
        }
      } else {
        // 第三段：3位随机 + 1位校验位
        for (let i = 0; i < 3; i++) {
          segmentCode += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        
        // 计算校验位
        const checksum = this.calculateChecksum(segments[0] + segments[1] + segmentCode)
        segmentCode += chars.charAt(checksum % chars.length)
      }
      
      segments.push(segmentCode)
    }
    
    return segments.join('-')
  }

  static calculateChecksum(code) {
    let sum = 0
    for (let i = 0; i < code.length; i++) {
      sum += code.charCodeAt(i) * (i + 1)
    }
    return sum
  }

  static validateCodeFormat(code) {
    // 检查基本格式: XXXX-YYYY-ZZZZ
    const pattern = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/
    
    if (!pattern.test(code)) {
      return false
    }
    
    // 验证校验位
    const segments = code.split('-')
    const dataToCheck = segments[0] + segments[1] + segments[2].slice(0, 3)
    const providedChecksum = segments[2].charAt(3)
    
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    const calculatedChecksum = this.calculateChecksum(dataToCheck)
    const expectedChecksum = chars.charAt(calculatedChecksum % chars.length)
    
    return providedChecksum === expectedChecksum
  }

  static testGeneration() {
    console.log('🧪 测试邀请码生成...\n')
    
    const codes = []
    for (let i = 0; i < 10; i++) {
      const code = this.generateCode()
      const isValid = this.validateCodeFormat(code)
      codes.push({ code, isValid })
      
      console.log(`${i + 1}. ${code} - ${isValid ? '✅ 有效' : '❌ 无效'}`)
    }
    
    const validCount = codes.filter(c => c.isValid).length
    console.log(`\n📊 生成结果: ${validCount}/10 个邀请码有效`)
    
    // 测试重复性
    console.log('\n🔄 测试重复性...')
    const uniqueCodes = new Set(codes.map(c => c.code))
    console.log(`生成了 ${uniqueCodes.size} 个唯一邀请码（应该是10个）`)
    
    // 测试格式特点
    console.log('\n🎯 格式特点验证:')
    console.log('- 长度: 14字符（包含2个分隔符）')
    console.log('- 格式: XXXX-YYYY-ZZZZ')
    console.log('- 字符集: 排除了 0,O,1,I,L 等易混淆字符')
    console.log('- 校验位: 最后一位是校验位，防止输入错误')
    console.log('- 时间戳: 第一段包含时间信息，便于追踪')
    
    return codes
  }
}

// 运行测试
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InviteCodeTester
} else {
  // 在浏览器中运行
  InviteCodeTester.testGeneration()
}
