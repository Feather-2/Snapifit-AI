import type { FoodEntry, TEFAnalysis } from './types';

/**
 * 计算基础食物热效应 (TEF)
 * 基于宏量营养素的热效应系数：
 * - 蛋白质: 20-30% (取25%)
 * - 碳水化合物: 5-10% (取8%)
 * - 脂肪: 0-3% (取2%)
 */
export function calculateBaseTEF(foodEntries: FoodEntry[]): {
  totalTEF: number;
  tefByMacro: {
    protein: number;
    carbs: number;
    fat: number;
  };
  totalCalories: number;
} {
  let totalProteinTEF = 0;
  let totalCarbsTEF = 0;
  let totalFatTEF = 0;
  let totalCalories = 0;

  foodEntries.forEach(entry => {
    if (entry.total_nutritional_info_consumed) {
      const nutrition = entry.total_nutritional_info_consumed;
      
      // 计算各宏量营养素的卡路里
      const proteinCalories = (nutrition.protein || 0) * 4; // 1g蛋白质 = 4kcal
      const carbsCalories = (nutrition.carbohydrates || 0) * 4; // 1g碳水 = 4kcal
      const fatCalories = (nutrition.fat || 0) * 9; // 1g脂肪 = 9kcal
      
      // 计算各宏量营养素的TEF
      totalProteinTEF += proteinCalories * 0.25; // 25%
      totalCarbsTEF += carbsCalories * 0.08; // 8%
      totalFatTEF += fatCalories * 0.02; // 2%
      
      totalCalories += nutrition.calories || 0;
    }
  });

  const totalTEF = totalProteinTEF + totalCarbsTEF + totalFatTEF;

  return {
    totalTEF,
    tefByMacro: {
      protein: totalProteinTEF,
      carbs: totalCarbsTEF,
      fat: totalFatTEF,
    },
    totalCalories,
  };
}

/**
 * 计算时间衰减因子
 * TEF在进食后达到峰值，然后逐渐衰减
 * 一般在进食后1-3小时内达到峰值，6小时后基本消失
 */
export function calculateTimeDecayFactor(
  foodTimestamp: string,
  currentTime: Date = new Date()
): number {
  try {
    const foodTime = new Date(foodTimestamp);
    const hoursElapsed = (currentTime.getTime() - foodTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursElapsed < 0) return 0; // 未来时间
    if (hoursElapsed > 6) return 0; // 6小时后TEF基本消失
    
    // 使用指数衰减模型：peak at 1.5 hours, decay with half-life of 2 hours
    const peakTime = 1.5;
    const halfLife = 2;
    
    if (hoursElapsed <= peakTime) {
      // 上升阶段：从0到1
      return hoursElapsed / peakTime;
    } else {
      // 衰减阶段：指数衰减
      const decayTime = hoursElapsed - peakTime;
      return Math.exp(-decayTime * Math.LN2 / halfLife);
    }
  } catch (error) {
    console.warn('Error calculating time decay factor:', error);
    return 0;
  }
}

/**
 * 计算当前时刻的有效TEF
 * 考虑所有食物的时间衰减
 */
export function calculateCurrentTEF(
  foodEntries: FoodEntry[],
  currentTime: Date = new Date()
): number {
  let currentTEF = 0;

  foodEntries.forEach(entry => {
    if (entry.timestamp && entry.total_nutritional_info_consumed) {
      const nutrition = entry.total_nutritional_info_consumed;
      
      // 计算该食物的基础TEF
      const proteinCalories = (nutrition.protein || 0) * 4;
      const carbsCalories = (nutrition.carbohydrates || 0) * 4;
      const fatCalories = (nutrition.fat || 0) * 9;
      
      const foodTEF = proteinCalories * 0.25 + carbsCalories * 0.08 + fatCalories * 0.02;
      
      // 应用时间衰减因子
      const decayFactor = calculateTimeDecayFactor(entry.timestamp, currentTime);
      currentTEF += foodTEF * decayFactor;
    }
  });

  return currentTEF;
}

