"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft, MessageSquare, Video, Phone, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ChargeSettingsPage() {
  const router = useRouter()

  const charges = [
    { label: "Text Message", cost: "15", icon: MessageSquare, description: "Per text sent" },
    { label: "Video Call", cost: "160", icon: Video, description: "Per minute of connection" },
    { label: "Voice Call", cost: "80", icon: Phone, description: "Per minute of connection" },
  ]

  return (
    <div className="flex flex-col min-h-svh bg-white text-gray-900">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-[#3BC1A8] z-10 shadow-lg text-white">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm hover:bg-white/30"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Charge Settings</h1>
      </header>

      <main className="flex-1 px-6 pb-20 space-y-6 pt-8">
        <div className="p-6 bg-zinc-900 rounded-[2.5rem] text-white shadow-xl flex items-center justify-between">
           <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Standard Rates</p>
              <h2 className="text-xl font-black font-headline">Platform Pricing</h2>
           </div>
           <Coins className="w-10 h-10 text-amber-500 opacity-20" />
        </div>

        <div className="space-y-3">
          {charges.map((item, idx) => (
            <div key={idx} className="p-6 bg-gray-50 border border-gray-100 rounded-[2rem] flex items-center gap-5 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{item.label}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">{item.description}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5 text-lg font-black font-headline text-gray-900">
                  {item.cost}
                  <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px] italic text-primary">S</div>
                </div>
                <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">Coins</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}