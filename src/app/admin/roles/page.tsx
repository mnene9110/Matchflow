
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Search, Loader2, ShieldCheck, UserCheck, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, query, collection, where, getDocs, updateDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export default function ManageRolesPage() {
  const router = useRouter()
  const { user: currentUser } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  const [targetNumericId, setTargetNumericId] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [foundUser, setFoundUser] = useState<any>(null)
  const [selectedRole, setSelectedRole] = useState<string>("")

  const currentUserRef = useMemoFirebase(() => currentUser ? doc(firestore, "userProfiles", currentUser.uid) : null, [firestore, currentUser])
  const { data: adminProfile } = useDoc(currentUserRef)

  if (!adminProfile?.isAdmin && !isSearching) {
    return <div className="flex h-svh items-center justify-center bg-white text-zinc-400 font-black uppercase text-xs tracking-widest">Access Denied</div>
  }

  const handleSearch = async () => {
    if (!targetNumericId.trim()) return
    setIsSearching(true)
    setFoundUser(null)
    
    try {
      const q = query(collection(firestore, "userProfiles"), where("numericId", "==", Number(targetNumericId)))
      const snap = await getDocs(q)
      
      if (snap.empty) {
        toast({ variant: "destructive", title: "User not found", description: "No profile matches that ID." })
      } else {
        const u = snap.docs[0].data()
        setFoundUser({ ...u, docId: snap.docs[0].id })
        // Set initial selected role based on current state
        if (u.isSupport) setSelectedRole("support")
        else if (u.isCoinseller) setSelectedRole("coinseller")
        else setSelectedRole("none")
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Search failed", description: "Database error occurred." })
    } finally {
      setIsSearching(false)
    }
  }

  const handleUpdateRole = async () => {
    if (!foundUser || !selectedRole || isUpdating) return
    setIsUpdating(true)

    try {
      const userRef = doc(firestore, "userProfiles", foundUser.docId)
      await updateDoc(userRef, {
        isSupport: selectedRole === "support",
        isCoinseller: selectedRole === "coinseller",
        updatedAt: new Date().toISOString()
      })
      toast({ title: "Role Updated", description: "User privileges have been saved." })
      setFoundUser(null)
      setTargetNumericId("")
    } catch (error) {
      toast({ variant: "destructive", title: "Update failed", description: "Could not save changes." })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex flex-col min-h-svh bg-transparent text-gray-900">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-transparent z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-gray-900 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Manage Roles</h1>
      </header>

      <main className="flex-1 px-6 pt-4 pb-20 space-y-8">
        <section className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary ml-1">Find User by ID</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder="Enter Numeric ID" 
                  value={targetNumericId}
                  onChange={(e) => setTargetNumericId(e.target.value)}
                  className="h-14 pl-12 rounded-2xl bg-white/40 border-white/40 text-sm font-bold shadow-sm"
                  type="number"
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !targetNumericId}
                className="h-14 w-14 rounded-2xl bg-zinc-900 hover:bg-black transition-all"
              >
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </section>

        {foundUser && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="p-6 bg-white/60 backdrop-blur-xl border border-white rounded-[2.5rem] shadow-xl flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                 <UserCheck className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-lg text-gray-900 truncate leading-tight">{foundUser.username}</h3>
                <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">ID: {foundUser.numericId}</p>
                <div className="flex gap-2 mt-2">
                   {foundUser.isSupport && <span className="text-[8px] font-black bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase">Support</span>}
                   {foundUser.isCoinseller && <span className="text-[8px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">Coinseller</span>}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Select New Position</Label>
              <RadioGroup value={selectedRole} onValueChange={setSelectedRole} className="grid grid-cols-1 gap-3">
                <div className="flex items-center space-x-3 bg-white/40 p-5 rounded-[1.75rem] border border-white/60 hover:bg-white/60 cursor-pointer transition-colors">
                  <RadioGroupItem value="support" id="role_support" />
                  <Label htmlFor="role_support" className="flex-1 font-black text-sm uppercase tracking-wide cursor-pointer">Support Agent</Label>
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex items-center space-x-3 bg-white/40 p-5 rounded-[1.75rem] border border-white/60 hover:bg-white/60 cursor-pointer transition-colors">
                  <RadioGroupItem value="coinseller" id="role_coinseller" />
                  <Label htmlFor="role_coinseller" className="flex-1 font-black text-sm uppercase tracking-wide cursor-pointer">Official Coinseller</Label>
                  <Coins className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex items-center space-x-3 bg-white/40 p-5 rounded-[1.75rem] border border-white/60 hover:bg-white/60 cursor-pointer transition-colors">
                  <RadioGroupItem value="none" id="role_none" />
                  <Label htmlFor="role_none" className="flex-1 font-black text-sm uppercase tracking-wide cursor-pointer">Regular User</Label>
                </div>
              </RadioGroup>
            </div>

            <Button 
              className="w-full h-16 rounded-full bg-zinc-900 hover:bg-black text-white font-black text-lg shadow-2xl active:scale-95 transition-all"
              onClick={handleUpdateRole}
              disabled={isUpdating || !selectedRole}
            >
              {isUpdating ? <Loader2 className="w-6 h-6 animate-spin" /> : "Apply Position"}
            </Button>
          </section>
        )}

        {!foundUser && !isSearching && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-30">
            <ShieldAlert className="w-16 h-16 text-gray-300" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] max-w-[200px]">Enter a User ID to start managing roles</p>
          </div>
        )}
      </main>
    </div>
  )
}
