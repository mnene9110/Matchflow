
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

export default function FullOnboardingPage() {
  const [name, setName] = useState("")
  const [dob, setDob] = useState("")
  const [gender, setGender] = useState("")
  const [country, setCountry] = useState("")
  const [lookingFor, setLookingFor] = useState("")
  
  const router = useRouter()
  const { user } = useUser()
  const firestore = useFirestore()

  const handleSave = () => {
    if (!user || !name || !dob || !gender || !country || !lookingFor) return

    const numericId = Math.floor(10000000 + Math.random() * 90000000);

    const userRef = doc(firestore, "userProfiles", user.uid)
    const profileData = {
      id: user.uid,
      numericId,
      authProviderId: "password",
      username: name,
      email: user.email,
      dateOfBirth: dob,
      gender,
      relationshipGoal: lookingFor,
      location: country,
      profilePhotoUrls: [`https://picsum.photos/seed/${user.uid}/600/800`],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      interests: ["Nature", "Water sports", "Adventure"],
      coinBalance: 500,
      isAdmin: false,
      isCoinseller: false,
      isSupport: false
    }

    setDocumentNonBlocking(userRef, profileData, { merge: true })
    router.push("/discover")
  }

  return (
    <div className="flex flex-col h-svh bg-transparent p-6 overflow-y-auto">
      <div className="mt-8 space-y-8 pb-10 max-w-sm mx-auto w-full">
        <header className="space-y-2">
          <h1 className="text-4xl font-black text-white font-headline drop-shadow-md">Complete Profile</h1>
          <p className="text-white/80 font-bold uppercase text-[10px] tracking-[0.2em]">Tell us a bit more about yourself</p>
        </header>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase text-white/40 ml-1 tracking-widest">Full Name</Label>
            <Input 
              placeholder="What should we call you?" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-16 rounded-[2rem] bg-white/10 backdrop-blur-xl border-white/20 text-white font-bold px-6 placeholder:text-white/30 focus-visible:ring-white/20"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase text-white/40 ml-1 tracking-widest">Date of Birth</Label>
            <Input 
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="h-16 rounded-[2rem] bg-white/10 backdrop-blur-xl border-white/20 text-white font-bold px-6 focus-visible:ring-white/20"
            />
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase text-white/40 ml-1 tracking-widest">I am a</Label>
            <RadioGroup onValueChange={setGender} className="flex gap-4">
              <div className={cn(
                "flex items-center space-x-3 bg-white/10 backdrop-blur-xl border px-5 py-4 rounded-[2rem] flex-1 cursor-pointer transition-all",
                gender === "male" ? "bg-white/20 border-white" : "border-white/10"
              )}>
                <RadioGroupItem value="male" id="male" className="border-white/40" />
                <Label htmlFor="male" className="font-bold cursor-pointer">Man</Label>
              </div>
              <div className={cn(
                "flex items-center space-x-3 bg-white/10 backdrop-blur-xl border px-5 py-4 rounded-[2rem] flex-1 cursor-pointer transition-all",
                gender === "female" ? "bg-white/20 border-white" : "border-white/10"
              )}>
                <RadioGroupItem value="female" id="female" className="border-white/40" />
                <Label htmlFor="female" className="font-bold cursor-pointer">Woman</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase text-white/40 ml-1 tracking-widest">Looking for</Label>
            <RadioGroup onValueChange={setLookingFor} className="flex flex-col gap-2">
              {['long-term', 'casual', 'friendship'].map((goal) => (
                <div key={goal} className={cn(
                  "flex items-center space-x-3 bg-white/10 backdrop-blur-xl border px-5 py-4 rounded-[1.75rem] cursor-pointer transition-all",
                  lookingFor === goal ? "bg-white/20 border-white" : "border-white/10"
                )}>
                  <RadioGroupItem value={goal} id={`goal_${goal}`} className="border-white/40" />
                  <Label htmlFor={`goal_${goal}`} className="font-bold cursor-pointer capitalize">{goal.replace('-', ' ')}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase text-white/40 ml-1 tracking-widest">Country</Label>
            <Select onValueChange={setCountry}>
              <SelectTrigger className="h-16 rounded-[2rem] bg-white/10 backdrop-blur-xl border-white/20 text-white font-bold px-6">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900/95 backdrop-blur-2xl border-white/10 text-white rounded-[2rem] p-2">
                {TARGET_COUNTRIES.map(c => (
                  <SelectItem key={c} value={c} className="rounded-xl py-3 px-4 font-bold">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          className="w-full h-18 rounded-full bg-white text-[#B36666] text-xl font-black shadow-2xl active:scale-95 transition-all mt-6"
          disabled={!name || !dob || !gender || !country || !lookingFor}
          onClick={handleSave}
        >
          Finish Setup
        </Button>
      </div>
    </div>
  )
}
