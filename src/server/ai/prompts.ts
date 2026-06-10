export interface DeckRequest {
  topic: string;
  slideCount: number;
  audience: string;
  tone: string;
  questionStyle?: string;
  extraContext?: string;
}

export function buildSystemPrompt(): string {
  return `You are an expert interactive presentation designer for live audience polling apps (like Mentimeter).
You create engaging, context-accurate slides with sharp questions, plausible wrong answers for quizzes, and varied slide types.
Always respond with ONLY a valid JSON array — no markdown, no explanation, no code fences.`;
}

export function buildUserPrompt(req: DeckRequest): string {
  const style = req.questionStyle || 'mixed';
  const context = req.extraContext?.trim() ? `\nAdditional context from presenter:\n${req.extraContext.trim()}` : '';

  return `Create exactly ${req.slideCount} slides for a live interactive presentation.

Topic: ${req.topic}
Audience: ${req.audience}
Tone: ${req.tone}
Question style: ${style}${context}

Requirements:
- Questions must be accurate, relevant to the topic, and appropriate for the audience
- Use a good mix of slide types: content, multiple_choice, quiz, word_cloud, rating_scale, qa
- Start with a content slide (title + bullets welcome message)
- Include at least 1 competitive quiz with exactly 4 options, correctOptionIndex (0-3), timeLimit (15-30), and explanation
- Include at least 1 word_cloud and 1 rating_scale (2-4 scaleStatements)
- Include at least 1 qa slide for open audience questions
- Poll options should be distinct and balanced — no obvious joke filler unless tone is Witty
- Quiz wrong answers should be plausible, not silly

JSON schema per slide:
{
  "type": "multiple_choice" | "quiz" | "word_cloud" | "rating_scale" | "qa" | "content",
  "question": "string",
  "options": ["string"] (for multiple_choice and quiz only),
  "correctOptionIndex": number (quiz only),
  "timeLimit": number (quiz only, seconds),
  "explanation": "string" (quiz only),
  "scaleStatements": ["string"] (rating_scale only),
  "title": "string" (content only),
  "subtitle": "string" (content only),
  "bullets": ["string"] (content only)
}

Return a JSON array of ${req.slideCount} slide objects.`;
}
