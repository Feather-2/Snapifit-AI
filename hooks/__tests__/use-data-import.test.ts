/**
 * 测试数据导入hook的功能
 * 这个测试文件验证数据导入的各种场景
 */

// 模拟数据验证函数
function validateImportData(data: any): { isValid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid data format. Expected JSON object.' }
  }

  if (!data.userProfile) {
    return { isValid: false, error: 'Missing user profile data.' }
  }

  if (!data.healthLogs || typeof data.healthLogs !== 'object') {
    return { isValid: false, error: 'Missing or invalid health logs data.' }
  }

  // 验证健康日志的基本结构
  const logEntries = Object.entries(data.healthLogs)
  if (logEntries.length === 0) {
    return { isValid: false, error: 'No health logs found in the data.' }
  }

  // 验证日期格式
  for (const [date, logData] of logEntries) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { isValid: false, error: `Invalid date format: ${date}. Expected YYYY-MM-DD.` }
    }
    
    if (!logData || typeof logData !== 'object') {
      return { isValid: false, error: `Invalid log data for date: ${date}` }
    }
  }

  return { isValid: true }
}

describe('validateImportData', () => {
  test('should validate correct data structure', () => {
    const validData = {
      userProfile: {
        weight: 70,
        height: 175,
        age: 30
      },
      healthLogs: {
        '2024-01-01': {
          foodEntries: [],
          exerciseEntries: []
        }
      }
    }

    const result = validateImportData(validData)
    expect(result.isValid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  test('should reject null or undefined data', () => {
    const result1 = validateImportData(null)
    expect(result1.isValid).toBe(false)
    expect(result1.error).toContain('Invalid data format')

    const result2 = validateImportData(undefined)
    expect(result2.isValid).toBe(false)
    expect(result2.error).toContain('Invalid data format')
  })

  test('should reject data without userProfile', () => {
    const invalidData = {
      healthLogs: {
        '2024-01-01': {}
      }
    }

    const result = validateImportData(invalidData)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Missing user profile data')
  })

  test('should reject data without healthLogs', () => {
    const invalidData = {
      userProfile: {
        weight: 70
      }
    }

    const result = validateImportData(invalidData)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Missing or invalid health logs data')
  })

  test('should reject empty healthLogs', () => {
    const invalidData = {
      userProfile: {
        weight: 70
      },
      healthLogs: {}
    }

    const result = validateImportData(invalidData)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('No health logs found')
  })

  test('should reject invalid date format', () => {
    const invalidData = {
      userProfile: {
        weight: 70
      },
      healthLogs: {
        'invalid-date': {}
      }
    }

    const result = validateImportData(invalidData)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Invalid date format')
  })

  test('should accept valid data with AI memories', () => {
    const validData = {
      userProfile: {
        weight: 70,
        height: 175
      },
      healthLogs: {
        '2024-01-01': {
          foodEntries: [],
          exerciseEntries: []
        }
      },
      aiMemories: {
        'nutrition': {
          content: 'User prefers low-carb diet',
          version: 1,
          lastUpdated: '2024-01-01T00:00:00Z'
        }
      }
    }

    const result = validateImportData(validData)
    expect(result.isValid).toBe(true)
  })
})

// 模拟测试数据生成器
export function createMockImportData() {
  return {
    userProfile: {
      weight: 70,
      height: 175,
      age: 30,
      gender: 'male',
      activityLevel: 'moderate',
      goal: 'maintain'
    },
    healthLogs: {
      '2024-01-01': {
        date: '2024-01-01',
        foodEntries: [
          {
            log_id: 'food-1',
            food_name: '苹果',
            consumed_grams: 150,
            meal_type: 'breakfast',
            nutritional_info_per_100g: {
              calories: 52,
              carbohydrates: 14,
              protein: 0.3,
              fat: 0.2
            },
            total_nutritional_info_consumed: {
              calories: 78,
              carbohydrates: 21,
              protein: 0.45,
              fat: 0.3
            }
          }
        ],
        exerciseEntries: [
          {
            log_id: 'exercise-1',
            exercise_name: '跑步',
            exercise_type: 'cardio',
            duration_minutes: 30,
            calories_burned_estimated: 300
          }
        ],
        summary: {
          totalCaloriesConsumed: 78,
          totalCaloriesBurned: 300,
          macros: {
            carbs: 21,
            protein: 0.45,
            fat: 0.3
          }
        },
        last_modified: '2024-01-01T12:00:00Z'
      }
    },
    aiMemories: {
      'nutrition': {
        expertId: 'nutrition',
        content: 'User prefers healthy, balanced meals',
        version: 1,
        lastUpdated: '2024-01-01T00:00:00Z'
      }
    },
    aiConfig: {
      agentModel: {
        name: 'gpt-4o',
        baseUrl: 'https://api.openai.com',
        apiKey: '',
        source: 'shared'
      }
    }
  }
}

// 导出验证函数供其他测试使用
export { validateImportData }
