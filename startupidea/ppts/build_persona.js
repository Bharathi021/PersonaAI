const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");

// Resolve assets from the current workspace first, then fallback to hardcoded extraction paths.
const WORKSPACE_DIR = __dirname;
const TRANSPARENT_PNG_BASE64 = "image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X9WQAAAAASUVORK5CYII=";

function loadImageBase64(...candidatePaths) {
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return "image/png;base64," + fs.readFileSync(p).toString("base64");
    }
  }
  return TRANSPARENT_PNG_BASE64;
}

const img1Base64 = loadImageBase64(
  path.join(WORKSPACE_DIR, "ppt", "media", "image1.png"),
  path.join(WORKSPACE_DIR, "media", "image1.png"),
  "/home/claude/unpacked/ppt/media/image1.png"
);
const img2Base64 = loadImageBase64(
  path.join(WORKSPACE_DIR, "ppt", "media", "image2.png"),
  path.join(WORKSPACE_DIR, "media", "image2.png"),
  "/home/claude/unpacked/ppt/media/image2.png"
);

// Icon helper
async function iconToBase64Png(IconComponent, color, size = 256) {
  const { createElement } = React;
  const svg = ReactDOMServer.renderToStaticMarkup(
    createElement(IconComponent, { color, size: String(size) })
  );
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}

// Color palette - Deep navy + cyan accent (AI/tech)
const NAVY    = "0D1B3E";   // deep navy bg
const BLUE    = "1A3A6B";   // mid blue
const CYAN    = "00C6FF";   // cyan accent
const WHITE   = "FFFFFF";
const LGRAY   = "E8F4FF";   // light background for content slides
const DGRAY   = "334155";   // dark text
const ACCENT  = "F59E0B";   // amber highlight for key words
const FOOTER  = "1565C0";   // blue footer bar

// Shared helpers
function addHeader(slide, teamName) {
  // Left oval team badge
  slide.addShape("ellipse", {
    x: 0.18, y: 0.12, w: 1.1, h: 0.55,
    fill: { color: WHITE },
    line: { color: BLUE, width: 1.5 }
  });
  slide.addText(teamName, {
    x: 0.18, y: 0.12, w: 1.1, h: 0.55,
    fontSize: 8, bold: true, color: NAVY,
    align: "center", valign: "middle", margin: 0
  });
  // Right logo
  slide.addImage({ data: img1Base64, x: 8.9, y: 0.05, w: 1.0, h: 0.6 });
}

function addFooter(slide, pageNum) {
  // Blue footer bar
  slide.addShape("rect", {
    x: 0, y: 5.3, w: 10, h: 0.325,
    fill: { color: FOOTER },
    line: { color: FOOTER }
  });
  if (pageNum) {
    slide.addText(String(pageNum), {
      x: 9.3, y: 5.3, w: 0.5, h: 0.325,
      fontSize: 12, bold: true, color: WHITE,
      align: "center", valign: "middle", margin: 0
    });
  }
}

function sectionHeader(slide, text, x, y, w, h, bgColor) {
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: bgColor || BLUE },
    line: { color: bgColor || BLUE }
  });
  slide.addText(text, {
    x, y, w, h,
    fontSize: 11, bold: true, color: WHITE,
    align: "left", valign: "middle", margin: [0, 0, 0, 8]
  });
}

