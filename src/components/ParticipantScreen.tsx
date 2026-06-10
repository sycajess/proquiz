import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, Send, Gamepad2, Clock, X, ArrowLeft, ChevronRight, Info, MessageSquare, ThumbsUp, FileText
} from 'lucide-react';
import { Slide, Participant, LiveResponse } from '../types';

interface ParticipantScreenProps {
  initialRoomCode?: string;
  onExit: () => void;
  /** When rendered inside the sandbox phone frame */
  embedded?: boolean;
}

function participantShell(embedded: boolean, extra = '') {
  return embedded
    ? `bg-slate-50 h-full min-h-0 overflow-y-auto overscroll-y-contain text-slate-900 flex flex-col font-sans ${extra}`
    : `bg-slate-50 min-h-screen text-slate-900 flex flex-col font-sans ${extra}`;
}

const AVATAR_EMOJIS = ['🦕', '🚀', '🦊', '🦉', '🍕', '🐱', '🥑', '👾', '🦄', '🦁', '🐨', '🎯', '🔥', '🎨'];

export default function ParticipantScreen({ 
  initialRoomCode = '', 
  onExit,
  embedded = false,
}: ParticipantScreenProps) {
  
  // Connection states
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_EMOJIS[0]);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sockets & Game State
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<any>(null); // PresentationSession
  const [sessionParticipants, setSessionParticipants] = useState<Participant[]>([]);
  const [responseSubmitted, setResponseSubmitted] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  // Participant results state
  const [isCorrectFeedback, setIsCorrectFeedback] = useState<boolean | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number>(0);

  // Input states during answering
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [wordInputs, setWordInputs] = useState(['', '', '']);
  const [ratingValues, setRatingValues] = useState<{ [index: number]: number }>({});
  const [qaText, setQaText] = useState('');
  const [liveResponses, setLiveResponses] = useState<any[]>([]);
  const [roomPassword, setRoomPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [presenterOffline, setPresenterOffline] = useState(false);

  const slideIndexRef = useRef<number>(-1);
  const slideOpenedAt = useRef<number>(0);
  const participantIdRef = useRef<string | null>(null);

  const SESSION_KEY = 'proquiz_session';

  const saveSession = (code: string, pid: string, nick: string, av: string) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ code, participantId: pid, nickname: nick, avatar: av }));
  };

  const connectToSocket = (code: string, nickNameInput: string, avatarInput: string, rejoinId?: string) => {
    setIsJoining(true);
    setErrorMessage('');

    // Protocol-agnostic WS connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      if (rejoinId) {
        socket.send(JSON.stringify({
          type: 'rejoin_room',
          payload: { code, participantId: rejoinId, nickname: nickNameInput, avatar: avatarInput }
        }));
      } else {
        socket.send(JSON.stringify({
          type: 'join_room',
          payload: { code, nickname: nickNameInput, avatar: avatarInput, password: roomPassword || undefined }
        }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, payload } = msg;

        switch (type) {
          case 'room_joined': {
            participantIdRef.current = payload.participantId;
            setParticipantId(payload.participantId);
            setRoomState(payload.session);
            setJoinedRoom(true);
            setIsJoining(false);
            saveSession(code, payload.participantId, nickNameInput, avatarInput);
            break;
          }

          case 'room_error': {
            setErrorMessage(payload.message || 'Room pin connection denied.');
            setIsJoining(false);
            socket.close();
            break;
          }

          case 'room_state_update': {
            const { session, participants: players, responses, isPresenter } = payload;
            if (isPresenter) return;

            setRoomState(session);
            setSessionParticipants(players);
            setLiveResponses(responses || []);
            if (payload.presenterDisconnected !== undefined) setPresenterOffline(payload.presenterDisconnected);

            // IfPresenter advanced Slide index, reset response submission flags as fresh questions occur
            if (session.currentSlideIndex !== slideIndexRef.current) {
              slideIndexRef.current = session.currentSlideIndex;
              setResponseSubmitted(false);
              setSelectedOption(null);
              setWordInputs(['', '', '']);
              
              // Reset rating defaults to standard midpoint 5
              const initialRatings: { [i: number]: number } = {};
              const activeSlide = session.slides[session.currentSlideIndex];
              if (activeSlide && activeSlide.type === 'rating_scale') {
                activeSlide.scaleStatements.forEach((_: any, idx: number) => {
                  initialRatings[idx] = 5;
                });
              }
              setRatingValues(initialRatings);

              // Record slide start time for timer speed score potential
              slideOpenedAt.current = Date.now();
              setIsAnswerRevealed(false);
              setIsCorrectFeedback(null);
              setPointsEarned(0);
            }

            // Sync reveal answer feedback
            if (session.showQuizCorrectAnswer) {
              setIsAnswerRevealed(true);
            }

            break;
          }

          case 'response_received': {
            setResponseSubmitted(true);
            
            // If quiz, gather answer correctness feedback instantly
            if (payload.feedback && payload.feedback.correct !== undefined) {
              setIsCorrectFeedback(payload.feedback.correct);
              setPointsEarned(payload.feedback.pointsEarned || 0);
            }
            break;
          }

          default:
            break;
        }

      } catch (err) {
        console.error("Socket error processing participant payload:", err);
      }
    };

    socket.onerror = () => {
      setErrorMessage("Could not establish server link. Please refresh.");
      setIsJoining(false);
    };

    socket.onclose = () => {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved && participantIdRef.current) {
        const { code, nickname: nick, avatar: av, participantId: pid } = JSON.parse(saved);
        setTimeout(() => connectToSocket(code, nick, av, pid), 1500);
      } else {
        setJoinedRoom(false);
        setRoomState(null);
      }
    };

    setWs(socket);
  };

  useEffect(() => {
    if (roomCode.length === 6) {
      fetch(`/api/rooms/${roomCode}`).then(r => r.ok ? r.json() : null).then(d => {
        if (d) setNeedsPassword(!!d.hasPassword);
      });
    }
  }, [roomCode]);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || !nickname.trim()) return;
    if (needsPassword && !roomPassword.trim()) {
      setErrorMessage('This room requires a password');
      return;
    }
    connectToSocket(roomCode.trim(), nickname.trim(), selectedAvatar);
  };

  const submitOptionPollResponse = (optionIndex: number) => {
    if (!ws || responseSubmitted) return;

    setSelectedOption(optionIndex);
    const msElapsed = Date.now() - slideOpenedAt.current;

    ws.send(JSON.stringify({
      type: 'submit_response',
      roomCode: roomCode,
      payload: {
        optionIndex,
        timeTaken: msElapsed
      }
    }));
  };

  const submitWordCloudResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ws || responseSubmitted) return;

    // Filter empty values
    const words = wordInputs.map(w => w.trim()).filter(w => w.length > 0);
    if (words.length === 0) return;

    ws.send(JSON.stringify({
      type: 'submit_response',
      roomCode: roomCode,
      payload: {
        words
      }
    }));
  };

  const submitQAResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ws || !qaText.trim()) return;
    ws.send(JSON.stringify({
      type: 'submit_response',
      roomCode,
      payload: { text: qaText.trim() }
    }));
    setQaText('');
  };

  const upvoteQA = (qaId: string) => {
    if (!ws) return;
    ws.send(JSON.stringify({ type: 'upvote_qa', roomCode, payload: { qaId } }));
  };

  const submitRatingResponse = () => {
    if (!ws || responseSubmitted) return;

    const ratingsList = Object.entries(ratingValues).map(([key, val]) => ({
      statementIndex: Number(key),
      value: val
    }));

    ws.send(JSON.stringify({
      type: 'submit_response',
      roomCode: roomCode,
      payload: {
        ratings: ratingsList
      }
    }));
  };

  const handleLeaveAndCleanup = () => {
    if (ws) ws.close();
    onExit();
  };

  useEffect(() => {
    if (initialRoomCode || joinedRoom) return;
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      const { code, participantId: pid, nickname: nick, avatar: av } = JSON.parse(saved);
      fetch(`/api/rooms/${code}`).then(r => {
        if (r.ok) {
          setRoomCode(code);
          setNickname(nick);
          setSelectedAvatar(av);
          connectToSocket(code, nick, av, pid);
        }
      });
    }
  }, []);

  useEffect(() => {
    return () => { if (ws) ws.close(); };
  }, [ws]);

  // RENDER lobby onboarding profile customizer
  if (!joinedRoom || !roomState) {
    return (
      <div className={participantShell(embedded, embedded ? 'items-center p-3 pb-6' : 'justify-center items-center p-6 relative')}>
        
        <div className={`w-full ${embedded ? 'space-y-3' : 'max-w-sm space-y-6'} z-10 animate-fade-in`}>
          
          <div className="text-center space-y-1">
            {!embedded && (
              <button 
                onClick={onExit}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 mx-auto font-bold cursor-pointer transition mb-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Choice
              </button>
            )}
            <h2 className={`${embedded ? 'text-lg' : 'text-2xl'} font-black font-heading text-slate-900 tracking-tight`}>
              {embedded ? 'Join Session' : 'Explorer Join Panel'}
            </h2>
            {!embedded && (
              <p className="text-xs text-slate-550 font-medium">Join the active presentation session in real-time</p>
            )}
          </div>

          <form onSubmit={handleJoinSubmit} className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${embedded ? 'p-4 space-y-3' : 'p-6 space-y-4'}`}>
            
            {/* PIN Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 block uppercase">6-Digit Room Pin</label>
              <input
                type="text"
                placeholder="e.g. 521839"
                maxLength={6}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-900 rounded-xl text-center text-xl font-extrabold font-mono tracking-widest focus:outline-none transition"
                required
                disabled={isJoining}
              />
            </div>

            {/* Nickname */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 block uppercase">Your Display Name</label>
              <input
                type="text"
                placeholder="e.g. PixelFox"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={18}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-900 rounded-xl text-sm focus:outline-none transition font-bold"
                required
                disabled={isJoining}
              />
            </div>

            {/* Emoji Avatar Pickers */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 block uppercase">Select Avatar Emoji</label>
              <div className={`grid ${embedded ? 'grid-cols-6' : 'grid-cols-7'} gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-2xl max-h-[88px] overflow-y-auto`}>
                {AVATAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`text-xl p-1 rounded-lg transition-all transform hover:scale-110 active:scale-95 cursor-pointer ${
                      selectedAvatar === emoji ? 'bg-indigo-55 bg-indigo-50 border border-indigo-300 scale-105' : 'hover:bg-slate-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {needsPassword && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 block uppercase">Room Password</label>
                <input type="password" value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" required />
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-start gap-1.5 leading-relaxed font-semibold">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isJoining || !nickname.trim() || roomCode.length < 5}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-550 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition duration-200"
            >
              {isJoining ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                  <span>Establishing Connection...</span>
                </>
              ) : (
                <>
                  <Gamepad2 className="h-4 w-4" />
                  <span>Enter Presentation Room</span>
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    );
  }

  // --- RENDERING SYNCHRONIZED PRESENTATION RESPONDER ---

  const activeIdx = roomState.currentSlideIndex;
  const currentSlide: Slide | undefined = roomState.slides[activeIdx];
  const myPlayerState = sessionParticipants.find(p => p.id === participantId);

  // Presenter ended the entire event
  if (roomState.status === 'ended' || !currentSlide) {
    const leaderSorted = [...sessionParticipants].sort((a,b) => b.score - a.score);
    const myRankIdx = leaderSorted.findIndex(p => p.id === participantId);

    return (
      <div className={participantShell(embedded, `${embedded ? 'p-3 gap-4' : 'justify-between p-6'} animate-fade-in`)}>
        <div className={`text-center ${embedded ? 'pt-4' : 'pt-8'} space-y-2`}>
          <p className={`${embedded ? 'text-3xl' : 'text-5xl'} animate-bounce`}>🏆</p>
          <h2 className="text-xl font-black text-slate-800 tracking-tight font-heading">Presentation Exit Panel</h2>
          <p className="text-xs text-slate-550 font-medium">The presenter has finished the session</p>
        </div>

        <div className="max-w-xs mx-auto w-full bg-white border border-slate-200 rounded-2xl p-5 text-center space-y-4 shadow-sm animate-fade-in">
          <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
            <span className="text-3xl block">{selectedAvatar}</span>
            <h3 className="font-extrabold text-slate-800 text-base leading-none font-heading">{nickname}</h3>
            <p className="text-[10px] text-slate-455 font-mono tracking-wider font-extrabold uppercase leading-none">Your final Stats</p>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-center text-xs">
            <div className="bg-slate-50 py-3 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 text-[9px] block font-extrabold uppercase leading-tight font-sans">Total Score</span>
              <span className="font-bold text-lg text-amber-600">{myPlayerState?.score || 0}</span>
            </div>
            <div className="bg-slate-50 py-3 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 text-[9px] block font-extrabold uppercase leading-tight font-sans">Ending Rank</span>
              <span className="font-bold text-lg text-indigo-600 font-bold">
                {myRankIdx !== -1 ? `#${myRankIdx + 1}` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-center pb-4">
          <button
            onClick={handleLeaveAndCleanup}
            className="py-2.5 px-6 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 rounded-xl text-xs cursor-pointer shadow-xs transition"
          >
            Leave Panel & Exit
          </button>
        </div>
      </div>
    );
  }

  // Lobby wait screen details
  if (roomState.status === 'lobby') {
    return (
      <div className={participantShell(embedded, `${embedded ? 'p-3 gap-4' : 'justify-between p-6'}`)}>
        <div className="flex justify-between items-center bg-white px-4 py-2 border border-slate-200 rounded-2xl shadow-xs text-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span>{selectedAvatar}</span>
            <span className="font-bold text-xs">{nickname}</span>
          </div>
          <span className="font-mono font-bold text-indigo-600 text-xs uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150">
            Room Code: {roomCode}
          </span>
        </div>

        <div className={`max-w-md mx-auto w-full text-center ${embedded ? 'py-4' : 'py-16'} space-y-4`}>
          <div className="relative">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100 mx-auto animate-pulse">
              <Clock className="h-8 w-8 text-indigo-600 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-black text-slate-800 font-heading">Welcome to the Lobby!</h2>
            <p className="text-xs text-slate-550 max-w-[280px] mx-auto leading-relaxed font-semibold">
              We're waiting for the host to start the presentation slides. Kick back and observe the screen.
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl max-w-xs mx-auto border border-slate-200 text-xs shadow-xs">
            <span className="text-slate-405 text-slate-400 font-medium block mb-0.5">Explorers waiting in Lobby</span>
            <span className="font-mono font-black text-indigo-600 text-lg">
              {sessionParticipants.length}
            </span>
          </div>
        </div>

        <div className="flex justify-center pb-4">
          <button
            onClick={handleLeaveAndCleanup}
            className="text-[10px] text-slate-400 hover:text-rose-500 font-bold flex items-center gap-1 cursor-pointer transition"
          >
            <X className="h-3 w-3" /> Disconnect & Exit
          </button>
        </div>
      </div>
    );
  }

  const isMultipleChoice = currentSlide.type === 'multiple_choice';
  const isQuiz = currentSlide.type === 'quiz';
  const isWordCloud = currentSlide.type === 'word_cloud';
  const isScale = currentSlide.type === 'rating_scale';
  const isQA = currentSlide.type === 'qa';
  const isContent = currentSlide.type === 'content';

  return (
    <div className={participantShell(embedded, `${embedded ? 'p-3 gap-3' : 'justify-between p-6'}`)}>
      
      {presenterOffline && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-4 py-2 rounded-xl text-center">
          Presenter disconnected — waiting for host to reconnect
        </div>
      )}

      <div className="flex justify-between items-center bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-xs text-slate-800">
        <div className="flex items-center gap-2 animate-fade-in">
          <span className="text-lg leading-none">{selectedAvatar}</span>
          <div className="text-left font-sans">
            <span className="text-xs font-bold block leading-none">{nickname}</span>
            <span className="text-[10px] text-indigo-650 text-indigo-600 font-mono font-bold leading-none">{myPlayerState?.score || 0} pts</span>
          </div>
        </div>

        <div className="text-right font-sans">
          <span className="text-[9px] text-slate-400 block font-bold font-mono leading-none uppercase">SLIDE</span>
          <span className="text-xs font-mono font-extrabold text-slate-700 leading-none">{activeIdx + 1} of {roomState.slides.length}</span>
        </div>
      </div>

      {/* Main Response Pad */}
      <div className={`${embedded ? '' : 'grow'} flex flex-col ${embedded ? 'justify-start' : 'justify-center'} py-3`}>
        
        {isContent ? (
          <div className="text-center space-y-4 max-w-sm mx-auto">
            <FileText className="h-10 w-10 text-indigo-500 mx-auto" />
            <p className="text-sm text-slate-600 font-medium">Watch the presenter screen</p>
            <span className="text-[10px] text-slate-400 border border-slate-200 px-3 py-1.5 rounded-xl">Content slide — no action needed</span>
          </div>
        ) : responseSubmitted && !isQA ? (
          
          <div className="text-center space-y-6 animate-fade-in max-w-sm mx-auto w-full font-sans">
            
            {/* Feedback based on Quiz correct state */}
            {isQuiz && isAnswerRevealed && isCorrectFeedback !== null ? (
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="text-center">
                  {isCorrectFeedback ? (
                    <div className="space-y-2">
                      <p className="text-5xl animate-bounce">🎉</p>
                      <h3 className="text-lg font-black text-emerald-600 font-heading">CORRECT ANSWER!</h3>
                      <p className="text-sm font-extrabold font-mono text-emerald-800 bg-emerald-50 py-1 rounded">+{pointsEarned} Points</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-5xl animate-pulse">😢</p>
                      <h3 className="text-lg font-black text-rose-600 font-heading">Ouch! Incorrect option.</h3>
                      <p className="text-xs text-slate-500 font-medium">Correct answers speed earned higher value.</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 my-3"></div>

                <div className="bg-slate-50 p-2.5 rounded-xl text-[10px] text-slate-500 text-left font-semibold">
                  <span className="font-bold text-slate-700 block mb-0.5 font-heading">Observe Presenter:</span>
                  Check the screen for complete stats diagrams and explanation feedback.
                </div>
              </div>
            ) : (
              // General locked response state
              <div className="space-y-4">
                <div className="h-14 w-14 bg-emerald-55 bg-emerald-50 border border-emerald-150 rounded-full flex items-center justify-center mx-auto animate-bounce shadow-xs">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-800 font-heading">Response Submitted!</h3>
                  <p className="text-xs text-slate-550 max-w-[250px] mx-auto leading-relaxed font-semibold">
                    {isQuiz 
                      ? "Your answer is locked. Points were calculated based on accuracy and responsiveness speed!" 
                      : "We've added your thoughts. Look at the host projector screen to watch details stream live!"
                    }
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2">
              <span className="text-[10px] text-slate-400 border border-slate-200 uppercase px-3 py-1.5 rounded-xl bg-white shadow-xs">
                Awaiting presenter slide transition...
              </span>
            </div>

          </div>

        ) : (
          
          <div className="w-full max-w-sm mx-auto space-y-5">
            
            {/* Display prompt title briefly */}
            <div className="text-center font-sans">
              <h3 className="font-black text-sm text-slate-800 max-w-sm mx-auto leading-relaxed line-clamp-2 font-heading">
                {currentSlide.question}
              </h3>
              
              {/* Optional countdown visual */}
              {isQuiz && roomState.slideTimer !== null && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-red-500 font-mono font-bold mt-1.5 max-w-[124px] mx-auto bg-red-50 border border-red-100 px-3 py-0.5 rounded-full shadow-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Time: {roomState.slideTimer}s left</span>
                </div>
              )}
            </div>

            {/* RESPONSES ACTIONS BASED ON CLASS */}
            {isMultipleChoice || isQuiz ? (
              
              <div className="grid grid-cols-1 gap-2.5">
                {currentSlide.options && currentSlide.options.map((option, oIdx) => {
                  const letters = ['A', 'B', 'C', 'D'];
                  
                  return (
                    <button
                      key={oIdx}
                      onClick={() => submitOptionPollResponse(oIdx)}
                      className={`p-3 text-xs text-left rounded-2xl border flex items-center justify-between font-bold cursor-pointer transition transform active:scale-95 duration-100 shadow-xs ${
                        oIdx === 0 ? 'bg-indigo-50 border-indigo-150 text-indigo-950 hover:bg-indigo-100/50' :
                        oIdx === 1 ? 'bg-sky-50 border-sky-150 text-sky-955 text-sky-950 hover:bg-sky-100/50' :
                        oIdx === 2 ? 'bg-emerald-50 border-emerald-150 text-emerald-955 text-emerald-950 hover:bg-emerald-100/50' :
                        'bg-amber-50 border-amber-150 text-amber-955 text-amber-950 hover:bg-amber-100/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 font-sans font-bold">
                        {/* Option tag Bubble */}
                        <span className={`h-8 w-8 text-xs font-mono font-extrabold rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                          oIdx === 0 ? 'bg-indigo-600 text-indigo-50' :
                          oIdx === 1 ? 'bg-sky-600 text-sky-50' :
                          oIdx === 2 ? 'bg-emerald-600 text-emerald-50' :
                          'bg-amber-650 bg-amber-600 text-amber-50'
                        }`}>
                          {letters[oIdx]}
                        </span>
                        <span>{option}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-50 shrink-0 text-slate-500" />
                    </button>
                  );
                })}
              </div>

            ) : isWordCloud ? (
              
              <form onSubmit={submitWordCloudResponse} className="space-y-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
                <div className="space-y-1">
                  <span className="text-[10px] text-purple-400 font-mono font-bold block uppercase tracking-wide">Dynamic Word Cloud Input</span>
                  <label className="text-xs text-slate-300">Submit up to 3 individual words:</label>
                </div>

                <div className="space-y-2.5">
                  {[0, 1, 2].map((idx) => (
                    <input
                      key={idx}
                      type="text"
                      maxLength={15}
                      placeholder={`Enter Word #${idx + 1}`}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-purple-500 text-slate-200 text-xs rounded-xl focus:outline-none"
                      value={wordInputs[idx]}
                      onChange={(e) => {
                        const copy = [...wordInputs];
                        copy[idx] = e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''); // alphanumeric filters
                        setWordInputs(copy);
                      }}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={wordInputs.map(w => w.trim()).filter(w => w.length > 0).length === 0}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-slate-50 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer transition shadow"
                >
                  <Send className="h-3.5 w-3.5" />
                  Submit Words
                </button>
              </form>

            ) : isQA ? (
              <div className="space-y-4">
                <form onSubmit={submitQAResponse} className="space-y-2">
                  <textarea
                    value={qaText}
                    onChange={(e) => setQaText(e.target.value)}
                    placeholder="Type your question..."
                    maxLength={200}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 resize-none"
                    rows={3}
                  />
                  <button type="submit" disabled={!qaText.trim()} className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" /> Submit Question
                  </button>
                </form>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {liveResponses.filter((r: any) => r.type === 'qa' && !r.payload.hidden).map((r: any) => (
                    <div key={r.payload.id} className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs">
                      <span className="text-slate-700 line-clamp-2">{r.payload.text}</span>
                      <button onClick={() => upvoteQA(r.payload.id)} className="flex items-center gap-1 text-indigo-600 font-bold shrink-0 ml-2">
                        <ThumbsUp className="h-3.5 w-3.5" /> {r.payload.upvotes?.length || 0}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : isScale ? (
              
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4 text-slate-800 font-sans">
                <span className="text-[10px] text-indigo-600 font-heading font-extrabold block uppercase tracking-wider">Rating Gauge</span>
                
                <div className="space-y-4 font-sans">
                  {currentSlide.scaleStatements && currentSlide.scaleStatements.map((stmt, sIdx) => {
                    const currentVal = ratingValues[sIdx] || 5;
                    return (
                      <div key={sIdx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700 leading-tight block truncate max-w-[250px]">{stmt}</span>
                          <span className="font-mono font-bold text-indigo-650 text-indigo-650 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150 shadow-xs">
                            {currentVal}
                          </span>
                        </div>

                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          value={currentVal}
                          onChange={(e) => setRatingValues({
                            ...ratingValues,
                            [sIdx]: Number(e.target.value)
                          })}
                        />
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={submitRatingResponse}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs font-heading"
                >
                  Submit Evaluations
                </button>
              </div>

            ) : null}

          </div>
        )}

      </div>

      {/* Responder Footer */}
      <div className="flex justify-center border-t border-slate-205 border-slate-200 pt-4 font-sans pb-1">
        <button
          onClick={handleLeaveAndCleanup}
          className="text-[10px] text-slate-400 hover:text-rose-500 cursor-pointer transition font-bold"
        >
          Disconnect & Exit Room
        </button>
      </div>

    </div>
  );
}
