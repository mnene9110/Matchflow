
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Camera, Loader2, Save, User, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Cropper from "react-easy-crop"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { uploadToSupabase } from "@/lib/storage"

const COUNTRIES = ["Burundi", "Comoros", "Djibouti", "Eritrea", "Ethiopia", "Kenya", "Madagascar", "Malawi", "Mauritius", "Mozambique", "Nigeria", "Rwanda", "Seychelles", "Somalia", "South Sudan", "Tanzania", "Uganda", "Zambia", "Zimbabwe"]

const INTERESTS_OPTIONS = [
  'Music', 'Travel', 'Sports', 'Movies', 'Gaming', 'Cooking', 
  'Reading', 'Art', 'Dancing', 'Tech', 'Fashion', 'Fitness', 
  'Photography', 'Nature', 'Coffee', 'Pets'
]

const EDUCATION_OPTIONS = [
  'High School', 'Diploma', "Bachelor's Degree", "Master's Degree", 
  'Doctorate', 'Self-taught', 'Vocational Training'
]

const LOOKING_FOR_OPTIONS = [
  { id: 'long-term', label: 'Long-term' },
  { id: 'casual', label: 'Casual' },
  { id: 'friendship', label: 'Friendship' },
  { id: 'marriage', label: 'Marriage' }
]

const ZODIAC_OPTIONS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]

