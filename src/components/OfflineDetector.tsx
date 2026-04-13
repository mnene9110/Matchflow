
"use client"

import { useState, useEffect } from "react"
import { WifiOff, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function OfflineDetector({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    setIsOffline(!navigator.onLine)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (isOffline) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#3BC1A8] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/30 animate-float">
          <WifiOff className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-black font-headline text-white mb-3 uppercase tracking-tighter">Connection Lost</h1>
        <p className="text-white/70 text-sm font-medium leading-relaxed max-w-[240px] mb-10">
          Please check your internet connection to continue using MatchFlow.
        </p>
        <Button 
          onClick={() => window.location.reload()} 
          className="h-16 w-full max-w-xs rounded-full bg-white text-[#3BC1A8] hover:bg-white/90 font-black text-lg gap-3 shadow-2xl active:scale-95 transition-all"
        >
          <RotateCcw className="w-5 h-5" />
          Reload App
        </Button>
      </div>
    )
  }

  return <>{children}</>
}
