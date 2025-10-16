// 测试时间解析功能
// 模拟不同的用户输入和AI解析结果

const testCases = [
  {
    userInput: "我刚刚吃了一个苹果",
    currentTime: "14:30",
    expectedTimestamp: "14:30",
    description: "用户说'刚刚'，应该使用当前时间"
  },
  {
    userInput: "我早上8点吃了全麦面包",
    currentTime: "14:30", 
    expectedTimestamp: "08:00",
    description: "用户明确说了'早上8点'"
  },
  {
    userInput: "下午3点半喝了咖啡",
    currentTime: "16:00",
    expectedTimestamp: "15:30", 
    description: "用户说'下午3点半'"
  },
  {
    userInput: "晚上7点吃晚饭",
    currentTime: "20:00",
    expectedTimestamp: "19:00",
    description: "用户说'晚上7点'"
  },
  {
    userInput: "吃了一个香蕉", // 没有时间信息
    currentTime: "10:15",
    expectedTimestamp: "10:15",
    description: "没有时间信息，使用当前时间"
  }
];

// 模拟AI解析函数（实际由AI处理）
function simulateAITimeParsing(userInput, currentTime) {
  // 这里模拟AI的时间解析逻辑
  const timePatterns = [
    { pattern: /刚刚|刚才/, useCurrentTime: true },
    { pattern: /早上(\d{1,2})点/, hour: (match) => parseInt(match[1]) },
    { pattern: /上午(\d{1,2})点/, hour: (match) => parseInt(match[1]) },
    { pattern: /下午(\d{1,2})点半/, hour: (match) => parseInt(match[1]) + 12, minute: 30 },
    { pattern: /下午(\d{1,2})点/, hour: (match) => parseInt(match[1]) + 12 },
    { pattern: /晚上(\d{1,2})点/, hour: (match) => parseInt(match[1]) + 12 },
    { pattern: /(\d{1,2}):(\d{2})/, hour: (match) => parseInt(match[1]), minute: (match) => parseInt(match[2]) }
  ];

  for (const pattern of timePatterns) {
    const match = userInput.match(pattern.pattern);
    if (match) {
      if (pattern.useCurrentTime) {
        return currentTime;
      }
      
      const hour = pattern.hour ? pattern.hour(match) : 0;
      const minute = pattern.minute ? (typeof pattern.minute === 'function' ? pattern.minute(match) : pattern.minute) : 0;
      
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }
  }
  
  // 没有匹配到时间模式，使用当前时间
  return currentTime;
}

// 执行测试
console.log('=== 时间解析功能测试 ===\n');

testCases.forEach((testCase, index) => {
  console.log(`测试 ${index + 1}: ${testCase.description}`);
  console.log(`用户输入: "${testCase.userInput}"`);
  console.log(`当前时间: ${testCase.currentTime}`);
  
  const parsedTime = simulateAITimeParsing(testCase.userInput, testCase.currentTime);
  
  console.log(`AI解析结果: ${parsedTime}`);
  console.log(`期望结果: ${testCase.expectedTimestamp}`);
  console.log(`测试结果: ${parsedTime === testCase.expectedTimestamp ? '✅ 通过' : '❌ 失败'}`);
  console.log('---\n');
});

// 模拟完整的食物记录数据
const mockFoodEntry = {
  food_name: "苹果",
  consumed_grams: 150,
  meal_type: "snack",
  time_period: "afternoon", 
  timestamp: "14:30", // AI解析的具体时间
  nutritional_info_per_100g: {
    calories: 52,
    carbohydrates: 14,
    protein: 0.3,
    fat: 0.2,
    fiber: 2.4
  },
  is_estimated: true
};

console.log('=== 完整食物记录示例 ===');
console.log(JSON.stringify(mockFoodEntry, null, 2));

console.log('\n=== 前端显示效果模拟 ===');
console.log(`${mockFoodEntry.consumed_grams}g · ${mockFoodEntry.meal_type} · ${mockFoodEntry.time_period} · ${mockFoodEntry.timestamp}`);

console.log('\n=== 血糖监测集成优势 ===');
console.log('1. 精确的进食时间记录');
console.log('2. 便于分析食物对血糖的影响时间');
console.log('3. 支持餐后血糖监测提醒');
console.log('4. 可以分析不同时间段的血糖变化模式');
