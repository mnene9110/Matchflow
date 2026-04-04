
"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Mic, MicOff, Video, VideoOff, LogOut, Loader2, Users, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase"
import { doc, updateDoc, increment as firestoreIncrement } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getZegoConfig } from "@/app/actions/zego"

let ZegoExpressEngine: any = null;

export default function PartyRoomPage() {
  const params = useParams()
  const roomId = params?.id as string
  const router = useRouter()
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()

  const [isJoined, setIsJoined] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [remoteUsers, setRemoteUsers] = useState<any[]>([])

  const zegoEngineRef = useRef<any>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  const roomRef = useMemoFirebase(() => roomId ? doc(firestore, "partyRooms", roomId) : null, [firestore, roomId])
  const { data: room, isLoading: isRoomLoading } = useDoc(roomRef)

  useEffect(() => {
    if (typeof window !== "undefined") {
      import('zego-express-engine-webrtc').then((module) => {
        ZegoExpressEngine = module.ZegoExpressEngine;
        initZego();
      });
    }
    return () => {
      handleLeave();
    };
  }, []);

  const initZego = async () => {
    if (!currentUser || !roomId || !ZegoExpressEngine) return;

    try {
      const config = await getZegoConfig();
      const zg = new ZegoExpressEngine(config.appID, config.server);
      zegoEngineRef.current = zg;

      // Handle remote streams
      zg.on('roomStreamUpdate', async (roomID: string, updateType: string, streamList: any[]) => {
        if (updateType === 'ADD') {
          streamList.forEach(stream => {
            setRemoteUsers(prev => {
              if (prev.find(u => u.streamID === stream.streamID)) return prev;
              return [...prev, { streamID: stream.streamID, userId: stream.user.userID }];
            });
            // Auto-play remote audio
            zg.startPlayingStream(stream.streamID).then((remoteStream: MediaStream) => {
              const audio = new Audio();
              audio.srcObject = remoteStream;
              audio.play().catch(e => console.warn("Autoplay audio blocked", e));
            });
          });
        } else if (updateType === 'DELETE') {
          streamList.forEach(stream => {
            zg.stopPlayingStream(stream.streamID);
            setRemoteUsers(prev => prev.filter(u => u.streamID !== stream.streamID));
          });
        }
      });

      // Login to room
      await zg.loginRoom(roomId, currentUser.uid, { userName: currentUser.displayName || 'User' }, { userUpdate: true });
      
      // Start publishing local audio
      const localStream = await zg.createStream({ camera: { audio: true, video: false } });
      localStreamRef.current = localStream;
      zg.startPublishingStream(`stream_${currentUser.uid}`, localStream);

      setIsJoined(true);
      setIsConnecting(false);

      if (roomRef) {
        updateDoc(roomRef, { 
          memberCount: firestoreIncrement(1),
          updatedAt: new Date().toISOString()
        }).catch(e => console.error("Failed to update member count", e));
      }

    } catch (error: any) {
      console.error("Zego Join Error:", error);
      toast({ variant: "destructive", title: "Join Failed", description: "Check your ZegoCloud configuration or camera permissions." });
      router.back();
    }
  }

  const toggleMic = () => {
    if (!zegoEngineRef.current || !localStreamRef.current) return;
    const zg = zegoEngineRef.current;
    if (isMicOn) {
      zg.mutePublishStreamAudio(localStreamRef.current, true);
    } else {
      zg.mutePublishStreamAudio(localStreamRef.current, false);
    }
    setIsMicOn(!isMicOn);
  }

  const handleLeave = async () => {
    if (zegoEngineRef.current) {
      const zg = zegoEngineRef.current;
      if (localStreamRef.current) {
        try {
          zg.stopPublishingStream(`stream_${currentUser?.uid}`);
          zg.destroyStream(localStreamRef.current);
        } catch (e) {}
      }
      try {
        zg.logoutRoom(roomId);
      } catch (e) {}
    }
    
    if (roomRef && isJoined) {
      updateDoc(roomRef, { 
        memberCount: firestoreIncrement(-1),
        updatedAt: new Date().toISOString()
      }).catch(e => console.warn("Failed to decrement member count", e));
    }
    
    if (window.location.pathname.includes(`/party/${roomId}`)) {
      router.push('/party');
    }
  }

  if (isRoomLoading || isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center h-svh bg-zinc-950 text-white space-y-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-[2.25rem] bg-primary/20 border-2 border-primary/40 flex items-center justify-center animate-pulse">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <Loader2 className="absolute -bottom-2 -right-2 w-8 h-8 text-primary animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black font-headline uppercase tracking-widest">Joining Party</h2>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Connecting via ZegoCloud...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-svh bg-zinc-950 text-white overflow-hidden">
      <header className="px-6 pt-12 pb-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleLeave} className="h-10 w-10 bg-white/5 rounded-full"><ChevronLeft className="w-6 h-6" /></Button>
          <div>
            <h1 className="text-lg font-black font-headline truncate max-w-[180px]">{room?.title || "Party Room"}</h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Host: {room?.hostName}</span>
              <Crown className="w-3 h-3 text-amber-500" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-tighter">{room?.memberCount || 1} Live</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 grid grid-cols-2 gap-4 pb-32 pt-4">
        {/* Host Tile */}
        <div className="aspect-[3/4] bg-zinc-900 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
          <Avatar className="w-20 h-20 border-4 border-primary/20">
            <AvatarImage src={room?.hostPhoto} className="object-cover" />
            <AvatarFallback className="bg-primary text-xl font-black">{room?.hostName?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary">The Host</p>
            <p className="text-sm font-bold text-zinc-400 mt-1">{room?.hostName}</p>
          </div>
          <div className="absolute top-4 right-4 bg-zinc-950/50 p-2 rounded-full">
             <Crown className="w-4 h-4 text-amber-500" />
          </div>
        </div>

        {/* Local User Tile */}
        <div className="aspect-[3/4] bg-zinc-900 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center p-6 text-center space-y-4 shadow-2xl">
          <Avatar className="w-20 h-20 border-4 border-zinc-800">
            <AvatarImage src={currentUser?.photoURL || ""} className="object-cover" />
            <AvatarFallback className="bg-zinc-800 text-xl font-black">Me</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500">You</p>
            {!isMicOn && <MicOff className="w-4 h-4 text-red-500 mx-auto mt-2" />}
          </div>
        </div>

        {/* Remote Users */}
        {remoteUsers.map(u => (
          <div key={u.streamID} className="aspect-[3/4] bg-zinc-900 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in zoom-in-95">
            <Avatar className="w-20 h-20 border-4 border-zinc-800">
              <AvatarFallback className="bg-zinc-800 text-xl font-black">?</AvatarFallback>
            </Avatar>
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Participant</p>
          </div>
        ))}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-8 flex items-center justify-center gap-6 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent">
        <button onClick={toggleMic} className={cn("w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-xl", isMicOn ? "bg-white/10 text-white border border-white/10" : "bg-red-500 text-white")}>
          {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>
        <button onClick={handleLeave} className="w-20 h-20 rounded-[2rem] bg-red-500 flex items-center justify-center shadow-2xl active:scale-90 transition-all border-4 border-zinc-950">
          <LogOut className="w-8 h-8 text-white" />
        </button>
        <button className="w-16 h-16 rounded-full bg-white/10 text-white/40 flex items-center justify-center border border-white/10 cursor-not-allowed">
          <Video className="w-6 h-6" />
        </button>
      </footer>
    </div>
  )
}
