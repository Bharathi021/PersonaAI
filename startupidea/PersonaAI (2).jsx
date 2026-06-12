import { useState, useRef } from "react";
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie, LineChart, Line } from "recharts";
import * as pdfjsLib from 'pdfjs-dist';
import { convertInlineRichTextToHtml } from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// ─── 20 ROLES WITH SKILLS ──────────────────────────────────────────────────────
const ROLE_CATALOG = {
  "Backend Developer": ["Python", "REST APIs", "Docker", "SQL", "Git", "FastAPI", "Redis", "AWS"],
  "Data Scientist": ["Python", "Machine Learning", "Pandas", "NumPy", "SQL", "Statistics", "TensorFlow", "Data Visualization"],
  "AI Engineer": ["Python", "LLMs", "LangChain", "Vector Databases", "Prompt Engineering", "MLOps", "REST APIs", "Docker"],
  "Frontend Developer": ["React", "JavaScript", "TypeScript", "CSS", "Tailwind", "Git", "REST APIs", "Testing"],
  "Full Stack Developer": ["React", "Node.js", "Python", "SQL", "Docker", "REST APIs", "Git", "AWS"],
  "DevOps Engineer": ["Docker", "Kubernetes", "AWS", "Linux", "Git", "CI/CD", "Terraform", "Monitoring"],
  "Cloud Engineer": ["AWS", "Azure", "Docker", "Kubernetes", "Linux", "Git", "Infrastructure as Code", "Networking"],
  "ML Engineer": ["Python", "Machine Learning", "PyTorch", "TensorFlow", "SQL", "MLOps", "Git", "Docker"],
  "Prompt Engineer": ["LLMs", "Prompt Engineering", "API Integration", "Python", "Understanding AI", "Testing", "Documentation", "Communication"],
  "Data Engineer": ["Python", "SQL", "Kafka", "Spark", "Docker", "Git", "Cloud Platforms", "ETL"],
  "Product Manager": ["Communication", "Analytics", "SQL", "Product Strategy", "User Research", "Roadmapping", "Data Interpretation", "Leadership"],
  "QA Engineer": ["Testing", "Automation", "Python", "SQL", "Git", "CI/CD", "Test Management", "Communication"],
  "Security Engineer": ["Linux", "Networking", "Python", "Git", "Cryptography", "Cloud Security", "Compliance", "Penetration Testing"],
  "Mobile Developer": ["React Native", "JavaScript", "TypeScript", "Git", "REST APIs", "Testing", "Mobile Design", "Performance"],
  "UI/UX Designer": ["Figma", "Prototyping", "User Research", "CSS", "Design Systems", "Communication", "Accessibility", "Testing"],
  "Business Analyst": ["SQL", "Analytics", "Communication", "Documentation", "Problem Solving", "Data Interpretation", "Requirements Gathering", "Stakeholder Management"],
  "Site Reliability Engineer": ["Linux", "Docker", "Kubernetes", "Python", "Monitoring", "CI/CD", "Infrastructure as Code", "Networking"],
  "Solutions Architect": ["AWS", "Azure", "Design Thinking", "Communication", "Leadership", "Python", "Docker", "Best Practices"],
  "Technical Writer": ["Documentation", "Communication", "Technical Understanding", "Git", "Markdown", "API Documentation", "User Research", "Tools & Platforms"],
  "Growth Engineer": ["Python", "Analytics", "A/B Testing", "SQL", "Marketing", "Communication", "Experimentation", "Data-Driven Thinking"],
};

const SKILL_POOL = ["Python", "JavaScript", "TypeScript", "React", "Vue", "Angular", "Node.js", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Linux", "Git", "REST APIs", "GraphQL", "FastAPI", "Flask", "Django", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy", "Data Visualization", "Statistics", "NLP", "LLMs", "LangChain", "Vector Databases", "Prompt Engineering", "MLOps", "CI/CD", "Testing", "Agile", "Webpack", "Tailwind", "CSS", "Jupyter", "Feature Engineering", "UX Design", "Figma", "Prototyping"];

