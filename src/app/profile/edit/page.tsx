
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Camera, Loader2, Save, User, Plus, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUser, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import Image from "next/image"

const COUNTRIES = [
  "Burundi", "Comoros", "Djibouti", "Eritrea", "Ethiopia", "Kenya", 
  "Madagascar", "Malawi", "Mauritius", "Mozambique", "Nigeria", 
  "Rwanda", "Seychelles", "Somalia", "South Sudan", "Tanzania", 
  "Uganda", "Zambia", "Zimbabwe"
]

const HOROSCOPES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", 
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

const GOALS = ["Casual", "Long-term", "Friendship", "Networking"]

export default function EditProfilePage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  
  const mainFileInputRef = useRef<HTMLInputElement>(null)
  const extraPhotosInputRef = useRef<HTMLInputElement>(null)
  const [activePhotoSlot, setActivePhotoSlot] = useState<number | null>(null)

  const userRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: profile, isLoading } = useDoc(userRef)

  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    dateOfBirth: "",
    location: "",
    relationshipGoal: "",
    education: "",
    horoscope: "",
    profilePhotoUrls: [] as string[]
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  const darkMaroon = "bg-[#5A1010]";

  useEffect(() => {
    if (profile && !hasInitialized) {
      setFormData({
        username: profile.username || "",
        bio: profile.bio || "",
        dateOfBirth: profile.dateOfBirth || "",
        location: profile.location || "",
        relationshipGoal: profile.relationshipGoal || "",
        education: profile.education || "",
        horoscope: profile.horoscope || "",
        profilePhotoUrls: profile.profilePhotoUrls || []
      })
      setHasInitialized(true)
    }
  }, [profile, hasInitialized])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && activePhotoSlot !== null) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result as string
        setFormData(prev => {
          const newUrls = [...prev.profilePhotoUrls]
          newUrls[activePhotoSlot] = dataUrl
          return { ...prev, profilePhotoUrls: newUrls }
        })
        setActivePhotoSlot(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = (index: number) => {
    if (index === 0) {
       toast({ title: "Primary Photo Required", description: "You cannot remove your main profile photo." })
       return
    }
    setFormData(prev => {
      const newUrls = [...prev.profilePhotoUrls]
      newUrls.splice(index, 1)
      return { ...prev, profilePhotoUrls: newUrls }
    })
  }

  const handleSave = async () => {
    if (!currentUser || !firestore || isSaving) return
    setIsSaving(true)

    try {
      const userDocRef = doc(firestore, "userProfiles", currentUser.uid)
      
      const photoChanged = profile?.profilePhotoUrls?.[0] !== formData.profilePhotoUrls[0]
      
      const updateData: any = {
        ...formData,
        updatedAt: new Date().toISOString()
      }

      if (photoChanged) {
        updateData.isVerified = false
      }

      updateDocumentNonBlocking(userDocRef, updateData)
      
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully.",
      })
      
      if (photoChanged) {
        toast({
          variant: "destructive",
          title: "Verification Revoked",
          description: "Main photo change detected. Identity verification reset.",
        })
      }

      router.push("/profile")
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save changes." })
      setIsSaving(false)
    }
  }

  if (isLoading) return (
    <div className="flex h-svh items-center justify-center bg-[#B36666]">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  )

  const extraPhotoSlots = [1, 2, 3, 4]

  return (
    <div className="flex flex-col h-svh bg-transparent text-gray-900 overflow-hidden">
      <header className="shrink-0 px-4 py-8 flex items-center bg-transparent z-50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-white h-10 w-10 bg-black/10 backdrop-blur-md rounded-full hover:bg-black/20"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase text-white drop-shadow-md">Edit Profile</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-2 pb-40 space-y-10 scroll-smooth">
        <section className="space-y-6">
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar className="w-40 h-40 shadow-[0_20px_60px_rgba(0,0,0,0.15)] border-4 border-white">
                <AvatarImage src={formData.profilePhotoUrls[0] || ""} className="object-cover" />
                <AvatarFallback className="bg-primary text-white text-4xl font-black">
                  {formData.username?.[0] || <User className="w-16 h-16" />}
                </AvatarFallback>
              </Avatar>
              <button 
                onClick={() => {
                  setActivePhotoSlot(0);
                  mainFileInputRef.current?.click();
                }}
                className={cn("absolute bottom-2 right-2 w-12 h-12 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform z-10", darkMaroon)}
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mt-5 drop-shadow-sm">Main Photo</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Gallery (Max 4 Extra)</h3>
            <div className="grid grid-cols-4 gap-3">
              {extraPhotoSlots.map((slotIndex) => {
                const photoUrl = formData.profilePhotoUrls[slotIndex];
                return (
                  <div key={slotIndex} className="relative aspect-square">
                    {photoUrl ? (
                      <>
                        <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-white/50 shadow-lg">
                          <Image src={photoUrl} alt="Extra" fill className="object-cover" />
                        </div>
                        <button 
                          onClick={() => removePhoto(slotIndex)}
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-md active:scale-90 transition-all z-20"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => {
                          setActivePhotoSlot(slotIndex);
                          extraPhotosInputRef.current?.click();
                        }}
                        className="w-full h-full rounded-2xl border-2 border-dashed border-white/30 flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <Plus className="w-5 h-5 text-white/40" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <input type="file" ref={mainFileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          <input type="file" ref={extraPhotosInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        </section>

        <section className="space-y-6 bg-white/60 backdrop-blur-2xl p-7 rounded-[2.5rem] border border-white/50 shadow-2xl">
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Full Name</Label>
            <Input 
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className="h-14 rounded-2xl bg-white/80 border-none text-sm font-bold shadow-inner focus-visible:ring-primary/30"
              placeholder="Your display name"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">About Me</Label>
            <Textarea 
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              className="min-h-[120px] rounded-2xl bg-white/80 border-none text-sm font-bold shadow-inner focus-visible:ring-primary/30 py-4"
              placeholder="Tell people about yourself..."
            />
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Date of Birth</Label>
            <Input 
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
              className="h-14 rounded-2xl bg-white/80 border-none text-sm font-bold shadow-inner focus-visible:ring-primary/30"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Country</Label>
            <Select 
              value={formData.location} 
              onValueChange={(val) => setFormData(prev => ({ ...prev, location: val }))}
            >
              <SelectTrigger className="h-14 rounded-2xl bg-white/80 border-none text-sm font-bold shadow-inner focus:ring-primary/30">
                <SelectValue placeholder="Where are you located?" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border-none shadow-2xl max-h-[300px]">
                {COUNTRIES.map(c => <SelectItem key={c} value={c} className="rounded-xl font-bold text-xs py-3">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Relationship Goal</Label>
            <Select 
              value={formData.relationshipGoal} 
              onValueChange={(val) => setFormData(prev => ({ ...prev, relationshipGoal: val }))}
            >
              <SelectTrigger className="h-14 rounded-2xl bg-white/80 border-none text-sm font-bold shadow-inner focus:ring-primary/30">
                <SelectValue placeholder="What are you looking for?" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border-none shadow-2xl">
                {GOALS.map(g => <SelectItem key={g} value={g} className="rounded-xl font-bold text-xs py-3">{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Education</Label>
            <Input 
              value={formData.education}
              onChange={(e) => setFormData(prev => ({ ...prev, education: e.target.value }))}
              className="h-14 rounded-2xl bg-white/80 border-none text-sm font-bold shadow-inner focus-visible:ring-primary/30"
              placeholder="e.g. University of Nairobi"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Horoscope</Label>
            <Select 
              value={formData.horoscope} 
              onValueChange={(val) => setFormData(prev => ({ ...prev, horoscope: val }))}
            >
              <SelectTrigger className="h-14 rounded-2xl bg-white/80 border-none text-sm font-bold shadow-inner focus:ring-primary/30">
                <SelectValue placeholder="Your zodiac sign" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border-none shadow-2xl max-h-[300px]">
                {HOROSCOPES.map(h => <SelectItem key={h} value={h} className="rounded-xl font-bold text-xs py-3">{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </section>

        <div className="flex flex-col items-center gap-2 pt-4 pb-10">
          <Sparkles className="w-6 h-6 text-white/50" />
          <p className="text-[9px] font-black uppercase text-white/30 tracking-[0.4em] text-center max-w-[200px]">
            Keep your profile details fresh to get better matches
          </p>
        </div>
      </main>

      <footer className="shrink-0 fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white/90 via-white/80 to-transparent backdrop-blur-sm z-50">
        <div className="max-w-md mx-auto">
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-16 rounded-full bg-primary text-white font-black text-lg gap-3 shadow-[0_15px_40px_rgba(179,102,102,0.4)] hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            Save Changes
          </Button>
        </div>
      </footer>
    </div>
  )
}
