import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { API_BASE_URL } from '@/lib/api/http';
import { messagesAPI } from '@/lib/api/messages';
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
  const hasJoinedRoom = useRef(false);
  const iceCandidateQueue = useRef<any[]>([]);
  
  // New simplified room status
  const [roomStatus, setRoomStatus] = useState<{
    role: 'waiting' | 'caller' | 'callee' | 'error' | null;
    message: string;
    otherUser?: any;
    userCount: number;
  }>({ role: null, message: 'Connecting...', userCount: 0 });
  
  const { user } = useSelector((s: RootState) => s.auth);

  // Process queued ICE candidates
  const processQueuedCandidates = async (pc: RTCPeerConnection) => {
    if (pc.remoteDescription && iceCandidateQueue.current.length > 0) {
      console.log(`🔄 Processing ${iceCandidateQueue.current.length} queued ICE candidates`);
      
      for (const candidateData of iceCandidateQueue.current) {
        try {
          const iceCandidate = new RTCIceCandidate({
            candidate: candidateData.candidate,
            sdpMLineIndex: candidateData.sdpMLineIndex,
            sdpMid: candidateData.sdpMid
          });
          
          await pc.addIceCandidate(iceCandidate);
          console.log('✅ Queued ICE candidate added');
        } catch (error) {
          console.log('⚠️ Failed to add queued ICE candidate:', error);
        }
      }
      
      iceCandidateQueue.current = []; // Clear queue
    }
  };

  // Simplified peer connection setup
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({ 
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    });

    // Handle remote tracks
    pc.ontrack = (event) => { 
      console.log('📹 Remote track received:', event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        console.log('📹 Remote video updated');
        
        // Handle autoplay
        remoteVideoRef.current.play().catch(err => {
          console.log('⚠️ Autoplay failed, showing manual play button');
          setNeedsManualPlay(true);
        });
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log(`🧊 Sending ICE candidate: ${event.candidate.type}`);
        socketRef.current.emit('signal', {
          roomId: `project:${projectId}`,
          type: 'ice-candidate',
          candidate: {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid
          },
          fromUserId: user?.id
        });
      }
    };

    // Connection state logging
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state: ${pc.connectionState}`);
      if (pc.connectionState === 'connected') {
        console.log('🎉 WebRTC connection established!');
      }
    };

    return pc;
  };

  // Get user media and add tracks
  const addLocalStream = async (pc: RTCPeerConnection) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      console.log('🎥 Got local media stream');
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        console.log(`➕ Added ${track.kind} track`);
      });
      
      return stream;
    } catch (error) {
      console.error('❌ Error getting user media:', error);
      throw error;
    }
  };

  // Initiate call (caller only)
  const initiateCall = async () => {
    try {
      console.log('🚀 Initiating call as caller');
      const pc = createPeerConnection();
      pcRef.current = pc;
      
      await addLocalStream(pc);
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socketRef.current?.emit('signal', {
        roomId: `project:${projectId}`,
        type: 'offer',
        sdp: offer,
        fromUserId: user?.id
      });
      
      console.log('📤 Offer sent');
      setInCall(true);
    } catch (error) {
      console.error('❌ Error initiating call:', error);
    }
  };

  // Prepare for incoming call (callee only)
  const prepareForCall = async () => {
    try {
      console.log('📞 Preparing for incoming call as callee');
      const pc = createPeerConnection();
      pcRef.current = pc;
      
      await addLocalStream(pc);
      console.log('✅ Ready to receive calls');
    } catch (error) {
      console.error('❌ Error preparing for call:', error);
    }
  };

  // Manual start call (for manual testing)
  const manualStartCall = async () => {
    if (roomStatus.role === 'caller') {
      await initiateCall();
    } else {
      console.log('⚠️ Only caller can start calls');
    }
  };

  // End call
  const endCall = () => {
    console.log('🛑 Ending call');
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    // Clear ICE candidate queue
    iceCandidateQueue.current = [];
    
    // Stop local stream
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log(`⏹️ Stopped ${track.kind} track`);
      });
      localVideoRef.current.srcObject = null;
    }
    
    // Clear remote stream
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    setInCall(false);
    setNeedsManualPlay(false);
  };

  // Toggle mute
  const toggleMute = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;

    stream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setMuted(!muted);
  };

  // Toggle video
  const toggleVideo = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;

    stream.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setVideoOff(!videoOff);
  };

  // Send chat message
  const sendMessage = () => {
    if (text.trim() && socketRef.current && user) {
      socketRef.current.emit('message', {
        roomId: `project:${projectId}`,
        message: { content: text, sender: user }
      });
      setText('');
    }
  };

  // Socket connection and event handling
  useEffect(() => {
    const base = API_BASE_URL.replace(/\/api$/, '');
    const socket = io(base, { withCredentials: true });
    socketRef.current = socket;
    
    // Join regular chat room
    const chatRoomId = `project:${projectId}`;
    socket.emit('join-room', chatRoomId);
    
    // Join WebRTC room with user info (only once)
    if (user && !hasJoinedRoom.current) {
      console.log('🎥 Joining WebRTC room with user:', user.id);
      socket.emit('join-webrtc-room', { roomId: chatRoomId, user });
      hasJoinedRoom.current = true;
    }

    // Handle chat messages
    socket.on('message-with-sender', (data) => {
      setMessages((m) => [...m, {
        id: data.message.id,
        text: data.message.content,
        sender: data.message.sender?.name,
        senderAvatar: data.message.sender?.avatar,
        attachments: data.message.attachments
      }]);
    });

    // Handle room status updates from backend
    socket.on('room-status', async (status) => {
      console.log('📊 Room status update:', status);
      setRoomStatus(status);
      
      if (status.role === 'caller' && status.userCount === 2) {
        // Only auto-start call if there are 2 users
        console.log('🤖 Auto-starting call as designated caller (2 users present)');
        setTimeout(() => initiateCall(), 1500); // Increased delay for stability
      } else if (status.role === 'callee' && status.userCount === 2) {
        // Only prepare for call if there are 2 users
        console.log('📞 Auto-preparing to receive call as callee (2 users present)');
        setTimeout(() => prepareForCall(), 1000); // Increased delay for stability
      } else {
        console.log(`ℹ️ Status: ${status.role}, Users: ${status.userCount} - No action needed`);
      }
    });

    // Handle WebRTC signaling (simplified)
    socket.on('signal', async (payload: any) => {
      if (!pcRef.current) {
        console.log('⚠️ No peer connection for signal:', payload.type);
        return;
      }
      
      const pc = pcRef.current;
      
      try {
        console.log(`📡 Received signal: ${payload.type} from ${payload.fromUserId}`);
        
        if (payload.type === 'offer' && roomStatus.role === 'callee') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          socket.emit('signal', { 
            roomId: chatRoomId, 
            type: 'answer', 
            sdp: pc.localDescription,
            fromUserId: user?.id 
          });
          
          console.log('✅ Answer sent');
          setInCall(true);
          
          // Process any queued ICE candidates now that remote description is set
          await processQueuedCandidates(pc);
          
        } else if (payload.type === 'answer' && roomStatus.role === 'caller') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          console.log('✅ Answer received and processed');
          
          // Process any queued ICE candidates now that remote description is set
          await processQueuedCandidates(pc);
          
        } else if (payload.type === 'ice-candidate') {
          if (pc.remoteDescription) {
            const iceCandidate = new RTCIceCandidate({
              candidate: payload.candidate.candidate,
              sdpMLineIndex: payload.candidate.sdpMLineIndex,
              sdpMid: payload.candidate.sdpMid
            });
            
            await pc.addIceCandidate(iceCandidate);
            console.log('✅ ICE candidate added immediately');
          } else {
            // Queue ICE candidate for later processing
            console.log('📦 Queueing ICE candidate - no remote description yet');
            iceCandidateQueue.current.push(payload.candidate);
          }
        }
      } catch (error) {
        console.error('❌ WebRTC signaling error:', error);
      }
    });

    // Load initial messages
    const loadMessages = async () => {
      try {
        const msgs = await messagesAPI.getProjectMessages(projectId!);
        setMessages(msgs.map((msg: any) => ({
          id: msg.id,
          text: msg.content,
          sender: msg.sender?.name,
          senderAvatar: msg.sender?.avatar,
          attachments: msg.attachments
        })));
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };
    
    loadMessages();

    // Cleanup
    return () => {
      endCall();
      socket.disconnect();
      hasJoinedRoom.current = false; // Reset join flag for cleanup
    };
  }, [projectId, user]);

  // Handle navigation
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column - Chat */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-y-auto mb-4 space-y-3 border rounded p-3">
                {messages.map((msg, i) => {
                  const isOwnMessage = msg.sender === user?.name;
                  return (
                    <div key={i} className={`flex gap-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      {!isOwnMessage && (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={msg.senderAvatar} />
                          <AvatarFallback>{msg.sender?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        <div className={`rounded px-3 py-2 max-w-xs ${isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <div className="text-sm">{msg.text}</div>
                        </div>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((a: any, j: number) => (
                              <a key={j} href={a.url} className="text-xs text-blue-500 hover:underline" download>
                                Attachment: {a.name}
                              </a>
                            ))}
                          </div>
                        )}
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
                <Input 
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                  placeholder="Type a message"
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button onClick={sendMessage}>Send</Button>
                <Button variant="outline" onClick={() => setMessages([])}>Clear</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File Upload</CardTitle>
            </CardHeader>
            <CardContent>
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
                        setMessages((prev) => [...prev, {
                          id: msg.id,
                          text: msg.content,
                          sender: msg.sender?.name,
                          senderAvatar: msg.sender?.avatar,
                          attachments: msg.attachments
                        }]);
                        setSelectedFile(null);
                      } catch (err: any) {
                        setUploadError(err?.message || 'Upload failed');
                      } finally {
                        setUploading(false);
                      }
                    }}
                  >
                    {uploading ? 'Uploading...' : 'Send'}
                  </Button>
                </div>
              )}
              {uploadError && (
                <div className="mt-2 text-sm text-red-500">{uploadError}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Video Call */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Info & Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Project ID: {projectId}</div>
              <Separator className="my-3" />
              <div className="space-y-2">
                <div><strong>Room Status:</strong> {roomStatus.message}</div>
                <div><strong>Role:</strong> {roomStatus.role || 'Not assigned'}</div>
                <div><strong>Users:</strong> {roomStatus.userCount}/2</div>
                {roomStatus.otherUser && (
                  <div><strong>Other User:</strong> {roomStatus.otherUser.name}</div>
                )}
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
                
                <div className="flex flex-col gap-2">
                  {/* Call Control Buttons */}
                  {!inCall ? (
                    <>
                      {roomStatus.role === 'caller' && (
                        <Button variant="default" onClick={manualStartCall} size="sm">
                          Start Call
                        </Button>
                      )}
                      {roomStatus.role === 'callee' && (
                        <Button variant="outline" disabled size="sm">
                          Waiting for call...
                        </Button>
                      )}
                      {roomStatus.role === 'waiting' && (
                        <Button variant="outline" disabled size="sm">
                          Waiting for user...
                        </Button>
                      )}
                      {roomStatus.role === 'error' && (
                        <Button variant="destructive" disabled size="sm">
                          Error
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={toggleMute} size="sm">
                        {muted ? 'Unmute' : 'Mute'}
                      </Button>
                      <Button variant="outline" onClick={toggleVideo} size="sm">
                        {videoOff ? 'Video On' : 'Video Off'}
                      </Button>
                      <Button variant="destructive" onClick={endCall} size="sm">
                        End Call
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}