const JOB_MATCH = {
  "Backend Developer": ["Backend Software Engineer", "API Developer", "Python Developer"],
  "Data Scientist": ["Data Scientist", "ML Scientist", "Analytics Engineer"],
  "AI Engineer": ["AI Engineer", "LLM Engineer", "AI/ML Engineer"],
  "Frontend Developer": ["Frontend Engineer", "React Developer", "JavaScript Developer"],
  "Full Stack Developer": ["Full Stack Engineer", "Full Stack Developer", "Web Developer"],
  "DevOps Engineer": ["DevOps Engineer", "Infrastructure Engineer", "Cloud Operations"],
  "Cloud Engineer": ["Cloud Architect", "Cloud Engineer", "Infrastructure Specialist"],
  "ML Engineer": ["ML Engineer", "Machine Learning Engineer", "AI Engineer"],
  "Prompt Engineer": ["Prompt Engineer", "AI Specialist", "GPT Specialist"],
  "Data Engineer": ["Data Engineer", "ETL Developer", "Data Pipeline Engineer"],
  "Product Manager": ["Product Manager", "Associate PM", "Product Lead"],
  "QA Engineer": ["QA Engineer", "Test Automation Engineer", "Quality Assurance Lead"],
  "Security Engineer": ["Security Engineer", "Security Specialist", "Infosec Engineer"],
  "Mobile Developer": ["Mobile Developer", "React Native Developer", "iOS/Android Developer"],
  "UI/UX Designer": ["UX Designer", "Product Designer", "UI Designer"],
  "Business Analyst": ["Business Analyst", "BA", "Systems Analyst"],
  "Site Reliability Engineer": ["SRE", "Infrastructure Engineer", "DevOps Engineer"],
  "Solutions Architect": ["Solutions Architect", "Enterprise Architect", "Technical Architect"],
  "Technical Writer": ["Technical Writer", "Documentation Specialist", "Content Specialist"],
  "Growth Engineer": ["Growth Engineer", "Growth Product Manager", "Performance Engineer"],
};

const FOCUS_DATA = [
  { day: "Mon", focus: 72, consistency: 65 }, { day: "Tue", focus: 58, consistency: 70 },
  { day: "Wed", focus: 80, consistency: 75 }, { day: "Thu", focus: 45, consistency: 50 },
  { day: "Fri", focus: 68, consistency: 62 }, { day: "Sat", focus: 85, consistency: 80 }, { day: "Sun", focus: 60, consistency: 58 },
];

// ─── REAL SIGNAL CAPTURE ──────────────────────────────────────────────────────
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
      if (last.type !== type) {
        this.switchCount++;
        this.taskSwitches.push(now);
      }
    }
    this.lastActionTime = now;
  }

  getMetrics() {
    const sessionDuration = (Date.now() - this.sessionStart) / 1000;
    const avgResponseTime = this.responseTimes.length ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length : 5000;
    const switchRate = this.switchCount / Math.max(1, this.activityLog.length);
    
    let focusFromSession = sessionDuration < 120 ? "Low" : sessionDuration < 600 ? "Medium" : "High";
    let focusFromSwitching = switchRate > 0.5 ? "Low" : switchRate > 0.25 ? "Medium" : "High";
    let focusFromResponse = avgResponseTime > 8000 ? "Low" : avgResponseTime > 4000 ? "Medium" : "High";
    
    const scores = { Low: 0, Medium: 1, High: 2 };
    const avgScore = (scores[focusFromSession] + scores[focusFromSwitching] + scores[focusFromResponse]) / 3;
    const focusLevel = avgScore < 0.67 ? "Low" : avgScore < 1.33 ? "Medium" : "High";
    
    const labels = {
      sessionLabel: sessionDuration < 120 ? "< 2 min (Short)" : sessionDuration < 600 ? "5–10 min (Normal)" : "> 10 min (Deep Focus)",
      switchLabel: switchRate > 0.5 ? "High switching" : switchRate > 0.25 ? "Moderate switching" : "Stable attention",
    };

    return { sessionDuration, avgResponseTime, switchCount: this.switchCount, switchRate, focusLevel, ...labels };
  }
}

const behaviorTracker = new BehaviorTracker();

// ─── SKILL EXTRACTION ─────────────────────────────────────────────────────────
function extractSkills(text) {
  const lower = text.toLowerCase();
  return [...new Set(SKILL_POOL.filter(s => lower.includes(s.toLowerCase())))];
}

function analyzeRole(resumeText, role) {
  const userSkills = extractSkills(resumeText);
  const required = ROLE_CATALOG[role] || [];
  const matched = required.filter(s => userSkills.some(u => u.toLowerCase() === s.toLowerCase()));
  const missing = required.filter(s => !userSkills.some(u => u.toLowerCase() === s.toLowerCase()));
  return { userSkills, matched, missing, matchPct: Math.round((matched.length / required.length) * 100) };
}

