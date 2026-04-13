"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft, Shield, Globe, Video } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AboutPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-svh bg-white text-gray-900">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-[#3BC1A8] z-10 shadow-lg text-white">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">About MatchFlow</h1>
      </header>

      <main className="flex-1 px-8 pt-12 pb-20 space-y-12">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-24 h-24 bg-zinc-950 rounded-[3rem] shadow-2xl flex items-center justify-center border border-white/10">
             <span className="text-primary font-logo text-4xl">MF</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-logo text-primary">MatchFlow</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Version 3.1.0 • Global</p>
          </div>
        </div>

        <div className="space-y-10">
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Our Mission</h3>
            <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              MatchFlow is designed to bring people together through genuine, high-quality interactions. We believe that real connection starts with seeing and hearing the person on the other side of the screen.
            </p>
          </section>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-gray-50 border border-gray-100 rounded-[2rem] space-y-3 shadow-sm">
              <Video className="w-6 h-6 text-primary" />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Video First</h4>
              <p className="text-[9px] font-bold text-gray-400 uppercase leading-tight">High definition video calls for real-time bonding.</p>
            </div>
            <div className="p-6 bg-gray-50 border border-gray-100 rounded-[2rem] space-y-3 shadow-sm">
              <Shield className="w-6 h-6 text-blue-500" />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Verified Only</h4>
              <p className="text-[9px] font-bold text-gray-400 uppercase leading-tight">AI-powered identity verification for your safety.</p>
            </div>
          </div>

          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Why MatchFlow?</h3>
            <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              Unlike traditional apps that focus on swiping, MatchFlow prioritizes active engagement. Our unique coin-based economy ensures that every interaction is intentional and valued.
            </p>
          </section>
        </div>

        <footer className="pt-10 flex flex-col items-center gap-4 opacity-40 pb-10">
           <Globe className="w-6 h-6 text-gray-300" />
           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-center">Made with heart for global connections</p>
        </footer>
      </main>
    </div>
  )
}