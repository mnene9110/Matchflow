
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, Ban, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function BlockedListPage() {
  const router = useRouter()
  const { user } = useSupabaseUser()
  const { toast } = useToast()

  const [blockedUsers, setBlockedUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchBlocked = async () => {
      try {
        const { data, error } = await supabase
          .from('blocked_users')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        setBlockedUsers(data || []);
      } catch (err) {
        console.error("Failed to fetch blocked users:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlocked();
  }, [user])

  const handleUnblock = async (blockId: string, username: string) => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(u => u.id !== blockId));
      toast({
        title: "User Unblocked",
        description: `${username} has been unblocked.`,
      })
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to unblock user." })
    }
  }

  return (
    <div className="flex flex-col min-h-svh bg-white text-gray-900">
      <header className="px-4 py-6 flex items-center sticky top-0 bg-[#3BC1A8] z-10 shadow-lg text-white">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-white h-10 w-10 bg-white/20 backdrop-blur-md rounded-full shadow-sm hover:bg-white/30"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black font-headline ml-4 tracking-widest uppercase">Blocked List</h1>
      </header>

      <main className="flex-1 px-6 pb-20 pt-8">
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
                className="bg-gray-50 border border-gray-100 p-4 rounded-[1.75rem] flex items-center gap-4 shadow-sm"
              >
                <Avatar className="w-10 h-10 border border-white">
                  <AvatarFallback className="bg-gray-100 text-gray-400 font-black">
                    {item.username?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-gray-900 truncate uppercase">
                    {item.username}
                  </h3>
                </div>

                <Button 
                  size="sm"
                  variant="ghost"
                  onClick={() => handleUnblock(item.id, item.username)}
                  className="h-10 px-4 rounded-full bg-green-50 text-green-600 hover:bg-green-100 font-black text-[9px] uppercase tracking-widest gap-2"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Unblock
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-[2.5rem] flex items-center justify-center border border-gray-100">
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
