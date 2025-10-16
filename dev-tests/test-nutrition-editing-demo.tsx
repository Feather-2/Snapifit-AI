// 营养编辑功能演示组件
// 这个文件用于测试新的营养编辑功能

import React, { useState } from 'react';
import type { FoodEntry } from '@/lib/types';

// 模拟食物数据
const mockFoodEntry: FoodEntry = {
  log_id: "test-123",
  food_name: "全麦面包",
  consumed_grams: 80,
  meal_type: "breakfast",
  time_period: "morning",
  timestamp: "08:30",
  nutritional_info_per_100g: {
    calories: 265,
    carbohydrates: 48.5,
    protein: 9.0,
    fat: 3.2,
    fiber: 7.4,
    sugar: 2.1,
    sodium: 450
  },
  total_nutritional_info_consumed: {
    calories: 212,
    carbohydrates: 38.8,
    protein: 7.2,
    fat: 2.56,
    fiber: 5.92,
    sugar: 1.68,
    sodium: 360
  },
  is_estimated: true
};

export function NutritionEditingDemo() {
  const [foodEntry, setFoodEntry] = useState<FoodEntry>(mockFoodEntry);
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdate = (updatedEntry: FoodEntry) => {
    setFoodEntry(updatedEntry);
    setIsEditing(false);
    console.log('Updated food entry:', updatedEntry);
  };

  const handleDelete = () => {
    console.log('Delete food entry:', foodEntry.log_id);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">营养编辑功能演示</h1>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">🎯 测试功能：</h2>
        <ul className="text-sm space-y-1">
          <li>• 点击编辑按钮进入编辑模式</li>
          <li>• 修改食物名称、份量、时间等基本信息</li>
          <li>• 点击"编辑营养"展开营养数据编辑</li>
          <li>• 修改营养数据，观察总营养成分的实时变化</li>
          <li>• 保存修改并查看控制台输出</li>
        </ul>
      </div>

      {/* 食物卡片 */}
      <FoodEntryCard
        entry={foodEntry}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        readOnly={false}
      />

      {/* 数据显示 */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">当前数据：</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium">基本信息：</h4>
            <ul className="space-y-1">
              <li>食物：{foodEntry.food_name}</li>
              <li>份量：{foodEntry.consumed_grams}g</li>
              <li>餐次：{foodEntry.meal_type}</li>
              <li>时间：{foodEntry.timestamp}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium">营养成分（总量）：</h4>
            <ul className="space-y-1">
              <li>卡路里：{foodEntry.total_nutritional_info_consumed.calories.toFixed(1)}</li>
              <li>碳水：{foodEntry.total_nutritional_info_consumed.carbohydrates.toFixed(1)}g</li>
              <li>蛋白质：{foodEntry.total_nutritional_info_consumed.protein.toFixed(1)}g</li>
              <li>脂肪：{foodEntry.total_nutritional_info_consumed.fat.toFixed(1)}g</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 计算验证 */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">🧮 计算验证：</h3>
        <div className="text-sm space-y-2">
          <div>
            <strong>卡路里计算：</strong>
            <br />
            每100g: {foodEntry.nutritional_info_per_100g.calories} kcal
            <br />
            份量: {foodEntry.consumed_grams}g
            <br />
            计算结果: {foodEntry.nutritional_info_per_100g.calories} × {foodEntry.consumed_grams} ÷ 100 = {(foodEntry.nutritional_info_per_100g.calories * foodEntry.consumed_grams / 100).toFixed(1)} kcal
            <br />
            实际值: {foodEntry.total_nutritional_info_consumed.calories.toFixed(1)} kcal
            <br />
            <span className={
              Math.abs(foodEntry.total_nutritional_info_consumed.calories - (foodEntry.nutritional_info_per_100g.calories * foodEntry.consumed_grams / 100)) < 0.01
                ? "text-green-600 font-medium"
                : "text-red-600 font-medium"
            }>
              {Math.abs(foodEntry.total_nutritional_info_consumed.calories - (foodEntry.nutritional_info_per_100g.calories * foodEntry.consumed_grams / 100)) < 0.01
                ? "✅ 计算正确"
                : "❌ 计算错误"
              }
            </span>
          </div>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">📝 使用说明：</h3>
        <div className="text-sm space-y-2">
          <p><strong>1. 基本编辑：</strong>修改食物名称、份量等基本信息</p>
          <p><strong>2. 时间编辑：</strong>使用时间选择器设置具体时间（HH:MM格式）</p>
          <p><strong>3. 营养编辑：</strong>点击"编辑营养"按钮展开营养数据编辑区域</p>
          <p><strong>4. 实时计算：</strong>修改任何数值后，总营养成分会自动重新计算</p>
          <p><strong>5. 保存修改：</strong>点击保存按钮确认所有修改</p>
        </div>
      </div>
    </div>
  );
}

// 测试场景
export const testScenarios = [
  {
    name: "修改份量测试",
    description: "将份量从80g改为120g，验证总营养成分是否正确重新计算",
    steps: [
      "1. 点击编辑按钮",
      "2. 将份量从80改为120",
      "3. 观察总卡路里是否从212变为318",
      "4. 点击保存"
    ]
  },
  {
    name: "修改营养数据测试", 
    description: "修改每100g卡路里，验证总卡路里是否相应变化",
    steps: [
      "1. 点击编辑按钮",
      "2. 点击'编辑营养'展开营养编辑区域",
      "3. 将每100g卡路里从265改为300",
      "4. 观察总卡路里是否变为240（300 × 0.8）",
      "5. 点击保存"
    ]
  },
  {
    name: "时间编辑测试",
    description: "修改具体时间，验证时间格式是否正确",
    steps: [
      "1. 点击编辑按钮",
      "2. 修改时间从08:30到09:15",
      "3. 验证时间显示格式正确",
      "4. 点击保存"
    ]
  }
];

export default NutritionEditingDemo;
