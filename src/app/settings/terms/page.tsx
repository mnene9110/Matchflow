"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TermsPage() {
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
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Terms of Service</h1>
      </header>

      <main className="flex-1 px-8 pt-12 pb-20 space-y-8 overflow-y-auto">
        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">1. Acceptance of Terms</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            Welcome to MatchFlow. By creating an account or using our application, you agree to be bound by these terms. These terms govern your access to and use of MatchFlow's services, including our mobile application, website, and any other related services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">2. User Eligibility</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            You must be at least 18 years old to use MatchFlow. By using the app, you represent and warrant that you have the right, authority, and capacity to enter into this agreement and to abide by all of the terms and conditions.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">3. Account Security</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree to immediately notify MatchFlow of any unauthorized use of your account.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">4. Content and Conduct</h2>
          <div className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
            <p>You are solely responsible for the content you post. Prohibited content includes but is not limited to:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Sexually explicit or pornographic material</li>
              <li>Hate speech or discriminatory content</li>
              <li>Harassment, bullying, or threats</li>
              <li>Scams, fraud, or commercial solicitation</li>
              <li>Violation of intellectual property rights</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">5. Virtual Economy (Coins & Diamonds)</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            Coins are virtual currency used for premium interactions and cannot be refunded. Diamonds are earned through gifts and can be converted back to coins. Neither have real-world monetary value outside our internal exchange systems. MatchFlow reserves the right to adjust exchange rates or manage the virtual economy at its discretion.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">6. Termination of Service</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            MatchFlow reserves the right to suspend or terminate your account at any time, with or without notice, if we believe you have violated these terms or for any other reason deemed necessary for the safety of our community.
          </p>
        </section>

        <p className="text-[10px] font-black text-gray-300 uppercase pt-10">Last updated: July 2024</p>
      </main>
    </div>
  )
}
