/**
 * Grove research form: students and lecturers at the University of Lusaka.
 * How to use: go to https://script.google.com → New project → paste this file → press Run (createGroveForm).
 * Approve the permissions Google asks for. The form and a linked response sheet appear in your Google Drive,
 * and the links are printed in the Execution log.
 */
function createGroveForm() {
  var form = FormApp.create('Grove research: how students get help at UNILUS');
  form.setDescription(
    'A short survey (about 5 minutes) for a student project called Grove: an AI built on the university\'s own courses, ' +
    'policies and past projects. It asks how students get help and how lecturers spot students who are struggling.\n\n' +
    'It is anonymous: no names or student numbers are asked for. You can stop at any time. Answers are used only for this project.'
  );
  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('Thank you. Your answers help decide what Grove should and should not do.');

  /* ---------- consent and role ---------- */
  var consent = form.addMultipleChoiceItem().setTitle('Do you agree to take part?').setRequired(true);
  form.addPageBreakItem().setTitle('About you');
  var role = form.addMultipleChoiceItem().setTitle('Which describes you?').setRequired(true);

  /* ---------- student section ---------- */
  var studentPage = form.addPageBreakItem().setTitle('For students');
  form.addMultipleChoiceItem().setTitle('Year of study').setChoiceValues(['Year 1', 'Year 2', 'Year 3', 'Year 4 (final year)', 'Postgraduate']).setRequired(true);
  form.addTextItem().setTitle('Programme (e.g. BIT, BBA, IT)');
  form.addMultipleChoiceItem().setTitle('How many students are usually in your lectures?')
    .setChoiceValues(['Under 30', '30 to 60', '60 to 100', '100 to 200', 'Over 200']);
  form.addScaleItem().setTitle('How comfortable are you asking a question in class?')
    .setBounds(1, 5).setLabels('Not at all', 'Very comfortable').setRequired(true);
  form.addCheckboxItem().setTitle('When you are stuck while studying alone, what do you do? (tick all that apply)')
    .setChoiceValues(['Ask the lecturer or tutor', 'Ask classmates', 'Use ChatGPT or another AI', 'Search YouTube or Google', 'Re-read my notes', 'Leave it and move on'])
    .showOtherOption(true);
  form.addMultipleChoiceItem().setTitle('How often do you use AI tools (ChatGPT, Gemini, Copilot…) for coursework?')
    .setChoiceValues(['Never', 'Once a month or less', 'Every week', 'Most days']).setRequired(true);
  form.addMultipleChoiceItem().setTitle('Has the university told you how you may and may not use AI in your work?')
    .setChoiceValues(['Yes, clearly', 'Yes, but it was unclear', 'No', 'Not sure']);
  form.addMultipleChoiceItem().setTitle('Has an AI tool ever given you a wrong answer about your course, a deadline or a university rule?')
    .setChoiceValues(['Yes', 'No', 'I have not asked it about those', 'Not sure']);
  form.addParagraphTextItem().setTitle('Think of a time you fell behind in a course. Who noticed first, and when?');

  var studentEnd = form.addPageBreakItem().setTitle('A university\'s own AI');
  form.addScaleItem().setTitle('Would you use an AI that answers from your university\'s own course notes, rules and past projects, and says when it does not know?')
    .setBounds(1, 5).setLabels('Never', 'Definitely').setRequired(true);
  form.addCheckboxItem().setTitle('What would make you trust it? (tick all that apply)')
    .setChoiceValues(['It shows where each answer came from', 'Lecturers approved the material', 'It says when it does not know', 'My data stays private', 'It does not write my work for me'])
    .showOtherOption(true);
  form.addMultipleChoiceItem().setTitle('Would you allow your anonymous study data (topics you struggle with, never your name) to be shown to lecturers as class totals?')
    .setChoiceValues(['Yes', 'Only if I opt in each time', 'No']);
  form.addParagraphTextItem().setTitle('Anything else you would want it to do, or never do?');

  /* ---------- lecturer section ---------- */
  var lecturerPage = form.addPageBreakItem().setTitle('For lecturers');
  form.addMultipleChoiceItem().setTitle('How many students are in your largest class?')
    .setChoiceValues(['Under 30', '30 to 60', '60 to 100', '100 to 200', 'Over 200']).setRequired(true);
  form.addCheckboxItem().setTitle('How do you usually find out a student is struggling? (tick all that apply)')
    .setChoiceValues(['They ask me', 'Test or assignment marks', 'Attendance', 'I notice in class', 'A counsellor or another lecturer tells me', 'Usually only when they fail'])
    .showOtherOption(true);
  form.addParagraphTextItem().setTitle('Which questions do students ask you most that are already answered in the handbook or course outline?');
  form.addCheckboxItem().setTitle('What worries you about students using a university AI? (tick all that apply)')
    .setChoiceValues(['Wrong answers', 'Cheating or AI-written work', 'Privacy of student data', 'Students depending on it', 'It replaces contact with lecturers', 'None of these'])
    .showOtherOption(true);
  form.addScaleItem().setTitle('Would anonymous class totals of where students get stuck be useful to you?')
    .setBounds(1, 5).setLabels('Not useful', 'Very useful');
  form.addParagraphTextItem().setTitle('Anything else Grove should know?');

  /* ---------- branching ---------- */
  consent.setChoices([
    consent.createChoice('Yes, I agree', FormApp.PageNavigationType.CONTINUE),
    consent.createChoice('No', FormApp.PageNavigationType.SUBMIT),
  ]);
  role.setChoices([
    role.createChoice('Student', studentPage),
    role.createChoice('Lecturer', lecturerPage),
  ]);
  // Students finish after their last page instead of running on into the lecturer section.
  lecturerPage.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  /* ---------- responses go to a sheet ---------- */
  var sheet = SpreadsheetApp.create('Grove research: responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  Logger.log('Share this link: ' + form.getPublishedUrl());
  Logger.log('Edit the form: ' + form.getEditUrl());
  Logger.log('Responses sheet: ' + sheet.getUrl());
}
