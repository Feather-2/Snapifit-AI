"use client"

import React from "react"
import { useTranslation } from "@/hooks/use-i18n"
import type { ExpertRole } from "@/types/chat"

interface WelcomeScreenProps {
  currentExpert: ExpertRole
  selectedExpert: string
  checkAIConfig: () => boolean
  isMobile: boolean
}

export function WelcomeScreen({ currentExpert, selectedExpert, checkAIConfig, isMobile }: WelcomeScreenProps) {
  const t = useTranslation('chat')
  const tChatExperts = useTranslation('chat.experts')

  return (
    <div className={`${isMobile ? 'py-3 px-1' : 'py-8 px-4'} max-w-2xl mx-auto`}>
      {/* 专家头像和标题 */}
      <div className={`text-center ${isMobile ? 'mb-4' : 'mb-6'}`}>
        <div className={`inline-flex items-center justify-center rounded-full ${currentExpert.color} text-white ${isMobile ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-4'}`}>
          <currentExpert.icon className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`} />
        </div>
        <h1 className={`font-bold text-slate-900 dark:text-slate-100 ${isMobile ? 'text-base mb-1.5' : 'text-xl mb-2'}`}>
          {tChatExperts(`${selectedExpert}.welcomeMessage.title`) || t('welcomeMessage')}
        </h1>
        <p className={`text-muted-foreground leading-relaxed ${isMobile ? 'text-xs' : 'text-base'}`}>
          {tChatExperts(`${selectedExpert}.welcomeMessage.subtitle`) || t('welcomeDescription')}
        </p>
      </div>

      {/* 专家特色功能 */}
      {tChatExperts(`${selectedExpert}.welcomeMessage.features.0`) && (
        <div className={isMobile ? 'mb-4' : 'mb-6'}>
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-1.5' : 'grid-cols-2 gap-3'}`}>
            {[0, 1, 2, 3].map((index) => {
              const feature = tChatExperts(`${selectedExpert}.welcomeMessage.features.${index}`)
              if (!feature) return null
              return (
                <div
                  key={index}
                  className={`flex items-center text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg ${isMobile ? 'text-xs p-2' : 'text-base p-3'}`}
                >
                  <span className={`flex-shrink-0 ${isMobile ? 'mr-2' : 'mr-3'}`}>{feature.split(' ')[0]}</span>
                  <span className="flex-1">{feature.split(' ').slice(1).join(' ')}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 开始对话提示 */}
      <div className="text-center">
        <p className={`text-muted-foreground ${isMobile ? 'text-xs mb-2' : 'text-sm mb-3'}`}>
          {t('startConversation', { expert: tChatExperts(`${selectedExpert}.name`) || currentExpert.name })}
        </p>
        {!checkAIConfig() && (
          <p className={`text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 rounded-lg ${isMobile ? 'text-xs p-2' : 'text-sm p-3'}`}>
            {t('configureAIPrompt')}
          </p>
        )}
      </div>
    </div>
  )
}