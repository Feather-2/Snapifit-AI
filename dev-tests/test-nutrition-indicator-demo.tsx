// 营养指示灯功能演示组件
// 用于测试新的高热量餐食营养分析功能

import React from 'react';
import { GroupedEntriesDisplay } from '@/components/grouped-entries-display';
import type { FoodEntry } from '@/lib/types';

// 模拟一天的食物数据
const mockFoodEntries: FoodEntry[] = [
  // 上午 - 高热量餐次 (450 kcal) - 应显示指示灯
  {
    log_id: "morning-1",
    food_name: "全麦面包",
    consumed_grams: 80,
    meal_type: "breakfast",
    time_period: "morning",
    timestamp: "08:00",
    nutritional_info_per_100g: {
      calories: 265,
      carbohydrates: 48.5,
      protein: 9.0,
      fat: 3.2,
      fiber: 7.4
    },
    total_nutritional_info_consumed: {
      calories: 212,
      carbohydrates: 38.8,
      protein: 7.2,
      fat: 2.56,
      fiber: 5.92
    },
    is_estimated: true
  },
  {
    log_id: "morning-2", 
    food_name: "牛奶",
    consumed_grams: 200,
    meal_type: "breakfast",
    time_period: "morning",
    timestamp: "08:15",
    nutritional_info_per_100g: {
      calories: 67,
      carbohydrates: 4.8,
      protein: 3.4,
      fat: 3.7
    },
    total_nutritional_info_consumed: {
      calories: 134,
      carbohydrates: 9.6,
      protein: 6.8,
      fat: 7.4
    },
    is_estimated: true
  },
  {
    log_id: "morning-3",
    food_name: "鸡蛋",
    consumed_grams: 60,
    meal_type: "breakfast", 
    time_period: "morning",
    timestamp: "08:20",
    nutritional_info_per_100g: {
      calories: 173,
      carbohydrates: 0.6,
      protein: 12.6,
      fat: 12.0
    },
    total_nutritional_info_consumed: {
      calories: 104,
      carbohydrates: 0.36,
      protein: 7.56,
      fat: 7.2
    },
    is_estimated: true
  },

  // 中午 - 高热量餐次 (380 kcal) - 应显示指示灯
  {
    log_id: "noon-1",
    food_name: "米饭",
    consumed_grams: 150,
    meal_type: "lunch",
    time_period: "noon", 
    timestamp: "12:00",
    nutritional_info_per_100g: {
      calories: 120,
      carbohydrates: 25,
      protein: 2.5,
      fat: 0.3
    },
    total_nutritional_info_consumed: {
      calories: 180,
      carbohydrates: 37.5,
      protein: 3.75,
      fat: 0.45
    },
    is_estimated: true
  },
  {
    log_id: "noon-2",
    food_name: "红烧肉",
    consumed_grams: 100,
    meal_type: "lunch",
    time_period: "noon",
    timestamp: "12:15", 
    nutritional_info_per_100g: {
      calories: 200,
      carbohydrates: 8,
      protein: 18,
      fat: 35
    },
    total_nutritional_info_consumed: {
      calories: 200,
      carbohydrates: 8,
      protein: 18,
      fat: 35
    },
    is_estimated: true
  },

  // 下午 - 低热量餐次 (200 kcal) - 不应显示指示灯
  {
    log_id: "afternoon-1",
    food_name: "苹果",
    consumed_grams: 150,
    meal_type: "snack",
    time_period: "afternoon",
    timestamp: "15:30",
    nutritional_info_per_100g: {
      calories: 52,
      carbohydrates: 14,
      protein: 0.3,
      fat: 0.2,
      fiber: 2.4
    },
    total_nutritional_info_consumed: {
      calories: 78,
      carbohydrates: 21,
      protein: 0.45,
      fat: 0.3,
      fiber: 3.6
    },
    is_estimated: true
  },
  {
    log_id: "afternoon-2",
    food_name: "酸奶",
    consumed_grams: 100,
    meal_type: "snack",
    time_period: "afternoon",
    timestamp: "16:00",
    nutritional_info_per_100g: {
      calories: 122,
      carbohydrates: 16,
      protein: 4.5,
      fat: 4.2
    },
    total_nutritional_info_consumed: {
      calories: 122,
      carbohydrates: 16,
      protein: 4.5,
      fat: 4.2
    },
    is_estimated: true
  },

  // 夜宵 - 低热量餐次 (150 kcal) - 不应显示指示灯
  {
    log_id: "evening-1",
    food_name: "香蕉",
    consumed_grams: 120,
    meal_type: "snack",
    time_period: "evening",
    timestamp: "21:00",
    nutritional_info_per_100g: {
      calories: 125,
      carbohydrates: 32,
      protein: 1.3,
      fat: 0.3,
      fiber: 2.6
    },
    total_nutritional_info_consumed: {
      calories: 150,
      carbohydrates: 38.4,
      protein: 1.56,
      fat: 0.36,
      fiber: 3.12
    },
    is_estimated: true
  }
];

