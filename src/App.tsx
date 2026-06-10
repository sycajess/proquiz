import React, { useState, useEffect } from 'react';
import { Sparkles, HelpCircle, BarChart2, Cloud, Sliders, Gamepad2, Tv, ChevronRight, ArrowLeft, MessageSquare, FileText } from 'lucide-react';
import PresenterDashboard from './components/PresenterDashboard';
import ParticipantScreen from './components/ParticipantScreen';
import InteractiveShowcase from './components/InteractiveShowcase';
import PresenterRemote from './components/PresenterRemote';
import PresenterScreen from './components/PresenterScreen';
import { Slide } from './types';

type Role = 'landing' | 'presenter_dashboard' | 'presenting' | 'participant' | 'present_only' | 'control_only';

function parseRoute(): { role: Role; code: string } {
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts[0] === 'join' && parts[1]) return { role: 'participant', code: parts[1] };
  if (parts[0] === 'present' && parts[1]) return { role: 'present_only', code: parts[1] };
  if (parts[0] === 'control' && parts[1]) return { role: 'control_only', code: parts[1] };
  return { role: 'landing', code: '' };
}

function PresentOnlyView({ roomCode, onExit }: { roomCode: string; onExit: () => void }) {
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socket.onopen = () => socket.send(JSON.stringify({ type: 'create_room', roomCode }));
    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'room_state_update') {
        setSession(msg.payload.session);
        setParticipants(msg.payload.participants);
        setResponses(msg.payload.responses);
      }
    };
    return () => socket.close();
  }, [roomCode]);

  if (!session) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Connecting projector...</div>;

  return (
    <PresenterScreen
      session={session}
      participants={participants}
      responses={responses}
      onSendMessage={() => {}}
      onExit={onExit}
      displayOnly
    />
  );
}

function ControlOnlyView({ roomCode, onExit }: { roomCode: string; onExit: () => void }) {
  const [session, setSession] = useState<any>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socket.onopen = () => socket.send(JSON.stringify({ type: 'create_room', roomCode }));
    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'room_state_update') setSession(msg.payload.session);
    };
    setWs(socket);
    return () => socket.close();
  }, [roomCode]);

  const send = (type: string, payload?: any) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, roomCode, payload }));
  };

  if (!session) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">Connecting remote...</div>;

  return <PresenterRemote session={session} onSendMessage={send} onExit={onExit} />;
}

export default function App() {
  const route = parseRoute();
  const [role, setRole] = useState<Role>(route.role);
  const [activeRoomCode, setActiveRoomCode] = useState(route.code);
  const [sessionSlides, setSessionSlides] = useState<Slide[]>([]);
  const [loadingCode, setLoadingCode] = useState(false);

  const startLivePresentation = async (slides: Slide[], password?: string) => {
    setLoadingCode(true);
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides, password: password?.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start');
      setSessionSlides(slides);
      setActiveRoomCode(data.roomCode);
      setRole('presenting');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoadingCode(false);
    }
  };

  const handleExitToLanding = () => {
    window.history.pushState({}, '', '/');
    setRole('landing');
    setActiveRoomCode('');
    setSessionSlides([]);
  };

  if (role === 'present_only') {
    return <PresentOnlyView roomCode={activeRoomCode} onExit={handleExitToLanding} />;
  }

  if (role === 'control_only') {
    return <ControlOnlyView roomCode={activeRoomCode} onExit={handleExitToLanding} />;
  }

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 flex flex-col justify-between selection:bg-indigo-600 selection:text-white font-sans antialiased">
      {role === 'landing' && (
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur py-4 px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow font-mono font-bold text-white text-base">P</div>
            <span className="font-extrabold tracking-tight text-slate-900 text-sm md:text-base font-heading">
              ProQuiz <span className="text-indigo-600 font-medium">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full text-[11px] text-slate-500 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Real-time Active</span>
          </div>
        </header>
      )}

      <main className="grow flex flex-col justify-center py-6 px-4 md:px-12 max-w-7xl mx-auto w-full">
        {role === 'landing' && (
          <div className="space-y-12 py-6 animate-fade-in">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Automated ProQuiz AI Creator</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none font-heading">
                Interactive AI Polling & <br className="hidden md:block" />
                <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 bg-clip-text text-transparent">Quiz Presentation Deck</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
                Real-time polls, quizzes, word clouds, Q&A and more. No login needed.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
              <div onClick={() => setRole('presenter_dashboard')} className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-500 hover:shadow-lg duration-200 cursor-pointer text-left space-y-5 shadow-sm">
                <div className="p-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl w-fit"><Tv className="h-6 w-6" /></div>
                <div className="space-y-1.5">
                  <h2 className="font-extrabold text-slate-800 text-base group-hover:text-indigo-600 font-heading">Be a Presenter / Host</h2>
                  <p className="text-xs text-slate-500 leading-relaxed">Build or generate slides, launch live sessions, control from your phone.</p>
                </div>
              </div>
              <div onClick={() => setRole('participant')} className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-500 hover:shadow-lg duration-200 cursor-pointer text-left space-y-5 shadow-sm">
                <div className="p-3 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl w-fit"><Gamepad2 className="h-6 w-6" /></div>
                <div className="space-y-1.5">
                  <h2 className="font-extrabold text-slate-800 text-base group-hover:text-indigo-600 font-heading">Join as Audience</h2>
                  <p className="text-xs text-slate-500 leading-relaxed">Enter the 6-digit code and participate in real time.</p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-8 max-w-2xl mx-auto">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold text-center mb-4">Slide Types</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {[
                  { icon: HelpCircle, label: 'Quiz', color: 'text-rose-500' },
                  { icon: BarChart2, label: 'Polls', color: 'text-indigo-500' },
                  { icon: Cloud, label: 'Word Cloud', color: 'text-emerald-500' },
                  { icon: Sliders, label: 'Rating', color: 'text-amber-500' },
                  { icon: MessageSquare, label: 'Q&A', color: 'text-purple-500' },
                  { icon: FileText, label: 'Content', color: 'text-sky-500' },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center gap-2 shadow-sm font-semibold text-slate-700">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {role === 'presenter_dashboard' && (
          <div className="space-y-5 py-4 animate-fade-in w-full">
            <button onClick={handleExitToLanding} className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer w-fit">
              <ArrowLeft className="h-4 w-4" /> Exit Dashboard
            </button>
            <PresenterDashboard onStartSession={startLivePresentation} />
          </div>
        )}

        {role === 'presenting' && (
          <div className="w-full h-full min-h-[80vh] flex flex-col justify-center animate-fade-in">
            {loadingCode ? (
              <div className="text-center"><div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div></div>
            ) : (
              <InteractiveShowcase initialRoomCode={activeRoomCode} onExit={handleExitToLanding} />
            )}
          </div>
        )}

        {role === 'participant' && (
          <div className="w-full h-full flex flex-col justify-center animate-fade-in">
            <ParticipantScreen initialRoomCode={activeRoomCode} onExit={handleExitToLanding} />
          </div>
        )}
      </main>

      {role === 'landing' && (
        <footer className="border-t border-slate-200 py-4 text-center text-[10px] text-slate-400 font-mono">ProQuiz AI • No login required</footer>
      )}
    </div>
  );
}
