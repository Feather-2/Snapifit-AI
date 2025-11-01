import { NextRequest, NextResponse } from "next/server"
import { handleApiError } from '@/lib/api/error-handler'
import { format, parseISO, eachDayOfInterval } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Missing start or end date" }, { status: 400 })
    }

    // 解析日期
    const start = parseISO(startDate)
    const end = parseISO(endDate)

    // 生成日期范围内的所有日期
    const dateRange = eachDayOfInterval({ start, end })

    // 从数据库或存储中获取真实数据
    // 这里我们需要查询：
    // 1. 每日体重记录
    // 2. 每日食物摄入总热量
    // 3. 每日运动消耗总热量
    // 4. 计算热量缺口

    const chartData = await Promise.all(
      dateRange.map(async (date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        
        // 获取当日数据 - 这里需要连接到你的数据存储
        const dailyData = await getDailyHealthData(dateStr)
        
        return {
          date: format(date, 'MM-dd'),
          weight: dailyData.weight,
          caloriesIn: dailyData.caloriesIn,
          caloriesOut: dailyData.caloriesOut,
          calorieDeficit: dailyData.calorieDeficit
        }
      })
    )

    return NextResponse.json(chartData)
  } catch (error) {
    console.error('获取图表数据失败:', error)
    return handleApiError(error, 500)
  }
}

// 获取指定日期的健康数据
async function getDailyHealthData(dateStr: string) {
  // 这里需要根据你的数据存储方式来实现
  // 可能的数据源：
  // 1. localStorage (客户端存储)
  // 2. 数据库 (如果有后端)
  // 3. 文件存储
  
  try {
    // 示例：从localStorage获取数据
    // 注意：这在服务端不可用，需要改为其他存储方式
    
    // 临时返回模拟数据，直到连接真实数据源
    const weight = 70 + Math.sin(Date.parse(dateStr) * 0.0001) * 2 + Math.random() * 1 - 0.5
    const caloriesIn = 1800 + Math.random() * 600
    const caloriesOut = 300 + Math.random() * 400
    const calorieDeficit = caloriesIn - caloriesOut - 1800 // 假设TDEE为1800
    
    return {
      weight: Number(weight.toFixed(1)),
      caloriesIn: Number(caloriesIn.toFixed(0)),
      caloriesOut: Number(caloriesOut.toFixed(0)),
      calorieDeficit: Number(calorieDeficit.toFixed(0))
    }
  } catch (error) {
    // 返回默认值
    return {
      weight: null,
      caloriesIn: 0,
      caloriesOut: 0,
      calorieDeficit: 0
    }
  }
}

// 如果要连接真实的localStorage数据，需要创建一个客户端API
// 或者将数据存储迁移到服务端数据库
