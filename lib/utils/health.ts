import type { UserProfile } from './types';

// 活动水平对应的TDEE乘数
const activityMultipliers: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * 使用 Katch-McArdle 公式计算基础代谢率 (BMR)
 * @param leanBodyMassKg 去脂体重 (kg)
 * @returns BMR (kcal/天)
 */
export function calculateKatchMcArdleBMR(leanBodyMassKg: number): number {
  if (leanBodyMassKg <= 0) {
    return 0; // 或者抛出错误，取决于如何处理无效输入
  }
  return 370 + (21.6 * leanBodyMassKg);
}

/**
 * 使用 Mifflin-St Jeor 公式计算基础代谢率 (BMR)
 * @param weightKg 体重 (kg)
 * @param heightCm 身高 (cm)
 * @param ageYears 年龄 (岁)
 * @param gender 性别 ('male' | 'female' | 'other')
 * @returns BMR (kcal/天)
 */
export function calculateMifflinStJeorBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  gender: 'male' | 'female' | 'other'
): number {
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  } else if (gender === 'female') {
    return 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  } else {
    // 对于 'other' 性别，取男性和女性BMR的平均值
    const maleBMR = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
    const femaleBMR = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
    return (maleBMR + femaleBMR) / 2;
  }
}

/**
 * 使用修正版 Harris-Benedict 公式计算基础代谢率 (BMR)
 * @param weightKg 体重 (kg)
 * @param heightCm 身高 (cm)
 * @param ageYears 年龄 (岁)
 * @param gender 性别 ('male' | 'female' | 'other')
 * @returns BMR (kcal/天)
 */
export function calculateHarrisBenedictBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  gender: 'male' | 'female' | 'other'
): number {
  if (gender === 'male') {
    return 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageYears + 88.362;
  } else if (gender === 'female') {
    return 9.247 * weightKg + 3.098 * heightCm - 4.33 * ageYears + 447.593;
  } else {
    // 对于 'other' 性别，取男性和女性BMR的平均值
    const maleBMR = 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageYears + 88.362;
    const femaleBMR = 9.247 * weightKg + 3.098 * heightCm - 4.33 * ageYears + 447.593;
    return (maleBMR + femaleBMR) / 2;
  }
}

/**
 * 计算每日总能量消耗 (TDEE)
 * @param bmr 基础代谢率 (kcal/天)
 * @param activityLevel 活动水平 (来自 UserProfile.activityLevel)
 * @param additionalTEF 额外的食物热效应 (kcal/天) - 可选
 * @returns TDEE (kcal/天)
 */
export function calculateTDEE(bmr: number, activityLevel: string, additionalTEF?: number): number {
  const multiplier = activityMultipliers[activityLevel] || 1.55; // 默认为中等活动水平 (moderate)
  const baseTDEE = bmr * multiplier;

  // 如果提供了额外的TEF，则添加到TDEE中
  // 注意：传统的活动乘数已经包含了平均TEF，这里的additionalTEF是额外增强的部分
  return additionalTEF ? baseTDEE + additionalTEF : baseTDEE;
}

/**
 * 根据用户配置和当日数据计算BMR和TDEE
 * @param userProfile 用户配置信息
 * @param currentDayData 包含当日可选的体重、活动水平和TEF的对象
 * @returns 包含 bmr、tdee 和 tefEnhancement 的对象，如果无法计算则为 undefined
 */
