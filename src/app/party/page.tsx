
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Music, Plus, Users, Loader2, Search, Heart, Sparkles, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser, useDoc, useMemoFirebase, useFirebase } from "@/firebase"
import { doc, writeBatch, increment as firestoreIncrement, collection } from "firebase/firestore"
import { ref, onValue, update, runTransaction as runRtdbTransaction, serverTimestamp as rtdbTimestamp } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"

const ROOM_CREATION_COST = 4000

export default function PartyListPage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore, database } = useFirebase()
  const { toast } = useToast()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [roomTitle, setRoomTitle] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [parties, setParties] = useState<any[]>([])
  const [isPartiesLoading, setIsPartiesLoading] = useState(true)

  const userProfileRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: profile } = useDoc(userProfileRef)

  useEffect(() => {
    // Only start listener if database and user are ready to prevent rule blocks
    if (!database || !currentUser) return

    const partiesRef = ref(database, 'partyRooms')
    const unsubscribe = onValue(partiesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        })).filter(p => p.status === 'active')
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        setParties(list)
      } else {
        setParties([])
      }
      setIsPartiesLoading(false)
    }, (error) => {
      console.error("Party Rooms listener failed:", error)
      setIsPartiesLoading(false)
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to load party rooms. Please try again."
      })
    })

    return () => unsubscribe()
  }, [database, currentUser, toast])

  const handleCreateRoom = async () => {
    if (!currentUser || !profile || !roomTitle.trim() || isCreating || !database) return

    if (!profile.isPartyAdmin && !profile.isAdmin) {
      toast({ variant: "destructive", title: "Access Denied", description: "Only Party Admins can create rooms." })
      return
    }

    setIsCreating(true)
    try {
      // 1. RTDB Atomic Transaction for Balance Check & Deduction
      const userCoinRef = ref(database, `users/${currentUser.uid}/coinBalance`)
      const balanceResult = await runRtdbTransaction(userCoinRef, (current) => {
        if (current === null) return current
        if (current < ROOM_CREATION_COST) return undefined
        return current - ROOM_CREATION_COST
      })

      if (!balanceResult.committed) throw new Error("INSUFFICIENT_COINS")

      // 2. Create Room in RTDB
      const roomKey = roomTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') + '_' + Date.now()
      const roomRef = ref(database, `partyRooms/${roomKey}`)
      const roomData = {
        id: roomKey,
        title: roomTitle,
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

      // 3. Firestore Backup Sync (Log Transaction)
      const batch = writeBatch(firestore)
      const txRef = doc(collection(userProfileRef!, "transactions"))
      batch.set(txRef, {
        id: txRef.id,
        type: "party_creation",
        amount: -ROOM_CREATION_COST,
        transactionDate: new Date().toISOString(),
        description: `Created Party Room: ${roomTitle}`
      })

      batch.update(userProfileRef!, {
        coinBalance: firestoreIncrement(-ROOM_CREATION_COST),
        updatedAt: new Date().toISOString()
      })

      await batch.commit()

      toast({ title: "Party Created!", description: "Your room is now live." })
      setIsCreateOpen(false)
      setRoomTitle("")
      router.push(`/party/${roomKey}`)
    } catch (error: any) {
      if (error.message === "INSUFFICIENT_COINS") {
        toast({ variant: "destructive", title: "Insufficient Coins", description: "You need 4,000 coins to create a room." })
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to create party room." })
      }
    } finally {
      setIsCreating(false)
    }
  }

  const darkMaroon = "bg-[#5A1010]";

  return (
    <div className="flex flex-col h-svh bg-transparent text-gray-900 overflow-hidden relative">
      <header className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-transparent z-20 shrink-0">
        <h1 className="text-3xl font-logo text-white relative flex items-center gap-2 drop-shadow-sm">
          Party
          <Music className="w-6 h-6 text-white/30" />
        </h1>
        <div className="flex items-center gap-2">
          {(profile?.isPartyAdmin || profile?.isAdmin) && (
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="h-10 px-4 rounded-full bg-white text-[#5A1010] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Host Room
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 bg-white rounded-t-[3rem] shadow-2xl pt-8 pb-32 overflow-y-auto scroll-smooth">
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary/40" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Available Rooms</h2>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/5 rounded-full border border-primary/10">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[8px] font-black text-primary uppercase tracking-widest">Live Now</span>
            </div>
          </div>

          {isPartiesLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : parties && parties.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {parties.map((party: any) => (
                <div 
                  key={party.id}
                  className="group relative overflow-hidden bg-white border-2 border-gray-50 rounded-[2.5rem] p-6 shadow-sm active:scale-[0.98] transition-all hover:border-primary/20"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-14 h-14 border-2 border-white shadow-md">
                        <AvatarImage src={party.hostPhoto || `https://picsum.photos/seed/${party.hostId}/100/100`} className="object-cover" />
                        <AvatarFallback className="bg-primary text-white font-black text-xs">{party.hostName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-sm font-black text-gray-900 leading-tight group-hover:text-primary transition-colors">{party.title}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Host: {party.hostName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[9px] font-black text-green-600 uppercase tracking-tighter">{party.memberCount || 0} Online</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => router.push(`/party/${party.id}`)}
                      className="flex-1 h-12 rounded-full bg-zinc-900 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      Join Room
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 opacity-30">
              <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center border border-gray-100">
                <Music className="w-8 h-8 text-gray-300" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-gray-900 uppercase">No Active Parties</h3>
                <p className="text-[10px] font-bold text-gray-400 max-w-[180px] mx-auto uppercase tracking-tighter">
                  Check back later or start your own party!
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="rounded-[3rem] bg-white border-none p-8 max-w-[90%] mx-auto shadow-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-black font-headline text-gray-900 text-center">Host a Party</DialogTitle>
            <DialogDescription className="text-center text-gray-500 font-medium text-xs leading-relaxed">
              Create a group room for 24 hours. Cost: <span className="text-primary font-black">4,000 Coins</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Room Title</label>
              <Input 
                placeholder="What's the vibe?" 
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                className="h-14 rounded-2xl bg-gray-50 border-none px-6 text-sm font-bold shadow-inner"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-3">
            <Button 
              onClick={handleCreateRoom}
              disabled={!roomTitle.trim() || isCreating}
              className={cn("w-full h-16 rounded-full text-white font-black text-lg shadow-xl gap-3", darkMaroon)}
            >
              {isCreating ? <Loader2 className="w-6 h-6 animate-spin" /> : "Start Party"}
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setIsCreateOpen(false)}
              className="w-full h-12 rounded-full text-gray-400 font-black uppercase text-[10px] tracking-widest"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
