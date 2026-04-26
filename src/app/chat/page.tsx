"use client"

import { useState, useEffect } from "react"
import { MessageSquare, CheckCircle, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { cn } from "@/lib/utils"

function ChatSessionItem({ session, currentUserId }: { session: any, currentUserId: string }) {
  const router = useRouter()
  const otherUserId = session.participants.find((p: string) => p !== currentUserId)
  const [otherUser, setOtherUser] = useState<any>(null)

  useEffect(() => {
    if (!otherUserId) return;
    const fetchOther = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', otherUserId).single();
      setOtherUser(data);
    };
    fetchOther();
  }, [otherUserId]);

  const name = otherUser?.username || "User"
  const image = (otherUser?.profile_photo_urls && otherUser.profile_photo_urls[0]) || ""

  return (
    <div 
      onClick={() => router.push(`/chat/${otherUserId}`)}
      className="flex items-center gap-4 py-4 hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer border-b border-gray-50"
    >
      <div className="relative shrink-0">
        <Avatar className="w-16 h-16 border-2 border-white shadow-sm bg-gray-50">
          {image && <AvatarImage src={image} className="object-cover" />}
          <AvatarFallback className="bg-gray-100 text-gray-300">{name[0]}</AvatarFallback>
        </Avatar>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-black text-base truncate text-[#3BC1A8]">{name}</h3>
            {otherUser?.is_verified && <CheckCircle className="w-4 h-4 text-blue-500 fill-current" />}
          </div>
        </div>
        <p className="text-[13px] truncate font-bold text-gray-400">
          {session.last_message || "Start a conversation"}
        </p>
      </div>
    </div>
  )
}

export default function ChatListPage() {
  const { user, isLoading } = useSupabaseUser()
  const [sessions, setSessions] = useState<any[]>([])
  const [isSyncing, setIsSyncing] = useState(true)

  useEffect(() => {
    if (!user) return;

    const fetchChats = async () => {
      const { data } = await supabase
        .from('chats')
        .select('*')
        .contains('participants', [user.id])
        .order('last_message_at', { ascending: false });
      setSessions(data || []);
      setIsSyncing(false);
    };

    fetchChats();

    const channel = supabase
      .channel('chat_list')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chats',
        filter: `participants=cs.{${user.id}}`
      }, () => {
        fetchChats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <div className="flex flex-col h-svh pb-20 bg-white">
      <header className="bg-[#3BC1A8] pt-[env(safe-area-inset-top)] pb-3 px-6 sticky top-0 z-20 shrink-0">
        <div className="flex items-center justify-between pt-6">
          <h1 className="text-3xl font-logo text-white drop-shadow-sm">Chats</h1>
          <div className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white fill-current" />
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 pt-2 bg-white overflow-y-auto">
        {isSyncing ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 opacity-10">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
        ) : sessions.length > 0 ? (
          sessions.map(s => <ChatSessionItem key={s.id} session={s} currentUserId={user!.id} />)
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400 font-medium gap-4">
            <MessageSquare className="w-10 h-10 text-gray-200" />
            <p className="text-sm font-black text-gray-900 uppercase tracking-widest">No messages yet</p>
          </div>
        )}
      </main>
    </div>
  )
}
