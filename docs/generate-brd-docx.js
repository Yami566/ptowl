const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat
} = require("docx");

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };
const headerShading = { fill: "2D6A4F", type: ShadingType.CLEAR };
const headerRun = { bold: true, color: "FFFFFF", font: "Arial", size: 20 };
const bodyRun = { font: "Arial", size: 20 };
const boldRun = { font: "Arial", size: 20, bold: true };

function makeHeaderCell(text, width) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: headerShading, margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ ...headerRun, text })] })]
  });
}

function makeCell(text, width, opts = {}) {
  const runs = [];
  // Support bold segments with **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ ...boldRun, text: part.slice(2, -2) }));
    } else {
      runs.push(new TextRun({ ...bodyRun, text: part }));
    }
  }
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    shading: opts.shading,
    children: [new Paragraph({ children: runs })]
  });
}

function makeTable(headers, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((h, i) => makeHeaderCell(h, colWidths[i])) }),
      ...rows.map(row => new TableRow({
        children: row.map((cell, i) => makeCell(cell, colWidths[i]))
      }))
    ]
  });
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 32, color: "2D6A4F" })] });
}

function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 26, color: "2D6A4F" })] });
}

function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 22, color: "333333" })] });
}

function para(text, opts = {}) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ ...boldRun, text: part.slice(2, -2) }));
    } else {
      runs.push(new TextRun({ ...bodyRun, text: part }));
    }
  }
  return new Paragraph({ spacing: { after: 120 }, ...opts, children: runs });
}

function bullet(text, ref, level = 0) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ ...boldRun, text: part.slice(2, -2) }));
    } else {
      runs.push(new TextRun({ ...bodyRun, text: part }));
    }
  }
  return new Paragraph({
    numbering: { reference: ref, level },
    spacing: { after: 60 },
    children: runs
  });
}

function numbered(text, ref, level = 0) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ ...boldRun, text: part.slice(2, -2) }));
    } else {
      runs.push(new TextRun({ ...bodyRun, text: part }));
    }
  }
  return new Paragraph({
    numbering: { reference: ref, level },
    spacing: { after: 60 },
    children: runs
  });
}

