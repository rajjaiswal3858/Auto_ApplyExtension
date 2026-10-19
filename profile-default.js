// Built-in default profile for LinkedIn Auto Apply.
// Anything edited in the side panel is saved to chrome.storage and overrides these values;
// fields left empty in the panel fall back to what is here.

window.AA_DEFAULT_PROFILE = {
  firstName: 'Raj',
  lastName: 'Jaiswal',
  gender: 'Male',
  email: 'raj.jaiswal.fairwealth@gmail.com',
  phone: '+91-7084038567',
  city: 'Noida',
  country: 'India',
  currentTitle: 'AI Full Stack Developer',
  currentCompany: 'Head Field Solutions Pvt. Ltd.',
  totalYears: '1',
  minSkillYears: '2',
  // Format: "Skill: years, Skill: years" - the LLM uses these to answer experience questions.
  skills: 'React.js: 2, Node.js: 2, Express.js: 2, MongoDB: 2, JavaScript: 2, TypeScript: 2, Python: 2, MERN Stack: 2, RESTful APIs: 2, Generative AI: 1.5, LLMs: 1.5, RAG: 1.5, Prompt Engineering: 1.5, LangChain: 1.5, OpenAI: 1.5, Hugging Face: 1, FastAPI: 1, PostgreSQL: 1.5, Supabase: 1, SQL: 2, Java: 1.5, Git: 2, GitHub: 2',
  currentCtc: '450000',
  expectedCtc: '800000',
  salaryCurrency: 'INR',
  noticeDays: '15',
  workAuthorized: 'Yes',
  needSponsorship: 'No',
  willingRelocate: 'Yes',
  onsiteOk: 'Yes',
  linkedinUrl: 'https://www.linkedin.com/in/raj-jaiswal-1a58442aa/',
  dob: '',
  githubUrl: 'https://github.com/rajjaiswal3858',
  portfolioUrl: 'https://expense-2-new.onrender.com/',
  education: 'B.Tech in Information Technology, Noida Institute of Engineering & Technology, 2026',
  // Free-text context the LLM falls back on for questions the fields above do not cover.
  notes: 'AI Full Stack Developer with experience in MERN stack and Generative AI/RAG solutions. Graduated with B.Tech in Information Technology from Noida Institute of Engineering & Technology (2022-2026). Solved 350+ DSA problems across LeetCode, GeeksForGeeks, and HackerRank. Certified in AI and Python for Data Science from Coursera.',
  // Paste your resume as plain text (or upload a PDF from the side panel, which fills this in).
  resumeText: `Raj Jaiswal
Phone: +91-7084038567 | Email: raj.jaiswal.fairwealth@gmail.com
LinkedIn: https://www.linkedin.com/in/raj-jaiswal-1a58442aa/ | GitHub: https://github.com/rajjaiswal3858

WORK EXPERIENCE
Head Field Solutions Pvt. Ltd. | Jul 2026 – Present
AI Full Stack Developer | Noida, India
• Working on end-to-end development of in-house products and websites, contributing across the complete product development lifecycle.
• Building and integrating frontend, backend, and AI-driven functionality to deliver production-ready web products.
• Contributing to product development from implementation and integration through testing, refinement, and deployment.

PROJECTS
Expense Tracking System | React.js, Node.js, Express.js, MongoDB | Jun 2025
Live: https://expense-2-new.onrender.com/
• Built a full MERN-stack expense tracking application serving 50+ users, with a React.js frontend and a Node.js/Express.js REST API backend.
• Designed 12+ modular React components for data visualization, filters, and interactive charts using Chart.js.
• Developed a RESTful API handling 500+ expense records with optimized MongoDB aggregation pipelines.
• Integrated automated budget alerts and email notifications using NodeMailer, increasing engagement by 25%.

MeetInsight — AI Meeting Assistant | Python, FastAPI, LLMs, RAG, pgvector | Mar 2026
GitHub: https://github.com/rajjaiswal3858/--MeetInsight
• Architected an end-to-end Generative AI/RAG pipeline transforming raw meeting audio into a searchable knowledge base using LLM-powered semantic search.
• Applied prompt engineering techniques to power LLM-based Q&A over transcribed meeting data, returning context-grounded answers.
• Integrated Faster-Whisper for speech-to-text transcription and Resemblyzer for speaker diarization and voice analysis.
• Built a hybrid retrieval system combining pgvector similarity search with keyword matching, achieving 85%+ retrieval accuracy.
• Designed and deployed 6+ RESTful API endpoints for audio upload, transcription, and LLM inference, demonstrating API design skills transferable to Node.js/Express services.

URL Shortener Platform | React.js, ShadCN UI, Supabase, PostgreSQL | Dec 2025
GitHub: https://github.com/rajjaiswal3858/URL-SHORTNER-
• Developed a full-stack URL shortening service with user authentication, analytics dashboard, and link management.
• Engineered 10+ reusable React components with TypeScript, reducing codebase redundancy by 35%.
• Implemented Row-Level Security (RLS) policies ensuring user-specific data isolation with JWT authentication.
• Analyzed database queries and API caching, reducing redirect time from 750ms to 600ms (20% improvement).

TECHNICAL SKILLS
MERN Stack: MongoDB, Express.js, React.js, Node.js, RESTful APIs, JWT Authentication
AI/ML & Generative AI: LLMs, Prompt Engineering, OpenAI, LangChain, Hugging Face, RAG, LLM APIs
Languages: JavaScript (ES6+), TypeScript, Python, Java, SQL
Databases & Storage: MongoDB, PostgreSQL, Supabase, pgvector, MySQL
Tools & Platforms: GitHub, Postman, VS Code, Cursor

EDUCATION
Noida Institute of Engineering & Technology | Aug 2022 – May 2026
Bachelor of Technology in Information Technology | Greater Noida, India

Ewing Christian Public School | 2020 – 2021
Senior Secondary (Class XII) | Prayagraj, India

Ewing Christian Public School | 2018 – 2019
Secondary (Class X) | Prayagraj, India

ACHIEVEMENTS
• Solved 350+ DSA problems across LeetCode, GeeksForGeeks, and HackerRank, strengthening analytical problem-solving skills.
• Ranked among top performers in college coding contests; Runner-up in CodeAthon by Codetantra.

CERTIFICATIONS
• Introduction to Artificial Intelligence — Coursera
• Python for Data Science, AI & Development — Coursera
• Database Management Systems`
};
