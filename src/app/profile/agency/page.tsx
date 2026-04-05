"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export default function JoinAgencyPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [agencyId, setAgencyId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!agencyId.trim()) {
      toast({ variant: "destructive", title: "Missing ID", description: "Please enter an agency ID." })
      return
    }

    setIsSubmitting(true)
    // Prototype logic: simulate application
    setTimeout(() => {
      toast({ title: "Application Sent", description: "Your request to join the agency has been submitted." })
      setIsSubmitting(false)
      router.back()
    }, 1500)
  }

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 font-body">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-white z-10 border-b border-gray-50 shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-gray-900 h-10 w-10 bg-gray-50 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="flex-1 text-center text-sm font-black uppercase tracking-widest mr-10">Join the anchor</h1>
      </header>

      <main className="flex-1 p-8 space-y-10">
        <div className="space-y-6">
          <h2 className="text-3xl font-black font-headline text-gray-900 tracking-tight">Agency ID</h2>
          
          <div className="relative">
            <Input 
              placeholder="Please enter the agency ID" 
              value={agencyId}
              onChange={(e) => setAgencyId(e.target.value)}
              className="h-14 bg-transparent border-0 border-b-2 border-gray-100 rounded-none px-0 text-lg font-medium focus-visible:ring-0 focus-visible:border-primary placeholder:text-gray-300"
            />
          </div>

          <p className="text-[13px] text-gray-400 font-medium leading-relaxed max-w-[300px]">
            After the agency owner approves your application, you will join
          </p>
        </div>

        <div className="pt-20">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !agencyId.trim()}
            className="w-full h-16 rounded-full bg-primary text-white font-black text-lg shadow-2xl shadow-primary/20 active:scale-95 transition-all"
          >
            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Applications for Membership"}
          </Button>
        </div>
      </main>
    </div>
  )
}
