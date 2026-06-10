import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Plus, Play, Trash, Grid, BarChart2, Cloud, Sliders, HelpCircle, Info,
  Check, ChevronDown, ChevronUp, BookOpen, Download, Upload, LayoutTemplate, MessageSquare, FileText
} from 'lucide-react';
import { Slide, SlideType, DeckTemplate } from '../types';
import { exportDeck, importDeck } from '../utils/deckExport';

interface PresenterDashboardProps {
  onStartSession: (slides: Slide[], password?: string) => void;
}

const DEFAULT_SLIDES: Slide[] = [
  {
    id: 'sample_1',
    type: 'multiple_choice',
    question: 'How do you currently gather audience feedback during group presentations?',
    options: ['Raising hands / voice notes', 'Standard offline sheets', 'Interactive online tools (like Mentimeter)', 'We rarely gather feedback']
  },
  {
    id: 'sample_2',
    type: 'quiz',
    question: 'Which element is considered the main driver of high content retention?',
    options: ['Strict lecture format', 'Interactive retrieval practice', 'Reading dense slides aloud', 'Shorter presentation durations'],
    correctOptionIndex: 1,
    timeLimit: 20,
    explanation: 'Science proves active recall and interactive quizzes boost long-term retention by over 50%!'
  },
  {
    id: 'sample_3',
    type: 'word_cloud',
    question: 'Describe interactive presentations in a single, powerful word!'
  },
  {
    id: 'sample_4',
    type: 'rating_scale',
    question: 'How would you rate standard lectures on these metrics?',
    scaleStatements: ['Audience Engagement', 'Information Retention', 'Interactive Energy']
  }
];

