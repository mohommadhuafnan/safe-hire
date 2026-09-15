export const PRICING_PLANS = [
  {
    id: 'free_trial',
    name: '7-Day Free Trial',
    tagline: 'Full AI protection for new job seekers & university students',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: 'LKR',
    scansLimit: '25 Total Scans',
    scansCount: 25,
    duration: '7 Days',
    badge: 'Free Trial',
    badgeColor: 'from-blue-500/20 to-cyan-500/20 border-cyan-500/40 text-cyan-400',
    popular: false,
    buttonText: 'Start Free Trial',
    buttonVariant: 'secondary',
    allowedLanguages: ['en', 'si', 'ta', 'hi', 'bn'],
    languagesLabel: 'All Languages (Sinhala, Tamil, English, etc.)',
    features: [
      '25 Total Job Scam Scans (7 Days)',
      'Full Multilingual Scam Detection (Sinhala, Tamil, English, Hindi, Bengali)',
      'Valsea AI Translation Engine Access',
      '5-Agent Multi-Dimensional Threat Detection',
      'WHOIS Domain Age & Blacklist Verification',
      'Abstract API Email Threat Audit',
      'Instant Security PDF Audit Report Export'
    ],
    limitations: [
      'Access expires after 7 days or 25 scans'
    ]
  },
  {
    id: 'basic',
    name: 'Basic Plan',
    tagline: 'Essential protection for regular job applicants and interns',
    priceMonthly: 990,
    priceAnnual: 9990,
    currency: 'LKR',
    scansLimit: '100 Scans / mo',
    scansCount: 100,
    duration: 'Monthly / Annual',
    badge: 'Budget Friendly',
    badgeColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-400',
    popular: false,
    buttonText: 'Upgrade to Basic',
    buttonVariant: 'primary',
    allowedLanguages: ['en'],
    languagesLabel: 'English Only',
    features: [
      '100 Job Scam Scans per month',
      'English Language Threat Detection',
      '5-Agent Core Security Analysis Pipeline',
      'Domain WHOIS & Google Safe Browsing Verification',
      'Abstract API Real-Time Email Validation',
      'Standard Security Audit Reports',
      'Full Audit History & Threat Archive'
    ],
    limitations: [
      'Sinhala and Tamil detection require Pro'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    tagline: 'Comprehensive AI security for power job seekers & career advisors',
    priceMonthly: 3490,
    priceAnnual: 34990,
    currency: 'LKR',
    scansLimit: '3,000 Scans / mo',
    scansCount: 3000,
    duration: 'Monthly / Annual',
    badge: 'Most Popular',
    badgeColor: 'from-indigo-500/30 to-violet-500/30 border-indigo-400 text-indigo-300 shadow-indigo-500/20 shadow-lg',
    popular: true,
    buttonText: 'Upgrade to Pro',
    buttonVariant: 'highlight',
    allowedLanguages: ['en', 'si', 'ta', 'hi', 'bn'],
    languagesLabel: 'All Languages + Valsea AI Native Translation',
    features: [
      '3,000 Job Scam Scans per month',
      'Full Multilingual Engine (Sinhala, Tamil, English, Hindi, Bengali)',
      'Valsea AI Translation Integration',
      'Priority 5-Agent Processing & Deep AI OCR',
      'Instant Security PDF Audit Downloads',
      'Full Threat History & Advanced Analytics',
      'Priority Security Escalation & Support'
    ],
    limitations: []
  },
  {
    id: 'organization',
    name: 'Organization / Campus',
    tagline: 'Enterprise-grade protection for universities & recruitment portals',
    priceMonthly: 45000,
    priceAnnual: 450000,
    currency: 'LKR',
    scansLimit: '50,000+ Scans / mo',
    scansCount: 50000,
    duration: 'Custom Contract',
    badge: 'Campus & Enterprise',
    badgeColor: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-400',
    popular: false,
    isContactSales: true,
    buttonText: 'Contact Sales',
    buttonVariant: 'secondary',
    allowedLanguages: ['en', 'si', 'ta', 'hi', 'bn'],
    languagesLabel: 'Enterprise Multilingual + Dedicated API',
    features: [
      '50,000+ Scans per month',
      'Dedicated Multi-Tenant Campus API',
      'Full Multilingual Engine with Valsea AI',
      'Custom Whitelist / Blacklist Rule Engine',
      'Bulk File & Poster Batch Auditing',
      'Admin Dashboard & Student Usage Analytics',
      'Dedicated SLA & 24/7 Security Escalation'
    ],
    limitations: []
  }
];

export const PRICING_FAQS = [
  {
    question: 'How does the PayHere payment system work?',
    answer: 'SAFE-HIRE integrates directly with PayHere, Sri Lanka\'s leading Central Bank-approved payment gateway. You can securely pay using Visa, MasterCard, FriMi, Genie, eZ Cash, mCash, or Internet Banking.'
  },
  {
    question: 'What happens when my 7-day free trial ends?',
    answer: 'Once your 7-day free trial or 25 scans are completed, you will be prompted to choose either the Basic or Pro plan to continue scanning jobs. All your previous scan history and security reports will remain safely archived in your account.'
  },
  {
    question: 'Why is Sinhala and Tamil detection exclusive to Pro?',
    answer: 'Our proprietary Valsea AI Translation Engine and multilingual linguistic risk models require dedicated GPU computing to detect cultural and dialect-based scam nuances in Sinhala and Tamil.'
  },
  {
    question: 'Can I cancel my subscription at any time?',
    answer: 'Yes, absolutely. You can cancel your subscription at any time with one click from your Dashboard. You will retain full access until the end of your paid billing period.'
  },
  {
    question: 'Do you offer campus and university discounts?',
    answer: 'Yes! We partner with university career guidance centers and student unions across Sri Lanka. Please click "Contact Sales" on the Organization plan to request campus-wide academic licenses.'
  }
];
