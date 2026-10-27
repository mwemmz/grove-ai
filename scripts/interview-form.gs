/**
 * Grove student research form (University of Lusaka students only), plus an automatic Summary tab.
 *
 * What it is built to find out, in order of importance:
 *   1. When a student gets stuck, what actually happens, and does anyone at the university know? (the "unseen" claim)
 *   2. Why students do not ask lecturers or tutors. (the barriers a tool could remove)
 *   3. How students really use AI for study, and where it lets them down. (the "AI doesn't know my university" claim)
 *   (The form never describes the product idea, so nothing about it leaks to respondents.)
 * It asks what people DID (last time they got stuck) more than what they THINK, because past behaviour is more honest.
 *
 * How to use:
 *   1. Go to https://script.google.com -> New project -> paste this file.
 *   2. Choose createGroveForm and press Run. Approve the permissions. The form and a linked responses sheet appear
 *      in Google Drive; the links are printed in the Execution log.
 *   3. After responses come in, choose buildSummary and press Run. A "Summary" tab appears in the responses sheet with
 *      the key signals, two cross-checks, every question's counts, and students' own words. Run it again to refresh.
 */

var FORM_TITLE = 'How students at UNILUS get help and study';
var ASK = 'a lecturer or tutor';

/* ------------------------------------------------------------------ */
/*  The questions. Every item has an id so the summary can find it.    */
/*  type: mc (pick one), cb (tick all), text, para, grid               */
/* ------------------------------------------------------------------ */

var CONSENT_YES = 'Yes, I agree';

