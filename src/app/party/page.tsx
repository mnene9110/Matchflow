
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Music, Plus, Users, Loader2, Search, Heart, Sparkles, X, ArrowRight, ShieldCheck, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser, useDoc, useMemoFirebase, useFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { ref, onValue, off } from "firebase/database"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"

export default function PartyListPage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore, database } = useFirebase()
  const { toast } = useToast()

  const [parties, setParties] = useState<any[]>([])
  const [isPartiesLoading, setIsPartiesLoading] = useState(true)
  const [selectedParty, setSelectedParty] = useState<any | null>(null)

  const userProfileRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: profile } = useDoc(userProfileRef)

  useEffect(() => {
    if (!database || !currentUser) return

    const partiesRef = ref(database, 'partyRooms')
    
    // Use a variable to track if we've ever successfully loaded data to prevent 
    // showing connection errors during transient disconnects
    let hasSuccessfullyLoaded = false;

    const unsubscribe = onValue(partiesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        })).filter(p => p.status === 'active')
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        setParties(list)
        hasSuccessfullyLoaded = true;
      } else {
        setParties([])
      }
      setIsPartiesLoading(false)
    }, (error) => {
      // Only show error if we haven't managed to load anything yet or if it's a hard permission error
      if (!hasSuccessfullyLoaded) {
        console.error("Party Rooms listener failed:", error)
        setIsPartiesLoading(false)
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Could not sync with the party server. Please check your internet."
        })
      }
    })

    return () => off(partiesRef, "value", unsubscribe)
  }, [database, currentUser, toast])

  const handleHostClick = () => {
    if (!profile?.isPartyAdmin && !profile?.isAdmin) {
      toast({ variant: "destructive", title: "Access Denied", description: "Only Party Admins can create rooms." })
      return
    }
    router.push('/party/create')
  }

  const handleJoin = (partyId: string) => {
    router.push(`/party/${partyId}`)
    setSelectedParty(null)
  }

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
              onClick={handleHostClick}
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
                  onClick={() => setSelectedParty(party)}
                  className="group relative overflow-hidden bg-white border-2 border-gray-50 rounded-[2.5rem] p-6 shadow-sm active:scale-[0.98] transition-all hover:border-primary/20 cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-14 h-14 border-2 border-white shadow-md">
                        <AvatarImage src={party.coverPhoto || party.hostPhoto || `https://picsum.photos/seed/${party.hostId}/100/100`} className="object-cover" />
                        <AvatarFallback className="bg-primary text-white font-black text-xs">{party.hostName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-sm font-black text-gray-900 leading-tight group-hover:text-primary transition-colors">{party.title}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Host: {party.hostName}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] font-black text-green-600 uppercase tracking-tighter">{party.memberCount || 0} Online</span>
                      </div>
                      {party.tags && (
                        <span className="text-[8px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest">#{party.tags}</span>
                      )}
                    </div>
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

      {/* Party Details Preview Sheet */}
      <Sheet open={!!selectedParty} onOpenChange={(open) => !open && setSelectedParty(null)}>
        <SheetContent side="bottom" className="rounded-t-[3rem] p-0 border-none bg-white overflow-hidden flex flex-col max-h-[85svh]">
          <div className="relative h-48 w-full shrink-0">
            <img 
              src={selectedParty?.coverPhoto || selectedParty?.hostPhoto || `https://picsum.photos/seed/${selectedParty?.id}/600/400`} 
              className="w-full h-full object-cover"
              alt="Party Cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/30" />
            <button 
              onClick={() => setSelectedParty(null)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 px-8 pt-6 pb-10 space-y-8 overflow-y-auto">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-2xl font-black font-headline tracking-tight text-gray-900">{selectedParty?.title}</h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black text-green-600 uppercase tracking-tighter">{selectedParty?.memberCount || 0} Online</span>
                  </div>
                  {selectedParty?.tags && (
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">#{selectedParty.tags}</span>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Music className="w-6 h-6 text-primary" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-[10px] font-black uppercase tracking-widest">Party Announcement</span>
              </div>
              <div className="bg-gray-50/80 p-6 rounded-[2rem] border border-gray-100">
                <p className="text-sm font-medium text-gray-600 leading-relaxed italic">
                  "{selectedParty?.announcement || "Welcome to the party! Let's have a great time and respect everyone in the room."}"
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-[2.25rem] shadow-sm">
              <Avatar className="w-14 h-14 border-2 border-white shadow-md">
                <AvatarImage src={selectedParty?.hostPhoto} className="object-cover" />
                <AvatarFallback className="bg-zinc-100 text-zinc-400 font-black text-sm">{selectedParty?.hostName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-black text-gray-900">{selectedParty?.hostName}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Party Host</span>
              </div>
            </div>
          </div>

          <div className="p-8 bg-white border-t border-gray-50 shrink-0">
            <Button 
              onClick={() => handleJoin(selectedParty.id)}
              className="w-full h-16 rounded-full bg-zinc-900 text-white font-black text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              Join Room
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
