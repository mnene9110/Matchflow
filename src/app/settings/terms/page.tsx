
"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TermsPage() {
  const router = useRouter()

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
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Terms of Service</h1>
      </header>

      <main className="flex-1 px-8 pt-4 pb-20 space-y-8 overflow-y-auto">
        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">1. Acceptance of Terms</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed">
            By accessing or using MatchFlow, you agree to be bound by these Terms of Service. If you do not agree to all terms, you may not use the platform.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">2. Eligibility</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed">
            You must be at least 18 years of age to create an account on MatchFlow. By creating an account, you represent and warrant that you meet this requirement.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">3. Coin Economy</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed">
            Coins purchased within the app are non-refundable and have no monetary value outside of the platform. MatchFlow reserves the right to manage and regulate the coin economy.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">4. Prohibited Content</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed">
            Users are strictly prohibited from sharing explicit, violent, or illegal content. MatchFlow maintains a zero-tolerance policy for harassment and will terminate accounts found in violation.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">5. Termination</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed">
            We reserve the right to suspend or terminate your access to MatchFlow at our sole discretion, without notice, for conduct that we believe violates these Terms.
          </p>
        </section>

        <p className="text-[10px] font-black text-gray-300 uppercase pt-10">Last updated: June 2024</p>
      </main>
    </div>
  )
}
