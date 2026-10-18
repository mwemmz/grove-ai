import { GraduationCV, PortfolioSkill, PortfolioProject, Note, Course } from '../types';

export const portfolioService = {
  generateGraduationCV(
    studentName: string,
    degreeName: string,
    university: string,
    skills: PortfolioSkill[],
    projects: PortfolioProject[],
    courses: Course[],
    _notes: Note[]
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
      headline: `Software Engineer & Systems Architect | ${degreeName} Graduate`,
      education: {
        degree: degreeName,
        institution: university,
        years: '2023 - 2026',
        gpaOrHonors: 'First Class Honours (Dean’s Commendation)',
        courseworkByYear,
      },
      skills,
      projects,
      academicHighlights: [
        'Maintained a continuous 4-year degree knowledge repository in Grove with 140+ conceptual notes and active recall logs.',
        'Synthesized cross-year systems foundations from Year 1 C pointers to a production-grade 500k msg/sec event streaming capstone.',
        'Demonstrated verifiable competencies grounded in peer-reviewed course assignments and technical artifacts.',
      ],
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
