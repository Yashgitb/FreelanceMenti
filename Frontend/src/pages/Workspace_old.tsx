import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { API_BASE_URL } from '@/lib/api/http';
import { messagesAPI } from '@/lib/api/messages';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export default function Workspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const socketRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  const [roomStatus, setRoomStatus] = useState<{
    role: 'waiting' | 'caller' | 'callee' | 'error' | null;
    message: string;
    otherUser?: any;
    userCount: number;
  }>({ role: null, message: 'Connecting...', userCount: 0 });
  const { user } = useSelector((s: RootState) => s.auth);

  // Determine who should initiate the call based on user ID comparison
  // Simplified WebRTC setup - no complex role determination needed  const setupPeerConnection = async (createOffer = false) => {
    console.log(`🔧 Setting up peer connection (createOffer: ${createOffer})`);
    
    // Close existing connection if any
    if (pcRef.current) {
      pcRef.current.close();
    }
    
    const pc = new RTCPeerConnection({ 
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    });
    pcRef.current = pc;
    
    // Set up event handlers
    pc.ontrack = (ev) => { 
      console.log('📹 Remote track received:', {
        kind: ev.track.kind,
        trackId: ev.track.id,
        streamsCount: ev.streams.length,
        streamId: ev.streams[0]?.id,
        trackEnabled: ev.track.enabled,
        trackReadyState: ev.track.readyState
      });
      
      if (remoteVideoRef.current && ev.streams[0]) {
        remoteVideoRef.current.srcObject = ev.streams[0];
        console.log('📹 Remote video element updated with stream:', ev.streams[0].id);
        
        // Ensure autoplay works - try multiple times
        const playVideo = async () => {
          try {
            await remoteVideoRef.current!.play();
            console.log('✅ Remote video autoplay successful');
            setNeedsManualPlay(false);
          } catch (err) {
            console.log('⚠️ Autoplay failed, trying again in 500ms:', err);
            setTimeout(() => {
              remoteVideoRef.current?.play().catch(() => {
                console.log('⚠️ Autoplay still failing - showing manual play button');
                setNeedsManualPlay(true);
              });
            }, 500);
          }
        };
        playVideo();
      } else {
        console.log('⚠️ Remote video ref or stream not available:', {
          hasRef: !!remoteVideoRef.current,
          hasStream: !!ev.streams[0]
        });
      }
    };

    // Add debug for other events that might indicate issues
    pc.ondatachannel = (ev) => {
      console.log('📊 Data channel received:', ev.channel.label);
    };
    
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log(`🧊 ICE candidate: ${event.candidate.type} (${event.candidate.protocol}) - ${event.candidate.address}:${event.candidate.port}`);
            
            // Serialize the candidate properly
            const candidateData = {
              candidate: event.candidate.candidate,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              sdpMid: event.candidate.sdpMid,
              type: event.candidate.type,
              protocol: event.candidate.protocol,
              address: event.candidate.address,
              port: event.candidate.port,
              priority: event.candidate.priority
            };
            
            socketRef.current?.emit('signal', {
              roomId: `project:${projectId}`,
              type: 'ice-candidate',
              candidate: candidateData,
              fromUserId: user?.id
            });
          } else {
            console.log('🧊 ICE candidate gathering complete');
          }
        };    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state: ${pc.connectionState}`);
      if (pc.connectionState === 'connected') {
        console.log('🎉 WebRTC connection established!');
      }
    };
    
    pc.onsignalingstatechange = () => {
      console.log(`📡 Signaling state: ${pc.signalingState}`);
    };

    pc.onicegatheringstatechange = () => {
      console.log(`🧊 ICE gathering state: ${pc.iceGatheringState}`);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`❄️ ICE connection state: ${pc.iceConnectionState}`);
      
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('🎉 ICE connection successful!');
      } else if (pc.iceConnectionState === 'failed') {
        console.log('❌ ICE connection failed - attempting restart');
        pc.restartIce();
      } else if (pc.iceConnectionState === 'disconnected') {
        console.log('⚠️ ICE connection disconnected');
      }
    };
    
    // Get user media
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('🎥 Got local media stream');
      
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, stream);
        console.log(`➕ Added ${track.kind} track:`, {
          trackId: track.id,
          enabled: track.enabled,
          readyState: track.readyState,
          senderId: sender.track?.id
        });
      });
      
      // Create offer if requested
      if (createOffer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        console.log('📤 Sending offer');
        socketRef.current?.emit('signal', { 
          roomId: `project:${projectId}`, 
          type: 'offer', 
          sdp: pc.localDescription,
          fromUserId: user?.id
        });
      }
      
      setInCall(true);
    } catch (error) {
      console.error('❌ Error setting up peer connection:', error);
      throw error;
    }
  };

  useEffect(() => {
    const base = API_BASE_URL.replace(/\/api$/, '');
    const token = localStorage.getItem('token');
    const socket = io(base, { withCredentials: true, auth: { token } });
    socketRef.current = socket;
    const roomId = `project:${projectId}`;
    socket.emit('join-room', roomId);

    // Revert: no room-users handling

    socket.on('message-with-sender', (msg: any) => {
      setMessages((m) => [...m, {
        content: msg.content,
        createdAt: msg.createdAt,
        sender: msg.sender?.name || 'Unknown',
        senderAvatar: msg.sender?.avatar,
        attachments: msg.attachments
      }]);
    });

    socket.on('signal', async (payload: any) => {
      if (!pcRef.current) return;
      const pc = pcRef.current;
      
      try {
        console.log(`📡 Received signal: ${payload.type}, PC state: ${pc.signalingState}, from: ${payload.fromUserId}`);
        
        if (payload.type === 'offer') {
          // Check if we should handle this offer or if there's a role conflict
          if (pc.signalingState === 'have-local-offer' && user?.id && payload.fromUserId) {
            // Both users sent offers - resolve conflict
            if (shouldInitiateCall(user.id, payload.fromUserId)) {
              // We should be the caller, ignore their offer
              console.log('🔄 Ignoring offer - we should be the caller (role conflict resolution)');
              return;
            } else {
              // They should be the caller, restart as callee
              console.log('🔄 Restarting as callee (role conflict resolution)');
              pc.close();
              await setupPeerConnection(false); // Restart without offering
              // Now handle their offer with the new peer connection
              const newPc = pcRef.current;
              if (newPc && newPc.signalingState === 'stable') {
                await newPc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                const answer = await newPc.createAnswer();
                await newPc.setLocalDescription(answer);
                socketRef.current?.emit('signal', { 
                  roomId: `project:${projectId}`, 
                  type: 'answer', 
                  sdp: newPc.localDescription,
                  fromUserId: user?.id 
                });
                console.log('✅ Answer sent successfully');
              }
              return;
            }
          }
          
          if (pc.signalingState === 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socketRef.current?.emit('signal', { 
              roomId: `project:${projectId}`, 
              type: 'answer', 
              sdp: pc.localDescription,
              fromUserId: user?.id 
            });
            console.log('✅ Answer sent successfully');
          }
        } else if (payload.type === 'answer') {
          // Handle answer if we're in the right state
          if (pc.signalingState === 'have-local-offer') {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              console.log('✅ Answer processed successfully');
            } catch (error) {
              console.error('❌ Error processing answer:', error);
            }
          } else {
            console.log(`⚠️ Ignoring answer - wrong state: ${pc.signalingState}. Should be 'have-local-offer' to accept answer.`);
          }
        } else if (payload.type === 'ice-candidate') {
          // Add ICE candidate if remote description is set
          if (pc.remoteDescription) {
            try { 
              // Reconstruct the RTCIceCandidate object
              const iceCandidate = new RTCIceCandidate({
                candidate: payload.candidate.candidate,
                sdpMLineIndex: payload.candidate.sdpMLineIndex,
                sdpMid: payload.candidate.sdpMid
              });
              
              await pc.addIceCandidate(iceCandidate);
              console.log(`✅ ICE candidate added:`, {
                type: payload.candidate.type,
                protocol: payload.candidate.protocol,
                address: payload.candidate.address,
                port: payload.candidate.port,
                priority: payload.candidate.priority
              });
            } catch (error) {
              console.log('⚠️ Failed to add ICE candidate:', error);
            }
          } else {
            console.log('⚠️ Ignoring ICE candidate - no remote description');
          }
        }
      } catch (error) {
        console.error('❌ WebRTC signaling error:', error);
      }
    });

    // Listen for user join events to potentially start automatic calling
    socket.on('user-joined', async (data: any) => {
      console.log('👤 User joined room:', data);
      setRemoteUserInfo(data.user);
      
      if (user?.id && data.user.id) {
        const isCaller = shouldInitiateCall(user.id, data.user.id);
        setShouldBeCaller(isCaller);
        
        if (isCaller) {
          console.log('🤖 Auto-starting call as designated caller');
          setTimeout(() => startCall(), 1000); // Small delay to ensure both are ready
        } else {
          console.log('📞 Preparing as callee - ready to receive calls');
          setIsWaitingForCall(true);
          // Pre-setup peer connection as callee (no offer creation)
          setTimeout(async () => {
            try {
              console.log('🎧 Setting up callee peer connection...');
              await setupPeerConnection(false);
              console.log('✅ Callee ready to receive offers');
            } catch (error) {
              console.error('❌ Error setting up callee:', error);
            }
          }, 500);
        }
      }
    });

    (async () => {
      try {
        const history = await messagesAPI.getProjectMessages(projectId!);
        setMessages(history);
      } catch {}
    })();

    return () => { socketRef.current?.disconnect(); };
  }, [projectId, user?.id]);

  const sendMessage = () => {
    if (!text.trim()) return;
    const roomId = `project:${projectId}`;
    socketRef.current?.emit('message', { roomId, message: text });
    setText('');
  };

  const startCall = async () => {
    try {
      console.log('🚀 Starting WebRTC call...');
      
      // Determine if we should create offer based on remote user
      let shouldCreateOffer = true; // Default to true for manual start
      
      if (remoteUserInfo && user?.id) {
        shouldCreateOffer = shouldInitiateCall(user.id, remoteUserInfo.id);
        console.log(`🎯 Manual call start - Role: ${shouldCreateOffer ? 'CALLER' : 'CALLEE'}`);
      }
      
      await setupPeerConnection(shouldCreateOffer);
    } catch (error) {
      console.error('❌ Error starting call:', error);
      alert('Failed to start call: ' + error.message);
    }
  };

  const toggleMute = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMuted(!muted);
  };

  const toggleVideo = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setVideoOff(!videoOff);
  };

  const endCall = () => {
    console.log('🛑 Ending call...');
    
    // Stop all tracks
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
          console.log(`⏹️ Stopped ${sender.track.kind} track`);
        }
      });
      
      // Close peer connection
      pcRef.current.close();
      pcRef.current = null;
      console.log('🔒 Peer connection closed');
    }
    
    // Stop local video stream
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log(`⏹️ Stopped local ${track.kind} track`);
      });
      localVideoRef.current.srcObject = null;
    }
    
    // Clear remote video
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    setInCall(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/projects')}>All Projects</Button>
            <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 border rounded p-3 overflow-auto mb-3 bg-card">
                  {messages.map((m: any, i: number) => {
                    let senderName = '';
                    let senderAvatar = '';
                    let senderId = '';
                    if (typeof m.sender === 'object' && m.sender !== null) {
                      senderName = m.sender.name || 'Unknown';
                      senderAvatar = m.sender.avatar || '';
                      senderId = m.sender._id || '';
                    } else {
                      senderName = m.sender || 'Unknown';
                      senderAvatar = m.senderAvatar || '';
                      senderId = '';
                    }
                    const isOwnMessage = Boolean(senderId && user?.id && senderId === user.id);

                    return (
                      <div key={i} className={`flex items-start gap-2 mb-3 ${isOwnMessage ? 'justify-end' : ''}`}>
                        {!isOwnMessage && (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={senderAvatar} />
                            <AvatarFallback>{(senderName?.[0] || '?')}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                          <div className="opacity-70 text-xs mb-1">{senderName}</div>
                          <div>
                            {m.content}
                            {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-2">
                                {m.attachments.map((a: any, idx: number) => (
                                  <a
                                    key={idx}
                                    href={`http://localhost:4000${a.url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline text-xs"
                                    download
                                  >
                                    Attachment: {a.name}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {isOwnMessage && (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user?.avatar} />
                            <AvatarFallback>{user?.name?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })}
                  {messages.length === 0 && <div className="text-sm text-muted-foreground">No messages yet.</div>}
                </div>

                <div className="flex gap-2">
                  <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" />
                  <Button onClick={sendMessage}>Send</Button>
                  <Button variant="outline" onClick={() => setMessages([])}>Clear Chat</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Video Call</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-black rounded mb-3 overflow-hidden relative">
                  <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
                  {needsManualPlay && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                      <Button 
                        onClick={() => {
                          remoteVideoRef.current?.play().then(() => {
                            setNeedsManualPlay(false);
                          }).catch(err => console.log('Manual play failed:', err));
                        }}
                        className="bg-white text-black hover:bg-gray-200"
                      >
                        ▶️ Click to Play Video
                      </Button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <div className="col-span-2">
                    <div className="aspect-video bg-black rounded overflow-hidden">
                      <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    {!inCall ? (
                      <>
                        {shouldBeCaller === true && (
                          <Button variant="secondary" onClick={startCall}>Start Call</Button>
                        )}
                        {shouldBeCaller === false && (
                          <Button variant="outline" disabled>
                            {isWaitingForCall ? 'Waiting for caller...' : 'Ready to receive call'}
                          </Button>
                        )}
                        {shouldBeCaller === null && (
                          <Button variant="outline" disabled>Waiting for other user...</Button>
                        )}
                      </>
                    ) : (
                      <>
                        <Button variant="outline" onClick={toggleMute}>{muted ? 'Unmute' : 'Mute'}</Button>
                        <Button variant="destructive" onClick={endCall}>End</Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">Project ID: {projectId}</div>
                <Separator className="my-3" />
                <input
                  type="file"
                  onChange={(e) => {
                    setUploadError(null);
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                  }}
                />
                {selectedFile && (
                  <div className="mt-2 flex gap-2 items-center">
                    <span className="text-sm">{selectedFile.name}</span>
                    <Button
                      size="sm"
                      disabled={!selectedFile || uploading}
                      onClick={async () => {
                        setUploading(true);
                        setUploadError(null);
                        try {
                          const msg = await messagesAPI.uploadProjectFile(projectId!, selectedFile);
                          setMessages((prev) => [...prev, msg]);
                          setSelectedFile(null);
                        } catch (err: any) {
                          setUploadError(err?.message || 'Upload failed');
                        } finally {
                          setUploading(false);
                        }
                      }}
                    >{uploading ? 'Uploading...' : 'Send'}</Button>
                  </div>
                )}
                {uploadError && (
                  <div className="mt-2 text-sm text-red-500">{uploadError}</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
 