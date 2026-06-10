import React from 'react';
import { 
  Users, ChevronRight, ChevronLeft, Trophy, Timer, HelpCircle, BarChart2, Cloud, Sliders,
  Check, Lightbulb, CornerDownRight, RefreshCw, XSquare, Award, LogOut, MessageSquare,
  FileText, ThumbsUp, EyeOff, Download, Smartphone
} from 'lucide-react';
import { Slide, Participant, LiveResponse } from '../types';
import { getJoinUrl, getControlUrl, getPresentUrl } from '../utils/joinUrl';
import { exportSessionResults, downloadCsv } from '../utils/deckExport';
import WordCloudViz from './WordCloudViz';

interface PresenterScreenProps {
  session: any;
  participants: Participant[];
  responses: LiveResponse[];
  onSendMessage: (type: string, payload?: any) => void;
  onExit: () => void;
  displayOnly?: boolean;
}

const COLOR_PALETTES = [
  'text-violet-400 bg-violet-500/10 border-violet-500/20',
  'text-sky-400 bg-sky-500/10 border-sky-500/20',
  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'text-pink-400 bg-pink-500/10 border-pink-500/20',
  'text-rose-455 bg-rose-500/10 border-rose-500/20',
  'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  'text-teal-400 bg-teal-500/10 border-teal-500/20'
];

