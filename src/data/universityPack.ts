/* DEMO DATA. Every record below is fictional, written to show how Grove works.
   None of it comes from a real university, student, supervisor or policy.
   A real deployment replaces this file with the institution's own library, loaded with its permission. */
import type { ProjectFields, Source } from '../services/knowledge';

const project = (id: string, title: string, year: number, programme: string, tags: string[], f: ProjectFields): Source => ({
  id,
  kind: 'project',
  title,
  meta: `${programme} · ${year} · Demo record`,
  tags,
  demo: true,
  fields: f,
  text: [
    `Problem. ${f.problem}`,
    `Method. ${f.method}`,
    `Tools. ${f.tools}`,
    `Findings. ${f.findings}`,
    `Limitations. ${f.limitations}`,
    `Future work. ${f.future}`,
  ].join('\n'),
});

const doc = (id: string, kind: 'course' | 'policy', title: string, meta: string, tags: string[], text: string): Source => ({
  id,
  kind,
  title,
  meta: `${meta} · Demo record`,
  tags,
  demo: true,
  text,
});

export const DEMO_SOURCES: Source[] = [
  project('demo-fyp-1', 'SMS crop price alerts for smallholder farmers', 2023, 'BSc Information Technology', ['sms', 'agriculture', 'farmers', 'prices', 'ussd', 'mobile'], {
    problem: 'Smallholder farmers sell at the first price a buyer offers because they cannot see current market prices. Most have basic phones without internet.',
    method: 'Design science. Interviewed 24 farmers and 6 traders, built a prototype that collects prices from market agents and sends them by SMS, then ran a four-week pilot with 30 farmers.',
    tools: 'PHP, MySQL, an SMS gateway, a simple web form for market agents.',
    findings: 'Farmers who received alerts reported selling above the first offer more often. Agents entered prices late when mobile data was weak.',
    limitations: 'Small pilot with one market. Prices were entered by hand, so accuracy depended on the agents. No measure of actual income change.',
    future: 'Add USSD so farmers can request a price on demand. Check agent-entered prices against a second source.',
  }),
  project('demo-fyp-2', 'Detecting suspicious mobile money transactions with rule-based scoring', 2022, 'BSc Computer Science', ['fraud', 'mobile money', 'security', 'classification', 'transactions', 'machine learning'], {
    problem: 'Mobile money agents and users lose money to social-engineering fraud, and small providers cannot afford commercial fraud tools.',
    method: 'Experimental. Built a rule-based risk score and compared it with a decision tree on a synthetic transaction set modelled on published fraud patterns.',
    tools: 'Python, scikit-learn, pandas, a synthetic data generator written for the study.',
    findings: 'The decision tree caught more fraud on the synthetic set, but the rule-based score was easier for staff to explain and adjust.',
    limitations: 'No access to real transactions, so results may not hold on real data. Fraud patterns change quickly.',
    future: 'Test on anonymised real data under a data-sharing agreement. Study how staff act on alerts.',
  }),
  project('demo-fyp-3', 'Offline-first appointment booking for rural clinics', 2023, 'BSc Information Technology', ['offline', 'health', 'clinic', 'appointments', 'sync', 'pwa', 'database'], {
    problem: 'Rural clinics lose appointment records when the internet drops and patients miss visits because reminders are never sent.',
    method: 'Prototyping with two clinic staff over three iterations. Tested sync behaviour by repeatedly cutting the connection.',
    tools: 'React progressive web app, IndexedDB, a Node.js API, PostgreSQL.',
    findings: 'Staff completed bookings without a connection and records synced when it returned. Two staff members preferred paper for walk-ins.',
    limitations: 'Conflicts were resolved with last-write-wins, which can overwrite a change. Tested with two users, not a full clinic.',
    future: 'Use a proper conflict-resolution strategy. Add SMS reminders. Measure missed appointments before and after.',
  }),
  project('demo-fyp-4', 'Campus shuttle tracking using low-cost GPS trackers', 2021, 'BSc Information Technology', ['gps', 'tracking', 'transport', 'maps', 'iot', 'hardware'], {
    problem: 'Students wait long and unpredictably for the campus shuttle, and the transport office cannot see where its vehicles are.',
    method: 'Built and field-tested a tracker for two shuttles, then surveyed 60 students on waiting time before and after.',
    tools: 'GPS modules, a GSM board, Node.js, Leaflet maps, MongoDB.',
    findings: 'Students reported shorter perceived waiting time. Location updates lagged in areas with weak mobile signal.',
    limitations: 'Only two vehicles. Perceived waiting time is self-reported. Battery and theft of devices were not studied.',
    future: 'Predict arrival times from past trips. Compare the cost with commercial trackers.',
  }),
  project('demo-fyp-5', 'Examination timetable clash detection', 2022, 'BSc Computer Science', ['timetable', 'scheduling', 'algorithm', 'constraints', 'exams', 'optimisation'], {
    problem: 'Manually built exam timetables repeatedly place two exams for the same student at the same time, found only after the timetable is published.',
    method: 'Modelled the timetable as a graph colouring problem and compared a greedy algorithm with a simple genetic algorithm on three years of enrolment data.',
    tools: 'Python, NetworkX, a CSV import tool, a small web interface.',
    findings: 'Both methods removed all clashes on past data. The genetic algorithm spread exams more evenly but took much longer to run.',
    limitations: 'Room capacity and invigilator availability were ignored. Enrolment data was anonymised and incomplete.',
    future: 'Add room and staff constraints. Let the exams office lock some slots by hand.',
  }),
  project('demo-fyp-6', 'A study-room seat booking system for the library', 2024, 'BSc Information Technology', ['booking', 'library', 'web application', 'usability', 'authentication'], {
    problem: 'Students queue for seats at peak exam times and some hold seats for hours without using them.',
    method: 'Agile development with weekly feedback from library staff. Usability tested with 15 students using a task list.',
    tools: 'Laravel, MySQL, Tailwind CSS, QR codes for check-in.',
    findings: 'Check-in by QR code released unused seats after 20 minutes. Students rated it easy to use. Staff wanted a report of busy hours.',
    limitations: 'Tested only during one term. Students without smartphones could not check in.',
    future: 'Add a kiosk for check-in. Study whether the system changes how students use the library.',
  }),
  project('demo-fyp-7', 'Monitoring a small solar installation with a low-power sensor network', 2023, 'BSc Electrical and Computer Engineering', ['solar', 'sensors', 'energy', 'iot', 'monitoring', 'hardware'], {
    problem: 'Owners of small solar systems cannot tell when panels or batteries are failing until the power stops.',
    method: 'Built a sensor node measuring voltage and current, logged data for ten weeks, and compared readings against a handheld meter.',
    tools: 'Microcontroller board, current and voltage sensors, LoRa radio, a dashboard in Grafana.',
    findings: 'Readings were within 3% of the handheld meter. The dashboard showed battery decline several weeks before the owner noticed.',
    limitations: 'One installation. Temperature effects on the sensors were not controlled.',
    future: 'Add alerts by SMS. Test across several installations and seasons.',
  }),
  project('demo-fyp-8', 'A chatbot for answering new-student enquiries', 2024, 'BSc Computer Science', ['chatbot', 'nlp', 'enquiries', 'students', 'retrieval', 'faq'], {
    problem: 'The registry answers the same questions from new students all day, and answers differ depending on who is asked.',
    method: 'Collected 300 real enquiries, grouped them, and compared a keyword matcher with a retrieval approach over the official handbook. Tested with 20 new students.',
    tools: 'Python, sentence embeddings, FastAPI, a WhatsApp Business interface.',
    findings: 'Retrieval answered more questions correctly than keyword matching. Wrong answers were most common on fee and deadline questions.',
    limitations: 'The handbook was out of date in places, so some correct matches were wrong answers. No measure of how much staff time was saved.',
    future: 'Show which handbook section each answer came from. Refuse to answer when nothing in the handbook matches.',
  }),

  doc('demo-policy-proposal', 'policy', 'Final-year project proposal: what to include', 'Sample project handbook', ['proposal', 'final year project', 'structure', 'objectives', 'methodology', 'timeline'],
    'A proposal should be four to six pages. It states the problem, who has it, and why it matters in the first page. It lists one aim and three to five specific objectives that can be checked. It reviews at least ten relevant sources and says what earlier work did not cover. It names the method and explains why it fits the problem. It includes a timeline by month and a list of what will be needed, such as data, equipment and access. A proposal that only describes a system to build, with no problem or evaluation, is usually returned for revision.'),
  doc('demo-policy-supervisor', 'policy', 'Supervisor allocation and meetings', 'Sample project handbook', ['supervisor', 'allocation', 'meetings', 'supervision', 'workload'],
    'Supervisors are allocated by the department after proposals are approved. A supervisor may supervise up to six students, so allocation can take two to three weeks. Students should keep working while they wait: refine the problem statement, read earlier projects, and draft the literature review. Once allocated, students and supervisors should meet at least every two weeks, and the student should send a short progress note before each meeting. Students may suggest a supervisor, but the department decides.'),
  doc('demo-policy-integrity', 'policy', 'Academic integrity and use of AI tools', 'Sample student regulations', ['plagiarism', 'ai', 'integrity', 'referencing', 'copying', 'policy'],
    'Work submitted must be the student’s own. Copying text, code, data or design from earlier projects, the internet or another student without acknowledgement is plagiarism, even if it is reworded. AI tools may be used to understand a topic, find sources and check grammar. Text, code or analysis produced by an AI tool must not be submitted as the student’s own work, and any use of AI beyond these purposes must be declared in the acknowledgements. Students may read earlier projects for ideas and method, and must cite them if they rely on them.'),
  doc('demo-policy-structure', 'policy', 'Final-year project report structure', 'Sample project handbook', ['report', 'chapters', 'structure', 'dissertation', 'format', 'word limit', 'referencing'],
    'The report has five chapters: Introduction, Literature Review, Methodology, Results and Discussion, and Conclusion with Recommendations. The main text is 10,000 to 12,000 words, not counting references and appendices. Use the department’s referencing style consistently. Each objective stated in Chapter One must be answered in Chapters Four and Five. Include a limitations section and suggestions for future work.'),
  doc('demo-policy-ethics', 'policy', 'Ethics clearance for projects involving people or data', 'Sample project handbook', ['ethics', 'consent', 'data', 'interviews', 'survey', 'clearance', 'privacy'],
    'Any project that interviews, surveys, observes or collects data about people needs ethics clearance before data collection starts. Students must give participants an information sheet, obtain written consent, keep personal data secure, and anonymise it in the report. Projects using only public data or simulated data usually need a short declaration instead. Clearance takes about two weeks, so apply as soon as the method is settled.'),
  doc('demo-course-research', 'course', 'IT 4101 Research Methods: outline', 'Sample course outline', ['research methods', 'methodology', 'literature review', 'sampling', 'design science', 'evaluation'],
    'This course prepares students for the final-year project. Weeks one to three cover choosing and narrowing a research problem and writing objectives. Weeks four to six cover the literature review and how to find and judge sources. Weeks seven to nine cover research designs, including experiments, surveys, case studies and design science, and how to choose between them. Weeks ten and eleven cover sampling, data collection and ethics. Week twelve covers writing the proposal. Assessment is a proposal draft (40%), a literature review (30%) and a final exam (30%).'),
];
