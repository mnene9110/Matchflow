
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const TARGET_COUNTRIES = [
  "Burundi", "Comoros", "Djibouti", "Eritrea", "Ethiopia", "Kenya", 
  "Madagascar", "Malawi", "Mauritius", "Mozambique", 
  "Rwanda", "Seychelles", "Somalia", "South Sudan", "Tanzania", 
  "Uganda", "Zambia", "Zimbabwe"
]

export default function FastOnboardingPage() {
  const [gender, setGender] = useState("")
  const [country, setCountry] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleConfirm = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !gender || !country || isSubmitting) return
    setIsSubmitting(true)

    try {
      const numericId = Math.floor(10000000 + Math.random() * 90000000);
      const welcomeCoins = 500;

      // Ensure fields match the SQL schema exactly (snake_case)
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          numeric_id: numericId,
          username: `Guest_${session.user.id.slice(0, 5)}`,
          gender: gender,
          location: country,
          profile_photo_urls: [`https://picsum.photos/seed/${session.user.id}/600/800`],
          coin_balance: welcomeCoins,
          is_online: true,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error("Supabase insert error details:", error.message, error.details, error.hint);
        throw new Error(error.message || "Failed to create profile record.");
      }
      
      router.push("/discover")
    } catch (error: any) {
      console.error("Fast onboarding failed:", error)
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description: error.message || "An unexpected error occurred while saving your profile."
      })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-svh bg-white p-8 overflow-y-auto">
      <div className="mt-12 space-y-10 flex-1 flex flex-col max-w-sm mx-auto w-full pb-20">
        <header className="space-y-3">
          <h1 className="text-4xl font-black font-headline text-[#5A1010] leading-tight">Fast Setup</h1>
          <p className="text-[#5A1010] font-bold uppercase text-[10px] tracking-widest">Quickly set your basic info</p>
        </header>

        <div className="space-y-8 flex-1">
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5A1010] ml-1">I am a</Label>
            <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4">
              <div onClick={() => setGender("male")} className={cn("flex items-center space-x-3 bg-white border px-5 py-5 rounded-[2.25rem] flex-1 cursor-pointer transition-all shadow-sm", gender === "male" ? "border-[#5A1010] ring-1 ring-[#5A1010]" : "border-gray-100")}>
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male" className={cn("cursor-pointer font-black text-xs tracking-widest uppercase", gender === "male" ? "text-[#5A1010]" : "text-gray-400")}>Man</Label>
              </div>
              <div onClick={() => setGender("female")} className={cn("flex items-center space-x-3 bg-white border px-5 py-5 rounded-[2.25rem] flex-1 cursor-pointer transition-all shadow-sm", gender === "female" ? "border-[#5A1010] ring-1 ring-[#5A1010]" : "border-gray-100")}>
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female" className={cn("cursor-pointer font-black text-xs tracking-widest uppercase", gender === "female" ? "text-[#5A1010]" : "text-gray-400")}>Woman</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5A1010] ml-1">My Country</Label>
            <Select onValueChange={setCountry}>
              <SelectTrigger className="h-16 rounded-[2.25rem] bg-white border-[#5A1010]/20 text-gray-900 text-lg font-black px-8 shadow-sm">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="bg-white border-zinc-100 text-gray-900 rounded-[2rem] p-2">
                {TARGET_COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          className="w-full h-18 rounded-full bg-[#5A1010] text-white text-xl font-black mb-10 shadow-2xl active:scale-95 transition-all" 
          disabled={!gender || !country || isSubmitting} 
          onClick={handleConfirm}
        >
          {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Confirm & Start"}
        </Button>
      </div>
    </div>
  )
}