async function buildPresentation() {
  const { FaBrain, FaExclamationTriangle, FaLightbulb, FaCogs, FaChartLine, FaCheckCircle, FaUsers, FaRocket, FaShieldAlt, FaGlobe } = require("react-icons/fa");

  const iconBrain     = await iconToBase64Png(FaBrain, "#00C6FF");
  const iconWarn      = await iconToBase64Png(FaExclamationTriangle, "#F59E0B");
  const iconIdea      = await iconToBase64Png(FaLightbulb, "#00C6FF");
  const iconCogs      = await iconToBase64Png(FaCogs, "#00C6FF");
  const iconChart     = await iconToBase64Png(FaChartLine, "#00C6FF");
  const iconCheck     = await iconToBase64Png(FaCheckCircle, "#22C55E");
  const iconUsers     = await iconToBase64Png(FaUsers, "#00C6FF");
  const iconRocket    = await iconToBase64Png(FaRocket, "#F59E0B");
  const iconShield    = await iconToBase64Png(FaShieldAlt, "#00C6FF");
  const iconGlobe     = await iconToBase64Png(FaGlobe, "#00C6FF");

  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.title = "PersonaAI — Predictive Intelligence for Human Performance";

  const TEAM = "404 Found Us";

  // ───────────────────────────────────────────────────────────────────────
  // SLIDE 1 — TITLE / COVER
  // ───────────────────────────────────────────────────────────────────────
  {
    const s = pres.addSlide();
    // Dark bg
    s.background = { color: NAVY };

    // SRM logos top right
    s.addImage({ data: img2Base64, x: 7.5, y: 0.12, w: 2.3, h: 0.6 });

    // Main hackathon logo centre-right
    s.addImage({ data: img1Base64, x: 6.0, y: 1.4, w: 3.6, h: 2.1 });

    // Cyan accent bar left
    s.addShape("rect", { x: 0, y: 0, w: 0.08, h: 5.625, fill: { color: CYAN }, line: { color: CYAN } });

    // Event title
    s.addText([
      { text: "Startup ", options: { color: WHITE } },
      { text: '"முதல் படி"', options: { color: CYAN } },
    ], { x: 0.3, y: 0.15, w: 7.0, h: 0.55, fontSize: 22, bold: true, margin: 0 });

    s.addText("Idea Level Hackathon 2026", {
      x: 0.3, y: 0.65, w: 7.0, h: 0.45,
      fontSize: 16, bold: false, color: LGRAY, margin: 0
    });

    // Divider
    s.addShape("rect", { x: 0.3, y: 1.22, w: 5.4, h: 0.04, fill: { color: CYAN }, line: { color: CYAN } });

    // Project title
    s.addText("PersonaAI", {
      x: 0.3, y: 1.35, w: 5.5, h: 0.85,
      fontSize: 42, bold: true, color: WHITE, margin: 0
    });
    s.addText("Predictive Intelligence for Human Performance", {
      x: 0.3, y: 2.18, w: 5.5, h: 0.5,
      fontSize: 15, italic: true, color: CYAN, margin: 0
    });
    s.addText("\"We don't just analyze skills - we predict performance.\"", {
      x: 0.3, y: 2.58, w: 5.5, h: 0.24,
      fontSize: 10.5, bold: true, italic: true, color: WHITE, margin: 0
    });

    // Info cards
    const infos = [
      ["Theme",       "Best - Predictive Performance Intelligence"],
      ["Category",    "Software / AI"],
      ["Team ID",     "SMP25_1140"],
      ["Team Name",   "404 Found Us"],
      ["Mentor",      "Dr. M. Sakthi Asvini"],
      ["Date",        "28-03-2026"],
    ];

    infos.forEach(([label, value], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.3 + col * 2.85;
      const y = 2.85 + row * 0.72;
      s.addShape("rect", { x, y, w: 2.6, h: 0.6, fill: { color: BLUE }, line: { color: CYAN, width: 0.5 } });
      s.addText(label.toUpperCase(), { x, y: y + 0.03, w: 2.6, h: 0.22, fontSize: 7, color: CYAN, bold: true, align: "center", margin: 0 });
      s.addText(value, { x, y: y + 0.28, w: 2.6, h: 0.28, fontSize: 10, color: WHITE, bold: true, align: "center", margin: 0 });
    });

    // Footer bar
    s.addShape("rect", { x: 0, y: 5.3, w: 10, h: 0.325, fill: { color: FOOTER }, line: { color: FOOTER } });
  }

  // ───────────────────────────────────────────────────────────────────────
  // SLIDE 2 — IDEA TITLE / PROPOSED SOLUTION
  // ───────────────────────────────────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: LGRAY };
    addHeader(s, TEAM);
    addFooter(s, 2);

    // Slide heading bar
    s.addShape("rect", { x: 0, y: 0.82, w: 10, h: 0.7, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText("CORE IDEA + PROBLEM", {
      x: 0.3, y: 0.82, w: 9.4, h: 0.7,
      fontSize: 26, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0
    });

    // PersonaAI tagline
    s.addText("PersonaAI — Predictive Intelligence for Human Performance", {
      x: 0.3, y: 1.62, w: 9.4, h: 0.4,
      fontSize: 13, bold: true, color: NAVY, align: "center", margin: 0
    });

    // Three columns
    const cols = [
      {
        icon: iconBrain,
        title: "What It Does",
        color: NAVY,
        points: [
          "Analyzes skills + real-world behavior patterns",
          "Maps skills to live industry demand",
          "Detects focus, consistency & attention patterns (MindOS layer)",
          "Predicts success or failure for target roles",
          "Generates adaptive execution roadmap",
        ]
      },
      {
        icon: iconWarn,
        title: "Problem It Solves",
        color: "B91C1C",
        points: [
          "Knowledge ≠ real-world performance",
          "High digital distraction (reels, short-form content)",
          "Reduced attention span -> inconsistent execution",
          "Students fail despite learning",
          "No system connects skill + focus -> performance",
        ]
      },
      {
        icon: iconIdea,
        title: "Why It's Unique",
        color: "065F46",
        points: [
          "Predicts outcomes — not just tracks progress",
          "Combines Skill Intelligence + Cognitive Intelligence (MindOS)",
          "Detects skill gap + performance gap",
          "Identifies distraction-driven performance drops",
          "Privacy-first: user-controlled local processing",
        ]
      },
    ];

    cols.forEach((col, i) => {
      const x = 0.25 + i * 3.2;
      // Card bg
      s.addShape("rect", { x, y: 2.02, w: 3.0, h: 2.82,
        fill: { color: WHITE },
        line: { color: col.color, width: 1.5 },
        shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 135, opacity: 0.1 }
      });
      // Accent top strip
      s.addShape("rect", { x, y: 2.02, w: 3.0, h: 0.3, fill: { color: col.color }, line: { color: col.color } });
      // Icon
      s.addImage({ data: col.icon, x: x + 0.1, y: 2.04, w: 0.24, h: 0.24 });
      // Title
      s.addText(col.title, {
        x: x + 0.38, y: 2.04, w: 2.55, h: 0.25,
        fontSize: 10, bold: true, color: WHITE, valign: "middle", margin: 0
      });
      // Bullets
      const bulletItems = col.points.map((p, pi) => ({
        text: p,
        options: { bullet: { code: "25B8" }, breakLine: pi < col.points.length - 1, color: DGRAY, fontSize: 8.6, paraSpaceAfter: 3 }
      }));
      s.addText(bulletItems, {
        x: x + 0.12, y: 2.36, w: 2.75, h: 2.35,
        valign: "top", margin: [4, 4, 4, 4]
      });
    });

    s.addShape("rect", {
      x: 0.25, y: 4.9, w: 9.5, h: 0.28,
      fill: { color: "FFF7ED" }, line: { color: "F59E0B", width: 1 }
    });
    s.addText("Even skilled individuals fail due to lack of attention and execution clarity.", {
      x: 0.35, y: 4.9, w: 9.3, h: 0.28,
      fontSize: 9.5, bold: true, color: "7C2D12", align: "center", valign: "middle", margin: 0
    });
  }

  // ───────────────────────────────────────────────────────────────────────
  // SLIDE 3 — TECHNICAL APPROACH
  // ───────────────────────────────────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: LGRAY };
    addHeader(s, TEAM);
    addFooter(s, 3);

    s.addShape("rect", { x: 0, y: 0.82, w: 10, h: 0.7, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText("SYSTEM + DEMO", {
      x: 0.3, y: 0.82, w: 9.4, h: 0.7,
      fontSize: 24, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0
    });

    // Left column: Core technology
    const leftX = 0.25;
    sectionHeader(s, "Core Technology", leftX, 1.65, 4.4, 0.35, BLUE);

    const techItems = [
      ["NLP Engine", "Skill extraction"],
      ["Behavioral Engine", "Focus & consistency detection"],
      ["Prediction Model", "Readiness scoring"],
      ["Backend", "FastAPI"],
      ["Frontend", "React"],
    ];

    techItems.forEach(([label, desc], i) => {
      const y = 2.0 + i * 0.37;
      s.addShape("rect", { x: leftX, y, w: 4.4, h: 0.35,
        fill: { color: i % 2 === 0 ? WHITE : "EBF5FF" },
        line: { color: "CBD5E1", width: 0.5 }
      });
      s.addText(label + ":", { x: leftX + 0.1, y, w: 1.45, h: 0.35,
        fontSize: 8.6, bold: true, color: NAVY, valign: "middle", margin: 0 });
      s.addText(desc, { x: leftX + 1.6, y, w: 2.7, h: 0.35,
        fontSize: 8.6, color: DGRAY, valign: "middle", margin: 0 });
    });

    // Right column: System flow
    const rightX = 5.0;
    sectionHeader(s, "System Flow", rightX, 1.65, 4.75, 0.35, BLUE);

    const steps = [
      ["1", "Input", "Resume + target role"],
      ["2", "Skill Analysis", "Gap vs industry"],
      ["3", "Behavior Analysis", "Focus & consistency"],
      ["4", "Prediction", "Success / failure"],
      ["5", "Roadmap", "Actionable steps"],
      ["6", "Learning Loop", "Continuous improvement"],
    ];

    steps.forEach(([num, title, desc], i) => {
      const y = 2.0 + i * 0.37;
      // Step number circle
      s.addShape("ellipse", { x: rightX + 0.05, y: y + 0.03, w: 0.28, h: 0.28,
        fill: { color: CYAN }, line: { color: CYAN } });
      s.addText(num, { x: rightX + 0.05, y: y + 0.03, w: 0.28, h: 0.28,
        fontSize: 8.5, bold: true, color: NAVY, align: "center", valign: "middle", margin: 0 });
      s.addShape("rect", { x: rightX + 0.4, y, w: 4.3, h: 0.35,
        fill: { color: i % 2 === 0 ? WHITE : "EBF5FF" },
        line: { color: "CBD5E1", width: 0.5 }
      });
      s.addText(title + ":", { x: rightX + 0.52, y, w: 1.55, h: 0.35,
        fontSize: 8.6, bold: true, color: NAVY, valign: "middle", margin: 0 });
      s.addText(desc, { x: rightX + 2.12, y, w: 2.5, h: 0.35,
        fontSize: 8.6, color: DGRAY, valign: "middle", margin: 0 });
    });

    // Demo output callout
    s.addShape("rect", { x: 0.25, y: 4.28, w: 9.5, h: 0.9,
      fill: { color: "FFF7ED" }, line: { color: "F59E0B", width: 1.2 }
    });
    s.addText("Demo Output: Backend Role -> Likely Failure", {
      x: 0.4, y: 4.35, w: 9.1, h: 0.2,
      fontSize: 11, bold: true, color: "7C2D12", margin: 0
    });
    s.addText("Reason: No deployment experience | Low consistency (distraction patterns) | Weak project depth", {
      x: 0.4, y: 4.58, w: 9.1, h: 0.18,
      fontSize: 9, color: DGRAY, margin: 0
    });
    s.addText("\"We simulate real-world outcomes before you apply.\"", {
      x: 0.4, y: 4.82, w: 9.1, h: 0.2,
      fontSize: 10, bold: true, italic: true, color: NAVY, margin: 0
    });
  }

  // ───────────────────────────────────────────────────────────────────────
  // SLIDE 4 — FEASIBILITY & VIABILITY
  // ───────────────────────────────────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: LGRAY };
    addHeader(s, TEAM);
    addFooter(s, 4);

    s.addShape("rect", { x: 0, y: 0.82, w: 10, h: 0.7, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText("FEASIBILITY + BUSINESS", {
      x: 0.3, y: 0.82, w: 9.4, h: 0.7,
      fontSize: 24, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0
    });

    const blocks = [
      {
        title: "Market Insight",
        color: NAVY,
        items: [
          "Majority of learners lack execution clarity",
          "Existing tools ignore behavior patterns",
          "Rising demand for AI-driven performance systems",
        ]
      },
      {
        title: "Feasibility",
        color: "065F46",
        items: [
          "MVP buildable within hackathon scope",
          "Lightweight models + rule-based logic",
          "No heavy infrastructure required",
          "Fast adaptation via onboarding",
        ]
      },
      {
        title: "Challenges & Solutions",
        color: "92400E",
        items: [
          "Cold Start -> onboarding + adaptive learning",
          "Privacy -> local processing",
          "Accuracy -> continuous refinement",
          "Adoption -> freemium model",
        ]
      },
      {
        title: "Revenue Model",
        color: "1E40AF",
        items: [
          "Freemium -> basic insights",
          "Premium -> advanced roadmap",
          "Enterprise -> workforce analytics",
        ]
      },
    ];

    blocks.forEach((block, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.3 + col * 4.85;
      const y = 1.7 + row * 1.63;
      s.addShape("rect", { x, y, w: 4.55, h: 1.5,
        fill: { color: WHITE },
        line: { color: block.color, width: 1.2 }
      });
      s.addShape("rect", { x, y, w: 4.55, h: 0.3, fill: { color: block.color }, line: { color: block.color } });
      s.addText(block.title, {
        x: x + 0.12, y: y + 0.03, w: 4.3, h: 0.22,
        fontSize: 10, bold: true, color: WHITE, margin: 0
      });
      const bulletItems = block.items.map((p, pi) => ({
        text: p,
        options: { bullet: { code: "25B8" }, breakLine: pi < block.items.length - 1, color: DGRAY, fontSize: 9.2, paraSpaceAfter: 3 }
      }));
      s.addText(bulletItems, { x: x + 0.12, y: y + 0.36, w: 4.25, h: 1.08, valign: "top", margin: [2, 2, 2, 2] });
    });
  }

  // ───────────────────────────────────────────────────────────────────────
  // SLIDE 5 — IMPACT & BENEFITS
  // ───────────────────────────────────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: LGRAY };
    addHeader(s, TEAM);
    addFooter(s, 5);

    s.addShape("rect", { x: 0, y: 0.82, w: 10, h: 0.7, fill: { color: NAVY }, line: { color: NAVY } });
    s.addText("IMPACT + MINDOS POWER", {
      x: 0.3, y: 0.82, w: 9.4, h: 0.7,
      fontSize: 24, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0
    });

    // Target audience row
    sectionHeader(s, "Impact", 0.25, 1.68, 9.5, 0.32, BLUE);

    const audiences = [
      { icon: iconUsers, title: "Students", desc: "Identify skill + focus gaps early\nImprove real-world readiness" },
      { icon: iconRocket, title: "Job Seekers", desc: "Predict interview success\nReduce job search time" },
      { icon: iconCogs, title: "Professionals", desc: "Detect low focus & burnout\nAlign work with peak performance" },
      { icon: iconGlobe, title: "Organizations", desc: "Evaluate workforce capability\nOptimize training strategies" },
    ];

    audiences.forEach((aud, i) => {
      const x = 0.25 + i * 2.4;
      s.addShape("rect", { x, y: 2.1, w: 2.2, h: 1.5,
        fill: { color: WHITE }, line: { color: CYAN, width: 1.2 },
        shadow: { type: "outer", color: "000000", blur: 5, offset: 2, angle: 135, opacity: 0.1 }
      });
      s.addImage({ data: aud.icon, x: x + 0.82, y: 2.15, w: 0.38, h: 0.38 });
      s.addText(aud.title, { x, y: 2.58, w: 2.2, h: 0.28, fontSize: 10, bold: true, color: NAVY, align: "center", margin: 0 });
      s.addText(aud.desc, { x, y: 2.86, w: 2.2, h: 0.7, fontSize: 8.5, color: DGRAY, align: "center", margin: 0 });
    });

    // Benefits grid
    sectionHeader(s, "Key Benefits", 0.25, 3.75, 9.5, 0.32, BLUE);

    const benefits = [
      { icon: iconBrain,  title: "Skill Intelligence", text: "What you know" },
      { icon: iconCogs,   title: "Cognitive Intelligence (MindOS)", text: "How you perform" },
      { icon: iconChart,  title: "Outcome Prediction", text: "Will you succeed" },
      { icon: iconCheck,  title: "Adaptive Roadmaps", text: "What to do next" },
    ];

    benefits.forEach((b, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.25 + col * 4.85;
      const y = 4.06 + row * 0.5;
      s.addShape("rect", { x, y, w: 4.6, h: 0.46,
        fill: { color: WHITE }, line: { color: "CBD5E1", width: 0.5 }
      });
      s.addImage({ data: b.icon, x: x + 0.1, y: y + 0.09, w: 0.28, h: 0.28 });
      s.addText(b.title + ":", { x: x + 0.46, y, w: 2.2, h: 0.46,
        fontSize: 9.2, bold: true, color: NAVY, valign: "middle", margin: 0 });
      s.addText(b.text, { x: x + 2.7, y, w: 1.75, h: 0.46,
        fontSize: 8.8, color: DGRAY, valign: "middle", margin: 0 });
    });

    s.addShape("rect", { x: 0.25, y: 5.05, w: 9.5, h: 0.16,
      fill: { color: "EFF6FF" }, line: { color: "1D4ED8", width: 1 }
    });
    s.addText("\"We don't just measure knowledge - we predict execution.\"", {
      x: 0.35, y: 5.05, w: 9.3, h: 0.16,
      fontSize: 8.8, bold: true, italic: true, color: NAVY, align: "center", valign: "middle", margin: 0
    });
  }

  // ───────────────────────────────────────────────────────────────────────
  // SLIDE 6 — RESEARCH & REFERENCES
  // ───────────────────────────────────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: NAVY };

    // Header with logos
    s.addImage({ data: img2Base64, x: 0.2, y: 0.1, w: 2.3, h: 0.6 });
    s.addImage({ data: img1Base64, x: 8.85, y: 0.05, w: 1.0, h: 0.6 });

    // Oval team badge
    s.addShape("ellipse", { x: 4.2, y: 0.1, w: 1.6, h: 0.5,
      fill: { color: NAVY, transparency: 100 }, line: { color: CYAN, width: 1.5 } });
    s.addText(TEAM, { x: 4.2, y: 0.1, w: 1.6, h: 0.5,
      fontSize: 9, bold: true, color: CYAN, align: "center", valign: "middle", margin: 0 });

    s.addShape("rect", { x: 0, y: 0.82, w: 10, h: 0.7, fill: { color: BLUE }, line: { color: BLUE } });
    s.addText("RESEARCH & REFERENCES", {
      x: 0.3, y: 0.82, w: 9.4, h: 0.7,
      fontSize: 24, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0
    });

    // Left column: Research basis
    sectionHeader(s, "📚  Research Foundation", 0.25, 1.7, 4.5, 0.32, "1E40AF");

    const research = [
      ["Behavioral Analytics", "Fogg, B.J. — Persuasive Technology (2003)"],
      ["Skill Gap Analysis",   "World Economic Forum — Future of Jobs (2023)"],
      ["Outcome Prediction",   "Bandura — Self-efficacy theory (1997)"],
      ["NLP for Resumes",      "BERT: Pre-training of Deep Bidirectional Transformers"],
      ["EdTech Personalization","Bloom's 2 Sigma Problem — tutoring effectiveness"],
    ];

    research.forEach(([topic, ref], i) => {
      const y = 2.1 + i * 0.56;
      s.addShape("rect", { x: 0.25, y, w: 4.5, h: 0.5,
        fill: { color: "0F2A5A" }, line: { color: "1E40AF", width: 0.5 }
      });
      s.addText(topic + ":", { x: 0.38, y, w: 1.5, h: 0.5,
        fontSize: 9, bold: true, color: CYAN, valign: "middle", margin: 0 });
      s.addText(ref, { x: 1.9, y, w: 2.7, h: 0.5,
        fontSize: 8.5, color: LGRAY, valign: "middle", margin: 0 });
    });

    // Right column: Links & tools
    sectionHeader(s, "🔗  Tools & API References", 5.1, 1.7, 4.65, 0.32, "1E40AF");

    const links = [
      ["LinkedIn API",    "developer.linkedin.com/docs"],
      ["GitHub REST API", "docs.github.com/en/rest"],
      ["Hugging Face",    "huggingface.co/docs/transformers"],
      ["FastAPI",         "fastapi.tiangolo.com"],
      ["React.js",        "react.dev/learn"],
      ["spaCy NLP",       "spacy.io/usage"],
    ];

    links.forEach(([tool, url], i) => {
      const y = 2.1 + i * 0.47;
      s.addShape("rect", { x: 5.1, y, w: 4.65, h: 0.42,
        fill: { color: "0F2A5A" }, line: { color: "1E40AF", width: 0.5 }
      });
      s.addText("›  " + tool + ":", { x: 5.2, y, w: 1.6, h: 0.42,
        fontSize: 9, bold: true, color: CYAN, valign: "middle", margin: 0 });
      s.addText(url, { x: 6.85, y, w: 2.8, h: 0.42,
        fontSize: 8.5, color: LGRAY, valign: "middle", italic: true, margin: 0 });
    });

    // Closing tagline
    s.addShape("rect", { x: 0.25, y: 4.85, w: 9.5, h: 0.35, fill: { color: CYAN }, line: { color: CYAN } });
    s.addText("PersonaAI transforms distracted learning into predictive performance intelligence.", {
      x: 0.25, y: 4.85, w: 9.5, h: 0.35,
      fontSize: 10, bold: true, italic: true, color: NAVY,
      align: "center", valign: "middle", margin: 0
    });

    // Footer
    s.addShape("rect", { x: 0, y: 5.3, w: 10, h: 0.325, fill: { color: FOOTER }, line: { color: FOOTER } });
    s.addText("6", { x: 9.3, y: 5.3, w: 0.5, h: 0.325,
      fontSize: 12, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0 });
  }

  // Save
  await pres.writeFile({ fileName: path.join(WORKSPACE_DIR, "PersonaAI_404FoundUs_Refined.pptx") });
  console.log("Done!");
}

buildPresentation().catch(console.error);