/**
 * 识别可能影响TEF的食物和物质
 * 返回影响因素和建议的乘数
 */
export function identifyTEFEnhancers(foodEntries: FoodEntry[]): {
  factors: string[];
  suggestedMultiplier: number;
} {
  const factors: string[] = [];
  let multiplier = 1.0;

  // 定义可能影响TEF的关键词
  // 注意：不包括高蛋白食物，因为蛋白质的TEF已经在基础计算中考虑了
  const tefEnhancers = {
    // 咖啡因类 - 可提高TEF 5-15%
    caffeine: {
      keywords: ['咖啡', '茶', '红茶', '乌龙茶', '咖啡因', '浓缩咖啡', '拿铁', '卡布奇诺', '美式咖啡', '奶茶', '茶叶', '可乐', '能量饮料'],
      multiplier: 1.1,
      description: '咖啡因'
    },
    // 绿茶特殊成分 - 儿茶素可提高TEF (优先级高于普通咖啡因)
    greenTea: {
      keywords: ['绿茶', '抹茶', '龙井', '碧螺春', '毛峰', '铁观音', '绿茶提取物'],
      multiplier: 1.12,
      description: '绿茶儿茶素'
    },
    // 辛辣食物 - 辣椒素可提高TEF 5-10%
    spicy: {
      keywords: ['辣椒', '胡椒', '芥末', '生姜', '大蒜', '洋葱', '辛辣', '麻辣', '川菜', '湘菜', '韩式', '泡菜', '咖喱', '辣椒素', '黑胡椒', '白胡椒'],
      multiplier: 1.08,
      description: '辛辣食物'
    },
    // 冷饮 - 身体需要额外能量加热
    cold: {
      keywords: ['冰水', '冰饮', '冰咖啡', '冰茶', '冰淇淋', '冰块', '冷饮', '冰沙'],
      multiplier: 1.03,
      description: '冷饮热效应'
    },
    // 其他代谢增强物质
    metabolicEnhancers: {
      keywords: ['肉桂', '姜黄', '柠檬', '柚子', '薄荷', '椰子油', 'MCT油', '藤黄果', '左旋肉碱', '共轭亚油酸'],
      multiplier: 1.05,
      description: '代谢增强物质'
    }
  };

  // 检查每个食物条目
  foodEntries.forEach(entry => {
    const foodName = entry.food_name.toLowerCase();
    
    Object.entries(tefEnhancers).forEach(([key, enhancer]) => {
      const hasKeyword = enhancer.keywords.some(keyword => 
        foodName.includes(keyword.toLowerCase())
      );
      
      if (hasKeyword && !factors.includes(enhancer.description)) {
        factors.push(enhancer.description);
        // 累积乘数效应，但有上限
        multiplier = Math.min(multiplier * enhancer.multiplier, 1.3); // 最大30%增强
      }
    });
  });

  return {
    factors,
    suggestedMultiplier: Math.round(multiplier * 100) / 100 // 保留2位小数
  };
}

/**
 * 生成完整的TEF分析
 */
export function generateTEFAnalysis(
  foodEntries: FoodEntry[],
  enhancementMultiplier?: number
): TEFAnalysis {
  const baseTEFData = calculateBaseTEF(foodEntries);
  const enhancers = identifyTEFEnhancers(foodEntries);
  
  // 使用提供的乘数或自动识别的乘数
  const finalMultiplier = enhancementMultiplier || enhancers.suggestedMultiplier;
  
  const enhancedTEF = baseTEFData.totalTEF * finalMultiplier;
  const baseTEFPercentage = baseTEFData.totalCalories > 0 
    ? (baseTEFData.totalTEF / baseTEFData.totalCalories) * 100 
    : 0;

  return {
    baseTEF: Math.round(baseTEFData.totalTEF * 10) / 10,
    baseTEFPercentage: Math.round(baseTEFPercentage * 10) / 10,
    enhancementMultiplier: finalMultiplier,
    enhancedTEF: Math.round(enhancedTEF * 10) / 10,
    enhancementFactors: enhancers.factors,
    analysisTimestamp: new Date().toISOString(),
  };
}