var PAGES = [
  {
    title: null,
    items: [
      { id: 'consent', type: 'mc', required: true, title: 'Do you agree to take part?', choices: [CONSENT_YES, 'No'] }
    ]
  },
  {
    title: 'About you',
    help: 'Only used to compare groups of students. No names or student numbers.',
    items: [
      { id: 'year', type: 'mc', required: true, title: 'Year of study', choices: ['Year 1', 'Year 2', 'Year 3', 'Year 4 (final year)', 'Postgraduate'] },
      { id: 'programme', type: 'text', title: 'Programme (for example BIT, BBA, Accounting)' },
      { id: 'classSize', type: 'mc', title: 'How many students are usually in your lectures?', choices: ['Under 30', '30 to 60', '60 to 100', '100 to 200', 'Over 200'] },
      { id: 'studyWhere', type: 'mc', required: true, title: 'When you study outside class, you are mostly...', choices: ['Alone', 'With classmates', 'A mix of both'] }
    ]
  },
  {
    title: 'Getting stuck',
    help: 'Think of what really happened, not what should happen.',
    items: [
      { id: 'stuckLength', type: 'mc', required: true, title: 'Think of the last time you got stuck on something in a course. How long were you stuck?',
        choices: ['Under 10 minutes', '10 minutes to an hour', 'A few hours', 'A day or more', 'I never got unstuck'] },
      { id: 'firstMove', type: 'mc', required: true, title: 'What did you do first?', other: true,
        choices: ['Asked ' + ASK, 'Asked a classmate or friend', 'Asked ChatGPT or another AI', 'Searched Google or YouTube', 'Re-read my notes or slides', 'Did nothing and moved on'] },
      { id: 'howEnded', type: 'mc', title: 'How did it end?', choices: ['I got it fully sorted', 'I got it partly sorted', 'I gave up on it', 'I am still stuck'] },
      { id: 'whoKnew', type: 'mc', required: true, title: 'Did anyone at the university (lecturer, tutor, supervisor) know you were stuck?',
        choices: ['Yes, I told them', 'Yes, they noticed without me saying', 'No, nobody knew', 'Not sure'] },
      { id: 'whyNot', type: 'cb', title: 'If you did not ask ' + ASK + ', why not? Tick all that apply.', other: true,
        choices: ['I did ask ' + ASK, 'The class is too big', 'I did not want to look like I had not been paying attention', 'I did not know who to ask',
                  'They are hard to reach, or their times do not suit me', 'I did not think it was important enough', 'I was afraid of being judged'] },
      { id: 'asksPerMonth', type: 'mc', required: true, title: 'In the last month, how many times did you ask ' + ASK + ' a question (in class, in person or online)?',
        choices: ['None', '1 to 2 times', '3 to 5 times', '6 or more times'] },
      { id: 'surprise', type: 'mc', required: true, title: 'In the past year, has a test or assignment result been much lower than you expected?',
        choices: ['Yes, more than once', 'Yes, once', 'No', 'I have no results yet'] },
      { id: 'earlier', type: 'para', title: 'If yes: what would have helped you notice the problem, or fix it, earlier?' }
    ]
  },
  {
    title: 'How you use AI for study',
    help: 'ChatGPT, Gemini, Copilot, Claude and similar tools.',
    items: [
      { id: 'aiFreq', type: 'mc', required: true, title: 'How often do you use AI tools for coursework?', choices: ['Never', 'Once a month or less', 'Every week', 'Most days'] },
      { id: 'aiUses', type: 'cb', title: 'What do you mostly use it for? Tick all that apply.', other: true,
        choices: ['Explaining a concept', 'Summarising notes or slides', 'Writing or fixing code', 'Drafting essays or reports', 'Solving problems or past papers', 'Making quizzes or flashcards', 'Finding sources'] },
      { id: 'aiNotes', type: 'mc', title: 'Do you give AI your own lecture notes or slides?', choices: ['Yes, usually', 'Sometimes', 'No, I ask it general questions', 'I did not know I could'] },
      { id: 'aiWrong', type: 'mc', title: 'Has AI ever given you an answer that did not match what your lecturer taught, or got a university rule or deadline wrong?',
        choices: ['Yes, often', 'Yes, sometimes', 'No', 'I have not asked it about those'] },
      { id: 'aiCheck', type: 'mc', title: 'Do you check AI answers against your notes or textbook?', choices: ['Always', 'Sometimes', 'Rarely', 'Never'] },
      { id: 'aiRules', type: 'mc', title: 'Do you know your university\'s rules on using AI in coursework?', choices: ['Yes, they are clear', 'Yes, but they are unclear', 'No', 'Not sure'] },
      { id: 'aiAlone', type: 'mc', title: 'After using AI to help with coursework, have you struggled to do a similar task on your own, for example in a test?',
        choices: ['Yes', 'No', 'I have not tried without it'] }
    ]
  },
  {
    title: 'One last thing',
    items: [
      { id: 'lastTime', type: 'para', title: 'Tell us about a time you needed help with your studies and could not get it. What happened?' },
      { id: 'followUp', type: 'text', title: 'Optional: would you talk for 15 minutes? Leave a WhatsApp number or email. This is the ONLY question that is not anonymous. Leave it blank to stay anonymous.' }
    ]
  }
];

/* ------------------------------------------------------------------ */
/*  Build the form                                                     */
/* ------------------------------------------------------------------ */

function createGroveForm() {
  var form = FormApp.create(FORM_TITLE);
  form.setDescription(
    'A short survey (about 5 minutes) for a student research project. ' +
    'It asks what really happens when you get stuck, and how you use AI to study.\n\n' +
    'It is anonymous: no names or student numbers are asked for. You can stop at any time. Answers are used only for this project.'
  );
  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('Thank you. Your answers will help improve how students are supported.');

  var consentItem = null;
  PAGES.forEach(function (page, pi) {
    if (pi > 0) {
      var pb = form.addPageBreakItem().setTitle(page.title);
      if (page.help) pb.setHelpText(page.help);
    }
    page.items.forEach(function (q) {
      var item;
      if (q.type === 'mc') {
        item = form.addMultipleChoiceItem().setTitle(q.title).setChoiceValues(q.choices);
        if (q.other) item.showOtherOption(true);
      } else if (q.type === 'cb') {
        item = form.addCheckboxItem().setTitle(q.title).setChoiceValues(q.choices);
        if (q.other) item.showOtherOption(true);
      } else if (q.type === 'text') {
        item = form.addTextItem().setTitle(q.title);
      } else if (q.type === 'para') {
        item = form.addParagraphTextItem().setTitle(q.title);
      } else if (q.type === 'grid') {
        item = form.addGridItem().setTitle(q.title).setRows(q.rows).setColumns(q.cols);
      }
      if (q.required) item.setRequired(true);
      if (q.id === 'consent') consentItem = item;
    });
  });

  // Anyone who does not agree is thanked and sent straight to the end.
  consentItem.setChoices([
    consentItem.createChoice(CONSENT_YES, FormApp.PageNavigationType.CONTINUE),
    consentItem.createChoice('No', FormApp.PageNavigationType.SUBMIT)
  ]);

  var sheet = SpreadsheetApp.create('Student research: responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', sheet.getId());

  Logger.log('Share this link: ' + form.getPublishedUrl());
  Logger.log('Edit the form: ' + form.getEditUrl());
  Logger.log('Responses sheet: ' + sheet.getUrl());
  Logger.log('When responses arrive, run buildSummary.');
}

