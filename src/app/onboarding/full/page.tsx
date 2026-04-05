
"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useUser, useFirebase } from "@/firebase"
import { ref, set as setRtdb } from "firebase/database"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

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
  const { database } = useFirebase()
  const { toast } = useToast()

  const handleSave = useCallback(async () => {
    if (!user || !name || !dob || !gender || !country || !lookingFor || !database) return

    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    if (age < 18) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You must be 18 or older to use MatchFlow.",
      })
      return
    }

    const numericId = Math.floor(10000000 + Math.random() * 90000000);

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
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastActiveAt: Date.now(),
      interests: ["Nature", "Adventure"],
      coinBalance: 500,
      diamondBalance: 0,
      isAdmin: false,
      isCoinseller: false,
      isSupport: false,
      isAgent: false,
      isVerified: false,
      inCall: false
    }

    await setRtdb(ref(database, `users/${user.uid}`), profileData);
    router.push("/discover")
  }, [user, name, dob, gender, country, lookingFor, database, router, toast])

  const darkMaroonText = "text-[#5A1010]";
  const darkMaroonBg = "bg-[#5A1010]";

  return (
    <div className="h-svh bg-transparent overflow-y-auto">
      <div className="flex flex-col p-6 min-h-full">
        <div className="mt-8 space-y-8 pb-32 max-w-sm mx-auto w-full">
          <header className="space-y-2">
            <h1 className={cn("text-4xl font-black font-headline drop-shadow-sm", darkMaroonText)}>Complete Profile</h1>
            <p className="text-[#5A1010] font-bold uppercase text-[10px] tracking-[0.2em]">Tell us a bit more about yourself</p>
          </header>

          <div className="space-y-6">
            <div className="space-y-3">
              <Label className={cn("text-[10px] font-black uppercase ml-1 tracking-widest", darkMaroonText)}>Full Name</Label>
              <Input 
                placeholder="What should we call you?" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-16 rounded-[2rem] bg-white border-none text-gray-900 font-bold px-6 shadow-sm"
              />
            </div>

            <div className="space-y-3">
              <Label className={cn("text-[10px] font-black uppercase ml-1 tracking-widest", darkMaroonText)}>Date of Birth</Label>
              <Input 
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="h-16 rounded-[2rem] bg-white border-none text-gray-900 font-bold px-6 shadow-sm"
              />
            </div>

            <div className="space-y-4">
              <Label className={cn("text-[10px] font-black uppercase ml-1 tracking-widest", darkMaroonText)}>I am a</Label>
              <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4">
                <div 
                  onClick={() => setGender("male")}
                  className={cn(
                    "flex items-center space-x-3 bg-white border px-5 py-4 rounded-[2rem] flex-1 cursor-pointer transition-all shadow-sm",
                    gender === "male" ? "border-[#5A1010] ring-1" : "border-transparent"
                  )}
                >
                  <RadioGroupItem value="male" id="gender_male" />
                  <Label htmlFor="gender_male" className={cn("font-black cursor-pointer uppercase text-xs tracking-widest", gender === "male" ? darkMaroonText : "text-gray-400")}>Man</Label>
                </div>
                <div 
                  onClick={() => setGender("female")}
                  className={cn(
                    "flex items-center space-x-3 bg-white border px-5 py-4 rounded-[2rem] flex-1 cursor-pointer transition-all shadow-sm",
                    gender === "female" ? "border-[#5A1010] ring-1" : "border-transparent"
                  )}
                >
                  <RadioGroupItem value="female" id="gender_female" />
                  <Label htmlFor="gender_female" className={cn("font-black cursor-pointer uppercase text-xs tracking-widest", gender === "female" ? darkMaroonText : "text-gray-400")}>Woman</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className={cn("text-[10px] font-black uppercase ml-1 tracking-widest", darkMaroonText)}>Looking for</Label>
              <RadioGroup value={lookingFor} onValueChange={setLookingFor} className="grid grid-cols-1 gap-2">
                {['long-term', 'casual', 'friendship'].map((goal) => (
                  <div 
                    key={goal} 
                    onClick={() => setLookingFor(goal)}
                    className={cn(
                      "flex items-center space-x-3 bg-white border px-5 py-4 rounded-[1.75rem] cursor-pointer transition-all shadow-sm",
                      lookingFor === goal ? "border-[#5A1010] ring-1" : "border-transparent"
                    )}
                  >
                    <RadioGroupItem value={goal} id={`goal_${goal}`} />
                    <Label htmlFor={`goal_${goal}`} className={cn("font-black cursor-pointer uppercase text-[10px] tracking-widest", lookingFor === goal ? darkMaroonText : "text-gray-400")}>
                      {goal.replace('-', ' ')}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className={cn("text-[10px] font-black uppercase ml-1 tracking-widest", darkMaroonText)}>Country</Label>
              <Select onValueChange={setCountry}>
                <SelectTrigger className="h-16 rounded-[2rem] bg-white border-none text-gray-900 font-bold px-6 shadow-sm">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-100 text-gray-900 rounded-[2rem] p-2">
                  {TARGET_COUNTRIES.map(c => (
                    <SelectItem key={c} value={c} className="rounded-xl py-3 px-4 font-bold">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className={cn("w-full h-18 rounded-full text-white text-xl font-black shadow-2xl active:scale-95 transition-all mt-6", darkMaroonBg)}
            disabled={!name || !dob || !gender || !country || !lookingFor}
            onClick={handleSave}
          >
            Finish Setup
          </Button>
        </div>
      </div>
    </div>
  )
}