// ─── COGNITIVE COMPUTATION (REAL SIGNALS + SLIDERS) ──────────────────────────
function computeCognitive(session, tasks, delay, liveMetrics = null) {
  const sliderConsistency = Math.max(0, Math.min(100, tasks * 1.2 - delay / 10));
  const sliderFocusScore = Math.max(0, Math.min(100, session * 0.3 + tasks * 0.5 - delay * 0.1));

  let liveFocusBonus = 0;
  let liveConsistencyBonus = 0;
  let distractionSignal = "Low";

  if (liveMetrics) {
    const { sessionDuration, switchRate } = liveMetrics;
    if (sessionDuration < 120) liveFocusBonus -= 10;
    else if (sessionDuration < 600) liveFocusBonus += 0;
    else liveFocusBonus += 12;

    if (switchRate > 0.5) {
      liveConsistencyBonus -= 10;
      distractionSignal = "High";
    } else if (switchRate > 0.25) {
      liveConsistencyBonus -= 4;
      distractionSignal = "Medium";
    } else {
      liveConsistencyBonus += 5;
    }
  }

  const consistency = Math.max(0, Math.min(100, Math.round(sliderConsistency + liveConsistencyBonus)));
  const focusScore = Math.max(0, Math.min(100, Math.round(sliderFocusScore + liveFocusBonus)));
  const focusLevel = focusScore >= 66 ? "High" : focusScore >= 33 ? "Medium" : "Low";

  if (delay > 300 && distractionSignal !== "High") distractionSignal = "High";
  else if (delay > 150 && distractionSignal === "Low") distractionSignal = "Medium";

  return {
    consistency,
    focusScore,
    // Normalized fields used by dashboard visual components.
    focus: focusScore / 100,
    productivity: Math.max(0, Math.min(1, (tasks - delay / 8) / 100)),
    focusLevel,
    distractionRisk: distractionSignal,
    sessionDurationLabel: liveMetrics?.sessionLabel || "",
    switchRateLabel: liveMetrics?.switchLabel || "",
  };
}

function computePrediction(matchPct, cog) {
  const readiness = Math.min(100, Math.round(matchPct * 0.6 + cog.focusScore * 0.3 + cog.consistency * 0.1));
  return {
    readiness,
    prediction: readiness >= 70 ? "Success" : readiness >= 45 ? "Moderate Risk" : "Failure",
    improvedReadiness: Math.min(100, readiness + (matchPct < 70 ? 18 : 10)),
  };
}

function buildMicroWins(missing, cog) {
  const allTasks = [];
  missing.forEach(skill => {
    allTasks.push({ skill, step: `Set up ${skill} environment`, type: "setup", difficulty: 1 });
    allTasks.push({ skill, step: `Complete first ${skill} tutorial`, type: "learn", difficulty: 2 });
    allTasks.push({ skill, step: `Build a mini project using ${skill}`, type: "practice", difficulty: 3 });
  });
  const focusWeight = cog.focusLevel === "High" ? 3 : cog.focusLevel === "Medium" ? 2 : 1;
  const filtered = allTasks.filter(t => t.difficulty <= focusWeight || t.type === "setup");
  return filtered.slice(0, 12);
}

function buildRoadmap(missing, cog) {
  const topMissing = missing.slice(0, 4);
  const focusPriority = cog.focusLevel === "High" ? "High" : cog.focusLevel === "Medium" ? "Medium" : "Low";

  const week1Skills = topMissing.slice(0, 2);
  const week2Skills = topMissing.slice(2, 4);
  const fallbackSkills = ["Portfolio", "Interview Prep"];

  const roadmap = [
    {
      week: 1,
      topic: "Core Foundation",
      priority: focusPriority,
      description: cog.focusLevel === "Low" ? "Use 20-minute micro-sprints and cover one concept at a time." : "Establish fundamentals and daily learning rhythm.",
      skills: week1Skills.length ? week1Skills : fallbackSkills,
    },
    {
      week: 2,
      topic: "Applied Practice",
      priority: "Medium",
      description: "Build small practical tasks for each targeted skill and track completion.",
      skills: week2Skills.length ? week2Skills : ["Practice", "Debugging"],
    },
    {
      week: 3,
      topic: "Project Integration",
      priority: "High",
      description: "Combine learned skills into a mini project and document architecture decisions.",
      skills: topMissing.length ? topMissing : ["System Design", "Implementation"],
    },
    {
      week: 4,
      topic: "Deployment + Interviews",
      priority: "High",
      description: "Deploy project, refine resume, and complete mock interview drills.",
      skills: ["Deployment", "Resume", "Interview"],
    },
  ];

  return roadmap;
}

