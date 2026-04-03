import type { Blueprint } from "./blueprintTypes";

export const SAMPLE_BLUEPRINTS: Blueprint[] = [
  {
    id: "bp-website-improvement-finder",
    name: "Website Improvement Finder",
    description:
      "Researches local businesses, reviews their websites, scores improvement opportunities, and generates an actionable report.",
    version: "1.0.0",
    workflowType: "single-agent",
    ui: {
      icon: "Globe",
      color: "#7c3aed",
      tags: ["research", "web", "lead-gen"],
      category: "Research",
    },
    instanceConfig: {
      questions: [
        {
          id: "q-location",
          label: "Target location",
          type: "text",
          placeholder: "e.g. Austin, TX",
          required: true,
          hint: "City and state or region to research businesses in.",
        },
        {
          id: "q-website-count",
          label: "Number of websites to review",
          type: "number",
          placeholder: "e.g. 10",
          required: true,
          defaultValue: 10,
          hint: "How many business websites should the agent evaluate?",
        },
        {
          id: "q-pause-steps",
          label: "Pause for review between steps",
          type: "boolean",
          defaultValue: false,
          hint: "If enabled, the agent will pause and wait for your approval before moving to the next step.",
        },
      ],
    },
    agentConfig: {
      primary: {
        role: "primary",
        label: "Research Agent",
        description:
          "Handles all web research, scraping, scoring, and report generation.",
        required: true,
        capabilities: ["web-search", "web-scrape", "text-analysis"],
      },
    },
    steps: [
      {
        id: "step-search-businesses",
        name: "Search Businesses",
        description:
          "Search for local businesses in the target location matching the configured criteria.",
        icon: "Search",
        agentRole: "primary",
        skills: [
          { id: "skill-web-search", name: "Web Search", description: "Search the web for business listings" },
        ],
        tools: [
          { id: "tool-serp", name: "SERP API", description: "Fetches search engine results" },
        ],
        prompt:
          "Search for {q-website-count} businesses in {q-location}. Return a list of business names, website URLs, and business categories.",
      },
      {
        id: "step-review-websites",
        name: "Review Websites",
        description:
          "Visit each business website and assess design, content quality, UX, mobile-readiness, and load speed.",
        icon: "Eye",
        agentRole: "primary",
        skills: [
          { id: "skill-web-scrape", name: "Web Scrape", description: "Extract content from web pages" },
        ],
        tools: [
          { id: "tool-browser", name: "Browser", description: "Headless browser for page inspection" },
        ],
        prompt:
          "Visit each website from the previous step. Evaluate: design quality, mobile-friendliness, content clarity, CTAs, and page speed. Score each dimension 1–10.",
      },
      {
        id: "step-score-opportunities",
        name: "Score Opportunities",
        description:
          "Rank each business by improvement potential and estimated value of website improvements.",
        icon: "BarChart2",
        agentRole: "primary",
        skills: [
          { id: "skill-analysis", name: "Text Analysis", description: "Synthesise scored data into rankings" },
        ],
        tools: [],
        prompt:
          "Using the website review scores, rank all businesses by improvement opportunity. Assign an overall opportunity score (1–100) based on how much impact better web presence could have.",
      },
      {
        id: "step-generate-report",
        name: "Generate Report",
        description:
          "Compile findings into a structured, shareable report with actionable recommendations.",
        icon: "FileText",
        agentRole: "primary",
        skills: [
          { id: "skill-report-gen", name: "Report Generation", description: "Format findings into a readable report" },
        ],
        tools: [
          { id: "tool-markdown", name: "Markdown Renderer", description: "Formats output as Markdown document" },
        ],
        prompt:
          "Generate a Markdown report summarising the top improvement opportunities. Include: business name, current score, key weaknesses, and top 3 recommended improvements per site.",
      },
    ],
    outputs: [
      {
        id: "out-opportunity-list",
        name: "Opportunity List",
        type: "json",
        description: "Ranked list of businesses with opportunity scores",
      },
      {
        id: "out-report",
        name: "Improvement Report",
        type: "report",
        description: "Full Markdown report of findings and recommendations",
      },
    ],
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
  },
  {
    id: "bp-competitive-analysis",
    name: "Competitive Analysis",
    description:
      "Identifies top competitors in a market, analyses their positioning, features, and pricing, and produces a comparative overview.",
    version: "1.0.0",
    workflowType: "multi-agent",
    ui: {
      icon: "TrendingUp",
      color: "#0ea5e9",
      tags: ["research", "strategy", "competitive"],
      category: "Strategy",
    },
    instanceConfig: {
      questions: [
        {
          id: "q-product",
          label: "Your product or service",
          type: "text",
          placeholder: "e.g. AI project management tool",
          required: true,
          hint: "Describe what you are building or selling.",
        },
        {
          id: "q-market",
          label: "Target market",
          type: "text",
          placeholder: "e.g. SMBs in SaaS",
          required: true,
        },
        {
          id: "q-competitor-count",
          label: "Number of competitors to analyse",
          type: "select",
          options: ["3", "5", "10"],
          defaultValue: "5",
          required: true,
        },
        {
          id: "q-include-pricing",
          label: "Include pricing analysis",
          type: "boolean",
          defaultValue: true,
        },
      ],
    },
    agentConfig: {
      primary: {
        role: "primary",
        label: "Research Lead",
        description: "Coordinates the analysis and synthesises the final report.",
        required: true,
        capabilities: ["web-search", "text-analysis"],
      },
      specialists: [
        {
          role: "specialist",
          label: "Pricing Analyst",
          description: "Specialises in extracting and normalising pricing data from competitor pages.",
          required: false,
          capabilities: ["web-scrape", "data-extraction"],
        },
      ],
    },
    steps: [
      {
        id: "step-identify-competitors",
        name: "Identify Competitors",
        description: "Find the top competitors in the target market.",
        icon: "Search",
        agentRole: "primary",
        skills: [
          { id: "skill-web-search", name: "Web Search" },
        ],
        tools: [
          { id: "tool-serp", name: "SERP API" },
        ],
        prompt:
          "Find the top {q-competitor-count} competitors for a {q-product} targeting {q-market}. Return company names, website URLs, and a brief description of each.",
      },
      {
        id: "step-analyse-positioning",
        name: "Analyse Positioning",
        description: "Review each competitor's messaging, value propositions, and target audience.",
        icon: "Target",
        agentRole: "primary",
        skills: [
          { id: "skill-web-scrape", name: "Web Scrape" },
          { id: "skill-analysis", name: "Text Analysis" },
        ],
        tools: [
          { id: "tool-browser", name: "Browser" },
        ],
        prompt:
          "Visit each competitor website. Extract their tagline, key value propositions, target audience, and primary CTAs.",
      },
      {
        id: "step-extract-pricing",
        name: "Extract Pricing",
        description: "Gather and normalise pricing data from each competitor.",
        icon: "DollarSign",
        agentRole: "specialist",
        skills: [
          { id: "skill-web-scrape", name: "Web Scrape" },
        ],
        tools: [
          { id: "tool-browser", name: "Browser" },
        ],
        prompt:
          "Extract pricing tiers, prices, and included features from each competitor's pricing page. Normalise into a comparable format.",
      },
      {
        id: "step-generate-comparison",
        name: "Generate Comparison",
        description: "Synthesise all data into a comparative overview with strategic insights.",
        icon: "FileText",
        agentRole: "primary",
        skills: [
          { id: "skill-report-gen", name: "Report Generation" },
        ],
        tools: [],
        prompt:
          "Using the positioning and pricing data, produce a competitive comparison table and a strategic insights summary. Identify gaps and opportunities for differentiation.",
      },
    ],
    outputs: [
      {
        id: "out-competitor-list",
        name: "Competitor List",
        type: "json",
        description: "Structured data for each identified competitor",
      },
      {
        id: "out-comparison-report",
        name: "Comparison Report",
        type: "report",
        description: "Full competitive analysis with positioning matrix and insights",
      },
    ],
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-03-15T00:00:00Z",
  },
];
