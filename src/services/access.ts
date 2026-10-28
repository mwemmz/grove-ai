/* Who may see what. Some course material is meant for one programme only, e.g. BIT353 for BIT students.
   The student ID is the Clerk username, set once per render by the app shell.
   This decides what Grove shows; it is not a substitute for server-side permissions. */

let studentId = '';
let admin = false;

/** Admins see every course, so they can check what students will see. */
export function setAdmin(v: boolean) {
  admin = v;
}

export function setStudentId(id: string | null | undefined) {
  studentId = (id ?? '').trim();
}

export const getStudentId = () => studentId;

/** True when there is no restriction, or the student ID starts with the required prefix (any case). */
export function canSee(audience?: string): boolean {
  if (!audience || admin) return true;
  return studentId.toUpperCase().startsWith(audience.toUpperCase());
}

/** Courses whose material is limited to one programme, by student ID prefix. */
export const COURSE_AUDIENCE: Record<string, string> = {
  BIT353: 'BIT',
};

export const canSeeCourse = (code: string) => canSee(COURSE_AUDIENCE[code.toUpperCase()]);
