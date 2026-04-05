"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, BellOff, Phone, Video, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

export default function CallSettingsPage() {
  const router = useRouter()
  const { user } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()

  const userRef = useMemoFirebase(() => user ? doc(firestore, "userProfiles", user.uid) : null, [firestore, user])
  const { data: profile, isLoading } = useDoc(userRef)

  const settings = {
    dndVoice: !!profile?.settings?.dndVoice,
    dndVideo: !!profile?.settings?.dndVideo
  }

  const toggleDND = async (type: 'dndVoice' | 'dndVideo') => {
    if (!firestore || !user) return
    const newStatus = !settings[type]
    
    try {
      await updateDoc(doc(firestore, "userProfiles", user.uid), {
        [`settings.${type}`]: newStatus,
        updatedAt: new Date().toISOString()
      })
      toast({
        title: "Settings Updated",
        description: `Do Not Disturb for ${type === 'dndVoice' ? 'voice' : 'video'} calls is now ${newStatus ? 'ON' : 'OFF'}.`
      })
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update settings." })
    }
  }

  return (
    <div className="flex flex-col min-h-svh bg-transparent text-gray-900">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-transparent z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-gray-900 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Call Settings</h1>
      </header>

      <main className="flex-1 px-6 pb-20 space-y-6">
        <div className="p-6 bg-zinc-900 rounded-[2.5rem] text-white shadow-xl flex items-center justify-between">
           <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Preferences</p>
              <h2 className="text-xl font-black font-headline">Communication</h2>
           </div>
           <BellOff className="w-10 h-10 text-primary opacity-20" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-6 bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2rem] flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase">Voice DND</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Reject voice calls</p>
                </div>
              </div>
              <Switch checked={settings.dndVoice} onCheckedChange={() => toggleDND('dndVoice')} />
            </div>

            <div className="p-6 bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2rem] flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase">Video DND</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Reject video calls</p>
                </div>
              </div>
              <Switch checked={settings.dndVideo} onCheckedChange={() => toggleDND('dndVideo')} />
            </div>
          </div>
        )}

        <div className="bg-white/20 p-6 rounded-[2rem] border border-white/30 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase leading-relaxed">
            When Do Not Disturb is enabled, incoming calls will be automatically rejected and you will not be notified.
          </p>
        </div>
      </main>
    </div>
  )
}
