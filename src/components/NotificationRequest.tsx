"use client"

import { useState, useEffect } from "react"
import { Bell, X, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseUser } from "@/hooks/use-supabase"

export function NotificationRequest() {
  const { user } = useSupabaseUser()
  const [showPrompt, setShowPrompt] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Notifications aren't useful if not logged in
    if (!user) return

    const checkPermission = async () => {
      if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification")
        return
      }

      setIsSupported(true)

      // Check if permission is already granted or denied
      if (Notification.permission === "default") {
        // Check if we already asked in this session
        const isDismissed = sessionStorage.getItem('notification_prompt_dismissed')
        if (!isDismissed) {
          // Add a small delay for better UX
          const timer = setTimeout(() => setShowPrompt(true), 3000)
          return () => clearTimeout(timer)
        }
      }
    }

    checkPermission()
  }, [user])

  const requestPermission = async () => {
    if (!isSupported) return

    try {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        console.log("Notification permission granted.")
        
        const title = "MatchFlow";
        const options = {
          body: "Notifications enabled! You'll now receive alerts for new messages.",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
        };

        // Use service worker to show the notification to avoid "Illegal constructor" error
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, options);
          } catch (swError) {
            console.warn("ServiceWorker showNotification failed, attempting fallback:", swError);
            // Fallback for environments where SW is registered but showNotification isn't supported/ready
            try {
              new Notification(title, options);
            } catch (e) {
              console.error("Standard Notification constructor failed:", e);
            }
          }
        } else {
          // Fallback for non-SW environments
          try {
            new Notification(title, options);
          } catch (e) {
            console.error("Standard Notification constructor failed:", e);
          }
        }
      }
    } catch (error) {
      console.error("Error requesting notification permission", error)
    } finally {
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    sessionStorage.setItem('notification_prompt_dismissed', 'true')
  }

  if (!showPrompt || !user) return null

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[100] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-white rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-gray-100 flex items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
        
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
          <Bell className="w-6 h-6 text-blue-500" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-gray-900 leading-tight">Stay Connected</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-0.5">Enable alerts for new messages</p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={requestPermission}
            className="h-10 px-4 rounded-full bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all gap-2"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Enable
          </Button>
          <button 
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 hover:text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
