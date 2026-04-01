
"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, Ban, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCollection, useFirebase, useUser, useMemoFirebase, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function BlockedListPage() {
  const router = useRouter()
  const { user } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()

  const blockedQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "userProfiles", user.uid, "blockedUsers")
  }, [firestore, user])

  const { data: blockedUsers, isLoading } = useCollection(blockedQuery)

  const handleUnblock = async (blockedUserId: string, username: string) => {
    if (!user) return
    try {
      const blockRef = doc(firestore, "userProfiles", user.uid, "blockedUsers", blockedUserId)
      deleteDocumentNonBlocking(blockRef)
      toast({
        title: "User Unblocked",
        description: `${username} has been unblocked.`,
      })
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to unblock user." })
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
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Blocked List</h1>
      </header>

      <main className="flex-1 px-6 pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading...</span>
          </div>
        ) : blockedUsers && blockedUsers.length > 0 ? (
          <div className="space-y-3">
            {blockedUsers.map((item: any) => (
              <div 
                key={item.id} 
                className="bg-white/40 backdrop-blur-md border border-white/40 p-4 rounded-[1.75rem] flex items-center gap-4 shadow-sm"
              >
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-gray-100 text-gray-400">
                    {item.username?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-gray-900 truncate">
                    {item.username}
                  </h3>
                </div>

                <Button 
                  size="sm"
                  variant="ghost"
                  onClick={() => handleUnblock(item.id, item.username)}
                  className="h-10 px-4 rounded-full bg-green-50 text-green-600 hover:bg-green-100 font-bold text-[10px] uppercase tracking-wider gap-2"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Unblock
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center border border-white/30">
              <Ban className="w-8 h-8 text-gray-200" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900 uppercase">Your list is clear</h3>
              <p className="text-[10px] font-bold text-gray-400 max-w-[180px] mx-auto uppercase tracking-tighter">
                You haven't blocked any users yet.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
