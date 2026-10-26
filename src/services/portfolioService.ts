import { GraduationCV, PortfolioSkill, PortfolioProject, Note, Course } from '../types';

export const portfolioService = {
  generateGraduationCV(
    studentName: string,
    degreeName: string,
    university: string,
    skills: PortfolioSkill[],
    projects: PortfolioProject[],
    courses: Course[],
    notes: Note[]
  ): GraduationCV {
    // Group courses by year
    const courseworkByYear = [1, 2, 3, 4].map(year => {
      const yearCourses = courses.filter(c => c.year === year);
      return {
        year: year as 1 | 2 | 3 | 4,
        courses: yearCourses.map(c => `${c.code}: ${c.name}`),
      };
    });

    return {
      name: studentName,
      headline: degreeName,
      education: {
        degree: degreeName,
        institution: university,
        years: '',
        gpaOrHonors: '',
        courseworkByYear,
      },
      skills,
      projects,
      academicHighlights: notes.length
        ? [`Kept ${notes.length} study ${notes.length === 1 ? 'note' : 'notes'} across ${new Set(notes.map((n) => n.courseId)).size} ${new Set(notes.map((n) => n.courseId)).size === 1 ? 'course' : 'courses'} in Grove.`]
        : [],
    };
  },

  exportCVToMarkdown(cv: GraduationCV): string {
    let md = `# ${cv.name}\n`;
    md += `**${cv.headline}**\n\n`;
    md += `---\n\n`;

    md += `## 🎓 Education\n`;
    md += `**${cv.education.degree}**, *${cv.education.institution}* (${cv.education.years})\n`;
    md += `*Honors:* ${cv.education.gpaOrHonors}\n\n`;

    md += `### Rigorous Coursework Timeline:\n`;
    cv.education.courseworkByYear.forEach(cw => {
      md += `- **Year ${cw.year}:** ${cw.courses.join(', ')}\n`;
    });
    md += `\n`;

    md += `## 🛠 Verified Technical Skills (Evidence-Backed)\n`;
    const categories = ['Languages', 'Systems', 'Algorithms', 'Tools & Cloud', 'Theory'] as const;
    categories.forEach(cat => {
      const catSkills = cv.skills.filter(s => s.category === cat);
      if (catSkills.length > 0) {
        md += `### ${cat}\n`;
        catSkills.forEach(s => {
          const notesRef = s.evidenceNotes.map(n => `[${n.courseCode}: ${n.title}]`).join(', ');
          md += `- **${s.name}** (${s.level}), *First acquired Year ${s.firstAcquiredYear}*\n`;
          if (notesRef) {
            md += `  - *Coursework Evidence:* ${notesRef}\n`;
          }
        });
        md += `\n`;
      }
    });

    md += `## 🚀 Projects & Systems Architecture\n`;
    cv.projects.forEach(p => {
      md += `### ${p.title} (${p.courseCode} - Year ${p.year})\n`;
      md += `${p.description}\n\n`;
      md += `*Tech Stack:* ${p.technologies.join(', ')}\n\n`;
      md += `*Key Outcomes:*\n`;
      p.outcomes.forEach(out => {
        md += `- ${out}\n`;
      });
      if (p.githubUrl) {
        md += `\n*Repository:* [${p.githubUrl}](${p.githubUrl})\n`;
      }
      md += `\n`;
    });

    md += `## 🏆 Academic & Engineering Highlights\n`;
    cv.academicHighlights.forEach(hl => {
      md += `- ${hl}\n`;
    });

    md += `\n---\n*Generated directly from verified 4-year degree coursework via Grove Learning Companion.*`;

    return md;
  }
};
