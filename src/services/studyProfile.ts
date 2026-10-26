/* The student's own study instructions (for example a profile written with another chatbot).
   Kept on this device only, and added to the instructions Grove gives the AI when it writes an answer. */
const KEY = 'grove_study_instructions_v1';
export const MAX_STUDY_CHARS = 4000;

export function getStudyInstructions(): string {
  try {
    return (localStorage.getItem(KEY) ?? '').slice(0, MAX_STUDY_CHARS);
  } catch {
    return '';
  }
}

export function saveStudyInstructions(text: string): void {
  try {
    const t = text.trim().slice(0, MAX_STUDY_CHARS);
    if (t) localStorage.setItem(KEY, t);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the text just isn't kept */
  }
}
