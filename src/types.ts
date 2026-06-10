export type SlideType = 'multiple_choice' | 'quiz' | 'word_cloud' | 'rating_scale' | 'qa' | 'content';

export interface BaseSlide {
  id: string;
  type: SlideType;
  question: string;
}

export interface MultipleChoiceSlide extends BaseSlide {
  type: 'multiple_choice';
  options: string[];
}

export interface QuizSlide extends BaseSlide {
  type: 'quiz';
  options: string[];
  correctOptionIndex: number;
  timeLimit: number;
  explanation?: string;
}

export interface WordCloudSlide extends BaseSlide {
  type: 'word_cloud';
}

export interface RatingScaleSlide extends BaseSlide {
  type: 'rating_scale';
  scaleStatements: string[];
}

export interface QASlide extends BaseSlide {
  type: 'qa';
}

export interface ContentSlide extends BaseSlide {
  type: 'content';
  title?: string;
  subtitle?: string;
  bullets?: string[];
  imageUrl?: string;
}

export type Slide = MultipleChoiceSlide | QuizSlide | WordCloudSlide | RatingScaleSlide | QASlide | ContentSlide;

export interface Participant {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  joinedAt: number;
  lastAnswerCorrect?: boolean;
  lastPointsEarned?: number;
  disconnected?: boolean;
}

export interface MultipleChoiceResponse {
  participantId: string;
  optionIndex: number;
}

export interface QuizResponse {
  participantId: string;
  optionIndex: number;
  timeTaken: number;
  correct: boolean;
  pointsEarned: number;
}

export interface WordCloudResponse {
  participantId: string;
  words: string[];
  hidden?: boolean;
}

export interface RatingScaleValue {
  statementIndex: number;
  value: number;
}

export interface RatingScaleResponse {
  participantId: string;
  ratings: RatingScaleValue[];
}

export interface QAResponse {
  id: string;
  participantId: string;
  text: string;
  upvotes: string[];
  hidden?: boolean;
}

export type LiveResponse =
  | { type: 'multiple_choice'; payload: MultipleChoiceResponse }
  | { type: 'quiz'; payload: QuizResponse }
  | { type: 'word_cloud'; payload: WordCloudResponse }
  | { type: 'rating_scale'; payload: RatingScaleResponse }
  | { type: 'qa'; payload: QAResponse };

export interface PresentationSession {
  roomCode: string;
  slides: Slide[];
  currentSlideIndex: number;
  status: 'lobby' | 'presenting' | 'ended';
  showQuizCorrectAnswer: boolean;
  showQuizLeaderboard: boolean;
  slideTimer: number | null;
  timerActive: boolean;
  password?: string;
  presenterConnected?: boolean;
}

export type ClientMessageType =
  | 'create_room'
  | 'join_room'
  | 'rejoin_room'
  | 'start_presentation'
  | 'next_slide'
  | 'prev_slide'
  | 'goto_slide'
  | 'submit_response'
  | 'upvote_qa'
  | 'moderate_response'
  | 'toggle_reveal_answer'
  | 'toggle_leaderboard'
  | 'reset_room';

export interface ClientMessage {
  type: ClientMessageType;
  roomCode?: string;
  payload?: any;
}

export type ServerMessageType =
  | 'room_joined'
  | 'room_error'
  | 'room_state_update'
  | 'response_received';

export interface ServerMessage {
  type: ServerMessageType;
  payload?: any;
}

export interface DeckTemplate {
  id: string;
  name: string;
  description: string;
  slides: Slide[];
}
