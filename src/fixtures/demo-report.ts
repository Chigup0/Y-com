// FICTIONAL demo data: companies, people and URLs are made up.
// Used by mock mode (/api/spy?mock=1) and as the stub output of src/lib/intel until it is implemented.
import type { CompetitorDossier, CounterAttackPlan, LaunchPrediction, SpyReport } from "@/lib/types";

const you = {
  crustdataCompanyId: 900001,
  name: "Acme Payments",
  domain: "acmepay.example",
  linkedinUrl: null,
  description: "Payment gateway and business banking for Indian SMBs.",
  headcount: 2400,
  headcountGrowthYoY: 12,
  industries: ["Financial Services"],
  hq: "Bengaluru, India",
  totalFundingUsd: 740_000_000,
};

const novapay: CompetitorDossier = {
  company: {
    crustdataCompanyId: 900101,
    name: "NovaPay",
    domain: "novapay.example",
    linkedinUrl: null,
    description: "Payouts and payment gateway for internet businesses.",
    headcount: 980,
    headcountGrowthYoY: 21,
    industries: ["Financial Services"],
    hq: "Bengaluru, India",
    totalFundingUsd: 340_000_000,
  },
  jobs: [
    { id: 7100001, title: "Senior Rust Engineer, Cryptography", category: "Engineering", location: "Dubai, UAE", country: "United Arab Emirates", workplaceType: "On-site", postedAt: "2026-10-28", url: null, descriptionSnippet: "Build MPC-based custody and settlement rails for cross-border stablecoin transfers. Experience with threshold signatures required." },
    { id: 7100002, title: "Head of Compliance, VARA", category: "Legal", location: "Dubai, UAE", country: "United Arab Emirates", workplaceType: "On-site", postedAt: "2026-10-19", url: null, descriptionSnippet: "Own our Virtual Assets Regulatory Authority licence application and AML programme for the GCC." },
    { id: 7100003, title: "Rust Engineer, Cryptography", category: "Engineering", location: "Dubai, UAE", country: "United Arab Emirates", workplaceType: "Hybrid", postedAt: "2026-10-12", url: null, descriptionSnippet: "Wallet infrastructure, key management, HSM integration." },
    { id: 7100004, title: "Corridor Partnerships Manager, India–GCC", category: "Business Development", location: "Dubai, UAE", country: "United Arab Emirates", workplaceType: "On-site", postedAt: "2026-10-05", url: null, descriptionSnippet: "Sign exchange houses and banks for inbound remittance corridors into India." },
    { id: 7100005, title: "Product Manager, Cross-border", category: "Product", location: "Bengaluru, India", country: "India", workplaceType: "Hybrid", postedAt: "2026-09-30", url: null, descriptionSnippet: "Launch a new remittance product for NRIs in the Gulf." },
    { id: 7100006, title: "Backend Engineer, Payouts", category: "Engineering", location: "Bengaluru, India", country: "India", workplaceType: "Hybrid", postedAt: "2026-09-22", url: null, descriptionSnippet: "Scale our payouts platform." },
  ],
  hiring: {
    totalOpenings: 64,
    byCategory: [ { key: "Engineering", count: 29 }, { key: "Legal", count: 9 }, { key: "Business Development", count: 11 }, { key: "Product", count: 6 }, { key: "Sales", count: 9 } ],
    byCountry: [ { key: "India", count: 41 }, { key: "United Arab Emirates", count: 19 }, { key: "Singapore", count: 4 } ],
    topTitles: [ { key: "Rust Engineer, Cryptography", count: 4 }, { key: "Compliance Manager", count: 5 }, { key: "Backend Engineer", count: 8 } ],
  },
  recentHires: [
    { personId: 8100001, name: "Farah Al-Mansoori", title: "VP, GCC Expansion", startDate: "2026-09-01", location: "Dubai, UAE", seniority: "Vice President", function: "Business Development", profileUrl: null, headline: "Building India–Gulf payment corridors", skills: ["Remittances", "Correspondent Banking", "Stablecoins"], previousCompanies: ["Gulf Exchange House (fictional)", "Orbit Crypto (fictional)"], enriched: true },
    { personId: 8100002, name: "Arjun Mehta", title: "Principal Engineer, Custody", startDate: "2026-08-15", location: "Dubai, UAE", seniority: "Senior", function: "Engineering", profileUrl: null, headline: "MPC wallets · Rust", skills: ["Rust", "MPC", "Threshold Cryptography", "HSM"], previousCompanies: ["Orbit Crypto (fictional)"], enriched: true },
    { personId: 8100003, name: "Leena Iyer", title: "Compliance Lead, Virtual Assets", startDate: "2026-10-01", location: "Dubai, UAE", seniority: "Manager", function: "Legal", profileUrl: null, headline: null, skills: ["AML", "VARA", "Travel Rule"], previousCompanies: ["Desert Bank (fictional)"], enriched: false },
  ],
  news: [
    { title: "NovaPay opens Dubai office (fictional)", url: "https://news.example/novapay-dubai", snippet: "The payouts company is setting up a regional HQ in DIFC.", source: "news", publishedAt: "2026-09-12" },
  ],
  creditsUsed: 0,
};

