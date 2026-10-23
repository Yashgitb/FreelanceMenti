import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/lib/api/http';
import { RootState } from '@/store';

export default function Workspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  
  // WebRTC refs and states
  const socketRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  
  // Simple states
  const [connectionState, setConnectionState] = useState('disconnected');
  const [isOfferer, setIsOfferer] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  const { user } = useSelector((s: RootState) => s.auth);

  // Create peer connection
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log('🧊 Sending ICE candidate');
        socketRef.current.emit('webrtc-signal', {
          type: 'ice-candidate',
          candidate: event.candidate,
          roomId: `project:${projectId}`,
          fromUserId: user?.id
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('📹 Remote track received');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      setConnectionState(pc.connectionState);
    };

    return pc;
  };

  // Get local media
  const getLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      console.log('✅ Got local media');
      return stream;
    } catch (error) {
      console.error('❌ Error getting media:', error);
      throw error;
    }
  };

  // Manual: Start as caller (creates offer)
  const startCall = async () => {
    try {
      console.log('🚀 Starting call as offerer');
      setIsOfferer(true);
      
      const stream = await getLocalMedia();
      const pc = createPeerConnection();
      pcRef.current = pc;
      
      // Add local stream
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socketRef.current?.emit('webrtc-signal', {
        type: 'offer',
        sdp: offer,
        roomId: `project:${projectId}`,
        fromUserId: user?.id
      });
      
      console.log('📤 Offer sent');
    } catch (error) {
      console.error('❌ Error starting call:', error);
    }
  };

  // Manual: Answer incoming call
  const answerCall = async () => {
    try {
      console.log('📞 Answering call');
      
      if (!pcRef.current) {
        console.error('No peer connection to answer with');
        return;
      }
      
      const stream = await getLocalMedia();
      
      // Add local stream
      stream.getTracks().forEach(track => {
        pcRef.current!.addTrack(track, stream);
      });
      
      // Create and send answer
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      
      socketRef.current?.emit('webrtc-signal', {
        type: 'answer',
        sdp: answer,
        roomId: `project:${projectId}`,
        fromUserId: user?.id
      });
      
      console.log('📤 Answer sent');
    } catch (error) {
      console.error('❌ Error answering call:', error);
    }
  };

  // End call
  const endCall = () => {
    console.log('🛑 Ending call');
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    setConnectionState('disconnected');
    setIsOfferer(false);
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

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const base = API_BASE_URL.replace(/\/api$/, '');
    const socket = io(base, { withCredentials: true });
    socketRef.current = socket;
    
    // Join chat room
    socket.emit('join-room', `project:${projectId}`);
    console.log('📡 Connected to server');

    // Handle chat messages
    socket.on('message-with-sender', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: data.message.content,
        sender: data.message.sender?.name,
        isOwn: data.message.sender?.id === user?.id
      }]);
    });

    // Handle WebRTC signals (simplified)
    socket.on('webrtc-signal', async (data) => {
      console.log(`📡 Received ${data.type} from ${data.fromUserId}`);
      
      if (data.fromUserId === user?.id) {
        console.log('⚠️ Ignoring own signal');
        return;
      }

      try {
        if (data.type === 'offer') {
          // Received offer - prepare to answer
          const pc = createPeerConnection();
          pcRef.current = pc;
          
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          console.log('📥 Offer received - ready to answer');
          
        } else if (data.type === 'answer') {
          // Received answer
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
            console.log('✅ Answer processed');
          }
          
        } else if (data.type === 'ice-candidate') {
          // Received ICE candidate
          if (pcRef.current && pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log('✅ ICE candidate added');
          } else {
            console.log('⚠️ ICE candidate ignored - no remote description');
          }
        }
      } catch (error) {
        console.error('❌ Signal processing error:', error);
      }
    });

    return () => {
      endCall();
      socket.disconnect();
    };
  }, [projectId, user, navigate]);

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Chat */}
        <Card>
          <CardHeader>
            <CardTitle>Project Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-y-auto mb-4 space-y-2 border rounded p-3">
              {messages.map((msg, i) => (
                <div key={i} className={`text-sm ${msg.isOwn ? 'text-right text-blue-600' : 'text-left'}`}>
                  <strong>{msg.sender}:</strong> {msg.text}
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-sm text-gray-500">No messages yet</div>
              )}
            </div>
            <div className="flex gap-2">
              <Input 
                value={text} 
                onChange={(e) => setText(e.target.value)} 
                placeholder="Type message..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button onClick={sendMessage}>Send</Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Video */}
        <Card>
          <CardHeader>
            <CardTitle>Video Call - Manual Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Connection Status */}
            <div className="text-sm">
              <strong>Status:</strong> {connectionState}
              {isOfferer && <span className="ml-2 text-blue-600">(Caller)</span>}
            </div>
            
            {/* Remote Video (Big) */}
            <div className="aspect-video bg-black rounded overflow-hidden">
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Local Video (Small) & Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-video bg-black rounded overflow-hidden">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="space-y-2">
                {connectionState === 'disconnected' && (
                  <Button onClick={startCall} className="w-full">
                    Start Call
                  </Button>
                )}
                
                {pcRef.current && !localStream && (
                  <Button onClick={answerCall} className="w-full" variant="secondary">
                    Answer Call
                  </Button>
                )}
                
                {connectionState !== 'disconnected' && (
                  <Button onClick={endCall} className="w-full" variant="destructive">
                    End Call
                  </Button>
                )}
                
                <div className="text-xs text-gray-500">
                  Instructions:<br/>
                  1. First user clicks "Start Call"<br/>
                  2. Second user clicks "Answer Call"<br/>
                  3. Wait for connection...
                </div>
              </div>
            </div>
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
}