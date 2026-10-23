import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_BASE_URL } from '@/lib/api/http';
import { RootState } from '@/store';

export default function Workspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  // WebRTC refs
  const socketRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  // Simple states
  const [status, setStatus] = useState('Ready');
  
  const { user } = useSelector((s: RootState) => s.auth);

  // Get media
  const getMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Error getting media:', error);
      throw error;
    }
  };

  // Start call (caller)
  const startCall = async () => {
    try {
      setStatus('Starting call...');
      
      // Get media first
      const stream = await getMedia();
      
      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      // Add event handlers
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current?.emit('signal', {
            type: 'ice',
            data: e.candidate,
            room: projectId
          });
        }
      };
      
      pc.ontrack = (e) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
        }
      };
      
      pc.onconnectionstatechange = () => {
        setStatus(`Connection: ${pc.connectionState}`);
      };
      
      // Add local stream
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      pcRef.current = pc;
      
      // Send offer
      socketRef.current?.emit('signal', {
        type: 'offer',
        data: offer,
        room: projectId
      });
      
      setStatus('Waiting for answer...');
      
    } catch (error) {
      console.error('Start call error:', error);
      setStatus('Error starting call');
    }
  };

  // Answer call (receiver)
  const answerCall = async (offer: RTCSessionDescriptionInit) => {
    try {
      setStatus('Answering call...');
      
      // Get media first
      const stream = await getMedia();
      
      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      // Add event handlers
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current?.emit('signal', {
            type: 'ice',
            data: e.candidate,
            room: projectId
          });
        }
      };
      
      pc.ontrack = (e) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
        }
      };
      
      pc.onconnectionstatechange = () => {
        setStatus(`Connection: ${pc.connectionState}`);
      };
      
      // Add local stream
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      // Set remote description
      await pc.setRemoteDescription(offer);
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      pcRef.current = pc;
      
      // Send answer
      socketRef.current?.emit('signal', {
        type: 'answer',
        data: answer,
        room: projectId
      });
      
      setStatus('Call connected');
      
    } catch (error) {
      console.error('Answer call error:', error);
      setStatus('Error answering call');
    }
  };

  // End call
  const endCall = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    
    setStatus('Ready');
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const base = API_BASE_URL.replace(/\/api$/, '');
    const socket = io(base);
    socketRef.current = socket;
    
    socket.emit('join', projectId);
    
    // Handle signals
    socket.on('signal', async (data) => {
      console.log('Received signal:', data.type);
      
      try {
        if (data.type === 'offer') {
          await answerCall(data.data);
          
        } else if (data.type === 'answer' && pcRef.current) {
          await pcRef.current.setRemoteDescription(data.data);
          setStatus('Call connected');
          
        } else if (data.type === 'ice' && pcRef.current) {
          await pcRef.current.addIceCandidate(data.data);
        }
      } catch (error) {
        console.error('Signal error:', error);
      }
    });

    return () => {
      endCall();
      socket.disconnect();
    };
  }, [projectId, user, navigate]);

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Video Call - {status}</CardTitle>
        </CardHeader>
        <CardContent>
          
          {/* Controls */}
          <div className="mb-4 space-x-2">
            <Button onClick={startCall}>Start Call</Button>
            <Button onClick={endCall} variant="destructive">End Call</Button>
          </div>
          
          {/* Videos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-2 text-sm font-medium">Local Video</p>
              <video 
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-video bg-black rounded"
              />
            </div>
            
            <div>
              <p className="mb-2 text-sm font-medium">Remote Video</p>
              <video 
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full aspect-video bg-black rounded"
              />
            </div>
          </div>
          
        </CardContent>
      </Card>
    </div>
  );
}