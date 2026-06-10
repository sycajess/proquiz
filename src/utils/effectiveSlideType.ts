import { Slide, SlideType } from '../types';

type SlideShape = Slide & {
  options?: string[];
  correctOptionIndex?: number;
  scaleStatements?: string[];
};

/** Infer the real slide type when AI or imports mis-label interactive slides as content. */
export function effectiveSlideType(slide: Slide): SlideType {
  const s = slide as SlideShape;

  if (s.options && s.options.length >= 2) {
    if (s.type === 'quiz' || s.correctOptionIndex !== undefined) return 'quiz';
    if (s.type === 'multiple_choice' || s.type === 'content') return 'multiple_choice';
  }

  if (s.scaleStatements && s.scaleStatements.length > 0 && s.type === 'content') {
    return 'rating_scale';
  }

  return s.type;
}

export function repairSlide(slide: Slide): Slide {
  const type = effectiveSlideType(slide);
  if (type === slide.type) return slide;
  return { ...slide, type } as Slide;
}

export function repairSlides(slides: Slide[]): Slide[] {
  return slides.map(repairSlide);
}
