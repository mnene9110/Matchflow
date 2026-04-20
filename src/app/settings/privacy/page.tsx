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
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">1. Information We Collect</h2>
          <div className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
            <p>To provide a better experience, we collect:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>Profile Data:</strong> Username, gender, date of birth, location, and photos you upload.</li>
              <li><strong>Usage Data:</strong> How you interact with other users, features you use, and transaction history.</li>
              <li><strong>Device Info:</strong> IP address, device type, and operating system for security and performance.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">2. Real-Time Communication Privacy</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            Your safety is our priority. Video and voice calls are transmitted in real-time. While we provide the platform for connection, MatchFlow does not record, monitor, or store the audio or video content of your private one-on-one calls. 
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">3. Verification & AI Processing</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            When you use our identity verification feature, we use AI to compare your live selfie with your profile photo. This biometric analysis is performed instantly. We do not store your biometric data permanently; it is used only for the one-time verification check.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">4. Data Sharing and Third Parties</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            We do not sell your personal data. We only share information with trusted service providers (like payment gateways and communication infrastructure providers) necessary to operate the app, or when required by legal authorities.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">5. Data Retention & Deletion</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            You have full control over your data. You can delete your account at any time via the Settings menu. Upon deletion, all your personal profile data, photos, and messages are permanently wiped from our active databases.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">6. Security Measures</h2>
          <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            We implement industry-standard encryption and security protocols to protect your information from unauthorized access, alteration, or disclosure.
          </p>
        </section>

        <p className="text-[10px] font-black text-gray-300 uppercase pt-10">Last updated: July 2024</p>
      </main>
    </div>
  )
}
