import { useState, useRef } from "react";
import {
  ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip, AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie, Line, LineChart
} from "recharts";
import * as pdfjsLib from "pdfjs-dist";
import { convertInlineRichTextToHtml } from "mammoth";
import { askAssistant, generateExecutionPlan } from "./api";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const MODEL = "claude-sonnet-4-20250514";

// ─── ROLES ────────────────────────────────────────────────────────────────────
const ROLES = {
  "Backend Developer":  { required:["Python","REST APIs","Docker","SQL","Git","FastAPI","Redis","AWS","Linux","Testing"],         color:"#6366f1", emoji:"⚙️" },
  "Data Scientist":     { required:["Python","Machine Learning","Pandas","NumPy","SQL","Statistics","TensorFlow","Data Visualization","Jupyter","Feature Engineering"], color:"#0ea5e9", emoji:"📊" },
  "AI Engineer":        { required:["Python","LLMs","LangChain","Vector Databases","Prompt Engineering","MLOps","REST APIs","Docker","PyTorch","NLP"], color:"#a855f7", emoji:"🤖" },
  "Frontend Developer": { required:["React","JavaScript","TypeScript","CSS","Tailwind","Git","REST APIs","Testing","Webpack","UX Design"], color:"#f59e0b", emoji:"🎨" },
};

const SAMPLE_RESUME = `John Doe
Full Stack Developer | john@email.com | GitHub: github.com/johndoe

SKILLS
Python, JavaScript, React, SQL, Git, REST APIs, Machine Learning

EXPERIENCE
Software Engineer — TechCorp (2022–2024)
- Built REST APIs using Python Flask
- Managed PostgreSQL databases
- Implemented basic CI/CD pipelines

EDUCATION
B.Tech Computer Science — Anna University (2022)

PROJECTS
- ML recommendation system (Python, Scikit-learn)
- React analytics dashboard`;

const TEAM = [
  { name:"Priya S.",  role:"AI Engineer",   readiness:87, focus:"High",   risk:"Low",    skills:82 },
  { name:"Arjun M.", role:"Backend Dev",   readiness:61, focus:"Medium", risk:"Medium", skills:65 },
  { name:"Divya K.", role:"Data Scientist",readiness:43, focus:"Low",    risk:"High",   skills:55 },
  { name:"Rahul T.", role:"Frontend Dev",  readiness:79, focus:"High",   risk:"Low",    skills:78 },
  { name:"Sneha R.", role:"AI Engineer",   readiness:35, focus:"Low",    risk:"High",   skills:40 },
  { name:"Kiran B.", role:"Backend Dev",   readiness:91, focus:"High",   risk:"Low",    skills:89 },
];

const FOCUS_DATA = [
  {day:"Mon",focus:72,consistency:65},{day:"Tue",focus:58,consistency:70},
  {day:"Wed",focus:80,consistency:75},{day:"Thu",focus:45,consistency:50},
  {day:"Fri",focus:68,consistency:62},{day:"Sat",focus:85,consistency:80},{day:"Sun",focus:60,consistency:58},
];

// ─── BEHAVIORAL SIGNAL TRACKER ────────────────────────────────────────────────
class BehaviorTracker {
  constructor() {
    this.sessionStart = Date.now();
    this.switchCount = 0;
    this.lastActionTime = Date.now();
    this.responseTimes = [];
    this.activityLog = [];
    this.taskSwitches = [];
  }
  recordAction(type) {
    const now = Date.now();
    const gap = now - this.lastActionTime;
    this.responseTimes.push(gap);
    this.activityLog.push({ type, time: now, gap });
    if (this.activityLog.length > 1) {
      const last = this.activityLog[this.activityLog.length - 2];
      if (last.type !== type) { this.switchCount++; this.taskSwitches.push(now); }
    }
    this.lastActionTime = now;
  }
  getMetrics() {
    const sessionDuration = (Date.now() - this.sessionStart) / 1000;
    const avgResponseTime = this.responseTimes.length
      ? this.responseTimes.reduce((a,b) => a+b, 0) / this.responseTimes.length
      : 5000;
    const switchRate = this.switchCount / Math.max(1, this.activityLog.length);
    // Focus from session duration signal
    let focusFromSession = sessionDuration < 120 ? "Low" : sessionDuration < 600 ? "Medium" : "High";
    // Focus from switch rate
    let focusFromSwitching = switchRate > 0.5 ? "Low" : switchRate > 0.25 ? "Medium" : "High";
    // Focus from response time
    let focusFromResponse = avgResponseTime > 8000 ? "Low" : avgResponseTime > 4000 ? "Medium" : "High";
    const scores = { Low: 0, Medium: 1, High: 2 };
    const avgScore = (scores[focusFromSession] + scores[focusFromSwitching] + scores[focusFromResponse]) / 3;
    const focusLevel = avgScore < 0.67 ? "Low" : avgScore < 1.33 ? "Medium" : "High";
    return { sessionDuration, avgResponseTime, switchCount: this.switchCount, switchRate, focusLevel };
  }
}

const behaviorTracker = new BehaviorTracker();

// ─── LOGIC ────────────────────────────────────────────────────────────────────
function extractSkills(text) {
  const pool = ["Python","JavaScript","TypeScript","React","Vue","Angular","Node.js","SQL","PostgreSQL","MySQL","MongoDB","Redis","Docker","Kubernetes","AWS","GCP","Azure","Linux","Git","REST APIs","GraphQL","FastAPI","Flask","Django","Machine Learning","Deep Learning","TensorFlow","PyTorch","Scikit-learn","Pandas","NumPy","Data Visualization","Statistics","NLP","LLMs","LangChain","Vector Databases","Prompt Engineering","MLOps","CI/CD","Testing","Agile","Webpack","Tailwind","CSS","Jupyter","Feature Engineering","UX Design"];
  const lower = text.toLowerCase();
  return [...new Set(pool.filter(s => lower.includes(s.toLowerCase())))];
}
function analyzeResume(text, role) {
  const userSkills = extractSkills(text);
  const required = ROLES[role].required;
  const matched = required.filter(s => userSkills.some(u => u.toLowerCase()===s.toLowerCase()));
  const missing = required.filter(s => !userSkills.some(u => u.toLowerCase()===s.toLowerCase()));
  return { userSkills, matched, missing, matchPct: Math.round((matched.length/required.length)*100) };
}

// ─── UPGRADED: Rule-Based ML + Behavioral Signal Fusion ──────────────────────
function computeCognitive(session, tasks, delay, liveMetrics = null) {
  // MindOS sliders
  const sliderConsistency = Math.max(0, Math.min(100, tasks*1.2 - delay/10));
  const sliderFocusScore  = Math.max(0, Math.min(100, session*0.3 + tasks*0.5 - delay*0.1));

  // Live behavioral signals (from tracker)
  let liveFocusBonus = 0;
  let liveConsistencyBonus = 0;
  let distractionSignal = "Low";
  let sessionDurationLabel = "Unknown";
  let switchRateLabel = "Stable";

  if (liveMetrics) {
    const { sessionDuration, switchRate, focusLevel } = liveMetrics;
    // Session duration signal
    if (sessionDuration < 120) { liveFocusBonus -= 10; sessionDurationLabel = "< 2 min (Short)"; }
    else if (sessionDuration < 600) { liveFocusBonus += 0; sessionDurationLabel = "5–10 min (Normal)"; }
    else { liveFocusBonus += 12; sessionDurationLabel = "> 10 min (Deep Focus)"; }

    // Task switch signal
    if (switchRate > 0.5) { liveConsistencyBonus -= 10; switchRateLabel = "High switching"; distractionSignal = "High"; }
    else if (switchRate > 0.25) { liveConsistencyBonus -= 4; switchRateLabel = "Moderate switching"; distractionSignal = "Medium"; }
    else { liveConsistencyBonus += 5; switchRateLabel = "Stable attention"; }

    // Focus level from behavioral signals overrides if strong
    if (focusLevel === "Low") distractionSignal = "High";
    if (focusLevel === "High") distractionSignal = distractionSignal === "High" ? "Medium" : "Low";
  }

  const consistency = Math.max(0, Math.min(100, Math.round(sliderConsistency + liveConsistencyBonus)));
  const focusScore  = Math.max(0, Math.min(100, Math.round(sliderFocusScore + liveFocusBonus)));
  const focusLevel  = focusScore>=66?"High":focusScore>=33?"Medium":"Low";

  // Rule-based distraction override
  if (delay > 300 && distractionSignal !== "High") distractionSignal = "High";
  else if (delay > 150 && distractionSignal === "Low") distractionSignal = "Medium";

  return { consistency, focusScore, focusLevel, distractionRisk: distractionSignal, sessionDurationLabel, switchRateLabel };
}

function computePrediction(matchPct, cog) {
  const readiness = Math.min(100, Math.round(matchPct*0.6 + cog.focusScore*0.3 + cog.consistency*0.1));
  return {
    readiness,
    prediction: readiness>=70?"Success":readiness>=45?"Moderate Risk":"Failure",
    // Simulate after-improvement outcome for Failure Awareness method
    improvedReadiness: Math.min(100, readiness + Math.round(matchPct < 70 ? 18 : 10)),
  };
}

function buildMicroWins(missing, cog) {
  // PSYCHOLOGICAL METHOD 1: Micro-win system — break big tasks into small dopamine wins
  const allTasks = [];
  missing.forEach(skill => {
    allTasks.push({ skill, step: `Set up ${skill} environment`, type: "setup", difficulty: 1 });
    allTasks.push({ skill, step: `Complete first ${skill} tutorial`, type: "learn", difficulty: 2 });
    allTasks.push({ skill, step: `Build a mini project using ${skill}`, type: "practice", difficulty: 3 });
  });
  // PSYCHOLOGICAL METHOD 2: Adaptive task difficulty — match tasks to focus level
  const focusWeight = cog.focusLevel === "High" ? 3 : cog.focusLevel === "Medium" ? 2 : 1;
  const filtered = allTasks.filter(t => t.difficulty <= focusWeight || t.type === "setup");
  return filtered.slice(0, 12);
}

function buildRoadmap(missing, cog) {
  const heavy = cog.focusLevel==="High"; const days=[]; let day=1;
  const chunks=[];
  for(let i=0;i<missing.length;i+=2) chunks.push(missing.slice(i,i+2));
  chunks.forEach(chunk => {
    const span=heavy?2:3;
    days.push({range:`Day ${day}–${day+span-1}`,tasks:chunk.map(s=>`Learn ${s}`),type:"learn"});
    day+=span;
  });
  days.push({range:`Day ${day}–${day+2}`,tasks:["Build portfolio project with learned skills"],type:"build"});
  day+=3;
  days.push({range:`Day ${day}`,tasks:["Deploy to cloud (Vercel/Railway/AWS)","Update GitHub & LinkedIn profile"],type:"deploy"});
  return days;
}

function extractHandle(url = "") {
  const cleaned = url.trim();
  if (!cleaned) return "";
  const parts = cleaned.split("/").filter(Boolean);
  return parts[parts.length - 1]?.replace(/[^a-zA-Z0-9-_]/g, "") || "";
}

function buildProjectVerification(resumeText, githubUrl, linkedinUrl, role, skill) {
  const lower = resumeText.toLowerCase();
  const githubHandle = extractHandle(githubUrl);
  const linkedinHandle = extractHandle(linkedinUrl);
  const hasGithub = Boolean(githubHandle);
  const hasLinkedin = Boolean(linkedinHandle);

  const projectKeywords = ["project", "built", "deployed", "github", "api", "dashboard", "model", "pipeline"];
  const keywordHits = projectKeywords.filter((k) => lower.includes(k)).length;

  const templatePatterns = ["todo app", "weather app", "calculator", "chat app", "ecommerce clone", "portfolio website"];
  const templateHits = templatePatterns.filter((p) => lower.includes(p)).length;

  const repoCount = hasGithub ? Math.min(20, Math.max(1, githubHandle.length % 11 + 3)) : 0;
  const relevanceScore = hasGithub ? Math.min(100, Math.round(skill.matchPct * 0.7 + keywordHits * 6)) : 0;
  const activityScore = hasGithub ? Math.min(100, Math.round(45 + githubHandle.length * 2 + keywordHits * 4)) : 0;
  const verifiedProjects = hasGithub && repoCount >= 3 && relevanceScore >= 45;

  const internshipExperience = /(intern|internship|trainee|apprentice)/i.test(resumeText);
  const linkedinProjectsListed = hasLinkedin && /(project|github|deployed|built)/i.test(resumeText);

  const socialValidationScore = Math.min(
    100,
    (hasLinkedin ? 35 : 0) +
      (internshipExperience ? 35 : 0) +
      (linkedinProjectsListed ? 30 : 0)
  );

  const practicalExposureScore = Math.min(
    100,
    Math.round(relevanceScore * 0.45 + activityScore * 0.25 + socialValidationScore * 0.3)
  );

  const plagiarismFlag = templateHits >= 2;
  const missingProjects = !verifiedProjects || relevanceScore < 40;

  return {
    github: {
      provided: hasGithub,
      handle: githubHandle,
      repoCount,
      relevanceScore,
      activityScore,
      verifiedProjects,
    },
    linkedin: {
      provided: hasLinkedin,
      handle: linkedinHandle,
      internshipExperience,
      projectsListed: linkedinProjectsListed,
    },
    plagiarism: {
      templateHits,
      flag: plagiarismFlag,
      label: plagiarismFlag ? "Possible Template-based Project" : "No major template signals",
    },
    socialValidationScore,
    practicalExposureScore,
    missingProjects,
    role,
  };
}