export default function EditProfilePage() {
  const router = useRouter()
  const { user: currentUser, profile, isLoading } = useSupabaseUser()
  const { toast } = useToast()
  
  const mainFileInputRef = useRef<HTMLInputElement>(null)
  const extraPhotosInputRef = useRef<HTMLInputElement>(null)
  
  const [activePhotoSlot, setActivePhotoSlot] = useState<number | null>(null)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isCropping, setIsCropping] = useState(false)

  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    location: "",
    profile_photo_urls: [] as string[],
    interests: [] as string[],
    education: "",
    relationship_goal: "",
    horoscope: ""
  })
  
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || "",
        bio: profile.bio || "",
        location: profile.location || "",
        profile_photo_urls: profile.profile_photo_urls || [],
        interests: profile.interests || [],
        education: profile.education || "",
        relationship_goal: profile.relationship_goal || "",
        horoscope: profile.horoscope || ""
      })
    }
  }, [profile])

  const onCropComplete = useCallback((_area: any, pixels: any) => setCroppedAreaPixels(pixels), [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && activePhotoSlot !== null) {
      const reader = new FileReader()
      reader.onloadend = () => setImageToCrop(reader.result as string)
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const getCroppedImg = async () => {
    if (!imageToCrop || !croppedAreaPixels) return null;
    const image = new window.Image(); image.src = imageToCrop;
    await new Promise((resolve) => (image.onload = resolve));
    const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    canvas.width = croppedAreaPixels.width; canvas.height = croppedAreaPixels.height;
    ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, croppedAreaPixels.width, croppedAreaPixels.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  }

  const handleApplyCrop = async () => {
    if (!currentUser) return;
    setIsCropping(true)
    try {
      const croppedImage = await getCroppedImg()
      if (croppedImage && activePhotoSlot !== null) {
        const path = `profiles/${currentUser.id}/photo_${activePhotoSlot}_${Date.now()}.jpg`;
        const url = await uploadToSupabase(croppedImage, path);

        setFormData(prev => {
          const newUrls = [...prev.profile_photo_urls]; 
          if (activePhotoSlot < newUrls.length) {
            newUrls[activePhotoSlot] = url;
          } else {
            newUrls.push(url);
          }
          return { ...prev, profile_photo_urls: newUrls }
        });
        setImageToCrop(null); setActivePhotoSlot(null);
      }
    } catch (e) { 
      toast({ variant: "destructive", title: "Upload Error", description: "Could not save photo to storage." }) 
    } finally { 
      setIsCropping(false) 
    }
  }

  const removePhoto = (index: number) => {
    if (index === 0) { toast({ title: "Primary Photo Required" }); return }
    setFormData(prev => {
      const newUrls = [...prev.profile_photo_urls]; newUrls.splice(index, 1);
      return { ...prev, profile_photo_urls: newUrls }
    })
  }

  const toggleInterest = (interest: string) => {
    setFormData(prev => {
      const newInterests = prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest].slice(0, 5)
      return { ...prev, interests: newInterests }
    })
  }

  const handleSave = async () => {
    if (!currentUser || isSaving) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (error) throw error;
      
      toast({ title: "Profile Updated" })
      router.push("/profile")
    } catch (error: any) { 
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save changes." }); 
      setIsSaving(false) 
    }
  }

  if (isLoading) return <div className="flex h-svh items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  const extraPhotoSlots = [1, 2, 3, 4]

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 overflow-hidden">
      <header className="shrink-0 px-4 py-6 flex items-center bg-[#3BC1A8] z-50 shadow-lg text-white">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Edit Profile</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-8 pb-40 space-y-10 scroll-smooth">
        <section className="space-y-6">
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar className="w-40 h-40 shadow-xl border-4 border-white">
                <AvatarImage src={formData.profile_photo_urls[0] || ""} className="object-cover" />
                <AvatarFallback className="bg-gray-100 text-gray-300 text-4xl font-black">{formData.username?.[0] || <User className="w-16 h-16" />}</AvatarFallback>
              </Avatar>
              <button onClick={() => { setActivePhotoSlot(0); mainFileInputRef.current?.click(); }} className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center shadow-xl active:scale-90 transition-transform z-10 border-2 border-white"><Camera className="w-5 h-5 text-white" /></button>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mt-5">Main Photo</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-1">Gallery (Max 4 Extra)</h3>
            <div className="grid grid-cols-4 gap-3">
              {extraPhotoSlots.map((slotIndex) => {
                const photoUrl = formData.profile_photo_urls[slotIndex];
                return (
                  <div key={slotIndex} className="relative aspect-square">
                    {photoUrl ? (
                      <>
                        <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm"><Image src={photoUrl} alt="Extra" fill className="object-cover" /></div>
                        <button onClick={() => removePhoto(slotIndex)} className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-md active:scale-90 transition-all z-20"><X className="w-3 h-3" /></button>
                      </>
                    ) : (
                      <button onClick={() => { setActivePhotoSlot(slotIndex); extraPhotosInputRef.current?.click(); }} className="w-full h-full rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors"><Plus className="w-5 h-5 text-gray-300" /></button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <input type="file" ref={mainFileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          <input type="file" ref={extraPhotosInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        </section>

        <section className="space-y-6 bg-gray-50 p-7 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Full Name</Label>
            <Input value={formData.username} onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))} className="h-14 rounded-2xl bg-white border-gray-100 text-sm font-bold shadow-sm" />
          </div>
          
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Bio</Label>
            <Textarea value={formData.bio} onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))} className="min-h-[120px] rounded-2xl bg-white border-gray-100 text-sm font-bold shadow-sm py-4" />
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Country</Label>
            <Select value={formData.location} onValueChange={(val) => setFormData(prev => ({ ...prev, location: val }))}>
              <SelectTrigger className="h-14 rounded-2xl bg-white border-gray-100 text-sm font-bold shadow-sm"><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent className="rounded-2xl">{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Looking For</Label>
            <Select value={formData.relationship_goal} onValueChange={(val) => setFormData(prev => ({ ...prev, relationship_goal: val }))}>
              <SelectTrigger className="h-14 rounded-2xl bg-white border-gray-100 text-sm font-bold shadow-sm"><SelectValue placeholder="What are you seeking?" /></SelectTrigger>
              <SelectContent className="rounded-2xl">{LOOKING_FOR_OPTIONS.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Education</Label>
            <Select value={formData.education} onValueChange={(val) => setFormData(prev => ({ ...prev, education: val }))}>
              <SelectTrigger className="h-14 rounded-2xl bg-white border-gray-100 text-sm font-bold shadow-sm"><SelectValue placeholder="Level of education" /></SelectTrigger>
              <SelectContent className="rounded-2xl">{EDUCATION_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Zodiac Sign</Label>
            <Select value={formData.horoscope} onValueChange={(val) => setFormData(prev => ({ ...prev, horoscope: val }))}>
              <SelectTrigger className="h-14 rounded-2xl bg-white border-gray-100 text-sm font-bold shadow-sm"><SelectValue placeholder="Your star sign" /></SelectTrigger>
              <SelectContent className="rounded-2xl">{ZODIAC_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between ml-1">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Interests (Max 5)</Label>
              <span className="text-[9px] font-black text-gray-400">{formData.interests.length}/5</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {INTERESTS_OPTIONS.map(interest => {
                const isSelected = formData.interests.includes(interest);
                return (
                  <button 
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm",
                      isSelected 
                        ? "bg-primary text-white border-primary" 
                        : "bg-white text-gray-500 border-gray-100 hover:bg-gray-100"
                    )}
                  >
                    {interest}
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="shrink-0 fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 z-50">
        <div className="max-w-md mx-auto"><Button onClick={handleSave} disabled={isSaving} className="w-full h-16 rounded-full bg-primary text-white font-black text-lg gap-3 shadow-xl">{isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}Save Changes</Button></div>
      </footer>

      <Dialog open={!!imageToCrop} onOpenChange={(open) => !open && !isCropping && setImageToCrop(null)}>
        <DialogContent className="rounded-[2.5rem] bg-white border-none p-0 max-w-[95%] mx-auto shadow-2xl overflow-hidden">
          <div className="relative w-full aspect-square bg-zinc-950">{imageToCrop && <Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />}</div>
          <div className="p-6 space-y-6">
            <input type="range" value={zoom} min={1} max={3} step={0.1} aria-labelledby="Zoom" onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary" />
            <DialogFooter className="flex gap-3">
              <Button variant="ghost" onClick={() => setImageToCrop(null)} disabled={isCropping} className="flex-1 h-12 rounded-full font-black text-[10px] uppercase text-gray-400">Cancel</Button>
              <Button onClick={handleApplyCrop} disabled={isCropping} className="flex-1 h-12 rounded-full bg-zinc-900 text-white font-black text-[10px] uppercase shadow-xl">Apply</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
