"use client"

import type React from "react"

import { use, useMemo, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Dumbbell, CalendarDays } from "lucide-react"
import { useTranslation } from "@/hooks/use-i18n"
import { ExerciseQuickLog } from "@/components/exercise/exercise-quick-log"
import { ExerciseLibrary } from "@/components/exercise/exercise-library"
import { ExerciseAIParse } from "@/components/exercise/exercise-ai-parse"
import { WorkoutLivePanel } from "@/components/exercise/workout-live-panel"
import { WorkoutPlanEditor } from "@/components/exercise/workout-plan-editor"
import type { ExerciseDef } from "@/lib/exercise-data"
import { useIsMobile } from "@/hooks/use-mobile"
import { format } from "date-fns"
import { zhCN, enUS } from "date-fns/locale"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"

export default function ExercisePage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslation('exercisePage')
  const resolved = use(params)
  const isMobile = useIsMobile()
  const currentLocale = resolved.locale === 'en' ? enUS : zhCN

  const [activeTab, setActiveTab] = useState<'plan' | 'live' | 'library'>('plan')
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDef | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [recent, setRecent] = useState<ExerciseDef[]>([])
  const [previewEntries, setPreviewEntries] = useState<any[]>([])

  const header = useMemo(() => (
    <div className="relative rounded-2xl border overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
      <div className="relative p-5 md:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-sm md:text-base text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>{format(new Date(), "PPP (eeee)", { locale: currentLocale })}</span>
        </div>
      </div>
    </div>
  ), [t, currentLocale])

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <div className="container mx-auto py-6 md:py-10 px-4 md:px-6 lg:px-12 max-w-7xl">
        {header}

        <div className="mt-6 md:mt-10">
          {recent.length > 0 && (
            <div className="mb-4 overflow-x-auto">
              <div className="flex gap-2">
                {recent.map((ex) => (
                  <button
                    key={ex.id}
                    className="px-3 py-1.5 rounded-full bg-muted text-sm whitespace-nowrap"
                    onClick={() => { setSelectedExercise(ex); setDrawerOpen(true) }}
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3 h-12 md:h-14 rounded-xl bg-muted/50 p-1">
              <TabsTrigger value="plan" className="text-sm md:text-base rounded-lg data-[state=active]:bg-background data-[state=active]:shadow">
                {t('tabs.plan')}
              </TabsTrigger>
              <TabsTrigger value="live" className="text-sm md:text-base rounded-lg data-[state=active]:bg-background data-[state=active]:shadow">
                {t('tabs.live')}
              </TabsTrigger>
              <TabsTrigger value="library" className="text-sm md:text-base rounded-lg data-[state=active]:bg-background data-[state=active]:shadow">
                {t('tabs.library')}
              </TabsTrigger>
            </TabsList>

            <div className="mt-6 grid grid-cols-1 gap-6 md:gap-10">
              <TabsContent value="plan" className="m-0 p-0">
                <Card className="p-4 md:p-6">
                  <WorkoutPlanEditor onStart={() => setActiveTab('live')} />
                </Card>
              </TabsContent>

              <TabsContent value="live" className="m-0 p-0">
                {isMobile ? (
                  <Card className="p-4 md:p-6">
                    <Button className="w-full h-12" onClick={() => setDrawerOpen(true)}>
                      {t('tabs.live')}
                    </Button>
                    <div className="mt-4">
                      <ExerciseAIParse locale={resolved.locale} onParsed={(items) => setPreviewEntries(items)} />
                    </div>
                    <div className="mt-4">
                      <WorkoutLivePanel
                        locale={resolved.locale}
                        previewEntries={previewEntries}
                        onClearPreview={() => setPreviewEntries([])}
                        onSaved={() => setPreviewEntries([])}
                      />
                    </div>
                  </Card>
                ) : (
                  <div className="grid grid-cols-12 gap-6">
                    <Card className="col-span-12 lg:col-span-5 xl:col-span-4 p-4 md:p-6 lg:sticky lg:top-24 self-start">
                      <WorkoutLivePanel
                        locale={resolved.locale}
                        previewEntries={previewEntries}
                        onClearPreview={() => setPreviewEntries([])}
                        onSaved={() => setPreviewEntries([])}
                      />
                    </Card>
                    <div className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-4">
                      <Card className="p-4 md:p-6">
                        <ExerciseQuickLog
                          locale={resolved.locale}
                          preselected={selectedExercise || undefined}
                          onSaved={() => {}}
                        />
                      </Card>
                      <Card className="p-3 md:p-4">
                        <Collapsible>
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm md:text-base font-medium">AI 解析</h3>
                            <CollapsibleTrigger asChild>
                              <Button variant="secondary" size="sm">展开 / 收起</Button>
                            </CollapsibleTrigger>
                          </div>
                          <Separator className="my-3" />
                          <CollapsibleContent className="mt-2 space-y-3">
                            <div className="text-xs md:text-sm text-muted-foreground">
                              · 力量预设：如“卧推 4x8@60kg 休90s”  · 有氧预设：如“跑步 30min 5km”
                            </div>
                            <ExerciseAIParse locale={resolved.locale} onParsed={(items) => setPreviewEntries(items)} />
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="library" className="m-0 p-0">
                <Card className="p-4 md:p-6">
                  <ExerciseLibrary
                    onSelect={(ex: ExerciseDef) => {
                      setSelectedExercise(ex)
                      if (isMobile) {
                        setDrawerOpen(true)
                      } else {
                        setActiveTab('live')
                      }
                    }}
                  />
                </Card>
              </TabsContent>

              {/* 取消旧的桌面端并排重复区域，改为在 Live 内部完成两栏布局 */}
            </div>
          </Tabs>
        </div>
      </div>
      {/* Drawer for mobile quick log */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <DrawerTitle>{selectedExercise?.name || t('tabs.live')}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <ExerciseQuickLog
              locale={resolved.locale}
              preselected={selectedExercise || undefined}
              onSaved={() => {
                if (selectedExercise) {
                  setRecent((prev) => [selectedExercise!, ...prev.filter(p => p.id !== selectedExercise!.id)].slice(0, 8))
                }
              }}
            />
            <div className="mt-4">
              <ExerciseAIParse locale={resolved.locale} onParsed={(items) => setPreviewEntries(items)} />
            </div>
            <div className="mt-4">
              <WorkoutLivePanel
                locale={resolved.locale}
                previewEntries={previewEntries}
                onClearPreview={() => setPreviewEntries([])}
                onSaved={() => setPreviewEntries([])}
              />
            </div>
          </div>
          <DrawerFooter />
        </DrawerContent>
      </Drawer>
    </div>
  )
}


