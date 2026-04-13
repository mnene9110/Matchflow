"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PrivacyPage() {
  const router = useRouter()

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
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Privacy Policy</h1>
      </header>

      <main className="flex-1 px-8 pt-12 pb-20 space-y-8 overflow-y-auto">
        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">1. Data Collection</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            We collect information you provide directly to us when you create an account, such as your username, gender, date of birth, and profile photos.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">2. Real-time Communication</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            All video and audio calls are end-to-end encrypted. MatchFlow does not record or store your private conversations or calls.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">3. Verification Data</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            Selfie photos taken for identity verification are processed using AI to ensure profile authenticity. This biometric data is never permanently stored on our servers.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">4. Data Sharing</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            We do not sell your personal data to third parties. Information is only shared when required by law or to protect the safety of our community.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">5. Your Rights</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            You have the right to access, correct, or delete your personal data at any time. Account deletion is permanent and wipes all associated data from our systems.
          </p>
        </section>

        <p className="text-[10px] font-black text-gray-300 uppercase pt-10">Last updated: June 2024</p>
      </main>
    </div>
  )
}