export default function PresenterScreen({ 
  session, participants, responses, onSendMessage, onExit, displayOnly = false
}: PresenterScreenProps) {
  
  const currentIdx = session.currentSlideIndex;
  const currentSlide: Slide | undefined = session.slides[currentIdx];
  const joinUrl = getJoinUrl(session.roomCode);

  // Compute stats based on responses
  const getMultipleChoiceCounts = () => {
    if (!currentSlide || (currentSlide.type !== 'multiple_choice' && currentSlide.type !== 'quiz')) {
      return [0, 0, 0, 0];
    }
    const counts = currentSlide.options.map(() => 0);
    responses.forEach((resp) => {
      if ((resp.type === 'multiple_choice' || resp.type === 'quiz') && resp.payload) {
        const optIndex = (resp.payload as any).optionIndex;
        if (optIndex >= 0 && optIndex < counts.length) {
          counts[optIndex]++;
        }
      }
    });
    return counts;
  };

  const getWordCloudFrequency = () => {
    const freq: { [word: string]: number } = {};
    responses.forEach((resp) => {
      if (resp.type === 'word_cloud' && resp.payload && resp.payload.words) {
        resp.payload.words.forEach((w: string) => {
          const clean = w.trim().toLowerCase();
          if (clean.length > 0) {
            freq[clean] = (freq[clean] || 0) + 1;
          }
        });
      }
    });

    // convert to list
    return Object.entries(freq).map(([word, count]) => ({
      word,
      count
    })).sort((a, b) => b.count - a.count);
  };

  const getRatingScales = () => {
    if (!currentSlide || currentSlide.type !== 'rating_scale') return [];
    
    // Initialize statement map
    const statementTotals = currentSlide.scaleStatements.map(() => ({ total: 0, count: 0 }));

    responses.forEach((resp) => {
      if (resp.type === 'rating_scale' && resp.payload && resp.payload.ratings) {
        resp.payload.ratings.forEach((item: any) => {
          const stmtIdx = item.statementIndex;
          if (stmtIdx >= 0 && stmtIdx < statementTotals.length) {
            statementTotals[stmtIdx].total += item.value;
            statementTotals[stmtIdx].count++;
          }
        });
      }
    });

    return currentSlide.scaleStatements.map((label, idx) => {
      const cell = statementTotals[idx];
      const avg = cell.count > 0 ? Number((cell.total / cell.count).toFixed(1)) : 0;
      return { label, average: avg, votes: cell.count };
    });
  };

  // Render Lobby Screen
  if (session.status === 'lobby') {
    return (
      <div className="bg-slate-50 min-h-screen text-slate-900 p-8 flex flex-col justify-between relative overflow-hidden font-sans">
        
        {/* Top bar instructions */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-5 z-10">
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-heading">
              ProQuiz AI <span className="text-indigo-655 text-indigo-600 font-medium">Live Host</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Get your presentation slides active instantly</p>
          </div>
          <button 
            onClick={onExit}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-850 border border-slate-200 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            Leave Room
          </button>
        </div>

        {/* Core Join Portal Box */}
        <div className="max-w-4xl mx-auto w-full text-center py-10 space-y-8 z-10">
          <div className="space-y-3">
            <h2 className="text-slate-400 text-xs uppercase font-extrabold font-heading tracking-widest">
              Join the Active Screen
            </h2>
            <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-xl mx-auto shadow-sm relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 rounded-full text-[10px] font-bold font-mono text-white">
                URL CONNECTION
              </div>
              
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(joinUrl)}`} alt="Join QR" className="rounded-lg w-[120px] h-[120px]" />
                  <div className="text-left space-y-3">
                    <p className="text-xs font-semibold text-slate-500">Scan or open:</p>
                    <p className="text-indigo-600 font-mono text-sm font-bold select-all break-all">{joinUrl}</p>
                    <p className="text-xs text-slate-500">Room code:</p>
                    <div className="text-4xl font-black tracking-widest text-indigo-900 font-mono select-all">{session.roomCode}</div>
                  </div>
                </div>
                {!displayOnly && (
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px]">
                    <a href={getPresentUrl(session.roomCode)} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 rounded-lg text-indigo-600 font-bold hover:bg-indigo-50">Open Projector View</a>
                    <a href={getControlUrl(session.roomCode)} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 rounded-lg text-indigo-600 font-bold hover:bg-indigo-50 flex items-center justify-center gap-1"><Smartphone className="h-3 w-3" /> Remote Control</a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Connected attendees presence counter */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <span className="text-lg font-extrabold text-slate-800 font-heading">
                {participants.length} {participants.length === 1 ? 'Explorer' : 'Explorers'} Joined
              </span>
            </div>

            {participants.length === 0 ? (
              <p className="text-xs text-slate-400 animate-pulse font-medium">Waiting for participants to connect...</p>
            ) : (
              <div className="flex flex-wrap justify-center gap-3.5 max-w-2xl mx-auto p-4 bg-white/60 rounded-2xl border border-slate-200 shadow-xs">
                {participants.map((player) => (
                  <div 
                    key={player.id}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:border-indigo-400 transition animate-fade-in shadow-xs text-slate-705"
                  >
                    <span className="text-base">{player.avatar}</span>
                    <span className="text-slate-700">{player.nickname}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Presenter Footer Control Panel */}
        <div className="flex justify-center pt-8 z-10 border-t border-slate-200">
          <button
            onClick={() => onSendMessage('start_presentation')}
            disabled={participants.length === 0}
            className="py-3.5 px-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold tracking-wide rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Start Interactive Presentation
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Finished Presenting screen
  if (session.status === 'ended' || !currentSlide) {
    const leaders = [...participants].sort((a,b) => b.score - a.score);
    const goldWinner = leaders[0];

    return (
      <div className="bg-slate-50 min-h-screen text-slate-900 p-8 flex flex-col justify-between relative overflow-hidden font-sans">
        
        <div className="text-center space-y-2 z-10">
          <h1 className="text-xs font-extrabold text-slate-405 text-slate-400 font-heading uppercase tracking-widest">Presentation Complete</h1>
          <p className="text-3xl font-black pb-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-805 bg-clip-text text-transparent leading-none">
            Spectacular Job Explorers!
          </p>
        </div>

        {/* Big Champion Display */}
        {goldWinner ? (
          <div className="max-w-md mx-auto w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm relative z-10 hover:border-indigo-200 duration-200">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center border border-amber-200 animate-bounce">
              <Award className="h-10 w-10 text-amber-500" />
            </div>

            <div className="pt-8 space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-amber-600 font-heading font-extrabold">Absolute Champion</p>
              <div className="flex items-center justify-center gap-2.5">
                <span className="text-3.5xl text-3xl">{goldWinner.avatar}</span>
                <h2 className="text-2.5xl text-2xl font-black text-slate-800 leading-none font-heading">{goldWinner.nickname}</h2>
              </div>
              <p className="text-base font-mono font-bold text-slate-500">{goldWinner.score} Direct Points</p>
            </div>
            
            <div className="border-t border-slate-100 my-4"></div>

            {/* Runner Ups list */}
            {leaders.length > 1 && (
              <div className="space-y-2">
                <p className="text-[9px] text-slate-400 text-left uppercase tracking-widest font-bold">Runner Ups</p>
                <div className="space-y-1.5 text-xs text-left max-h-[140px] overflow-y-auto pr-1">
                  {leaders.slice(1, 5).map((player, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 border border-slate-205 border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400">#{idx + 2}</span>
                        <span className="text-sm">{player.avatar}</span>
                        <span className="font-bold text-slate-700">{player.nickname}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-500">{player.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400 z-10">
            <Users className="h-10 w-10 mx-auto opacity-30 mb-2" />
            <p className="text-xs font-semibold">No participant responses were found.</p>
          </div>
        )}

        <div className="flex gap-4 justify-center pt-8 border-t border-slate-200 z-10">
          {!displayOnly && (
            <>
              <button
                onClick={async () => {
                  const res = await fetch(`/api/rooms/${session.roomCode}/export`);
                  if (res.ok) exportSessionResults(await res.json(), session.roomCode);
                }}
                className="py-2.5 px-6 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
              >
                <Download className="h-4 w-4" /> JSON
              </button>
              <button
                onClick={() => downloadCsv(session.roomCode)}
                className="py-2.5 px-6 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
              <button onClick={() => onSendMessage('reset_room')} className="py-2.5 px-6 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer">
                <RefreshCw className="h-4 w-4" /> Play Again
              </button>
            </>
          )}
          <button onClick={onExit} className="py-2.5 px-6 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer">
            <XSquare className="h-4 w-4" /> Close
          </button>
        </div>
      </div>
    );
  }

  // Presentation State rendering
  const isMultipleChoice = currentSlide.type === 'multiple_choice';
  const isQuiz = currentSlide.type === 'quiz';
  const isWordCloud = currentSlide.type === 'word_cloud';
  const isScale = currentSlide.type === 'rating_scale';
  const isQA = currentSlide.type === 'qa';
  const isContent = currentSlide.type === 'content';

  const mcCounts = getMultipleChoiceCounts();
  const totalVotesOnSlide = responses.length;

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 flex flex-col justify-between p-6 relative font-sans">
      
      {!session.presenterConnected && session.status === 'presenting' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-4 py-2 rounded-xl mb-3 text-center">
          Presenter connection lost — reopen session to restore control
        </div>
      )}

      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        
        {/* Presentation Context Info */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${
            isQuiz ? 'bg-red-50 border-red-155 text-red-600 border-red-100' :
            isMultipleChoice ? 'bg-indigo-50 border-indigo-155 text-indigo-600 border-indigo-100' :
            isWordCloud ? 'bg-emerald-50 border-emerald-155 text-emerald-600 border-emerald-100' :
            'bg-amber-50 border-amber-155 text-amber-600 border-amber-100'
          }`}>
            {isQuiz && <HelpCircle className="h-4 w-4" />}
            {isMultipleChoice && <BarChart2 className="h-4 w-4" />}
            {isWordCloud && <Cloud className="h-4 w-4" />}
            {isScale && <Sliders className="h-4 w-4" />}
            {isQA && <MessageSquare className="h-4 w-4" />}
            {isContent && <FileText className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase font-heading tracking-widest">
              Slide {currentIdx + 1} of {session.slides.length} • {currentSlide.type.replace('_', ' ')}
            </p>
            <p className="text-xs text-slate-500 font-medium">
              Join Code: <span className="text-indigo-650 text-indigo-600 font-extrabold">{session.roomCode}</span>
            </p>
          </div>
        </div>

        {/* Connection status ticker */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-205 border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 text-xs font-bold shadow-xs">
            <Users className="h-3.5 w-3.5 text-indigo-600" />
            <span>{participants.length} connected</span>
          </div>
        </div>
      </div>

      {/* Main Center Area */}
      <div className="grow flex flex-col justify-center py-6 max-w-5xl mx-auto w-full relative">
        
        {/* Toggle Quiz Leaderboard if triggered */}
        {isQuiz && session.showQuizLeaderboard ? (
          
          <div className="space-y-6 animate-fade-in w-full max-w-2xl mx-auto">
            <div className="text-center space-y-1">
              <div className="inline-block p-2 bg-amber-50 border border-amber-200 rounded-full mb-1">
                <Trophy className="h-5 w-5 text-amber-500 animate-pulse" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-amber-600 font-heading">QUIZ LEADERBOARD</h2>
              <p className="text-xs text-slate-400 font-medium">Total running scores for active trivia combatants</p>
            </div>

            <div className="bg-white border border-slate-202 border-slate-200 rounded-2xl p-5 shadow-sm divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {participants.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-xs">No active participants entered the lobby yet.</p>
                </div>
              ) : (
                [...participants]
                  .sort((a, b) => b.score - a.score)
                  .map((player, rankIdx) => {
                    const isTop3 = rankIdx < 3;
                    const medals = ['🥇', '🥈', '🥉'][rankIdx];
                    return (
                      <div 
                        key={player.id} 
                        className={`py-3 flex items-center justify-between text-xs transition duration-200 ${
                          isTop3 ? 'font-black bg-amber-50/30 px-3 rounded-xl border border-amber-100 my-1' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-400 w-6">
                            {isTop3 ? medals : `#${rankIdx + 1}`}
                          </span>
                          <span className="text-lg">{player.avatar}</span>
                          <span className={`text-slate-800 ${isTop3 ? 'text-sm font-semibold' : ''}`} >
                            {player.nickname}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {player.lastAnswerCorrect !== undefined && (
                            <span className={`text-[8px] font-extrabold font-mono px-1.5 py-0.5 rounded ${
                              player.lastAnswerCorrect ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                            }`}>
                              {player.lastAnswerCorrect ? 'CORRECT' : 'WRONG'}
                            </span>
                          )}
                          <span className="font-mono font-bold text-slate-600">{player.score} pts</span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
            
          </div>

        ) : (
          
          <div className="space-y-8 h-full w-full flex flex-col justify-between">
            
            {/* The Question Card */}
            <div className="text-center space-y-4">
              <h2 className="text-2xl md:text-3.5xl font-extrabold text-slate-850 text-slate-800 tracking-tight leading-tight max-w-4xl mx-auto font-heading py-1">
                {currentSlide.question}
              </h2>

              {/* Timer & Submissions status for Quiz only */}
              {isQuiz && (
                <div className="flex items-center justify-center gap-4">
                  
                  {/* Circular visual countdown timer */}
                  {session.slideTimer !== null && (
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl px-4 py-1.5 justify-center shadow-xs">
                      <Timer className={`h-4.5 w-4.5 ${session.slideTimer <= 5 ? 'text-red-550 text-red-500 animate-pulse' : 'text-slate-400'}`} />
                      <span className={`font-mono text-base font-bold ${session.slideTimer <= 5 ? 'text-red-500' : 'text-slate-800'}`}>
                        {session.slideTimer}s
                      </span>
                    </div>
                  )}

                  <div className="bg-white border border-slate-200 px-4 py-1.5 rounded-2xl text-xs text-slate-500 font-bold shadow-xs">
                    <span>Answers: {totalVotesOnSlide} / {participants.length}</span>
                  </div>
                </div>
              )}
            </div>

            {/* SLIDE VISUALIZERS AREA */}
            <div className="grow flex items-center justify-center p-3 font-sans">
              
              {/* VIEW 1 & 2: BAR CHART (For multiple choice & Quiz with revealed answer) */}
              {(isMultipleChoice || (isQuiz && (session.showQuizCorrectAnswer || !session.timerActive))) ? (
                
                <div className="w-full max-w-3xl space-y-4">
                  {currentSlide.options && currentSlide.options.map((option, idx) => {
                    const votes = mcCounts[idx] || 0;
                    const pct = totalVotesOnSlide > 0 ? Math.round((votes / totalVotesOnSlide) * 100) : 0;
                    
                    const isCorrect = isQuiz && idx === currentSlide.correctOptionIndex;
                    const showFeedback = isQuiz && session.showQuizCorrectAnswer;

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-extrabold text-slate-750 text-slate-700 flex items-center gap-1.5 font-heading">
                            {/* Color codes for bar titles */}
                            <span className={`h-2.5 w-2.5 rounded-sm shrink-0 index-bullet-${idx} ${
                              idx === 0 ? 'bg-indigo-600' :
                              idx === 1 ? 'bg-indigo-500' :
                              idx === 2 ? 'bg-indigo-400' :
                              'bg-amber-500'
                            }`}></span>
                            <span>{option}</span>

                            {/* Mark matching correct indicator in Quiz details */}
                            {showFeedback && isCorrect && (
                              <span className="flex items-center gap-0.5 text-[8px] bg-emerald-50 text-emerald-650 px-1.5 py-0.5 rounded-md border border-emerald-100 font-mono font-bold leading-none">
                                <Check className="h-3 w-3" /> CORRECT ANSWER
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-slate-455 text-slate-500 font-semibold">
                            {votes} votes ({pct}%)
                          </span>
                        </div>

                        {/* Animated dynamic slide progression bar */}
                        <div className="w-full bg-slate-100 h-6 border border-slate-200 rounded-xl overflow-hidden relative">
                          <div 
                            className={`h-full transition-all duration-700 ease-out rounded-r-sm ${
                              showFeedback && isCorrect ? 'bg-emerald-500 shadow-sm border-r border-emerald-350' :
                              idx === 0 ? 'bg-indigo-600' :
                              idx === 1 ? 'bg-indigo-505 bg-indigo-500' :
                              idx === 2 ? 'bg-indigo-400' :
                              'bg-amber-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              ) : isQuiz && session.timerActive ? (
                
                // Secret countdown display during active quizzes
                <div className="text-center py-8 space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto w-full">
                    {currentSlide.options && currentSlide.options.map((opt, oIdx) => (
                      <div key={oIdx} className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center aspect-square space-y-2 shadow-xs hover:border-indigo-200 transition duration-150">
                        <span className={`h-10 w-10 font-mono font-black text-lg rounded-full flex items-center justify-center shadow-xs ${
                          oIdx === 0 ? 'bg-indigo-50 text-indigo-600 border border-indigo-150' :
                          oIdx === 1 ? 'bg-sky-55 text-sky-60 bg-sky-50 text-sky-600 border border-sky-150' :
                          oIdx === 2 ? 'bg-emerald-55 text-emerald-60 bg-emerald-50 text-emerald-600 border border-emerald-150' :
                          'bg-amber-50 text-amber-600 border border-amber-150'
                        }`}>
                          {['A', 'B', 'C', 'D'][oIdx]}
                        </span>
                        <p className="text-[10px] text-slate-500 text-center font-bold font-heading line-clamp-2">
                          {opt}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-indigo-600 font-bold animate-pulse duration-1000">
                     Active polling ongoing. Select your answers on your device responder now!
                  </p>
                </div>

              ) : isWordCloud ? (
                <WordCloudViz items={getWordCloudFrequency()} />
              ) : isContent ? (
                <div className="w-full max-w-2xl text-center space-y-6">
                  {currentSlide.imageUrl && <img src={currentSlide.imageUrl} alt="" className="max-h-48 mx-auto rounded-2xl" />}
                  <h2 className="text-3xl font-black text-slate-800">{currentSlide.title || currentSlide.question}</h2>
                  {currentSlide.subtitle && <p className="text-lg text-slate-500">{currentSlide.subtitle}</p>}
                  {currentSlide.bullets && (
                    <ul className="text-left max-w-md mx-auto space-y-2">
                      {currentSlide.bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="text-indigo-600 font-bold">•</span>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : isQA ? (
                <div className="w-full max-w-2xl space-y-3 max-h-[400px] overflow-y-auto">
                  {responses.filter(r => r.type === 'qa' && !r.payload.hidden).length === 0 ? (
                    <div className="text-center py-10 text-slate-400"><MessageSquare className="h-8 w-8 mx-auto opacity-30 mb-2" /><p className="text-xs">No questions yet</p></div>
                  ) : (
                    responses.filter(r => r.type === 'qa' && !r.payload.hidden)
                      .sort((a, b) => (b.payload.upvotes?.length || 0) - (a.payload.upvotes?.length || 0))
                      .map((r) => r.type === 'qa' && (
                        <div key={r.payload.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-start gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{r.payload.text}</p>
                            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {r.payload.upvotes?.length || 0}</p>
                          </div>
                          {!displayOnly && (
                            <button onClick={() => onSendMessage('moderate_response', { slideIndex: currentIdx, responseId: r.payload.id, hidden: true })} className="text-slate-400 hover:text-rose-500 p-1" title="Hide">
                              <EyeOff className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))
                  )}
                </div>
              ) : isScale ? (
                <div className="w-full max-w-2xl bg-white border border-slate-202 border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                  {getRatingScales().length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      <Sliders className="h-8 w-8 mx-auto opacity-30 mb-1" />
                      <p className="text-xs font-semibold">Awaiting rating evaluations from attendees...</p>
                    </div>
                  ) : (
                    getRatingScales().map((stmt, sIdx) => {
                      const colorThemeIdx = sIdx % 4;
                      return (
                        <div key={sIdx} className="space-y-1.5 font-sans">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-755 text-slate-800 font-heading">{stmt.label}</span>
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <span className="font-mono text-[9px] bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-550 font-bold">
                                {stmt.votes} {stmt.votes === 1 ? 'vote' : 'votes'}
                              </span>
                              <span className="font-mono font-black text-indigo-900 text-sm">
                                {stmt.average} / 10
                              </span>
                            </div>
                          </div>

                          <div className="relative w-full h-4 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                            {/* Slide filling */}
                            <div 
                              className={`h-full rounded-r transition-all duration-500 ${
                                colorThemeIdx === 0 ? 'bg-amber-500' :
                                colorThemeIdx === 1 ? 'bg-indigo-600' :
                                colorThemeIdx === 2 ? 'bg-indigo-400' :
                                'bg-emerald-500'
                              }`}
                              style={{ width: `${stmt.average * 10}%` }}
                            ></div>
                            
                            {/* Score ticks standard indicators */}
                            <div className="absolute top-0 bottom-0 left-[50%] w-0.5 bg-slate-305 bg-slate-250" title="Mid-point (5.0)"></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              ) : null}

            </div>

            {/* Answer Explanation Box if revealed */}
            {isQuiz && session.showQuizCorrectAnswer && currentSlide.explanation && (
              <div className="bg-indigo-50 border border-indigo-125 border-indigo-100 p-4 rounded-2xl max-w-3xl mx-auto flex gap-3 text-xs text-indigo-900 leading-relaxed text-left animate-fade-in my-1 font-medium">
                <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-bounce" />
                <div className="space-y-1">
                  <p className="font-extrabold text-indigo-950 flex items-center gap-1 font-heading">
                    <CornerDownRight className="h-3 w-4" /> Explanation Trivia:
                  </p>
                  <p>{currentSlide.explanation}</p>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {!displayOnly && (
      <div className="flex flex-wrap gap-1 justify-center mb-2">
        {session.slides.map((_: any, i: number) => (
          <button key={i} onClick={() => onSendMessage('goto_slide', { index: i })} className={`w-7 h-7 rounded-lg text-[10px] font-mono font-bold ${i === currentIdx ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>{i + 1}</button>
        ))}
      </div>
      )}

      {!displayOnly && (
      <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-2 bg-transparent z-10 font-sans">
        
        {/* Previous Controls */}
        <button
          onClick={() => onSendMessage('prev_slide')}
          disabled={currentIdx === 0}
          className="p-2.5 bg-white hover:bg-slate-50 disabled:opacity-30 text-slate-700 border border-slate-200 hover:border-slate-300 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition shadow-xs"
          title="Previous Slide"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {/* Dynamic Context Controls */}
        <div className="flex gap-2.5">
          {isQuiz && (
            <>
              <button
                onClick={() => onSendMessage('toggle_reveal_answer')}
                disabled={session.timerActive}
                className={`py-2 px-4 text-xs font-bold rounded-xl cursor-pointer border transition flex items-center gap-1.5 shadow-xs ${
                  session.showQuizCorrectAnswer 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Check className="h-4 w-4" />
                {session.showQuizCorrectAnswer ? "Hide Correct Answer" : "Reveal Answer"}
              </button>

              <button
                onClick={() => onSendMessage('toggle_leaderboard')}
                className={`py-2 px-4 text-xs font-bold rounded-xl cursor-pointer border transition flex items-center gap-1.5 shadow-xs ${
                  session.showQuizLeaderboard 
                    ? 'bg-amber-50 border-amber-200 text-amber-600 font-black' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Trophy className="h-4 w-4" />
                {session.showQuizLeaderboard ? "Show Slide Stat View" : "Leaderboard"}
              </button>
            </>
          )}

          <button
            onClick={() => onSendMessage('reset_room')}
            className="p-2.5 bg-white hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 rounded-xl cursor-pointer transition shadow-xs"
            title="Reset slide responses"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Next & Forward Controls */}
        <button
          onClick={() => onSendMessage('next_slide')}
          className="py-2.5 px-6 bg-indigo-650 bg-indigo-600 hover:bg-indigo-505 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition shadow-xs"
        >
          {currentIdx === session.slides.length - 1 ? 'Finish Presentation' : 'Next'}
          <ChevronRight className="h-4 w-4" />
        </button>

      </div>
      )}

    </div>
  );
}