/* ------------------------------------------------------------------ */
/*  The Summary tab                                                    */
/* ------------------------------------------------------------------ */

function allItems() {
  var out = [];
  PAGES.forEach(function (p) { p.items.forEach(function (q) { out.push(q); }); });
  return out;
}

function buildSummary() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Run createGroveForm first.');
  var ss = SpreadsheetApp.openById(id);

  var resp = null;
  ss.getSheets().forEach(function (s) {
    if (!resp && s.getLastColumn() > 0 && s.getRange(1, 1).getValue() === 'Timestamp') resp = s;
  });
  if (!resp || resp.getLastRow() < 2) {
    Logger.log('No responses yet. Run buildSummary again once some arrive.');
    return;
  }
  var respName = resp.getName();
  var headers = resp.getRange(1, 1, 1, resp.getLastColumn()).getValues()[0];
  var lastRow = Math.max(resp.getLastRow(), 2);

  function colOf(title) {
    var i = headers.indexOf(title);
    if (i < 0) throw new Error('Cannot find the column "' + title + '". Was the question renamed in the form?');
    return i + 1;
  }
  function letter(n) {
    var s = '';
    while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }
  var byId = {};
  allItems().forEach(function (q) { byId[q.id] = q; });
  // Whole-column ranges to row 5000, so new responses are counted without re-running.
  function rng(idOrTitle, rowLabel) {
    var q = byId[idOrTitle];
    var t = q ? q.title : idOrTitle;
    if (rowLabel) t = t + ' [' + rowLabel + ']';
    var L = letter(colOf(t));
    return "'" + respName + "'!$" + L + '$2:$' + L + '$5000';
  }

  var sum = ss.getSheetByName('Summary');
  if (sum) ss.deleteSheet(sum);
  sum = ss.insertSheet('Summary', 0);
  sum.setColumnWidth(1, 430);
  sum.setColumnWidth(2, 90);
  sum.setColumnWidth(3, 90);
  sum.setColumnWidth(4, 520);

  var r = 1;
  function put(row, values) { sum.getRange(row, 1, 1, values.length).setValues([values]); }
  function bold(row, cols, bg) {
    var rg = sum.getRange(row, 1, 1, cols).setFontWeight('bold');
    if (bg) rg.setBackground(bg);
  }

  put(r, ['Grove student research: summary', '', '', '']); sum.getRange(r, 1).setFontSize(14).setFontWeight('bold'); r++;
  put(r, ['Students who completed the form', '', '', '']);
  var NCELL = '$B$' + r;
  sum.getRange(r, 2).setFormula('=COUNTA(' + rng('year') + ')');
  r++;
  put(r, ['Read with care', '', '', '']);
  sum.getRange(r, 2).setFormula('=IF(' + NCELL + '<30,"Under 30 answers: treat every number as a hint, not a finding.",IF(' + NCELL + '<100,"Small, self-selected sample: good for direction, not for the whole university.","Larger sample, but still only students who chose to answer."))');
  r += 2;

  /* ---- key signals ---- */
  put(r, ['KEY SIGNALS', 'Share', 'Count', 'If this is high, it suggests']); bold(r, 4, '#d9ead3'); r++;
  function share(label, numer, denom, meaning) {
    put(r, [label, '', '', meaning]);
    sum.getRange(r, 3).setFormula('=' + numer);
    sum.getRange(r, 2).setFormula('=IFERROR(C' + r + '/' + (denom || NCELL) + ',"")').setNumberFormat('0%');
    r++;
  }
  function count(rangeRef, value) { return 'COUNTIF(' + rangeRef + ',"' + value.replace(/"/g, '""') + '")'; }

  share('Nobody at the university knew they were stuck', count(rng('whoKnew'), 'No, nobody knew'), null,
        'Students struggle unseen. This is the core of the problem statement.');
  share('Stayed stuck for a day or more, or never got unstuck',
        count(rng('stuckLength'), 'A day or more') + '+' + count(rng('stuckLength'), 'I never got unstuck'), null,
        'Getting stuck is costly, not a passing moment.');
  share('Asked a lecturer or tutor nothing in the last month', count(rng('asksPerMonth'), 'None'), null,
        'Students are not using the help that already exists.');
  share('A result was much lower than expected (once or more)',
        count(rng('surprise'), 'Yes, more than once') + '+' + count(rng('surprise'), 'Yes, once'),
        '(' + NCELL + '-' + count(rng('surprise'), 'I have no results yet') + ')',
        'Problems surface at results time, too late. Share is of students who have results.');
  share('Use AI for coursework every week or more',
        count(rng('aiFreq'), 'Every week') + '+' + count(rng('aiFreq'), 'Most days'), null,
        'The AI habit is real at UNILUS, so the question is how, not whether.');
  share('AI has given a wrong or off-course answer (often or sometimes)',
        count(rng('aiWrong'), 'Yes, often') + '+' + count(rng('aiWrong'), 'Yes, sometimes'), null,
        'General AI does not know the course or the university. This is the case for an institution-tied AI.');
  share('Do not know, or find unclear, the university\'s AI rules',
        count(rng('aiRules'), 'No') + '+' + count(rng('aiRules'), 'Yes, but they are unclear') + '+' + count(rng('aiRules'), 'Not sure'), null,
        'A gap an onboarding on AI use could fill.');
  share('Struggled to do a task alone after using AI for it', count(rng('aiAlone'), 'Yes'), null,
        'AI is being used to offload thinking. Grove should hold back answers and test recall.');
  var topBarrierRow = r;
  put(r, ['Biggest reason for not asking a lecturer or tutor', '', '', 'The most-ticked reason in the "why not" table below. Each one is a barrier a tool could try to remove.']);
  r += 2;

  /* ---- cross-checks ---- */
  put(r, ['CROSS-CHECKS', '', '', '']); bold(r, 4, '#d9ead3'); r++;
  put(r, ['"Nobody knew I was stuck", by year of study', 'Share', 'Count', 'Look for: does it get better or worse by year?']); bold(r, 4, '#f3f3f3'); r++;
  allItems().filter(function (q) { return q.id === 'year'; })[0].choices.forEach(function (y) {
    put(r, [y, '', '', '']);
    sum.getRange(r, 3).setFormula('=COUNTIFS(' + rng('year') + ',"' + y + '",' + rng('whoKnew') + ',"No, nobody knew")');
    sum.getRange(r, 2).setFormula('=IFERROR(C' + r + '/COUNTIF(' + rng('year') + ',"' + y + '"),"")').setNumberFormat('0%');
    r++;
  });
  r++;
  put(r, ['Wrong or off-course AI answers, by whether they give AI their notes', 'Share', 'Count', 'Look for: do students who share notes get fewer wrong answers? If yes, an AI that already holds the notes helps.']); bold(r, 4, '#f3f3f3'); r++;
  byId.aiNotes.choices.forEach(function (c) {
    put(r, [c, '', '', '']);
    sum.getRange(r, 3).setFormula('=COUNTIFS(' + rng('aiNotes') + ',"' + c + '",' + rng('aiWrong') + ',"Yes, often")+COUNTIFS(' + rng('aiNotes') + ',"' + c + '",' + rng('aiWrong') + ',"Yes, sometimes")');
    sum.getRange(r, 2).setFormula('=IFERROR(C' + r + '/COUNTIF(' + rng('aiNotes') + ',"' + c + '"),"")').setNumberFormat('0%');
    r++;
  });
  r++;
  put(r, ['Asked nobody in the last month, by how they study', 'Share', 'Count', 'Look for: do students who study alone ask less?']); bold(r, 4, '#f3f3f3'); r++;
  byId.studyWhere.choices.forEach(function (c) {
    put(r, [c, '', '', '']);
    sum.getRange(r, 3).setFormula('=COUNTIFS(' + rng('studyWhere') + ',"' + c + '",' + rng('asksPerMonth') + ',"None")');
    sum.getRange(r, 2).setFormula('=IFERROR(C' + r + '/COUNTIF(' + rng('studyWhere') + ',"' + c + '"),"")').setNumberFormat('0%');
    r++;
  });
  r += 2;

  /* ---- every question ---- */
  put(r, ['EVERY QUESTION', '', '', '']); bold(r, 4, '#d9ead3'); r++;
  var whyNotRows = null;
  allItems().forEach(function (q) {
    if (q.id === 'consent' || q.type === 'text' || q.type === 'para') return;
    put(r, [q.title, 'Share', 'Count', '']); bold(r, 4, '#f3f3f3'); r++;
    if (q.type === 'mc' || q.type === 'cb') {
      var first = r;
      q.choices.forEach(function (c) {
        put(r, [c, '', '', '']);
        var crit = q.type === 'cb' ? '"*' + c.replace(/"/g, '""') + '*"' : '"' + c.replace(/"/g, '""') + '"';
        sum.getRange(r, 3).setFormula('=COUNTIF(' + rng(q.id) + ',' + crit + ')');
        sum.getRange(r, 2).setFormula('=IFERROR(C' + r + '/COUNTA(' + rng(q.id) + '),"")').setNumberFormat('0%');
        r++;
      });
      if (q.id === 'whyNot') whyNotRows = [first, r - 1];
    } else if (q.type === 'grid') {
      q.rows.forEach(function (row) {
        put(r, [row, '', '', '']); sum.getRange(r, 1).setFontStyle('italic'); r++;
        q.cols.forEach(function (c) {
          put(r, ['   ' + c, '', '', '']);
          sum.getRange(r, 3).setFormula('=COUNTIF(' + rng(q.id, row) + ',"' + c.replace(/"/g, '""') + '")');
          sum.getRange(r, 2).setFormula('=IFERROR(C' + r + '/COUNTA(' + rng(q.id, row) + '),"")').setNumberFormat('0%');
          r++;
        });
      });
    }
    r++;
  });

  // The biggest barrier, now that the table exists. The first option ("I did ask...") is not a barrier, so skip it.
  if (whyNotRows) {
    var a = whyNotRows[0] + 1, b = whyNotRows[1];
    sum.getRange(topBarrierRow, 1).setFormula('="Biggest reason for not asking a lecturer or tutor: "&IFERROR(INDEX(A' + a + ':A' + b + ',MATCH(MAX(C' + a + ':C' + b + '),C' + a + ':C' + b + ',0)),"")');
    sum.getRange(topBarrierRow, 3).setFormula('=MAX(C' + a + ':C' + b + ')');
    sum.getRange(topBarrierRow, 2).setFormula('=IFERROR(C' + topBarrierRow + '/' + NCELL + ',"")').setNumberFormat('0%');
  }

  /* ---- students' own words (a snapshot; run buildSummary again to refresh) ---- */
  put(r, ['IN THEIR OWN WORDS (latest 20 each)', '', '', '']); bold(r, 4, '#d9ead3'); r++;
  allItems().filter(function (q) { return q.type === 'para' && q.id !== 'followUp'; }).forEach(function (q) {
    put(r, [q.title, '', '', '']); bold(r, 4, '#f3f3f3'); r++;
    var vals = resp.getRange(2, colOf(q.title), lastRow - 1, 1).getValues()
      .map(function (x) { return String(x[0] || '').trim(); })
      .filter(function (x) { return x; }).slice(-20);
    if (vals.length === 0) { put(r, ['(no answers yet)', '', '', '']); r++; }
    vals.forEach(function (v) { put(r, [v, '', '', '']); sum.getRange(r, 1).setWrap(true); r++; });
    r++;
  });

  sum.setFrozenRows(2);
  Logger.log('Summary ready: ' + ss.getUrl());
}
