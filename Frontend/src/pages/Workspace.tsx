import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { API_BASE_URL } from '@/lib/api/http';
import { messagesAPI } from '@/lib/api/messages';
import { projectAPI } from '@/lib/api/projects';
import { bidAPI } from '@/lib/api/bids';
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
  const [loadingProject, setLoadingProject] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const socketRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState('Ready');
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const { user } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    if (!projectId) return;

    let isMounted = true;

    const verifyAccessAndInit = async () => {
      setLoadingProject(true);
      try {
        const [project, bids] = await Promise.all([
          projectAPI.getProjectById(projectId),
          bidAPI.getBidsByProject(projectId).catch(() => []),
        ]);

        if (!isMounted) return;

        if (!project || !project.id) {
          setAccessDeniedMessage('Project not found.');
          setLoadingProject(false);
          return;
        }

        const hiredBids = (Array.isArray(bids) ? bids : []).filter((b: any) => b.status === 'hired');
        const hasHired =
          hiredBids.length > 0 ||
          Boolean(project.hiredBid) ||
          (Array.isArray((project as any).hiredFreelancers) && (project as any).hiredFreelancers.length > 0);

        if (!hasHired) {
          setAccessDeniedMessage(
            'Workspace is currently locked. The workspace only opens after one or more freelancers are hired for this project.'
          );
          setLoadingProject(false);
          return;
        }

        const isClient =
          user?.role === 'client' &&
          (String(project.client?.id || project.client) === String(user?.id));
        const isHiredFreelancer =
          user?.role === 'freelancer' &&
          hiredBids.some((b: any) => String(b.freelancerId) === String(user?.id));

        if (!isClient && !isHiredFreelancer) {
          setAccessDeniedMessage(
            'Access Denied: You must be the project owner or a hired freelancer to enter this workspace.'
          );
          setLoadingProject(false);
          return;
        }

        setAccessDeniedMessage(null);
        setLoadingProject(false);

        // Initialize socket and WebRTC
        const base = API_BASE_URL.replace(/\/api$/, '');
        const token = localStorage.getItem('token');
        const socket = io(base, { withCredentials: true, auth: { token } });
        socketRef.current = socket;
        const roomId = `project:${projectId}`;
        socket.emit('join-room', roomId);
        socket.emit('join', projectId);

        socket.on('message-with-sender', (msg: any) => {
          setMessages((m) => [
            ...m,
            {
              content: msg.content,
              createdAt: msg.createdAt,
              sender: msg.sender?.name || 'Unknown',
              senderAvatar: msg.sender?.avatar,
              attachments: msg.attachments,
            },
          ]);
        });

        socket.on('signal', async (data) => {
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

        // Load project message history
        try {
          const history = await messagesAPI.getProjectMessages(projectId);
          if (isMounted) setMessages(history);
        } catch {}
      } catch (err: any) {
        if (isMounted) {
          setAccessDeniedMessage(err?.message || 'Failed to verify workspace access.');
          setLoadingProject(false);
        }
      }
    };

    verifyAccessAndInit();

    return () => {
      isMounted = false;
      endCall();
      socketRef.current?.disconnect();
    };
  }, [projectId, user?.id]);

  // Your working chat function
  const sendMessage = () => {
    if (!text.trim()) return;
    const roomId = `project:${projectId}`;
    socketRef.current?.emit('message', { roomId, message: text });
    setText('');
  };

  // My WebRTC functions
  const getMedia = async () => {
    try {
      console.log('🎥 Getting user media...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('✅ Got stream:', stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('✅ Set local video source');
      }
      return stream;
    } catch (error) {
      console.error('❌ Error getting media:', error);
      throw error;
    }
  };

  const startCall = async () => {
    try {
      console.log('📞 Starting call...');
      setStatus('Starting call...');
      
      const stream = await getMedia();
      
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
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
      
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      pcRef.current = pc;
      
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

  const answerCall = async (offer: RTCSessionDescriptionInit) => {
    try {
      setStatus('Answering call...');
      
      const stream = await getMedia();
      
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
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
      
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      await pc.setRemoteDescription(offer);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      pcRef.current = pc;
      
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

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMuted(!muted);
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setVideoOff(!videoOff);
  };

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

  if (loadingProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Verifying workspace permissions...</p>
        </div>
      </div>
    );
  }

  if (accessDeniedMessage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle className="text-xl">Workspace Unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm leading-relaxed">
              {accessDeniedMessage}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button onClick={() => navigate(`/projects/${projectId}`)}>
                Back to Project Details
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                <CardTitle>Basic Video Call - {status}</CardTitle>
              </CardHeader>
              <CardContent>
                
                {/* Simple Controls */}
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
                          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
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