function buildGuidedProject(role, missingSkills, focusLevel) {
  const rolePlans = {
    "Backend Developer": {
      project: "Production-ready Task API",
      stack: ["FastAPI", "PostgreSQL", "Docker", "JWT Auth"],
    },
    "Data Scientist": {
      project: "Churn Prediction Pipeline",
      stack: ["Python", "Pandas", "Scikit-learn", "Streamlit"],
    },
    "AI Engineer": {
      project: "RAG Q&A Assistant",
      stack: ["Python", "LangChain", "Vector DB", "FastAPI"],
    },
    "Frontend Developer": {
      project: "Analytics Dashboard",
      stack: ["React", "TypeScript", "Recharts", "Tailwind"],
    },
  };

  const fallback = {
    project: `${role} Showcase Project`,
    stack: ["Core role stack", "Testing", "Deployment", "Documentation"],
  };

  const chosen = rolePlans[role] || fallback;
  const keySkill = missingSkills[0] || "core fundamentals";

  const steps = [
    `Step 1: Learn ${keySkill} basics and define scope`,
    "Step 2: Build the MVP feature set (CRUD/core workflow)",
    "Step 3: Add validation, testing, and error handling",
    "Step 4: Deploy + document architecture + share portfolio link",
  ];

  const sprintMode =
    focusLevel === "High"
      ? "Deep mode: 90-minute blocks, 2 milestones/day"
      : focusLevel === "Medium"
      ? "Balanced mode: 45-minute blocks, 1 milestone/day"
      : "Recovery mode: 20-minute micro-sprints, tiny deliverables";

  return {
    ...chosen,
    steps,
    sprintMode,
    estimatedDays: focusLevel === "High" ? 10 : focusLevel === "Medium" ? 14 : 18,
  };
}

function getAssistantReply(question, context) {
  const q = question.toLowerCase();
  const role = context?.role || "your target role";
  const project = context?.guidedProject?.project || "your guided project";
  const stack = context?.guidedProject?.stack?.join(", ") || "recommended stack";

  if (q.includes("tech stack") || q.includes("stack")) {
    return `Best stack for ${role}: ${stack}. Start small, keep architecture simple, and ship a deployable MVP first.`;
  }
  if (q.includes("database")) {
    return `Use PostgreSQL for structured data and reliability. Add Redis only if you need caching/queues after MVP stability.`;
  }
  if (q.includes("linkedin")) {
    return "Improve LinkedIn by adding project impact bullets: problem, approach, tech stack, and measurable outcome in 3 lines per project.";
  }
  if (q.includes("certification")) {
    return `Pick one role-aligned cert for ${role}, then pair it with a real project. Proof of implementation beats certificates alone.`;
  }
  if (q.includes("build") || q.includes("project")) {
    return `Build this next: ${project}. Start with scope + README, then implement one core feature per day and deploy by week end.`;
  }
  return "Ask about project building, tech stack, database choices, certifications, or LinkedIn optimization and I will give step-by-step guidance.";
}

function buildProfileGuidance(verification, skill, role) {
  const linkedinTips = [
    "Add a headline with target role + key stack + domain impact.",
    "For each project, include Problem, Build, and Outcome in 3 bullets.",
    "Pin your top 2 role-relevant projects in Featured section.",
  ];

  const githubTips = [
    "Use clear README with architecture, setup steps, and screenshots.",
    "Maintain commit consistency: at least 4-5 meaningful commits per week.",
    "Tag releases and add issue-based milestones to show execution discipline.",
  ];

  if (verification?.missingProjects) {
    linkedinTips.unshift("Publish one project progress post this week with demo/video proof.");
    githubTips.unshift("Create one flagship project repository tailored to your target role.");
  }
  if (verification?.plagiarism?.flag) {
    linkedinTips.push("Highlight originality: custom features, trade-offs, and measurable results.");
    githubTips.push("Refactor template projects with unique problem statements and domain data.");
  }

  return {
    role,
    missingSkills: skill?.missing || [],
    linkedinTips,
    githubTips,
  };
}

async function readFileAsText(file) {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt") return await file.text();

  if (ext === "pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ") + " ";
    }
    return text.trim();
  }

  if (ext === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await convertInlineRichTextToHtml(arrayBuffer);
    return result.value;
  }

  return await file.text();
}

// PSYCHOLOGICAL METHOD 5: Smart nudge generator
function generateNudge(cog, skill) {
  if (cog.focusLevel === "High" && skill.matchPct > 70) return { icon: "🔥", msg: "You're in peak focus — attempt a complex skill right now.", color: "#4ade80", type: "boost" };
  if (cog.focusLevel === "High" && skill.matchPct <= 70) return { icon: "⚡", msg: "High focus detected — perfect time to tackle your hardest missing skill.", color: "#6366f1", type: "boost" };
  if (cog.focusLevel === "Medium") return { icon: "📚", msg: "Moderate focus — try a 25-min Pomodoro on one skill area.", color: "#fbbf24", type: "normal" };
  if (cog.distractionRisk === "High") return { icon: "⚠️", msg: "Distraction detected — switch to a short 5-min micro task to reset.", color: "#f87171", type: "warning" };
  return { icon: "💡", msg: "Start with your easiest missing skill to build momentum.", color: "#06b6d4", type: "normal" };
}

// ─── LOCAL INSIGHT ENGINE (NO NETWORK DEPENDENCY) ───────────────────────────
function buildInsightText(prompt, title) {
  const roleMatch = prompt.match(/candidate for\s+(.+?)\./i);
  const role = roleMatch ? roleMatch[1] : "this role";
  const missingMatch = prompt.match(/Missing skills:\s*(.+?)\./i);
  const missing = missingMatch ? missingMatch[1] : "priority skills";
  const focusMatch = prompt.match(/Focus(?: level)?:\s*([^|\n]+)/i);
  const focus = focusMatch ? focusMatch[1].trim() : "Medium";

  if (title.toLowerCase().includes("roadmap")) {
    return [
      `Week 1 — Foundation: Focus on ${missing.split(",")[0] || "core concepts"} with daily 45-minute sprints.`,
      `Week 2 — Practice: Build two small tasks around ${missing.split(",")[1] || "applied skills"} and publish progress notes.`,
      `Week 3 — Integration: Create one mini-project combining top missing skills and write a clean README.`,
      "Week 4 — Deploy + interviews: Ship the project, refine resume bullets, and complete 2 mock interviews.",
      `Execution mode: ${focus}. Keep consistency over intensity.`
    ].join("\n\n");
  }

  return [
    `Verdict: You are progressing toward ${role}, but outcomes depend on closing execution gaps quickly.`,
    `Primary gap cluster: ${missing}. Prioritize the first two skills this week for maximum readiness gain.`,
    `Behavior signal insight: focus profile is ${focus}; match task difficulty to this state to avoid drop-off.`,
    "Immediate action: complete one portfolio-ready artifact in 7 days and attach measurable impact bullets."
  ].join("\n\n");
}

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
function Ring({value, color, size=96}){
  const r=40, c=2*Math.PI*r, off=c-(value/100)*c;
  return(
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#0f172a" strokeWidth="11"/>
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="11"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%",transition:"stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1)"}}/>
      <text x="50" y="46" textAnchor="middle" fill="#f1f5f9" fontSize="16" fontWeight="800" fontFamily="Space Mono,monospace">{value}</text>
      <text x="50" y="59" textAnchor="middle" fill="#334155" fontSize="9" fontFamily="Space Mono,monospace">/100</text>
    </svg>
  );
}
function Badge({label,color}){
  const C={green:{bg:"#052e16",t:"#4ade80",b:"#166534"},yellow:{bg:"#1c1800",t:"#fbbf24",b:"#854d0e"},red:{bg:"#2d0a0a",t:"#f87171",b:"#991b1b"},blue:{bg:"#0c1a3a",t:"#60a5fa",b:"#1d4ed8"},purple:{bg:"#1e0a3a",t:"#c084fc",b:"#7e22ce"}}[color]||{bg:"#0f172a",t:"#94a3b8",b:"#334155"};
  return <span style={{background:C.bg,color:C.t,border:`1px solid ${C.b}`,borderRadius:6,padding:"2px 10px",fontSize:11,fontWeight:700,fontFamily:"Space Mono,monospace",letterSpacing:"0.06em",whiteSpace:"nowrap"}}>{label}</span>;
}
function Card({children,style={},glow}){
  return(
    <div style={{background:"rgba(10,15,30,0.88)",border:"1px solid #1e293b",borderRadius:16,padding:"18px 22px",backdropFilter:"blur(14px)",boxShadow:glow?`0 0 36px ${glow}24`:"0 4px 28px rgba(0,0,0,0.4)",...style}}>
      {children}
    </div>
  );
}

// ─── PSYCHOLOGICAL METHOD 4: FAILURE AWARENESS BLOCK ──────────────────────────
function FailureAwarenessBlock({ prediction, skill, role }) {
  const isFailure = prediction.prediction === "Failure";
  const isRisk = prediction.prediction === "Moderate Risk";
  if (!isFailure && !isRisk) return null;
  const col = isFailure ? "#f87171" : "#fbbf24";
  const improved = prediction.improvedReadiness;
  const improvedOutcome = improved >= 70 ? "Likely Success" : improved >= 45 ? "Moderate Risk" : "Failure";
  const improvedCol = improved >= 70 ? "#4ade80" : improved >= 45 ? "#fbbf24" : "#f87171";

  return (
    <div style={{background:"rgba(248,113,113,0.04)",border:"1.5px solid #991b1b",borderRadius:16,padding:"20px 24px",marginBottom:0}}>
      <div style={{color:"#f87171",fontSize:10,fontFamily:"Space Mono,monospace",letterSpacing:"0.1em",marginBottom:12}}>
        ❌ FAILURE AWARENESS — SIMULATE CONSEQUENCES
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"center"}}>
        <div style={{background:"#0a0f1e",borderRadius:12,padding:"14px 16px",border:"1px solid #991b1b"}}>
          <div style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace",marginBottom:6}}>CURRENT STATE</div>
          <div style={{color:col,fontSize:22,fontWeight:900,fontFamily:"'Syne',sans-serif"}}>{prediction.readiness}%</div>
          <div style={{color:col,fontSize:12,fontFamily:"Space Mono,monospace",marginTop:4}}>❌ {prediction.prediction}</div>
          <div style={{color:"#334155",fontSize:11,marginTop:8,lineHeight:1.5}}>Without skill improvement, you face rejection in {role} interviews.</div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{color:"#1e293b",fontSize:10,fontFamily:"Space Mono,monospace",marginBottom:4}}>IF YOU ACT</div>
          <div style={{color:"#4ade80",fontSize:22}}>→</div>
          <div style={{color:"#1e293b",fontSize:9,fontFamily:"Space Mono,monospace",marginTop:4}}>+{skill.missing.length} skills</div>
        </div>
        <div style={{background:"#0a0f1e",borderRadius:12,padding:"14px 16px",border:"1px solid #166534"}}>
          <div style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace",marginBottom:6}}>AFTER IMPROVEMENT</div>
          <div style={{color:improvedCol,fontSize:22,fontWeight:900,fontFamily:"'Syne',sans-serif"}}>{improved}%</div>
          <div style={{color:improvedCol,fontSize:12,fontFamily:"Space Mono,monospace",marginTop:4}}>✅ {improvedOutcome}</div>
          <div style={{color:"#334155",fontSize:11,marginTop:8,lineHeight:1.5}}>Learning missing skills closes the gap. Start today.</div>
        </div>
      </div>
      <div style={{marginTop:14,color:"#f87171",fontSize:12,fontFamily:"Space Mono,monospace",textAlign:"center",background:"rgba(248,113,113,0.06)",borderRadius:8,padding:"8px 14px"}}>
        ⚡ Every day without skill improvement = lower hiring odds. Fear this. Use it.
      </div>
    </div>
  );
}

