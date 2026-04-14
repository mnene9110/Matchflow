
"use client"

import { useState, useEffect, useRef } from "react"
import { Phone, PhoneOff, Loader2 } from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { 
  collection, 
  doc, 
  onSnapshot, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp, 
  increment, 
  runTransaction,
  setDoc
} from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getAgoraToken } from "@/app/actions/agora"

let AgoraRTC: any = null;

export function GlobalCallOverlay() {
  const { user: currentUser } = useUser()
  const { firestore } = useFirebase()
  
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
    }
  }, []);

  useEffect(() => {
    if (!firestore || !currentUser) return;

    const userRef = doc(firestore, "userProfiles", currentUser.uid);
    const unsubscribeUser = onSnapshot(userRef, (snap) => {
      const data = snap.data();
      const chatId = data?.incomingCallId;
      
      if (!chatId) {
        if (!joiningRef.current && statusRef.current !== 'idle') {
          handleCleanup();
        }
        return;
      }

      if (chatId !== activeChatIdRef.current) {
        activeChatIdRef.current = chatId;
        const callDocRef = doc(firestore, "calls", chatId);
        
        onSnapshot(callDocRef, (detailsSnap) => {
          const callData = detailsSnap.data();
          if (!callData) {
            if (!joiningRef.current && statusRef.current !== 'idle') {
              handleCleanup();
            }
            return;
          }

          const now = Date.now();
          const callAge = now - (callData.timestamp || 0);
          if (callData.status === 'ringing' && callAge > 60000) {
            updateDoc(userRef, { incomingCallId: null });
            handleCleanup();
            return;
          }

          setCallData(callData);
          updateCallState(callData);
        });
      }
    });

    return () => unsubscribeUser();
  }, [firestore, currentUser]);

  const updateCallState = (data: any) => {
    if (!data || !currentUser) return;
    const isCaller = data.callerId === currentUser.uid;

    if (data.status === 'ringing') {
      if (ringtoneRef.current && ringtoneRef.current.paused) {
        ringtoneRef.current.play().catch(() => {});
      }
      
      if (statusRef.current === 'idle') {
        setCallStatus(isCaller ? 'ringing' : 'incoming');
        engageHardware(data.callType);
        
        getAgoraToken(activeChatIdRef.current!, currentUser.uid)
          .then(setAgoraTokenData)
          .catch(err => console.error("Token pre-fetch failed", err));
      }

      if (isCaller && !ringingTimerRef.current) {
        ringingTimerRef.current = setTimeout(() => {
          handleTimeout();
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
        initiateAgoraConnection(activeChatIdRef.current!, data.callType);
        updateDoc(doc(firestore, "userProfiles", currentUser.uid), { inCall: true });
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

  const deductCoins = async (amount: number) => {
    if (!firestore || !currentUser || !activeChatIdRef.current) return;
    
    try {
      await runTransaction(firestore, async (transaction) => {
        const userRef = doc(firestore, "userProfiles", currentUser.uid);
        const userSnap = await transaction.get(userRef);
        const currentBalance = userSnap.data()?.coinBalance || 0;
        
        if (currentBalance < amount) throw new Error("INSUFFICIENT_COINS");
        
        transaction.update(userRef, { coinBalance: increment(-amount) });
        
        const logRef = doc(collection(userRef, "transactions"));
        transaction.set(logRef, {
          id: logRef.id,
          type: "deduction",
          amount: -amount,
          transactionDate: new Date().toISOString(),
          description: `Call charge (${callData?.callType})`
        });
      });
    } catch (error) {
      console.error("Billing failed:", error);
      handleEndCall();
    }
  };

  const initiateAgoraConnection = async (channelName: string, type: 'video' | 'audio') => {
    if (!AgoraRTC || !currentUser || joiningRef.current) return;
    
    joiningRef.current = true;
    try {
      let tokenData = agoraTokenData;
      if (!tokenData) {
        tokenData = await getAgoraToken(channelName, currentUser.uid);
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

      await client.join(tokenData!.appId, channelName, tokenData!.token, currentUser.uid);
      
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

  const handleTimeout = () => {
    if (activeChatIdRef.current) {
      logCallInChat(activeChatIdRef.current, 0, "[Timeout]");
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
      try {
        localTracksRef.current.audioTrack.stop();
        localTracksRef.current.audioTrack.close();
      } catch (e) {}
    }
    if (localTracksRef.current.videoTrack) {
      try {
        localTracksRef.current.videoTrack.stop();
        localTracksRef.current.videoTrack.close();
      } catch (e) {}
    }
    localTracksRef.current = {};

    if (agoraClientRef.current) {
      try {
        await agoraClientRef.current.leave();
      } catch (e) {}
      agoraClientRef.current = null;
    }
    
    if (wasCallAcceptedRef.current && activeChatIdRef.current && !logRecordedRef.current) {
      const mins = Math.floor(callDurationRef.current / 60);
      const secs = callDurationRef.current % 60;
      const intimacyGain = Math.max(1, Math.floor(callDurationRef.current / 60) * 10)
      logCallInChat(activeChatIdRef.current, callDurationRef.current, `[${mins}:${secs.toString().padStart(2, '0')}]`, intimacyGain);
    }

    if (currentUser && firestore) {
      updateDoc(doc(firestore, "userProfiles", currentUser.uid), { inCall: false, incomingCallId: null });
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
    logRecordedRef.current = false;
  };

  const handleAcceptCall = async () => {
    if (!firestore || !activeChatIdRef.current || !callData) return;
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    await updateDoc(doc(firestore, "calls", activeChatIdRef.current), { status: 'accepted' });
  }

  const handleEndCall = async () => {
    if (!firestore || !activeChatIdRef.current || !currentUser) {
      handleCleanup(); 
      return;
    }

    const cid = activeChatIdRef.current;
    const currentCallStatus = statusRef.current;

    if (!wasCallAcceptedRef.current) {
      if (currentCallStatus === 'incoming') {
        logCallInChat(cid, 0, "[Rejected]");
      } else if (currentCallStatus === 'ringing') {
        logCallInChat(cid, 0, "[Cancelled]");
      }
    }

    const receiverId = callData?.receiverId;
    const callerId = callData?.callerId;

    await deleteDoc(doc(firestore, "calls", cid));
    if (receiverId) await updateDoc(doc(firestore, "userProfiles", receiverId), { incomingCallId: null });
    if (callerId) await updateDoc(doc(firestore, "userProfiles", callerId), { incomingCallId: null });
    handleCleanup();
  }

  const logCallInChat = async (chatId: string, duration: number, label: string, intimacyGain: number = 0) => {
    if (!firestore || !currentUser || logRecordedRef.current) return;
    
    logRecordedRef.current = true;
    const otherId = callData?.receiverId === currentUser.uid ? callData?.callerId : callData?.receiverId;
    if (!otherId) return;
    
    const chatRef = doc(firestore, "chats", chatId);
    const msgRef = doc(collection(chatRef, "messages"));
    
    await setDoc(msgRef, { messageText: label, senderId: currentUser.uid, sentAt: serverTimestamp(), isCallLog: true });
    await updateDoc(chatRef, {
      lastMessage: label,
      timestamp: serverTimestamp(),
      intimacyScore: increment(intimacyGain)
    });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'ongoing') {
      interval = setInterval(() => {
        setCallDuration(prev => {
          const next = prev + 1;
          callDurationRef.current = next;
          
          const isCaller = callData?.callerId === currentUser?.uid;
          if (isCaller && !callData?.isFree) {
            const cost = callData?.costPerMin || 0;
            if (next === 11 || (next > 11 && next % 60 === 0)) {
              deductCoins(cost);
            }
          }
          
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus, callData, currentUser]);

  if (callStatus === 'idle') return null;

  const isCaller = callData?.callerId === currentUser?.uid;
  const otherUserImage = `https://picsum.photos/seed/${isCaller ? callData?.receiverId : callData?.callerId}/400/600`

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
                {isConnecting ? 'Securing Link' : isCaller ? 'Ringing...' : (callData?.callerName || 'Incoming...')}
              </h2>
              {isConnecting && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Finalizing Connection</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {callStatus === 'ongoing' && !isConnecting && (
        <div className="absolute top-12 left-6 z-50">
          <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-50 animate-pulse" />
            <span className="text-[10px] font-black tracking-widest uppercase tabular-nums">
              {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
            </span>
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
