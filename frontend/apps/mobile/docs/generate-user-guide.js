#!/usr/bin/env node
/**
 * Comlinkr Mobile App – Detailed User Guide Generator v2
 * Generates: docs/Comlinkr_User_Guide.docx
 * Run: NODE_PATH="C:/Users/Administrator/AppData/Roaming/npm/node_modules" node docs/generate-user-guide.js
 */

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  TableOfContents, PageBreak, BorderStyle, ShadingType,
  Table, TableRow, TableCell, WidthType, VerticalAlign,
  ImageRun, Header, Footer, PageNumber, LineRuleType,
  convertInchesToTwip, UnderlineType,
} = require("docx");
const fs   = require("fs");
const path = require("path");

// ─── Brand ────────────────────────────────────────────────────────────────────
const B = {
  blue:       "0076EB",
  blueDark:   "0054CC",
  blueBg:     "EBF5FF",
  blueMid:    "DBEAFE",
  green:      "26B324",
  greenDark:  "1a8a18",
  greenBg:    "EAFBE9",
  greenMid:   "D1FAE5",
  orange:     "FF7B00",
  orangeDark: "E56800",
  orangeBg:   "FFF7ED",
  purple:     "8B5CF6",
  purpleBg:   "F5F3FF",
  dark:       "000C28",
  grey:       "6B7280",
  greyLight:  "F3F4F6",
  greyBorder: "E5E7EB",
  red:        "DC2626",
  redBg:      "FEF2F2",
  white:      "FFFFFF",
  text:       "1F2937",
  textLight:  "374151",
};

// ─── Logo ─────────────────────────────────────────────────────────────────────
const LOGO_PATH = path.join(__dirname, "../assets/images/brand/logo.jpg");
const logoData  = fs.readFileSync(LOGO_PATH);

// ─── Base helpers ─────────────────────────────────────────────────────────────
const sp = (before = 0, after = 0) => ({ spacing: { before, after } });

function run(text, opts = {}) {
  return new TextRun({
    text,
    font:    "Calibri",
    size:    opts.size    || 22,
    bold:    opts.bold    || false,
    italics: opts.italic  || false,
    color:   opts.color   || B.text,
    underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
  });
}

function para(children, opts = {}) {
  return new Paragraph({
    children: Array.isArray(children) ? children : [run(children, opts)],
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.before || 80, after: opts.after || 80, line: 340, lineRule: LineRuleType.AUTO },
    indent:  opts.indent ? { left: opts.indent } : undefined,
    border:  opts.borderLeft ? {
      left: { color: opts.borderLeft, size: 20, space: 10, style: BorderStyle.SINGLE },
    } : undefined,
    shading: opts.shade ? { type: ShadingType.SOLID, color: opts.shade, fill: opts.shade } : undefined,
  });
}

function h1(text, color = B.dark) {
  return new Paragraph({
    children: [run(text, { size: 40, bold: true, color })],
    heading:  HeadingLevel.HEADING_1,
    spacing:  { before: 480, after: 200 },
    border: {
      bottom: { color: B.blue, size: 16, space: 8, style: BorderStyle.SINGLE },
    },
  });
}

function h2(text, color = B.blue) {
  return new Paragraph({
    children: [run(text, { size: 30, bold: true, color })],
    heading:  HeadingLevel.HEADING_2,
    spacing:  { before: 360, after: 160 },
  });
}

function h3(text, color = B.dark) {
  return new Paragraph({
    children: [run(text, { size: 26, bold: true, color })],
    heading:  HeadingLevel.HEADING_3,
    spacing:  { before: 280, after: 120 },
  });
}

function h4(text, color = B.blue) {
  return new Paragraph({
    children: [run(text, { size: 23, bold: true, color })],
    spacing:  { before: 220, after: 100 },
  });
}

function body(text, opts = {}) {
  return para([run(text, { size: 22, color: B.textLight, ...opts })], opts);
}

function bullet(text, level = 0, color = B.textLight) {
  return new Paragraph({
    children: [run(text, { size: 22, color })],
    bullet:   { level },
    spacing:  { before: 60, after: 60 },
  });
}

function numberedItem(num, title, desc, accentColor = B.blue) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { bottom: 120 },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideH: { style: BorderStyle.NONE }, insideV: { style: BorderStyle.NONE } },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 7, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: accentColor, fill: accentColor },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [para([run(String(num), { size: 26, bold: true, color: B.white })], { align: AlignmentType.CENTER })],
          }),
          new TableCell({
            width: { size: 93, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: B.blueBg, fill: B.blueBg },
            margins: { top: 100, bottom: 100, left: 220, right: 220 },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              para([run(title, { size: 22, bold: true, color: B.dark })]),
              para([run(desc,  { size: 20, color: B.grey })]),
            ],
          }),
        ],
      }),
    ],
  });
}

function callout(type, text) {
  const map = {
    tip:     { icon: "✅  TIP",     shade: B.greenBg,  border: B.green,  bold: B.green  },
    note:    { icon: "📌  NOTE",    shade: B.blueBg,   border: B.blue,   bold: B.blue   },
    warn:    { icon: "⚠️  WARNING", shade: B.orangeBg, border: B.orange, bold: B.orange },
    legal:   { icon: "⚖️  LEGAL",   shade: B.purpleBg, border: B.purple, bold: B.purple },
    imp:     { icon: "🔴  IMPORTANT", shade: B.redBg,  border: B.red,    bold: B.red    },
  };
  const c = map[type] || map.note;
  return new Paragraph({
    children: [
      run(`${c.icon}  `, { size: 20, bold: true, color: c.bold }),
      run(text, { size: 20, color: B.textLight }),
    ],
    border: { left: { color: c.border, size: 24, space: 10, style: BorderStyle.SINGLE } },
    shading: { type: ShadingType.SOLID, color: c.shade, fill: c.shade },
    indent: { left: 240 },
    spacing: { before: 120, after: 120 },
  });
}

function spacer(n = 1) {
  return new Paragraph({ children: [run("")], spacing: { after: 140 * n } });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function divider(color = B.greyBorder) {
  return new Paragraph({
    children: [run("")],
    border: { bottom: { color, size: 6, space: 6, style: BorderStyle.SINGLE } },
    spacing: { before: 200, after: 200 },
  });
}

// ─── Screenshot placeholder ───────────────────────────────────────────────────
function screenshot(label, bullets = [], width = 70, accent = B.blue) {
  const accentBg = accent === B.green ? B.greenBg : accent === B.orange ? B.orangeBg : B.blueBg;
  const accentMid = accent === B.green ? B.greenMid : accent === B.orange ? "FED7AA" : B.blueMid;

  const innerChildren = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 140, after: 60 },
      children: [
        run("📱  ", { size: 32, color: accent }),
        run(label, { size: 22, bold: true, color: accent }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [run("[ Insert screenshot here ]", { size: 18, italic: true, color: "BFDBFE" })],
    }),
  ];

  if (bullets.length > 0) {
    innerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 40 },
        children: [run("What this screenshot should show:", { size: 18, bold: true, color: B.grey })],
      })
    );
    bullets.forEach((b) =>
      innerChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 30 },
          children: [run(`• ${b}`, { size: 17, color: B.grey })],
        })
      )
    );
    innerChildren.push(spacer(0));
  }

  return new Table({
    width: { size: width, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    margins: { top: 120, bottom: 120 },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: accentBg, fill: accentBg },
            borders: {
              top:    { style: BorderStyle.DASHED, size: 10, color: accentMid },
              bottom: { style: BorderStyle.DASHED, size: 10, color: accentMid },
              left:   { style: BorderStyle.DASHED, size: 10, color: accentMid },
              right:  { style: BorderStyle.DASHED, size: 10, color: accentMid },
            },
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            children: innerChildren,
          }),
        ],
      }),
    ],
  });
}

// ─── Branded section banner ───────────────────────────────────────────────────
function sectionBanner(text, color = B.blue, bgColor = B.blueBg) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { bottom: 200 },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color, fill: color },
            width: { size: 2, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [para([run("", {})])],
          }),
          new TableCell({
            shading: { type: ShadingType.SOLID, color: bgColor, fill: bgColor },
            width: { size: 98, type: WidthType.PERCENTAGE },
            margins: { top: 160, bottom: 160, left: 280, right: 280 },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [para([run(text, { size: 24, bold: true, color })])],
          }),
        ],
      }),
    ],
  });
}

// ─── Two-col info table ───────────────────────────────────────────────────────
function infoTable(rows, col1 = 35) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 100, bottom: 160 },
    rows: [
      new TableRow({
        tableHeader: true,
        children: ["Feature / Item", "Details"].map((h, i) =>
          new TableCell({
            shading: { type: ShadingType.SOLID, color: B.dark, fill: B.dark },
            width: { size: i === 0 ? col1 : 100 - col1, type: WidthType.PERCENTAGE },
            margins: { left: 180, right: 180, top: 100, bottom: 100 },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [para([run(h, { size: 21, bold: true, color: B.white })])],
          })
        ),
      }),
      ...rows.map(([a, b], idx) =>
        new TableRow({
          children: [[a, col1], [b, 100 - col1]].map(([cell, w], i) =>
            new TableCell({
              shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? B.greyLight : B.white, fill: idx % 2 === 0 ? B.greyLight : B.white },
              width: { size: w, type: WidthType.PERCENTAGE },
              margins: { left: 180, right: 180, top: 80, bottom: 80 },
              borders: { top: { style: BorderStyle.SINGLE, size: 4, color: B.greyBorder }, bottom: { style: BorderStyle.SINGLE, size: 4, color: B.greyBorder }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              children: [para([run(cell, { size: 20, bold: i === 0, color: i === 0 ? B.dark : B.textLight })])],
            })
          ),
        })
      ),
    ],
  });
}

