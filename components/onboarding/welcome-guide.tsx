'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/use-i18n';
import {
  Heart,
  Share2,
  Shield,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  X
} from 'lucide-react';

const WELCOME_GUIDE_KEY = 'Snapifit-ai-welcome-guide-read';

interface WelcomeGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeGuide({ isOpen, onClose }: WelcomeGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const t = useTranslation('onboarding')

  const steps = [
    {
      icon: <Heart className="w-8 h-8 text-red-500" />,
      title: t('welcome.title'),
      content: t('welcome.content'),
      highlight: t('welcome.highlight')
    },
    {
      icon: <Share2 className="w-8 h-8 text-blue-500" />,
      title: t('sharing.title'),
      content: t('sharing.content'),
      highlight: t('sharing.highlight'),
      actionText: t('sharing.actionText'),
      actionLink: "/settings/keys"
    },
    {
      icon: <Shield className="w-8 h-8 text-green-500" />,
      title: t('private.title'),
      content: t('private.content'),
      highlight: t('private.highlight'),
      actionText: t('private.actionText'),
      actionLink: "/settings?tab=ai"
    },
    {
      icon: <RefreshCw className="w-8 h-8 text-purple-500" />,
      title: t('sync.title'),
      content: t('sync.content'),
      highlight: t('sync.highlight'),
      actionText: t('sync.actionText'),
      actionLink: "/settings?tab=data"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(WELCOME_GUIDE_KEY, 'true');
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem(WELCOME_GUIDE_KEY, 'true');
    onClose();
  };

  // 触摸手势处理
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentStep < steps.length - 1) {
      handleNext();
    }
    if (isRightSwipe && currentStep > 0) {
      handlePrevious();
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mx-1 sm:mx-4 md:mx-auto rounded-xl border-0 sm:border shadow-2xl sm:shadow-lg">
        <DialogHeader className="pb-3 sm:pb-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10 -mx-6 px-6 pt-6">
          {/* 移动端标题布局 */}
          <div className="sm:hidden">
            <div className="flex items-center justify-between mb-3">
              <DialogTitle className="text-lg font-semibold">
                {t('guide.title')}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 rounded-full hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-center">
              <Badge variant="secondary" className="text-xs px-3 py-1">
                {t('guide.step', { current: currentStep + 1, total: steps.length })}
              </Badge>
            </div>
          </div>

          {/* 桌面端标题布局 */}
          <div className="hidden sm:flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <span>{t('guide.title')}</span>
              <Badge variant="secondary" className="text-xs">
                {t('guide.stepOf', { current: currentStep + 1, total: steps.length })}
              </Badge>
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* 进度条 */}
          <div className="flex space-x-1 sm:space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 sm:h-2 flex-1 rounded-full transition-all duration-300 ${
                  index <= currentStep ? 'bg-primary shadow-sm' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* 滑动提示 - 仅移动端显示 */}
          <div className="sm:hidden">
            <div className="flex items-center justify-center gap-2 py-2 px-4 bg-muted/30 rounded-full mx-auto w-fit">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>👈</span>
                <span>{t('guide.swipeHint')}</span>
              </div>
              <div className="w-px h-3 bg-border"></div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{t('guide.swipeHintRight')}</span>
                <span>👉</span>
              </div>
            </div>
          </div>

          {/* 当前步骤内容 */}
          <Card
            className="border-2 border-primary/20 shadow-sm touch-pan-y bg-gradient-to-br from-background to-muted/20"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <CardContent className="p-5 sm:p-6">
              {/* 移动端布局 */}
              <div className="sm:hidden space-y-4 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="animate-in zoom-in-50 duration-700 delay-200 p-3 rounded-full bg-primary/10">
                    {currentStepData.icon}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold leading-tight">
                      {currentStepData.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">
                      {currentStepData.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg w-full">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">
                      {currentStepData.highlight}
                    </span>
                  </div>

                  {currentStepData.actionText && currentStepData.actionLink && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-10 text-sm"
                      onClick={() => {
                        window.open(currentStepData.actionLink, '_blank');
                      }}
                    >
                      {currentStepData.actionText}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>

              {/* 桌面端布局 */}
              <div className="hidden sm:flex items-start gap-4 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                <div className="flex-shrink-0 animate-in zoom-in-50 duration-700 delay-200">
                  {currentStepData.icon}
                </div>
                <div className="flex-1 space-y-4 animate-in fade-in-50 slide-in-from-right-4 duration-500 delay-300">
                  <div>
                    <h3 className="text-xl font-semibold mb-2 leading-tight">
                      {currentStepData.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {currentStepData.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      {currentStepData.highlight}
                    </span>
                  </div>

                  {currentStepData.actionText && currentStepData.actionLink && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-auto h-9 text-sm"
                      onClick={() => {
                        window.open(currentStepData.actionLink, '_blank');
                      }}
                    >
                      {currentStepData.actionText}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 导航按钮 */}
          <div className="pt-4">
            {/* 移动端按钮布局 */}
            <div className="sm:hidden space-y-3">
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    className="flex-1 h-12 text-sm font-medium rounded-xl border-2"
                    size="sm"
                  >
                    {t('guide.previous')}
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-primary hover:bg-primary/90 h-12 text-sm font-medium shadow-lg rounded-xl"
                  size="sm"
                >
                  {currentStep < steps.length - 1 ? t('guide.next') : t('guide.start')}
                </Button>
              </div>
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-muted-foreground text-sm h-8 px-4"
                  size="sm"
                >
                  {t('guide.skip')}
                </Button>
              </div>
            </div>

            {/* 桌面端按钮布局 */}
            <div className="hidden sm:flex justify-between items-center">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-muted-foreground text-sm h-9"
                size="sm"
              >
                {t('guide.skip')}
              </Button>

              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    className="h-9 text-sm font-medium"
                    size="sm"
                  >
                    {t('guide.previous')}
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className="bg-primary hover:bg-primary/90 h-9 text-sm font-medium shadow-sm"
                  size="sm"
                >
                  {currentStep < steps.length - 1 ? t('guide.next') : t('guide.start')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing welcome guide state
export function useWelcomeGuide() {
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // 检查是否已经阅读过引导
    const hasRead = localStorage.getItem(WELCOME_GUIDE_KEY);
    if (!hasRead) {
      // 延迟显示，确保页面加载完成
      const timer = setTimeout(() => {
        setShowGuide(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeGuide = () => {
    setShowGuide(false);
  };

  const resetGuide = () => {
    localStorage.removeItem(WELCOME_GUIDE_KEY);
    setShowGuide(true);
  };

  return {
    showGuide,
    closeGuide,
    resetGuide
  };
}
