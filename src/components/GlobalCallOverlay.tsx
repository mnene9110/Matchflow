
"use client"

import { useState, useEffect, useRef } from "react"
import { Phone, PhoneOff, Loader2 } from "lucide-react"
import { useFirebase, useUser } from "@/firebase"
import { ref, onValue, remove, update, push, serverTimestamp as rtdbTimestamp, off, runTransaction as runRtdbTransaction } from "firebase/database"
import { doc, collection, setDoc, updateDoc as updateFirestoreDoc, increment as firestoreIncrement } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getAgoraToken } from "@/app/actions/agora"

let AgoraRTC: any = null;

/**
 * @fileOverview Global Call Overlay for Agora-powered calls.
 * Optimized for speed:
 * - Pre-warms hardware (cam/mic) during ringing phase.
 * - Pre-fetches Agora tokens.
 * - Mirror mode implemented for local preview.
 * - 10s free grace period, billing starts at 11s.
 */

export function GlobalCallOverlay() {
  const { user: currentUser } = useUser()
  const { database, firestore } = useFirebase()
  
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
  
  const callDurationRef = useRef(0)
  const wasCallAcceptedRef = useRef(false)
  const activeChatIdRef = useRef<string | null>(null)

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
    if (!database || !currentUser) return;

    let callDetailsUnsubscribe: (() => void) | null = null;

    const incomingCallRef = ref(database, `users/${currentUser.uid}/incomingCallId`);
    const unsubscribeIncomingId = onValue(incomingCallRef, (snap) => {
      const chatId = snap.val();
      
      if (!chatId) {
        handleCleanup();
        return;
      }

      if (chatId !== activeChatIdRef.current) {
        if (callDetailsUnsubscribe) {
          callDetailsUnsubscribe();
        }
        
        activeChatIdRef.current = chatId;
        const callDetailsRef = ref(database, `calls/${chatId}`);
        
        const unsubscribeDetails = onValue(callDetailsRef, (detailsSnap) => {
          const data = detailsSnap.val();
          if (!data) {
            handleCleanup();
            return;
          }
          setCallData(data);
          updateCallState(data);
        });
        
        callDetailsUnsubscribe = () => off(callDetailsRef, "value", unsubscribeDetails);
      }
    });

    return () => {
      unsubscribeIncomingId();
      if (callDetailsUnsubscribe) callDetailsUnsubscribe();
      handleCleanup(); 
    };
  }, [database, currentUser]);

  // Pre-fetch token when call is detected
  useEffect(() => {
    if (activeChatIdRef.current && currentUser && (callStatus === 'ringing' || callStatus === 'incoming')) {
      if (!agoraTokenData) {
        getAgoraToken(activeChatIdRef.current, currentUser.uid)
          .then(setAgoraTokenData)
          .catch(err => console.error("Token pre-fetch failed", err));
      }
    }
  }, [activeChatIdRef.current, currentUser, callStatus]);

  const updateCallState = (data: any) => {
    if (!data || !currentUser) return;
    const isCaller = data.callerId === currentUser.uid;

    if (data.status === 'ringing') {
      if (ringtoneRef.current && ringtoneRef.current.paused) {
        ringtoneRef.current.play().catch(() => {});
      }
      setCallStatus(isCaller ? 'ringing' : 'incoming');
      
      // OPTIMIZATION: Engage hardware early during ringing
      engageHardware(data.callType);

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
      if (callStatus !== 'ongoing') {
        setCallStatus('ongoing');
        setIsConnecting(true);
        initiateAgoraConnection(activeChatIdRef.current!, data.callType);
      }
    }
  };

  const engageHardware = async (type: 'video' | 'audio') => {
    if (!AgoraRTC || callStatus === 'idle') return;
    try {
      if (!localTracksRef.current.audioTrack) {
        localTracksRef.current.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      }
      
      if (type === 'video' && !localTracksRef.current.videoTrack) {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localTracksRef.current.videoTrack = videoTrack;
        // Play local preview immediately even while ringing
        if (previewVideoRef.current) {
          videoTrack.play(previewVideoRef.current);
        }
      }
    } catch (e) {
      console.error("Hardware engagement failed:", e);
    }
  };

  const deductCoins = async (amount: number) => {
    if (!database || !currentUser || !activeChatIdRef.current || !firestore) return;
    
    const userCoinRef = ref(database, `users/${currentUser.uid}/coinBalance`);
    
    try {
      const result = await runRtdbTransaction(userCoinRef, (current) => {
        if (current === null) return current;
        if (current < amount) return undefined;
        return current - amount;
      });

      if (!result.committed) {
        handleEndCall();
        return;
      }

      const profileRef = doc(firestore, "userProfiles", currentUser.uid);
      updateFirestoreDoc(profileRef, {
        coinBalance: firestoreIncrement(-amount),
        updatedAt: new Date().toISOString()
      });

      const txRef = doc(collection(profileRef, "transactions"));
      setDoc(txRef, {
        id: txRef.id,
        type: "deduction",
        amount: -amount,
        transactionDate: new Date().toISOString(),
        description: `Call charge (${callData?.callType})`
      });
    } catch (error) {
      console.error("Call billing failed:", error);
      handleEndCall();
    }
  };

  const initiateAgoraConnection = async (channelName: string, type: 'video' | 'audio') => {
    if (!AgoraRTC || !currentUser || agoraClientRef.current) return;

    try {
      // Use pre-fetched token or fetch now if not ready
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

      await client.join(tokenData.appId, channelName, tokenData.token, currentUser.uid);
      
      // Ensure hardware is engaged (it usually is by now)
      await engageHardware(type);

      const tracksToPublish = [];
      if (localTracksRef.current.audioTrack) tracksToPublish.push(localTracksRef.current.audioTrack);
      if (type === 'video' && localTracksRef.current.videoTrack) tracksToPublish.push(localTracksRef.current.videoTrack);

      if (tracksToPublish.length > 0) {
        await client.publish(tracksToPublish);
      }
      
      setIsConnecting(false); 
      
    } catch (error) {
      console.error("Agora join failed:", error);
      handleEndCall();
    }
  };

  const handleTimeout = () => {
    if (activeChatIdRef.current) {
      logCallInChat(activeChatIdRef.current, 0, true);
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
      localTracksRef.current.audioTrack.stop();
      localTracksRef.current.audioTrack.close();
    }
    if (localTracksRef.current.videoTrack) {
      localTracksRef.current.videoTrack.stop();
      localTracksRef.current.videoTrack.close();
    }
    localTracksRef.current = {};

    if (agoraClientRef.current) {
      try {
        await agoraClientRef.current.leave();
      } catch (e) {}
      agoraClientRef.current = null;
    }
    
    if (wasCallAcceptedRef.current && activeChatIdRef.current && currentUser?.uid === callData?.callerId) {
      logCallInChat(activeChatIdRef.current, callDurationRef.current);
    }

    setCallStatus('idle');
    setCallData(null);
    setCallDuration(0);
    setAgoraTokenData(null);
    callDurationRef.current = 0;
    activeChatIdRef.current = null;
    wasCallAcceptedRef.current = false;
    setIsConnecting(false);
  };

  const handleAcceptCall = async () => {
    if (!database || !activeChatIdRef.current || !callData) return;
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    await update(ref(database, `calls/${activeChatIdRef.current}`), { status: 'accepted' });
  }

  const handleEndCall = async () => {
    if (!database || !activeChatIdRef.current) {
      handleCleanup(); 
      return;
    }
    const cid = activeChatIdRef.current;
    const receiverId = callData?.receiverId;
    const callerId = callData?.callerId;

    await remove(ref(database, `calls/${cid}`));
    if (receiverId) await remove(ref(database, `users/${receiverId}/incomingCallId`));
    if (callerId) await remove(ref(database, `users/${callerId}/incomingCallId`));
    handleCleanup();
  }

  const logCallInChat = async (chatId: string, duration: number, isTimeout: boolean = false) => {
    if (!database || !currentUser) return;
    const otherId = callData?.receiverId === currentUser.uid ? callData?.callerId : callData?.receiverId;
    if (!otherId) return;
    
    let logMsg = "";
    if (isTimeout) {
      logMsg = "[Timeout]";
    } else {
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      logMsg = `[${mins}:${secs.toString().padStart(2, '0')}]`;
    }

    const updates: any = {}
    const msgKey = push(ref(database, `chats/${chatId}/messages`)).key
    updates[`/chats/${chatId}/messages/${msgKey}`] = { messageText: logMsg, senderId: currentUser.uid, sentAt: rtdbTimestamp(), isCallLog: true }
    updates[`/users/${currentUser.uid}/chats/${otherId}/lastMessage`] = logMsg
    updates[`/users/${currentUser.uid}/chats/${otherId}/timestamp`] = rtdbTimestamp()
    updates[`/users/${otherId}/chats/${currentUser.uid}/lastMessage`] = logMsg
    updates[`/users/${otherId}/chats/${currentUser.uid}/timestamp`] = rtdbTimestamp()
    await update(ref(database), updates);
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
            if (next === 11) {
              deductCoins(cost);
            } 
            else if (next > 11 && next % 60 === 0) {
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
    <div className="fixed inset-0 z-[1000] bg-zinc-950 flex flex-col overflow-hidden text-white font-body">
      {/* Remote Video Container */}
      <div 
        ref={remoteContainerRef} 
        className={cn(
          "absolute inset-0 z-0 bg-black transition-opacity duration-700", 
          callStatus === 'ongoing' && !isConnecting ? 'opacity-100' : 'opacity-0'
        )} 
      />

      {/* Local Video Preview (Mirror Mode) */}
      <div className={cn(
        "absolute bg-zinc-900 overflow-hidden border-2 border-white/10 z-50 shadow-2xl transition-all duration-500",
        callStatus === 'ongoing' 
          ? "top-12 right-6 w-32 aspect-[3/4] rounded-2xl" 
          : "inset-0 rounded-none border-none" // Full screen preview during ringing
      )}>
        <div 
          ref={previewVideoRef as any} 
          className={cn(
            "w-full h-full object-cover scale-x-[-1] [&_video]:scale-x-[-1]",
            callStatus !== 'ongoing' && "opacity-40 blur-sm" // Slightly dim preview while ringing
          )} 
        />
      </div>

      {/* Ringing/Loading UI Overlay */}
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

      {/* Active Call Timer */}
      {callStatus === 'ongoing' && !isConnecting && (
        <div className="absolute top-12 left-6 z-50">
          <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black tracking-widest uppercase tabular-nums">
              {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
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