const zentra: CompetitorDossier = {
  company: {
    crustdataCompanyId: 900102,
    name: "Zentra",
    domain: "zentra.example",
    linkedinUrl: null,
    description: "Checkout and UPI infrastructure for large merchants.",
    headcount: 1350,
    headcountGrowthYoY: 8,
    industries: ["Financial Services"],
    hq: "Mumbai, India",
    totalFundingUsd: 210_000_000,
  },
  jobs: [
    { id: 7200001, title: "Embedded Firmware Engineer, POS", category: "Engineering", location: "Pune, India", country: "India", workplaceType: "On-site", postedAt: "2026-10-25", url: null, descriptionSnippet: "Firmware for an Android-based soundbox and card terminal. NFC, EMV L1/L2 certification." },
    { id: 7200002, title: "Hardware Supply Chain Manager", category: "Operations", location: "Noida, India", country: "India", workplaceType: "On-site", postedAt: "2026-10-14", url: null, descriptionSnippet: "Own contract manufacturing and BOM for 1M+ devices." },
    { id: 7200003, title: "Field Sales Lead, Tier-2 cities", category: "Sales", location: "Jaipur, India", country: "India", workplaceType: "On-site", postedAt: "2026-10-08", url: null, descriptionSnippet: "Build a field force to onboard kirana merchants onto devices." },
    { id: 7200004, title: "EMV Certification Specialist", category: "Engineering", location: "Pune, India", country: "India", workplaceType: "On-site", postedAt: "2026-09-29", url: null, descriptionSnippet: "Drive EMVCo and PCI PTS certification." },
  ],
  hiring: {
    totalOpenings: 88,
    byCategory: [ { key: "Sales", count: 34 }, { key: "Engineering", count: 27 }, { key: "Operations", count: 15 }, { key: "Product", count: 7 }, { key: "Support", count: 5 } ],
    byCountry: [ { key: "India", count: 88 } ],
    topTitles: [ { key: "Field Sales Executive", count: 22 }, { key: "Embedded Firmware Engineer", count: 6 }, { key: "EMV Certification Specialist", count: 2 } ],
  },
  recentHires: [
    { personId: 8200001, name: "Rohit Bansal", title: "Director, Hardware Products", startDate: "2026-08-20", location: "Pune, India", seniority: "Director", function: "Engineering", profileUrl: null, headline: "Shipped 3M payment devices", skills: ["Hardware", "EMV", "Android POS"], previousCompanies: ["SoundTap Devices (fictional)"], enriched: true },
    { personId: 8200002, name: "Kavya Rao", title: "Head of Merchant Field Sales", startDate: "2026-09-10", location: "Jaipur, India", seniority: "Head", function: "Sales", profileUrl: null, headline: null, skills: ["Field Sales", "Kirana", "Distribution"], previousCompanies: ["FMCG Corp (fictional)"], enriched: false },
  ],
  news: [],
  creditsUsed: 0,
};

const payloom: CompetitorDossier = {
  company: {
    crustdataCompanyId: 900103,
    name: "PayLoom",
    domain: "payloom.example",
    linkedinUrl: null,
    description: "Payment gateway with a lending marketplace.",
    headcount: 760,
    headcountGrowthYoY: -4,
    industries: ["Financial Services"],
    hq: "Gurugram, India",
    totalFundingUsd: 95_000_000,
  },
  jobs: [
    { id: 7300001, title: "Credit Risk Data Scientist", category: "Engineering", location: "Gurugram, India", country: "India", workplaceType: "Hybrid", postedAt: "2026-10-20", url: null, descriptionSnippet: "Underwrite merchants using transaction data for working-capital loans." },
    { id: 7300002, title: "NBFC Partnerships Manager", category: "Business Development", location: "Gurugram, India", country: "India", workplaceType: "Hybrid", postedAt: "2026-10-02", url: null, descriptionSnippet: "Onboard lending partners for merchant cash advance." },
  ],
  hiring: {
    totalOpenings: 21,
    byCategory: [ { key: "Engineering", count: 8 }, { key: "Business Development", count: 6 }, { key: "Sales", count: 4 }, { key: "Operations", count: 3 } ],
    byCountry: [ { key: "India", count: 21 } ],
    topTitles: [ { key: "Credit Risk Analyst", count: 3 }, { key: "NBFC Partnerships Manager", count: 2 } ],
  },
  recentHires: [
    { personId: 8300001, name: "Sameer Kapoor", title: "Head of Lending", startDate: "2026-09-05", location: "Gurugram, India", seniority: "Head", function: "Finance", profileUrl: null, headline: "Merchant credit · embedded lending", skills: ["Credit Risk", "Underwriting", "NBFC"], previousCompanies: ["QuickCapital (fictional)"], enriched: true },
  ],
  news: [],
  creditsUsed: 0,
};