export default function PresenterDashboard({ onStartSession }: PresenterDashboardProps) {
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState('5');
  const [suggestingTone, setSuggestingTone] = useState(false);
  const [audience, setAudience] = useState('Interactive Audience');
  const [tone, setTone] = useState('Witty & Fun');
  const [questionStyle, setQuestionStyle] = useState('mixed');
  const [extraContext, setExtraContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [generationError, setGenerationError] = useState('');

  const [slides, setSlides] = useState<Slide[]>(DEFAULT_SLIDES);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(slides[0]?.id || null);

  const [customQuestion, setCustomQuestion] = useState('');
  const [customType, setCustomType] = useState<SlideType>('quiz');
  const [templates, setTemplates] = useState<DeckTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');

  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(setTemplates).catch(() => {});
  }, []);

  const stepCaptions = [
    "Getting things ready...",
    "Understanding your topic...",
    "Creating your questions...",
    "Building your slides...",
    "Almost done..."
  ];

  const SLIDE_COUNT_PRESETS = [3, 4, 5, 6, 7, 8, 10, 12, 15, 20];
  const TONE_OPTIONS = [
    'Witty & Fun', 'Professional', 'Academic', 'Friendly Casual',
    'Energetic & Upbeat', 'Serious & Formal', 'Inspirational',
    'Playful & Lighthearted', 'Conversational', 'Bold & Direct',
  ];
  const AUDIENCE_OPTIONS = [
    'General Audience', 'Interactive Audience', 'High School Students',
    'University Students', 'Corporate Team', 'Developers / Engineers',
    'Managers / Executives', 'Workshop Participants', 'Conference Attendees',
    'Friends & Family', 'Quiz Night Crowd', 'Remote / Hybrid Team',
    'New Hires / Onboarding', 'Clients / Customers',
  ];
  const QUESTION_STYLE_OPTIONS = [
    { value: 'mixed', label: 'Mixed (recommended)' },
    { value: 'trivia', label: 'Trivia & facts' },
    { value: 'opinion', label: 'Opinion polls' },
    { value: 'educational', label: 'Educational / training' },
    { value: 'icebreaker', label: 'Icebreaker / fun' },
    { value: 'professional', label: 'Professional / corporate' },
    { value: 'debate', label: 'Debate & discussion' },
    { value: 'scenario', label: 'Scenario-based' },
    { value: 'reflective', label: 'Reflective' },
    { value: 'competitive', label: 'Competitive' },
    { value: 'survey', label: 'Survey-heavy' },
    { value: 'workshop', label: 'Workshop / hands-on' },
    { value: 'team-building', label: 'Team-building' },
    { value: 'technical', label: 'Technical / expert' },
    { value: 'creative', label: 'Creative & open-ended' },
    { value: 'quick-check', label: 'Quick pulse checks' },
  ];

  const handleSuggestTone = async () => {
    if (!topic.trim()) {
      setGenerationError('Enter a topic first to suggest a tone');
      return;
    }
    setSuggestingTone(true);
    setGenerationError('');
    try {
      const res = await fetch('/api/suggest-tone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setTone(data.tone);
    } catch (err: any) {
      setGenerationError(err.message || 'Could not suggest tone');
    } finally {
      setSuggestingTone(false);
    }
  };

  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    const count = Math.min(30, Math.max(1, parseInt(slideCount, 10) || 5));

    setIsGenerating(true);
    setGenerationError('');
    setGenStep(0);

    // Simulate stepping through loader states
    const stepInterval = setInterval(() => {
      setGenStep((prev) => (prev < stepCaptions.length - 1 ? prev + 1 : prev));
    }, 1200);

    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          slideCount: count,
          audience,
          tone,
          questionStyle,
          extraContext,
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }

      if (data.slides && data.slides.length > 0) {
        setSlides(data.slides);
        setSelectedSlideId(data.slides[0].id);
        setTopic(''); // Clear topic form on success
      } else {
        throw new Error("No slides returned from generation server.");
      }
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || 'AI generation failed.');
    } finally {
      clearInterval(stepInterval);
      setIsGenerating(false);
    }
  };

  const deleteSlide = (id: string) => {
    const updated = slides.filter(s => s.id !== id);
    setSlides(updated);
    if (selectedSlideId === id) {
      setSelectedSlideId(updated[0]?.id || null);
    }
  };

  const addManualSlide = () => {
    const freshId = `slide_${Date.now()}`;
    let newSlide: Slide;

    switch (customType) {
      case 'multiple_choice':
        newSlide = {
          id: freshId,
          type: 'multiple_choice',
          question: customQuestion.trim() || 'New Survey Opinion Poll',
          options: ['Option 1', 'Option 2', 'Option 3', 'Option 4']
        };
        break;
      case 'word_cloud':
        newSlide = {
          id: freshId,
          type: 'word_cloud',
          question: customQuestion.trim() || 'What words come to mind when considering...?'
        };
        break;
      case 'rating_scale':
        newSlide = {
          id: freshId,
          type: 'rating_scale',
          question: customQuestion.trim() || 'Please evaluate our performance on these values:',
          scaleStatements: ['Clarity', 'Significance', 'Enjoyability']
        };
        break;
      case 'qa':
        newSlide = { id: freshId, type: 'qa', question: customQuestion.trim() || 'Ask a question!' };
        break;
      case 'content':
        newSlide = {
          id: freshId, type: 'content', question: customQuestion.trim() || 'Section Title',
          title: customQuestion.trim() || 'Section Title', subtitle: '', bullets: ['Point 1', 'Point 2']
        };
        break;
      case 'quiz':
      default:
        newSlide = {
          id: freshId,
          type: 'quiz',
          question: customQuestion.trim() || 'New Competitive Quiz Trivia',
          options: ['Correct Answer', 'Wrong Choice A', 'Wrong Choice B', 'Wrong Choice C'],
          correctOptionIndex: 0,
          timeLimit: 20,
          explanation: 'Here is why this is correct!'
        };
        break;
    }

    setSlides([...slides, newSlide]);
    setSelectedSlideId(freshId);
    setCustomQuestion('');
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === slides.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const items = [...slides];
    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;

    setSlides(items);
  };

  const updateSlideField = (id: string, updates: Partial<Slide>) => {
    setSlides(slides.map(s => {
      if (s.id === id) {
        return { ...s, ...updates } as Slide;
      }
      return s;
    }));
  };

  const updateOptionText = (slideId: string, optionIdx: number, newText: string) => {
    setSlides(slides.map(s => {
      if (s.id === slideId && (s.type === 'multiple_choice' || s.type === 'quiz')) {
        const updatedOpts = [...s.options];
        updatedOpts[optionIdx] = newText;
        return { ...s, options: updatedOpts } as Slide;
      }
      return s;
    }));
  };

  const updateScaleStatement = (slideId: string, itemIdx: number, newText: string) => {
    setSlides(slides.map(s => {
      if (s.id === slideId && s.type === 'rating_scale') {
        const statements = [...s.scaleStatements];
        statements[itemIdx] = newText;
        return { ...s, scaleStatements: statements } as Slide;
      }
      return s;
    }));
  };

  const activeSlideObj = slides.find(s => s.id === selectedSlideId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
      
      {/* LEFT COLUMN: CONTROL & CREATION */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Generative AI Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 h-28 w-28 bg-indigo-600/10 blur-xl rounded-full"></div>
          
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-100 tracking-tight font-heading">AI Slides Generator</h2>
            </div>
          </div>

          {isGenerating ? (
            <div className="py-8 px-4 flex flex-col items-center text-center space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-slate-700/50 border-t-indigo-500 animate-spin"></div>
                <Sparkles className="absolute h-5 w-5 text-indigo-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-200">Generating Presentation...</p>
                <p className="text-xs text-slate-400 animate-pulse duration-1000 max-w-[240px]">
                  {stepCaptions[genStep]}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGenerateAI} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Topic or Subject</label>
                <input
                  type="text"
                  placeholder="e.g. European History, JavaScript Fundamentals, Coffee Pairing"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 rounded-xl text-xs focus:outline-none transition font-medium"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Slide Count</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    list="slide-count-presets"
                    placeholder="e.g. 5"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 rounded-xl text-xs focus:outline-none transition font-medium"
                    value={slideCount}
                    onChange={(e) => setSlideCount(e.target.value)}
                  />
                  <datalist id="slide-count-presets">
                    {SLIDE_COUNT_PRESETS.map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">Tone</label>
                    <button
                      type="button"
                      onClick={handleSuggestTone}
                      disabled={suggestingTone || !topic.trim()}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold disabled:opacity-40"
                    >
                      {suggestingTone ? 'Suggesting...' : 'AI suggest'}
                    </button>
                  </div>
                  <input
                    type="text"
                    list="tone-presets"
                    placeholder="Pick or type a tone"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 rounded-xl text-xs focus:outline-none transition font-medium"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                  />
                  <datalist id="tone-presets">
                    {TONE_OPTIONS.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Target Audience</label>
                <input
                  type="text"
                  list="audience-presets"
                  placeholder="Pick or type your audience"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 rounded-xl text-xs focus:outline-none transition"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                />
                <datalist id="audience-presets">
                  {AUDIENCE_OPTIONS.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Question Style</label>
                <select
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 rounded-xl text-xs focus:outline-none"
                  value={questionStyle}
                  onChange={(e) => setQuestionStyle(e.target.value)}
                >
                  {QUESTION_STYLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Extra Context (optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Focus on React hooks, avoid beginner topics, include a fun icebreaker..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 rounded-xl text-xs focus:outline-none resize-none"
                  value={extraContext}
                  onChange={(e) => setExtraContext(e.target.value)}
                />
              </div>

              {generationError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{generationError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:translate-y-px text-slate-50 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition duration-150"
              >
                <Sparkles className="h-4 w-4 text-indigo-200" />
                Generate Interactive Deck
              </button>
            </form>
          )}
        </div>

        {/* Manual Addition */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-slate-900">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg">
              <Plus className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-800 font-heading">Add Manual Slide</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Slide Type</label>
              <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                {[
                  { value: 'quiz', label: 'Trivia Quiz', icon: HelpCircle },
                  { value: 'multiple_choice', label: 'Opinion Poll', icon: BarChart2 },
                  { value: 'word_cloud', label: 'Word Cloud', icon: Cloud },
                  { value: 'rating_scale', label: 'Rating Scale', icon: Sliders },
                  { value: 'qa', label: 'Q&A', icon: MessageSquare },
                  { value: 'content', label: 'Content', icon: FileText },
                ].map((item) => {
                  const Icon = item.icon;
                  const isCur = customType === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setCustomType(item.value as SlideType)}
                      className={`p-2 rounded-xl flex items-center gap-1.5 border text-left cursor-pointer transition ${
                        isCur 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-600 font-bold' 
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Question or Prompt</label>
              <input
                type="text"
                placeholder="Type your question..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-900 rounded-xl text-xs focus:outline-none transition font-medium"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
              />
            </div>

            <button
              onClick={addManualSlide}
              disabled={!customQuestion.trim()}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-550 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Insert Slide
            </button>
          </div>
        </div>

      </div>

      {/* MIDDLE/RIGHT COLUMN: DECK OVERVIEW */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Floating Actions */}
        <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-extrabold text-slate-800 font-heading">Active Slide Deck</span>
            <span className="text-xs px-2.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-full font-mono">{slides.length} slides</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setShowTemplates(!showTemplates)} className="py-2 px-3 bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer">
              <LayoutTemplate className="h-3.5 w-3.5" /> Templates
            </button>
            <button onClick={() => exportDeck(slides)} className="py-2 px-3 bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <label className="py-2 px-3 bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer">
              <Upload className="h-3.5 w-3.5" /> Import
              <input type="file" accept=".json" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const imported = await importDeck(file);
                  setSlides(imported);
                  setSelectedSlideId(imported[0]?.id || null);
                } catch (err: any) { alert(err.message); }
              }} />
            </label>
            <input type="text" placeholder="Room password (optional)" value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs w-36" maxLength={20} />
            <button onClick={() => onStartSession(slides, roomPassword)} disabled={slides.length === 0} className="py-2 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer">
              <Play className="h-4 w-4" /> Launch
            </button>
          </div>
        </div>

        {showTemplates && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {templates.map((tpl) => (
              <button key={tpl.id} onClick={() => {
                const fresh = tpl.slides.map((s, i) => ({ ...s, id: `tpl_${Date.now()}_${i}` }));
                setSlides(fresh);
                setSelectedSlideId(fresh[0]?.id || null);
                setShowTemplates(false);
              }} className="p-4 bg-white border border-slate-200 rounded-xl text-left hover:border-indigo-400 cursor-pointer">
                <p className="font-bold text-sm text-slate-800">{tpl.name}</p>
                <p className="text-xs text-slate-500 mt-1">{tpl.description}</p>
                <p className="text-[10px] text-indigo-600 mt-2 font-mono">{tpl.slides.length} slides</p>
              </button>
            ))}
          </div>
        )}

        {/* Dynamic Dual Panes: Slide Cards & Selection edit area */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          
          {/* Deck List (Left Side in Dual Pane, md:col-span-5) */}
          <div className="md:col-span-5 space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {slides.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                <Grid className="h-8 w-8 mx-auto mb-2 opacity-35 text-slate-400" />
                <p className="text-xs font-semibold">Your deck is currently empty.</p>
                <p className="text-[10px] text-slate-450">Generate or add slides to start.</p>
              </div>
            ) : (
              slides.map((slide, index) => {
                const isSelected = slide.id === selectedSlideId;
                return (
                  <div
                    key={slide.id}
                    onClick={() => setSelectedSlideId(slide.id)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between text-left cursor-pointer transition-all duration-150 relative ${
                      isSelected 
                        ? 'bg-indigo-50/40 border-indigo-500 shadow-sm ring-1 ring-indigo-500/10' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-350'
                    }`}
                  >
                    {/* Selected Left Highlight Indicator */}
                    {isSelected && (
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-650 bg-indigo-600 rounded-l-xl"></div>
                    )}

                    <div className="space-y-1 max-w-[80%]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-400">#{index + 1}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-mono font-bold border ${
                          slide.type === 'quiz' ? 'bg-red-50 text-red-650 border-red-100' :
                          slide.type === 'multiple_choice' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                          slide.type === 'word_cloud' ? 'bg-emerald-50 text-emerald-650 border-emerald-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {slide.type.toUpperCase().replace('_', ' ')}
                        </span>
                      </div>
                      <p className={`text-xs font-semibold line-clamp-2 leading-relaxed ${
                        isSelected ? 'text-indigo-950 font-bold' : 'text-slate-750'
                      }`}>
                        {slide.question}
                      </p>
                    </div>

                    {/* Sorting Controls & Trash icon */}
                    <div className="flex flex-col items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => moveSlide(index, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-slate-100 disabled:opacity-20 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                        title="Move Up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      
                      <button
                        onClick={() => moveSlide(index, 'down')}
                        disabled={index === slides.length - 1}
                        className="p-1 hover:bg-slate-100 disabled:opacity-20 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                        title="Move Down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>

                      <button
                        onClick={() => deleteSlide(slide.id)}
                        className="p-1 hover:bg-rose-50 text-slate-450 hover:text-rose-600 rounded mt-1 cursor-pointer"
                        title="Delete Slide"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Edit Slide Workspace / Details (Right Side in Dual Pane, md:col-span-7) */}
          <div className="md:col-span-7">
            {activeSlideObj ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm font-heading">Slide Configurator</h3>
                    <p className="text-xs text-slate-400">Configure parameters and details manually</p>
                  </div>
                  <span className={`text-[10px] uppercase font-mono tracking-wider font-bold px-2.5 py-0.5 rounded-full border ${
                    activeSlideObj.type === 'quiz' ? 'bg-red-50 text-red-600 border-red-100' :
                    activeSlideObj.type === 'multiple_choice' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                    activeSlideObj.type === 'word_cloud' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {activeSlideObj.type.replace('_', ' ')}
                  </span>
                </div>

                {/* Edit Prompt Column */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-550 flex items-center justify-between text-slate-500">
                    <span>Prompt / Question Text</span>
                    <span className="text-[10px] text-slate-400">Must be engaging and clear</span>
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-900 font-medium rounded-xl text-xs focus:outline-none transition resize-none leading-relaxed"
                    value={activeSlideObj.question}
                    onChange={(e) => updateSlideField(activeSlideObj.id, { question: e.target.value })}
                  />
                </div>

                {/* Type specific options rendering */}
                {(activeSlideObj.type === 'multiple_choice' || activeSlideObj.type === 'quiz') && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-550 text-slate-500">Answer Options</label>
                      {activeSlideObj.type === 'quiz' && (
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-slate-400 font-semibold">Countdown (Seconds)</label>
                          <select
                            className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-[11px] px-1.5 py-0.5 outline-none font-mono font-medium"
                            value={activeSlideObj.timeLimit || 20}
                            onChange={(e) => updateSlideField(activeSlideObj.id, { timeLimit: Number(e.target.value) })}
                          >
                            {[10, 15, 20, 30, 45, 60].map(s => (
                              <option key={s} value={s}>{s}s</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {activeSlideObj.options.map((option, oIdx) => {
                        const isCorrect = activeSlideObj.type === 'quiz' && activeSlideObj.correctOptionIndex === oIdx;
                        return (
                          <div key={oIdx} className="flex items-center gap-2">
                            {/* Option Index Bubble Letter */}
                            <span className="text-xs font-mono font-bold w-5 text-center text-slate-400">
                              {['A', 'B', 'C', 'D'][oIdx] || oIdx + 1}
                            </span>
                            
                            <input
                              type="text"
                              className="grow px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-900 font-medium rounded-xl text-xs focus:outline-none transition"
                              value={option}
                              onChange={(e) => updateOptionText(activeSlideObj.id, oIdx, e.target.value)}
                            />

                            {/* Mark correct option for quizzes only */}
                            {activeSlideObj.type === 'quiz' && (
                              <button
                                type="button"
                                onClick={() => updateSlideField(activeSlideObj.id, { correctOptionIndex: oIdx })}
                                className={`p-2 rounded-xl border text-xs cursor-pointer focus:outline-none transition ${
                                  isCorrect 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                                    : 'bg-slate-50 border-slate-200 text-slate-405 hover:bg-slate-100 hover:border-slate-300'
                                }`}
                                title={isCorrect ? "Correct answer" : "Mark as correct answer"}
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanatory text for Quizzes */}
                    {activeSlideObj.type === 'quiz' && (
                      <div className="space-y-1.5 pt-2">
                        <label className="text-xs font-semibold text-slate-500">Explanation of Answer (Optional)</label>
                        <input
                          type="text"
                          placeholder="Why is this answer correct? Show some fun trivia details..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-900 font-medium rounded-xl text-xs focus:outline-none transition"
                          value={activeSlideObj.explanation || ''}
                          onChange={(e) => updateSlideField(activeSlideObj.id, { explanation: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                )}

                {activeSlideObj.type === 'rating_scale' && (
                  <div className="space-y-4">
                    <label className="text-xs font-semibold text-slate-500">Rating Evaluators (1 to 10 scale)</label>
                    
                    <div className="space-y-2.5">
                      {activeSlideObj.scaleStatements.map((stmt, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400 w-5">#{sIdx+1}</span>
                          <input
                            type="text"
                            className="grow px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-900 font-medium rounded-xl text-xs focus:outline-none transition"
                            value={stmt}
                            onChange={(e) => updateScaleStatement(activeSlideObj.id, sIdx, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSlideObj.type === 'word_cloud' && (
                  <div className="p-4 bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-xl text-xs">
                    <p>Audience submits up to 3 words. Filtered for moderation.</p>
                  </div>
                )}

                {activeSlideObj.type === 'qa' && (
                  <div className="p-4 bg-purple-50 border border-purple-100 text-purple-900 rounded-xl text-xs">
                    <p>Open Q&A. Audience can submit questions and upvote others.</p>
                  </div>
                )}

                {activeSlideObj.type === 'content' && (
                  <div className="space-y-3">
                    <input type="text" placeholder="Title" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" value={activeSlideObj.title || ''} onChange={(e) => updateSlideField(activeSlideObj.id, { title: e.target.value })} />
                    <input type="text" placeholder="Subtitle" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" value={activeSlideObj.subtitle || ''} onChange={(e) => updateSlideField(activeSlideObj.id, { subtitle: e.target.value })} />
                    <textarea rows={4} placeholder="Bullets (one per line)" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none" value={(activeSlideObj.bullets || []).join('\n')} onChange={(e) => updateSlideField(activeSlideObj.id, { bullets: e.target.value.split('\n').filter(Boolean) })} />
                    <input type="text" placeholder="Image URL (optional)" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" value={activeSlideObj.imageUrl || ''} onChange={(e) => updateSlideField(activeSlideObj.id, { imageUrl: e.target.value })} />
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-400 shadow-xs">
                <p className="text-xs font-medium">Select any slide from the left deck to edit its settings.</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