// ─── Badge card ──────────────────────────────────────────────────────────────
function badgeCard(icon, title, gradient, unlocks, why, how) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { bottom: 160 },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: gradient, fill: gradient },
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [para([run("", {})])],
          }),
          new TableCell({
            shading: { type: ShadingType.SOLID, color: B.white, fill: B.white },
            width: { size: 96, type: WidthType.PERCENTAGE },
            margins: { top: 180, bottom: 180, left: 280, right: 280 },
            borders: {
              top:    { style: BorderStyle.SINGLE, size: 4, color: B.greyBorder },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: B.greyBorder },
              left:   { style: BorderStyle.NONE },
              right:  { style: BorderStyle.SINGLE, size: 4, color: B.greyBorder },
            },
            children: [
              para([run(`${icon}  ${title}`, { size: 24, bold: true, color: gradient })]),
              para([run(`🔓 Unlocks:  `, { size: 21, bold: true, color: B.dark }), run(unlocks, { size: 21, color: B.textLight })]),
              para([run(`💡 Why it matters:  `, { size: 21, bold: true, color: B.green }), run(why, { size: 21, color: B.textLight })]),
              para([run(`📋 How to apply:  `, { size: 21, bold: true, color: B.blue }), run(how, { size: 21, color: B.textLight })]),
            ],
          }),
        ],
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// COVER PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function coverPage() {
  return [
    spacer(2),
    // Real logo centred
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 300 },
      children: [
        new ImageRun({
          data: logoData,
          transformation: { width: 180, height: 180 },
          type: "jpg",
        }),
      ],
    }),
    // Brand name
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [run("COMLINKR", { size: 96, bold: true, color: B.blue })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [run("WE FIND FOR YOU", { size: 36, bold: true, color: B.orange })],
    }),
    // Colour rule
    new Table({
      width: { size: 60, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      margins: { bottom: 260 },
      rows: [
        new TableRow({
          children: [
            new TableCell({ shading: { type: ShadingType.SOLID, color: B.blue,   fill: B.blue   }, width: { size: 33, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [para([run(" ", { size: 18 })])], margins: { top: 60, bottom: 60 } }),
            new TableCell({ shading: { type: ShadingType.SOLID, color: B.green,  fill: B.green  }, width: { size: 34, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [para([run(" ", { size: 18 })])], margins: { top: 60, bottom: 60 } }),
            new TableCell({ shading: { type: ShadingType.SOLID, color: B.orange, fill: B.orange }, width: { size: 33, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [para([run(" ", { size: 18 })])], margins: { top: 60, bottom: 60 } }),
          ],
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [run("Complete User Guide", { size: 60, bold: true, color: B.dark })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [run("Everything you need to know to get the most out of Comlinkr", { size: 24, italic: true, color: B.grey })],
    }),
    spacer(2),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [run("Version 1.0  •  April 2026", { size: 22, color: B.grey })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run("For support: support@comlinkr.com", { size: 20, color: B.grey, italic: true })],
    }),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE OF CONTENTS
// ═══════════════════════════════════════════════════════════════════════════════
function tocSection() {
  return [
    sectionBanner("📋  TABLE OF CONTENTS", B.dark, B.greyLight),
    callout("note", "After opening this document in Microsoft Word, right-click the contents field below and choose 'Update Field → Update entire table' to generate page numbers."),
    spacer(),
    new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC 1 – INTRODUCTION
// ═══════════════════════════════════════════════════════════════════════════════
function sec1() {
  return [
    sectionBanner("SECTION 1  —  INTRODUCTION", B.blue, B.blueBg),
    h1("1.  Introduction & Welcome"),
    screenshot("App Welcome Screen / Splash Screen", [
      "Comlinkr logo centered on a dark gradient background",
      "'WE FIND FOR YOU' tagline below the logo",
      "Two buttons: Log In and Sign Up",
      "Brand colors — blue, green, orange visible",
    ], 65),
    spacer(),
    h2("1.1  What is Comlinkr?"),
    body("Comlinkr is a community super-app built for people who are new to a city, relocating internationally, or simply want to feel more connected to their neighbourhood. Whether you just moved to a new country or have lived in your city for years, Comlinkr gives you one place to discover housing, find great food, stay informed about local events, connect with neighbours, and ask questions that only locals can answer."),
    spacer(),
    body("The name Comlinkr comes from Community Linker — a platform whose entire purpose is to link you to the right people, places, and opportunities in your community. Our tagline, 'We Find For You', means you should never have to search aimlessly. Comlinkr curates everything relevant to your city and brings it directly to your feed."),
    spacer(),
    h2("1.2  The Five Pillars of Comlinkr"),
    infoTable([
      ["Explore Feed",    "Your personalised home — curated news, stories, events, polls, and posts from people in your neighbourhood"],
      ["Housing",         "Find rental listings, shared living spaces, and compatible roommates — with a full legal agreement flow built in"],
      ["Food",            "Discover restaurants near you, read trusted reviews, find popular dishes, and check real-time wait times"],
      ["Community Q&A",   "Ask questions, share knowledge, and upvote the best advice from people who actually live in your area"],
      ["Profile & Trust", "Build your verified identity on Comlinkr — earn badges that unlock features and signal credibility to others"],
    ]),
    spacer(),
    h2("1.3  Who Should Use This Guide?"),
    bullet("New users who just downloaded the app and want to understand every feature"),
    bullet("Existing users who want to unlock advanced features like badges and legal agreements"),
    bullet("Landlords and restaurant owners who want to list their properties or businesses"),
    bullet("Anyone who wants to understand what their data is used for and how to control it"),
    spacer(),
    h2("1.4  Supported Platforms"),
    infoTable([
      ["iOS",      "iPhone running iOS 16 or later — available on the App Store"],
      ["Android",  "Android 10 (API level 29) or later — available on Google Play"],
      ["Internet", "Active Wi-Fi or cellular data connection required for all real-time content"],
    ]),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC 2 – GETTING STARTED
// ═══════════════════════════════════════════════════════════════════════════════
function sec2() {
  return [
    sectionBanner("SECTION 2  —  GETTING STARTED", B.blue, B.blueBg),
    h1("2.  Getting Started"),
    h2("2.1  Downloading the App"),
    body("Comlinkr is free to download on both major app stores. Search for 'Comlinkr' or use the links below:"),
    bullet("App Store (iOS): search 'Comlinkr' — look for the magnifying glass and connected nodes logo"),
    bullet("Google Play (Android): search 'Comlinkr' — same logo"),
    spacer(),
    screenshot("QR Codes — App Store & Google Play Side by Side", [
      "Two QR codes side by side",
      "Left: Apple App Store QR code with Apple logo",
      "Right: Google Play QR code with Play Store logo",
      "Label each QR code with the store name below it",
    ], 55, B.green),
    spacer(),
    h2("2.2  Creating Your Account — Step by Step"),
    body("Follow these steps exactly to create your free Comlinkr account:"),
    spacer(),
    numberedItem(1, "Open the App", "Tap the Comlinkr icon on your home screen. You will see the welcome screen with two buttons: Log In and Sign Up."),
    spacer(0),
    numberedItem(2, "Tap 'Sign Up'", "This takes you to the registration screen."),
    spacer(0),
    numberedItem(3, "Enter Your Full Name", "Type your first and last name exactly as you want it displayed to other users on the platform."),
    spacer(0),
    numberedItem(4, "Choose a Username", "Pick a unique @username. This is your public handle on Comlinkr. It cannot contain spaces and must be between 3 and 20 characters. You can change it later in Edit Profile."),
    spacer(0),
    numberedItem(5, "Enter Your Email Address", "Use a valid email address you have access to. This will be used for account recovery and notifications."),
    spacer(0),
    numberedItem(6, "Create a Password", "Your password must be at least 8 characters long. Use a mix of letters, numbers, and symbols for security."),
    spacer(0),
    numberedItem(7, "Agree to Terms", "Tick the checkbox to confirm you have read and agree to Comlinkr's Terms of Service and Privacy Policy. Links to both documents are embedded in the checkbox text — tap them to read the full documents before agreeing."),
    spacer(0),
    numberedItem(8, "Tap 'Create Account'", "Your account is created instantly and you are taken into the Onboarding flow automatically."),
    spacer(),
    callout("legal", "By tapping 'Create Account' you are entering into a legal agreement with Comlinkr. You confirm that all information you provide is accurate, that you are at least 18 years old, and that you agree to follow the Community Guidelines. See Section 12 for full legal details."),
    spacer(),
    screenshot("Sign Up Screen — Full Registration Form", [
      "Comlinkr logo at the top",
      "Input fields: Full Name, Username, Email, Password, Confirm Password",
      "Terms & Privacy Policy checkbox with tappable links",
      "'Create Account' button in Comlinkr blue (#0076EB)",
      "'Already have an account? Log In' link at the bottom",
    ], 70),
    spacer(),
    h2("2.3  Logging In to an Existing Account"),
    body("If you already have a Comlinkr account:"),
    numberedItem(1, "Open the App", "Tap the Comlinkr icon — you will land on the welcome screen."),
    spacer(0),
    numberedItem(2, "Tap 'Log In'", "This takes you to the login screen."),
    spacer(0),
    numberedItem(3, "Enter Your Email and Password", "Type the email address and password you registered with."),
    spacer(0),
    numberedItem(4, "Tap 'Log In'", "If your details are correct, you are taken to your personalised Feed immediately. If you previously completed onboarding, you go directly to the Feed. If not, you are taken through onboarding first."),
    spacer(),
    callout("tip", "If you forget your password, tap 'Forgot Password?' on the login screen. Enter your registered email address and Comlinkr will send you a password reset link. Check your spam folder if you don't see the email within 5 minutes."),
    spacer(),
    screenshot("Login Screen", [
      "Email input field",
      "Password input field with show/hide toggle",
      "'Log In' button in Comlinkr blue",
      "'Forgot Password?' text link below the button",
      "'Don't have an account? Sign Up' link at the bottom",
    ], 65),
    spacer(),
    h2("2.4  The Onboarding Wizard — Personalising Your Experience"),
    body("After signing up for the first time, Comlinkr walks you through a four-step onboarding wizard. This is not just a formality — your answers directly determine what content appears in your Feed, which events are suggested to you, and which housing listings are shown first. Take your time with this."),
    spacer(),
    h3("Step 1 of 4 — Set Your Location"),
    body("Comlinkr is hyper-local. Everything — your Feed, housing listings, restaurant suggestions, events, and community Q&A — is filtered to the city you select here. This is the single most important setting in the entire app."),
    spacer(),
    body("How to complete this step:"),
    bullet("Tap the Country field — a scrollable list of countries appears"),
    bullet("Select your country — the State/Province field appears below automatically"),
    bullet("Select your state or province — the City field appears below automatically"),
    bullet("Select your city — if your city is not listed, pick the nearest major city"),
    bullet("Tap 'Continue' to move to the next step"),
    spacer(),
    callout("note", "You can update your location at any time after onboarding from Profile → Edit Profile → Location. If you move cities, update this immediately or you will continue to see content from your old location."),
    spacer(),
    screenshot("Onboarding Step 1 — Location Picker", [
      "Progress bar at top showing Step 1 of 4 highlighted",
      "Country dropdown with search bar — 15+ countries listed",
      "State/Province dropdown — appears after country is selected",
      "City dropdown — appears after state is selected",
      "'Continue' button in blue at bottom",
      "Step label: 'Where are you based?'",
    ], 70),
    spacer(),
    h3("Step 2 of 4 — Choose Your Culture"),
    body("Select the cultural experiences that interest you most. These are used to personalise your Feed recommendations — if you love live music, you will see more music events. If you enjoy art, you will see gallery openings and exhibitions."),
    spacer(),
    body("Available culture options include: Coffee Culture, Art & Museums, Live Music, Theatre & Performing Arts, Food Markets, Nightlife, Sports Events, Outdoor Activities, Film & Cinema, Literature & Book Clubs, and more. Select as many as feel right — there is no limit."),
    spacer(),
    screenshot("Onboarding Step 2 — Culture Picker", [
      "Grid of culture option tiles, each with an emoji and label",
      "Selected tiles highlighted in Comlinkr blue with a checkmark",
      "Unselected tiles in light grey",
      "Progress bar showing Step 2 of 4",
      "'Continue' button at bottom",
    ], 70),
    spacer(),
    h3("Step 3 of 4 — Select Your Interests"),
    body("Choose your personal hobbies and interests. These power the 'For You' tab in the Feed and help Comlinkr suggest relevant posts from other community members."),
    spacer(),
    body("Available interests include: Technology, Sports, Cooking, Travel, Fitness, Photography, Gaming, Fashion, Sustainability, Parenting, Finance, Career Networking, and more."),
    spacer(),
    screenshot("Onboarding Step 3 — Interests Picker", [
      "Grid of interest option chips with icons",
      "Selected interests highlighted in Comlinkr green (#26B324)",
      "Progress bar showing Step 3 of 4",
      "'Continue' button at bottom",
    ], 70),
    spacer(),
    h3("Step 4 of 4 — You're Ready!"),
    body("The final screen is a summary of your setup. It shows your selected city, culture picks, and interest tags. Review them and if anything looks wrong, use the back button to go back and change it. When everything looks right, tap 'Let's Go!' to enter the app."),
    spacer(),
    screenshot("Onboarding Step 4 — Ready Screen", [
      "Celebration illustration or animation",
      "Summary of: City selected, Culture picks, Interest tags",
      "Edit buttons next to each section to go back and change",
      "'Let's Go!' button in Comlinkr orange (#FF7B00)",
      "Progress bar showing Step 4 of 4 complete",
    ], 65),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC 3 – NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════
function sec3() {
  return [
    sectionBanner("SECTION 3  —  NAVIGATING THE APP", B.blue, B.blueBg),
    h1("3.  Navigating the App"),
    h2("3.1  Bottom Navigation Bar"),
    body("At the very bottom of the screen, always visible, is the tab bar. It has four tabs:"),
    infoTable([
      ["Explore (Feed)",     "Your personalised homepage — news, stories, events, polls, community posts"],
      ["Listings (Housing)", "Browse rental properties, shared spaces, and find roommates"],
      ["Food",               "Discover restaurants, read reviews, check wait times and menus"],
      ["Community",          "Ask questions, share answers, vote on community knowledge"],
    ]),
    spacer(),
    screenshot("Bottom Tab Bar — All Four Tabs", [
      "4 tab icons at the bottom of the screen",
      "Active tab highlighted in Comlinkr blue",
      "Icons: compass/explore, home/listing, fork-knife/food, chat-bubbles/community",
      "Labels below each icon",
    ], 90),
    spacer(),
    h2("3.2  The App Header"),
    body("The header appears at the top of every main screen. It has three sections:"),
    infoTable([
      ["Left — ☰ Hamburger Menu", "Tap to slide open the full side navigation menu with profile access, saved items, notifications, and settings"],
      ["Centre — Comlinkr Logo",  "The Comlinkr logo is displayed at 120×42 pixels. Tap it to scroll the current screen back to the top instantly"],
      ["Right — Chat Icon 💬",    "Opens the Chat screen where you can send and receive direct messages from other users"],
      ["Right — Create Post +",   "Opens the post composer so you can share content with your community immediately"],
    ]),
    spacer(),
    screenshot("App Header — Full Width View", [
      "Hamburger menu icon on the left (☰)",
      "Comlinkr logo in the center",
      "Blue gradient chat bubble icon on the right",
      "Blue gradient + icon next to chat for creating posts",
      "Both right icons are 36×36 with gradient backgrounds",
    ], 90),
    spacer(),
    h2("3.3  The Hamburger Side Menu"),
    body("Tap the ☰ icon in the top-left corner to slide open the side menu. This menu is the central hub for everything related to your account and settings. It slides in from the left with a smooth animation."),
    spacer(),
    h3("What is in the Side Menu?"),
    infoTable([
      ["Profile Card (top)", "Your avatar, name, email, and city — with a gradient Edit button to go to Edit Profile instantly"],
      ["PRO Badge",          "If you are a PRO subscriber, a gold PRO badge appears on your avatar"],
      ["My Profile",         "View your public profile as other users see it"],
      ["My Posts",           "All posts you have created, with the count shown as a badge"],
      ["Saved",              "Everything you have bookmarked — posts, listings, events, and questions — with count badge"],
      ["Events",             "Events you have registered for — with count badge"],
      ["Notifications",      "All your notifications with an unread count badge in orange"],
      ["Settings",           "App preferences, privacy controls, blocked users, theme, and language"],
      ["Help & Support",     "FAQ, contact form, bug reporting, and tutorial videos"],
      ["Privacy Policy",     "The full Comlinkr Privacy Policy — readable in-app at any time"],
      ["Log Out",            "Signs you out of the current session — your data is preserved"],
    ]),
    spacer(),
    screenshot("Hamburger Side Menu — Fully Open", [
      "Dark gradient header at top (black to blue to orange)",
      "User avatar with initials in a glass-effect circle",
      "Name, email, and city below the avatar",
      "PRO badge on the avatar if subscribed",
      "Flat menu rows with 38×38 coloured icon boxes and chevrons",
      "Notification badge in orange with unread count",
      "Log Out row at the very bottom with red icon",
      "Smooth slide-in from left",
    ], 60),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC 4 – EXPLORE FEED
// ═══════════════════════════════════════════════════════════════════════════════
function sec4() {
  return [
    sectionBanner("SECTION 4  —  EXPLORE FEED", B.blue, B.blueBg),
    h1("4.  The Explore Feed"),
    body("The Explore Feed is the first screen you see when you open Comlinkr. It is your personalised community homepage — think of it as a local newspaper, social network, event calendar, and neighbourhood bulletin board all in one."),
    spacer(),
    screenshot("Explore Feed — Full Screen Overview", [
      "Hero banner at the top with weather and neighbourhood stats",
      "Stories row below the hero",
      "Feed tabs: For You, Events, News, Polls",
      "Post cards in the scrollable feed below",
      "App header with logo at very top",
    ], 85),
    spacer(),
    h2("4.1  The Hero Banner"),
    body("At the very top of the Feed, before the posts, is a live hero card for your selected city. It updates automatically and gives you a real-time pulse of your neighbourhood."),
    infoTable([
      ["Greeting",         "Shows 'Good morning/afternoon/evening, [Your First Name]!' personalised to you"],
      ["Location Breadcrumb", "Shows City, State, Country below your greeting so you always know which city's content you're viewing"],
      ["Weather",          "Current temperature and conditions (e.g. '72°F ☀️ Sunny') — updates in real time"],
      ["Active Neighbours","How many Comlinkr users are currently online in your area right now"],
      ["Activity Level",   "A qualitative reading of neighbourhood activity: Low / Moderate / High / Very High"],
      ["Live Events",      "A pill badge showing how many events are happening in your city today — tap to jump to the Events tab"],
      ["Mood Widget",      "Five emoji buttons at the bottom of the hero — tap one to share how the neighbourhood feels to you today"],
    ]),
    spacer(),
    screenshot("Hero Banner — Close Up View", [
      "Personalised greeting with user's first name",
      "City, State, Country breadcrumb in small text",
      "Weather display with temperature and icon",
      "Active neighbours count with a people icon",
      "Activity level indicator",
      "Live Events pill badge",
      "5 mood emoji buttons at bottom: 😊 😌 🤔 😤 🎉",
    ], 80),
    spacer(),
    h2("4.2  Neighbourhood Mood"),
    body("The five emoji buttons at the bottom of the hero allow you to share how the neighbourhood feels today. Your options are:"),
    bullet("😊  Great — everything is positive and calm"),
    bullet("🎉  Exciting — something great is happening today"),
    bullet("😌  Chill — relaxed, quiet neighbourhood vibe"),
    bullet("🤔  Meh — nothing much happening, average day"),
    bullet("😤  Noisy — something disruptive or noisy is going on"),
    spacer(),
    body("When you tap a mood, your vote is added to the community's aggregate mood for the day. The result is shown back to everyone in the area as a collective neighbourhood vibe indicator."),
    callout("note", "You can only submit one mood vote per day. Choose the one that best reflects how your neighbourhood feels right now. You cannot change your vote after submitting."),
    spacer(),
    h2("4.3  Stories"),
    body("Beneath the hero banner is a horizontal scrollable row of story bubbles. Stories are short-lived photo or video posts that disappear after 24 hours. They are a quick way to share what is happening in your area right now — whether it is a local event, a great food find, a new housing listing, or neighbourhood news."),
    spacer(),
    h3("Story Categories"),
    body("Every story on Comlinkr belongs to one of five categories. The category is shown as a colour-coded label at the top of the story while it plays:"),
    infoTable([
      ["🟠  Events",      "Stories about upcoming or ongoing local events — concerts, markets, community meetups"],
      ["🟢  Food",        "Restaurant discoveries, new dishes, food market finds, and dining experiences"],
      ["🔵  Housing",     "New listings, property tours, neighbourhood walkthroughs, and moving announcements"],
      ["🟣  Culture",     "Art, music, theatre, galleries, festivals, and cultural happenings in the city"],
      ["🔴  Local News",  "Breaking neighbourhood news, safety updates, roadworks, and local announcements"],
    ]),
    spacer(),
    h3("How to Watch Stories"),
    infoTable([
      ["Open a Story",       "Tap any bubble in the Stories row. The story opens full screen immediately and plays automatically."],
      ["Pause a Story",      "Tap and hold anywhere on the screen to pause playback. Release your finger to resume."],
      ["Skip Forward",       "Tap the right half of the screen to skip to the next story in that person's collection."],
      ["Go Back",            "Tap the left half of the screen to go back to the previous story."],
      ["Next Author",        "When all stories from one person finish, the viewer automatically moves to the next author's stories."],
      ["Swipe Between Authors", "Swipe left or right to jump directly between different authors' story collections."],
      ["Close Stories",      "Swipe down from anywhere on the story, or tap the X button in the top-right corner to return to the Feed."],
      ["Save a Story",       "Tap the bookmark icon that appears on the story to save it. Access saved stories from hamburger menu → Saved."],
      ["Share a Story",      "Swipe up on the story to reveal a share sheet. Share directly via WhatsApp, iMessage, or any other app."],
      ["Story Age",          "The time the story was posted is shown at the top of the viewer (e.g. '14m ago'). Stories disappear exactly 24 hours after being posted."],
    ]),
    spacer(),
    h3("Your Own Story Bubble"),
    body("Your avatar bubble always appears first in the Stories row. It has two states:"),
    bullet("No story posted today — your bubble shows a + icon overlay. Tap it to create your first story of the day."),
    bullet("Story already posted — your bubble shows your avatar with a coloured ring. Tap it to view your own story as others see it, or add another slide to it."),
    spacer(),
    h3("Story Rings — What the Colours Mean"),
    bullet("Coloured ring (blue, green, or orange) — you have NOT yet watched this person's story"),
    bullet("Grey ring — you have already watched this story"),
    bullet("No ring — this person has no active story today"),
    spacer(),
    screenshot("Stories Row — Horizontal Scroll", [
      "Your avatar bubble first with a + icon overlay",
      "Other users' bubbles in a horizontal scroll",
      "Coloured rings on unseen stories, grey rings on watched",
      "Author username below each bubble",
    ], 85),
    spacer(),
    h2("4.4  Feed Tabs"),
    body("Below the stories row are four tabs that divide the Feed content:"),
    infoTable([
      ["For You",   "Posts and content personally curated for you based on your city, culture picks, and interest tags from onboarding. The more you interact — liking, commenting, saving — the more accurate 'For You' becomes over time."],
      ["Events",    "All upcoming events in your city displayed as scrollable strip cards. Tap any card to open the full Event Detail view and register."],
      ["News",      "Curated local and global news articles relevant to your city. Each card shows the headline, source, and thumbnail. Tap to open the full article in your browser."],
      ["Polls",     "Community-created polls on topics that matter to your neighbourhood. Tap an option to vote. Results appear as percentage bars after you vote."],
    ]),
    spacer(),
    screenshot("Feed Tabs — For You, Events, News, Polls", [
      "4 tab pills below the Stories row",
      "Active tab highlighted with blue underline or filled pill",
      "First post cards visible below the active tab",
    ], 80),
    spacer(),
    h2("4.5  Post Cards — Understanding Each Element"),
    body("Every post in the Feed is displayed as a card. Here is what each part of a post card means:"),
    infoTable([
      ["Avatar & Name",       "The profile photo and name of the person who posted. Tap the avatar to view their profile."],
      ["Timestamp",           "How long ago the post was published (e.g. '2 hours ago', 'Yesterday')."],
      ["Location Tag",        "If the post was tagged with a specific location, it appears below the timestamp."],
      ["Post Text",           "The main body of the post. Long posts are truncated with a 'Read more' link."],
      ["Media",               "Images or videos attached to the post. Tap to view full screen. Swipe to browse multiple images."],
      ["❤️ Like Button",       "Tap to like the post. Tap again to unlike. The count updates instantly. Liked posts are saved in your activity."],
      ["💬 Comment Button",    "Tap to open the comment sheet. You can read all comments and add your own."],
      ["🔗 Share Button",      "Tap to open the native share sheet. You can share the post via WhatsApp, iMessage, email, or any other app on your device."],
      ["🔖 Save Button",       "Tap to save the post to your Saved collection. Access saved posts from hamburger menu → Saved."],
      ["⋮ More Options",       "Tap the three-dot menu to Report the post for inappropriate content, or Block the author so you no longer see their posts."],
    ]),
    spacer(),
    screenshot("Post Card — All Elements Labelled", [
      "Author avatar (top left), name, and timestamp",
      "Post text body with 'Read more' link if long",
      "Full-width image below the text (if attached)",
      "Like, Comment, Share, Save buttons in a row at the bottom",
      "Like count and comment count shown next to their icons",
      "Three-dot menu in the top right of the card",
    ], 85),
    spacer(),
    h3("How to Like a Post"),
    numberedItem(1, "Find a post in the Feed", "Scroll through the For You tab until you find a post you want to like."),
    spacer(0),
    numberedItem(2, "Tap the ❤️ heart icon", "The heart fills red and the like count increases by 1. The author receives a notification."),
    spacer(0),
    numberedItem(3, "Tap again to unlike", "The heart returns to outline and the count decreases by 1."),
    spacer(),
    h3("How to Comment on a Post"),
    numberedItem(1, "Tap the 💬 comment icon", "The comment sheet slides up from the bottom of the screen."),
    spacer(0),
    numberedItem(2, "Read existing comments", "Scroll up through comments already posted by others."),
    spacer(0),
    numberedItem(3, "Type your comment", "Tap the text field at the bottom of the sheet labelled 'Add a comment...' and type your response."),
    spacer(0),
    numberedItem(4, "Tap Send", "Your comment appears immediately at the bottom of the thread. The post author is notified."),
    spacer(),
    screenshot("Post Comment Sheet — Open", [
      "Comment sheet slid up from bottom (modal style)",
      "Post preview at the very top",
      "Scrollable list of existing comments",
      "Each comment shows avatar, name, text, and time",
      "Text input at the bottom with 'Add a comment...' placeholder",
      "Send button in blue",
    ], 70),
    spacer(),
    h2("4.6  Events in the Feed"),
    body("Switch to the Events tab to see all upcoming events in your city. Events are displayed as horizontal strip cards — swipe left to browse them."),
    spacer(),
    infoTable([
      ["Event Card",         "Shows event image, name, date, time, and location at a glance"],
      ["Tap to Open",        "Tap any event card to open the full Event Detail modal"],
      ["Event Detail Modal", "Shows full event image, description, date and time, exact location, host information, attendee count, and whether you are registered"],
      ["Register Button",    "Tap 'Register' inside the detail modal to sign up for the event. Tap again to unregister if you change your mind."],
      ["Save an Event",      "Tap the bookmark icon in the detail modal to save the event. Access it later from hamburger menu → Events."],
      ["Share an Event",     "Tap the share icon to send the event to a friend via any app on your device."],
    ]),
    spacer(),
    screenshot("Event Detail Modal — Full View", [
      "Full-width event image at the top",
      "Event title in large bold text",
      "Date and time with calendar icon",
      "Location with map pin icon",
      "Host name and avatar",
      "Attendee count ('X people are going')",
      "'Register' button in Comlinkr blue",
      "Bookmark and share icons in the header",
      "Full event description below the register button",
    ], 72),
    spacer(),
    h2("4.7  Community Polls"),
    body("The Polls tab shows community-created polls on topics that matter to your neighbourhood. Each poll shows the question, the available options, and after you vote, the live percentage results."),
    spacer(),
    numberedItem(1, "Open the Polls tab", "Tap 'Polls' in the feed tab bar."),
    spacer(0),
    numberedItem(2, "Read the poll question", "Each poll card shows a question at the top."),
    spacer(0),
    numberedItem(3, "Tap your chosen option", "Tap the option you want to vote for. Your vote is submitted immediately."),
    spacer(0),
    numberedItem(4, "See the results", "After voting, all options show their current vote percentages as animated bars."),
    spacer(),
    callout("note", "You can only vote once per poll and cannot change your vote after submitting. Results are live — they update as other users vote."),
    spacer(),
    screenshot("Community Poll Card — Before and After Voting", [
      "Poll question at the top",
      "Option buttons listed below",
      "Before voting: clean option buttons with no percentages",
      "After voting: percentage bars behind each option",
      "Your selected option highlighted in Comlinkr blue",
      "Total vote count shown at the bottom",
    ], 80),
    spacer(),
    h2("4.8  Creating a Post"),
    body("Tap the blue + button in the top-right header to open the Create Post screen. You can share text, photos, and location tags with your entire community."),
    spacer(),
    numberedItem(1, "Tap the + icon", "Located in the top-right of the App Header. The post composer opens as a new screen."),
    spacer(0),
    numberedItem(2, "Write your post", "Tap the large text area and type your post. There is a character limit displayed as you type. Be clear and community-friendly."),
    spacer(0),
    numberedItem(3, "Add a photo (optional)", "Tap the camera icon to attach an image. You can choose from your camera roll or take a new photo. You can attach up to 4 images per post."),
    spacer(0),
    numberedItem(4, "Add a location tag (optional)", "Tap the location pin icon to tag a specific place (a restaurant, park, landmark, etc.) to your post."),
    spacer(0),
    numberedItem(5, "Tap 'Post'", "Your post is published and appears in the Feed for all users in your city. You receive a confirmation notification."),
    spacer(),
    callout("imp", "Posts must follow Comlinkr Community Guidelines. Content that is hateful, violent, sexually explicit, or designed to mislead will be removed and may result in account suspension. See Section 12 for the full Community Guidelines."),
    spacer(),
    screenshot("Create Post Composer Screen", [
      "Large text input area taking up most of the screen",
      "Character count indicator at the bottom right of the text area",
      "Camera icon for adding photos",
      "Location pin icon for adding a location tag",
      "'Post' button in blue in the top right",
      "Cancel/back button in the top left",
      "Preview thumbnails of attached images if any are added",
    ], 70),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC 5 – HOUSING
// ═══════════════════════════════════════════════════════════════════════════════
function sec5() {
  return [
    sectionBanner("SECTION 5  —  HOUSING", B.green, B.greenBg),
    h1("5.  Housing — Find a Home"),
    body("The Housing tab is a complete home-finding platform built directly into Comlinkr. Whether you need a full apartment, a room in a shared house, or a compatible roommate, everything is here in one place — including a full legal agreement flow so you can sign your tenancy agreement without ever leaving the app."),
    spacer(),
    screenshot("Housing Tab — Main View with Sub-Tabs", [
      "Three sub-tabs at the top: Listings, Shared Spaces, Roommates",
      "Search bar below the tabs",
      "Filter chips below the search bar",
      "Listing cards in the scrollable feed below",
    ], 85, B.green),
    spacer(),
    h2("5.1  The Three Housing Tabs"),
    infoTable([
      ["Listings",       "Full rental and for-sale property listings — entire apartments, houses, studios, and professional properties"],
      ["Shared Spaces",  "Rooms and beds within shared homes — co-living spaces, house shares, and en-suite rooms"],
      ["Roommates",      "A dedicated matching system to find compatible housemates based on lifestyle preferences"],
    ]),
    spacer(),
    h2("5.2  Understanding a Listing Card"),
    body("Each property is displayed as a detailed card. Here is what every element means:"),
    infoTable([
      ["Photo Carousel",       "Swipe left or right through the property photos. The number of photos is shown as a counter (e.g. '1/5')."],
      ["'NEW' Badge",          "An orange badge shown on listings posted in the last 72 hours — so you can spot fresh listings instantly."],
      ["Price",                "Monthly rent in the local currency. The deposit amount is shown directly below the main price in smaller text."],
      ["Stats Grid (4 cols)",  "A four-column icon grid showing: Beds 🛏 (number of bedrooms) | Baths 🚿 (number of bathrooms) | Sqft 📐 (floor area) | Floor (which floor the property is on)."],
      ["Neighbourhood Strip",  "A horizontal strip below the stats showing the Walk Score (0–100 — how walkable the area is) and Transit Info (nearest transit options and how far they are)."],
      ["Amenity Chips",        "Green pill badges listing the amenities included: e.g. Pool, Gym, Pet-Friendly, Parking, Furnished, Balcony, Dishwasher. Scroll the chips horizontally if there are many."],
      ["Chat Button",          "A button at the bottom of the card to open a direct chat with the landlord without leaving the Housing tab."],
      ["Bookmark Icon",        "Tap the bookmark to save this listing. Access saved listings from hamburger menu → Saved."],
    ]),
    spacer(),
    screenshot("Housing Listing Card — Full Detail View", [
      "Image carousel at top with photo counter",
      "'NEW' orange badge if recently listed",
      "Price in large text with deposit in smaller text below",
      "4-column stats grid: Beds, Baths, Sqft, Floor with coloured icon boxes",
      "Walk score and transit info strip",
      "Green amenity chips in a horizontal scroll row",
      "Chat button at the bottom of the card body",
      "Bookmark icon in the top-right corner of the card",
    ], 80, B.green),
    spacer(),
    h2("5.3  Searching and Filtering Listings"),
    body("Use the search bar at the top of the Listings tab to search by keyword — type a street name, neighbourhood, or property type. Below the search bar are filter chips for quick filtering."),
    infoTable([
      ["Price Range",       "Set a minimum and maximum monthly rent. Drag the sliders or type values directly."],
      ["Bedrooms",          "Filter by number of bedrooms: Studio, 1, 2, 3, 4+"],
      ["Property Type",     "Apartment, House, Studio, Room, Penthouse, Shared"],
      ["Furnished",         "Toggle to show only furnished properties"],
      ["Pet-Friendly",      "Toggle to show only pet-friendly listings"],
      ["Sort Order",        "Sort by: Newest First, Price Low to High, Price High to Low, Most Relevant"],
    ]),
    spacer(),
    callout("tip", "Use the 'Newest First' sort order right after the app launches to see the freshest listings before anyone else contacts the landlord."),
    spacer(),
    screenshot("Housing Filter Panel — Open", [
      "Filter panel sliding up from the bottom or overlaid at top",
      "Price range slider",
      "Bedroom count selector (Studio, 1, 2, 3, 4+)",
      "Property type chips",
      "Furnished and Pet-Friendly toggles",
      "Sort order dropdown",
      "'Apply Filters' button in blue",
      "'Reset' button to clear all filters",
    ], 72, B.green),
    spacer(),
    h2("5.4  Viewing a Full Listing Detail"),
    body("Tap the body of any listing card (not the chat button or carousel) to open the full listing detail screen. This shows everything about the property:"),
    bullet("All photos in a full-width carousel — tap any photo to view it full screen"),
    bullet("Complete property description written by the landlord"),
    bullet("Full list of amenities with icons"),
    bullet("Walk Score breakdown — what you can walk to and how far"),
    bullet("Transit information — nearest bus stops, train stations, underground"),
    bullet("Landlord profile with name, avatar, and member-since date"),
    bullet("Contact button — opens direct chat with the landlord"),
    bullet("Apply button — starts the formal Property Agreement flow (see Section 5.6)"),
    bullet("Save and Share buttons in the header"),
    spacer(),
    screenshot("Housing Listing Full Detail Screen", [
      "Full-width photo at top with page dots indicator",
      "Property title and address",
      "Price prominently displayed with deposit below",
      "Stats grid",
      "Description section with 'Read more' link",
      "Amenities grid with icons",
      "Walk Score visual",
      "Landlord card with avatar and name",
      "Large 'Apply for Property' button at bottom in Comlinkr blue",
    ], 72, B.green),
    spacer(),
    h2("5.5  Shared Spaces"),
    body("Shared Spaces are rooms, beds, or living arrangements within a larger home where multiple people live together. They are ideal if you want to save money, meet new people, or are new to a city and want the comfort of housemates."),
    spacer(),
    body("Each Shared Space card shows:"),
    bullet("Room photo and price per month"),
    bullet("How many current housemates are living in the property"),
    bullet("House rules summary — e.g. No smoking, Quiet after 11pm"),
    bullet("A brief description of the living situation"),
    bullet("An 'Apply' button to submit a formal application to the space"),
    spacer(),
    screenshot("Shared Space Card", [
      "Room photo at top",
      "Price per month prominently shown",
      "Housemate count with a people icon",
      "House rules in a compact chip list",
      "Brief description of the space",
      "'Apply' button in green",
      "Bookmark icon in top right",
    ], 75, B.green),
    spacer(),
    h2("5.6  The Property Agreement Flow — Legal Housing Contracts"),
    body("Comlinkr includes a built-in legal agreement system that allows tenants to formally apply for a property and sign a digital tenancy agreement — all within the app. This flow is triggered when you tap 'Apply for Property' on any listing."),
    spacer(),
    callout("legal", "The Property Agreement flow generates legally binding digital contracts under UK Assured Shorthold Tenancy (AST) law or US residential lease law, depending on the country of the property. By completing this flow you are entering into a legal tenancy agreement. Read every screen carefully before signing."),
    spacer(),
    h3("The 5-Step Property Agreement Process"),
    numberedItem(1, "Step 1 — Rental Application Form", "Fill in your personal details as a tenant: full legal name, current address, employment status, annual income band, number of people who will occupy the property, move-in date requested, any pets, and a short personal statement to the landlord. All fields are required. This information is shared with the landlord to help them assess your application."),
    spacer(0),
    numberedItem(2, "Step 2 — Review the Landlord's Offer", "The landlord's formal offer is displayed here, pre-populated with the agreed rental price, deposit amount, tenancy length, and any specific terms they have set. Read every term carefully. If you disagree with any term, use the chat function to discuss it with the landlord before proceeding. Once you proceed past this step, you are indicating acceptance of the offer terms.", B.green),
    spacer(0),
    numberedItem(3, "Step 3 — Read the Full Tenancy Agreement", "The full legal agreement is displayed — either a UK Assured Shorthold Tenancy (AST) agreement or a US residential lease, depending on the property's country. This is a complete legal document. Scroll through every section. It covers: rent payment schedule, deposit terms, landlord access rights, maintenance responsibilities, notice periods, break clauses, and dispute resolution procedures.", B.orange),
    spacer(0),
    numberedItem(4, "Step 4 — Electronic Signature (E-Signature)", "Type your full legal name into the signature field and check the confirmation box to confirm you have read and understood the agreement. Your typed name acts as a legally binding electronic signature under the Electronic Communications Act 2000 (UK) or the Electronic Signatures in Global and National Commerce Act (US). A timestamp and your IP address are recorded for legal verification.", B.purple),
    spacer(0),
    numberedItem(5, "Step 5 — Deposit Protection and Move-in Confirmation", "Select your deposit protection scheme from the approved list. In the UK: Deposit Protection Service (DPS), MyDeposits, or Tenancy Deposit Scheme (TDS). In the US: Held in escrow, Landlord held account, or Third-party escrow service. Confirm your intended move-in date. You will receive a PDF copy of the signed agreement to your registered email address. The landlord also receives a copy.", B.green),
    spacer(),
    callout("imp", "Never sign a tenancy agreement for a property you have not physically viewed, or if the landlord has pressured you to skip any step. If anything feels wrong, stop the process and use the Report button to alert Comlinkr's Trust & Safety team."),
    spacer(),
    screenshot("Property Agreement — Step Progress Bar", [
      "5-step progress indicator at the top",
      "Step 1: Application — currently active (highlighted)",
      "Steps 2–5: Review Offer, Agreement, E-Signature, Move-in shown ahead",
      "Completed steps shown with a green checkmark",
      "Step labels: Application, Review Offer, Agreement, E-Signature, Move-in",
    ], 80, B.green),
    spacer(),
    screenshot("Step 3 — Full Tenancy Agreement Screen", [
      "Full scrollable legal document",
      "Clear section headings: Parties, Property, Term, Rent, Deposit, Obligations",
      "Important clauses highlighted",
      "'I have read and understood this agreement' checkbox at the bottom",
      "'Proceed to Sign' button — only enabled after scrolling to the bottom",
    ], 72, B.orange),
    spacer(),
    screenshot("Step 4 — E-Signature Screen", [
      "Signature field where tenant types full legal name",
      "Agreement confirmation checkbox",
      "Timestamp displayed below the signature field",
      "Legal notice explaining the e-signature is binding",
      "'Sign Agreement' button in blue",
    ], 72, B.purple),
    spacer(),
    h2("5.7  Roommate Matching"),
    body("The Roommates tab is a dedicated matching system to help you find a compatible housemate. It works like a profile-based matching system — you set your lifestyle preferences, and Comlinkr surfaces the most compatible people looking for a room or a roommate in your city."),
    spacer(),
    h3("Setting Up Your Roommate Profile"),
    body("Tap 'Set Up Preferences' the first time you visit the Roommates tab. Fill in:"),
    bullet("Your monthly budget for rent"),
    bullet("When you want to move in (date picker)"),
    bullet("Sleep schedule — Early Bird (before 10pm) / Night Owl (after midnight) / Flexible"),
    bullet("Cleanliness level — Very tidy / Reasonably tidy / Relaxed"),
    bullet("Noise tolerance — Quiet household / Some noise OK / Lively is fine"),
    bullet("Pet-friendliness — Love pets / Allergic / Prefer no pets"),
    bullet("Smoking preference — Non-smoking only / Smoking outside OK / No preference"),
    bullet("How many housemates you prefer — 1, 2, 3, 4+"),
    bullet("A short personal note about yourself (optional but strongly recommended)"),
    spacer(),
    callout("tip", "A complete and honest roommate profile dramatically increases the quality of your matches. People who fill in all fields receive 3× more connection requests than those who leave it partially blank."),
    spacer(),
    screenshot("Roommate Preferences Setup Modal", [
      "Modal sliding up from bottom",
      "Budget slider or input field",
      "Move-in date picker",
      "Lifestyle option chips: sleep schedule, cleanliness, noise, pets, smoking",
      "Housemate count selector",
      "Personal note text area",
      "'Save Preferences' button in blue at bottom",
    ], 72, B.green),
    spacer(),
    h3("Browsing and Connecting with Roommates"),
    body("Once your preferences are saved, the Roommates tab shows you a list of potential matches. Each card shows:"),
    bullet("The person's avatar, name, and city"),
    bullet("Their key preferences as chips (e.g. Non-smoker, Pet-friendly, Early bird)"),
    bullet("Their budget range"),
    bullet("A compatibility score based on how closely your preferences align"),
    bullet("A 'Connect' button to send a connection request"),
    spacer(),
    body("When you tap 'Connect', the other person receives a notification. If they accept, you can start a direct chat. Cards showing 'Pending' mean your request is waiting for a response."),
    screenshot("Roommate Match Card", [
      "User avatar and name at top",
      "City and move-in date",
      "Lifestyle chips in a row",
      "Budget range shown",
      "Compatibility score (e.g. '87% Match')",
      "'Connect' button in green",
      "Already sent: 'Pending' label instead of Connect button",
    ], 75, B.green),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC 6 – FOOD
// ═══════════════════════════════════════════════════════════════════════════════
function sec6() {
  return [
    sectionBanner("SECTION 6  —  FOOD", B.orange, B.orangeBg),
    h1("6.  Food — Discover Restaurants"),
    body("The Food tab is your local restaurant guide, review platform, and discovery engine. Find the best places to eat near you, check real-time wait times, read honest community reviews, and get inspired by popular dishes — all in one place."),
    spacer(),
    screenshot("Food Tab — Main View", [
      "Search bar at the top",
      "Filter chips below: All, Open Now, Dine-in, Takeout, Delivery",
      "Restaurant cards in a scrollable vertical list",
      "Sort options: Distance, Rating, Wait Time",
    ], 85, B.orange),
    spacer(),
    h2("6.1  Understanding a Restaurant Card"),
    infoTable([
      ["Cover Photo",      "A full-width image of the restaurant, food, or interior — 165px tall — giving you an instant visual impression."],
      ["Open/Closed Badge","A green 'Open' or red 'Closed' status badge with the closing time shown (e.g. 'Open until 10:30pm')."],
      ["Price Level",      "Shown as $ / $$ / $$$ / $$$$ overlaid on the image. $ = budget, $$$$ = fine dining."],
      ["❤️ Favourite",     "Tap the heart icon on the card to add the restaurant to your favourites. Tap again to remove."],
      ["⭐ Rating Chip",   "The restaurant's average star rating from community reviews (e.g. ⭐ 4.3)."],
      ["📍 Distance Chip", "How far the restaurant is from your current location (e.g. 0.4 mi)."],
      ["⏱ Wait Chip",      "The estimated current wait time for a table (e.g. ~15 min wait)."],
      ["Service Chips",    "Badges showing which services are available: Dine-in, Takeout, Delivery."],
      ["Popular Dishes",   "A horizontal scroll of must-try dish names from this restaurant."],
      ["Order Button",     "Taps through to the restaurant's ordering platform (Uber Eats, DoorDash, direct website, etc.)."],
      ["Chat Button",      "Opens a direct chat with the restaurant to ask questions, make reservations, or give feedback."],
    ]),
    spacer(),
    screenshot("Restaurant Card — All Elements Labelled", [
      "Full-width cover photo (165px) at top of card",
      "Open/Closed badge top-left on the image",
      "Price level ($-$$$$) bottom-right on the image",
      "Heart/favourite icon top-right on the image",
      "Restaurant name in bold below the image",
      "Rating, Distance, Wait chips in a row",
      "Service chips: Dine-in, Takeout, Delivery",
      "Popular dishes horizontal scroll",
      "Order and Chat buttons side by side at bottom",
    ], 80, B.orange),
    spacer(),
    h2("6.2  Searching and Filtering"),
    body("Use the search bar to find restaurants by name or cuisine type. The filter chips below the search bar let you narrow results quickly:"),
    bullet("Open Now — shows only restaurants currently open based on their stated hours"),
    bullet("Dine-in — shows only restaurants offering table service"),
    bullet("Takeout — shows only restaurants offering collection orders"),
    bullet("Delivery — shows only restaurants offering home delivery"),
    spacer(),
    body("For more detailed filtering, tap the 'Filters' icon to the right of the search bar:"),
    bullet("Cuisine type — Italian, Chinese, Indian, Mexican, Japanese, American, Mediterranean, and more"),
    bullet("Price range — filter by $ / $$ / $$$ / $$$$"),
    bullet("Minimum star rating — e.g. only show 4 stars and above"),
    bullet("Maximum distance — within 0.5 mi / 1 mi / 2 mi / 5 mi"),
    bullet("Sort by — Distance (nearest first), Rating (highest first), Wait Time (shortest first)"),
    spacer(),
    h2("6.3  Viewing a Restaurant in Full Detail"),
    body("Tap the body of any restaurant card to open the full detail view:"),
    bullet("Full photo gallery — swipe through all the restaurant's photos"),
    bullet("Full menu or popular dishes list with prices"),
    bullet("All community reviews with star ratings and written feedback"),
    bullet("Opening hours for every day of the week"),
    bullet("Full address with a 'Get Directions' link that opens your device's maps app"),
    bullet("Phone number and website link if available"),
    bullet("Services confirmed: Dine-in, Takeout, Delivery with specific hours for each"),
    spacer(),
    screenshot("Restaurant Full Detail Screen", [
      "Photo gallery at top with swipe navigation",
      "Restaurant name and rating",
      "Service badges",
      "Opening hours section (Today highlighted)",
      "Popular dishes with prices",
      "Reviews section with star ratings",
      "Map/address section",
      "'Order' and 'Chat' buttons",
    ], 72, B.orange),
    spacer(),
    h2("6.4  Writing a Review"),
    body("After visiting a restaurant, you can share your experience with the community. Honest, detailed reviews help everyone make better food decisions."),
    spacer(),
    numberedItem(1, "Open the Restaurant Detail", "Tap the restaurant card to open the full detail view.", B.orange),
    spacer(0),
    numberedItem(2, "Scroll to the Reviews Section", "Scroll down past the menu and details to find the Reviews section.", B.orange),
    spacer(0),
    numberedItem(3, "Tap 'Write a Review'", "A review modal slides up from the bottom.", B.orange),
    spacer(0),
    numberedItem(4, "Select Your Star Rating", "Tap 1 to 5 stars. 1 = Poor, 2 = Fair, 3 = Good, 4 = Very Good, 5 = Excellent.", B.orange),
    spacer(0),
    numberedItem(5, "Write Your Review", "Type your honest experience in the text field. Minimum 20 characters. Include what you ordered, what the service was like, and whether you would go back.", B.orange),
    spacer(0),
    numberedItem(6, "Tap 'Submit Review'", "Your review appears immediately on the restaurant's page. The restaurant's average rating updates automatically.", B.orange),
    spacer(),
    callout("imp", "Reviews must be based on genuine personal experience. Fake reviews, reviews written in exchange for payment, or reviews designed to unfairly damage a business violate Comlinkr's Community Guidelines and may result in account suspension."),
    spacer(),
    screenshot("Write a Review Modal", [
      "Restaurant name at top of modal",
      "5 star icons — tap to select rating",
      "Selected stars filled in yellow/gold",
      "Review text input field below stars",
      "Character count / minimum count shown",
      "'Submit Review' button in orange at bottom",
      "'Cancel' option in the header",
    ], 68, B.orange),
    spacer(),
    callout("note", "You can edit or delete your own review at any time. Tap the three-dot menu (⋮) on your review card and select 'Edit Review' or 'Delete Review'."),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC 7 – COMMUNITY Q&A
// ═══════════════════════════════════════════════════════════════════════════════
function sec7() {
  return [
    sectionBanner("SECTION 7  —  COMMUNITY Q&A", B.purple, B.purpleBg),
    h1("7.  Community Q&A"),
    body("The Community tab is Comlinkr's neighbourhood knowledge-base. If you have a question that only a local can answer — about the best doctor in the area, which supermarket has the best prices, whether a particular neighbourhood is safe, or how to navigate the local council — this is the place to ask."),
    spacer(),
    screenshot("Community Q&A Tab — Main View", [
      "Search bar at the top",
      "Filter chips: All, Unanswered, Most Voted, My Questions",
      "Question cards in a scrollable list",
      "'+Ask' button in purple/blue in the header or floating bottom right",
    ], 85, B.purple),
    spacer(),
    h2("7.1  Understanding a Question Card"),
    infoTable([
      ["Author",          "The avatar and name of the person who asked the question"],
      ["Question Title",  "A short, clear question in bold text"],
      ["Preview",         "The first line of the question body if more detail was added"],
      ["Tags",            "Category labels attached by the asker (e.g. 'Healthcare', 'Transport', 'Safety')"],
      ["Upvote Count",    "How many people have upvoted this question — higher = more community relevance"],
      ["Answer Count",    "How many answers have been submitted — tap the card to read them all"],
      ["Bookmark Icon",   "Save the question to read or come back to later"],
    ]),
    spacer(),
    h2("7.2  How to Ask a Question — Step by Step"),
    numberedItem(1, "Tap the '+ Ask' Button", "Located in the top right of the Community tab or as a floating button at the bottom right of the screen.", B.purple),
    spacer(0),
    numberedItem(2, "Write a Clear Question Title", "Keep it short and specific. Good: 'Which GP surgery in [City] accepts new NHS patients?' Bad: 'Doctors'.", B.purple),
    spacer(0),
    numberedItem(3, "Add More Detail (Optional but Recommended)", "In the body field, add any context that helps people give you a better answer — your situation, what you have already tried, or what specifically you need.", B.purple),
    spacer(0),
    numberedItem(4, "Select Up to 3 Tags", "Choose tags that categorise your question — Healthcare, Transport, Housing, Safety, Schools, Shopping, Restaurants, Government, Events, or Other.", B.purple),
    spacer(0),
    numberedItem(5, "Tap 'Post Question'", "Your question is published instantly. Community members in your city are notified. You will receive a notification each time someone submits an answer.", B.purple),
    spacer(),
    screenshot("Ask a Question Screen", [
      "Question title input field at top (required)",
      "Question body text area below (optional, multi-line)",
      "Tag selector with up to 3 tags selectable",
      "Available tags shown as chips",
      "'Post Question' button in purple/blue at bottom",
      "Character counter for the title field",
    ], 70, B.purple),
    spacer(),
    h2("7.3  Answering a Question"),
    numberedItem(1, "Open a Question", "Tap any question card to open the full question and answer thread.", B.purple),
    spacer(0),
    numberedItem(2, "Read Existing Answers", "Scroll through answers already submitted by others. The most upvoted answer appears at the top.", B.purple),
    spacer(0),
    numberedItem(3, "Tap 'Write an Answer'", "A text field appears at the bottom of the screen.", B.purple),
    spacer(0),
    numberedItem(4, "Type Your Answer", "Share your knowledge from personal experience. Be specific, honest, and helpful. Include any useful details like names, addresses, or timeframes.", B.purple),
    spacer(0),
    numberedItem(5, "Tap 'Submit'", "Your answer is posted immediately below the question and you receive any upvotes or replies it generates.", B.purple),
    spacer(),
    h2("7.4  Voting on Questions and Answers"),
    body("Voting is how the community surfaces the best information. The most useful questions and answers rise to the top."),
    bullet("Tap the ▲ upvote arrow on any question to promote it — this helps more people see it"),
    bullet("Tap the ▲ upvote arrow on any answer to signal it is accurate and helpful"),
    bullet("Tap the ▼ downvote arrow if an answer is incorrect, misleading, or unhelpful"),
    bullet("The answer with the most upvotes is pinned to the top of the thread"),
    callout("note", "You can only vote once per question or answer. You cannot vote on your own submissions."),
    spacer(),
    screenshot("Question Thread — With Answers and Voting", [
      "Original question at top in a highlighted card",
      "Answer count and upvote count shown below the question",
      "Answers listed below, sorted by upvote count",
      "▲ and ▼ arrows next to each answer with vote count in between",
      "Top answer pinned with a 'Top Answer' label",
      "Your answer highlighted differently if you submitted one",
      "'Write an Answer' text input at bottom of screen",
    ], 75, B.purple),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC 8 – CHAT
// ═══════════════════════════════════════════════════════════════════════════════
function sec8() {
  return [
    sectionBanner("SECTION 8  —  CHAT & MESSAGING", B.blue, B.blueBg),
    h1("8.  Chat & Direct Messaging"),
    body("Comlinkr has a built-in real-time messaging system. Chat directly with landlords about properties, ask restaurant owners questions, follow up with potential roommates after connecting, or simply message any other Comlinkr user you have interacted with."),
    spacer(),
    h2("8.1  How to Start a Conversation"),
    body("You can initiate a chat from multiple places across the app. You never need to search for someone's profile to message them — context-relevant chat buttons appear exactly where you need them:"),
    infoTable([
      ["From a Housing Listing",   "Tap the 'Chat' button on any listing card or detail screen to message the landlord directly about that property"],
      ["From a Restaurant Card",   "Tap the 'Chat' button on any restaurant card to message the owner — great for reservations or allergy questions"],
      ["From a Roommate Card",     "After a connection request is accepted, tap 'Chat' on their card to start messaging"],
      ["From Any User's Profile",  "Open a user's profile page and tap the 'Message' button"],
      ["From the Chat List",       "Tap the 💬 header icon → tap the compose icon in the top right to start a new conversation by username"],
    ]),
    spacer(),
    screenshot("Chat List Screen", [
      "List of all conversations sorted by most recent message",
      "Each row: avatar, name, last message preview, and timestamp",
      "Unread conversations have a blue dot indicator on the left",
      "Compose/new chat icon in the top right header",
      "Search bar at top to find a specific conversation",
    ], 70),
    spacer(),
    h2("8.2  Inside a Conversation"),
    infoTable([
      ["Sending a Message",    "Type in the text field at the bottom of the screen. Tap the send arrow ➤ or press the Enter key on your keyboard to send."],
      ["Sending an Image",     "Tap the attachment icon 📎 to the left of the text field. Choose from your camera roll or take a new photo. Tap send."],
      ["Reading Receipts",     "Single tick = sent. Double tick = delivered. Blue double tick = read by the recipient."],
      ["Message Timestamps",   "Tap any message to reveal the exact time it was sent."],
      ["Deleting a Message",   "Long press on any message you sent to reveal the option to delete it. Deleted messages show 'This message was deleted'."],
    ]),
    spacer(),
    screenshot("Chat Conversation Screen", [
      "Recipient name and avatar at the top in the navigation bar",
      "Your messages on the right in blue bubbles",
      "Their messages on the left in grey bubbles",
      "Image messages shown as full-width thumbnails",
      "Read receipts (ticks) next to your messages",
      "Text input field at the bottom with attachment and send icons",
      "Keyboard visible with input focused",
    ], 70),
    callout("imp", "Never share sensitive personal information in chat — passport numbers, bank details, or home address until you have verified the other party's identity. If someone in chat makes you uncomfortable, use the Report or Block option from the three-dot menu in the conversation header."),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC 9 – PROFILE, BADGES & VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════
function sec9() {
  return [
    sectionBanner("SECTION 9  —  PROFILE, BADGES & VERIFICATION", B.orange, B.orangeBg),
    h1("9.  Your Profile, Badges & Verification"),
    h2("9.1  Your Public Profile"),
    body("Your profile is how other users see you on Comlinkr. A complete, verified profile builds trust — landlords, restaurant owners, and potential roommates all look at profiles before deciding whether to engage."),
    spacer(),
    screenshot("My Profile Screen — Public View", [
      "Full-width profile photo or gradient avatar at top",
      "Display name in large bold text",
      "@username in smaller text below",
      "City, State, Country with a location pin icon",
      "Verification badges and PRO badge if applicable",
      "Post count, Followers count, Following count in a row",
      "Bio text below the stats",
      "Posts grid or list below the bio",
    ], 70, B.orange),
    spacer(),
    h2("9.2  Editing Your Profile"),
    numberedItem(1, "Open the Hamburger Menu", "Tap ☰ in the top-left corner of any main screen.", B.orange),
    spacer(0),
    numberedItem(2, "Tap 'Edit Profile'", "Either from the Edit button in the profile card at the top of the menu, or from hamburger menu → My Profile → Edit.", B.orange),
    spacer(0),
    numberedItem(3, "Update Your Photo", "Tap your current avatar. Choose 'Take Photo' to use your camera, or 'Choose from Library' to pick from your photo gallery. Crop and confirm.", B.orange),
    spacer(0),
    numberedItem(4, "Update Your Information", "Change any of: Display Name, Bio, Phone Number, Country code and number, Location (city/state/country).", B.orange),
    spacer(0),
    numberedItem(5, "Tap 'Save'", "All changes are saved and reflected across the app immediately — your posts, comments, and listing cards all update to show the new name and photo.", B.orange),
    spacer(),
    screenshot("Edit Profile Screen", [
      "Avatar at top with camera icon overlay to change it",
      "Display Name input field",
      "Username input field (with note if change is limited)",
      "Bio multi-line text area",
      "Phone number field with country code selector",
      "Location section: Country, State, City dropdowns",
      "'Save Changes' button in orange at bottom",
    ], 70, B.orange),
    spacer(),
    h2("9.3  Understanding Badges — Why They Matter"),
    body("Badges are verified credentials on your Comlinkr profile. They are not cosmetic — they unlock real features in the app that regular accounts cannot access. More importantly, they signal to other users that you are who you say you are."),
    spacer(),
    body("Here is why badges matter:"),
    bullet("A Verified Landlord badge means other users can trust you are a genuine property owner — not a scammer"),
    bullet("A Verified Restaurant Owner badge confirms the business listing belongs to the legitimate owner"),
    bullet("A Verified Agency badge allows professional letting agencies to post volume listings with their branding"),
    bullet("A Local Reviewer badge signals that your food and place reviews come from a trusted, established community member"),
    spacer(),
    callout("legal", "Badge verification requires submission of official documentation. This documentation is stored securely by Comlinkr and used only for the purpose of identity and credential verification. It is never shared publicly or with third parties. See Section 11 for the full Privacy Policy."),
    spacer(),
    h3("The Four Badges Available"),
    spacer(0),
    badgeCard("🏠", "Verified Property Host", B.blue,
      "Verified trust badge on all listings  •  Priority placement in housing search  •  Direct tenant messaging  •  Access to the Property Agreement flow",
      "Tenants are increasingly savvy about rental scams. A Verified Property Host badge tells every prospective tenant that your property is real, your identity has been checked by the Comlinkr Trust & Safety team, and your listing can be trusted. Unverified listings are shown below verified ones in search results. This badge is open to property owners AND authorised property managers.",
      "Upload a government-issued photo ID plus proof you have the right to list the property. See the full document list below."
    ),
    spacer(0),
    badgeCard("🍴", "Verified Restaurant Owner", B.green,
      "Verified Business badge on restaurant posts  •  Priority placement in Food search  •  Ability to reply to community reviews  •  Manage menu and hours  •  Access owner analytics",
      "Diners trust businesses that have been vetted. A Verified Restaurant Owner badge confirms your listing is a real, operating business. It also unlocks the critical ability to respond to customer reviews — essential for managing your reputation and showing prospective diners you take feedback seriously. Unverified restaurant listings cannot respond to reviews.",
      "Upload your business registration number or food hygiene certificate plus a government-issued photo ID. See the full document list below."
    ),
    spacer(0),
    badgeCard("🏢", "Verified Agency", B.orange,
      "Unlimited listings with agency branding  •  Priority search placement  •  Multi-agent team support  •  Agency Dashboard  •  Client Money Protection compliance visibility",
      "Letting agencies listing through Comlinkr get significantly higher search visibility than individual landlords when they carry the Agency badge. It signals professionalism, regulatory compliance, and scale to prospective tenants. This is the highest tier of housing verification on Comlinkr.",
      "Upload your business registration certificate, agency licence number (ARLA Propertymark / NAEA in the UK, state real estate licence in the US), and government-issued photo ID for the account holder. Processing: 5–7 business days."
    ),
    spacer(0),
    badgeCard("⭐", "Local Reviewer", "F59E0B",
      "Trusted reviewer badge on profile and all reviews  •  Priority placement in community review search  •  Higher visibility for restaurant recommendations  •  Access to the Community Post form on restaurant listings",
      "The most helpful thing one community member can give another is honest, reliable local knowledge. The Local Reviewer badge signals to every reader of your reviews that you are a real, verified community member — not a bot or a paid reviewer. This badge requires only proof of identity, not any business documents.",
      "Upload a government-issued photo ID, provide your neighbourhood or area you regularly visit, and write a brief bio about your food interests and local knowledge. The Comlinkr team reviews your application and review history."
    ),
    spacer(),
    h3("Accepted Documents — United Kingdom"),
    infoTable([
      ["Verified Property Host (UK)", "Photo ID: Passport, UK driving licence, or BRP.  Property proof: HM Land Registry title, mortgage statement, council tax bill, tenancy agreement, or written owner authorisation."],
      ["Verified Restaurant Owner (UK)", "Photo ID: Passport, UK driving licence, or BRP.  Business proof: Companies House registration number, food hygiene certificate, or local authority business licence."],
      ["Verified Agency (UK)", "Companies House registration, ARLA Propertymark or NAEA membership certificate, and Client Money Protection certificate. Plus photo ID for account holder."],
      ["Local Reviewer (UK)", "Photo ID: Passport, UK driving licence, or BRP. No business documents required."],
    ]),
    spacer(),
    h3("Accepted Documents — United States"),
    infoTable([
      ["Verified Property Host (US)", "Photo ID: US passport, state driver's licence, state ID card, or Permanent Resident Card (Green Card).  Property proof: title deed, mortgage statement, property tax bill, tenancy agreement, or written owner authorisation."],
      ["Verified Restaurant Owner (US)", "Photo ID: as above.  Business proof: EIN confirmation, state business licence, or food service permit."],
      ["Verified Agency (US)", "State real estate agency licence, broker licence, or business registration certificate. Plus photo ID for account holder."],
      ["Local Reviewer (US)", "Photo ID: Driver's licence, passport, or state ID. No business registration needed."],
    ]),
    spacer(),
    callout("imp", "Comlinkr NEVER asks you to pay to apply for a badge. Badge applications are always free. If anyone contacts you asking for payment to get your badge approved faster, it is a scam — report it immediately to support@comlinkr.com."),
    spacer(),
    h3("Anti-Fraud Guidelines for Badge Holders"),
    body("When your badge is approved, you agree to the following standards. Violations result in immediate permanent badge revocation:"),
    bullet("Never ask tenants or customers for payment before a verified viewing or confirmed booking"),
    bullet("All communication with tenants must happen through Comlinkr's in-app chat — this protects both parties"),
    bullet("Do not share personal financial information outside of official Comlinkr verification flows"),
    bullet("Fake listings or misrepresented properties (wrong photos, wrong address, wrong price) result in immediate permanent badge revocation"),
    bullet("Listings must accurately reflect the real property — photos, price, and address must match exactly"),
    bullet("Never share your Comlinkr account credentials with anyone else"),
    spacer(),
    h2("9.4  Applying for a Badge — Step by Step"),
    numberedItem(1, "Go to Verification Status", "Open the Hamburger Menu → Verification Status. You will see all four badge types listed with their current status (Not Applied, Under Review, Verified, or Not Approved).", B.orange),
    spacer(0),
    numberedItem(2, "Tap 'Apply' on the Badge You Want", "Tap the Apply button on the badge card you want to apply for.", B.orange),
    spacer(0),
    numberedItem(3, "Upload the Required Documents", "You will be prompted to upload the specific documents for that badge type. Take clear, well-lit photos of your documents. All four corners must be visible.", B.orange),
    spacer(0),
    numberedItem(4, "Submit Your Application", "Tap 'Submit Application'. You will receive a notification that your application is Under Review.", B.orange),
    spacer(0),
    numberedItem(5, "Wait for Review (2–5 Business Days)", "The Comlinkr Trust & Safety team reviews your documents manually. You receive a notification when a decision is made — either Verified or Not Approved.", B.orange),
    spacer(0),
    numberedItem(6, "If Not Approved", "The rejection reason is displayed on the badge card. Common reasons: document not legible, wrong document type, or name mismatch. You can re-apply after addressing the issue.", B.orange),
    spacer(),
    screenshot("Verification Status Screen — All Four Badges", [
      "4 badge cards, one per badge type",
      "Each card shows the badge icon, gradient colour, badge name, and 'Unlocks' description",
      "Status indicator on each card: Not Applied (grey), Under Review (yellow), Verified (green), Not Approved (red)",
      "'Apply' button on Not Applied badges",
      "'View Details' on Under Review and Verified badges",
      "'Re-apply' on Not Approved badges",
    ], 75, B.orange),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC 10 – NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════
function sec10() {
  return [
    sectionBanner("SECTION 10  —  NOTIFICATIONS", B.blue, B.blueBg),
    h1("10.  Notifications"),
    body("Comlinkr notifies you of activity that matters to you — from likes on your posts to new messages from landlords to updates on your badge application. You are always in control of which notifications you receive."),
    spacer(),
    h2("10.1  Accessing Your Notifications"),
    body("Tap the ☰ hamburger menu. The Notifications row shows an orange badge with your unread count. Tap it to open the full notifications screen."),
    spacer(),
    h3("Using the Notifications Screen"),
    infoTable([
      ["All / Unread Filter", "Two filter chips at the top of the screen: 'All' shows every notification. 'Unread' shows only notifications you have not yet tapped. Switch between them to manage your queue."],
      ["Mark All as Read",    "A 'Mark All as Read' button in the header clears all unread indicators at once — useful if you have been away for a few days and want to start fresh."],
      ["Tap a Notification",  "Tapping any notification takes you directly to the relevant screen — the specific post, conversation, listing, or event that triggered it. It is marked as read automatically."],
      ["Pull to Refresh",     "Pull down on the notifications list to load any new notifications that arrived while you had the screen open."],
      ["Notification Age",    "Each notification shows how long ago it was sent — e.g. 'just now', '5m ago', '3h ago', or the full date for older items."],
    ]),
    spacer(),
    screenshot("Notifications Screen — Full View", [
      "All / Unread filter chips at the top",
      "List of notifications sorted most recent first",
      "Unread notifications have a blue left border highlight",
      "Each row: coloured icon on left, notification text, timestamp on right",
      "'Mark All as Read' button visible in the top navigation bar",
      "Pull-to-refresh indicator when dragging down",
    ], 70),
    spacer(),
    h2("10.2  Types of Notifications"),
    infoTable([
      ["❤️ Like",           "Someone liked one of your posts or reviews. Tap to see the post and all its reactions."],
      ["💬 Comment",        "Someone commented on your post. Tap to open the comment thread and reply directly."],
      ["👤 Follow",         "A new user has started following your profile. Tap to view their profile."],
      ["📅 Event Update",   "An event you registered for has been updated — date change, venue change, or cancellation. Tap to see the full event details."],
      ["🏠 Roommate",       "A roommate connection request was sent to you, accepted by the other person, or declined. Tap to view the roommate's profile or start chatting."],
      ["🏘 Housing Match",  "A new listing has appeared that matches your saved search filters. Tap to view the listing before it gets too many enquiries."],
      ["💬 Message",        "You received a new direct message. Tap to open the conversation immediately."],
      ["🔖 Save",           "Someone saved your post or housing listing to their collection."],
      ["⭐ Review",         "Someone submitted a review of your restaurant (restaurant owners only). Tap to read and respond."],
      ["🛡 Verification",   "Your badge application status has changed — approved, rejected, or further information is needed. Tap to see the decision and next steps."],
      ["📊 Poll",           "A new community poll has been posted in your city. Tap to cast your vote."],
      ["🗓 Event Reminder", "A reminder for an event you are registered for that is happening soon."],
    ]),
    spacer(),
    h2("10.3  Managing Notification Preferences"),
    body("Go to hamburger menu → Settings → Notifications to control exactly what alerts you receive and how they are delivered. This screen shows a toggle or selector for each notification type:"),
    infoTable([
      ["Push Notification",  "The notification appears on your device lock screen and in your notification centre even when the app is closed. Your phone vibrates or plays a sound."],
      ["In-App Only",        "No lock screen alert. You see the notification only when you open Comlinkr and check the Notifications screen. Good for low-priority types like Likes."],
      ["Off",                "You receive no notification for this type at all. The badge count on the Notifications menu item is not affected by off-type events."],
    ]),
    spacer(),
    callout("tip", "Recommended settings: keep Message, Roommate, and Verification on Push — these are time-sensitive. Set Like, Follow, and Save to In-App Only to reduce distractions. Set Poll to Off if you prefer to discover polls by browsing the Feed."),,
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC 11 – SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════
function sec11() {
  return [
    sectionBanner("SECTION 11  —  SETTINGS", B.grey, B.greyLight),
    h1("11.  Settings"),
    body("Access all settings via hamburger menu → Settings. Settings are organised into logical groups."),
    spacer(),
    screenshot("Settings Screen — Full View", [
      "Settings screen with grouped sections",
      "Each setting row: icon, label, and either a toggle, chevron, or value",
      "Section headers separating groups",
    ], 70),
    spacer(),
    h2("11.1  Appearance"),
    infoTable([
      ["Theme",    "Tap to switch between Light Mode (white background, dark text) and Dark Mode (dark background with blue and green accents). The change takes effect immediately across the entire app without requiring a restart."],
      ["Language", "Choose your preferred app display language. Currently supported: English (default), French, Spanish, German, Portuguese, Hindi, and Arabic. Post and review content is not auto-translated — only the app interface changes."],
    ]),
    spacer(),
    h2("11.2  Account"),
    infoTable([
      ["Email Address",       "Your registered email is displayed here. To change it, tap the field and follow the two-step verification — you must confirm access to both your old and new email addresses."],
      ["Change Password",     "Tap to open the password change screen. Enter your current password, then your new password twice. The new password must be at least 8 characters and different from the current one."],
      ["Phone Number",        "Add or update your phone number. Tap the country code flag to select your country dial code, then enter your number. Phone number is optional but recommended for account recovery."],
      ["My Listings",         "A direct link to all your housing listings — view, edit, or remove them from here. Only available if you have posted a listing."],
      ["My Restaurants",      "A direct link to all your restaurant listings — view, edit, or update them. Only available if you are a verified restaurant owner."],
      ["Verification Status", "Shortcut to the badge application screen. See Section 9 for full badge details."],
      ["Delete Account",      "Permanently deletes your account and all associated data. You are shown a confirmation screen that explains exactly what will be deleted before you confirm. This action is irreversible."],
    ]),
    spacer(),
    callout("imp", "Deleting your account is permanent and cannot be undone. All your posts, reviews, listings, messages, saved items, and profile data are deleted immediately from public view and within 30 days from Comlinkr's servers. Your username becomes available for others to use. Comlinkr cannot recover a deleted account under any circumstances."),
    spacer(),
    h2("11.3  Notifications"),
    body("This section shows a toggle for every notification type. Each can be set independently:"),
    infoTable([
      ["New Messages",           "Toggle Push or In-App — strongly recommended to keep on Push"],
      ["Comments on Your Posts", "Toggle Push or In-App — useful to keep on if you post regularly"],
      ["Likes on Your Posts",    "Toggle In-App or Off — low priority, rarely needs a push alert"],
      ["New Followers",          "Toggle In-App or Off"],
      ["Event Updates",          "Toggle Push or In-App — keep on Push if you have registered for events"],
      ["Roommate Requests",      "Toggle Push — time-sensitive, recommended on Push"],
      ["Housing Matches",        "Toggle Push or In-App — on Push if you are actively looking"],
      ["Badge Verification",     "Toggle Push — always keep on Push so you see approval/rejection decisions quickly"],
      ["Review Responses",       "Toggle In-App — for restaurant owners who want to see replies to their reviews"],
    ]),
    spacer(),
    h2("11.4  Privacy Controls"),
    infoTable([
      ["Profile Visibility",        "Public — any Comlinkr user (or someone with the link) can view your profile. Private — only users you have approved as followers can see your posts and activity. Your name and avatar remain visible regardless."],
      ["City Visibility on Posts",  "Toggle whether your city name is shown on your posts and profile. Turning this off means your content still appears in your city's feed but your location is not displayed on your posts."],
      ["Appear in Roommate Search", "Toggle whether your roommate profile appears in the Roommates tab for others to see. Turn off when you have found a place and are no longer looking."],
      ["Anonymous Analytics",       "Toggle whether anonymised, aggregated usage data (no personal information) is shared with Comlinkr's analytics team to improve the app. Turning this off does not affect your experience."],
    ]),
    spacer(),
    h2("11.5  Blocked Users"),
    body("This section lists every user you have blocked. For each blocked user you can see their username and the date you blocked them."),
    bullet("To unblock a user: tap their name in the list and tap 'Unblock'. They can immediately see your profile and contact you again after unblocking."),
    bullet("Blocking someone new: use the three-dot menu (⋮) on any of their posts or their profile — not from this settings screen."),
    callout("note", "Unblocking a user does not automatically restore any messages that were deleted as a result of the block."),
    spacer(),
    h2("11.6  Data & Storage"),
    infoTable([
      ["Clear Cache",        "Deletes temporary cached images and data stored on your device by Comlinkr. This frees up storage space. The app will reload images from the server the next time you open it — this may feel slightly slower for a few minutes after clearing."],
      ["Download My Data",   "Request a full export of your personal data held by Comlinkr — including your posts, reviews, messages, account information, and activity history. You receive a download link to your registered email within 48 hours."],
      ["App Version",        "Displayed at the bottom of the Data & Storage section. Share this version number when contacting support so the team knows exactly which build you are on."],
    ]),,
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC 12 – LEGAL: TERMS, PRIVACY, COMMUNITY GUIDELINES
// ═══════════════════════════════════════════════════════════════════════════════
function sec12() {
  return [
    sectionBanner("SECTION 12  —  LEGAL, PRIVACY & COMMUNITY GUIDELINES", B.purple, B.purpleBg),
    h1("12.  Legal, Privacy & Community Guidelines"),
    body("This section explains your rights, your responsibilities, and how Comlinkr handles your data. Please read it — it is written in plain language on purpose."),
    spacer(),
    h2("12.1  Terms of Service — What You Agree To"),
    body("When you create a Comlinkr account, you agree to the following:"),
    spacer(),
    h3("Your Account"),
    bullet("You must be at least 18 years old to use Comlinkr"),
    bullet("You must provide accurate information when registering — a fake name or email voids the terms"),
    bullet("You are responsible for keeping your password secure — do not share it with anyone"),
    bullet("You are responsible for all activity that happens under your account"),
    spacer(),
    h3("Your Content"),
    bullet("You retain ownership of everything you post — photos, text, listings, and reviews"),
    bullet("By posting, you grant Comlinkr a non-exclusive, royalty-free licence to display your content within the app"),
    bullet("Comlinkr does not sell your content to third parties"),
    bullet("You can delete your content at any time — deleted content is removed from public view within 24 hours and from our servers within 30 days"),
    spacer(),
    h3("What Comlinkr Can Do"),
    bullet("Remove content that violates our Community Guidelines without notice"),
    bullet("Suspend or permanently ban accounts that repeatedly violate the Guidelines"),
    bullet("Cooperate with law enforcement if legally required to do so"),
    spacer(),
    callout("legal", "The full Terms of Service are available in the app at hamburger menu → Help & Support → Terms of Service, and at comlinkr.com/terms. They are updated periodically — you will be notified of material changes and asked to re-accept."),
    spacer(),
    h2("12.2  Privacy Policy — What Data We Collect and Why"),
    body("Comlinkr collects the minimum data necessary to run the service. Here is exactly what we collect and why:"),
    spacer(),
    infoTable([
      ["Account Information",  "Name, email, username, and optional profile details (bio, phone, photo). Used to: create and manage your account, identify you to other users, and communicate with you."],
      ["Location Data",        "Your selected city from onboarding. We use this to show you relevant local content. We do NOT track your real-time GPS location unless you explicitly grant location permissions for a specific feature like 'Events Near Me'."],
      ["Usage Data",           "Which screens you visit, features you use, and time spent in the app. Used to: improve the app experience and personalise your Feed. This data is anonymised and aggregated."],
      ["Content You Share",    "Posts, comments, messages, listings, and reviews you create. Stored to: provide the service. Messages are only visible to conversation participants."],
      ["Device Information",   "Device type, operating system version, and app version. Used to: diagnose technical problems and ensure compatibility."],
    ]),
    spacer(),
    h3("How We Share Your Information"),
    bullet("Your profile, posts, and listings are visible to other Comlinkr members in your city"),
    bullet("Direct messages are visible only to the participants in that conversation"),
    bullet("We work with trusted third-party hosting and analytics providers who are bound by confidentiality agreements — they cannot use your data for their own purposes"),
    bullet("We may disclose information if required by law, court order, or to protect the safety of users"),
    bullet("We never sell your personal data to advertisers or data brokers"),
    spacer(),
    h3("Your Rights Over Your Data"),
    bullet("Access: request a copy of all personal data we hold about you"),
    bullet("Correction: update or correct inaccurate data via Edit Profile or by contacting support"),
    bullet("Deletion: delete your account and all associated data from Settings → Account → Delete Account"),
    bullet("Portability: download your data via Settings → Data & Storage → Download My Data"),
    bullet("Opt-out: opt out of anonymised analytics data sharing in Settings → Privacy → Data Sharing"),
    spacer(),
    callout("legal", "For GDPR (European Union) or CCPA (California) data requests, email privacy@comlinkr.com with the subject line 'Data Rights Request' and include your full name and registered email address. We respond within 30 days as required by law."),
    spacer(),
    screenshot("Privacy Policy Screen — In App", [
      "Privacy Policy displayed as a full-screen scrollable document",
      "Section headers for each topic",
      "Last Updated date clearly visible at the top",
      "Contact information for data queries at the bottom",
    ], 65, B.purple),
    spacer(),
    h2("12.3  Community Guidelines — Behaviour We Do Not Allow"),
    body("Comlinkr is a community platform. The following types of content and behaviour are prohibited and will result in content removal, account suspension, or permanent ban:"),
    spacer(),
    callout("imp", "Violations are handled by our Trust & Safety team. Severe or repeated violations may be reported to relevant authorities. If you see a violation, report it immediately using the three-dot menu on any post, review, or profile."),
    spacer(),
    infoTable([
      ["Hate Speech",              "Content that targets individuals or groups based on race, religion, gender, sexual orientation, disability, or national origin"],
      ["Harassment & Bullying",    "Repeated unwanted contact, threats, or targeted campaigns designed to make someone feel unsafe"],
      ["Violence & Harm",          "Content that promotes, glorifies, or threatens physical violence against any person or group"],
      ["Misinformation",           "Deliberately false or misleading information — especially about health, safety, or local services"],
      ["Scams & Fraud",            "Fake listings, phishing attempts, impersonation, or any attempt to defraud another user"],
      ["Sexual Content",           "Explicit or sexually suggestive content of any kind is strictly prohibited"],
      ["Spam",                     "Repeated posting of the same content, unsolicited promotional messages, or bot activity"],
      ["Fake Reviews",             "Reviews not based on genuine personal experience, or reviews written in exchange for payment or other benefits"],
      ["Fake Listings",            "Properties listed that do not exist, are not available, or do not belong to the person posting them"],
      ["Underage Users",           "Creating an account for anyone under 18 years old is prohibited"],
    ]),
    spacer(),
    h2("12.4  Property Agreement Legal Notices"),
    body("The digital tenancy agreements generated through the Comlinkr Property Agreement flow are governed by the following legal frameworks:"),
    bullet("United Kingdom: Electronic Communications Act 2000, Housing Act 1988 (Assured Shorthold Tenancy), Tenant Fees Act 2019, Deposit Protection legislation"),
    bullet("United States: Electronic Signatures in Global and National Commerce Act (ESIGN), applicable state tenancy laws"),
    spacer(),
    callout("legal", "Comlinkr provides the agreement framework and e-signature mechanism as a convenience tool. We are not a law firm and do not provide legal advice. If you have questions about a specific tenancy agreement, consult a qualified solicitor (UK) or attorney (US) before signing."),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC 13 – HELP & SUPPORT
// ═══════════════════════════════════════════════════════════════════════════════
function sec13() {
  return [
    sectionBanner("SECTION 13  —  HELP & SUPPORT", B.green, B.greenBg),
    h1("13.  Help & Support"),
    h2("13.1  In-App Help"),
    body("Go to hamburger menu → Help & Support to access:"),
    bullet("Frequently Asked Questions (FAQ) — organised by topic"),
    bullet("Video tutorials — short walkthroughs of key features"),
    bullet("Contact form — send a message directly to the support team"),
    bullet("Bug Report form — report technical issues with a screenshot"),
    spacer(),
    screenshot("Help & Support Screen", [
      "FAQ section with expandable questions and answers",
      "Video Tutorials section with thumbnail previews",
      "Contact Us form with name, email, and message fields",
      "Report a Bug button with screenshot attachment option",
    ], 70, B.green),
    spacer(),
    h2("13.2  How to Report Inappropriate Content"),
    numberedItem(1, "Tap the three-dot menu ⋮", "Located on any post, comment, review, restaurant listing, or user profile.", B.green),
    spacer(0),
    numberedItem(2, "Tap 'Report'", "A report sheet slides up from the bottom.", B.green),
    spacer(0),
    numberedItem(3, "Choose a Reason", "Select from: Spam, Harassment, Hate Speech, Misinformation, Fake Listing, Inappropriate Content, Other.", B.green),
    spacer(0),
    numberedItem(4, "Add Details (Optional)", "Type any additional context that helps the Trust & Safety team understand your report.", B.green),
    spacer(0),
    numberedItem(5, "Tap 'Submit Report'", "The report is sent immediately. You receive a notification when action is taken.", B.green),
    spacer(),
    h2("13.3  How to Block a User"),
    body("Blocking a user prevents them from seeing your profile, posts, and listings, and stops them from sending you messages."),
    bullet("Tap the three-dot menu ⋮ on any of their posts, comments, or their profile"),
    bullet("Select 'Block [Username]'"),
    bullet("Confirm the block in the alert that appears"),
    bullet("The block takes effect immediately — they cannot contact you or see your content"),
    bullet("To unblock: hamburger menu → Settings → Blocked Users → find the user → Unblock"),
    spacer(),
    h2("13.4  Contact Support"),
    infoTable([
      ["Email",             "support@comlinkr.com — responses within 24–48 hours on business days"],
      ["In-App Form",       "hamburger menu → Help & Support → Contact Us"],
      ["Response Time",     "Standard: 24–48 hours. Urgent safety issues (scams, fraud, threats): within 4 hours"],
    ]),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC 14 – TROUBLESHOOTING
// ═══════════════════════════════════════════════════════════════════════════════
function sec14() {
  return [
    sectionBanner("SECTION 14  —  TROUBLESHOOTING", B.orange, B.orangeBg),
    h1("14.  Troubleshooting"),
    infoTable([
      ["App won't load / shows blank screen",    "Check your internet connection. Close and reopen the app. If on Wi-Fi, try switching to cellular data and back."],
      ["Feed content not refreshing",            "Pull down on the feed screen to manually refresh. If it still doesn't update, force-close the app and reopen."],
      ["Images not loading / showing grey boxes","Slow connection causes this. Wait a moment — images load progressively. On very slow connections, reduce image quality in Settings → Data & Storage."],
      ["Login error — 'Invalid credentials'",    "Check your email is correct (no typos). Make sure Caps Lock is not on for the password. Use 'Forgot Password?' to reset."],
      ["Push notifications not arriving",        "Go to your device Settings → Apps → Comlinkr → Notifications and ensure they are enabled. Also check Settings → Notifications in-app."],
      ["App crashes on a specific screen",       "Force-close the app completely and relaunch. If it crashes again on the same screen, update the app to the latest version from the App Store or Google Play."],
      ["Chat messages not sending",             "Check your internet connection. Messages turn grey if they fail to send — tap a grey message to retry."],
      ["Location showing wrong city",            "Go to hamburger menu → Edit Profile → Location and update your city."],
      ["Badge application showing 'Under Review' for more than 7 days", "Contact support at support@comlinkr.com with your registered email and the badge type you applied for."],
      ["Property agreement PDF not received",    "Check your spam folder. If not there, go to the Property Agreement history in your profile and download it directly from there."],
      ["Post not appearing in the Feed",         "New posts can take up to 60 seconds to appear. Pull down to refresh. If it still doesn't appear after 5 minutes, try posting again."],
    ]),
    spacer(),
    callout("tip", "90% of issues are resolved by updating the app to the latest version. Check the App Store or Google Play for updates before contacting support."),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC 15 – GLOSSARY
// ═══════════════════════════════════════════════════════════════════════════════
function sec15() {
  return [
    sectionBanner("SECTION 15  —  GLOSSARY", B.dark, B.greyLight),
    h1("15.  Glossary of Terms"),
    infoTable([
      ["Active Neighbour",     "A Comlinkr user in your city who is currently online or has been active in the last hour"],
      ["AST",                  "Assured Shorthold Tenancy — the standard form of private rented housing contract in England and Wales"],
      ["Badge",                "A verified credential on your Comlinkr profile that unlocks features and signals trustworthiness to other users"],
      ["Community Linker",     "The full name Comlinkr is derived from — the platform's purpose of linking community members"],
      ["DPS",                  "Deposit Protection Service — one of three approved UK tenancy deposit protection schemes"],
      ["E-Signature",          "An electronic signature — legally binding under UK and US law — made by typing your full name into the signature field"],
      ["Feed",                 "The scrollable stream of posts, news, events, and polls on the Explore tab"],
      ["For You Tab",          "The AI-curated tab within the Feed showing content most relevant to your interests and location"],
      ["Hero Banner",          "The live information card at the top of the Feed showing weather, active neighbours, and neighbourhood mood"],
      ["Listing",              "A housing property posted for rent or sale on Comlinkr's Housing tab"],
      ["Local Reviewer",       "A badge awarded to trusted Comlinkr users who consistently submit high-quality, genuine reviews"],
      ["Neighbourhood Mood",   "A daily community-voted emoji indicating the collective vibe of a city or neighbourhood"],
      ["PRO Badge",            "An indicator on a user's profile showing they hold a premium Comlinkr subscription"],
      ["Roommate Match",       "A suggested compatible housemate surfaced by Comlinkr based on shared lifestyle preferences"],
      ["Shared Space",         "A room or bed within a larger shared home available for rent — distinct from a full property listing"],
      ["Story",                "A photo or video post that disappears after 24 hours — displayed as a bubble in the Stories row"],
      ["TDS",                  "Tenancy Deposit Scheme — one of three approved UK tenancy deposit protection schemes"],
      ["Transit Score",        "A numeric rating (0–100) indicating the quality and accessibility of public transport near a property"],
      ["Trust & Safety Team",  "The Comlinkr team responsible for reviewing reports, verifying badges, and enforcing Community Guidelines"],
      ["Verification",         "The process by which Comlinkr confirms a user's credentials to award them a badge"],
      ["Walk Score",           "A numeric rating (0–100) indicating how walkable a neighbourhood is — based on proximity to shops, parks, and services"],
    ]),
    pageBreak(),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD
// ═══════════════════════════════════════════════════════════════════════════════
async function buildDoc() {
  const allChildren = [
    ...coverPage(),
    ...tocSection(),
    ...sec1(),
    ...sec2(),
    ...sec3(),
    ...sec4(),
    ...sec5(),
    ...sec6(),
    ...sec7(),
    ...sec8(),
    ...sec9(),
    ...sec10(),
    ...sec11(),
    ...sec12(),
    ...sec13(),
    ...sec14(),
    ...sec15(),
  ];

  const doc = new Document({
    title:       "Comlinkr Mobile App — Complete User Guide",
    description: "Detailed user guide covering every feature of the Comlinkr community mobile app",
    creator:     "Comlinkr",
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22, color: B.text } },
        heading1: { run: { font: "Calibri", size: 40, bold: true, color: B.dark },   paragraph: { spacing: { before: 480, after: 200 } } },
        heading2: { run: { font: "Calibri", size: 30, bold: true, color: B.blue },   paragraph: { spacing: { before: 360, after: 160 } } },
        heading3: { run: { font: "Calibri", size: 26, bold: true, color: B.dark },   paragraph: { spacing: { before: 280, after: 120 } } },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1008, bottom: 1008, left: 1080, right: 1080 } },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0 },
                border: { bottom: { color: B.blue, size: 8, space: 6, style: BorderStyle.SINGLE } },
                children: [
                  new ImageRun({ data: logoData, transformation: { width: 40, height: 40 }, type: "jpg" }),
                  run("  Comlinkr Mobile App — User Guide", { size: 18, color: B.grey }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { color: B.greyBorder, size: 4, space: 4, style: BorderStyle.SINGLE } },
                children: [
                  run("© 2026 Comlinkr  •  support@comlinkr.com  •  Page ", { size: 18, color: B.grey }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: B.grey, font: "Calibri" }),
                  run(" of ", { size: 18, color: B.grey }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: B.grey, font: "Calibri" }),
                ],
              }),
            ],
          }),
        },
        children: allChildren,
      },
    ],
  });

  const outPath = path.join(__dirname, "Comlinkr_User_Guide.docx");
  const buf     = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buf);
  const kb = Math.round(buf.length / 1024);
  console.log(`\n✅  User guide generated: ${outPath}  (${kb} KB)\n`);
}

buildDoc().catch((err) => {
  console.error("❌  Error:", err.message || err);
  process.exit(1);
});