export function calculateMetabolicRates(
  userProfile: UserProfile,
  currentDayData: {
    weight?: number; // 当日体重 (kg)
    activityLevel?: string; // 当日活动水平
    additionalTEF?: number; // 额外的TEF增强 (kcal)
  }
): { bmr: number; tdee: number; tefEnhancement?: number } | undefined {
  const weightToUse = currentDayData.weight && currentDayData.weight > 0
    ? currentDayData.weight
    : userProfile.weight;

  let activityLevelForTDEE: string | undefined = undefined;
  if (currentDayData.activityLevel && activityMultipliers.hasOwnProperty(currentDayData.activityLevel)) {
    activityLevelForTDEE = currentDayData.activityLevel;
  } else if (userProfile.activityLevel && activityMultipliers.hasOwnProperty(userProfile.activityLevel)) {
    activityLevelForTDEE = userProfile.activityLevel;
    if (currentDayData.activityLevel && currentDayData.activityLevel !== userProfile.activityLevel) {
        console.warn(`calculateMetabolicRates: Daily activity level '${currentDayData.activityLevel}' was invalid or different from profile. Using profile's: '${userProfile.activityLevel}'.`);
    }
  } else {
    // If no valid activity level from daily log or profile, try to use profile one as a last resort if it exists, even if it wasn't in activityMultipliers (though this case should be rare if profile settings are validated)
    activityLevelForTDEE = userProfile.activityLevel;
  }

  if (!weightToUse || !activityLevelForTDEE || !activityMultipliers.hasOwnProperty(activityLevelForTDEE)) {
    console.warn(
      "calculateMetabolicRates: Missing valid weightToUse or activityLevelForTDEE. Cannot calculate BMR/TDEE.",
      { weightToUse, profileActivityLevel: userProfile.activityLevel, dailyActivityLevel: currentDayData.activityLevel, finalActivityLevelForTDEE: activityLevelForTDEE }
    );
    return undefined;
  }

  console.log(`calculateMetabolicRates: Using weight: ${weightToUse}kg, activity level for TDEE: ${activityLevelForTDEE}`);

  let bmr: number | undefined = undefined;

  // 尝试基于去脂体重计算 BMR
  if (userProfile.bmrCalculationBasis === 'leanBodyMass') {
    if (userProfile.bodyFatPercentage && userProfile.bodyFatPercentage > 0 && userProfile.bodyFatPercentage < 100) {
      const leanBodyMassKg = weightToUse * (1 - (userProfile.bodyFatPercentage / 100));
      if (leanBodyMassKg > 0) {
        bmr = calculateKatchMcArdleBMR(leanBodyMassKg);
        // console.log(`Calculated BMR using Katch-McArdle: ${bmr} (LBM: ${leanBodyMassKg}kg)`);
        if (bmr <= 0) {
          console.warn("calculateMetabolicRates: Katch-McArdle BMR is not positive. Will attempt fallback.");
          bmr = undefined;
        }
      } else {
        console.warn("calculateMetabolicRates: Calculated Lean Body Mass is not positive. Will attempt fallback to total weight calculation.");
      }
    } else {
      console.warn("calculateMetabolicRates: bmrCalculationBasis is 'leanBodyMass' but bodyFatPercentage is invalid or missing. Will attempt fallback to total weight calculation.");
    }
  }

  // 如果未使用去脂体重计算，或计算失败，则回退到基于总体重的计算
  if (bmr === undefined) {
    if (!userProfile.height || !userProfile.age || !userProfile.gender) {
      console.warn("calculateMetabolicRates: Missing height, age, or gender for total weight BMR calculation.");
      return undefined;
    }
    const validGenders = ['male', 'female', 'other'];
    const gender = userProfile.gender as 'male' | 'female' | 'other';
    if (!validGenders.includes(gender)) {
        console.warn(`Invalid gender: ${userProfile.gender}. Cannot calculate BMR.`);
        return undefined;
    }
    const formula = (userProfile.bmrFormula && ['mifflin-st-jeor', 'harris-benedict'].includes(userProfile.bmrFormula))
                    ? userProfile.bmrFormula
                    : 'mifflin-st-jeor';
    // console.log(`Calculating BMR using ${formula} with total weight ${weightToUse}kg.`);
    if (formula === 'mifflin-st-jeor') {
      bmr = calculateMifflinStJeorBMR(weightToUse, userProfile.height, userProfile.age, gender);
    } else {
      bmr = calculateHarrisBenedictBMR(weightToUse, userProfile.height, userProfile.age, gender);
    }
  }

  if (bmr === undefined || bmr <= 0) {
      console.warn(`Final calculated BMR is not positive or undefined: ${bmr}. Cannot calculate TDEE.`);
      return undefined;
  }

  const tdee = calculateTDEE(bmr, activityLevelForTDEE, currentDayData.additionalTEF);

  return {
    bmr: parseFloat(bmr.toFixed(0)),
    tdee: parseFloat(tdee.toFixed(0)),
    tefEnhancement: currentDayData.additionalTEF ? parseFloat(currentDayData.additionalTEF.toFixed(1)) : undefined,
  };
}