export const demoPredictions: LaunchPrediction[] = [
  {
    id: "novapay-gcc-stablecoin-remittance",
    competitorId: 900101,
    competitorName: "NovaPay",
    headline: "Stablecoin-settled remittances from the Gulf to India",
    summary: "4 cryptography engineers in Dubai, a VARA compliance head and a GCC corridor partnerships role, plus a VP hired from a remittance house, point to an inbound India–GCC remittance product settled over stablecoin rails.",
    confidence: "high",
    confidenceScore: 82,
    expectedWindow: "3–6 months",
    area: "Cross-border",
    evidence: [
      { kind: "job", ref: "7100001", text: "Senior Rust Engineer, Cryptography · Dubai · Oct 28" },
      { kind: "job", ref: "7100002", text: "Head of Compliance, VARA · Dubai · Oct 19" },
      { kind: "job", ref: "7100004", text: "Corridor Partnerships Manager, India–GCC · Oct 5" },
      { kind: "hire", ref: "8100001", text: "Farah Al-Mansoori joined as VP, GCC Expansion (ex-remittance house)" },
      { kind: "news", ref: "https://news.example/novapay-dubai", text: "NovaPay opens Dubai office" },
    ],
    threatToYou: "Acme's cross-border payouts customers with Gulf NRI flows could move to a cheaper, faster corridor.",
  },
  {
    id: "zentra-pos-soundbox",
    competitorId: 900102,
    competitorName: "Zentra",
    headline: "Own-brand UPI soundbox and card terminal for kiranas",
    summary: "Firmware, EMV certification and hardware supply-chain roles, a hardware director from a device maker, and 22 field-sales roles in tier-2 cities suggest an offline merchant device push.",
    confidence: "high",
    confidenceScore: 77,
    expectedWindow: "2–4 months",
    area: "Offline payments",
    evidence: [
      { kind: "job", ref: "7200001", text: "Embedded Firmware Engineer, POS · Pune" },
      { kind: "job", ref: "7200002", text: "Hardware Supply Chain Manager · 1M+ devices" },
      { kind: "hire", ref: "8200001", text: "Rohit Bansal joined as Director, Hardware Products" },
    ],
    threatToYou: "Directly attacks Acme's offline merchant growth in tier-2 cities.",
  },
  {
    id: "payloom-merchant-lending",
    competitorId: 900103,
    competitorName: "PayLoom",
    headline: "Merchant cash advance on gateway volume",
    summary: "A new Head of Lending, credit-risk data scientists and NBFC partnership roles indicate embedded working-capital loans for gateway merchants.",
    confidence: "medium",
    confidenceScore: 58,
    expectedWindow: "4–8 months",
    area: "Lending",
    evidence: [
      { kind: "hire", ref: "8300001", text: "Sameer Kapoor joined as Head of Lending" },
      { kind: "job", ref: "7300001", text: "Credit Risk Data Scientist · Oct 20" },
    ],
    threatToYou: "Lending is a retention hook; merchants with loans rarely switch gateways.",
  },
];

export const demoPlans: CounterAttackPlan[] = [
  {
    predictionId: "novapay-gcc-stablecoin-remittance",
    actions: [
      "Lock in NovaPay's cross-border customers with 12-month corridor pricing before their launch.",
      "Fast-track Acme's own GCC exchange-house partnership talks.",
      "Brief sales on a 'regulated rails, no crypto risk' positioning.",
    ],
    targets: [
      {
        company: { crustdataCompanyId: 900201, name: "Saffron Travels (fictional)", domain: "saffrontravels.example", linkedinUrl: null, headcount: 420 },
        competitorName: "NovaPay",
        sourceUrl: "https://novapay.example/customers/saffron-travels",
        whyNow: "Featured NovaPay payouts customer with heavy Gulf customer base.",
        buyers: [{ personId: 8900001, name: "Neha Joshi", title: "VP Finance", profileUrl: null }],
      },
    ],
    emails: [
      {
        predictionId: "novapay-gcc-stablecoin-remittance",
        to: { name: "Neha Joshi", title: "VP Finance", company: "Saffron Travels (fictional)" },
        subject: "Gulf payouts without the crypto rails",
        body: "Hi Neha,\n\nSaffron moves a lot of money between the Gulf and India. Some providers are about to move that flow onto stablecoin settlement, which adds regulatory risk for your finance team.\n\nAcme can lock in today's corridor pricing for 12 months on fully regulated bank rails. Worth a 20-minute call this week?\n\nBest,\nAcme Payments",
      },
    ],
  },
];

export const demoReport: SpyReport = {
  request: { you: "Acme Payments", competitors: ["NovaPay", "Zentra", "PayLoom"], lookbackDays: 90 },
  you,
  competitors: [novapay, zentra, payloom],
  predictions: demoPredictions,
  plans: demoPlans,
  generatedAt: "2026-11-06T00:00:00Z",
  creditsUsed: 0,
  mock: true,
};