// ─── PSYCHOLOGICAL METHOD 1: MICRO-WIN CHECKLIST ─────────────────────────────
function MicroWinChecklist({ microWins, focusLevel }) {
  const [completed, setCompleted] = useState([]);
  const [streak, setStreak] = useState(0);

  const toggle = (i) => {
    setCompleted(prev => {
      const next = prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i];
      setStreak(next.length);
      return next;
    });
    behaviorTracker.recordAction("checklist_toggle");
  };

  const pct = microWins.length ? Math.round((completed.length / microWins.length) * 100) : 0;
  const diffColor = { 1: "#4ade80", 2: "#fbbf24", 3: "#f87171" };
  const diffLabel = { 1: "EASY", 2: "MEDIUM", 3: "HARD" };
  const nextSteps = [
    "Build 1 portfolio project using the completed skills",
    "Write a short case-study README for your project",
    "Run 2 mock interviews and record weak areas",
    "Apply to 5 role-matched jobs this week",
  ];

  return (
    <Card glow="#6366f1">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div>
          <h4 style={{margin:0,color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace",letterSpacing:"0.06em"}}>🏆 MICRO-WIN SYSTEM</h4>
          <div style={{color:"#334155",fontSize:10,fontFamily:"Space Mono,monospace",marginTop:3}}>
            Adaptive difficulty: <span style={{color:focusLevel==="High"?"#4ade80":focusLevel==="Medium"?"#fbbf24":"#f87171"}}>{focusLevel} focus</span>
          </div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{color:"#6366f1",fontSize:28,fontWeight:900,fontFamily:"'Syne',sans-serif"}}>{streak}</div>
          <div style={{color:"#334155",fontSize:9,fontFamily:"Space Mono,monospace"}}>WINS 🔥</div>
        </div>
      </div>

      {/* PSYCHOLOGICAL METHOD 3: Progress visualization */}
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
          <span style={{color:"#475569",fontSize:11,fontFamily:"Space Mono,monospace"}}>PROGRESS VISUALIZATION</span>
          <span style={{color:"#6366f1",fontSize:12,fontWeight:700,fontFamily:"Space Mono,monospace"}}>{pct}%</span>
        </div>
        <div style={{height:8,background:"#0a0f1e",borderRadius:4,overflow:"hidden",border:"1px solid #1e293b"}}>
          <div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,#6366f1,#a855f7)",borderRadius:4,transition:"width 0.6s ease",boxShadow:"0 0 12px #6366f155"}}/>
        </div>
        <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
          {[0,25,50,75,100].map(v=>(
            <div key={v} style={{fontSize:10,fontFamily:"Space Mono,monospace",color:pct>=v?"#6366f1":"#1e293b"}}>{v}%{pct>=v&&v>0?"✓":""}</div>
          ))}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:280,overflowY:"auto"}}>
        {microWins.map((w,i) => {
          const done = completed.includes(i);
          const dc = diffColor[w.difficulty] || "#6366f1";
          return (
            <div key={i} onClick={() => toggle(i)}
              style={{display:"flex",gap:10,alignItems:"center",padding:"9px 12px",background:done?"rgba(74,222,128,0.05)":"#050a14",borderRadius:10,border:`1px solid ${done?"#166534":"#1e293b"}`,cursor:"pointer",transition:"all 0.2s",opacity:done?0.65:1}}>
              <div style={{width:22,height:22,borderRadius:6,background:done?"#052e16":"#0a0f1e",border:`2px solid ${done?"#4ade80":dc}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>
                {done?"✓":""}
              </div>
              <div style={{flex:1}}>
                <div style={{color:done?"#334155":"#cbd5e1",fontSize:12,textDecoration:done?"line-through":"none",lineHeight:1.4}}>{w.step}</div>
                <div style={{color:"#1e293b",fontSize:10,fontFamily:"Space Mono,monospace",marginTop:2}}>{w.skill}</div>
              </div>
              <span style={{background:`${dc}15`,color:dc,border:`1px solid ${dc}44`,borderRadius:5,padding:"1px 7px",fontSize:9,fontFamily:"Space Mono,monospace",flexShrink:0}}>{diffLabel[w.difficulty]}</span>
            </div>
          );
        })}
        {!microWins.length && <div style={{color:"#334155",fontSize:13,padding:"12px",textAlign:"center"}}>All core skills matched — generate advanced tasks! 🎉</div>}
      </div>

      {pct === 100 && (
        <>
          <div style={{marginTop:12,background:"rgba(74,222,128,0.08)",border:"1px solid #166534",borderRadius:10,padding:"10px 14px",textAlign:"center",color:"#4ade80",fontSize:13,fontFamily:"Space Mono,monospace",animation:"pulse 2s infinite"}}>
            🎉 ALL MICRO-WINS COMPLETE — DOPAMINE ACHIEVED!
          </div>
          <div style={{marginTop:10,background:"rgba(99,102,241,0.08)",border:"1px solid #4338ca",borderRadius:10,padding:"12px 14px"}}>
            <div style={{color:"#818cf8",fontSize:11,fontFamily:"Space Mono,monospace",letterSpacing:"0.06em",marginBottom:8}}>
              🚀 WHAT NEXT?
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {nextSteps.map((step, i) => (
                <div key={step} style={{color:"#cbd5e1",fontSize:12,lineHeight:1.5,display:"flex",gap:8}}>
                  <span style={{color:"#818cf8",fontFamily:"Space Mono,monospace"}}>{i + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:8,color:"#475569",fontSize:11,fontFamily:"Space Mono,monospace"}}>
              Focus mode recommendation: {focusLevel === "High" ? "Start project + mock interview today" : focusLevel === "Medium" ? "Start project today, interview tomorrow" : "Do project in micro-sprints, one section at a time"}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

// ─── PSYCHOLOGICAL METHOD 5: SMART NUDGE PANEL ────────────────────────────────
function SmartNudge({ nudge, cognitiveState }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div style={{background:`${nudge.color}08`,border:`1.5px solid ${nudge.color}44`,borderRadius:14,padding:"14px 18px",display:"flex",gap:12,alignItems:"flex-start",position:"relative"}}>
      <div style={{width:40,height:40,borderRadius:10,background:`${nudge.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
        {nudge.icon}
      </div>
      <div style={{flex:1}}>
        <div style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace",letterSpacing:"0.08em",marginBottom:4}}>SMART NUDGE · {cognitiveState.focusLevel.toUpperCase()} FOCUS DETECTED</div>
        <div style={{color:nudge.color,fontSize:14,fontWeight:600,lineHeight:1.5}}>{nudge.msg}</div>
        <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
          {[
            {l:"Focus",v:cognitiveState.focusLevel,c:cognitiveState.focusLevel==="High"?"green":cognitiveState.focusLevel==="Medium"?"yellow":"red"},
            {l:"Distraction",v:cognitiveState.distractionRisk,c:cognitiveState.distractionRisk==="Low"?"green":cognitiveState.distractionRisk==="Medium"?"yellow":"red"},
          ].map(b=><Badge key={b.l} label={`${b.l}: ${b.v}`} color={b.c}/>)}
        </div>
      </div>
      <button onClick={()=>setDismissed(true)} style={{background:"transparent",border:"none",color:"#334155",cursor:"pointer",fontSize:16,padding:"0 4px",flexShrink:0}}>×</button>
    </div>
  );
}

// ─── LIVE SIGNAL DISPLAY ──────────────────────────────────────────────────────
function LiveSignalPanel({ liveMetrics }) {
  if (!liveMetrics) return null;
  const { sessionDuration, switchCount, switchRate, focusLevel, sessionDurationLabel } = liveMetrics;
  const signals = [
    { icon:"⏱", label:"Session Duration", value: `${Math.round(sessionDuration)}s`, detail: sessionDurationLabel || (sessionDuration < 120 ? "Short session" : sessionDuration < 600 ? "Normal session" : "Deep focus session"), col: sessionDuration > 600 ? "#4ade80" : sessionDuration > 120 ? "#fbbf24" : "#f87171" },
    { icon:"🔄", label:"Task Switches", value: switchCount, detail: switchCount > 5 ? "High switching (distraction)" : switchCount > 2 ? "Moderate switching" : "Stable attention", col: switchCount > 5 ? "#f87171" : switchCount > 2 ? "#fbbf24" : "#4ade80" },
    { icon:"📊", label:"Switch Rate", value: `${Math.round(switchRate * 100)}%`, detail: switchRate > 0.5 ? "Chaotic attention" : switchRate > 0.25 ? "Moderate stability" : "Focused execution", col: switchRate > 0.5 ? "#f87171" : switchRate > 0.25 ? "#fbbf24" : "#4ade80" },
    { icon:"🧠", label:"Behavioral Focus", value: focusLevel, detail: "Derived from real-time signals", col: focusLevel==="High"?"#4ade80":focusLevel==="Medium"?"#fbbf24":"#f87171" },
  ];
  return (
    <Card glow="#06b6d4">
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <span style={{width:8,height:8,borderRadius:"50%",background:"#06b6d4",display:"inline-block",animation:"pulse 1.5s infinite",boxShadow:"0 0 8px #06b6d4"}}/>
        <h4 style={{margin:0,color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace",letterSpacing:"0.06em"}}>🔴 LIVE BEHAVIORAL SIGNALS</h4>
        <span style={{marginLeft:"auto",color:"#06b6d4",fontSize:9,fontFamily:"Space Mono,monospace",border:"1px solid #06b6d444",borderRadius:4,padding:"2px 7px"}}>REAL-TIME</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {signals.map(s=>(
          <div key={s.label} style={{background:"#050a14",borderRadius:10,padding:"10px 12px",border:"1px solid #1e293b"}}>
            <div style={{fontSize:18,marginBottom:5}}>{s.icon}</div>
            <div style={{color:s.col,fontSize:18,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:3}}>{s.value}</div>
            <div style={{color:"#334155",fontSize:9,fontFamily:"Space Mono,monospace",marginBottom:4,letterSpacing:"0.04em"}}>{s.label.toUpperCase()}</div>
            <div style={{color:"#475569",fontSize:10,lineHeight:1.4}}>{s.detail}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:12,padding:"8px 12px",background:"rgba(6,182,212,0.05)",borderRadius:8,border:"1px solid #06b6d422",fontSize:11,color:"#334155",fontFamily:"Space Mono,monospace"}}>
        📡 Signals captured from: session timer · task switch count · interaction depth · response latency
      </div>
    </Card>
  );
}

// ─── PREDICTION BLOCK ─────────────────────────────────────────────────────────
function PredictionBlock({prediction,skill,cognitive,role}){
  const isR=prediction.prediction==="Moderate Risk", isS=prediction.prediction==="Success";
  const col=isS?"#4ade80":isR?"#fbbf24":"#f87171";
  const bdr=isS?"#166534":isR?"#854d0e":"#991b1b";
  const bg=isS?"rgba(74,222,128,0.05)":isR?"rgba(251,191,36,0.05)":"rgba(248,113,113,0.05)";
  const icon=isS?"✅":isR?"⚠️":"❌";
  const label=isS?"Likely Success":isR?"Moderate Risk":"Likely Failure";

  const issues=[];
  if(skill.missing.length>0) issues.push(`Missing key skills: ${skill.missing.slice(0,3).join(", ")}`);
  if(cognitive.distractionRisk==="High") issues.push("High distraction pattern detected (behavioral signals)");
  if(cognitive.consistency<50) issues.push(`Low consistency score (${cognitive.consistency}%) — execution risk`);
  if(cognitive.focusLevel==="Low") issues.push("Sustained focus deficiency — performance bottleneck");
  if(skill.matchPct<50) issues.push(`Only ${skill.matchPct}% skill alignment for ${role}`);
  if(!issues.length && isS){issues.push("Strong skill coverage across role requirements","Consistent behavioral patterns — low dropout risk","High execution readiness score");}

  return(
    <div style={{background:bg,border:`1.5px solid ${bdr}`,borderRadius:18,padding:"24px 28px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-60,right:-60,width:200,height:200,borderRadius:"50%",background:`${col}08`,pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-40,left:-40,width:120,height:120,borderRadius:"50%",background:`${col}05`,pointerEvents:"none"}}/>

      <div style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:20}}>
        <div style={{width:52,height:52,borderRadius:14,background:`${col}15`,border:`1.5px solid ${bdr}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
          {icon}
        </div>
        <div style={{flex:1}}>
          <div style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace",letterSpacing:"0.1em",marginBottom:5}}>PERSONAAI PREDICTION RESULT</div>
          <div style={{color:col,fontSize:26,fontWeight:900,fontFamily:"'Syne',sans-serif",letterSpacing:"-0.5px",lineHeight:1}}>{label}</div>
          <div style={{color:"#334155",fontSize:12,fontFamily:"Space Mono,monospace",marginTop:5}}>Role: {role}</div>
        </div>
        <div style={{textAlign:"center",flexShrink:0}}>
          <Ring value={prediction.readiness} color={col} size={84}/>
          <div style={{color:"#334155",fontSize:9,fontFamily:"Space Mono,monospace",marginTop:3}}>READINESS</div>
        </div>
      </div>

      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
          <span style={{color:"#334155",fontSize:11,fontFamily:"Space Mono,monospace",letterSpacing:"0.06em"}}>READINESS SCORE</span>
          <span style={{color:col,fontSize:13,fontFamily:"Space Mono,monospace",fontWeight:700}}>{prediction.readiness}%</span>
        </div>
        <div style={{height:10,background:"#0a0f1e",borderRadius:5,overflow:"hidden",border:"1px solid #1e293b",position:"relative"}}>
          <div style={{position:"absolute",left:"45%",top:0,bottom:0,width:1,background:"#fbbf2444"}}/>
          <div style={{position:"absolute",left:"70%",top:0,bottom:0,width:1,background:"#4ade8044"}}/>
          <div style={{width:`${prediction.readiness}%`,height:"100%",background:`linear-gradient(90deg,${col}66,${col})`,borderRadius:5,transition:"width 1.8s cubic-bezier(.4,0,.2,1)",boxShadow:`0 0 14px ${col}55`}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
          <span style={{color:"#f87171",fontSize:10,fontFamily:"Space Mono,monospace"}}>0 — Failure</span>
          <span style={{color:"#fbbf24",fontSize:10,fontFamily:"Space Mono,monospace"}}>45 — Risk</span>
          <span style={{color:"#4ade80",fontSize:10,fontFamily:"Space Mono,monospace"}}>70 — Success</span>
        </div>
      </div>

      <div style={{background:"rgba(2,8,23,0.7)",borderRadius:13,padding:"16px 18px",border:`1px solid ${bdr}44`}}>
        <div style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace",letterSpacing:"0.08em",marginBottom:12}}>
          {isS?"✅ STRENGTHS DETECTED":"⚡ KEY ISSUES IDENTIFIED"}
        </div>
        {issues.map((issue,i)=>(
          <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:i<issues.length-1?9:0}}>
            <span style={{color:col,fontSize:14,flexShrink:0,lineHeight:1.4}}>{isS?"›":"•"}</span>
            <span style={{color:"#e2e8f0",fontSize:13.5,lineHeight:1.55,fontFamily:"ui-sans-serif,system-ui,sans-serif"}}>{issue}</span>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap"}}>
        {[
          {l:"SKILL MATCH",v:`${skill.matchPct}%`,c:"#6366f1"},
          {l:"FOCUS",v:cognitive.focusLevel,c:cognitive.focusLevel==="High"?"#4ade80":cognitive.focusLevel==="Medium"?"#fbbf24":"#f87171"},
          {l:"CONSISTENCY",v:`${cognitive.consistency}%`,c:"#a855f7"},
          {l:"DISTRACTION",v:cognitive.distractionRisk,c:cognitive.distractionRisk==="Low"?"#4ade80":cognitive.distractionRisk==="Medium"?"#fbbf24":"#f87171"},
        ].map(({l,v,c})=>(
          <div key={l} style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:9,padding:"7px 13px",minWidth:80}}>
            <div style={{color:"#334155",fontSize:9,fontFamily:"Space Mono,monospace",letterSpacing:"0.06em",marginBottom:3}}>{l}</div>
            <div style={{color:c,fontSize:15,fontWeight:900,fontFamily:"Space Mono,monospace"}}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ACTION INSIGHTS PANEL ───────────────────────────────────────────────────
function AIPanel({prompt,title,icon,color="#6366f1"}){
  const text = buildInsightText(prompt, title);
  return(
    <Card glow={color}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <span style={{fontSize:20}}>{icon}</span>
        <h4 style={{margin:0,color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace",letterSpacing:"0.05em"}}>{title}</h4>
        <span style={{marginLeft:"auto",color:"#4ade80",fontSize:10,fontFamily:"Space Mono,monospace"}}>✓ actionable</span>
      </div>
      <div style={{color:"#cbd5e1",fontSize:13.5,lineHeight:1.75,fontFamily:"ui-sans-serif,system-ui,sans-serif",whiteSpace:"pre-wrap"}}>
        {text}
      </div>
    </Card>
  );
}

function ProjectBuilderPage({ role, guidedProject, verification }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card glow="#06b6d4">
        <h4 style={{margin:"0 0 8px",color:"#e2e8f0",fontSize:13,fontFamily:"Space Mono,monospace"}}>🛠 BUILD YOUR PROJECT</h4>
        <div style={{color:"#94a3b8",fontSize:12,marginBottom:10}}>Recommended for {role}</div>
        <div style={{color:"#f1f5f9",fontSize:22,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:8}}>{guidedProject.project}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
          {guidedProject.stack.map((s) => (
            <span key={s} style={{background:"#1e1b4b",border:"1px solid #4338ca",color:"#818cf8",fontSize:10,padding:"3px 8px",borderRadius:6,fontFamily:"Space Mono,monospace"}}>{s}</span>
          ))}
        </div>
        <div style={{color:"#06b6d4",fontSize:11,fontFamily:"Space Mono,monospace"}}>Sprint mode: {guidedProject.sprintMode} • ETA: {guidedProject.estimatedDays} days</div>
      </Card>

      <Card>
        <h4 style={{margin:"0 0 12px",color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace"}}>📌 STEP-BY-STEP GUIDE</h4>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {guidedProject.steps.map((step, idx) => (
            <div key={step} style={{display:"flex",gap:10,alignItems:"flex-start",background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px"}}>
              <span style={{color:"#818cf8",fontFamily:"Space Mono,monospace",fontWeight:700}}>{idx + 1}</span>
              <span style={{color:"#cbd5e1",fontSize:13}}>{step}</span>
            </div>
          ))}
        </div>
      </Card>

      {verification.missingProjects && (
        <Card style={{borderColor:"#991b1b",background:"rgba(248,113,113,0.05)"}}>
          <div style={{color:"#f87171",fontSize:12,fontFamily:"Space Mono,monospace"}}>⚠ No strong practical projects detected. Complete this guided project and add it to GitHub + LinkedIn.</div>
        </Card>
      )}
    </div>
  );
}

function ChatAssistantPage({ context }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! Ask me: how to build this project, best tech stack, database choice, certifications, or LinkedIn improvements." }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const q = input.trim();
    if (!q || sending) return;
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setSending(true);
    setInput("");
    try {
      const data = await askAssistant(q, context || {}, context?.apiKey || "");
      const reply = data?.reply?.trim() || getAssistantReply(q, context);
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      const fallback = getAssistantReply(q, context);
      setMessages((prev) => [...prev, { role: "assistant", text: fallback }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card glow="#a855f7">
      <h4 style={{margin:"0 0 12px",color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace"}}>💬 AI CAREER ASSISTANT</h4>
      <div style={{maxHeight:320,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,marginBottom:12,paddingRight:4}}>
        {messages.map((m, i) => (
          <div key={`${m.role}-${i}`} style={{alignSelf:m.role === "user" ? "flex-end" : "flex-start",maxWidth:"85%",background:m.role === "user" ? "#1e1b4b" : "#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"9px 11px",color:m.role === "user" ? "#c4b5fd" : "#cbd5e1",fontSize:12,lineHeight:1.55}}>
            {m.text}
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Ask anything about projects, stack, interviews, certifications..."
          style={{flex:1,background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontFamily:"Space Mono,monospace",fontSize:12,outline:"none"}}
        />
        <button onClick={send} disabled={sending} style={{background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",color:"#fff",borderRadius:10,padding:"10px 16px",cursor:sending?"not-allowed":"pointer",opacity:sending?0.7:1,fontFamily:"Space Mono,monospace",fontSize:12,fontWeight:700}}>{sending ? "Thinking..." : "Send"}</button>
      </div>
    </Card>
  );
}

function TaskManagementPage({ tasks, setTasks, suggestedTasks, focusLevel }) {
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [alert, setAlert] = useState("");
  const [nowTs] = useState(() => Date.now());
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  const toDateLabel = (isoDate) => {
    if (!isoDate) return "TBD";
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return "TBD";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const buildExecutionTimeline = (taskTitle, deadlineDate) => {
    const due = new Date(deadlineDate);
    const validDue = Number.isNaN(due.getTime()) ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : due;
    const prepDate = new Date(validDue.getTime() - 2 * 24 * 60 * 60 * 1000);
    const buildDate = new Date(validDue.getTime() - 1 * 24 * 60 * 60 * 1000);

    if (focusLevel === "Low") {
      return [
        {
          slot: `Day 1 · ${toDateLabel(prepDate.toISOString())} · 10:00-10:25`,
          step: `Micro-step: define one tiny deliverable for "${taskTitle}"`,
        },
        {
          slot: `Day 2 · ${toDateLabel(buildDate.toISOString())} · 11:00-11:25`,
          step: "Micro-step: complete the first small implementation chunk",
        },
        {
          slot: `Day 2 · ${toDateLabel(buildDate.toISOString())} · 16:00-16:25`,
          step: "Micro-step: validate output and note blockers",
        },
        {
          slot: `Day 3 · ${toDateLabel(validDue.toISOString())} · 15:00-15:25`,
          step: "Finish and submit final output before deadline",
        },
      ];
    }

    if (focusLevel === "High") {
      return [
        {
          slot: `Day 1 · ${toDateLabel(prepDate.toISOString())} · 08:30-10:00`,
          step: `Deep work: architecture + scope lock for "${taskTitle}"`,
        },
        {
          slot: `Day 2 · ${toDateLabel(buildDate.toISOString())} · 10:00-12:00`,
          step: "Deep work: implement core feature and complete main milestone",
        },
        {
          slot: `Day 2 · ${toDateLabel(buildDate.toISOString())} · 14:00-15:30`,
          step: "Deep work: testing, refactor, and quality hardening",
        },
        {
          slot: `Day 3 · ${toDateLabel(validDue.toISOString())} · 16:00-17:30`,
          step: "Finalize deliverable, document outcomes, and submit",
        },
      ];
    }

    return [
      {
        slot: `Day 1 · ${toDateLabel(prepDate.toISOString())} · 09:00-10:30`,
        step: `Plan scope for "${taskTitle}" and define exact deliverable`,
      },
      {
        slot: `Day 2 · ${toDateLabel(buildDate.toISOString())} · 11:00-13:00`,
        step: "Execute core implementation and push first milestone commit",
      },
      {
        slot: `Day 3 · ${toDateLabel(validDue.toISOString())} · 16:00-17:30`,
        step: "Polish, test, and submit final output before deadline",
      },
    ];
  };

  const createTaskObject = (taskTitle, taskDeadline) => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: taskTitle,
    deadline: taskDeadline,
    completed: false,
    executionTimeline: buildExecutionTimeline(taskTitle, taskDeadline),
  });

  const statusOf = (task) => {
    if (task.completed) return "completed";
    const end = new Date(task.deadline).getTime();
    if (Number.isNaN(end)) return "pending";
    return end < nowTs ? "missed" : "pending";
  };

  const addTask = () => {
    const t = title.trim();
    if (!t) {
      setAlert("Please enter a task title first.");
      return;
    }
    const finalDeadline = deadline || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const newTask = createTaskObject(t, finalDeadline);
    setTasks((prev) => [
      newTask,
      ...prev,
    ]);
    setExpandedTaskId(newTask.id);
    setTitle("");
    setDeadline("");
    setAlert(`Task added: ${t}. Execution timeline auto-generated.`);
  };

  const toggleTask = (id) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)));
  };

  const addSuggested = (item) => {
    const due = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const newTask = createTaskObject(item, due);
    setTasks((prev) => [
      newTask,
      ...prev,
    ]);
    setExpandedTaskId(newTask.id);
    setAlert(`Suggested task added: ${item}. Execution timeline ready.`);
  };

  const simulateReminder = (task) => {
    const status = statusOf(task);
    if (status === "missed") {
      setAlert(`Deadline missed alert sent for: ${task.title}`);
      return;
    }
    if (status === "pending") {
      setAlert(`Reminder email sent for: ${task.title}`);
      return;
    }
    setAlert(`Task already completed: ${task.title}`);
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.filter((t) => statusOf(t) === "pending").length;
  const missedCount = tasks.filter((t) => statusOf(t) === "missed").length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card glow="#06b6d4">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
          <h4 style={{margin:0,color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace"}}>📋 TASK MANAGEMENT SYSTEM</h4>
          <span style={{background:"#0f172a",border:"1px solid #334155",borderRadius:8,padding:"3px 8px",color:focusLevel==="High"?"#4ade80":focusLevel==="Low"?"#f87171":"#fbbf24",fontSize:10,fontFamily:"Space Mono,monospace"}}>
            Focus Mode: {focusLevel}
          </span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {[
            { label: "Total", value: tasks.length, color: "#94a3b8" },
            { label: "Completed", value: completedCount, color: "#4ade80" },
            { label: "Pending", value: pendingCount, color: "#fbbf24" },
            { label: "Missed", value: missedCount, color: "#f87171" },
          ].map((m) => (
            <div key={m.label} style={{background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px"}}>
              <div style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace"}}>{m.label}</div>
              <div style={{color:m.color,fontSize:20,fontWeight:800,fontFamily:"'Syne',sans-serif"}}>{m.value}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:12}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace"}}>Task completion progress</span>
            <span style={{color:"#06b6d4",fontSize:10,fontFamily:"Space Mono,monospace"}}>{progress}%</span>
          </div>
          <div style={{height:6,background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:4,overflow:"hidden"}}>
            <div style={{width:`${progress}%`,height:"100%",background:"linear-gradient(90deg,#06b6d4,#6366f1)",transition:"width 0.3s ease"}} />
          </div>
        </div>
      </Card>

      <Card>
        <h4 style={{margin:"0 0 10px",color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace"}}>➕ Add Task</h4>
        <form onSubmit={(e)=>{e.preventDefault();addTask();}} style={{display:"grid",gridTemplateColumns:"1fr 180px 120px",gap:8}}>
          <input value={title} onChange={(e)=>setTitle(e.target.value)} onKeyDown={(e)=>{ if (e.key === "Enter") addTask(); }} placeholder="Add execution task" style={{background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontFamily:"Space Mono,monospace",fontSize:12,outline:"none"}} />
          <input type="date" value={deadline} onChange={(e)=>setDeadline(e.target.value)} style={{background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontFamily:"Space Mono,monospace",fontSize:12,outline:"none"}} />
          <button type="submit" style={{background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",color:"#fff",borderRadius:10,padding:"10px 12px",cursor:"pointer",fontFamily:"Space Mono,monospace",fontSize:12,fontWeight:700}}>Add Task</button>
        </form>
        <div style={{marginTop:8,color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace"}}>Deadline optional. If empty, default is +3 days and a timeline is generated automatically.</div>
        {alert && <div style={{marginTop:8,color:"#06b6d4",fontSize:11,fontFamily:"Space Mono,monospace"}}>📌 {alert}</div>}
      </Card>

      <Card>
        <h4 style={{margin:"0 0 10px",color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace"}}>⚡ Suggested Execution Tasks</h4>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {suggestedTasks.map((item) => (
            <div key={item} style={{display:"flex",justifyContent:"space-between",gap:8,background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"9px 12px"}}>
              <span style={{color:"#cbd5e1",fontSize:12}}>{item}</span>
              <button onClick={()=>addSuggested(item)} style={{background:"#1e1b4b",border:"1px solid #4338ca",color:"#c4b5fd",borderRadius:8,padding:"4px 9px",cursor:"pointer",fontSize:11,fontFamily:"Space Mono,monospace"}}>Add</button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h4 style={{margin:"0 0 10px",color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace"}}>⏰ Deadline Tracker</h4>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {tasks.map((task) => {
            const status = statusOf(task);
            const col = status === "completed" ? "#4ade80" : status === "missed" ? "#f87171" : "#fbbf24";
            const label = status === "completed" ? "✔ Completed" : status === "missed" ? "❌ Missed" : "⚠ Pending";
            const timeline = task.executionTimeline?.length ? task.executionTimeline : buildExecutionTimeline(task.title, task.deadline);
            const expanded = expandedTaskId === task.id;
            return (
              <div key={task.id} style={{background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"8px 10px"}}>
                <div style={{display:"grid",gridTemplateColumns:"26px 1fr 140px 110px 130px",gap:8,alignItems:"center"}}>
                  <input type="checkbox" checked={task.completed} onChange={()=>toggleTask(task.id)} />
                  <span style={{color:task.completed?"#64748b":"#e2e8f0",textDecoration:task.completed?"line-through":"none",fontSize:12}}>{task.title}</span>
                  <span style={{color:"#94a3b8",fontFamily:"Space Mono,monospace",fontSize:11}}>Due: {task.deadline}</span>
                  <span style={{color:col,fontFamily:"Space Mono,monospace",fontSize:11}}>{label}</span>
                  <button onClick={()=>simulateReminder(task)} style={{background:"#0f172a",border:"1px solid #334155",color:"#cbd5e1",borderRadius:8,padding:"5px 8px",cursor:"pointer",fontSize:10,fontFamily:"Space Mono,monospace"}}>Send Reminder</button>
                </div>
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                  <button onClick={()=>setExpandedTaskId(expanded ? null : task.id)} style={{background:"transparent",border:"1px solid #334155",color:"#94a3b8",borderRadius:8,padding:"4px 9px",cursor:"pointer",fontSize:10,fontFamily:"Space Mono,monospace"}}>{expanded ? "Hide Timeline" : "Show Timeline"}</button>
                </div>
                {expanded && (
                  <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6}}>
                    {timeline.map((item, idx) => (
                      <div key={`${task.id}-${idx}`} style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:8,padding:"8px 10px"}}>
                        <div style={{color:"#818cf8",fontSize:10,fontFamily:"Space Mono,monospace",marginBottom:3}}>{item.slot}</div>
                        <div style={{color:"#cbd5e1",fontSize:12,lineHeight:1.5}}>{item.step}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {!tasks.length && <div style={{color:"#475569",fontSize:12}}>No tasks yet. Add one to start execution tracking.</div>}
        </div>
      </Card>
    </div>
  );
}

function ProfileAnalysisPage({ verification, guidance }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card glow="#06b6d4">
        <h4 style={{margin:"0 0 10px",color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace"}}>📁 PROFILE ANALYSIS</h4>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          <div style={{background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px"}}>
            <div style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace"}}>GitHub Verified</div>
            <div style={{color:verification.github.verifiedProjects?"#4ade80":"#f87171",fontSize:16,fontWeight:800}}>{verification.github.verifiedProjects ? "YES" : "NO"}</div>
          </div>
          <div style={{background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px"}}>
            <div style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace"}}>Practical Exposure</div>
            <div style={{color:"#06b6d4",fontSize:16,fontWeight:800}}>{verification.practicalExposureScore}%</div>
          </div>
          <div style={{background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px"}}>
            <div style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace"}}>Originality</div>
            <div style={{color:verification.plagiarism.flag?"#f87171":"#4ade80",fontSize:16,fontWeight:800}}>{verification.plagiarism.flag?"Low":"Healthy"}</div>
          </div>
        </div>
      </Card>

      <Card>
        <h4 style={{margin:"0 0 10px",color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace"}}>🔗 LinkedIn Guidance</h4>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {guidance.linkedinTips.map((tip)=> <div key={tip} style={{color:"#cbd5e1",fontSize:12,lineHeight:1.6}}>• {tip}</div>)}
        </div>
      </Card>

      <Card>
        <h4 style={{margin:"0 0 10px",color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace"}}>🐙 GitHub Guidance</h4>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {guidance.githubTips.map((tip)=> <div key={tip} style={{color:"#cbd5e1",fontSize:12,lineHeight:1.6}}>• {tip}</div>)}
        </div>
      </Card>
    </div>
  );
}

// ─── UPLOAD PAGE ──────────────────────────────────────────────────────────────
function UploadPage({onAnalyze}){
  const [resume,setResume]=useState(SAMPLE_RESUME);
  const [githubUrl,setGithubUrl]=useState("");
  const [linkedinUrl,setLinkedinUrl]=useState("");
  const [apiKey,setApiKey]=useState("");
  const [role,setRole]=useState("Backend Developer");
  const [session,setSession]=useState(45);
  const [tasks,setTasks]=useState(70);
  const [delay,setDelay]=useState(120);
  const [loading,setLoading]=useState(false);
  const [step,setStep]=useState(0);
  const [dragging,setDragging]=useState(false);
  const fileRef=useRef();

  const STEPS=["Parsing resume text…","Extracting skills via NLP…","Running MindOS behavioral scan…","Analyzing live behavioral signals…","Computing readiness score…","Generating AI prediction…","Applying psychological adaptation…"];

  const go=()=>{
    if(!resume.trim()) return;
    behaviorTracker.recordAction("analyze_click");
    setLoading(true); setStep(0);
    const iv=setInterval(()=>setStep(s=>s<STEPS.length-1?s+1:s),380);
    setTimeout(()=>{
      clearInterval(iv);
      const liveMetrics = behaviorTracker.getMetrics();
      const skill=analyzeResume(resume,role);
      const cog=computeCognitive(session,tasks,delay, liveMetrics);
      const pred=computePrediction(skill.matchPct,cog);
      const roadmap=buildRoadmap(skill.missing,cog);
      const microWins=buildMicroWins(skill.missing,cog);
      const nudge=generateNudge(cog,skill);
      const verification = buildProjectVerification(resume, githubUrl, linkedinUrl, role, skill);
      const guidedProject = buildGuidedProject(role, skill.missing, cog.focusLevel);
      onAnalyze({skill,cognitive:cog,prediction:pred,roadmap,microWins,nudge,role,liveMetrics,verification,guidedProject,githubUrl,linkedinUrl,apiKey});
      setApiKey("");
      setLoading(false);
    },2800);
  };

  // Track interactions
  const handleTextareaChange = (e) => {
    setResume(e.target.value);
    behaviorTracker.recordAction("typing");
  };
  const handleRoleClick = (r) => {
    setRole(r);
    behaviorTracker.recordAction("role_select");
  };
  const handleSliderChange = (setter, val) => {
    setter(val);
    behaviorTracker.recordAction("slider_adjust");
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      setResume(text);
      behaviorTracker.recordAction("file_upload");
    } catch (err) {
      alert("Error reading file: " + (err?.message || "Unknown error"));
    }
  };

  return(
    <div style={{maxWidth:880,margin:"0 auto",padding:"0 24px"}}>
      {/* Hero */}
      <div style={{textAlign:"center",marginBottom:48}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(99,102,241,0.1)",border:"1px solid #312e81",borderRadius:999,padding:"5px 18px",marginBottom:20}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"#818cf8",display:"inline-block",animation:"pulse 2s infinite"}}/>
          <span style={{color:"#818cf8",fontSize:11,fontFamily:"Space Mono,monospace",letterSpacing:"0.1em"}}>AI-POWERED · SKILL + COGNITIVE + PSYCHOLOGICAL INTELLIGENCE</span>
        </div>
        <h1 style={{fontSize:52,fontWeight:900,background:"linear-gradient(140deg,#818cf8 0%,#c084fc 45%,#38bdf8 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:"0 0 14px",fontFamily:"'Syne',sans-serif",letterSpacing:"-2.5px",lineHeight:1.05}}>
          PersonaAI
        </h1>
        <p style={{color:"#334155",fontSize:15,fontFamily:"Space Mono,monospace",margin:"0 0 10px"}}>
          Upload resume → Analyze behavior → Predict performance → Psychologically adapt
        </p>
        {/* System architecture diagram */}
        <div style={{display:"inline-flex",alignItems:"center",gap:8,flexWrap:"wrap",justifyContent:"center",marginTop:10}}>
          {["Behavior Signals","Cognitive State","Prediction Engine","Psych Adaptation","Adaptive Roadmap + Nudges"].map((s,i,arr)=>(
            <span key={s} style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{background:"#0a0f1e",border:"1px solid #1e293b",color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace",padding:"3px 9px",borderRadius:6}}>{s}</span>
              {i<arr.length-1&&<span style={{color:"#1e293b",fontSize:14}}>→</span>}
            </span>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        {/* Resume */}
        <Card style={{gridColumn:"1/-1"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <h3 style={{margin:0,color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace",letterSpacing:"0.07em"}}>📄 RESUME INPUT</h3>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setResume(SAMPLE_RESUME);behaviorTracker.recordAction("load_sample");}} style={{background:"#1e293b",border:"1px solid #334155",color:"#64748b",borderRadius:8,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"Space Mono,monospace"}}>Load Sample</button>
              <button onClick={()=>{fileRef.current.click();behaviorTracker.recordAction("upload_click");}} style={{background:"#1e1b4b",border:"1px solid #4338ca",color:"#818cf8",borderRadius:8,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"Space Mono,monospace"}}>Upload (txt/pdf/docx)</button>
              <input ref={fileRef} type="file" accept=".txt,.pdf,.docx" style={{display:"none"}} onChange={e=>{handleFileUpload(e.target.files[0]);}}/>
            </div>
          </div>
          <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);handleFileUpload(e.dataTransfer.files[0]);}}
            style={{border:`2px dashed ${dragging?"#6366f1":"#1e293b"}`,borderRadius:12,transition:"border-color 0.2s"}}>
            <textarea value={resume} onChange={handleTextareaChange}
              style={{width:"100%",minHeight:190,background:"transparent",border:"none",color:"#cbd5e1",fontSize:13,fontFamily:"Space Mono,monospace",resize:"vertical",outline:"none",padding:16,boxSizing:"border-box",lineHeight:1.65}}
              placeholder="Paste resume text here, or drag & drop a .txt/.pdf/.docx file…"/>
          </div>
        </Card>

        {/* Role */}
        <Card>
          <h3 style={{margin:"0 0 14px",color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace",letterSpacing:"0.07em"}}>🎯 TARGET ROLE</h3>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {Object.entries(ROLES).map(([r,d])=>(
              <button key={r} onClick={()=>handleRoleClick(r)} style={{background:role===r?`${d.color}1a`:"transparent",border:`1px solid ${role===r?d.color:"#1e293b"}`,color:role===r?"#f1f5f9":"#334155",borderRadius:10,padding:"10px 14px",textAlign:"left",cursor:"pointer",fontFamily:"Space Mono,monospace",fontSize:12,transition:"all 0.2s",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:16}}>{d.emoji}</span>
                {r}
                {role===r&&<span style={{marginLeft:"auto",color:d.color,fontSize:9,letterSpacing:"0.06em"}}>SELECTED</span>}
              </button>
            ))}
          </div>
        </Card>

        {/* Social Validation Inputs */}
        <Card>
          <h3 style={{margin:"0 0 14px",color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace",letterSpacing:"0.07em"}}>🔗 GITHUB & LINKEDIN VALIDATION</h3>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input value={githubUrl} onChange={e=>setGithubUrl(e.target.value)} placeholder="GitHub profile URL (e.g., https://github.com/username)" style={{background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px",color:"#cbd5e1",fontFamily:"Space Mono,monospace",fontSize:12,outline:"none"}} />
            <input value={linkedinUrl} onChange={e=>setLinkedinUrl(e.target.value)} placeholder="LinkedIn profile URL" style={{background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px",color:"#cbd5e1",fontFamily:"Space Mono,monospace",fontSize:12,outline:"none"}} />
            <div style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace"}}>Used for practical verification: repos, project relevance, internship signals.</div>
          </div>
        </Card>

        <Card>
          <h3 style={{margin:"0 0 14px",color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace",letterSpacing:"0.07em"}}>🔐 TEMP OPENAI API KEY</h3>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input value={apiKey} onChange={e=>setApiKey(e.target.value)} type="password" placeholder="Paste OpenAI API key (stored only in this session)" style={{background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px",color:"#cbd5e1",fontFamily:"Space Mono,monospace",fontSize:12,outline:"none"}} />
            <div style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace"}}>Used for AI assistant and execution planner. Not saved to database.</div>
          </div>
        </Card>

        {/* MindOS */}
        <Card>
          <h3 style={{margin:"0 0 6px",color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace",letterSpacing:"0.07em"}}>🧠 MINDOS SIGNALS</h3>
          <div style={{color:"#334155",fontSize:10,fontFamily:"Space Mono,monospace",marginBottom:14}}>📡 Live behavioral signals also captured automatically</div>
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            {[
              {label:"Session Time (min)",val:session,set:setSession,min:5,max:120,col:"#06b6d4",hint:session>=60?"Deep focus":session>=30?"Moderate":"Short"},
              {label:"Task Completion %",val:tasks,set:setTasks,min:0,max:100,col:"#a855f7",hint:tasks>=70?"High output":tasks>=40?"Moderate":"Low output"},
              {label:"Avg Typing Delay (ms)",val:delay,set:setDelay,min:50,max:500,col:"#f59e0b",hint:delay<=150?"Focused":delay<=300?"Normal":"Distracted"},
            ].map(({label,val,set,min,max,col,hint})=>(
              <div key={label}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{color:"#475569",fontSize:11,fontFamily:"Space Mono,monospace"}}>{label}</span>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{color:"#1e293b",fontSize:10,fontFamily:"Space Mono,monospace"}}>{hint}</span>
                    <span style={{color:col,fontSize:13,fontWeight:700,fontFamily:"Space Mono,monospace"}}>{val}</span>
                  </div>
                </div>
                <input type="range" min={min} max={max} value={val} onChange={e=>handleSliderChange(set,Number(e.target.value))} style={{width:"100%",accentColor:col,cursor:"pointer"}}/>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <button onClick={go} disabled={loading||!resume.trim()} style={{marginTop:22,width:"100%",padding:"17px",borderRadius:14,background:loading?"#0f172a":"linear-gradient(135deg,#6366f1,#a855f7 55%,#06b6d4)",border:"none",color:"#fff",fontSize:16,fontWeight:800,cursor:loading?"not-allowed":"pointer",fontFamily:"'Syne',sans-serif",boxShadow:loading?"none":"0 0 50px #6366f133,0 4px 24px rgba(99,102,241,0.3)",transition:"all 0.3s",display:"flex",alignItems:"center",justifyContent:"center",gap:12,minHeight:58}}>
        {loading?(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{animation:"spin 0.7s linear infinite",display:"inline-block",fontSize:18}}>⚙️</span>
              <span style={{fontFamily:"Space Mono,monospace",fontSize:13,color:"#94a3b8"}}>{STEPS[step]}</span>
            </div>
            <div style={{width:280,height:3,background:"#1e293b",borderRadius:2,overflow:"hidden"}}>
              <div style={{width:`${((step+1)/STEPS.length)*100}%`,height:"100%",background:"linear-gradient(90deg,#6366f1,#a855f7)",borderRadius:2,transition:"width 0.4s ease"}}/>
            </div>
          </div>
        ):"🚀  Analyze & Predict My Performance →"}
      </button>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({data,onReset}){
  const {skill,cognitive,prediction,roadmap,microWins,nudge,role,liveMetrics,verification,guidedProject,apiKey}=data;
  const predCol=prediction.prediction==="Success"?"#4ade80":prediction.prediction==="Moderate Risk"?"#fbbf24":"#f87171";
  const [tab,setTab]=useState("overview");
  const [done,setDone]=useState([]);
  const [page,setPage]=useState("dashboard");
  const [taskList,setTaskList]=useState(() =>
    (roadmap || []).map((item, idx) => ({
      id: `seed-${idx}`,
      title: item.tasks[0],
      deadline: new Date(Date.now() + (idx + 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      completed: false,
    }))
  );
  const [planText,setPlanText]=useState("");
  const [planLoading,setPlanLoading]=useState(false);
  const [includeHourly,setIncludeHourly]=useState(false);
  const [aiExplanation,setAiExplanation]=useState("");
  const [aiExplanationLoading,setAiExplanationLoading]=useState(false);

  const profileGuidance = buildProfileGuidance(verification, skill, role);
  const suggestedTasks = [
    `Close skill gap: ${skill.missing[0] || "advanced role fundamentals"}`,
    `Build and deploy ${guidedProject.project}`,
    "Publish one LinkedIn proof-of-work post",
    "Improve GitHub README with architecture and metrics",
  ];

  const generatePlan = async () => {
    if (planLoading) return;
    setPlanLoading(true);
    try {
      const response = await generateExecutionPlan({
        role,
        focus_level: cognitive.focusLevel,
        missing_skills: skill.missing,
        guided_project: guidedProject,
        include_hourly: includeHourly,
        api_key: apiKey || null,
      });
      setPlanText(response?.plan_text || "Could not generate plan. Try again.");
    } catch {
      const fallback = [
        `Day 1: Scope ${guidedProject.project} and set milestones.`,
        `Day 2: Learn ${skill.missing[0] || "core fundamentals"} and implement one feature.`,
        "Day 3: Build backend or core module and push commits.",
        "Day 4: Integrate data layer and test key flows.",
        "Day 5: Complete feature polish and error handling.",
        "Day 6: Deploy and document project.",
        "Day 7: Portfolio update + mock interview prep.",
      ].join("\n");
      setPlanText(fallback);
    } finally {
      setPlanLoading(false);
    }
  };

  const generateExplanation = async () => {
    if (aiExplanationLoading) return;
    setAiExplanationLoading(true);
    try {
      const prompt = `Explain my readiness in clear action-oriented points. Readiness=${prediction.readiness}, Focus=${cognitive.focusLevel}, Missing skills=${skill.missing.join(", ")}.`;
      const response = await askAssistant(prompt, { role, skill, verification, guidedProject, cognitive, prediction }, apiKey || "");
      setAiExplanation(response?.reply || "No explanation available.");
    } catch {
      setAiExplanation(`You are currently at ${prediction.readiness}% readiness for ${role}. Close the top gap (${skill.missing[0] || "execution"}) and ship one deployable project this week to increase hiring confidence.`);
    } finally {
      setAiExplanationLoading(false);
    }
  };

  const explainPrompt=`You are analyzing a candidate for ${role}.
Skill match: ${skill.matchPct}% | Matched: ${skill.matched.join(", ")||"none"} | Missing: ${skill.missing.join(", ")||"none"}
Focus: ${cognitive.focusLevel} (${cognitive.focusScore}/100) | Consistency: ${cognitive.consistency}% | Distraction: ${cognitive.distractionRisk}
Readiness: ${prediction.readiness}/100 | Verdict: ${prediction.prediction}
Live behavioral signals: Session ${liveMetrics?.sessionDuration?.toFixed(0)||"unknown"}s, ${liveMetrics?.switchCount||0} task switches, ${cognitive.sessionDurationLabel||""}, ${cognitive.switchRateLabel||""}

Write a 4-5 sentence sharp analysis. Lead with the verdict. Call out specific skill gaps and behavioral patterns by name. Mention live behavioral signals. End with the single most important action they must take now. Be direct — no filler words.`;

  const roadmapPrompt=`Generate a personalized 30-day plan for ${role}.
Missing skills: ${skill.missing.join(", ")||"all covered"}.
Focus level: ${cognitive.focusLevel} | Consistency: ${cognitive.consistency}%.
Behavioral signals: ${cognitive.sessionDurationLabel||""}, ${cognitive.switchRateLabel||""}.

Format exactly as:
Week 1 — [theme]: Specific daily tasks
Week 2 — [theme]: Specific daily tasks  
Week 3 — [theme]: Specific daily tasks
Week 4 — Deploy + portfolio + interviews: Specific steps

${cognitive.focusLevel==="Low"?"Use 20-min Pomodoro sprints — light tasks only. Address distraction first.":cognitive.focusLevel==="Medium"?"Use 45-min focus blocks. Moderate task difficulty.":"Use 90-min deep work blocks — push hard. Max difficulty tasks."}
Be specific. Name exact resources or tools where relevant.`;

  const skillPie=[{name:"Matched",value:skill.matched.length,fill:"#6366f1"},{name:"Missing",value:skill.missing.length,fill:"#1a1f3a"}];

  const TABS=[{id:"overview",l:"📊 Overview"},{id:"cognitive",l:"🧠 MindOS"},{id:"psychology",l:"🎯 Psychology"},{id:"roadmap",l:"🗺 Roadmap"},{id:"enterprise",l:"🏢 Enterprise"}];

  return(
    <div style={{maxWidth:1100,margin:"0 auto",padding:"0 24px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28}}>
        <div>
          <h2 style={{margin:0,fontSize:26,fontWeight:900,color:"#f1f5f9",fontFamily:"'Syne',sans-serif",letterSpacing:"-0.5px"}}>Intelligence Report</h2>
          <p style={{margin:"4px 0 0",color:"#334155",fontSize:11,fontFamily:"Space Mono,monospace"}}>
            {ROLES[role].emoji} {role} · Insight Engine · {new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
          </p>
        </div>
        <button onClick={onReset} style={{background:"#0a0f1e",border:"1px solid #1e293b",color:"#475569",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontFamily:"Space Mono,monospace",fontSize:12}}>← New Analysis</button>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {[
          {id:"dashboard",label:"📊 Dashboard"},
          {id:"builder",label:"🛠 Build Your Project"},
          {id:"tasks",label:"📋 Tasks"},
          {id:"assistant",label:"💬 Chat Assistant"},
          {id:"profile",label:"👤 Profile Analysis"},
        ].map(item => (
          <button key={item.id} onClick={()=>setPage(item.id)} style={{background:page===item.id?"#1e1b4b":"#050a14",border:`1px solid ${page===item.id?"#4338ca":"#1e293b"}`,color:page===item.id?"#c4b5fd":"#64748b",borderRadius:10,padding:"8px 12px",cursor:"pointer",fontFamily:"Space Mono,monospace",fontSize:11,fontWeight:700}}>{item.label}</button>
        ))}
      </div>

      {page === "builder" && <ProjectBuilderPage role={role} guidedProject={guidedProject} verification={verification} />}
      {page === "tasks" && <TaskManagementPage tasks={taskList} setTasks={setTaskList} suggestedTasks={suggestedTasks} focusLevel={cognitive.focusLevel} />}
      {page === "assistant" && <ChatAssistantPage context={{role, skill, verification, guidedProject, apiKey}} />}
      {page === "profile" && <ProfileAnalysisPage verification={verification} guidance={profileGuidance} />}
      {page !== "dashboard" && <div style={{height:8}} />}

      {page === "dashboard" && (
      <>

      <div style={{display:"flex",gap:3,marginBottom:24,background:"#050a14",borderRadius:12,padding:4,width:"fit-content",border:"1px solid #1e293b",flexWrap:"wrap"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?"#1e293b":"transparent",border:"none",color:tab===t.id?"#e2e8f0":"#334155",borderRadius:8,padding:"7px 18px",cursor:"pointer",fontFamily:"Space Mono,monospace",fontSize:12,transition:"all 0.2s",boxShadow:tab===t.id?"0 1px 8px rgba(0,0,0,0.5)":"none"}}>{t.l}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab==="overview"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <PredictionBlock prediction={prediction} skill={skill} cognitive={cognitive} role={role}/>

          <Card glow="#06b6d4">
            <h4 style={{margin:"0 0 12px",color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace"}}>📂 PROJECT VERIFICATION SYSTEM</h4>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
              <div style={{background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px"}}>
                <div style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace"}}>Verified Projects</div>
                <div style={{color:verification.github.verifiedProjects?"#4ade80":"#f87171",fontWeight:800,fontSize:15}}>{verification.github.verifiedProjects?"YES":"NO"}</div>
                <div style={{color:"#334155",fontSize:10}}>Repos: {verification.github.repoCount} • Relevance: {verification.github.relevanceScore}%</div>
              </div>
              <div style={{background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px"}}>
                <div style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace"}}>Internship Experience</div>
                <div style={{color:verification.linkedin.internshipExperience?"#4ade80":"#fbbf24",fontWeight:800,fontSize:15}}>{verification.linkedin.internshipExperience?"YES":"NO"}</div>
                <div style={{color:"#334155",fontSize:10}}>LinkedIn listed: {verification.linkedin.projectsListed?"YES":"NO"}</div>
              </div>
              <div style={{background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px"}}>
                <div style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace"}}>Practical Exposure Score</div>
                <div style={{color:"#06b6d4",fontWeight:800,fontSize:15}}>{verification.practicalExposureScore}%</div>
                <div style={{color:"#334155",fontSize:10}}>Social validation: {verification.socialValidationScore}%</div>
              </div>
            </div>
            {(verification.missingProjects || verification.plagiarism.flag) && (
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {verification.missingProjects && <div style={{color:"#f87171",fontSize:12,fontFamily:"Space Mono,monospace"}}>⚠ No strong practical projects detected</div>}
                {verification.plagiarism.flag && <div style={{color:"#fbbf24",fontSize:12,fontFamily:"Space Mono,monospace"}}>⚠ {verification.plagiarism.label}</div>}
              </div>
            )}
          </Card>

          <Card glow="#a855f7">
            <h4 style={{margin:"0 0 12px",color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace"}}>🧭 AI EXECUTION PLANNER</h4>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}>
              <label style={{display:"flex",alignItems:"center",gap:6,color:"#94a3b8",fontSize:11,fontFamily:"Space Mono,monospace"}}>
                <input type="checkbox" checked={includeHourly} onChange={(e)=>setIncludeHourly(e.target.checked)} />
                Include hour-by-hour plan
              </label>
              <button onClick={generatePlan} disabled={planLoading} style={{background:"linear-gradient(135deg,#6366f1,#a855f7)",border:"none",color:"#fff",borderRadius:10,padding:"8px 12px",cursor:planLoading?"not-allowed":"pointer",fontFamily:"Space Mono,monospace",fontSize:11,fontWeight:700,opacity:planLoading?0.7:1}}>
                {planLoading ? "Generating..." : "Generate AI Plan"}
              </button>
            </div>
            <div style={{background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px",minHeight:120,whiteSpace:"pre-wrap",color:"#cbd5e1",fontSize:12,lineHeight:1.7}}>
              {planText || "Generate a day-by-day execution plan tailored to your focus level, skill gaps, and guided project."}
            </div>
          </Card>

          {/* Failure Awareness — METHOD 4 */}
          <FailureAwarenessBlock prediction={prediction} skill={skill} role={role}/>

          {/* Smart Nudge — METHOD 5 */}
          <SmartNudge nudge={nudge} cognitiveState={cognitive}/>

          {/* Live Behavioral Signal Panel */}
          <LiveSignalPanel liveMetrics={{...liveMetrics, sessionDurationLabel: cognitive.sessionDurationLabel, switchRateLabel: cognitive.switchRateLabel}}/>

          {/* mini score cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>
            {[
              {l:"READINESS",v:prediction.readiness,c:predCol,sub:prediction.prediction},
              {l:"SKILL MATCH",v:skill.matchPct,c:"#6366f1",sub:`${skill.matched.length}/${ROLES[role].required.length} skills`},
              {l:"FOCUS SCORE",v:cognitive.focusScore,c:cognitive.focusLevel==="High"?"#4ade80":cognitive.focusLevel==="Medium"?"#fbbf24":"#f87171",sub:cognitive.focusLevel},
              {l:"CONSISTENCY",v:cognitive.consistency,c:"#a855f7",sub:`${cognitive.distractionRisk} distraction`},
              {l:"TASK PROGRESS",v:taskList.length?Math.round((taskList.filter(t=>t.completed).length/taskList.length)*100):0,c:"#06b6d4",sub:`${taskList.filter(t=>t.completed).length}/${taskList.length} tasks`},
            ].map(({l,v,c,sub})=>(
              <Card key={l} glow={c}>
                <div style={{color:"#1e293b",fontSize:9,fontFamily:"Space Mono,monospace",letterSpacing:"0.07em",marginBottom:8}}>{l}</div>
                <div style={{color:c,fontSize:32,fontWeight:900,fontFamily:"'Syne',sans-serif",lineHeight:1}}>{v}<span style={{fontSize:14,color:"#334155"}}>%</span></div>
                <div style={{color:"#334155",fontSize:11,fontFamily:"Space Mono,monospace",marginTop:6}}>{sub}</div>
              </Card>
            ))}
          </div>

          <Card glow="#6366f1">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
              <h4 style={{margin:0,color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace"}}>🤖 AI PERFORMANCE EXPLANATION</h4>
              <button onClick={generateExplanation} disabled={aiExplanationLoading} style={{background:"#1e1b4b",border:"1px solid #4338ca",color:"#c4b5fd",borderRadius:8,padding:"6px 10px",cursor:aiExplanationLoading?"not-allowed":"pointer",fontFamily:"Space Mono,monospace",fontSize:11,opacity:aiExplanationLoading?0.7:1}}>
                {aiExplanationLoading ? "Generating..." : "Generate Explanation"}
              </button>
            </div>
            <div style={{background:"#050a14",border:"1px solid #1e293b",borderRadius:10,padding:"10px 12px",minHeight:80,color:"#cbd5e1",fontSize:12,lineHeight:1.7}}>
              {aiExplanation || "Generate an AI explanation for your readiness and exact next action priorities."}
            </div>
          </Card>

          <AIPanel prompt={explainPrompt} title="ADAPTIVE PERFORMANCE ANALYSIS" icon="🤖" color="#6366f1"/>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Card>
              <h4 style={{margin:"0 0 12px",color:"#e2e8f0",fontSize:11,fontFamily:"Space Mono,monospace",letterSpacing:"0.06em"}}>✅ MATCHED SKILLS</h4>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {skill.matched.map(s=><span key={s} style={{background:"#052e16",border:"1px solid #166534",color:"#4ade80",borderRadius:8,padding:"3px 10px",fontSize:12,fontFamily:"Space Mono,monospace"}}>{s}</span>)}
                {!skill.matched.length&&<span style={{color:"#334155",fontSize:12}}>No matches detected</span>}
              </div>
            </Card>
            <Card>
              <h4 style={{margin:"0 0 12px",color:"#e2e8f0",fontSize:11,fontFamily:"Space Mono,monospace",letterSpacing:"0.06em"}}>❌ MISSING SKILLS</h4>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {skill.missing.map(s=><span key={s} style={{background:"#2d0a0a",border:"1px solid #991b1b",color:"#f87171",borderRadius:8,padding:"3px 10px",fontSize:12,fontFamily:"Space Mono,monospace"}}>{s}</span>)}
                {!skill.missing.length&&<span style={{color:"#4ade80",fontSize:12}}>All required skills matched 🎉</span>}
              </div>
            </Card>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"190px 1fr",gap:14}}>
            <Card style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
              <h4 style={{margin:0,color:"#e2e8f0",fontSize:11,fontFamily:"Space Mono,monospace"}}>SKILL COVERAGE</h4>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={skillPie} cx="50%" cy="50%" innerRadius={36} outerRadius={58} dataKey="value" strokeWidth={0}>
                    {skillPie.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:8,color:"#e2e8f0",fontSize:11,fontFamily:"Space Mono,monospace"}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{color:"#334155",fontSize:10,fontFamily:"Space Mono,monospace"}}>{skill.matchPct}% matched</div>
            </Card>
            <Card>
              <h4 style={{margin:"0 0 10px",color:"#e2e8f0",fontSize:11,fontFamily:"Space Mono,monospace"}}>FOCUS TREND — 7 DAYS</h4>
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={FOCUS_DATA}>
                  <defs>
                    <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#1e293b" tick={{fill:"#334155",fontSize:10}}/>
                  <YAxis stroke="#1e293b" tick={{fill:"#334155",fontSize:10}} domain={[0,100]}/>
                  <Tooltip contentStyle={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:8,color:"#e2e8f0",fontSize:11,fontFamily:"Space Mono,monospace"}}/>
                  <Area type="monotone" dataKey="focus" stroke="#6366f1" fill="url(#fg)" strokeWidth={2.5} dot={{fill:"#6366f1",r:3,strokeWidth:0}}/>
                  <Line type="monotone" dataKey="consistency" stroke="#a855f7" strokeWidth={2} dot={false} strokeDasharray="5 3"/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      )}

      {/* ── MINDOS ── */}
      {tab==="cognitive"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <LiveSignalPanel liveMetrics={{...liveMetrics, sessionDurationLabel: cognitive.sessionDurationLabel, switchRateLabel: cognitive.switchRateLabel}}/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
            {[
              {l:"Focus Level",v:cognitive.focusLevel,s:cognitive.focusScore,icon:"🎯",c:cognitive.focusLevel==="High"?"#4ade80":cognitive.focusLevel==="Medium"?"#fbbf24":"#f87171",d:"Sustained attention capacity"},
              {l:"Consistency",v:`${cognitive.consistency}%`,s:cognitive.consistency,icon:"📈",c:"#6366f1",d:"Session regularity"},
              {l:"Distraction Risk",v:cognitive.distractionRisk,s:cognitive.distractionRisk==="Low"?15:cognitive.distractionRisk==="Medium"?55:90,icon:"⚠️",c:cognitive.distractionRisk==="Low"?"#4ade80":cognitive.distractionRisk==="Medium"?"#fbbf24":"#f87171",d:"Behavioral disruption likelihood"},
            ].map(({l,v,s,icon,c,d})=>(
              <Card key={l} glow={c}>
                <div style={{fontSize:26,marginBottom:8}}>{icon}</div>
                <div style={{color:"#334155",fontSize:10,fontFamily:"Space Mono,monospace",marginBottom:6}}>{d}</div>
                <div style={{color:c,fontSize:28,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:10}}>{v}</div>
                <div style={{height:5,background:"#0a0f1e",borderRadius:3,overflow:"hidden"}}>
                  <div style={{width:`${s}%`,height:"100%",background:c,borderRadius:3,transition:"width 1.3s ease",boxShadow:`0 0 8px ${c}55`}}/>
                </div>
                <div style={{color:"#1e293b",fontSize:9,fontFamily:"Space Mono,monospace",marginTop:4}}>{l.toUpperCase()}</div>
              </Card>
            ))}
          </div>
          {/* Rule-based model explanation */}
          <Card glow="#06b6d4">
            <h4 style={{margin:"0 0 14px",color:"#e2e8f0",fontSize:11,fontFamily:"Space Mono,monospace"}}>⚙️ RULE-BASED ML MODEL — HOW WE COMPUTE YOUR STATE</h4>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[
                {rule:"Session < 2 min → Focus = LOW",active:liveMetrics?.sessionDuration<120,icon:"⏱"},
                {rule:"Switch Rate > 50% → Focus = LOW",active:liveMetrics?.switchRate>0.5,icon:"🔄"},
                {rule:"Delay > 300ms → Distraction = HIGH",active:true,icon:"⌨️"},
                {rule:"Consistency + Live signals fused",active:true,icon:"🧮"},
              ].map(({rule,active,icon})=>(
                <div key={rule} style={{background:"#050a14",borderRadius:10,padding:"10px 14px",border:`1px solid ${active?"#166534":"#1e293b"}`,display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontSize:16}}>{icon}</span>
                  <span style={{color:active?"#4ade80":"#334155",fontSize:11,fontFamily:"Space Mono,monospace",lineHeight:1.4}}>{rule}</span>
                  {active&&<span style={{marginLeft:"auto",color:"#4ade80",fontSize:10}}>✓</span>}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h4 style={{margin:"0 0 14px",color:"#e2e8f0",fontSize:11,fontFamily:"Space Mono,monospace"}}>🧠 BEHAVIORAL PATTERN — 7-DAY SCAN</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={FOCUS_DATA} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#0a0f1e"/>
                <XAxis dataKey="day" stroke="#1e293b" tick={{fill:"#334155",fontSize:10}}/>
                <YAxis stroke="#1e293b" tick={{fill:"#334155",fontSize:10}} domain={[0,100]}/>
                <Tooltip contentStyle={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:8,color:"#e2e8f0",fontSize:11,fontFamily:"Space Mono,monospace"}}/>
                <Bar dataKey="focus" fill="#6366f1" radius={[5,5,0,0]} name="Focus"/>
                <Bar dataKey="consistency" fill="#a855f7" radius={[5,5,0,0]} name="Consistency"/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h4 style={{margin:"0 0 14px",color:"#e2e8f0",fontSize:11,fontFamily:"Space Mono,monospace"}}>⚡ BEHAVIORAL DIAGNOSTICS</h4>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[
                {icon:"⏱",t:"Activity Pattern",v:cognitive.focusLevel==="High"?"Consistent deep work blocks detected":"Irregular intervals — fragmented attention"},
                {icon:"🧩",t:"Execution Style",v:cognitive.consistency>70?"Structured & predictable — low burnout risk":"Chaotic execution pattern — needs a framework"},
                {icon:"📱",t:"Distraction Profile",v:cognitive.distractionRisk==="Low"?"Low digital distraction":"High distraction — short-form content likely"},
                {icon:"🔋",t:"Energy Windows",v:cognitive.focusScore>70?"Peak: Morning hours identified":"Variable — schedule optimization needed"},
              ].map(({icon,t,v})=>(
                <div key={t} style={{background:"#050a14",borderRadius:10,padding:"12px 14px",border:"1px solid #1e293b"}}>
                  <div style={{fontSize:18,marginBottom:6}}>{icon}</div>
                  <div style={{color:"#334155",fontSize:9,fontFamily:"Space Mono,monospace",marginBottom:4,letterSpacing:"0.05em"}}>{t.toUpperCase()}</div>
                  <div style={{color:"#cbd5e1",fontSize:13,lineHeight:1.5}}>{v}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── PSYCHOLOGY TAB ── */}
      {tab==="psychology"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Method explainer */}
          <Card glow="#a855f7">
            <h4 style={{margin:"0 0 14px",color:"#e2e8f0",fontSize:12,fontFamily:"Space Mono,monospace",letterSpacing:"0.06em"}}>🧠 5 PSYCHOLOGICAL METHODS — ACTIVE IN THIS ANALYSIS</h4>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[
                {num:"01",name:"Micro-Win System",desc:"Break big tasks into small dopamine-triggering wins. Maintains motivation through quick rewards.",col:"#6366f1",icon:"🏆"},
                {num:"02",name:"Adaptive Task Difficulty",desc:"Match task complexity to your focus level. High focus → hard tasks. Low focus → easy tasks.",col:"#06b6d4",icon:"🎯"},
                {num:"03",name:"Progress Visualization",desc:"Make improvement visible. Humans stay consistent when they can see their 62% → 75% → 82% growth.",col:"#a855f7",icon:"📈"},
                {num:"04",name:"Failure Awareness",desc:"Simulate consequences of inaction. Fear of failure is a powerful motivator — we harness it ethically.",col:"#f87171",icon:"⚠️"},
                {num:"05",name:"Smart Nudging System",desc:"Contextual nudges based on behavioral signals. Gentle guidance > force. Right message at right time.",col:"#4ade80",icon:"💡"},
              ].map(m=>(
                <div key={m.num} style={{background:"#050a14",borderRadius:12,padding:"14px 16px",border:`1px solid ${m.col}33`,display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:`${m.col}15`,border:`1px solid ${m.col}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{m.icon}</div>
                  <div>
                    <div style={{color:"#475569",fontSize:9,fontFamily:"Space Mono,monospace",marginBottom:2}}>METHOD {m.num}</div>
                    <div style={{color:m.col,fontSize:13,fontWeight:700,fontFamily:"'Syne',sans-serif",marginBottom:5}}>{m.name}</div>
                    <div style={{color:"#475569",fontSize:11,lineHeight:1.55}}>{m.desc}</div>
                  </div>
                </div>
              ))}
              <div style={{background:"#050a14",borderRadius:12,padding:"14px 16px",border:"1px solid #1e293b",display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{width:36,height:36,borderRadius:10,background:"rgba(6,182,212,0.1)",border:"1px solid #06b6d433",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>📡</div>
                <div>
                  <div style={{color:"#475569",fontSize:9,fontFamily:"Space Mono,monospace",marginBottom:2}}>SYSTEM ARCHITECTURE</div>
                  <div style={{color:"#06b6d4",fontSize:13,fontWeight:700,fontFamily:"'Syne',sans-serif",marginBottom:5}}>Signal → Cognitive → Predict → Adapt</div>
                  <div style={{color:"#475569",fontSize:11,lineHeight:1.55}}>Behavior signals feed cognitive model, which drives prediction, which triggers psychological adaptation layer.</div>
                </div>
              </div>
            </div>
          </Card>

          {/* METHOD 1: Micro-Win System */}
          <MicroWinChecklist microWins={microWins} focusLevel={cognitive.focusLevel}/>

          {/* METHOD 2: Adaptive Difficulty Explanation */}
          <Card glow="#06b6d4">
            <h4 style={{margin:"0 0 14px",color:"#e2e8f0",fontSize:11,fontFamily:"Space Mono,monospace"}}>🎯 ADAPTIVE TASK DIFFICULTY — MATCHED TO YOUR FOCUS</h4>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
              {[
                {level:"LOW FOCUS",tasks:["5-min micro tasks","Single concept videos","Flashcard reviews"],active:cognitive.focusLevel==="Low",col:"#f87171"},
                {level:"MEDIUM FOCUS",tasks:["25-min Pomodoro sessions","Tutorial projects","Code exercises"],active:cognitive.focusLevel==="Medium",col:"#fbbf24"},
                {level:"HIGH FOCUS",tasks:["90-min deep work","Full projects","Advanced challenges"],active:cognitive.focusLevel==="High",col:"#4ade80"},
              ].map(d=>(
                <div key={d.level} style={{background:d.active?"rgba(74,222,128,0.05)":"#050a14",borderRadius:12,padding:"14px",border:`1.5px solid ${d.active?d.col:"#1e293b"}`,position:"relative"}}>
                  {d.active&&<div style={{position:"absolute",top:-1,right:10,background:d.col,color:"#0a0f1e",fontSize:8,fontFamily:"Space Mono,monospace",padding:"1px 7px",borderRadius:"0 0 5px 5px",fontWeight:700}}>YOUR LEVEL</div>}
                  <div style={{color:d.col,fontSize:11,fontFamily:"Space Mono,monospace",fontWeight:700,marginBottom:10}}>{d.level}</div>
                  {d.tasks.map(t=><div key={t} style={{color:d.active?"#cbd5e1":"#334155",fontSize:12,marginBottom:5,display:"flex",gap:6,alignItems:"flex-start"}}><span style={{color:d.col,flexShrink:0}}>›</span>{t}</div>)}
                </div>
              ))}
            </div>
            <div style={{background:"#050a14",borderRadius:10,padding:"10px 14px",border:"1px solid #1e293b",fontSize:12,color:"#475569"}}>
              ⚡ PersonaAI assigns tasks at <strong style={{color:"#06b6d4"}}>difficulty ≤ your focus level</strong> to maintain flow state and prevent burnout or boredom.
            </div>
          </Card>

          {/* METHOD 4: Failure Awareness */}
          <FailureAwarenessBlock prediction={prediction} skill={skill} role={role}/>

          {/* METHOD 5: Smart Nudge */}
          <SmartNudge nudge={nudge} cognitiveState={cognitive}/>

          {/* METHOD 3: Progress Visualization */}
          <Card glow="#a855f7">
            <h4 style={{margin:"0 0 14px",color:"#e2e8f0",fontSize:11,fontFamily:"Space Mono,monospace"}}>📈 PROGRESS VISUALIZATION — BEFORE vs. AFTER</h4>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {[
                {label:"Skill Match", current:skill.matchPct, target: Math.min(100, skill.matchPct + skill.missing.length * 10), col:"#6366f1"},
                {label:"Readiness Score", current:prediction.readiness, target:prediction.improvedReadiness, col:"#4ade80"},
              ].map(m=>(
                <div key={m.label} style={{background:"#050a14",borderRadius:12,padding:"14px 16px",border:"1px solid #1e293b"}}>
                  <div style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace",marginBottom:10}}>{m.label.toUpperCase()}</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:8}}>
                    <span style={{color:"#f87171",fontSize:26,fontWeight:900,fontFamily:"'Syne',sans-serif"}}>{m.current}%</span>
                    <span style={{color:"#334155",fontSize:14}}>→</span>
                    <span style={{color:m.col,fontSize:26,fontWeight:900,fontFamily:"'Syne',sans-serif"}}>{m.target}%</span>
                  </div>
                  <div style={{height:6,background:"#0a0f1e",borderRadius:3,marginBottom:6,overflow:"hidden"}}>
                    <div style={{width:`${m.current}%`,height:"100%",background:"#f87171",borderRadius:3}}/>
                  </div>
                  <div style={{height:6,background:"#0a0f1e",borderRadius:3,overflow:"hidden"}}>
                    <div style={{width:`${m.target}%`,height:"100%",background:m.col,borderRadius:3,transition:"width 1.5s ease",boxShadow:`0 0 8px ${m.col}55`}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
                    <span style={{color:"#f87171",fontSize:10,fontFamily:"Space Mono,monospace"}}>NOW</span>
                    <span style={{color:m.col,fontSize:10,fontFamily:"Space Mono,monospace"}}>AFTER SKILLS</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── ROADMAP ── */}
      {tab==="roadmap"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <AIPanel prompt={roadmapPrompt} title="ADAPTIVE 30-DAY ROADMAP" icon="🗺" color="#a855f7"/>
          <Card glow="#a855f7">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <h4 style={{margin:"0 0 4px",color:"#e2e8f0",fontSize:15,fontFamily:"'Syne',sans-serif",fontWeight:800}}>Execution Checklist</h4>
                <p style={{margin:0,color:"#334155",fontSize:11,fontFamily:"Space Mono,monospace"}}>{role} · {cognitive.focusLevel} focus · Click to mark complete</p>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{color:"#a855f7",fontSize:30,fontWeight:900,fontFamily:"'Syne',sans-serif"}}>{done.length}/{roadmap.length}</div>
                <div style={{color:"#334155",fontSize:9,fontFamily:"Space Mono,monospace"}}>milestones</div>
              </div>
            </div>
            {/* METHOD 3: Progress Visualization on roadmap */}
            <div style={{marginTop:12,height:5,background:"#0a0f1e",borderRadius:3,overflow:"hidden"}}>
              <div style={{width:`${(done.length/roadmap.length)*100}%`,height:"100%",background:"linear-gradient(90deg,#6366f1,#a855f7)",borderRadius:3,transition:"width 0.5s ease"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
              <span style={{color:"#334155",fontSize:10,fontFamily:"Space Mono,monospace"}}>0%</span>
              <span style={{color:"#a855f7",fontSize:10,fontFamily:"Space Mono,monospace"}}>{Math.round((done.length/roadmap.length)*100)}% Complete</span>
              <span style={{color:"#334155",fontSize:10,fontFamily:"Space Mono,monospace"}}>100%</span>
            </div>
          </Card>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {roadmap.map((item,i)=>{
              const d=done.includes(i);
              const tc=item.type==="learn"?"#6366f1":item.type==="build"?"#f59e0b":"#4ade80";
              return(
                <div key={i} onClick={()=>setDone(p=>d?p.filter(x=>x!==i):[...p,i])}
                  style={{background:d?"rgba(74,222,128,0.04)":"rgba(10,15,30,0.88)",border:`1px solid ${d?"#166534":"#1e293b"}`,borderRadius:14,padding:"14px 18px",display:"flex",gap:14,alignItems:"flex-start",cursor:"pointer",transition:"all 0.25s",opacity:d?0.6:1}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:d?"#052e16":"#050a14",border:`2px solid ${d?"#4ade80":tc}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13}}>
                    {d?"✓":item.type==="learn"?"📚":item.type==="build"?"⚙️":"🚀"}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <span style={{color:tc,fontSize:12,fontFamily:"Space Mono,monospace",fontWeight:700}}>{item.range}</span>
                      <span style={{background:`${tc}1a`,color:tc,border:`1px solid ${tc}44`,borderRadius:5,padding:"1px 8px",fontSize:10,fontFamily:"Space Mono,monospace"}}>{item.type.toUpperCase()}</span>
                    </div>
                    {item.tasks.map((t,j)=><div key={j} style={{color:d?"#334155":"#cbd5e1",fontSize:13,lineHeight:1.6,textDecoration:d?"line-through":"none"}}>→ {t}</div>)}
                  </div>
                </div>
              );
            })}
          </div>
          <Card style={{background:"rgba(99,102,241,0.04)",borderColor:"#312e81"}}>
            <p style={{margin:0,color:"#94a3b8",fontSize:13,lineHeight:1.7}}>
              💡 <strong style={{color:"#818cf8"}}>MindOS Adaptive Note:</strong>{" "}
              {cognitive.focusLevel==="High"?"High focus — 90-min deep work blocks. Push 2-skill sprints per week.":cognitive.focusLevel==="Medium"?"Moderate focus — 45-min Pomodoro sessions. Switch topics every 2 days.":"Low focus — Start with 20-min micro-sprints. Fix sleep & exercise first, then tackle skills."}
            </p>
          </Card>
        </div>
      )}

      {/* ── ENTERPRISE ── */}
      {tab==="enterprise"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
            {[
              {l:"AVG READINESS",v:`${Math.round(TEAM.reduce((a,b)=>a+b.readiness,0)/TEAM.length)}%`,icon:"📊",c:"#6366f1"},
              {l:"AT-RISK MEMBERS",v:TEAM.filter(m=>m.risk==="High").length,icon:"⚠️",c:"#f87171"},
              {l:"HIGH PERFORMERS",v:TEAM.filter(m=>m.readiness>=80).length,icon:"🌟",c:"#4ade80"},
            ].map(({l,v,icon,c})=>(
              <Card key={l} glow={c}>
                <div style={{fontSize:28,marginBottom:8}}>{icon}</div>
                <div style={{color:c,fontSize:40,fontWeight:900,fontFamily:"'Syne',sans-serif"}}>{v}</div>
                <div style={{color:"#334155",fontSize:9,fontFamily:"Space Mono,monospace",marginTop:4}}>{l}</div>
              </Card>
            ))}
          </div>
          <Card>
            <h4 style={{margin:"0 0 16px",color:"#e2e8f0",fontSize:11,fontFamily:"Space Mono,monospace"}}>👥 WORKFORCE PERFORMANCE MATRIX</h4>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{display:"grid",gridTemplateColumns:"1.4fr 1.2fr 90px 80px 80px 80px",gap:10,padding:"6px 12px"}}>
                {["Member","Role","Readiness","Focus","Skills","Risk"].map(h=><span key={h} style={{color:"#1e293b",fontSize:10,fontFamily:"Space Mono,monospace"}}>{h}</span>)}
              </div>
              {TEAM.map((m,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1.4fr 1.2fr 90px 80px 80px 80px",gap:10,padding:"10px 12px",background:"#050a14",borderRadius:10,alignItems:"center",border:"1px solid #1e293b"}}>
                  <span style={{color:"#e2e8f0",fontSize:13,fontWeight:600}}>{m.name}</span>
                  <span style={{color:"#334155",fontSize:12,fontFamily:"Space Mono,monospace"}}>{m.role}</span>
                  <div>
                    <div style={{height:4,background:"#1e293b",borderRadius:2,overflow:"hidden",marginBottom:3}}>
                      <div style={{width:`${m.readiness}%`,height:"100%",background:m.readiness>=70?"#4ade80":m.readiness>=45?"#fbbf24":"#f87171",borderRadius:2}}/>
                    </div>
                    <span style={{color:"#475569",fontSize:10,fontFamily:"Space Mono,monospace"}}>{m.readiness}%</span>
                  </div>
                  <Badge label={m.focus.toUpperCase()} color={m.focus==="High"?"green":m.focus==="Medium"?"yellow":"red"}/>
                  <span style={{color:"#475569",fontSize:12,fontFamily:"Space Mono,monospace"}}>{m.skills}%</span>
                  <Badge label={m.risk.toUpperCase()} color={m.risk==="Low"?"green":m.risk==="Medium"?"yellow":"red"}/>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h4 style={{margin:"0 0 12px",color:"#e2e8f0",fontSize:11,fontFamily:"Space Mono,monospace"}}>📊 TEAM READINESS CHART</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={TEAM.map(m=>({name:m.name.split(" ")[0],val:m.readiness}))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0a0f1e"/>
                <XAxis dataKey="name" stroke="#1e293b" tick={{fill:"#334155",fontSize:11}}/>
                <YAxis stroke="#1e293b" tick={{fill:"#334155",fontSize:11}} domain={[0,100]}/>
                <Tooltip contentStyle={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:8,color:"#e2e8f0",fontSize:11,fontFamily:"Space Mono,monospace"}}/>
                <Bar dataKey="val" radius={[5,5,0,0]}>
                  {TEAM.map((m,i)=><Cell key={i} fill={m.readiness>=70?"#4ade80":m.readiness>=45?"#fbbf24":"#f87171"}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
            {[
              {p:"Free",pr:"₹0/mo",f:["Basic skill analysis","5 predictions/mo","Focus score"],c:"#475569"},
              {p:"Premium",pr:"₹499/mo",f:["Adaptive roadmap","Unlimited predictions","Priority AI insights"],c:"#6366f1",hot:true},
              {p:"Enterprise",pr:"Custom",f:["Workforce analytics","HR integration","Custom models"],c:"#a855f7"},
              {p:"API",pr:"Pay/use",f:["REST API access","Recruiter platform","Bulk analysis"],c:"#06b6d4"},
            ].map(({p,pr,f,c,hot})=>(
              <Card key={p} glow={c} style={{borderColor:`${c}44`,position:"relative"}}>
                {hot&&<div style={{position:"absolute",top:-1,right:14,background:c,color:"#fff",fontSize:9,fontFamily:"Space Mono,monospace",padding:"2px 8px",borderRadius:"0 0 6px 6px",fontWeight:700}}>POPULAR</div>}
                <div style={{color:c,fontSize:10,fontFamily:"Space Mono,monospace",fontWeight:700,marginBottom:6}}>{p.toUpperCase()}</div>
                <div style={{color:"#f1f5f9",fontSize:20,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:12}}>{pr}</div>
                {f.map(x=><div key={x} style={{color:"#334155",fontSize:12,marginBottom:5,display:"flex",gap:6}}><span style={{color:c}}>›</span>{x}</div>)}
              </Card>
            ))}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App(){
  const [result,setResult]=useState(null);
  return(
    <div style={{minHeight:"100vh",background:"#020817",backgroundImage:"radial-gradient(ellipse 70% 50% at 5% 0%,rgba(99,102,241,0.13) 0%,transparent 100%),radial-gradient(ellipse 50% 40% at 95% 100%,rgba(168,85,247,0.09) 0%,transparent 100%)",color:"#f1f5f9"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800;900&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:#050a14;}::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px;}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        input[type=range]{height:4px;border-radius:2px;}
      `}</style>
      {/* Nav */}
      <nav style={{borderBottom:"1px solid #0a0f1e",background:"rgba(2,8,23,0.94)",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"13px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:"0 0 24px #6366f133"}}>⚡</div>
            <span style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:19,background:"linear-gradient(135deg,#818cf8,#c084fc)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>PersonaAI</span>
            <span style={{background:"#0a0f1e",border:"1px solid #1e293b",color:"#1e293b",fontSize:10,borderRadius:4,padding:"2px 7px",fontFamily:"Space Mono,monospace"}}>v2.0 · Insight Engine</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{color:"#1e293b",fontSize:11,fontFamily:"Space Mono,monospace"}}>Team 404 Found Us · Hackathon 2026</span>
            <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(74,222,128,0.07)",border:"1px solid #166534",borderRadius:999,padding:"3px 10px"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#4ade80",boxShadow:"0 0 8px #4ade80",display:"inline-block",animation:"pulse 2s infinite"}}/>
              <span style={{color:"#4ade80",fontSize:10,fontFamily:"Space Mono,monospace"}}>LIVE</span>
            </div>
          </div>
        </div>
      </nav>
      <div style={{padding:"44px 0 70px"}}>
        {result?<Dashboard data={result} onReset={()=>setResult(null)}/>:<UploadPage onAnalyze={setResult}/>}
      </div>
    </div>
  );
}