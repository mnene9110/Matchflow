
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useFirestore, useUser, setDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"
import { cn } from "@/lib/utils"

const TARGET_COUNTRIES = [
  "Burundi", "Comoros", "Djibouti", "Eritrea", "Ethiopia", "Kenya", 
  "Madagascar", "Malawi", "Mauritius", "Mozambique", "Nigeria", 
  "Rwanda", "Seychelles", "Somalia", "South Sudan", "Tanzania", 
  "Uganda", "Zambia", "Zimbabwe"
]

export default function FastOnboardingPage() {
  const [gender, setGender] = useState("")
  const [country, setCountry] = useState("")
  const router = useRouter()
  const { user } = useUser()
  const firestore = useFirestore()

  const handleConfirm = () => {
    if (!user || !gender || !country) return

    const numericId = Math.floor(10000000 + Math.random() * 90000000);

    const userRef = doc(firestore, "userProfiles", user.uid)
    const profileData = {
      id: user.uid,
      numericId,
      authProviderId: "anonymous",
      username: `Guest_${user.uid.slice(0, 5)}`,
      gender,
      location: country,
      profilePhotoUrls: [`https://picsum.photos/seed/${user.uid}/600/800`],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      interests: ["Nature", "Travel"],
      coinBalance: 500,
      isAdmin: false,
      isCoinseller: false,
      isSupport: false
    }

    setDocumentNonBlocking(userRef, profileData, { merge: true })
    router.push("/discover")
  }

  const darkMaroon = "text-[#5A1010]";
  const darkMaroonBg = "bg-[#5A1010]";

  return (
    <div className="flex flex-col h-svh bg-transparent p-8 overflow-y-auto">
      <div className="mt-12 space-y-10 flex-1 flex flex-col max-w-sm mx-auto w-full">
        <header className="space-y-3">
          <h1 className={cn("text-4xl font-black font-headline leading-tight drop-shadow-sm", darkMaroon)}>Fast Setup</h1>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Quickly set your basic info</p>
        </header>

        <div className="space-y-8 flex-1">
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">I am a</Label>
            <RadioGroup onValueChange={setGender} className="flex gap-4">
              <div className={cn(
                "flex items-center space-x-3 bg-white/40 backdrop-blur-xl border px-5 py-5 rounded-[2.25rem] flex-1 cursor-pointer transition-all shadow-sm",
                gender === "male" ? "bg-white border-[#B36666]" : "border-[#B36666]/10"
              )}>
                <RadioGroupItem value="male" id="male" className="border-primary" />
                <Label htmlFor="male" className={cn("cursor-pointer font-black text-sm tracking-wide", gender === "male" ? darkMaroon : "text-zinc-500")}>Man</Label>
              </div>
              <div className={cn(
                "flex items-center space-x-3 bg-white/40 backdrop-blur-xl border px-5 py-5 rounded-[2.25rem] flex-1 cursor-pointer transition-all shadow-sm",
                gender === "female" ? "bg-white border-[#B36666]" : "border-[#B36666]/10"
              )}>
                <RadioGroupItem value="female" id="female" className="border-primary" />
                <Label htmlFor="female" className={cn("cursor-pointer font-black text-sm tracking-wide", gender === "female" ? darkMaroon : "text-zinc-500")}>Woman</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">My Country</Label>
            <Select onValueChange={setCountry}>
              <SelectTrigger className="h-16 rounded-[2.25rem] bg-white/60 backdrop-blur-xl border-[#B36666]/20 text-zinc-900 text-lg font-black px-8">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-2xl border-zinc-100 text-zinc-900 rounded-[2rem] p-2">
                {TARGET_COUNTRIES.map(c => (
                  <SelectItem key={c} value={c} className="hover:bg-zinc-50 focus:bg-zinc-50 rounded-xl font-bold py-3 px-4">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          className={cn("w-full h-18 rounded-full text-white text-xl font-black mb-10 shadow-2xl active:scale-95 transition-all", darkMaroonBg)}
          disabled={!gender || !country}
          onClick={handleConfirm}
        >
          Confirm & Start
        </Button>
      </div>
    </div>
  )
}
