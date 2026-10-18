import React, { useState } from 'react';
import { GraduationCap, ThumbsUp, Star, Clock, Plus, Send, X } from 'lucide-react';
import { SeniorComment, TutorProfile, TutorRequest, Course, StudentTier } from '../types';
import { storage } from '../services/storage';
import { PageHeader, Segmented, Toast } from './ui';

interface PeerTutoringViewProps {
  seniorComments: SeniorComment[];
  setSeniorComments: React.Dispatch<React.SetStateAction<SeniorComment[]>>;
  tutors: TutorProfile[];
  setTutors: React.Dispatch<React.SetStateAction<TutorProfile[]>>;
  tutorRequests: TutorRequest[];
  setTutorRequests: React.Dispatch<React.SetStateAction<TutorRequest[]>>;
  courses: Course[];
}

export const PeerTutoringView: React.FC<PeerTutoringViewProps> = ({
  seniorComments,
  setSeniorComments,
  tutors,
  setTutors: _setTutors,
  tutorRequests,
  setTutorRequests,
  courses,
}) => {
  const [activeTab, setActiveTab] = useState<'advice' | 'tutors' | 'requests'>('advice');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isAdviceModalOpen, setIsAdviceModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedTutorForRequest, setSelectedTutorForRequest] = useState<TutorProfile | null>(null);

  // New Advice Form State
  const [advCourseCode, setAdvCourseCode] = useState('CS201');
  const [advTopic, setAdvTopic] = useState('');
  const [advAuthorName, setAdvAuthorName] = useState('Alex Chimwaza');
  const [advGrade, setAdvGrade] = useState<StudentTier>('A+');
  const [advCategory, setAdvCategory] = useState<SeniorComment['category']>('exam-gotcha');
  const [advText, setAdvText] = useState('');

  // New Request Form State
  const [reqStudentName, setReqStudentName] = useState('Kelvin Banda');
  const [reqStudentYear, setReqStudentYear] = useState(2);
  const [reqCourseCode, setReqCourseCode] = useState('CS201');
  const [reqTopic, setReqTopic] = useState('');
  const [reqUrgency, setReqUrgency] = useState<TutorRequest['urgency']>('midterm-prep');
  const [reqTime, setReqTime] = useState('Wednesday 16:00 (Discord or Campus Library)');
  const [reqMessage, setReqMessage] = useState('');

  // Filtering advice
  const filteredComments = seniorComments.filter(sc => {
    if (selectedCourse !== 'all' && sc.courseCode !== selectedCourse) return false;
    if (selectedCategory !== 'all' && sc.category !== selectedCategory) return false;
    return true;
  });

  // Filtering tutors
  const filteredTutors = tutors.filter(t => {
    if (selectedCourse === 'all') return true;
    return t.clearedCourses.some(c => c.courseCode === selectedCourse);
  });

  const handleUpvote = (id: string) => {
    const updated = storage.toggleUpvoteComment(id);
    setSeniorComments(updated);
  };

  const handleCreateAdvice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advTopic.trim() || !advText.trim()) return;

    const newComment: SeniorComment = {
      id: `sc-${Date.now()}`,
      courseCode: advCourseCode,
      topic: advTopic.trim(),
      authorName: advAuthorName.trim(),
      authorGrade: advGrade,
      semesterCleared: 'Fall 2025',
      category: advCategory,
      commentText: advText.trim(),
      upvotes: 1,
      hasUpvoted: true,
      verifiedClearance: true,
      createdAt: new Date().toISOString(),
    };

    const updated = storage.addSeniorComment(newComment);
    setSeniorComments(updated);
    setIsAdviceModalOpen(false);
    setAdvTopic('');
    setAdvText('');
    setToastMessage('Your course clearance advice has been published!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenRequestModal = (tutor: TutorProfile) => {
    setSelectedTutorForRequest(tutor);
    setReqCourseCode(tutor.clearedCourses[0]?.courseCode || 'CS201');
    setIsRequestModalOpen(true);
  };

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTutorForRequest || !reqTopic.trim() || !reqMessage.trim()) return;

    const newReq: TutorRequest = {
      id: `req-${Date.now()}`,
      requesterName: reqStudentName.trim(),
      requesterYear: Number(reqStudentYear) as any,
      tutorId: selectedTutorForRequest.id,
      tutorName: selectedTutorForRequest.name,
      courseCode: reqCourseCode,
      topic: reqTopic.trim(),
      message: reqMessage.trim(),
      preferredTime: reqTime.trim(),
      urgency: reqUrgency,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const updated = storage.addTutorRequest(newReq);
    setTutorRequests(updated);
    setIsRequestModalOpen(false);
    setReqTopic('');
    setReqMessage('');
    setToastMessage(`Tutoring request sent to ${selectedTutorForRequest.name}!`);
    setTimeout(() => setToastMessage(null), 3500);
    setActiveTab('requests');
  };

  const handleUpdateStatus = (id: string, status: TutorRequest['status']) => {
    const updated = storage.updateRequestStatus(id, status);
    setTutorRequests(updated);
    setToastMessage(`Request marked as ${status}.`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const getCategoryBadge = (cat: SeniorComment['category']) => {
    switch (cat) {
      case 'exam-gotcha': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'study-strategy': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'lecturer-quirk': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'resource-gem': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      
      <Toast message={toastMessage} />

      <PageHeader
        title="Peer tutoring"
        subtitle="Seniors who cleared a course share what to watch for. Ask a high performer for one-to-one help."
      />

      <Segmented
        label="Peer tutoring sections"
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { id: 'advice', label: `Advice (${seniorComments.length})` },
          { id: 'tutors', label: `Tutors (${tutors.length})` },
          { id: 'requests', label: `Requests (${tutorRequests.length})` },
        ]}
      />

      {/* TAB 1: CLEARANCE ADVICE & ANNOTATIONS */}
      {activeTab === 'advice' && (
        <div className="space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Course:</span>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
              >
                <option value="all">All Courses</option>
                {courses.map(c => (
                  <option key={c.id} value={c.code}>{c.code}: {c.name}</option>
                ))}
              </select>

              <span className="text-xs text-slate-500 font-medium ml-2">Type:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
              >
                <option value="all">All Categories</option>
                <option value="exam-gotcha">Exam Gotchas & Pitfalls</option>
                <option value="study-strategy">Study Strategy</option>
                <option value="lecturer-quirk">Lecturer Quirks</option>
                <option value="resource-gem">Secret Resources</option>
              </select>
            </div>

            <button
              onClick={() => setIsAdviceModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow transition-colors self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Leave Clearance Advice</span>
            </button>
          </div>

          {/* Advice Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredComments.map(comment => (
              <div
                key={comment.id}
                className="rounded-2xl bg-slate-900/80 border border-slate-800/90 p-5 flex flex-col justify-between shadow-lg space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-800 text-slate-200 text-xs font-mono font-bold px-2 py-0.5 border border-slate-700">
                        {comment.courseCode}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getCategoryBadge(comment.category)}`}>
                        {comment.category.replace('-', ' ')}
                      </span>
                    </div>

                    <span className="text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                      Cleared with {comment.authorGrade}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">
                    {comment.topic}
                  </h3>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-line">
                    {comment.commentText}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-slate-800 flex items-center justify-center text-xs text-teal-400 font-bold">
                      {comment.authorName[0]}
                    </div>
                    <span className="text-slate-400 font-medium">{comment.authorName}</span>
                    <span className="text-xs text-slate-600">· {comment.semesterCleared}</span>
                  </div>

                  <button
                    onClick={() => handleUpvote(comment.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                      comment.hasUpvoted
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <ThumbsUp className="h-3 w-3" />
                    <span>{comment.upvotes}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: FIND A SENIOR TUTOR */}
      {activeTab === 'tutors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
            <p className="text-xs text-slate-400">
              Verified high-performing seniors who earned an A+ or A in your courses and are available for 1-on-1 tutoring.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Filter by Course:</span>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">All Courses</option>
                <option value="CS101">CS101</option>
                <option value="CS201">CS201</option>
                <option value="CS301">CS301</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTutors.map(tutor => (
              <div
                key={tutor.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        {tutor.name}
                        <span className="text-xs font-bold text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                          Year {tutor.currentYear} Senior
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{tutor.degreeName}</p>
                    </div>

                    <div className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      <span>{tutor.rating}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mt-3 leading-relaxed line-clamp-3">
                    {tutor.bio}
                  </p>

                  {/* Cleared Courses Pills */}
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Cleared Courses (Verified)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tutor.clearedCourses.map((cc, i) => (
                        <span
                          key={i}
                          className="rounded bg-slate-800/80 px-2 py-0.5 text-xs text-slate-300 border border-slate-700/60 flex items-center gap-1"
                        >
                          <span className="font-bold text-white">{cc.courseCode}</span>
                          <span className="text-amber-300 font-bold">({cc.grade})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Rate / Session</div>
                    <div className="text-xs font-bold text-emerald-400">{tutor.hourlyRate}</div>
                  </div>

                  <button
                    onClick={() => handleOpenRequestModal(tutor)}
                    className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow transition-colors"
                  >
                    <Send className="h-3 w-3" />
                    <span>Request Tutor</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TUTORING REQUESTS QUEUE */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-teal-400" />
              Active Peer Tutoring Exchange Queue
            </h3>
            <span className="text-xs text-slate-400">
              {tutorRequests.length} requests logged
            </span>
          </div>

          <div className="space-y-3">
            {tutorRequests.map(req => (
              <div
                key={req.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-3 shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono font-bold text-white">
                      {req.courseCode}
                    </span>
                    <h4 className="text-sm font-bold text-white">{req.topic}</h4>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                      req.urgency === 'midterm-prep' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                      req.urgency === 'assignment-deadline' ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' :
                      'bg-blue-500/10 text-blue-300 border-blue-500/20'
                    }`}>
                      {req.urgency.replace('-', ' ')}
                    </span>
                  </div>

                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider self-start sm:self-auto ${
                    req.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                    req.status === 'completed' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                    req.status === 'declined' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                    'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {req.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  “{req.message}”
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 pt-1">
                  <div className="space-x-4">
                    <span>
                      <strong className="text-slate-300">Student:</strong> {req.requesterName} (Year {req.requesterYear})
                    </span>
                    <span>
                      <strong className="text-slate-300">Tutor:</strong> {req.tutorName}
                    </span>
                    <span>
                      <strong className="text-slate-300">Time:</strong> {req.preferredTime}
                    </span>
                  </div>

                  {/* Actions for demo */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {req.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'accepted')}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'declined')}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 text-xs font-semibold"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {req.status === 'accepted' && (
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'completed')}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leave Advice Modal */}
      {isAdviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg max-h-[85dvh] overflow-y-auto rounded-2xl bg-[#0f121a] border border-white/[0.08] p-6 shadow-2xl shadow-black/80 text-slate-200 animate-enter">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-teal-400" />
                Leave Course Clearance Advice
              </h3>
              <button
                onClick={() => setIsAdviceModalOpen(false)}
                className="h-7 w-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Help junior students prepare for exam pitfalls, difficult labs, or lecturer grading quirks.
            </p>

            <form onSubmit={handleCreateAdvice} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Course Code</label>
                  <select
                    value={advCourseCode}
                    onChange={(e) => setAdvCourseCode(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.code}>{c.code}: {c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Grade You Earned</label>
                  <select
                    value={advGrade}
                    onChange={(e) => setAdvGrade(e.target.value as StudentTier)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="A+">A+ (Cleared with Distinction)</option>
                    <option value="A">A (Cleared with Honors)</option>
                    <option value="B+">B+ (Cleared)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Topic / Exam Focus</label>
                <input
                  type="text"
                  required
                  value={advTopic}
                  onChange={(e) => setAdvTopic(e.target.value)}
                  placeholder="e.g. Midterm Deadlock Resource Allocation Graphs"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Advice Category</label>
                <select
                  value={advCategory}
                  onChange={(e) => setAdvCategory(e.target.value as any)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="exam-gotcha">Exam Gotchas & High-Frequency Traps</option>
                  <option value="study-strategy">Study Strategy & Lab Workflow</option>
                  <option value="lecturer-quirk">Lecturer Grading Quirks</option>
                  <option value="resource-gem">Secret High-Yield Resource</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Your Battle-Tested Advice</label>
                <textarea
                  rows={4}
                  required
                  value={advText}
                  onChange={(e) => setAdvText(e.target.value)}
                  placeholder="Share exactly what you wish you knew on day 1 of the course..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdviceModalOpen(false)}
                  className="rounded-xl bg-slate-800 text-slate-400 px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 hover:bg-teal-500 text-white px-5 py-2 text-xs font-semibold"
                >
                  Publish Advice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request 1-on-1 Tutoring Modal */}
      {isRequestModalOpen && selectedTutorForRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg max-h-[85dvh] overflow-y-auto rounded-2xl bg-[#0f121a] border border-white/[0.08] p-6 shadow-2xl shadow-black/80 text-slate-200 animate-enter">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="h-4 w-4 text-teal-400" />
                Request 1-on-1 Tutoring from {selectedTutorForRequest.name}
              </h3>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="h-7 w-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Get targeted coaching on difficult proofs, labs, or exam preparation.
            </p>

            <form onSubmit={handleSendRequest} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={reqStudentName}
                    onChange={(e) => setReqStudentName(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Your Year</label>
                  <select
                    value={reqStudentYear}
                    onChange={(e) => setReqStudentYear(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value={1}>Year 1 (Freshman)</option>
                    <option value={2}>Year 2 (Sophomore)</option>
                    <option value={3}>Year 3 (Junior)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Course Code</label>
                  <select
                    value={reqCourseCode}
                    onChange={(e) => setReqCourseCode(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    {selectedTutorForRequest.clearedCourses.map(cc => (
                      <option key={cc.courseCode} value={cc.courseCode}>
                        {cc.courseCode} (Earned {cc.grade})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Urgency</label>
                  <select
                    value={reqUrgency}
                    onChange={(e) => setReqUrgency(e.target.value as any)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="routine">Routine Concept Clarification</option>
                    <option value="midterm-prep">Upcoming Midterm Prep</option>
                    <option value="assignment-deadline">Urgent Lab/Assignment Deadline</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Specific Problem / Topic</label>
                <input
                  type="text"
                  required
                  value={reqTopic}
                  onChange={(e) => setReqTopic(e.target.value)}
                  placeholder="e.g. Deadlock Coffman conditions in Lab 2 dining philosophers"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Preferred Time & Format</label>
                <input
                  type="text"
                  required
                  value={reqTime}
                  onChange={(e) => setReqTime(e.target.value)}
                  placeholder="e.g. Thursday 16:00 (Campus Library or Discord)"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Message for {selectedTutorForRequest.name}</label>
                <textarea
                  rows={3}
                  required
                  value={reqMessage}
                  onChange={(e) => setReqMessage(e.target.value)}
                  placeholder="Briefly explain what you have tried and where you get stuck..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="rounded-xl bg-slate-800 text-slate-400 px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 hover:bg-teal-500 text-white px-5 py-2 text-xs font-semibold"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
