/* Ids of the sample records Grove used to ship with. Accounts created before they were removed still hold copies,
   and they are cleared when the account loads. Nothing here is shown to students. */
export const DEMO_IDS = {
 "courses": [
  "c-cs101",
  "c-cs102",
  "c-cs103",
  "c-cs201",
  "c-cs202",
  "c-cs301",
  "c-cs302",
  "c-cs401",
  "c-cs402"
 ],
 "notes": [
  "note-y1-1",
  "note-y1-2",
  "note-y1-3",
  "note-y2-1",
  "note-y2-2",
  "note-y3-1",
  "note-y3-2",
  "note-y4-1",
  "note-y4-2",
  "note-y1-4",
  "note-y1-5",
  "note-y1-6",
  "note-y2-3",
  "note-y2-4",
  "note-y2-5",
  "note-y3-3",
  "note-y3-4",
  "note-y3-5",
  "note-y4-3",
  "note-y4-4"
 ],
 "flashcards": [
  "fc-1",
  "fc-2",
  "fc-3",
  "fc-4",
  "fc-5",
  "fc-s1",
  "fc-s2",
  "fc-s3",
  "fc-s4",
  "fc-s5",
  "fc-s6",
  "fc-s7",
  "fc-s8",
  "fc-s9",
  "fc-s10",
  "fc-s11"
 ],
 "projects": [
  "proj-1",
  "proj-2",
  "proj-3"
 ],
 "seniorComments": [
  "sc-1",
  "sc-2",
  "sc-3",
  "sc-4",
  "sc-5"
 ],
 "blueprints": [
  "bp-cs201-alex",
  "bp-cs301-marcus",
  "bp-cs101-nadia"
 ],
 "tutors": [
  "tutor-1",
  "tutor-2",
  "tutor-3"
 ],
 "tutorRequests": [
  "req-1",
  "req-2"
 ],
 "skills": [
  "Systems Programming & C",
  "Distributed Systems & Consensus (Raft)",
  "Storage Engines (LSM & B+ Trees)",
  "High-Performance Zero-Copy I/O",
  "Modern Cryptography (TLS 1.3 & ECDHE)",
  "Data Structures & Dynamic Programming"
 ]
} as const;

/** The sample profile's university. A profile still carrying it is the old sample, not the student's own. */
export const DEMO_UNIVERSITY = 'University of Engineering & Technology';
