import React from 'react';
import { ChevronLeft, ChevronRight, Play, Check, Trophy, RefreshCw, LogOut } from 'lucide-react';
import { PresentationSession } from '../types';

interface PresenterRemoteProps {
  session: PresentationSession;
  onSendMessage: (type: string, payload?: any) => void;
  onExit: () => void;
}

export default function PresenterRemote({ session, onSendMessage, onExit }: PresenterRemoteProps) {
  const idx = session.currentSlideIndex;
  const slide = session.slides[idx];
  const isQuiz = slide?.type === 'quiz';

  return (
    <div className="bg-slate-900 min-h-screen text-white p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-slate-400">Remote Control</p>
          <p className="font-mono font-bold text-lg">{session.roomCode}</p>
        </div>
        <button onClick={onExit} className="text-slate-400 hover:text-white text-xs flex items-center gap-1">
          <LogOut className="h-4 w-4" /> Exit
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl p-4 text-center">
        <p className="text-xs text-slate-400 mb-1">Slide {idx + 1} / {session.slides.length}</p>
        <p className="text-sm font-semibold line-clamp-2">{slide?.question}</p>
        <p className="text-[10px] text-indigo-400 mt-1 uppercase">{slide?.type?.replace('_', ' ')}</p>
      </div>

      {session.status === 'lobby' && (
        <button
          onClick={() => onSendMessage('start_presentation')}
          className="py-3 bg-indigo-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
        >
          <Play className="h-4 w-4" /> Start
        </button>
      )}

      {session.status === 'presenting' && (
        <>
          <div className="grid grid-cols-5 gap-1">
            {session.slides.map((_, i) => (
              <button
                key={i}
                onClick={() => onSendMessage('goto_slide', { index: i })}
                className={`py-2 rounded-lg text-xs font-mono font-bold ${
                  i === idx ? 'bg-indigo-600' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onSendMessage('prev_slide')}
              disabled={idx === 0}
              className="flex-1 py-3 bg-slate-800 rounded-xl disabled:opacity-30 flex items-center justify-center gap-1 text-sm font-bold"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={() => onSendMessage('next_slide')}
              className="flex-1 py-3 bg-indigo-600 rounded-xl flex items-center justify-center gap-1 text-sm font-bold"
            >
              {idx === session.slides.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {isQuiz && (
            <div className="flex gap-2">
              <button
                onClick={() => onSendMessage('toggle_reveal_answer')}
                disabled={session.timerActive}
                className="flex-1 py-2 bg-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
              >
                <Check className="h-3.5 w-3.5" /> Reveal
              </button>
              <button
                onClick={() => onSendMessage('toggle_leaderboard')}
                className="flex-1 py-2 bg-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
              >
                <Trophy className="h-3.5 w-3.5" /> Board
              </button>
            </div>
          )}

          <button
            onClick={() => onSendMessage('reset_room')}
            className="py-2 text-slate-500 text-xs flex items-center justify-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reset
          </button>
        </>
      )}
    </div>
  );
}
