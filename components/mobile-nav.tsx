"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Menu, X, Home, MessageSquare, Settings, MoreHorizontal, LogIn, LogOut, User, Dumbbell } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { useTranslation } from "@/hooks/use-i18n"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { GitHubStar } from "@/components/github-star"
import { UserAvatar } from "@/components/user/user-avatar"
import { TrustLevelBadge } from "@/components/user/user-badge"
import { UsageProgress } from "@/components/usage/usage-indicator"
import type { Locale } from "@/i18n"

interface MobileNavProps {
  locale: Locale
}

export function MobileNav({ locale }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const t = useTranslation('navigation')

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
    setOpen(false)
  }

  const handleSignIn = () => {
    window.location.href = `/${locale}/signin`
  }

  const navItems = [
    {
      name: t('home'),
      href: `/${locale}`,
      icon: Home,
    },
    {
      name: t('chat'),
      href: `/${locale}/chat`,
      icon: MessageSquare,
    },
    {
      name: t('exercise'),
      href: `/${locale}/exercise`,
      icon: Dumbbell,
    },
    {
      name: t('settings'),
      href: `/${locale}/settings`,
      icon: Settings,
    },
  ]

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 px-0"
          >
            <Menu className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center space-x-2">
              <img
                src="/snapifit-pure.svg"
                alt="Snapifit AI Logo"
                className="h-8 w-auto select-none"
                style={{
                  filter:
                    "invert(45%) sepia(93%) saturate(690%) hue-rotate(108deg) brightness(92%) contrast(90%)",
                }}
              />
              <span className="font-semibold text-lg text-emerald-600 dark:text-emerald-400">Snapifit AI</span>
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-full pt-0">
            {/* User Info Section */}
            {session?.user ? (
              <div className="py-4 border-b">
                <div className="flex items-center space-x-3 px-4">
                  <UserAvatar
                    user={{
                      username: session.user.name || 'User',
                      displayName: session.user.displayName || session.user.name || 'User',
                      avatarUrl: session.user.image || '',
                      trustLevel: session.user.trustLevel
                    }}
                    size="lg"
                    showTrustLevel={true}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {session.user.displayName || session.user.name}
                    </div>
                    {session.user.displayName && session.user.name && session.user.displayName !== session.user.name && (
                      <div className="text-xs text-muted-foreground truncate">
                        @{session.user.name}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground truncate">
                      {session.user.email}
                    </div>
                  </div>
                </div>

                {/* Trust Level and Usage */}
                <div className="px-4 mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <TrustLevelBadge
                      trustLevel={session.user.trustLevel}
                      showLabel={true}
                      size="sm"
                    />
                  </div>

                  <UsageProgress showRefresh={false} />
                </div>
              </div>
            ) : (
              <div className="py-4 border-b">
                <div className="px-4">
                  <Button onClick={handleSignIn} className="w-full">
                    <LogIn className="mr-2 h-4 w-4" />
                    {t('userMenu.signIn')}
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <nav className="flex-1 py-2 overflow-y-auto">
              <div className="space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                ))}
              </div>
            </nav>

            {/* Footer Actions */}
            <div className="border-t pt-4 pb-4 space-y-4">
              {/* User Actions */}
              {session?.user && (
                <div className="px-4">
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    className="w-full"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('userMenu.signOut')}
                  </Button>
                </div>
              )}

              <Separator />

              {/* Settings */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t('theme')}</span>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t('language')}</span>
                <LanguageSwitcher />
              </div>
              <div className="pt-2">
                <GitHubStar repo="Feather-2/Snapifit-AI" className="w-full" />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
