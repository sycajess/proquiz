import React, { useState, useEffect } from 'react';
import { Tv, Columns, Smartphone, LogOut, ExternalLink } from 'lucide-react';
import { getPresentUrl, getControlUrl } from '../utils/joinUrl';
import { Slide, Participant, LiveResponse } from '../types';
import PresenterScreen from './PresenterScreen';
import ParticipantScreen from './ParticipantScreen';

interface InteractiveShowcaseProps {
  initialRoomCode: string;
  onExit: () => void;
}

export default function InteractiveShowcase({ 
  initialRoomCode, 
  onExit 
}: InteractiveShowcaseProps) {
  
  const [viewMode, setViewMode] = useState<'projector' | 'sandbox'>('sandbox');
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [responses, setResponses] = useState<LiveResponse[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  // Setup main presenter socket to stream live responses and state
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setConnected(true);
      // Register as presenter for this room code
      socket.send(JSON.stringify({
        type: 'create_room',
        roomCode: initialRoomCode
      }));
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, payload } = msg;

        if (type === 'room_state_update') {
          const { session: sess, participants: players, responses: votes } = payload;
          setSession(sess);
          setParticipants(players);
          setResponses(votes);
        }
      } catch (err) {
        console.error("Presenter failed to process socket update:", err);
      }
    };

    socket.onerror = () => {
      console.error("Presenter socket connection failed.");
      setConnected(false);
    };

    socket.onclose = () => {
      setConnected(false);
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [initialRoomCode]);

  const handleSendMessage = (type: string, payload?: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type,
        roomCode: initialRoomCode,
        payload
      }));
    }
  };

  if (!session) {
    return (
      <div className="bg-slate-950 min-h-screen text-slate-100 flex flex-col justify-center items-center py-20">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-slate-700/60 border-t-violet-400 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-400 font-medium">Bootstrapping WebSocket Room {initialRoomCode}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 flex flex-col justify-between">
      
      {/* Top Banner Control Switcher */}
      <div className="bg-slate-900 border-b border-slate-800 px-5 py-3.5 flex flex-wrap gap-4 items-center justify-between z-20">
        
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <p className="text-xs font-bold text-slate-300">
            Room: <span className="font-mono text-slate-50">{initialRoomCode}</span>
          </p>
          <span className="text-slate-700">|</span>
          <p className="text-[11px] text-slate-400">
            Slide Type: <span className="text-slate-200 capitalize font-medium">{session.slides[session.currentSlideIndex]?.type.replace('_', ' ')}</span>
          </p>
        </div>

        {/* View Selection Sliders */}
        <div className="flex items-center gap-4 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('sandbox')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition ${
              viewMode === 'sandbox' 
                ? 'bg-gradient-to-r from-violet-600 to-sky-600 text-white font-bold shadow-md' 
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            <Columns className="h-3.5 w-3.5" />
            Split-Screen Sandbox
          </button>

          <button
            onClick={() => setViewMode('projector')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition ${
              viewMode === 'projector' 
                ? 'bg-gradient-to-r from-violet-600 to-sky-600 text-white font-bold shadow-md' 
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            <Tv className="h-3.5 w-3.5" />
            Presenter Projector Only
          </button>
        </div>

        <div className="flex items-center gap-3">
          <a href={getPresentUrl(initialRoomCode)} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white text-[10px] font-bold flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Projector</a>
          <a href={getControlUrl(initialRoomCode)} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white text-[10px] font-bold flex items-center gap-1"><Smartphone className="h-3 w-3" /> Remote</a>
          <button onClick={onExit} className="text-slate-400 hover:text-slate-100 font-semibold text-xs flex items-center gap-1 cursor-pointer"><LogOut className="h-3.5 w-3.5" /> End</button>
        </div>
      </div>

      {/* Main Core Showcase Pane */}
      <div className="grow relative">
        {viewMode === 'projector' ? (
          
          <div className="h-full w-full">
            <PresenterScreen
              session={session}
              participants={participants}
              responses={responses}
              onSendMessage={handleSendMessage}
              onExit={onExit}
            />
          </div>

        ) : (
          
          // SIDE-BY-SIDE SANDBOX MODE
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-62px)]">
            
            {/* Left Frame: Presenter Screen (occupies 7 columns) */}
            <div className="lg:col-span-8 border-r border-slate-900 overflow-y-auto bg-slate-950">
              <PresenterScreen
                session={session}
                participants={participants}
                responses={responses}
                onSendMessage={handleSendMessage}
                onExit={onExit}
              />
            </div>

            {/* Right Frame: Phone Simulator (occupies 4 columns) */}
            <div className="lg:col-span-4 bg-slate-900 flex flex-col justify-center items-center py-8 px-4 overflow-y-auto relative">
              
              {/* Simulator info panel */}
              <div className="absolute top-2 left-4 right-4 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  RESPONSIVE CLIENT PORTAL
                </span>
                <span>Active local simulation</span>
              </div>

              {/* iPhone / Smartphone Mockup framing */}
              <div className="relative w-full max-w-[290px] aspect-[9/18.5] bg-slate-950 border-[6px] border-slate-800 rounded-[36px] shadow-2xl overflow-hidden flex flex-col justify-between ring-1 ring-slate-800/25">
                
                {/* Dynamic Camera Notch (iPhone style) */}
                <span className="absolute top-1 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-slate-800 rounded-full z-30"></span>

                {/* Inner simulated player */}
                <div className="grow overflow-hidden relative">
                  <ParticipantScreen
                    initialRoomCode={initialRoomCode}
                    onExit={() => setViewMode('projector')}
                  />
                </div>
              </div>

              {/* Interactive coaching footer */}
              <p className="mt-4 text-[10px] text-slate-400 text-center max-w-[240px] leading-relaxed select-none">
                💡 <span className="font-semibold text-slate-300">Sandbox Training:</span> Interact with the phone simulator above to join, answer, slide ratings, or type word blocks, and see the host graphs synchronize live!
              </p>

            </div>

          </div>
        )}
      </div>

    </div>
  );
}