const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1440, hanging: 360 } } } }
      ]},
      { reference: "numbers1", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]},
      { reference: "numbers2", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]},
      { reference: "numbers3", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]},
      { reference: "numbers4", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]},
      { reference: "numbers5", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]},
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "2D6A4F" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "2D6A4F" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: "333333" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2D6A4F", space: 1 } },
          children: [
            new TextRun({ text: "PTOWL Business Requirements Document", font: "Arial", size: 16, color: "999999" }),
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 1 } },
          children: [
            new TextRun({ text: "PTOWL BRD v1.0  |  Page ", font: "Arial", size: 16, color: "999999" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "999999" }),
          ]
        })]
      })
    },
    children: [
      // Title page
      new Paragraph({ spacing: { before: 3600 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "PTOWL", font: "Arial", size: 72, bold: true, color: "2D6A4F" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
        children: [new TextRun({ text: "Business Requirements Document", font: "Arial", size: 36, color: "666666" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [new TextRun({ text: "Version 1.0  |  March 16, 2026", font: "Arial", size: 22, color: "999999" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [new TextRun({ text: "Status: Approved", font: "Arial", size: 22, color: "2D6A4F", bold: true })] }),
      new Paragraph({ children: [new PageBreak()] }),

      // Section 1: Executive Summary
      h1("1. Executive Summary"),
      para("PTOWL is a focused scheduling tool for Physical Therapists (PTs), doctors, and clinic staff. It generates complete PT appointment schedules in 3 keypresses \u2014 faster than any competing product on the market. The product is live at ptowl.com with active user onboarding."),
      para("PTOWL is **not** an EMR, a billing system, or bloatware. It does one thing \u2014 schedule generation \u2014 and does it 100x faster than the nearest competitor."),

      // Section 2: Problem Statement
      h1("2. Problem Statement"),
      h2("The Pain"),
      para("Physical therapists lose **5+ hours per week** to scheduling inefficiency. 57% of PTs cite documentation and scheduling as their **#1 cause of burnout**. The current software landscape forces PTs to choose between:"),
      numbered("**Expensive, bloated EMR systems** ($39-500/month) that include scheduling as an afterthought buried under features they don\u2019t need", "numbers1"),
      numbered("**Manual methods** (Excel templates, paper, whiteboards) that are error-prone and produce no appointment reminders", "numbers1"),
      numbered("**Nothing** \u2014 17% of healthcare workers already use unauthorized \u201Cshadow\u201D tools because their clinic software is too slow", "numbers1"),

      h2("The Gap"),
      makeTable(
        ["Price Range", "What Exists"],
        [
          ["$0", "Excel templates on Etsy ($3-15 one-time)"],
          ["**$3-30/mo**", "**NOBODY \u2014 this is PTOWL**"],
          ["$39-54/mo", "Jane App, SimplePractice, TheraPlatform"],
          ["$79-200/mo", "SPRY, WebPT, Prompt EMR"],
          ["$200-500/mo", "Enterprise EMRs (Raintree, Net Health)"],
        ],
        [3500, 5860]
      ),
      para("There is **no scheduling-only tool** between free Excel templates and $39+/month full EMR systems. PTOWL fills this gap."),

      h2("Market Evidence"),
      bullet("PT software market: **$26.35B** (2024), growing rapidly", "bullets"),
      bullet("Small clinics (4-9 therapists): **39.81%** of market revenue", "bullets"),
      bullet("**47%** of PT practices switch EMR within 3 years", "bullets"),
      bullet("Average failed EMR switch costs **$89,247**", "bullets"),
      bullet("**43%** of practices switch EMR 3+ times", "bullets"),
      bullet("No-shows cost ~$200 each; 2 daily no-shows = **$50K/year loss**", "bullets"),
      bullet("**73%** of PT patients miss at least one appointment", "bullets"),
      bullet("Appointment reminders cut no-show rates **in half within 2 weeks**", "bullets"),

      // Section 3: Target User Persona
      new Paragraph({ children: [new PageBreak()] }),
      h1("3. Target User Persona"),
      h2("Primary: Individual PT / Small Clinic Doctor"),
      h3("Profile"),
      bullet("Buys tools with their own money (below the \u201Cask my boss\u201D threshold)", "bullets"),
      bullet("Works at a clinic that may already have an EMR but finds it too slow for scheduling", "bullets"),
      bullet("Values speed over features \u2014 wants to create a schedule and get back to patients", "bullets"),
      bullet("May be a solo/cash-pay practitioner who buys their own entire tech stack", "bullets"),
      h3("Behavior"),
      bullet("17% of healthcare workers already use unauthorized personal tools because clinic software is too slow", "bullets"),
      bullet("45% of shadow-tool users do it for \u201Cfaster workflow\u201D", "bullets"),
      bullet("PTs already buy scheduling templates on Etsy ($3-15 one-time purchases)", "bullets"),
      bullet("Below-the-radar purchase: $3/month doesn\u2019t require approval from clinic management", "bullets"),
      para("**Shadow IT Play:** PTs use PTOWL even if their clinic has another system. It\u2019s fast enough to justify running alongside a $200/month EMR."),

      // Section 4: Business Goals
      h1("4. Business Goals"),
      h2("Primary Goal"),
      para("Establish PTOWL as the fastest PT schedule generator on the market, capturing the underserved $3-30/month price segment."),
      h2("Secondary Goals"),
      numbered("Build a sustainable SaaS business with positive unit economics from day one", "numbers2"),
      numbered("Achieve product-market fit through individual PT adoption (bottom-up growth)", "numbers2"),
      numbered("Create stickiness through patient data + schedules + workflow speed", "numbers2"),
      numbered("Enable bottom-up clinic conversion: when 3+ PTs at a clinic use PTOWL individually, offer a team plan", "numbers2"),
      h2("Non-Goals"),
      bullet("Competing with full EMR systems (billing, documentation, insurance)", "bullets"),
      bullet("Building a marketplace or platform", "bullets"),
      bullet("Enterprise sales or top-down selling", "bullets"),

      // Section 5: Success Metrics
      h1("5. Success Metrics"),
      h2("Year 1 Targets"),
      makeTable(
        ["Metric", "Target"],
        [
          ["Paying users", "500"],
          ["Annual revenue", "$15,000"],
          ["Monthly churn rate", "<5%"],
          ["No-show reduction (users with reminders)", "30%+"],
          ["NPS score", "50+"],
        ],
        [5000, 4360]
      ),
      h2("North Star Metric"),
      para("**Time from \u201CI need a schedule\u201D to \u201CSchedule done\u201D**"),
      para("Current: ~3 keypresses (seconds). Competitors: 5-15 minutes. Maintain **100x speed advantage**."),
      h2("Revenue Projections"),
      makeTable(
        ["Users", "Monthly Revenue", "Annual Net (after fees)"],
        [
          ["100", "$300", "~$2,368"],
          ["500", "$1,500", "~$11,840"],
          ["1,000", "$3,000", "~$23,680"],
          ["5,000", "$15,000", "~$118,400"],
          ["10,000", "$30,000", "~$236,800"],
        ],
        [2500, 3430, 3430]
      ),

      // Section 6: Revenue Model
      new Paragraph({ children: [new PageBreak()] }),
      h1("6. Revenue Model"),
      h2("Digital License Keys (LemonSqueezy)"),
      para("Inspired by Windows activation keys and Steam game purchases. No free tier. No trials. No contracts."),
      makeTable(
        ["Plan", "Price", "Billing", "Effective Fee"],
        [
          ["Monthly", "$3/mo", "Recurring", "~21.7% ($0.65)"],
          ["Annual", "$30/year", "Recurring", "~8.3% ($2.50)"],
        ],
        [2000, 2200, 2560, 2600]
      ),
      para("**Annual billing is the primary push** \u2014 saves the user $6/year and reduces our fee percentage from 21.7% to 8.3%."),

      h2("Why LemonSqueezy"),
      bullet("Merchant of Record (handles ALL global taxes: sales tax, VAT, GST)", "bullets"),
      bullet("Built-in license key generation + validation API", "bullets"),
      bullet("Subscription billing (monthly + annual)", "bullets"),
      bullet("No monthly platform fee (only per-transaction)", "bullets"),
      bullet("Owned by Stripe (long-term stability)", "bullets"),
      bullet("Proven Cloudflare Workers webhook integration", "bullets"),

      h2("Unit Economics: Per-User Monthly ($3/mo)"),
      makeTable(
        ["Line Item", "Cost"],
        [
          ["Revenue", "$3.00"],
          ["LemonSqueezy fee (5% + $0.50)", "-$0.65"],
          ["SMS reminders (~30% opt-in)", "-$0.36"],
          ["Email reminders (Resend)", "$0.00"],
          ["Cloudflare Workers/D1", "$0.00*"],
          ["**Net margin**", "**$1.99 (66%)**"],
        ],
        [6000, 3360]
      ),

      h2("Unit Economics: Per-User Annual ($30/yr)"),
      makeTable(
        ["Line Item", "Cost"],
        [
          ["Revenue", "$30.00"],
          ["LemonSqueezy fee (5% + $0.50)", "-$2.00"],
          ["SMS reminders (12 months)", "-$4.32"],
          ["Email reminders", "~$0.00"],
          ["Cloudflare infrastructure", "$0.00*"],
          ["**Net margin**", "**$23.68 (79%)**"],
        ],
        [6000, 3360]
      ),
      para("*Cloudflare free tier: 100K Worker requests/day, 5GB D1 storage. Scales to ~1,000+ users before hitting paid tiers."),

      // Section 7: Competitive Landscape
      new Paragraph({ children: [new PageBreak()] }),
      h1("7. Competitive Landscape"),
      h2("Top Competitors"),
      h3("WebPT ($99-400/mo/provider) \u2014 Market leader"),
      bullet("Major outages quarterly, declining speed", "bullets"),
      bullet("A la carte pricing (real cost 3-5x advertised)", "bullets"),
      bullet("Appointment reminders cost $200+/mo extra", "bullets"),
      bullet("47% of clinics switch EMR within 3 years", "bullets"),

      h3("SimplePractice ($29-99/mo) \u2014 Acquired by Vista Equity (PE) in 2024"),
      bullet("Users fear price hikes post-acquisition", "bullets"),
      bullet("\u201CExtremely unreliable, constant connect issues\u201D (4-6x/week)", "bullets"),
      bullet("Telehealth quality dropped after price increases", "bullets"),

      h3("Jane App ($54/mo) \u2014 Highest rated (4.8/5)"),
      bullet("No native mobile app", "bullets"),
      bullet("Weak US insurance billing integration", "bullets"),
      bullet("Still 18x more expensive than PTOWL", "bullets"),

      h3("SPRY ($79-300/mo) \u2014 Rising disruptor"),
      bullet("AI-powered, modern UI", "bullets"),
      bullet("Still 26x more expensive than PTOWL", "bullets"),
      bullet("Full EMR (complex for scheduling-only needs)", "bullets"),

      h2("PTOWL Differentiators"),
      numbered("**3-keypress workflow** \u2014 No competitor has anything close", "numbers3"),
      numbered("**$3/mo** \u2014 16-100x cheaper than every competitor", "numbers3"),
      numbered("**Sports alias PII protection** \u2014 676 sports figure aliases, unique to PTOWL", "numbers3"),
      numbered("**SMS + email reminders included** \u2014 Competitors charge $100-300/mo extra", "numbers3"),
      numbered("**License key model** \u2014 Buy it like a game, not a contract", "numbers3"),
      numbered("**No lock-in** \u2014 Month-to-month, cancel anytime", "numbers3"),
      numbered("**Scheduling-only** \u2014 Not bloatware EMR. Does one thing perfectly", "numbers3"),
      numbered("**7-layer security** \u2014 WAF, CORS, CSP, rate limiting, auth, authz, validation", "numbers3"),

      // Section 8: Constraints
      h1("8. Constraints"),
      h2("Technical Constraints"),
      bullet("**Cloudflare free tier** \u2014 Must stay within 100K Worker requests/day and 5GB D1 storage until revenue justifies paid tier", "bullets"),
      bullet("**No server-side PDF generation** \u2014 Cloudflare Workers lack Node.js fs/canvas APIs; PDF must be client-side", "bullets"),
      bullet("**D1 SQLite limitations** \u2014 No stored procedures, no triggers, limited concurrent write throughput", "bullets"),
      bullet("**In-memory rate limiting** \u2014 Per-Worker-isolate, not globally coordinated", "bullets"),
      h2("Business Constraints"),
      bullet("**Solo developer** \u2014 One person building, maintaining, and supporting", "bullets"),
      bullet("**$0 infrastructure budget** (currently) \u2014 Everything must run on free tiers until revenue covers costs", "bullets"),
      bullet("**No VC funding** \u2014 Bootstrapped, must be profitable from early users", "bullets"),
      bullet("**HIPAA adjacent** \u2014 Not a covered entity (no PHI stored), but must maintain privacy-first design", "bullets"),
      h2("Design Constraints"),
      bullet("**Privacy-first** \u2014 No real patient names stored; sports alias system (676 initials mapped to sports figures)", "bullets"),
      bullet("**Speed-first** \u2014 Core workflow must complete in 3 keypresses or fewer", "bullets"),
      bullet("**No feature bloat** \u2014 Every feature must justify its existence against the mission of \u201Cfastest PT scheduling\u201D", "bullets"),

      // Section 9: Risk Mitigation
      new Paragraph({ children: [new PageBreak()] }),
      h1("9. Risk Mitigation"),
      makeTable(
        ["Risk", "Probability", "Impact", "Mitigation"],
        [
          ["$3/mo too cheap to sustain", "Medium", "High", "Push annual billing ($30/yr). Margins work at 500+ users."],
          ["SMS costs eat margins", "Medium", "Medium", "Email + ICS default. SMS opt-in only."],
          ["LemonSqueezy fees too high", "Low", "Medium", "Annual billing reduces to 8.3%. Migrate to Stripe DIY at >5K users."],
          ["Competitors undercut on price", "Low", "Low", "Speed (3-keypress) is structural advantage, not price."],
          ["Low conversion rate", "Medium", "High", "No free tier = only paying users = focused PMF signal."],
          ["HIPAA compliance questions", "Medium", "Medium", "Sports aliases = no PHI stored. Clear ToS. Legal review planned."],
          ["User churn", "Medium", "Medium", "Monthly value prop: reminders + speed. Stickiness from data."],
          ["Cloudflare outage", "Low", "High", "Global CDN infrastructure, 99.99% historical uptime."],
          ["Data loss", "Low", "Critical", "Automated D1 backups (planned), migrations in git."],
        ],
        [2200, 1400, 1200, 4560]
      ),

      // Section 10: Launch Strategy
      h1("10. Launch Strategy"),
      h2("Pre-Launch Checklist"),
      numbered("Finish Phase 2 features (LemonSqueezy licensing, reminders, waitlist, stats)", "numbers4"),
      numbered("Create landing page on ptowl.com", "numbers4"),
      numbered("Set up LemonSqueezy store with $3/mo and $30/year plans", "numbers4"),
      numbered("Register 10DLC for SMS", "numbers4"),
      numbered("Test full purchase \u2192 activate \u2192 use flow end-to-end", "numbers4"),

      h2("Launch Channels"),
      numbered("**Reddit** (r/physicaltherapy, r/physiotherapy) \u2014 authentic posts", "numbers5"),
      numbered("**PT Facebook groups** and professional forums", "numbers5"),
      numbered("**Product Hunt** launch", "numbers5"),
      numbered("**Direct outreach** to cash-based PT practices", "numbers5"),
      numbered("**\u201CBuilt for PTs\u201D** narrative \u2014 authentic, practitioner-focused messaging", "numbers5"),

      h2("Growth Levers"),
      bullet("**Word-of-mouth** \u2014 PTs tell other PTs about the $3 tool", "bullets"),
      bullet("**Shadow IT adoption** \u2014 \u201CMy clinic uses WebPT but I use PTOWL\u201D", "bullets"),
      bullet("**Referral program** \u2014 Free month for referrals", "bullets"),
      bullet("**Content marketing** \u2014 Scheduling tips, productivity content", "bullets"),
      bullet("**Bottom-up conversion** \u2014 3 PTs buy Solo \u2192 clinic buys team plan", "bullets"),

      // Section 11: Stakeholders
      h1("11. Stakeholders"),
      makeTable(
        ["Stakeholder", "Role", "Interest"],
        [
          ["Product Owner", "Solo developer/founder", "Full product vision and execution"],
          ["End Users (PTs)", "Primary customers", "Fast, reliable scheduling tool"],
          ["Clinic Administrators", "Secondary customers", "Efficient staff scheduling"],
          ["Patients", "Indirect beneficiaries", "Reliable appointment reminders, fewer no-shows"],
        ],
        [2800, 3280, 3280]
      ),

      // Section 12: Approval
      h1("12. Approval"),
      makeTable(
        ["Role", "Name", "Date", "Status"],
        [
          ["Product Owner", "\u2014", "2026-03-16", "Approved"],
        ],
        [2340, 2340, 2340, 2340]
      ),
      new Paragraph({ spacing: { before: 400 }, children: [
        new TextRun({ text: "This document is maintained alongside the codebase and updated as business requirements evolve.", font: "Arial", size: 18, italics: true, color: "999999" })
      ]}),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:/Users/nurel/OneDrive/Desktop/ptowl/docs/BRD.docx", buffer);
  console.log("BRD.docx created successfully");
});