function generateNudge(cog, skill) {
  if (cog.focusLevel === "High" && skill.matchPct > 70) 
    return { icon: "🔥", msg: "You're in peak focus — attempt a complex skill right now.", color: "#4ade80", type: "boost" };
  if (cog.focusLevel === "High" && skill.matchPct <= 70)
    return { icon: "⚡", msg: "High focus detected — perfect time to tackle your hardest missing skill.", color: "#6366f1", type: "boost" };
  if (cog.focusLevel === "Medium")
    return { icon: "📚", msg: "Moderate focus — try a 25-min Pomodoro on one skill area.", color: "#fbbf24", type: "normal" };
  if (cog.distractionRisk === "High")
    return { icon: "⚠️", msg: "Distraction detected — switch to a short 5-min micro task to reset.", color: "#f87171", type: "warning" };
  return { icon: "💡", msg: "Start with your easiest missing skill to build momentum.", color: "#06b6d4", type: "normal" };
}

// ─── RESUME PARSER (txt, pdf, docx) ───────────────────────────────────────────
async function readFileAsText(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  
  if (ext === 'txt') {
    return await file.text();
  } else if (ext === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ');
    }
    return text;
  } else if (ext === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await convertInlineRichTextToHtml(arrayBuffer);
    return result.value;
  }
  
  return file.text();
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
        <div style={{marginTop:12,background:"rgba(74,222,128,0.08)",border:"1px solid #166534",borderRadius:10,padding:"10px 14px",textAlign:"center",color:"#4ade80",fontSize:13,fontFamily:"Space Mono,monospace",animation:"pulse 2s infinite"}}>
          🎉 ALL MICRO-WINS COMPLETE — DOPAMINE ACHIEVED!
        </div>
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

