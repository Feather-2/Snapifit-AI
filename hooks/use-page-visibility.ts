import { useState, useEffect, useCallback } from 'react'

/**
 * 页面可见性状态
 */
export type PageVisibilityState = 'visible' | 'hidden' | 'prerender'

/**
 * 标签页冻结管理器
 * 用于管理后台标签页的资源使用，防止不必要的网络请求和计算
 */
class TabFreezeManager {
  private static instance: TabFreezeManager
  private isVisible: boolean = true
  private listeners: Set<(isVisible: boolean) => void> = new Set()
  private frozenTimers: Map<number | NodeJS.Timeout, () => void> = new Map()
  private frozenIntervals: Map<number | NodeJS.Timeout, () => void> = new Map()

  constructor() {
    if (typeof window !== 'undefined') {
      this.isVisible = !document.hidden
      this.setupVisibilityListener()
    }
  }

  static getInstance(): TabFreezeManager {
    if (!TabFreezeManager.instance) {
      TabFreezeManager.instance = new TabFreezeManager()
    }
    return TabFreezeManager.instance
  }

  private setupVisibilityListener() {
    const handleVisibilityChange = () => {
      const wasVisible = this.isVisible
      this.isVisible = !document.hidden
      
      console.log(`[TabFreeze] Page visibility changed: ${wasVisible ? 'visible' : 'hidden'} -> ${this.isVisible ? 'visible' : 'hidden'}`)
      
      if (wasVisible !== this.isVisible) {
        this.notifyListeners()
        
        if (this.isVisible) {
          this.resumeFrozenTimers()
        } else {
          this.freezeActiveTimers()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // 也监听窗口焦点变化作为备用
    window.addEventListener('focus', () => {
      if (!this.isVisible && !document.hidden) {
        this.isVisible = true
        this.notifyListeners()
        this.resumeFrozenTimers()
      }
    })
    
    window.addEventListener('blur', () => {
      if (this.isVisible && document.hidden) {
        this.isVisible = false
        this.notifyListeners()
        this.freezeActiveTimers()
      }
    })
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.isVisible)
      } catch (error) {
        console.error('[TabFreeze] Error in visibility listener:', error)
      }
    })
  }

  private freezeActiveTimers() {
    // 这里可以扩展来冻结特定的定时器
    console.log('[TabFreeze] Freezing background timers')
  }

  private resumeFrozenTimers() {
    // 恢复被冻结的定时器
    console.log('[TabFreeze] Resuming frozen timers')
    this.frozenTimers.forEach((resume, timerId) => {
      try {
        resume()
      } catch (error) {
        console.error('[TabFreeze] Error resuming timer:', error)
      }
    })
    this.frozenTimers.clear()

    this.frozenIntervals.forEach((resume, intervalId) => {
      try {
        resume()
      } catch (error) {
        console.error('[TabFreeze] Error resuming interval:', error)
      }
    })
    this.frozenIntervals.clear()
  }

  /**
   * 订阅页面可见性变化
   */
  subscribe(listener: (isVisible: boolean) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * 获取当前页面可见性状态
   */
  getVisibility(): boolean {
    return this.isVisible
  }

  /**
   * 创建一个智能定时器，在页面不可见时自动暂停
   */
  createSmartTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    if (!this.isVisible) {
      // 如果页面当前不可见，延迟执行
      const resumeCallback = () => {
        const timerId = setTimeout(callback, delay)
        return timerId
      }
      const dummyId = setTimeout(() => {}, 0) // 创建一个占位ID
      this.frozenTimers.set(dummyId, resumeCallback)
      return dummyId
    }

    return setTimeout(callback, delay)
  }

  /**
   * 创建一个智能间隔定时器，在页面不可见时自动暂停
   */
  createSmartInterval(callback: () => void, delay: number): NodeJS.Timeout {
    if (!this.isVisible) {
      // 如果页面当前不可见，延迟创建
      const resumeCallback = () => {
        const intervalId = setInterval(() => {
          if (this.isVisible) {
            callback()
          }
        }, delay)
        return intervalId
      }
      const dummyId = setInterval(() => {}, delay) // 创建一个占位ID但立即清除
      clearInterval(dummyId)
      this.frozenIntervals.set(dummyId, resumeCallback)
      return dummyId
    }

    return setInterval(() => {
      if (this.isVisible) {
        callback()
      }
    }, delay)
  }

  /**
   * 清除智能定时器
   */
  clearSmartTimeout(timerId: NodeJS.Timeout) {
    if (this.frozenTimers.has(timerId)) {
      this.frozenTimers.delete(timerId)
    } else {
      clearTimeout(timerId)
    }
  }

  /**
   * 清除智能间隔定时器
   */
  clearSmartInterval(intervalId: NodeJS.Timeout) {
    if (this.frozenIntervals.has(intervalId)) {
      this.frozenIntervals.delete(intervalId)
    } else {
      clearInterval(intervalId)
    }
  }
}

/**
 * 页面可见性 Hook
 * 提供页面可见性状态和智能定时器功能
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return true
    return TabFreezeManager.getInstance().getVisibility()
  })

  useEffect(() => {
    const manager = TabFreezeManager.getInstance()
    const unsubscribe = manager.subscribe(setIsVisible)
    return unsubscribe
  }, [])

  const createSmartTimeout = useCallback((callback: () => void, delay: number) => {
    return TabFreezeManager.getInstance().createSmartTimeout(callback, delay)
  }, [])

  const createSmartInterval = useCallback((callback: () => void, delay: number) => {
    return TabFreezeManager.getInstance().createSmartInterval(callback, delay)
  }, [])

  const clearSmartTimeout = useCallback((timerId: NodeJS.Timeout) => {
    TabFreezeManager.getInstance().clearSmartTimeout(timerId)
  }, [])

  const clearSmartInterval = useCallback((intervalId: NodeJS.Timeout) => {
    TabFreezeManager.getInstance().clearSmartInterval(intervalId)
  }, [])

  return {
    isVisible,
    createSmartTimeout,
    createSmartInterval,
    clearSmartTimeout,
    clearSmartInterval
  }
}

// 导出单例管理器供其他模块使用
export const tabFreezeManager = TabFreezeManager.getInstance()
