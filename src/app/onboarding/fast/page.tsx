
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useFirebase } from "@/firebase/provider"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/firebase/auth/use-auth"

const TARGET_COUNTRIES = ["Burundi", "Comoros", "Djibouti", "Eritrea", "Ethiopia", "Kenya", "Madagascar", "Malawi", "Mauritius", "Mozambique", "Rwanda", "Seychelles", "Somalia", "South Sudan", "Tanzania", "Uganda", "Zambia", "Zimbabwe"]

export default function FastOnboardingPage() {
  const [gender, setGender] = useState("")
  const [country, setCountry] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { auth, firestore } = useFirebase()
  const { user } = useAuth(auth)
  const { toast } = useToast()

  const handleConfirm = async () => {
    if (!gender || !country || isSubmitting || !user) return
    setIsSubmitting(true)

    try {
      const numericId = Math.floor(10000000 + Math.random() * 90000000);
      const randomAge = Math.floor(Math.random() * (45 - 19 + 1)) + 19;
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - randomAge);
      const dateOfBirth = dob.toISOString().split('T')[0];

      await setDoc(doc(firestore, "userProfiles", user.uid), {
        id: user.uid,
        authProviderId: user.providerId || "anonymous",
        numericId: numericId,
        username: `Guest_${user.uid.slice(0, 5)}`,
        gender: gender,
        location: country,
        dateOfBirth: dateOfBirth,
        profilePhotoUrls: [`https://picsum.photos/seed/${user.uid}/600/800`],
        coinBalance: 500,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isOnline: true
      });
      
      router.push("/discover")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Setup Failed", description: error.message })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-svh bg-white p-8">
      <div className="mt-12 space-y-10 flex-1 flex flex-col max-w-sm mx-auto w-full">
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
              <SelectTrigger className="h-16 rounded-[2.25rem] bg-white border-[#5A1010]/20 text-gray-900 text-lg font-black px-8">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="bg-white border-zinc-100 text-gray-900 rounded-[2rem]">
                {TARGET_COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button className="w-full h-18 rounded-full bg-[#5A1010] text-white text-xl font-black mb-10 shadow-2xl active:scale-95 transition-all" disabled={!gender || !country || isSubmitting} onClick={handleConfirm}>
          {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Confirm & Start"}
        </Button>
      </div>
    </div>
  )
}