// ─── UPLOAD PAGE ──────────────────────────────────────────────────────────────
function UploadPage({ onAnalyze }) {
  const [resume, setResume] = useState("");
  const [role, setRole] = useState("Backend Developer");
  const [session, setSession] = useState(45);
  const [tasks, setTasks] = useState(70);
  const [delay, setDelay] = useState(120);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const STEPS = ["Parsing resume text…", "Extracting skills via NLP…", "Running MindOS behavioral scan…", "Analyzing live behavioral signals…", "Computing readiness score…", "Generating AI prediction…", "Applying psychological adaptation…"];

  const go = () => {
    if (!resume.trim()) return;
    behaviorTracker.recordAction("analyze_click");
    setLoading(true);
    setStep(0);
    const iv = setInterval(() => setStep(s => s < STEPS.length - 1 ? s + 1 : s), 380);
    setTimeout(() => {
      clearInterval(iv);
      const liveMetrics = behaviorTracker.getMetrics();
      const skill = analyzeRole(resume, role);
      const cog = computeCognitive(session, tasks, delay, liveMetrics);
      const pred = computePrediction(skill.matchPct, cog);
      const roadmap = buildRoadmap(skill.missing, cog);
      const microWins = buildMicroWins(skill.missing, cog);
      const nudge = generateNudge(cog, skill);
      onAnalyze({ skill, cognitive: cog, prediction: pred, roadmap, microWins, nudge, role, liveMetrics });
      setLoading(false);
    }, 2800);
  };

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
      alert("Error reading file: " + err.message);
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,0.1)", border: "1px solid #312e81", borderRadius: 999, padding: "5px 18px", marginBottom: 20 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8", display: "inline-block", animation: "pulse 2s infinite" }} />
          <span style={{ color: "#818cf8", fontSize: 11, fontFamily: "Space Mono,monospace", letterSpacing: "0.1em" }}>AI-POWERED · SKILL + COGNITIVE + PSYCHOLOGICAL INTELLIGENCE</span>
        </div>
        <h1 style={{ fontSize: 52, fontWeight: 900, background: "linear-gradient(140deg,#818cf8 0%,#c084fc 45%,#38bdf8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0 0 14px", fontFamily: "'Syne',sans-serif", letterSpacing: "-2.5px", lineHeight: 1.05 }}>
          PersonaAI
        </h1>
        <p style={{ color: "#334155", fontSize: 15, fontFamily: "Space Mono,monospace", margin: "0 0 10px" }}>
          Upload resume → Analyze behavior → Predict performance → Psychologically adapt
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 10 }}>
          {["Behavior Signals", "Cognitive State", "Prediction Engine", "Psych Adaptation", "Adaptive Roadmap + Nudges"].map((s, i, arr) => (
            <span key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "#0a0f1e", border: "1px solid #1e293b", color: "#475569", fontSize: 10, fontFamily: "Space Mono,monospace", padding: "3px 9px", borderRadius: 6 }}>{s}</span>
              {i < arr.length - 1 && <span style={{ color: "#1e293b", fontSize: 14 }}>&rarr;</span>}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card style={{ gridColumn: "1/-1" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 12, fontFamily: "Space Mono,monospace", letterSpacing: "0.07em" }}>📄 RESUME INPUT</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { fileRef.current.click(); behaviorTracker.recordAction("upload_click"); }} style={{ background: "#1e1b4b", border: "1px solid #4338ca", color: "#818cf8", borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "Space Mono,monospace" }}>Upload (txt/pdf/docx)</button>
              <input ref={fileRef} type="file" accept=".txt,.pdf,.docx" style={{ display: "none" }} onChange={e => { handleFileUpload(e.target.files[0]); }} />
            </div>
          </div>
          <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); handleFileUpload(e.dataTransfer.files[0]); }} style={{ border: `2px dashed ${dragging ? "#6366f1" : "#1e293b"}`, borderRadius: 12, transition: "border-color 0.2s" }}>
            <textarea value={resume} onChange={handleTextareaChange}
              style={{ width: "100%", minHeight: 190, background: "transparent", border: "none", color: "#cbd5e1", fontSize: 13, fontFamily: "Space Mono,monospace", resize: "vertical", outline: "none", padding: 16, boxSizing: "border-box", lineHeight: 1.65 }}
              placeholder="Paste resume text here, or drag & drop .txt, .pdf, or .docx file…" />
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 14px", color: "#e2e8f0", fontSize: 12, fontFamily: "Space Mono,monospace", letterSpacing: "0.07em" }}>🎯 TARGET ROLE (20 ROLES)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
            {Object.keys(ROLE_CATALOG).map(r => (
              <button key={r} onClick={() => handleRoleClick(r)} style={{ background: role === r ? "rgba(99,102,241,0.2)" : "transparent", border: `1px solid ${role === r ? "#6366f1" : "#1e293b"}`, color: role === r ? "#f1f5f9" : "#334155", borderRadius: 10, padding: "10px 14px", textAlign: "left", cursor: "pointer", fontFamily: "Space Mono,monospace", fontSize: 12, transition: "all 0.2s" }}>
                {r} {role === r && <span style={{ marginLeft: "auto", color: "#6366f1", fontSize: 9 }}>✓</span>}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 6px", color: "#e2e8f0", fontSize: 12, fontFamily: "Space Mono,monospace", letterSpacing: "0.07em" }}>🧠 MINDOS SIGNALS</h3>
          <div style={{ color: "#334155", fontSize: 10, fontFamily: "Space Mono,monospace", marginBottom: 14 }}>📡 Live behavioral signals also captured automatically</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {[
              { label: "Session Time (min)", val: session, set: setSession, min: 5, max: 120, col: "#06b6d4", hint: session >= 60 ? "Deep focus" : session >= 30 ? "Moderate" : "Short" },
              { label: "Task Completion %", val: tasks, set: setTasks, min: 0, max: 100, col: "#a855f7", hint: tasks >= 70 ? "High output" : tasks >= 40 ? "Moderate" : "Low output" },
              { label: "Avg Typing Delay (ms)", val: delay, set: setDelay, min: 50, max: 500, col: "#f59e0b", hint: delay <= 150 ? "Focused" : delay <= 300 ? "Normal" : "Distracted" },
            ].map(({ label, val, set, min, max, col, hint }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#475569", fontSize: 11, fontFamily: "Space Mono,monospace" }}>{label}</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: "#1e293b", fontSize: 10, fontFamily: "Space Mono,monospace" }}>{hint}</span>
                    <span style={{ color: col, fontSize: 13, fontWeight: 700, fontFamily: "Space Mono,monospace" }}>{val}</span>
                  </div>
                </div>
                <input type="range" min={min} max={max} value={val} onChange={e => handleSliderChange(set, Number(e.target.value))} style={{ width: "100%", accentColor: col, cursor: "pointer" }} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <button onClick={go} disabled={loading || !resume.trim()} style={{ marginTop: 22, width: "100%", padding: "17px", borderRadius: 14, background: loading ? "#0f172a" : "linear-gradient(135deg,#6366f1,#a855f7 55%,#06b6d4)", border: "none", color: "#fff", fontSize: 16, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Syne',sans-serif", boxShadow: loading ? "none" : "0 0 50px #6366f133,0 4px 24px rgba(99,102,241,0.3)", transition: "all 0.3s", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 58 }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ animation: "spin 0.7s linear infinite", display: "inline-block", fontSize: 18 }}>⚙️</span>
              <span style={{ fontFamily: "Space Mono,monospace", fontSize: 13, color: "#94a3b8" }}>{STEPS[step]}</span>
            </div>
            <div style={{ width: 280, height: 3, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${((step + 1) / STEPS.length) * 100}%`, height: "100%", background: "linear-gradient(90deg,#6366f1,#a855f7)", borderRadius: 2, transition: "width 0.4s ease" }} />
            </div>
          </div>
        ) : "🚀  Analyze & Predict My Performance →"}
      </button>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ data }) {
  const [tab, setTab] = useState("overview");
  const { skill, cognitive, prediction, roadmap, microWins, nudge, role, liveMetrics } = data;

  const TABS = [
    { id: "overview", label: "📊 Overview", icon: "📊" },
    { id: "cognitive", label: "🧠 Cognitive State", icon: "🧠" },
    { id: "psychology", label: "🎯 Psychology", icon: "🎯" },
    { id: "roadmap", label: "🗓️ Roadmap", icon: "🗓️" },
    { id: "jobs", label: "💼 Jobs Ready", icon: "💼" },
    { id: "enterprise", label: "🚀 Enterprise", icon: "🚀" },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 40px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ background: "rgba(99,102,241,0.1)", border: "1px solid #4338ca", borderRadius: 14, padding: "10px 16px", display: "inline-block", marginBottom: 16 }}>
          <span style={{ color: "#818cf8", fontSize: 12, fontFamily: "Space Mono,monospace", fontWeight: 600 }}>📋 ANALYSIS COMPLETE</span>
        </div>
        <h2 style={{ fontSize: 42, fontWeight: 900, background: "linear-gradient(140deg,#818cf8,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0 0 12px", fontFamily: "'Syne',sans-serif" }}>
          {role} Performance Profile
        </h2>
        <p style={{ color: "#475569", fontSize: 14, fontFamily: "Space Mono,monospace", margin: 0 }}>
          Real-time behavioral analysis + skill mapping + psychological adaptation
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32, overflowX: "auto", paddingBottom: 10, borderBottom: "1px solid #1e293b" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? "rgba(99,102,241,0.15)" : "transparent", border: `1px solid ${tab === t.id ? "#6366f1" : "#1e293b"}`, color: tab === t.id ? "#f1f5f9" : "#64748b", padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "Space Mono,monospace", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", transition: "all 0.2s" }}>
            {t.icon} {t.label.split(" ")[1]}
          </button>
        ))}
      </div>

      {/* TAB: OVERVIEW */}
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Card>
            <h4 style={{ margin: "0 0 12px", color: "#e2e8f0", fontSize: 12, fontFamily: "Space Mono,monospace" }}>🎯 SKILL MATCH</h4>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
              <Ring percentage={skill.matchPct} size={120} color="#6366f1" />
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#f1f5f9", fontFamily: "'Syne',sans-serif" }}>{skill.matchPct}%</div>
                <div style={{ color: "#94a3b8", fontSize: 11, fontFamily: "Space Mono,monospace" }}>Skill alignment with {role}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {skill.matched.slice(0, 4).map(s => (<span key={s} style={{ background: "#1e1b4b", border: "1px solid #4338ca", color: "#818cf8", fontSize: 9, padding: "3px 8px", borderRadius: 4, fontFamily: "Space Mono,monospace" }}>{s}</span>))}
                </div>
              </div>
            </div>
            <div style={{ borderTop: "1px solid #1e293b", paddingTop: 12 }}>
              <div style={{ color: "#94a3b8", fontSize: 10, fontFamily: "Space Mono,monospace", marginBottom: 8 }}>Missing Skills ({skill.missing.length}):</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {skill.missing.slice(0, 5).map(s => (<span key={s} style={{ background: "#3f0f1a", border: "1px solid #7f1d1d", color: "#fca5a5", fontSize: 9, padding: "3px 8px", borderRadius: 4, fontFamily: "Space Mono,monospace" }}>{s}</span>))}
              </div>
            </div>
          </Card>

          <Card>
            <h4 style={{ margin: "0 0 12px", color: "#e2e8f0", fontSize: 12, fontFamily: "Space Mono,monospace" }}>📊 PREDICTION MODEL</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Success Probability", val: prediction.success_prob, col: "#10b981" },
                { label: "Retention Risk", val: (prediction.churn_risk * 100).toFixed(0), col: "#f59e0b" },
                { label: "Advancement Potential", val: prediction.advancement_potential, col: "#6366f1" },
              ].map(p => (
                <div key={p.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, fontFamily: "Space Mono,monospace" }}>
                    <span style={{ color: "#94a3b8" }}>{p.label}</span>
                    <span style={{ color: p.col, fontWeight: 700 }}>{p.val}%</span>
                  </div>
                  <div style={{ width: "100%", height: 6, background: "#0f172a", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(p.val, 100)}%`, height: "100%", background: p.col, borderRadius: 3, transition: "width 0.5s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ gridColumn: "1/-1" }}>
            <h4 style={{ margin: "0 0 12px", color: "#e2e8f0", fontSize: 12, fontFamily: "Space Mono,monospace" }}>⚡ LIVE BEHAVIORAL SIGNALS</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {Object.entries(liveMetrics || {}).map(([k, v]) => (
                <div key={k} style={{ background: "rgba(99,102,241,0.05)", border: "1px solid #1e293b", borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <div style={{ color: "#94a3b8", fontSize: 10, fontFamily: "Space Mono,monospace", marginBottom: 6 }}>{k}</div>
                  <div style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 700, fontFamily: "'Syne',sans-serif" }}>{typeof v === "number" ? v.toFixed(1) : v}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB: COGNITIVE STATE */}
      {tab === "cognitive" && (
        <div>
          <Card style={{ marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 16px", color: "#e2e8f0", fontSize: 12, fontFamily: "Space Mono,monospace" }}>🧠 COGNITIVE STATE METRICS</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {[
                { k: "focus", v: cognitive.focus, col: "#06b6d4" },
                { k: "consistency", v: cognitive.consistency, col: "#8b5cf6" },
                { k: "productivity", v: cognitive.productivity, col: "#ec4899" },
              ].map(m => (
                <div key={m.k}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 11, fontFamily: "Space Mono,monospace" }}>
                    <span style={{ color: "#94a3b8" }}>📊 {m.k.toUpperCase()}</span>
                    <span style={{ color: m.col, fontWeight: 700 }}>{(m.v * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ width: "100%", height: 8, background: "#0f172a", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${m.v * 100}%`, height: "100%", background: m.col, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h4 style={{ margin: "0 0 12px", color: "#e2e8f0", fontSize: 12, fontFamily: "Space Mono,monospace" }}>💡 COGNITIVE INSIGHTS</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { icon: "⚙️", text: `Focus Level: ${cognitive.focus > 0.7 ? "🟢 Deep" : cognitive.focus > 0.4 ? "🟡 Moderate" : "🔴 Shallow"}` },
                { icon: "🎯", text: `Session Consistency: ${(cognitive.consistency * 100).toFixed(0)}% - ${cognitive.consistency > 0.7 ? "Very reliable workflows" : "Variable patterns"}` },
                { icon: "🔥", text: `Productivity Index: ${(cognitive.productivity * 100).toFixed(0)}% - ${cognitive.productivity > 0.75 ? "Excellent output" : "Room for optimization"}` },
              ].map((i, idx) => (
                <div key={idx} style={{ background: "rgba(99,102,241,0.05)", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", color: "#cbd5e1", fontSize: 12, fontFamily: "Space Mono,monospace" }}>
                  {i.icon} {i.text}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB: PSYCHOLOGY */}
      {tab === "psychology" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
          <FailureAwarenessBlock prediction={prediction} skill={skill} role={role} />
          <MicroWinChecklist microWins={microWins} focusLevel={cognitive.focusLevel} />
          <SmartNudge nudge={nudge} cognitiveState={cognitive} />
        </div>
      )}

      {/* TAB: ROADMAP */}
      {tab === "roadmap" && (
        <div>
          <Card style={{ marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 16px", color: "#e2e8f0", fontSize: 12, fontFamily: "Space Mono,monospace" }}>📅 12-WEEK LEARNING ROADMAP</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {roadmap.map((phase, i) => (
                <div key={i} style={{ background: "rgba(99,102,241,0.05)", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ background: "#6366f1", color: "#fff", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: "Space Mono,monospace", fontSize: 14 }}>W{phase.week}</div>
                    <div>
                      <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 13, fontFamily: "Space Mono,monospace" }}>{phase.topic}</div>
                      <div style={{ color: "#94a3b8", fontSize: 10, fontFamily: "Space Mono,monospace" }}>Priority: {phase.priority}</div>
                    </div>
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 11, fontFamily: "Space Mono,monospace", lineHeight: 1.6 }}>{phase.description}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    {phase.skills.map(s => (<span key={s} style={{ background: "#1e1b4b", border: "1px solid #4338ca", color: "#818cf8", fontSize: 9, padding: "3px 8px", borderRadius: 4, fontFamily: "Space Mono,monospace" }}>{s}</span>))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB: JOBS READY */}
      {tab === "jobs" && (
        <div>
          <Card style={{ marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 16px", color: "#e2e8f0", fontSize: 12, fontFamily: "Space Mono,monospace" }}>💼 RECOMMENDED JOB POSITIONS</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {(JOB_MATCH[role] || []).map((job, i) => (
                <div key={i} style={{ background: "rgba(99,102,241,0.05)", border: "1px solid #1e293b", borderRadius: 10, padding: 14 }}>
                  <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 12, fontFamily: "Space Mono,monospace", marginBottom: 6 }}>💼 {job}</div>
                  <div style={{ color: "#94a3b8", fontSize: 10, fontFamily: "Space Mono,monospace", lineHeight: 1.5 }}>
                    Skill match: <span style={{ color: "#10b981", fontWeight: 700 }}>{skill.matchPct}%</span> aligned with {job.toLowerCase()} requirements
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB: ENTERPRISE */}
      {tab === "enterprise" && (
        <div>
          <Card>
            <h4 style={{ margin: "0 0 12px", color: "#e2e8f0", fontSize: 12, fontFamily: "Space Mono,monospace" }}>🚀 ENTERPRISE INTELLIGENCE</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "rgba(99,102,241,0.05)", border: "1px solid #1e293b", borderRadius: 10, padding: 14 }}>
                <div style={{ color: "#818cf8", fontWeight: 700, fontSize: 11, fontFamily: "Space Mono,monospace", marginBottom: 6 }}>📊 TEAM PLACEMENT SCORE</div>
                <div style={{ color: "#cbd5e1", fontSize: 12, fontFamily: "Space Mono,monospace", lineHeight: 1.6 }}>
                  Based on {role} profile: <span style={{ color: "#a855f7", fontWeight: 700 }}>{(skill.matchPct * 0.85 + cognitive.productivity * 15).toFixed(0)}/100</span><br/>
                  Recommendation: {skill.matchPct > 70 ? "✅ Ready for senior roles" : skill.matchPct > 50 ? "🟡 Ready for mid-level roles" : "🔄 Continue developing core skills"}
                </div>
              </div>
              <div style={{ background: "rgba(99,102,241,0.05)", border: "1px solid #1e293b", borderRadius: 10, padding: 14 }}>
                <div style={{ color: "#a855f7", fontWeight: 700, fontSize: 11, fontFamily: "Space Mono,monospace", marginBottom: 6 }}>🎯 ROLE LONGEVITY</div>
                <div style={{ color: "#cbd5e1", fontSize: 12, fontFamily: "Space Mono,monospace" }}>
                  Predicted tenure in {role}: <span style={{ color: "#10b981", fontWeight: 700 }}>{(prediction.churn_risk < 0.3 ? "24+ months" : prediction.churn_risk < 0.6 ? "12-18 months" : "6-12 months")}</span><br/>
                  Churn risk: <span style={{ color: prediction.churn_risk > 0.6 ? "#ef4444" : prediction.churn_risk > 0.3 ? "#f59e0b" : "#10b981", fontWeight: 700 }}>{(prediction.churn_risk * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [result, setResult] = useState(null);
  return (
    <div style={{ minHeight: "100vh", background: "#020817", backgroundImage: "radial-gradient(ellipse 70% 50% at 5% 0%,rgba(99,102,241,0.13) 0%,transparent 100%),radial-gradient(ellipse 50% 40% at 95% 100%,rgba(168,85,247,0.09) 0%,transparent 100%)", color: "#f1f5f9" }}>
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
      <nav style={{ borderBottom: "1px solid #0a0f1e", background: "rgba(2,8,23,0.94)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "13px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, boxShadow: "0 0 24px #6366f133" }}>⚡</div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 19, background: "linear-gradient(135deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PersonaAI</span>
            <span style={{ background: "#0a0f1e", border: "1px solid #1e293b", color: "#1e293b", fontSize: 10, borderRadius: 4, padding: "2px 7px", fontFamily: "Space Mono,monospace" }}>v2.0 · 20 Roles</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "#1e293b", fontSize: 11, fontFamily: "Space Mono,monospace" }}>AI-Powered Performance Analysis</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(74,222,128,0.07)", border: "1px solid #166534", borderRadius: 999, padding: "3px 10px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80", display: "inline-block", animation: "pulse 2s infinite" }} />
              <span style={{ color: "#4ade80", fontSize: 10, fontFamily: "Space Mono,monospace" }}>LIVE</span>
            </div>
          </div>
        </div>
      </nav>
      <div style={{ padding: "44px 0 70px" }}>
        {result ? <Dashboard data={result} /> : <UploadPage onAnalyze={setResult} />}
      </div>
      {result && (
        <div style={{ position: "fixed", bottom: 30, left: 30, zIndex: 50 }}>
          <button onClick={() => setResult(null)} style={{ background: "rgba(99,102,241,0.15)", border: "1px solid #6366f1", color: "#818cf8", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontFamily: "Space Mono,monospace", fontSize: 12, fontWeight: 600, transition: "all 0.2s" }}>
            ← New Analysis
          </button>
        </div>
      )}
    </div>
  );
}
