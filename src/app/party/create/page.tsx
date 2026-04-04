
"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, Loader2, Camera, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useUser, useDoc, useMemoFirebase, useFirebase } from "@/firebase"
import { doc, collection, writeBatch, increment as firestoreIncrement } from "firebase/firestore"
import { ref, update, runTransaction as runRtdbTransaction, serverTimestamp as rtdbTimestamp } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Cropper from "react-easy-crop"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

const ROOM_CREATION_COST = 4000

export default function CreatePartyPage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore, database } = useFirebase()
  const { toast } = useToast()

  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    tags: "",
    announcement: "",
    coverPhoto: ""
  })

  // Photo Crop State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isCropping, setIsCropping] = useState(false)

  const userProfileRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: profile } = useDoc(userProfileRef)

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
      toast({ variant: "destructive", title: "Error", description: "Failed to crop image." })
    } finally {
      setIsCropping(false)
    }
  }

  const handleCreate = async () => {
    if (!currentUser || !profile || !formData.title.trim() || isCreating || !database) return

    setIsCreating(true)
    try {
      const userCoinRef = ref(database, `users/${currentUser.uid}/coinBalance`)
      const balanceResult = await runRtdbTransaction(userCoinRef, (current) => {
        if (current === null) return current
        if (current < ROOM_CREATION_COST) return undefined
        return current - ROOM_CREATION_COST
      })

      if (!balanceResult.committed) throw new Error("INSUFFICIENT_COINS")

      const roomKey = formData.title.toLowerCase().replace(/[^a-z0-9]/g, '-') + '_' + Date.now()
      const roomData = {
        id: roomKey,
        title: formData.title,
        tags: formData.tags,
        announcement: formData.announcement,
        coverPhoto: formData.coverPhoto,
        hostId: currentUser.uid,
        hostName: profile.username || "Admin",
        hostPhoto: (profile.profilePhotoUrls && profile.profilePhotoUrls[0]) || "",
        memberCount: 0,
        createdAt: rtdbTimestamp(),
        status: "active"
      }

      await update(ref(database), {
        [`partyRooms/${roomKey}`]: roomData
      })

      const batch = writeBatch(firestore)
      const txRef = doc(collection(userProfileRef!, "transactions"))
      batch.set(txRef, {
        id: txRef.id,
        type: "party_creation",
        amount: -ROOM_CREATION_COST,
        transactionDate: new Date().toISOString(),
        description: `Created Party Room: ${formData.title}`
      })

      batch.update(userProfileRef!, {
        coinBalance: firestoreIncrement(-ROOM_CREATION_COST),
        updatedAt: new Date().toISOString()
      })

      await batch.commit()

      toast({ title: "Party Created!", description: "Your room is now live." })
      router.push(`/party/${roomKey}`)
    } catch (error: any) {
      if (error.message === "INSUFFICIENT_COINS") {
        toast({ variant: "destructive", title: "Insufficient Coins", description: `You need ${ROOM_CREATION_COST} coins to create a room.` })
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to create party room." })
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-col h-svh bg-white text-gray-900 overflow-y-auto pb-20">
      <header className="px-4 py-6 flex items-center bg-white sticky top-0 z-50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-gray-900 h-10 w-10 bg-gray-100 rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-black font-headline ml-4 tracking-tight">Create Party</h1>
      </header>

      <main className="flex-1 px-6 space-y-10 pt-4">
        {/* Party Cover Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-black font-headline">Party Cover</h2>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-32 aspect-square rounded-[2rem] bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden group cursor-pointer active:scale-95 transition-all"
          >
            {formData.coverPhoto ? (
              <Image src={formData.coverPhoto} alt="Cover" fill className="object-cover" />
            ) : (
              <Plus className="w-8 h-8 text-gray-300 group-hover:text-primary transition-colors" />
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>
        </section>

        {/* Party Name Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-black font-headline">Party Name</h2>
          <div className="relative">
            <Input 
              placeholder="Create a name for your party" 
              value={formData.title}
              onChange={(e) => setFormData(p => ({ ...prev, title: e.target.value.slice(0, 20) }))}
              className="h-14 rounded-full bg-gray-50 border-none px-6 text-sm font-medium pr-16"
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-300 uppercase">{formData.title.length}/20</span>
          </div>
        </section>

        {/* Party Tag Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-black font-headline">Party Tag</h2>
          <div className="relative">
            <Input 
              placeholder="Set tags for your party" 
              value={formData.tags}
              onChange={(e) => setFormData(p => ({ ...prev, tags: e.target.value.slice(0, 10) }))}
              className="h-14 rounded-full bg-gray-50 border-none px-6 text-sm font-medium pr-16"
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-300 uppercase">{formData.tags.length}/10</span>
          </div>
        </section>

        {/* Party Announcement Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-black font-headline">Party Announcement</h2>
          <div className="relative">
            <Textarea 
              placeholder="Write an Announcement for your Party" 
              value={formData.announcement}
              onChange={(e) => setFormData(p => ({ ...prev, announcement: e.target.value.slice(0, 200) }))}
              className="min-h-[140px] rounded-[2rem] bg-gray-50 border-none p-6 text-sm font-medium resize-none pb-10"
            />
            <span className="absolute bottom-4 right-6 text-[10px] font-bold text-gray-300 uppercase">{formData.announcement.length}/200</span>
          </div>
        </section>

        {/* Review Method Section */}
        <section className="flex items-center justify-between py-2 cursor-not-allowed opacity-60">
          <h2 className="text-xl font-black font-headline">Review Method</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">Pass Automatically</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </section>

        {/* Footer Info & Button */}
        <div className="pt-10 flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900">Creating a party consumes: {ROOM_CREATION_COST}</p>
            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-black text-white italic">S</div>
          </div>

          <Button 
            onClick={handleCreate}
            disabled={!formData.title.trim() || isCreating}
            className="w-full h-16 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-black text-lg transition-all active:scale-95"
          >
            {isCreating ? <Loader2 className="w-6 h-6 animate-spin" /> : "Create Party"}
          </Button>
        </div>
      </main>

      {/* Photo Cropper Dialog */}
      <Dialog open={!!imageToCrop} onOpenChange={(open) => !open && !isCropping && setImageToCrop(null)}>
        <DialogContent className="rounded-[2.5rem] bg-white border-none p-0 max-w-[95%] mx-auto shadow-2xl overflow-hidden">
          <DialogHeader className="p-6"><DialogTitle className="text-xl font-black font-headline text-center uppercase tracking-widest">Crop Cover</DialogTitle></DialogHeader>
          <div className="relative w-full aspect-square bg-zinc-950">
            {imageToCrop && <Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />}
          </div>
          <div className="p-6 space-y-6">
            <input type="range" value={zoom} min={1} max={3} step={0.1} aria-labelledby="Zoom" onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary" />
            <DialogFooter className="flex gap-3">
              <Button variant="ghost" onClick={() => setImageToCrop(null)} disabled={isCropping} className="flex-1 h-12 rounded-full font-black text-[10px] uppercase text-gray-400">Cancel</Button>
              <Button onClick={handleApplyCrop} disabled={isCropping} className="flex-1 h-12 rounded-full bg-zinc-900 text-white font-black text-[10px] uppercase shadow-xl">
                {isCropping ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
