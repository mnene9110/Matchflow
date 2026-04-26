
"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Cropper from "react-easy-crop"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { uploadToSupabase } from "@/lib/storage"

const ROOM_CREATION_COST = 4000

export default function CreatePartyPage() {
  const router = useRouter()
  const { user: currentUser, profile } = useSupabaseUser()
  const { toast } = useToast()

  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    announcement: "",
    coverPhoto: "",
    maxSeats: "8"
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isCropping, setIsCropping] = useState(false)

  const onCropComplete = useCallback((_area: any, pixels: any) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setImageToCrop(reader.result as string)
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const getCroppedImg = async () => {
    if (!imageToCrop || !croppedAreaPixels) return null;
    const image = new window.Image()
    image.src = imageToCrop
    await new Promise((resolve) => (image.onload = resolve))
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    canvas.width = croppedAreaPixels.width
    canvas.height = croppedAreaPixels.height
    ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, croppedAreaPixels.width, croppedAreaPixels.height)
    return canvas.toDataURL("image/jpeg", 0.8)
  }

  const handleApplyCrop = async () => {
    setIsCropping(true)
    try {
      const croppedImage = await getCroppedImg()
      if (croppedImage) {
        setFormData(prev => ({ ...prev, coverPhoto: croppedImage }))
        setImageToCrop(null)
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Crop failed." })
    } finally {
      setIsCropping(false)
    }
  }

  const handleCreate = async () => {
    if (!currentUser || !profile || !formData.title.trim() || isCreating) return

    if ((profile.coin_balance || 0) < ROOM_CREATION_COST) {
      toast({ variant: "destructive", title: "Insufficient Coins", description: `You need ${ROOM_CREATION_COST} coins.` })
      return
    }

    setIsCreating(true)
    try {
      let finalCoverUrl = formData.coverPhoto;
      
      if (finalCoverUrl && finalCoverUrl.startsWith('data:')) {
        // Path: parties/USER_ID/cover_TIMESTAMP.jpg
        // This folder structure matches the RLS policy: index [2] is the auth.uid
        const path = `parties/${currentUser.id}/cover_${Date.now()}.jpg`;
        finalCoverUrl = await uploadToSupabase(finalCoverUrl, path);
      }

      const roomKey = `${formData.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}_${Date.now()}`;

      // Deduct coins and create room
      const { error: deductionError } = await supabase
        .from('profiles')
        .update({ coin_balance: profile.coin_balance - ROOM_CREATION_COST })
        .eq('id', currentUser.id);

      if (deductionError) throw deductionError;

      const { error: roomError } = await supabase
        .from('party_rooms')
        .insert({
          id: roomKey,
          title: formData.title,
          announcement: formData.announcement,
          cover_photo: finalCoverUrl,
          max_seats: Number(formData.maxSeats),
          host_id: currentUser.id,
          host_name: profile.username || "User",
          host_photo: (profile.profile_photo_urls && profile.profile_photo_urls[0]) || "",
          status: "active"
        });

      if (roomError) throw roomError;

      await supabase.from('transactions').insert({
        user_id: currentUser.id,
        type: "party_creation",
        amount: -ROOM_CREATION_COST,
        description: `Created Party Room: ${formData.title}`
      });

      toast({ title: "Party Live!", description: "Room created successfully." })
      router.push(`/party`)
    } catch (error: any) {
      console.error("Party create error:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to create party." })
    } finally {
      setIsCreating(false)
    }
  }

  const darkMaroon = "bg-[#5A1010]";

  return (
    <div className="flex flex-col h-svh bg-transparent text-gray-900 overflow-y-auto pb-20">
      <header className="px-4 py-8 flex items-center bg-transparent shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white h-10 w-10 bg-black/10 backdrop-blur-md rounded-full hover:bg-black/20"><ChevronLeft className="w-6 h-6" /></Button>
        <h1 className="text-xl font-black font-headline ml-4 tracking-widest uppercase text-white drop-shadow-md">Host a Party</h1>
      </header>

      <main className="flex-1 px-6 space-y-8 pt-4">
        <section className="space-y-4">
          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 ml-1">Party Cover</Label>
          <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-video rounded-[2.5rem] bg-white/40 backdrop-blur-xl border-4 border-white/60 flex items-center justify-center relative overflow-hidden group cursor-pointer shadow-2xl transition-all active:scale-95">
            {formData.coverPhoto ? (<Image src={formData.coverPhoto} alt="Cover" fill className="object-cover" />) : (<div className="flex flex-col items-center gap-3"><div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg"><Camera className="w-6 h-6 text-primary" /></div><span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Upload Cover</span></div>)}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
        </section>

        <div className="bg-white/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/50 shadow-2xl space-y-6">
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Party Name</Label>
            <Input placeholder="e.g., Chill Beats & Chat" value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value.slice(0, 20) }))} className="h-14 rounded-2xl bg-white/80 border-none text-sm font-bold shadow-inner focus-visible:ring-primary/30" />
          </div>
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Initial Capacity</Label>
            <Select value={formData.maxSeats} onValueChange={(v) => setFormData(p => ({ ...p, maxSeats: v }))}>
              <SelectTrigger className="h-14 rounded-2xl bg-white/80 border-none text-sm font-bold shadow-inner focus:ring-primary/30"><SelectValue placeholder="Select Seat Count" /></SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                <SelectItem value="4" className="font-bold">4 Seats</SelectItem>
                <SelectItem value="8" className="font-bold">8 Seats</SelectItem>
                <SelectItem value="12" className="font-bold">12 Seats</SelectItem>
                <SelectItem value="16" className="font-bold">16 Seats</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Announcement</Label>
            <Textarea placeholder="Welcome everyone to the party!" value={formData.announcement} onChange={(e) => setFormData(p => ({ ...p, announcement: e.target.value.slice(0, 200) }))} className="min-h-[120px] rounded-2xl bg-white/80 border-none text-sm font-bold shadow-inner focus-visible:ring-primary/30 py-4" />
          </div>
        </div>

        <div className="pt-6 pb-10">
          <Button onClick={handleCreate} disabled={!formData.title.trim() || isCreating} className={cn("w-full h-18 rounded-full text-white font-black text-lg shadow-2xl transition-all active:scale-95 gap-3", darkMaroon)}>
            {isCreating ? <Loader2 className="w-6 h-6 animate-spin" /> : (<><span>Create for {ROOM_CREATION_COST}</span><div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[10px] italic">S</div></>)}
          </Button>
        </div>
      </main>

      <Dialog open={!!imageToCrop} onOpenChange={(open) => !open && !isCropping && setImageToCrop(null)}>
        <DialogContent className="rounded-[2.5rem] bg-white border-none p-0 max-w-[95%] mx-auto shadow-2xl overflow-hidden">
          <DialogHeader className="p-6">
            <DialogTitle className="text-xl font-black font-headline text-center uppercase tracking-widest">Crop Cover</DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-video bg-zinc-950">{imageToCrop && <Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={16/9} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />}</div>
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
