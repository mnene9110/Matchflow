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
      lastActiveAt: new Date().toISOString(),
      interests: ["Nature", "Travel"]
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
    <div className="flex flex-col h-svh bg-white p-8">
      <div className="mt-12 space-y-8 flex-1 flex flex-col">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-primary font-headline">Fast Setup</h1>
          <p className="text-muted-foreground">Quickly set your basic info to start matching.</p>
        </header>

        <div className="space-y-6 flex-1">
          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">I am a</Label>
            <RadioGroup onValueChange={setGender} className="flex gap-4">
              <div className="flex items-center space-x-2 bg-secondary/50 px-4 py-3 rounded-xl flex-1 cursor-pointer">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male" className="cursor-pointer font-bold">Man</Label>
              </div>
              <div className="flex items-center space-x-2 bg-secondary/50 px-4 py-3 rounded-xl flex-1 cursor-pointer">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female" className="cursor-pointer font-bold">Woman</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">My Country</Label>
            <Select onValueChange={setCountry}>
              <SelectTrigger className="h-14 rounded-xl bg-secondary/50 border-none text-lg font-medium">
                <SelectValue placeholder="Select your country" />
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
          className="w-full h-16 rounded-full bg-primary text-white text-xl font-bold mb-8 shadow-xl active:scale-95 transition-transform"
          disabled={!gender || !country}
          onClick={handleConfirm}
        >
          Confirm & Start
        </Button>
      </div>
    </div>
  )
}
