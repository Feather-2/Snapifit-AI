"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown } from "lucide-react"
import { expertRoles } from "@/constants/expert-roles"
import { useTranslation } from "@/hooks/use-i18n"
import type { ExpertRole, ExpertDisplayInfo } from "@/types/chat"

interface ExpertSelectorProps {
  selectedExpert: string
  onExpertSelect: (expertId: string) => void
  isMobile: boolean
  showExpertDropdown?: boolean
  setShowExpertDropdown?: (show: boolean) => void
}

export function ExpertSelector({
  selectedExpert,
  onExpertSelect,
  isMobile,
  showExpertDropdown = false,
  setShowExpertDropdown,
}: ExpertSelectorProps) {
  const t = useTranslation('chat')
  const tChatExperts = useTranslation('chat.experts')

  const currentExpert = expertRoles.find(expert => expert.id === selectedExpert) || expertRoles[0]

  const getExpertDisplayInfo = (expert: ExpertRole): ExpertDisplayInfo => ({
    name: tChatExperts(`${expert.id}.name`) || expert.name,
    title: tChatExperts(`${expert.id}.title`) || expert.title,
    description: tChatExperts(`${expert.id}.description`) || expert.description
  })

  const handleExpertSelect = (expertId: string) => {
    onExpertSelect(expertId)
    if (setShowExpertDropdown) {
      setShowExpertDropdown(false)
    }
  }

  if (isMobile) {
    return (
      <div className="mb-3">
        <div className="relative expert-dropdown">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowExpertDropdown && setShowExpertDropdown(!showExpertDropdown)
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="w-full flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
          >
            <div className="flex items-center space-x-2.5">
              <div className={`p-1.5 rounded-lg ${currentExpert.color} text-white`}>
                <currentExpert.icon className="h-4 w-4" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <p className="font-medium text-sm truncate">{getExpertDisplayInfo(currentExpert).name}</p>
                  <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 flex-shrink-0">
                    AI
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{getExpertDisplayInfo(currentExpert).title}</p>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${showExpertDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showExpertDropdown && (
            <div
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-[100] max-h-72 overflow-y-auto"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                zIndex: 100
              }}
            >
              {expertRoles.map((expert) => {
                const IconComponent = expert.icon
                const isSelected = selectedExpert === expert.id
                const expertInfo = getExpertDisplayInfo(expert)
                return (
                  <button
                    key={expert.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleExpertSelect(expert.id)
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    className={`w-full text-left p-2.5 border-b border-slate-100 dark:border-slate-700 last:border-b-0 transition-colors ${
                      isSelected
                        ? 'bg-primary/5 text-primary'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5">
                      <div className={`p-1.5 rounded-lg ${expert.color} text-white flex-shrink-0`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{expertInfo.name}</h3>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">
                          {expertInfo.title}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 桌面端版本
  return (
    <Card className="w-80 flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{t('title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {expertRoles.map((expert) => {
            const IconComponent = expert.icon
            const isSelected = selectedExpert === expert.id
            const expertInfo = getExpertDisplayInfo(expert)
            return (
              <button
                key={expert.id}
                onClick={() => handleExpertSelect(expert.id)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${expert.color} text-white flex-shrink-0`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{expertInfo.name}</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      {expertInfo.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {expertInfo.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}