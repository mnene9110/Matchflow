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

const AFRICAN_COUNTRIES = [
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde", "Cameroon", 
  "Central African Republic", "Chad", "Comoros", "Congo", "DR Congo", "Djibouti", "Egypt", 
  "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea", 
  "Guinea-Bissau", "Ivory Coast", "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", 
  "Mali", "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria", 
  "Rwanda", "Sao Tome and Principe", "Senegal", "Seychelles", "Sierra Leone", "Somalia", 
  "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe"
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

    const userRef = doc(firestore, "users", user.uid)
    const profileData = {
      id: user.uid,
      numericId,
      authProviderId: "password",
      username: name,
      email: user.email,
      dateOfBirth: dob,
      gender,
      preferredGenders: lookingFor === "both" ? ["male", "female"] : [lookingFor],
      location: country,
      profilePhotoUrls: [`https://picsum.photos/seed/${user.uid}/600/800`],
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      interests: ["Nature", "Water sports", "Adventure"]
    }

    setDocumentNonBlocking(userRef, profileData, { merge: true })
    
    // Path corrected to match backend.json: /users/{userId}/coinAccount (Document)
    const coinAccountRef = doc(firestore, "users", user.uid, "coinAccount")
    setDocumentNonBlocking(coinAccountRef, {
      id: user.uid,
      userId: user.uid,
      balance: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true })

    router.push("/discover")
  }

  return (
    <div className="flex flex-col h-svh bg-white p-8 overflow-y-auto">
      <div className="mt-8 space-y-8 pb-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-primary font-headline">Complete Profile</h1>
          <p className="text-muted-foreground">Tell us a bit more about yourself.</p>
        </header>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground/60">Full Name</Label>
            <Input 
              placeholder="What should we call you?" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-14 rounded-xl bg-secondary/50 border-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground/60">Date of Birth</Label>
            <Input 
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="h-14 rounded-xl bg-secondary/50 border-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground/60">I am a</Label>
            <RadioGroup onValueChange={setGender} className="flex gap-4">
              <div className="flex items-center space-x-2 bg-secondary/50 px-4 py-3 rounded-xl flex-1">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male">Man</Label>
              </div>
              <div className="flex items-center space-x-2 bg-secondary/50 px-4 py-3 rounded-xl flex-1">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female">Woman</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground/60">Looking for</Label>
            <RadioGroup onValueChange={setLookingFor} className="flex flex-col gap-2">
              <div className="flex items-center space-x-2 bg-secondary/50 px-4 py-3 rounded-xl">
                <RadioGroupItem value="female" id="look_woman" />
                <Label htmlFor="look_woman">Women</Label>
              </div>
              <div className="flex items-center space-x-2 bg-secondary/50 px-4 py-3 rounded-xl">
                <RadioGroupItem value="male" id="look_man" />
                <Label htmlFor="look_man">Men</Label>
              </div>
              <div className="flex items-center space-x-2 bg-secondary/50 px-4 py-3 rounded-xl">
                <RadioGroupItem value="both" id="look_both" />
                <Label htmlFor="look_both">Both</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground/60">Country</Label>
            <Select onValueChange={setCountry}>
              <SelectTrigger className="h-14 rounded-xl bg-secondary/50 border-none">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {AFRICAN_COUNTRIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          className="w-full h-16 rounded-full bg-primary text-white text-xl font-bold shadow-xl shadow-primary/20 active:scale-95 transition-transform"
          disabled={!name || !dob || !gender || !country || !lookingFor}
          onClick={handleSave}
        >
          Finish Setup
        </Button>
      </div>
    </div>
  )
}
