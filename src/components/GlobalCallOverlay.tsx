"use client"

import { useState, useEffect, useRef } from "react"
import { Phone, PhoneOff, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useSupabaseUser } from "@/hooks/use-supabase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getAgoraToken } from "@/app/actions/agora"

let AgoraRTC: any = null;

export function GlobalCallOverlay() {
  const { user: currentUser } = useSupabaseUser()
  
  const [callData, setCallData] = useState<any>(null)
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'incoming' | 'ongoing'>('idle')
  const [callDuration, setCallDuration] = useState(0)
  const [isConnecting, setIsConnecting] = useState(false)
  const [agoraTokenData, setAgoraTokenData] = useState<{token: string, appId: string} | null>(null)
  
  const agoraClientRef = useRef<any>(null)
  const localTracksRef = useRef<{ videoTrack?: any; audioTrack?: any }>({})
  const remoteContainerRef = useRef<HTMLDivElement>(null)
  const previewVideoRef = useRef<HTMLDivElement>(null)
  const ringtoneRef = useRef<HTMLAudioElement | null>(null)
  const ringingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const joiningRef = useRef(false)
  
  const callDurationRef = useRef(0)
  const wasCallAcceptedRef = useRef(false)
  const activeChatIdRef = useRef<string | null>(null)
  const logRecordedRef = useRef(false)
  const statusRef = useRef<'idle' | 'ringing' | 'incoming' | 'ongoing'>('idle')

  useEffect(() => {
    statusRef.current = callStatus
  }, [callStatus])

  useEffect(() => {
    if (typeof window !== "undefined") {
      import('agora-rtc-sdk-ng').then((module) => {
        AgoraRTC = module.default;
        AgoraRTC.setLogLevel(2);
      });
      
      const audio = new Audio("/ringtone.mp3");
      audio.loop = true;
      audio.preload = "auto";
      ringtoneRef.current = audio;
    }
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
      handleCleanup();
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('call_listener')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles', 
        filter: `id=eq.${currentUser.id}` 
      }, (payload) => {
        const chatId = payload.new.incoming_call_id;
        
        if (!chatId) {
          if (!joiningRef.current && statusRef.current !== 'idle') {
            handleCleanup();
          }
          return;
        }

        if (chatId !== activeChatIdRef.current) {
          activeChatIdRef.current = chatId;
          
          // Listen to call details
          supabase
            .from('calls')
            .select('*')
            .eq('id', chatId)
            .single()
            .then(({ data }) => {
              if (data) {
                setCallData(data);
                updateCallState(data);
              }
            });

          // Subscription for status changes
          supabase.channel(`call_details:${chatId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'calls', filter: `id=eq.${chatId}` }, (p) => {
              if (p.new) {
                setCallData(p.new);
                updateCallState(p.new);
              } else {
                handleCleanup();
              }
            })
            .subscribe();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const updateCallState = (data: any) => {
    if (!data || !currentUser) return;
    const isCaller = data.caller_id === currentUser.id;

    if (data.status === 'ringing') {
      if (ringtoneRef.current && ringtoneRef.current.paused) {
        ringtoneRef.current.play().catch(() => {});
      }
      
      if (statusRef.current === 'idle') {
        setCallStatus(isCaller ? 'ringing' : 'incoming');
        engageHardware(data.call_type);
        
        getAgoraToken(activeChatIdRef.current!, currentUser.id)
          .then(setAgoraTokenData)
          .catch(err => console.error("Token pre-fetch failed", err));
      }

      if (isCaller && !ringingTimerRef.current) {
        ringingTimerRef.current = setTimeout(() => {
          handleEndCall();
        }, 40000);
      }
    } else if (data.status === 'accepted') {
      if (ringingTimerRef.current) {
        clearTimeout(ringingTimerRef.current);
        ringingTimerRef.current = null;
      }
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      
      wasCallAcceptedRef.current = true;
      if (statusRef.current !== 'ongoing' && !joiningRef.current) {
        setCallStatus('ongoing');
        setIsConnecting(true);
        initiateAgoraConnection(activeChatIdRef.current!, data.call_type);
        supabase.from('profiles').update({ in_call: true }).eq('id', currentUser.id);
      }
    }
  };

  const engageHardware = async (type: 'video' | 'audio') => {
    if (!AgoraRTC) return;
    try {
      if (!localTracksRef.current.audioTrack) {
        localTracksRef.current.audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          ANS: true, AEC: true, AGC: true
        });
      }
      
      if (type === 'video' && !localTracksRef.current.videoTrack) {
        const videoTrack = await AgoraRTC.createCameraVideoTrack({
          optimizationMode: "detail",
          encoderConfig: "720p_1"
        });
        localTracksRef.current.videoTrack = videoTrack;
        if (previewVideoRef.current) {
          videoTrack.play(previewVideoRef.current);
        }
      }
    } catch (e) {
      console.error("Hardware failed:", e);
    }
  };

  const initiateAgoraConnection = async (channelName: string, type: 'video' | 'audio') => {
    if (!AgoraRTC || !currentUser || joiningRef.current) return;
    
    joiningRef.current = true;
    try {
      let tokenData = agoraTokenData;
      if (!tokenData) {
        tokenData = await getAgoraToken(channelName, currentUser.id);
      }
      
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      agoraClientRef.current = client;

      client.on("user-published", async (user: any, mediaType: string) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "video" && remoteContainerRef.current) {
          user.videoTrack.play(remoteContainerRef.current);
        }
        if (mediaType === "audio") {
          user.audioTrack.play();
        }
      });

      client.on("user-left", () => handleEndCall());

      await client.join(tokenData!.appId, channelName, tokenData!.token, currentUser.id);
      
      await engageHardware(type);

      const tracksToPublish = [];
      if (localTracksRef.current.audioTrack) tracksToPublish.push(localTracksRef.current.audioTrack);
      if (type === 'video' && localTracksRef.current.videoTrack) tracksToPublish.push(localTracksRef.current.videoTrack);

      if (tracksToPublish.length > 0) {
        await client.publish(tracksToPublish);
      }
      
      setIsConnecting(false); 
      joiningRef.current = false;
      
    } catch (error) {
      console.error("Agora join failed:", error);
      joiningRef.current = false;
      handleEndCall();
    }
  };

  const handleCleanup = async () => {
    if (ringingTimerRef.current) {
      clearTimeout(ringingTimerRef.current);
      ringingTimerRef.current = null;
    }
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }

    if (localTracksRef.current.audioTrack) {
      try { localTracksRef.current.audioTrack.stop(); localTracksRef.current.audioTrack.close(); } catch (e) {}
    }
    if (localTracksRef.current.videoTrack) {
      try { localTracksRef.current.videoTrack.stop(); localTracksRef.current.videoTrack.close(); } catch (e) {}
    }
    localTracksRef.current = {};

    if (agoraClientRef.current) {
      try { await agoraClientRef.current.leave(); } catch (e) {}
      agoraClientRef.current = null;
    }
    
    if (currentUser) {
      await supabase.from('profiles').update({ in_call: false, incoming_call_id: null }).eq('id', currentUser.id);
    }

    setCallStatus('idle');
    setCallData(null);
    setCallDuration(0);
    setAgoraTokenData(null);
    callDurationRef.current = 0;
    activeChatIdRef.current = null;
    wasCallAcceptedRef.current = false;
    setIsConnecting(false);
    joiningRef.current = false;
  };

  const handleAcceptCall = async () => {
    if (!activeChatIdRef.current) return;
    await supabase.from('calls').update({ status: 'accepted' }).eq('id', activeChatIdRef.current);
  }

  const handleEndCall = async () => {
    if (!activeChatIdRef.current) {
      handleCleanup();
      return;
    }

    const cid = activeChatIdRef.current;
    const receiverId = callData?.receiver_id;
    const callerId = callData?.caller_id;

    await supabase.from('calls').delete().eq('id', cid);
    if (receiverId) await supabase.from('profiles').update({ incoming_call_id: null }).eq('id', receiverId);
    if (callerId) await supabase.from('profiles').update({ incoming_call_id: null }).eq('id', callerId);
    handleCleanup();
  }

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'ongoing') {
      interval = setInterval(() => {
        setCallDuration(prev => {
          const next = prev + 1;
          callDurationRef.current = next;
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  if (callStatus === 'idle') return null;

  const isCaller = callData?.caller_id === currentUser?.id;
  const otherUserImage = `https://picsum.photos/seed/${isCaller ? callData?.receiver_id : callData?.caller_id}/400/600`

  return (
    <div className="fixed inset-0 z-[1000] bg-zinc-950 flex flex-col overflow-hidden text-white font-body pointer-events-auto">
      <div 
        ref={remoteContainerRef} 
        className={cn(
          "absolute inset-0 z-0 bg-black transition-opacity duration-700", 
          callStatus === 'ongoing' && !isConnecting ? 'opacity-100' : 'opacity-0'
        )} 
      />

      <div className={cn(
        "absolute bg-zinc-900 overflow-hidden border-2 border-white/10 z-50 shadow-2xl transition-all duration-500",
        callStatus === 'ongoing' 
          ? "top-12 right-6 w-32 aspect-[3/4] rounded-2xl" 
          : "inset-0 rounded-none border-none" 
      )}>
        <div 
          ref={previewVideoRef as any} 
          className={cn(
            "w-full h-full object-cover scale-x-[-1] [&_video]:scale-x-[-1]",
            callStatus !== 'ongoing' && "opacity-40 blur-sm" 
          )} 
        />
      </div>

      {(callStatus !== 'ongoing' || isConnecting) && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-between py-24 px-8 bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-8 mt-12 w-full">
            <div className="relative">
              <div className="absolute -inset-8 bg-white/5 rounded-full animate-pulse" />
              <Avatar className="w-40 h-44 rounded-[3rem] border-4 border-white/10 shadow-2xl">
                <AvatarImage src={otherUserImage} className="object-cover" />
                <AvatarFallback className="text-5xl bg-zinc-800">?</AvatarFallback>
              </Avatar>
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-black font-headline tracking-tight text-white drop-shadow-lg">
                {isConnecting ? 'Securing Link' : isCaller ? 'Ringing...' : (callData?.caller_name || 'Incoming...')}
              </h2>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-16 left-0 right-0 z-[70] flex items-center justify-center gap-12 px-8">
        {callStatus === 'incoming' ? (
          <>
            <button 
              onClick={handleEndCall} 
              className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-2xl active:scale-90 transition-all border-4 border-white/10"
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </button>
            <button 
              onClick={handleAcceptCall} 
              className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-2xl active:scale-90 transition-all animate-bounce border-4 border-white/10"
            >
              <Phone className="w-8 h-8 text-white" />
            </button>
          </>
        ) : (
          <button 
            onClick={handleEndCall} 
            className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-2xl active:scale-90 transition-all border-4 border-white/10"
          >
            <PhoneOff className="w-8 h-8 text-white" />
          </button>
        )}
      </div>
    </div>
  )
}
