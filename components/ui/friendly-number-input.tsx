'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FriendlyNumberInputProps {
  value: number | string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  defaultValue?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowEmpty?: boolean; // 是否允许临时为空
}

/**
 * 友好的数字输入组件
 * 特点：
 * 1. 允许用户删除内容而不立即应用最小值限制
 * 2. 在失去焦点时才应用范围限制和默认值
 * 3. 提供更好的用户体验
 */
export function FriendlyNumberInput({
  value,
  onChange,
  min,
  max,
  defaultValue,
  placeholder,
  className,
  disabled = false,
  allowEmpty = true
}: FriendlyNumberInputProps) {
  const [internalValue, setInternalValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  // 同步外部值到内部状态
  useEffect(() => {
    if (!isFocused) {
      setInternalValue(value === '' ? '' : String(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // 允许空值（用户正在删除）
    if (inputValue === '') {
      setInternalValue('');
      if (allowEmpty) {
        return; // 不立即触发onChange
      } else {
        onChange(defaultValue || min || 0);
        return;
      }
    }

    // 检查是否为有效数字
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) {
      return; // 忽略无效输入
    }

    setInternalValue(inputValue);
    
    // 如果不允许空值，立即应用范围限制
    if (!allowEmpty) {
      const clampedValue = clampValue(numValue);
      onChange(clampedValue);
    } else {
      // 允许空值时，直接传递原始数值（不应用范围限制）
      onChange(numValue);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // 在失去焦点时应用范围限制和默认值
    if (internalValue === '' || isNaN(parseFloat(internalValue))) {
      const finalValue = defaultValue || min || 0;
      setInternalValue(String(finalValue));
      onChange(finalValue);
    } else {
      const numValue = parseFloat(internalValue);
      const clampedValue = clampValue(numValue);
      setInternalValue(String(clampedValue));
      onChange(clampedValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const clampValue = (value: number): number => {
    let result = value;
    if (min !== undefined) result = Math.max(result, min);
    if (max !== undefined) result = Math.min(result, max);
    return result;
  };

  return (
    <Input
      type="number"
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      min={min}
      max={max}
      className={cn(className)}
      disabled={disabled}
    />
  );
}

// 使用示例
export function FriendlyNumberInputExample() {
  const [dailyLimit, setDailyLimit] = useState<number>(150);

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">友好数字输入示例</h3>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">每日限制 (150-99999)</label>
        <FriendlyNumberInput
          value={dailyLimit}
          onChange={setDailyLimit}
          min={150}
          max={99999}
          defaultValue={150}
          placeholder="150-99999"
          allowEmpty={true}
        />
        <p className="text-xs text-gray-500">
          当前值: {dailyLimit} | 支持用户数: {Math.floor(dailyLimit / 150)}
        </p>
      </div>
    </div>
  );
}
