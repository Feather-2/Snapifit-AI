// 测试营养计算逻辑
// 模拟AI返回的简化数据格式

const testFoodData = {
  food: [
    {
      food_name: "全麦面包",
      consumed_grams: 80,
      meal_type: "breakfast",
      time_period: "morning",
      nutritional_info_per_100g: {
        calories: 265,
        carbohydrates: 48.5,
        protein: 9.0,
        fat: 3.2,
        fiber: 7.4
      },
      is_estimated: true
    },
    {
      food_name: "鸡胸肉",
      consumed_grams: 120,
      meal_type: "lunch",
      time_period: "noon",
      nutritional_info_per_100g: {
        calories: 165,
        carbohydrates: 0,
        protein: 31,
        fat: 3.6,
        fiber: 0
      },
      is_estimated: true
    }
  ]
};

// 模拟后端计算逻辑
function calculateTotalNutrition(foodData) {
  const { v4: uuidv4 } = require('uuid');
  
  if (foodData.food && Array.isArray(foodData.food)) {
    foodData.food.forEach((item) => {
      // 生成UUID
      item.log_id = uuidv4();

      // 自动计算总营养成分
      if (item.nutritional_info_per_100g && item.consumed_grams) {
        const ratio = item.consumed_grams / 100;
        item.total_nutritional_info_consumed = {};

        Object.entries(item.nutritional_info_per_100g).forEach(([key, value]) => {
          if (typeof value === 'number') {
            item.total_nutritional_info_consumed[key] = value * ratio;
          }
        });
      }
    });
  }
  
  return foodData;
}

// 执行测试
console.log('=== 测试营养计算优化 ===');
console.log('\n1. AI返回的原始数据:');
console.log(JSON.stringify(testFoodData, null, 2));

const processedData = calculateTotalNutrition(JSON.parse(JSON.stringify(testFoodData)));

console.log('\n2. 后端处理后的数据:');
console.log(JSON.stringify(processedData, null, 2));

console.log('\n3. 验证计算结果:');
processedData.food.forEach((item, index) => {
  console.log(`\n食物 ${index + 1}: ${item.food_name}`);
  console.log(`- 重量: ${item.consumed_grams}g`);
  console.log(`- 每100g卡路里: ${item.nutritional_info_per_100g.calories}`);
  console.log(`- 实际摄入卡路里: ${item.total_nutritional_info_consumed.calories.toFixed(1)}`);
  console.log(`- 计算验证: ${item.consumed_grams} * ${item.nutritional_info_per_100g.calories} / 100 = ${(item.consumed_grams * item.nutritional_info_per_100g.calories / 100).toFixed(1)}`);
  console.log(`- 计算正确: ${Math.abs(item.total_nutritional_info_consumed.calories - (item.consumed_grams * item.nutritional_info_per_100g.calories / 100)) < 0.01 ? '✅' : '❌'}`);
});

console.log('\n=== 测试完成 ===');