export function NutritionIndicatorDemo() {
  const handleDeleteFood = (logId: string) => {
    console.log('Delete food:', logId);
  };

  const handleUpdateFood = (updatedEntry: FoodEntry) => {
    console.log('Update food:', updatedEntry);
  };

  const handleBatchDeleteFood = (logIds: string[]) => {
    console.log('Batch delete food:', logIds);
  };

  // 计算各时间段的热量总计
  const calculatePeriodCalories = (period: string) => {
    return mockFoodEntries
      .filter(entry => entry.time_period === period)
      .reduce((total, entry) => total + (entry.total_nutritional_info_consumed?.calories || 0), 0);
  };

  const morningCalories = calculatePeriodCalories('morning');
  const noonCalories = calculatePeriodCalories('noon');
  const afternoonCalories = calculatePeriodCalories('afternoon');
  const eveningCalories = calculatePeriodCalories('evening');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">营养指示灯功能演示</h1>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">🎯 功能说明：</h2>
        <ul className="text-sm space-y-1">
          <li>• <strong>指示灯触发条件</strong>：当某个时间段的总热量 ≥ 350大卡时显示橙色闪电图标 ⚡</li>
          <li>• <strong>点击指示灯</strong>：查看该餐次的详细营养分析和累计营养摄入</li>
          <li>• <strong>营养分析内容</strong>：宏量营养素分布、每日目标进度、食物清单</li>
        </ul>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">📊 测试数据概览：</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-2 bg-white rounded">
            <div className="font-medium">上午</div>
            <div className={`text-lg font-bold ${morningCalories >= 350 ? 'text-orange-600' : 'text-gray-600'}`}>
              {morningCalories} kcal
            </div>
            <div className="text-xs text-muted-foreground">
              {morningCalories >= 350 ? '⚡ 显示指示灯' : '无指示灯'}
            </div>
          </div>
          <div className="text-center p-2 bg-white rounded">
            <div className="font-medium">中午</div>
            <div className={`text-lg font-bold ${noonCalories >= 350 ? 'text-orange-600' : 'text-gray-600'}`}>
              {noonCalories} kcal
            </div>
            <div className="text-xs text-muted-foreground">
              {noonCalories >= 350 ? '⚡ 显示指示灯' : '无指示灯'}
            </div>
          </div>
          <div className="text-center p-2 bg-white rounded">
            <div className="font-medium">下午</div>
            <div className={`text-lg font-bold ${afternoonCalories >= 350 ? 'text-orange-600' : 'text-gray-600'}`}>
              {afternoonCalories} kcal
            </div>
            <div className="text-xs text-muted-foreground">
              {afternoonCalories >= 350 ? '⚡ 显示指示灯' : '无指示灯'}
            </div>
          </div>
          <div className="text-center p-2 bg-white rounded">
            <div className="font-medium">夜宵</div>
            <div className={`text-lg font-bold ${eveningCalories >= 350 ? 'text-orange-600' : 'text-gray-600'}`}>
              {eveningCalories} kcal
            </div>
            <div className="text-xs text-muted-foreground">
              {eveningCalories >= 350 ? '⚡ 显示指示灯' : '无指示灯'}
            </div>
          </div>
        </div>
      </div>

      {/* 食物分组显示 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">📱 实际界面效果：</h3>
        <GroupedEntriesDisplay
          type="food"
          foodEntries={mockFoodEntries}
          onDeleteFood={handleDeleteFood}
          onUpdateFood={handleUpdateFood}
          onBatchDeleteFood={handleBatchDeleteFood}
          readOnly={false}
        />
      </div>

      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">✅ 预期结果：</h3>
        <ul className="text-sm space-y-1">
          <li>• <strong>上午 (450 kcal)</strong>：应显示橙色闪电指示灯 ⚡</li>
          <li>• <strong>中午 (380 kcal)</strong>：应显示橙色闪电指示灯 ⚡</li>
          <li>• <strong>下午 (200 kcal)</strong>：不应显示指示灯</li>
          <li>• <strong>夜宵 (150 kcal)</strong>：不应显示指示灯</li>
          <li>• <strong>点击指示灯</strong>：打开营养分析弹窗，显示详细营养信息</li>
        </ul>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">🧪 测试步骤：</h3>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>观察上午和中午时间段是否显示橙色闪电图标 ⚡</li>
          <li>确认下午和夜宵时间段没有显示指示灯</li>
          <li>点击上午的指示灯，查看营养分析弹窗</li>
          <li>验证当前餐次营养数据：450 kcal</li>
          <li>验证累计营养数据：450 kcal (仅上午)</li>
          <li>点击中午的指示灯，查看营养分析弹窗</li>
          <li>验证当前餐次营养数据：380 kcal</li>
          <li>验证累计营养数据：830 kcal (上午+中午)</li>
          <li>检查宏量营养素分布图是否正确显示</li>
          <li>检查每日目标进度条是否正确计算</li>
        </ol>
      </div>
    </div>
  );
}

export default NutritionIndicatorDemo;
