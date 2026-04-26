
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Music, Plus, Users, Loader2, X, ArrowRight, Lock, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFirebase } from "@/firebase/provider"
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

export default function PartyListPage() {
  const router = useRouter()
  const { firestore } = useFirebase()
  const { user: currentUser, profile } = useSupabaseUser()
  const { toast } = useToast()

  const [parties, setParties] = useState<any[]>([])
  const [isPartiesLoading, setIsPartiesLoading] = useState(true)
  const [selectedParty, setSelectedParty] = useState<any | null>(null)
  
  const [passwordTarget, setPasswordTarget] = useState<any | null>(null)
  const [enteredPassword, setEnteredPassword] = useState("")

  useEffect(() => {
    if (!currentUser) return

    const partiesQuery = query(
      collection(firestore, "partyRooms"),
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(partiesQuery, (snapshot) => {
      const pList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setParties(pList);
      setIsPartiesLoading(false);
    }, (error) => {
      console.error("Parties fetch failed:", error);
      setIsPartiesLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, firestore])

  const handleHostClick = () => {
    if (!profile?.isPartyAdmin && !profile?.isAdmin) {
      router.push('/profile/subscribe-host')
      return
    }
    router.push('/party/create')
  }

  const handleJoinAttempt = (party: any) => {
    if (party.hostId === currentUser?.id || profile?.isSupport || profile?.isAdmin) {
      router.push(`/party/${party.id}`)
      return
    }

    if (party.isLocked) {
      setPasswordTarget(party)
      setSelectedParty(null)
      return
    }
    
    router.push(`/party/${party.id}`)
    setSelectedParty(null)
  }

  const handlePasswordSubmit = () => {
    if (!passwordTarget) return
    if (enteredPassword === passwordTarget.password) {
      router.push(`/party/${passwordTarget.id}`)
      setPasswordTarget(null)
      setEnteredPassword("")
    } else {
      toast({ variant: "destructive", title: "Access Denied", description: "Incorrect room password." })
    }
  }

  return (
    <div className="flex flex-col h-svh bg-transparent text-gray-900 overflow-hidden relative">
      <header className="px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-6 flex items-center justify-between sticky top-0 bg-transparent z-20 shrink-0">
        <h1 className="text-3xl font-logo text-white relative flex items-center gap-2 drop-shadow-sm pt-6">
          Party
          <Music className="w-6 h-6 text-white/30" />
        </h1>
        <div className="flex items-center gap-2 pt-6">
          <Button 
            onClick={handleHostClick}
            className="h-10 px-4 rounded-full bg-white text-[#3BC1A8] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Host Room
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 bg-white rounded-t-[3rem] shadow-2xl pt-8 pb-32 overflow-y-auto scroll-smooth">
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary/40" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Available Rooms</h2>
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
                  onClick={() => setSelectedParty(party)}
                  className="group relative overflow-hidden bg-white border-2 border-gray-50 rounded-[2.5rem] p-6 shadow-sm active:scale-[0.98] transition-all hover:border-primary/20 cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-14 h-14 border-2 border-white shadow-md">
                        <AvatarImage src={party.coverPhoto || party.hostPhoto} className="object-cover" />
                        <AvatarFallback className="bg-primary text-white font-black text-xs">{party.hostName?.[0] || 'P'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-black text-gray-900 leading-tight group-hover:text-primary transition-colors">{party.title}</h3>
                          {party.isLocked && <Lock className="w-3 h-3 text-amber-500" />}
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Host: {party.hostName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[9px] font-black text-green-600 uppercase tracking-tighter">{party.memberCount || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center opacity-30">
              <Music className="w-12 h-12 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">No Active Parties</p>
            </div>
          )}
        </section>
      </main>

      <Sheet open={!!selectedParty} onOpenChange={(open) => !open && setSelectedParty(null)}>
        <SheetContent side="bottom" className="rounded-t-[3rem] p-0 border-none bg-white overflow-hidden flex flex-col max-h-[85svh]">
          <SheetHeader className="sr-only">
            <SheetTitle>Party Details</SheetTitle>
            <SheetDescription>Preview room info</SheetDescription>
          </SheetHeader>
          
          <div className="relative h-48 w-full shrink-0">
            <img src={selectedParty?.coverPhoto || `https://picsum.photos/seed/${selectedParty?.id}/600/400`} className="w-full h-full object-cover" alt="Cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/30" />
            <button onClick={() => setSelectedParty(null)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 px-8 pt-6 pb-10 space-y-8 overflow-y-auto">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black font-headline text-gray-900">{selectedParty?.title}</h2>
                  {selectedParty?.isLocked && <Lock className="w-5 h-5 text-amber-500" />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-green-600 uppercase bg-green-50 px-2.5 py-1 rounded-full">{selectedParty?.memberCount || 0} Online</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50/80 p-6 rounded-[2rem] border border-gray-100">
              <p className="text-sm font-medium text-gray-600 leading-relaxed italic">"{selectedParty?.announcement || "Welcome to the party!"}"</p>
            </div>

            <div className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-[2.25rem]">
              <Avatar className="w-14 h-14 border-2 border-white shadow-md"><AvatarImage src={selectedParty?.hostPhoto} /><AvatarFallback>P</AvatarFallback></Avatar>
              <div className="flex-1">
                <span className="text-[13px] font-black text-gray-900 block">{selectedParty?.hostName}</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Party Host</span>
              </div>
            </div>
          </div>

          <div className="p-8 bg-white border-t border-gray-50">
            <Button 
              onClick={() => handleJoinAttempt(selectedParty)}
              className="w-full h-16 rounded-full bg-zinc-900 text-white font-black text-lg shadow-2xl active:scale-95 flex items-center justify-center gap-3"
            >
              Join Room
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!passwordTarget} onOpenChange={(open) => !open && setPasswordTarget(null)}>
        <DialogContent className="rounded-[2.5rem] bg-white border-none p-8 max-w-[85%] mx-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black font-headline text-gray-900 text-center uppercase tracking-widest">Enter Password</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <Input 
                type="password"
                placeholder="Room Password" 
                value={enteredPassword}
                onChange={(e) => setEnteredPassword(e.target.value)}
                className="h-14 pl-12 rounded-2xl bg-gray-50 border-none text-center font-black tracking-widest"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2">
            <Button onClick={handlePasswordSubmit} className="h-14 rounded-full bg-zinc-900 text-white font-black uppercase text-xs tracking-widest w-full">Join Room</Button>
            <Button variant="ghost" onClick={() => setPasswordTarget(null)} className="h-12 rounded-full text-gray-400 font-black uppercase text-[10px]">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
