"use client"

import { Wrench, Clock, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function MaintenancePage() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  // 在维护模式下，普通用户不应该能返回首页
  // const handleGoHome = () => {
  //   router.push('/')
  // }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* 背景动画效果 - 参考主页设计 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-40 top-20 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl animate-breathing"></div>
        <div className="absolute -right-40 top-40 w-80 h-80 bg-emerald-300/25 rounded-full blur-3xl animate-bounce-slow"></div>
        <div className="absolute left-20 bottom-20 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl animate-breathing"></div>
        <div className="absolute right-32 bottom-40 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute left-1/2 top-1/3 w-56 h-56 bg-emerald-300/15 rounded-full blur-3xl transform -translate-x-1/2 animate-glow"></div>
      </div>

      <style jsx>{`
        @keyframes breathing {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.1) rotate(2deg);
            opacity: 0.15;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px) scale(1);
          }
          33% {
            transform: translateY(-10px) translateX(5px) scale(1.05);
          }
          66% {
            transform: translateY(5px) translateX(-3px) scale(0.98);
          }
        }

        @keyframes glow {
          0%, 100% {
            transform: translateX(-50%) scale(1);
            opacity: 0.15;
          }
          50% {
            transform: translateX(-50%) scale(1.2);
            opacity: 0.08;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.25;
          }
          50% {
            transform: translateY(-15px) scale(1.08);
            opacity: 0.35;
          }
        }

        .animate-breathing {
          animation: breathing 6s ease-in-out infinite;
        }

        .animate-float {
          animation: float 8s ease-in-out infinite;
        }

        .animate-glow {
          animation: glow 5s ease-in-out infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 7s ease-in-out infinite;
        }
      `}</style>

      <div className="relative z-10 container mx-auto py-6 md:py-12 px-4 md:px-6 lg:px-12 max-w-3xl">
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-full max-w-lg">
            {/* 主标题区域 - 参考主页header设计 */}
            <header className="mb-6 md:mb-8 text-center fade-in">
              <div className="flex flex-col items-center gap-4 md:gap-6">
                <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
                  <Wrench className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
                    系统维护中
                  </h1>
                  <p className="text-muted-foreground text-base md:text-lg">
                    我们正在进行系统升级，为您提供更好的服务体验
                  </p>
                </div>
              </div>
            </header>

            {/* 主要内容卡片 - 使用health-card样式 */}
            <div className="health-card mb-6 slide-up">
              <div className="p-6 md:p-8">
                <div className="space-y-6">
                  {/* 简单说明 */}
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">预计维护时间约30分钟</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      感谢您的耐心等待，我们会尽快完成维护
                    </p>
                  </div>

                  {/* 操作按钮 */}
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <Button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="w-full max-w-xs h-11 text-base bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0"
                      >
                        {isRefreshing ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            刷新中...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            刷新页面
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 底部信息 */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                SnapFit AI 健康管理系统
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
