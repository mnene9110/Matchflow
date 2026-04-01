
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useFirestore, useUser, setDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"

const AFRICAN_COUNTRIES = [
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde", "Cameroon", 
  "Central African Republic", "Chad", "Comoros", "Congo", "DR Congo", "Djibouti", "Egypt", 
  "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea", 
  "Guinea-Bissau", "Ivory Coast", "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", 
  "Mali", "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria", 
  "Rwanda", "Sao Tome and Principe", "Senegal", "Seychelles", "Sierra Leone", "Somalia", 
  "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe"
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
      coinBalance: 500, // New user reward: 500 coins
      isAdmin: false,
      isCoinseller: false,
      isSupport: false
    }

    setDocumentNonBlocking(userRef, profileData, { merge: true })
    router.push("/discover")
  }

  return (
    <div className="flex flex-col h-svh bg-black p-8 text-white">
      <div className="mt-12 space-y-10 flex-1 flex flex-col">
        <header className="space-y-3">
          <h1 className="text-4xl font-black text-primary font-headline leading-tight">Fast Setup</h1>
          <p className="text-white/40 font-medium">Quickly set your basic info to start matching.</p>
        </header>

        <div className="space-y-8 flex-1">
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">I am a</Label>
            <RadioGroup onValueChange={setGender} className="flex gap-4">
              <div className="flex items-center space-x-3 bg-white/5 border border-white/5 px-5 py-4 rounded-[2rem] flex-1 cursor-pointer hover:bg-white/10 transition-colors">
                <RadioGroupItem value="male" id="male" className="border-white/20" />
                <Label htmlFor="male" className="cursor-pointer font-black text-sm">Man</Label>
              </div>
              <div className="flex items-center space-x-3 bg-white/5 border border-white/5 px-5 py-4 rounded-[2rem] flex-1 cursor-pointer hover:bg-white/10 transition-colors">
                <RadioGroupItem value="female" id="female" className="border-white/20" />
                <Label htmlFor="female" className="cursor-pointer font-black text-sm">Woman</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">My Country</Label>
            <Select onValueChange={setCountry}>
              <SelectTrigger className="h-16 rounded-[2rem] bg-white/5 border-white/5 text-lg font-bold text-white px-6">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-3xl">
                {AFRICAN_COUNTRIES.map(c => (
                  <SelectItem key={c} value={c} className="hover:bg-white/10 focus:bg-white/10 rounded-xl">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          className="w-full h-16 rounded-full bg-primary text-white text-xl font-black mb-10 shadow-2xl shadow-primary/20 active:scale-95 transition-all"
          disabled={!gender || !country}
          onClick={handleConfirm}
        >
          Confirm & Start
        </Button>
      </div>
    </div>
  )
}
