const CONFIG = {
  currency: "USD",
};

const PUBLIC_CONFIG = window.SOW_YOUR_SEED_CONFIG || {};
const STORAGE_KEY = "sow-your-seed:v1";
const ADMIN_SESSION_KEY = "sow-your-seed:admin-session";
const DONOR_TOKEN_KEY = "sow-your-seed:donor-token";
const VISITOR_KEY_KEY = "sow-your-seed:visitor-key";
const DEMO_ADMIN_PASSWORD = "sowseed";
const SEED_DOLLAR_VALUE = 11;
const MIN_DONATION_AMOUNT = 11;
const GOAL_SEED_COUNT = 100;
const PAYPAL_SDK_LOAD_TIMEOUT_MS = 8000;
const TOP_BRAND_TITLE = "Sow Your Seed Here";
const MINIMAL_SUPPORT_TITLE = "Buy a Seed to Sow for the Love 💗💕";
const LEGACY_SUPPORT_TITLES = new Set([
  "Choose a Seed Writing from the Seed Garden 🌱💗",
  "Choose Your Seed Offering for Your Soulmate & Loved Ones🌱💗 and get a personalised mail as your digital writing order",
  "Buy a Seed to Sow for the Love You’ve Been Waiting For 💗💕",
  "Buy a Seed to Sow for the Love You’ve Been Waiting For in 💕Christ Pradise garden💫",
  "Buy a Seed to Sow for the Love You’ve Been Waiting For💕💕 for Sow Your Seed Here for Your Soulmate 💫",
]);
const LEGACY_ABOUT_COLLAPSED = new Set([
  "🌱✨ Personalised Digital Writing Made for Your Request ✨🌱\nShare your intention and receive a custom writing created with care...",
]);
const LEGACY_ABOUT_EXPANDED = new Set([
  "🌱✨ Personalised Digital Writing Made for Your Request ✨🌱\n\nShare your prayer, intention, or message and receive a heartfelt custom writing created especially for your order.\n\nEvery personalised mail is prepared with care, faith, and thoughtful attention to what you asked for.",
]);
const DIGITAL_ORDER_ITEM_NAME = "Personalised Digital Writing - Custom Order Made Writing";
const CUSTOM_ORDER_STRING_KEYS = new Set([
  "aboutCollapsed",
  "aboutExpanded",
  "aboutTitle",
  "profileTitle",
  "supportTitle",
  "topicLabel",
]);
const FORTUNE_MESSAGES = [
  "In Jesus' name, may the love between you and your soulmate grow softer, deeper, and more patient with every day.",
  "May your soulmate feel cherished by you, and may your family feel surrounded by peace, warmth, and protection.",
  "May God bless your relationship with gentle words, honest affection, and a home filled with family laughter.",
  "May you and your soulmate keep choosing each other with tenderness, loyalty, and grace.",
  "In the name of Jesus, may every small misunderstanding between you and your soulmate turn into deeper understanding.",
  "May your home be a soft place for your soulmate, your family, and every heart that needs rest.",
  "May your soulmate feel safe in your love, and may your family feel steady under God's blessing.",
  "May the Lord fill your relationship with romance that stays kind and family bonds that stay strong.",
  "May you and your soulmate protect each other's peace and build a family atmosphere full of affection.",
  "In Jesus' name, may your soulmate's heart be comforted, your heart be understood, and your family be united.",
  "May God bless the conversations between you and your soulmate with patience, softness, and healing.",
  "May your family table be filled with joy, your soulmate's smile, and moments you will remember with gratitude.",
  "May your soulmate feel loved in the ordinary moments, not only the grand ones.",
  "In the name of Jesus, may your relationship be covered with forgiveness, laughter, and faithful devotion.",
  "May God place peace in your home and sweetness in the way you and your soulmate care for one another.",
  "May your soulmate see your effort, feel your love, and respond with tenderness.",
  "May your family be protected from division, and may your soulmate bond be protected from pride.",
  "In Jesus' name, may your love be patient in hard days and joyful in easy days.",
  "May the Lord bless your soulmate with peace and bless you with the wisdom to love them well.",
  "May affection rise in your home today, touching your soulmate, your family, and your own heart.",
  "May you and your soulmate speak kindly, listen closely, and hold each other's dreams with care.",
  "In the name of Jesus, may your family home glow with trust, respect, and steady love.",
  "May God bless your soulmate with strength and bless your family with harmony.",
  "May every hug, prayer, and gentle word between you and your soulmate become a seed of lasting peace.",
  "May your relationship be refreshed with romance, your family refreshed with joy, and your home refreshed with grace.",
  "In Jesus' name, may your soulmate feel honored by your love and your family feel blessed by your unity.",
  "May the Lord help you and your soulmate forgive quickly, love deeply, and protect what you have built.",
  "May your family be a circle of warmth, and may your soulmate always feel welcome inside your heart.",
  "May God turn every tense moment into a chance for you and your soulmate to grow closer.",
  "In the name of Jesus, may your love stay faithful, your home stay peaceful, and your family stay protected.",
  "May your soulmate be blessed by your patience, and may you be blessed by their devotion.",
  "May your family witness more laughter, more hugs, and more gentle healing in your relationship.",
  "May Jesus guide your words so your soulmate feels loved, not judged, and your family feels safe.",
  "May your home be filled with affectionate routines, warm meals, honest talks, and peaceful rest.",
  "In Jesus' name, may every burden carried by your soulmate become lighter through love and prayer.",
  "May God strengthen your family ties and sweeten the bond between you and your soulmate.",
  "May your soulmate look at you and feel thankful for the love you share.",
  "May your relationship be rich in kindness, full of tenderness, and steady through every season.",
  "In the name of Jesus, may your family be guarded from conflict and your soulmate bond guarded from distance.",
  "May the Lord bless your private love with warmth and your family life with peace.",
  "May you and your soulmate keep finding new reasons to smile at each other.",
  "May your family home become a sanctuary of affection, prayer, forgiveness, and calm.",
  "In Jesus' name, may your soulmate's love feel like comfort and your family love feel like shelter.",
  "May God help you notice the little ways your soulmate loves you every day.",
  "May your relationship be filled with gentle touch, grateful hearts, and family blessings.",
  "May the Lord heal old hurts in your home and make room for softer love between you and your soulmate.",
  "In the name of Jesus, may your soulmate feel respected, treasured, and emotionally safe with you.",
  "May your family be blessed with unity and your relationship blessed with renewed affection.",
  "May God protect the joy between you and your soulmate from stress, fear, and bitterness.",
  "May your home echo with laughter, your relationship with loyalty, and your family with peace.",
  "In Jesus' name, may your soulmate feel chosen by you again and again.",
  "May the Lord bless your love with patience in waiting, grace in speaking, and peace in returning to each other.",
  "May your family feel the beauty of two hearts loving each other with maturity and faith.",
  "May your soulmate be encouraged today by your kindness, your presence, and your prayers.",
  "In the name of Jesus, may your relationship stay rooted in compassion and your family stay rooted in love.",
  "May God fill your home with warm affection and fill your soulmate's heart with assurance.",
  "May every meal, message, and shared silence between you and your soulmate carry peace.",
  "May your family be blessed by the love you and your soulmate continue to build.",
  "In Jesus' name, may your soulmate feel understood even before everything is explained.",
  "May the Lord bless your relationship with emotional safety and your family with lasting joy.",
  "May you and your soulmate grow in patience, playful affection, and holy friendship.",
  "May your home become a place where love is spoken clearly and forgiveness comes quickly.",
  "In the name of Jesus, may your soulmate's heart be protected and your family be covered with grace.",
  "May God bless your relationship with deeper romance and your family with sweeter togetherness.",
  "May your soulmate feel your love in your words, your actions, and your quiet loyalty.",
  "May your family be strengthened by peace, and may your relationship be strengthened by tenderness.",
  "In Jesus' name, may every hard conversation end with more understanding between you and your soulmate.",
  "May the Lord bless your home with calm mornings, affectionate evenings, and family gratitude.",
  "May your soulmate feel supported in their dreams and cherished in their vulnerable moments.",
  "May God keep your relationship free from coldness and fill it with warmth, care, and devotion.",
  "In the name of Jesus, may your family be restored where it is tired and joyful where it is strong.",
  "May you and your soulmate love each other in ways that heal, not harm.",
  "May your home be blessed with soft voices, kind apologies, and steady affection.",
  "May the Lord remind you and your soulmate that love is renewed through small faithful choices.",
  "In Jesus' name, may your family be wrapped in unity and your relationship wrapped in peace.",
  "May God bless your soulmate with joy and bless you with a heart that keeps loving wisely.",
  "May your relationship grow more romantic, more honest, and more peaceful with time.",
  "May your family feel the comfort of God's presence in every room of your home.",
  "In the name of Jesus, may your soulmate feel celebrated, valued, and never alone beside you.",
  "May the Lord bless your love with trust that deepens and affection that does not grow tired.",
  "May your home be filled with family memories that feel tender, sacred, and full of light.",
  "May you and your soulmate protect each other from harsh words and choose gentleness instead.",
  "In Jesus' name, may your family line be blessed through the love, peace, and faith in your home.",
  "May God bring sweetness back into any place where your relationship has felt heavy.",
  "May your soulmate feel loved through your patience, your loyalty, and your willingness to grow.",
  "May your family be blessed with laughter that returns easily and peace that settles deeply.",
  "In the name of Jesus, may your home carry the fragrance of affection, gratitude, and prayer.",
  "May the Lord strengthen the promise between you and your soulmate and bless everyone connected to your family.",
  "May your relationship be a refuge where both hearts can rest, heal, and be known.",
  "May God bless your family with unity and bless your soulmate bond with gentle passion.",
  "In Jesus' name, may love keep blooming in your home, even in the places that once felt dry.",
  "May your soulmate feel the blessing of being loved by you, and may you feel the blessing of being loved by them.",
  "May your family be protected from resentment and filled with compassion, patience, and joy.",
  "May the Lord bless your relationship with peaceful nights, hopeful mornings, and faithful hearts.",
  "In the name of Jesus, may every seed of kindness between you and your soulmate become a harvest of love.",
  "May God help you and your soulmate keep romance alive through care, respect, and thoughtful affection.",
  "May your home become brighter because love is practiced there every day.",
  "May your family be surrounded by grace, and may your soulmate bond be surrounded by trust.",
  "In Jesus' name, may your soulmate and family feel deeply loved, divinely protected, and beautifully blessed today.",
  "In the mighty name of Jesus Christ, may your soulmate, family, home, and shared future overflow with faithful love, divine peace, and lasting joy. Amen.",
];

const DEFAULT_SETTINGS = {
  profileTitle: "Sow Your Seed 💫",
  followersText: "167 Followers",
  seedPrice: 11,
  aboutTitle: "About",
  aboutCollapsed: "🌱✨ Personalised Writing for Your Journey ✨\nOrder a writing made for your request and delivered by email...",
  aboutExpanded: "Share your prayer, intention, or message to order a heartfelt writing prepared especially for you and delivered by email.",
  topicLabel: "Personalised writing",
  supportTitle: MINIMAL_SUPPORT_TITLE,
  blessingWallEnabled: true,
  dodoCheckoutVisible: false,
  paypalCheckoutVisible: true,
  alternateCardCheckoutVisible: false,
};

const seedFeed = [
  {
    name: "Ingrid Schneider",
    amount: 150,
    frequency: "monthly",
    message: "Thank you for creating work that keeps pointing people back to hope.",
    createdAt: "2026-07-26T11:30:00.000Z",
  },
  {
    name: "April Semper",
    amount: 85,
    frequency: "once",
    message: "Keep going. This ministry matters.",
    createdAt: "2026-07-25T16:15:00.000Z",
  },
  {
    name: "Donna Bakst",
    amount: 60,
    frequency: "once",
    message: "Sowing with gratitude.",
    createdAt: "2026-07-24T14:05:00.000Z",
  },
  {
    name: "Evelyn Abello",
    amount: 45,
    frequency: "once",
    message: "May this seed multiply.",
    createdAt: "2026-07-23T09:40:00.000Z",
  },
];

const state = loadState();

const elements = {
  aboutCollapsed: document.querySelector("#aboutCollapsed"),
  aboutExpanded: document.querySelector("#aboutExpanded"),
  aboutTitle: document.querySelector("#aboutTitle"),
  adminActionStatus: document.querySelector("#adminActionStatus"),
  adminAnalyticsDescription: document.querySelector("#adminAnalyticsDescription"),
  adminAnalyticsTitle: document.querySelector("#adminAnalyticsTitle"),
  adminAnalyticsUpdated: document.querySelector("#adminAnalyticsUpdated"),
  adminBackdrop: document.querySelector("#adminBackdrop"),
  adminCalendarDetails: document.querySelector("#adminCalendarDetails"),
  adminCalendarGrid: document.querySelector("#adminCalendarGrid"),
  adminCalendarNext: document.querySelector("#adminCalendarNext"),
  adminCalendarPrev: document.querySelector("#adminCalendarPrev"),
  adminCalendarSummary: document.querySelector("#adminCalendarSummary"),
  adminCalendarTitle: document.querySelector("#adminCalendarTitle"),
  adminDonationHeading: document.querySelector("#adminDonationHeading"),
  adminEmailInput: document.querySelector("#adminEmailInput"),
  adminForm: document.querySelector("#adminForm"),
  adminLoginDialog: document.querySelector("#adminLoginDialog"),
  adminLoginForm: document.querySelector("#adminLoginForm"),
  adminMenuButton: document.querySelector("#adminMenuButton"),
  adminPanel: document.querySelector("#adminPanel"),
  standardPanel: document.querySelector("#standardPanel"),
  closeStandardButton: document.querySelector("#closeStandardButton"),
  standardCalendarPrev: document.querySelector("#standardCalendarPrev"),
  standardCalendarNext: document.querySelector("#standardCalendarNext"),
  standardCalendarTitle: document.querySelector("#standardCalendarTitle"),
  standardCalendarGrid: document.querySelector("#standardCalendarGrid"),
  standardCalendarDetails: document.querySelector("#standardCalendarDetails"),
  adminPaymentAttemptList: document.querySelector("#adminPaymentAttemptList"),
  adminPaymentStarts24h: document.querySelector("#adminPaymentStarts24h"),
  adminPaymentStartsLabel: document.querySelector("#adminPaymentStartsLabel"),
  adminPageViews24h: document.querySelector("#adminPageViews24h"),
  adminPageViewsLabel: document.querySelector("#adminPageViewsLabel"),
  adminPasswordError: document.querySelector("#adminPasswordError"),
  adminPasswordInput: document.querySelector("#adminPasswordInput"),
  adminPaymentsCompleted24h: document.querySelector("#adminPaymentsCompleted24h"),
  adminPaymentsCompletedLabel: document.querySelector("#adminPaymentsCompletedLabel"),
  resetAdminAnalyticsButton: document.querySelector("#resetAdminAnalyticsButton"),
  amountError: document.querySelector("#amountError"),
  amountInput: document.querySelector("#amountInput"),
  paypalTotalSeeds: document.querySelector("#paypalTotalSeeds"),
  weeklySeedToggle: document.querySelector("#weeklySeedToggle"),
  brandTitle: document.querySelector("#brandTitle"),
  cancelAdminLoginButton: document.querySelector("#cancelAdminLoginButton"),
  checkoutButton: document.querySelector("#checkoutButton"),
  checkoutLabel: document.querySelector("#checkoutLabel"),
  paypalPaymentDialog: document.querySelector("#paypalPaymentDialog"),
  closePaypalPaymentDialog: document.querySelector("#closePaypalPaymentDialog"),
  paypalContinueButton: document.querySelector("#paypalContinueButton"),
  closeAdminButton: document.querySelector("#closeAdminButton"),
  closeReceiptButton: document.querySelector("#closeReceiptButton"),
  doneButton: document.querySelector("#doneButton"),
  decreaseSeedButton: document.querySelector("#decreaseSeedButton"),
  decrementPageViewButton: document.querySelector("#decrementPageViewButton"),
  followersText: document.querySelector("#followersText"),
  fulfillmentCancelButton: document.querySelector("#cancelFulfillmentButton"),
  fulfillmentDateInput: document.querySelector("#fulfillmentDateInput"),
  fulfillmentDialog: document.querySelector("#fulfillmentDialog"),
  fulfillmentForm: document.querySelector("#fulfillmentForm"),
  fulfillmentTimeInput: document.querySelector("#fulfillmentTimeInput"),
  messageInput: document.querySelector("#messageInput"),
  nameInput: document.querySelector("#nameInput"),
  nameError: document.querySelector("#nameError"),
  emailError: document.querySelector("#emailError"),
  inlinePaypalCheckout: document.querySelector("#inlinePaypalCheckout"),
  paymentEmailInput: document.querySelector("#paymentEmailInput"),
  paymentFailureDialog: document.querySelector("#paymentFailureDialog"),
  ritualFailureDialog: document.querySelector("#ritualFailureDialog"),
  paymentStatus: document.querySelector("#paymentStatus"),
  alternateCardCheckoutLink: document.querySelector("#alternateCardCheckoutLink"),
  dodoAlternateCardCheckoutLink: document.querySelector("#dodoAlternateCardCheckoutLink"),
  dodoCardButton: document.querySelector("#dodoCardButton"),
  dodoPaymentPanel: document.querySelector("#dodoPaymentPanel"),
  alternateCheckoutDialog: document.querySelector("#alternateCheckoutDialog"),
  alternateCheckoutFrame: document.querySelector("#alternateCheckoutFrame"),
  closeAlternateCheckoutButton: document.querySelector("#closeAlternateCheckoutButton"),
  paypalCheckoutLoader: document.querySelector("#paypalCheckoutLoader"),
  paypalButton: document.querySelector("#paypalButton"),
  paypalButtonContainer: document.querySelector("#paypalButtonContainer"),
  paypalCardButton: document.querySelector("#paypalCardButton"),
  paypalCardButtonContainer: document.querySelector("#paypalCardButtonContainer"),
  cardButton: document.querySelector("#cardButton"),
  increaseSeedButton: document.querySelector("#increaseSeedButton"),
  profileTitle: document.querySelector("#profileTitle"),
  profileTabs: document.querySelectorAll("[data-section-tab]"),
  recentDonationList: document.querySelector("#recentDonationList"),
  refreshAdminButton: document.querySelector("#refreshAdminButton"),
  receiptDialog: document.querySelector("#receiptDialog"),
  receiptKicker: document.querySelector("#receiptKicker"),
  receiptSummary: document.querySelector("#receiptSummary"),
  receiptTitle: document.querySelector("#receiptTitle"),
  retryPaymentButton: document.querySelector("#retryPaymentButton"),
  saveCheckoutDisplayButton: document.querySelector("#saveCheckoutDisplayButton"),
  saveAdminButton: document.querySelector("#saveAdminButton"),
  shareSupportButton: document.querySelector("#shareSupportButton"),
  supportGoal: document.querySelector("#supportGoal"),
  supportGoalFill: document.querySelector("#supportGoalFill"),
  supportGoalPercent: document.querySelector("#supportGoalPercent"),
  seedCommentsList: document.querySelector("#seedCommentsList"),
  seedCommentsPanel: document.querySelector("#seedCommentsPanel"),
  seedPriceLabel: document.querySelector("#seedPriceLabel"),
  closePaymentFailureButton: document.querySelector("#closePaymentFailureButton"),
  sectionViews: document.querySelectorAll("[data-section-view]"),
  showMoreButtons: document.querySelectorAll("[data-toggle-target]"),
  supportForm: document.querySelector("#supportForm"),
  supportCard: document.querySelector("#support"),
  supportHomeColumn: document.querySelector(".support-checkout-column"),
  supportRitualCard: document.querySelector(".support-ritual-card"),
  superAdminPayPalSection: document.querySelector("#superAdminPayPalSection"),
  superAdminCheckoutHost: document.querySelector("#superAdminCheckoutHost"),
  toast: document.querySelector("#toast"),
  transactionBoardList: document.querySelector("#transactionBoardList"),
  topicPill: document.querySelector("#topicPill"),
  adminInputs: {
    blessingWallEnabled: document.querySelector("#adminBlessingWallEnabled"),
    seedPrice: document.querySelector("#adminSeedPrice"),
  },
};

let pendingFulfillmentAction = null;
let backendReady = false;
let publicContentLoading = isBackendConfigured();
let transactionBoardOffset = 0;
let transactionBoardLoading = false;
let transactionBoardCount = 0;
const paypalSdkPromises = new Map();
const paypalSdkKeysByNamespace = new Map();
let paypalRenderPromise = null;
let paymentConfig = {
  adminPayPalClientId: "",
  superAdminPayPalClientId: "",
  currency: PUBLIC_CONFIG.paypalCurrency || CONFIG.currency,
};
let pendingDonation = null;
let alternateCheckoutSource = "paypal";
const initialAdminCalendarDate = getLatestDonationDateKey();
let adminCalendarCursor = fromDateKey(initialAdminCalendarDate);
let selectedAdminCalendarDate = initialAdminCalendarDate;
let standardCalendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedStandardDate = toDateKey(new Date());
let standardTransactions = [];
const showSampleAdminOrder = new URLSearchParams(window.location.search).get("preview_order") === "1";
if (showSampleAdminOrder) {
  selectedAdminCalendarDate = toDateKey(new Date());
  adminCalendarCursor = fromDateKey(selectedAdminCalendarDate);
}

function getSampleAdminOrder() {
  const createdAt = new Date().toISOString();
  return {
    id: "sample-admin-order-preview",
    isPreview: true,
    name: "Sample 10-Seed Customer",
    amount: 70,
    seedCount: 10,
    frequency: "once",
    paymentMethod: "dodo",
    createdAt,
    message: "A sample request to see how a new SEED order appears in the calendar.",
    digitalOrder: {
      orderNumber: "SAMPLE-SEED-010",
      provider: "dodo",
      providerTransactionId: "SAMPLE-NO-PAYMENT",
      contactEmail: "sample@example.com",
      itemName: DIGITAL_ORDER_ITEM_NAME,
      redeemedBookTitle: "The Lantern at Low Tide",
      personalizedRequest: "A sample request to see how a new SEED order appears in the calendar.",
      fulfillmentStatus: "paid_awaiting_personalized_writing",
      fulfillmentNote: "",
    },
  };
}
function cloneDefaultSettings() {
  return { ...DEFAULT_SETTINGS };
}

function toCustomOrderCopy(value) {
  return String(value || "")
    .replace(/\bcreator tipping platform\b/gi, "personalised digital writing platform")
    .replace(/\bCreator Support\b/g, "Custom Order Writing")
    .replace(/\bTip to Creator\b/g, DIGITAL_ORDER_ITEM_NAME)
    .replace(/\bTips are\b/gi, "Custom-order payments are")
    .replace(/\btips are\b/gi, "custom-order payments are")
    .replace(/\btips\b/gi, "payments")
    .replace(/\btip\b/gi, "payment")
    .replace(/\btipping\b/gi, "custom-order")
    .replace(/\bdonations\b/gi, "orders")
    .replace(/\bdonation\b/gi, "order")
    .replace(/\bdonate\b/gi, "order")
    .replace(/\bdonors\b/gi, "customers")
    .replace(/\bdonor\b/gi, "customer")
    .replace(/\bsupporters\b/gi, "customers")
    .replace(/\bsupporter\b/gi, "customer")
    .replace(/\bsupport\b/gi, "custom writing");
}

function normalizeSettings(settings) {
  const defaults = cloneDefaultSettings();
  const next = {
    ...defaults,
    ...Object.fromEntries(Object.keys(defaults)
      .filter((key) => settings && Object.hasOwn(settings, key))
      .map((key) => [key, settings[key]])),
  };

  next.seedPrice = Math.max(Number.parseInt(next.seedPrice, 10) || defaults.seedPrice, MIN_DONATION_AMOUNT);
  next.blessingWallEnabled = next.blessingWallEnabled !== false && next.blessingWallEnabled !== "false";
  const dodoVisibility = settings && Object.hasOwn(settings, "dodoCheckoutVisible")
    ? settings.dodoCheckoutVisible
    : settings?.mockCheckoutVisible;
  const dodoEnabled = dodoVisibility !== false && dodoVisibility !== "false";
  const paypalEnabled = next.paypalCheckoutVisible === true || next.paypalCheckoutVisible === "true";
  next.dodoCheckoutVisible = dodoEnabled || !paypalEnabled;
  next.paypalCheckoutVisible = !next.dodoCheckoutVisible && paypalEnabled;
  next.alternateCardCheckoutVisible = next.alternateCardCheckoutVisible !== false && next.alternateCardCheckoutVisible !== "false";

  Object.keys(defaults).forEach((key) => {
    if (typeof defaults[key] !== "string") return;
    const rawValue = String(next[key] || defaults[key]).trim() || defaults[key];
    next[key] = CUSTOM_ORDER_STRING_KEYS.has(key) ? toCustomOrderCopy(rawValue) : rawValue;
  });

  if (LEGACY_SUPPORT_TITLES.has(next.supportTitle)) {
    next.supportTitle = defaults.supportTitle;
  }

  for (const key of ["aboutCollapsed", "aboutExpanded", "topicLabel"]) {
    if (/digital[- ]books?|\bshop\b/i.test(next[key])) next[key] = defaults[key];
  }

  if (LEGACY_ABOUT_COLLAPSED.has(next.aboutCollapsed)) {
    next.aboutCollapsed = defaults.aboutCollapsed;
  }

  if (LEGACY_ABOUT_EXPANDED.has(next.aboutExpanded)) {
    next.aboutExpanded = defaults.aboutExpanded;
  }

  if (next.topicLabel === "Digital writing") {
    next.topicLabel = defaults.topicLabel;
  }

  return Object.fromEntries(Object.keys(defaults).map((key) => [key, next[key]]));
}

function toSafeIsoDate(value) {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeSeedComments(comments) {
  return Array.isArray(comments)
    ? comments
        .map((comment, index) => {
          const text = String(comment?.text || comment?.body || "").trim();
          const name = String(comment?.name || comment?.display_name || "Customer").trim().slice(0, 80) || "Customer";
          const createdAt = toSafeIsoDate(comment?.createdAt || comment?.created_at);

          if (!text) return null;

          return {
            id: String(comment?.id || `seed-comment-${Date.now()}-${index}`),
            name,
            text: text.slice(0, 280),
            amount: comment?.amount === null || comment?.amount === undefined ? null : Number(comment.amount),
            seedCount:
              comment?.seedCount === null || comment?.seedCount === undefined
                ? null
                : Math.max(Number.parseInt(comment.seedCount, 10) || 0, 0),
            source: comment?.source === "payment" ? "payment" : "legacy",
            createdAt,
          };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    : [];
}

function createEmptyAnalytics() {
  return {
    completedPaymentsLast24h: 0,
    generatedAt: null,
    pageViewsLast24h: 0,
    pageViewsAreCombined: false,
    paymentRoute: null,
    paymentAttempts: [],
    paymentStartsLast24h: 0,
  };
}

function normalizeAnalytics(analytics) {
  const defaults = createEmptyAnalytics();
  const paymentAttempts = Array.isArray(analytics?.paymentAttempts)
    ? analytics.paymentAttempts
        .map((attempt) => {
          const displayStatus = attempt?.displayStatus === "completed" || attempt?.completed === true
            ? "completed"
            : attempt?.displayStatus === "not_completed" ? "not_completed" : null;

          if (!displayStatus) return null;

          return {
            id: String(attempt?.id || ""),
            name: String(attempt?.name || "Customer").trim().slice(0, 80) || "Customer",
            email: String(attempt?.email || "").trim().slice(0, 160),
            amount: Math.max(Number(attempt?.amount) || 0, 0),
            currency: String(attempt?.currency || "USD").trim().slice(0, 3).toUpperCase() || "USD",
            displayStatus,
            startedAt: attempt?.startedAt || null,
            completedAt: attempt?.completedAt || null,
          };
        })
        .filter((attempt) => attempt?.id && attempt.email)
    : [];

  return {
    completedPaymentsLast24h: Math.max(Number.parseInt(analytics?.completedPaymentsLast24h, 10) || 0, 0),
    generatedAt: analytics?.generatedAt || defaults.generatedAt,
    pageViewsAreCombined: analytics?.pageViewsAreCombined === true,
    pageViewsLast24h: Math.max(Number.parseInt(analytics?.pageViewsLast24h, 10) || 0, 0),
    paymentRoute: analytics?.paymentRoute === "superadmin" ? "superadmin" : analytics?.paymentRoute === "standard" ? "standard" : null,
    paymentAttempts,
    paymentStartsLast24h: Math.max(Number.parseInt(analytics?.paymentStartsLast24h, 10) || 0, 0),
  };
}

function normalizeGoalProgress(goalProgress) {
  const confirmedSeedCount = Math.max(
    Number.parseInt(goalProgress?.confirmedSeedCount, 10) || 0,
    0,
  );
  const goalSeedCount = Math.max(
    Number.parseInt(goalProgress?.goalSeedCount, 10) || GOAL_SEED_COUNT,
    1,
  );
  const goalAmountCents = Math.max(
    Number.parseInt(goalProgress?.goalAmountCents, 10) || goalSeedCount * SEED_DOLLAR_VALUE * 100,
    1,
  );
  const confirmedAmountCents = Math.max(
    Number.parseInt(goalProgress?.confirmedAmountCents, 10) || confirmedSeedCount * SEED_DOLLAR_VALUE * 100,
    0,
  ) % goalAmountCents;

  return {
    confirmedSeedCount: Math.floor(confirmedAmountCents / (SEED_DOLLAR_VALUE * 100)),
    goalSeedCount,
    confirmedAmountCents,
    goalAmountCents,
    percentage: (confirmedAmountCents / goalAmountCents) * 100,
  };
}

function loadState() {
  if (isBackendConfigured()) {
    return {
      analytics: createEmptyAnalytics(),
      donations: [],
      goalProgress: normalizeGoalProgress(),
      seedComments: [],
      settings: {
        ...cloneDefaultSettings(),
      },
    };
  }

  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return {
      analytics: createEmptyAnalytics(),
      donations: seedFeed,
      goalProgress: normalizeGoalProgress(),
      seedComments: [],
      settings: cloneDefaultSettings(),
    };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      analytics: normalizeAnalytics(parsed.analytics),
      donations: Array.isArray(parsed.donations) ? parsed.donations : seedFeed,
      goalProgress: normalizeGoalProgress(parsed.goalProgress),
      seedComments: normalizeSeedComments(parsed.seedComments),
      settings: normalizeSettings(parsed.settings),
    };
  } catch {
    return {
      analytics: createEmptyAnalytics(),
      donations: seedFeed,
      goalProgress: normalizeGoalProgress(),
      seedComments: [],
      settings: cloneDefaultSettings(),
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isBackendConfigured() {
  return Boolean(PUBLIC_CONFIG.backendEnabled && PUBLIC_CONFIG.supabaseUrl && PUBLIC_CONFIG.supabaseAnonKey);
}

function getVisitorKey() {
  let key = localStorage.getItem(VISITOR_KEY_KEY);
  if (!key) {
    key = crypto.randomUUID ? crypto.randomUUID() : `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(VISITOR_KEY_KEY, key);
  }
  return key;
}

function setDonorToken(token) {
  if (token) {
    localStorage.setItem(DONOR_TOKEN_KEY, token);
  }
}

function getAdminSession() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function setAdminSession(session) {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  state.adminProfile = null;
  if (paymentConfig.superAdminPayPalClientId) {
    resetPayPalSdk("paypalSysSuperAdminOnce");
    resetPayPalSdk("paypalSysSuperAdminWeekly");
    if (elements.supportCard?.parentElement === elements.superAdminCheckoutHost) {
      closeInlinePayPalCheckout();
      clearPayPalButtons();
    }
    paymentConfig.superAdminPayPalClientId = "";
  }
}

function getAdminAccessToken() {
  const session = getAdminSession();
  return session?.access_token || "";
}

function edgeUrl(functionName) {
  return `${PUBLIC_CONFIG.supabaseUrl.replace(/\/$/, "")}/functions/v1/${functionName}`;
}

async function callEdge(functionName, options = {}) {
  if (!isBackendConfigured()) {
    throw new Error("Backend is not configured. Fill src/config.js first.");
  }

  const headers = {
    apikey: PUBLIC_CONFIG.supabaseAnonKey,
    Authorization: options.admin ? `Bearer ${getAdminAccessToken()}` : `Bearer ${PUBLIC_CONFIG.supabaseAnonKey}`,
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };
  let response;
  try {
    response = await fetch(edgeUrl(functionName), {
      method: options.method || "POST",
      headers,
      cache: "no-store",
      body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (cause) {
    const error = new Error("The payment service could not be reached. Check your connection and try again.");
    error.code = "NETWORK_ERROR";
    error.cause = cause;
    throw error;
  }
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || `Request failed: ${response.status}`);
    error.code = payload.code || "";
    error.details = payload.details;
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function trackCheckoutEvent(eventName, donation = pendingDonation) {
  if (!isBackendConfigured() || !donation) return null;

  try {
    return await callEdge("track-checkout-event", {
      body: {
        amount: donation.amount || getAmount(),
        eventName,
        paymentRoute: donation.paymentRoute || getCheckoutRoute(),
        path: window.location.pathname || "/",
        visitorKey: getVisitorKey(),
      },
    });
  } catch (error) {
    console.warn("Checkout analytics event was not recorded.", error);
    return null;
  }
}

async function signInAdmin(email, password) {
  const response = await fetch(`${PUBLIC_CONFIG.supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: PUBLIC_CONFIG.supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error_description || payload.msg || "Could not sign in.");
  }

  setAdminSession(payload);
  return payload;
}

async function loadAdminProfile() {
  const payload = await callEdge("admin-profile", {
    admin: true,
    method: "GET",
  });

  state.adminProfile = payload.profile || null;
  paymentConfig.superAdminPayPalClientId = state.adminProfile?.role === "super_admin"
    ? payload.payment?.superAdminPayPalClientId || ""
    : "";
  return state.adminProfile;
}

function applyBootstrap(payload) {
  if (!payload) return;

  if (payload.settings || payload.payment) {
    const incomingSettings = payload.settings || {};
    const mergedSettings = {
      ...state.settings,
      ...incomingSettings,
    };
    if (!Object.hasOwn(incomingSettings, "dodoCheckoutVisible") &&
        Object.hasOwn(incomingSettings, "mockCheckoutVisible")) {
      mergedSettings.dodoCheckoutVisible = incomingSettings.mockCheckoutVisible;
    }
    state.settings = normalizeSettings(mergedSettings);
    backendReady = true;
  }

  if (Array.isArray(payload.donations)) state.donations = payload.donations;
  if (payload.goalProgress) state.goalProgress = normalizeGoalProgress(payload.goalProgress);
  if (Array.isArray(payload.seedComments)) state.seedComments = normalizeSeedComments(payload.seedComments);

  if (payload.payment) {
    paymentConfig = {
      adminPayPalClientId: payload.payment.adminPayPalClientId || "",
      superAdminPayPalClientId: paymentConfig.superAdminPayPalClientId,
      currency: payload.payment.currency || PUBLIC_CONFIG.paypalCurrency || CONFIG.currency,
    };
  }

  if (Array.isArray(payload.donations) || Array.isArray(payload.seedComments)) {
    publicContentLoading = false;
  }
}

async function loadBackendData(options = {}) {
  if (!isBackendConfigured()) return;

  const mode = options.mode === "critical" || options.mode === "content" ? options.mode : "full";

  try {
    const params = new URLSearchParams({
      path: window.location.pathname || "/",
      visitorKey: getVisitorKey(),
    });
    if (mode !== "full") params.set("mode", mode);
    const payload = await callEdge(`public-bootstrap?${params.toString()}`, { method: "GET" });
    applyBootstrap(payload);
    return payload;
  } catch (error) {
    if (mode !== "content") backendReady = false;
    publicContentLoading = false;
    if (options.throwOnError) {
      throw error;
    }
    showToast(error.message || "Backend data could not load.");
    return null;
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function finishInitialLoading() {
  document.body.classList.remove("app-loading");
  document.body.classList.add("app-ready");

  const loader = document.querySelector("#appLoader");
  if (loader) {
    window.setTimeout(() => {
      loader.hidden = true;
    }, 260);
  }
}

function getInitialDonationAmount() {
  return Math.max(Number(state.settings.seedPrice) || SEED_DOLLAR_VALUE, MIN_DONATION_AMOUNT);
}

async function initializeApp() {
  try {
    await loadBackendData({ mode: "critical" });
    setAmount(getInitialDonationAmount());
    renderApp();
    setActiveView(getViewIdFromHash());
  } finally {
    finishInitialLoading();

    const previewParams = new URLSearchParams(window.location.search);
    const previewRitual = previewParams.get("preview_ritual") === "1";
    const previewSeed = previewParams.get("preview_seed") === "1";
    const previewSeedFailure = previewParams.get("preview_seed_failure") === "1";
    const previewRitualFailure = previewParams.get("preview_ritual_failure") === "1";
    if (previewRitual || previewSeed) {
      elements.receiptKicker.textContent = previewRitual ? "Ritual complete" : "YOUR SEED WAS SOWN WITH LOVE, CARE, AND FAITH";
      elements.receiptTitle.textContent = previewRitual ? "Your Ritual is Done" : "Your fortune for today";
      elements.receiptSummary.textContent = previewRitual
        ? "“With God all things are possible.” — Matthew 19:26"
        : getRandomFortuneMessage();
      elements.receiptSummary.hidden = false;
      openReceipt({ preview: true });
    } else if (previewSeedFailure) {
      openPaymentFailure(state.settings.dodoCheckoutVisible ? "dodo" : "paypal", { preview: true });
    } else if (previewRitualFailure) {
      openRitualPaymentFailure({ preview: true });
    }

    if (window.location.hash === "#admin") {
      openAdminLogin();
    }

    window.requestAnimationFrame(() => {
      void loadDeferredBackendData();
      void loadTransactionBoard();
    });
  }
}

async function loadDeferredBackendData() {
  if (!isBackendConfigured() || !backendReady || !publicContentLoading) return;

  await loadBackendData({ mode: "content" });
  renderApp();
}

async function loadTransactionBoard() {
  const list = elements.transactionBoardList;
  if (!list || transactionBoardLoading || transactionBoardOffset === null) return;
  if (!isBackendConfigured()) {
    list.textContent = "Recent transactions will appear here.";
    return;
  }

  transactionBoardLoading = true;
  try {
    do {
      const payload = await callEdge(`public-transactions?offset=${transactionBoardOffset}`, { method: "GET" });
      if (transactionBoardOffset === 0) list.replaceChildren();
      for (const transaction of payload.transactions || []) {
        const row = document.createElement("li");
        row.className = "transaction-board-item";
        transactionBoardCount += 1;
        const person = document.createElement("span");
        person.className = "transaction-board-person";
        const name = document.createElement("span");
        name.className = "transaction-board-name";
        name.textContent = String(transaction.name || "Customer").trim().split(/\s+/u)[0] || "Customer";
        name.title = name.textContent;
        person.append(name);
        if (transactionBoardCount <= 3) {
          const rank = document.createElement("span");
          rank.className = "transaction-board-rank";
          rank.textContent = `#${transactionBoardCount}`;
          person.append(rank);
        }
        const seeds = document.createElement("strong");
        seeds.className = "transaction-board-seeds";
        const seedCount = Math.max(0, Number(transaction.seedCount) || 0);
        seeds.textContent = `${seedCount} 🌱`;
        seeds.setAttribute("aria-label", `${seedCount} seed${seedCount === 1 ? "" : "s"}`);
        row.append(person, seeds);
        list.append(row);
      }
      transactionBoardOffset = Number.isInteger(payload.nextOffset) ? payload.nextOffset : null;
    } while (transactionBoardOffset !== null && list.scrollHeight <= list.clientHeight);

    if (!transactionBoardCount) {
      const empty = document.createElement("li");
      empty.className = "transaction-board-message";
      empty.textContent = "No successful Admin transactions yet.";
      list.append(empty);
    }
  } catch (error) {
    if (!transactionBoardCount) list.replaceChildren();
    const message = document.createElement("li");
    message.className = "transaction-board-message";
    message.textContent = error.message || "Could not load transactions.";
    list.append(message);
  } finally {
    transactionBoardLoading = false;
  }
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CONFIG.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    notation: Number(value) >= 10000 ? "compact" : "standard",
  }).format(Math.max(Number(value) || 0, 0));
}

function getAmount() {
  return Number.parseFloat(elements.amountInput.value) || 0;
}

function getSeedCountFromAmount(amount) {
  const numericAmount = Math.max(Number(amount) || 0, 0);

  if (!numericAmount) return 0;

  return Math.max(1, Math.round(numericAmount / SEED_DOLLAR_VALUE));
}

function getSeedUnitsFromAmount(amount, seedPrice) {
  const numericAmount = Math.max(Number(amount) || 0, 0);
  const numericSeedPrice = Math.max(Number(seedPrice) || SEED_DOLLAR_VALUE, 1);

  return numericAmount / numericSeedPrice;
}

function formatSeedUnits(value) {
  const roundedValue = Math.max(Math.round(Number(value) || 0), 0);

  return `${roundedValue} Seed${roundedValue === 1 ? "" : "s"}`;
}

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function relativeTime(dateString) {
  const created = new Date(dateString);
  const diff = Date.now() - created.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function readableDate(dateString) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function readableTime(dateString) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatFixedAmount(value) {
  return (Number.parseFloat(value) || 0).toFixed(2);
}

function getDonationRawRow(donation) {
  const rawPayment = donation?.rawPayment && typeof donation.rawPayment === "object" ? donation.rawPayment : {};
  return rawPayment.row && typeof rawPayment.row === "object" ? rawPayment.row : rawPayment;
}

function getDonationRawValue(donation, key, fallback = "") {
  const rawRow = getDonationRawRow(donation);
  const value = rawRow[key];
  return value === undefined || value === null ? fallback : value;
}


function downloadBlobFile(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getDigitalOrder(donation) {
  if (donation?.digitalOrder && typeof donation.digitalOrder === "object") {
    return donation.digitalOrder;
  }

  const rawPayment = donation?.rawPayment && typeof donation.rawPayment === "object" ? donation.rawPayment : {};
  const rawOrder = rawPayment.digitalOrder && typeof rawPayment.digitalOrder === "object" ? rawPayment.digitalOrder : {};

  if (!Object.keys(rawOrder).length) return null;

  return {
    orderNumber: rawOrder.orderNumber,
    itemName: rawOrder.itemName,
    customerName: rawOrder.customerName,
    contactEmail: rawOrder.contactEmail,
    payerEmail: rawOrder.payerEmail,
    provider: rawOrder.provider || rawOrder.paymentProvider,
    providerOrderId: rawOrder.providerOrderId,
    providerTransactionId: rawOrder.providerTransactionId,
    paypalOrderId: rawOrder.paypalOrderId,
    paypalCaptureId: rawOrder.paypalCaptureId,
    amount: rawOrder.amount,
    currency: rawOrder.currency,
    personalizedRequest: donation?.message || "",
    blessingMessage: donation?.fortuneMessage || "",
    fulfillmentStatus: rawOrder.fulfillmentStatus,
    fulfillmentNote: rawOrder.fulfillmentNote,
    fulfilledAt: rawOrder.fulfilledAt,
    createdAt: rawOrder.createdAt,
  };
}

function getDigitalOrderValue(donation, key, fallback = "") {
  const order = getDigitalOrder(donation);
  const value = order?.[key];

  return value === undefined || value === null || value === "" ? fallback : value;
}

function getFulfillmentStatusLabel(status, itemName = "") {
  const isBook = String(itemName).startsWith("Digital Book -");
  if (status === "fulfilled") return isBook ? "Delivered by email" : "Fulfilled";
  return isBook ? "Paid, awaiting email delivery" : "Paid, awaiting personalized writing";
}

function readableIndiaDateTime(dateString) {
  const date = new Date(dateString || Date.now());
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(safeDate);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.day}/${values.month}/${values.year} ${values.hour}:${values.minute} IST`;
}

function normalizePdfText(value) {
  return String(value ?? "")
    .replaceAll("’", "'")
    .replaceAll("‘", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function wrapPdfText(value, maxLength = 86) {
  const normalized = normalizePdfText(value);
  const sourceLines = normalized ? normalized.split(/\n+/) : [""];
  const lines = [];

  sourceLines.forEach((sourceLine) => {
    const words = sourceLine.split(/\s+/).filter(Boolean);
    let line = "";

    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length > maxLength && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });

    if (line) lines.push(line);
  });

  return lines.length ? lines : [""];
}

function pdfEscape(value) {
  return normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

const FULFILLED_PDF_NOTE =
  "The personalised digital writing was completed in accordance with the customer's order request and delivered electronically to the customer's provided email address.";

const PDF_PAGE_WIDTH = 595.2756;
const PDF_PAGE_HEIGHT = 841.8898;

function pdfRgb(hex) {
  const normalized = String(hex).replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  return `${red.toFixed(4)} ${green.toFixed(4)} ${blue.toFixed(4)}`;
}

function pdfText(commands, value, x, y, size = 11, font = "F1", color = "#1d232c") {
  commands.push(`${pdfRgb(color)} rg`);
  commands.push(`BT /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfEscape(value)}) Tj ET`);
}

function pdfTextRight(commands, value, rightX, y, size = 11, font = "F1", color = "#1d232c") {
  const text = normalizePdfText(value);
  const estimatedWidth = text.length * size * 0.52;
  pdfText(commands, text, Math.max(40, rightX - estimatedWidth), y, size, font, color);
}

function pdfRoundedRect(commands, x, y, width, height, radius, fill, stroke = null, lineWidth = 1) {
  const k = 0.5522848;
  const r = Math.min(radius, width / 2, height / 2);
  const path = [
    `${(x + r).toFixed(2)} ${y.toFixed(2)} m`,
    `${(x + width - r).toFixed(2)} ${y.toFixed(2)} l`,
    `${(x + width - r + r * k).toFixed(2)} ${y.toFixed(2)} ${(x + width).toFixed(2)} ${(y + r - r * k).toFixed(2)} ${(x + width).toFixed(2)} ${(y + r).toFixed(2)} c`,
    `${(x + width).toFixed(2)} ${(y + height - r).toFixed(2)} l`,
    `${(x + width).toFixed(2)} ${(y + height - r + r * k).toFixed(2)} ${(x + width - r + r * k).toFixed(2)} ${(y + height).toFixed(2)} ${(x + width - r).toFixed(2)} ${(y + height).toFixed(2)} c`,
    `${(x + r).toFixed(2)} ${(y + height).toFixed(2)} l`,
    `${(x + r - r * k).toFixed(2)} ${(y + height).toFixed(2)} ${(x).toFixed(2)} ${(y + height - r + r * k).toFixed(2)} ${(x).toFixed(2)} ${(y + height - r).toFixed(2)} c`,
    `${x.toFixed(2)} ${(y + r).toFixed(2)} l`,
    `${x.toFixed(2)} ${(y + r - r * k).toFixed(2)} ${(x + r - r * k).toFixed(2)} ${y.toFixed(2)} ${(x + r).toFixed(2)} ${y.toFixed(2)} c`,
    "h",
  ];

  if (fill) commands.push(`${pdfRgb(fill)} rg`);
  if (stroke) {
    commands.push(`${pdfRgb(stroke)} RG`, `${lineWidth} w`);
  }
  commands.push(path.join("\n"), fill && stroke ? "B" : fill ? "f" : "S");
}

function drawPdfInfoCard(commands, { x, y, width, height, label, value, maxCharacters = 36 }) {
  pdfRoundedRect(commands, x, y, width, height, 12, "#f3f0ee");
  pdfText(commands, label.toUpperCase(), x + 12, y + height - 20, 8.5, "F2", "#969daa");
  const lines = wrapPdfText(value || "Not available", maxCharacters).slice(0, 2);
  lines.forEach((line, index) => {
    pdfText(commands, line, x + 12, y + height - 41 - index * 13, 10.5, "F2", "#232833");
  });
}

function getProofPdfData(donation) {
  const order = getDigitalOrder(donation) || {};
  const rawOrder = getDonationRawRow(donation);
  const provider = getDigitalOrderValue(
    donation,
    "provider",
    donation.paymentMethod === "dodo" ? "Dodo Payments" : "PayPal",
  );
  const orderNumber = getDigitalOrderValue(
    donation,
    "orderNumber",
    getDonationRawValue(donation, "Reference", donation.orderId || donation.id || ""),
  );
  const transactionId =
    getDigitalOrderValue(donation, "providerTransactionId", "") ||
    getDigitalOrderValue(
      donation,
      "paypalCaptureId",
      donation.captureId || getDonationRawValue(donation, "TransactionId", ""),
    );
  const providerOrderId =
    getDigitalOrderValue(donation, "providerOrderId", "") ||
    getDigitalOrderValue(
      donation,
      "paypalOrderId",
      donation.orderId || getDonationRawValue(donation, "Reference", ""),
    );
  const createdAt = donation.createdAt || order.createdAt || rawOrder["DateTime (UTC)"] || new Date().toISOString();
  const status = getDigitalOrderValue(donation, "fulfillmentStatus", "paid_awaiting_personalized_writing");

  return {
    customerName: donation.name || order.customerName || "Customer",
    frequency: donation.frequency === "weekly" ? "Weekly" : donation.frequency === "monthly" ? "Monthly" : "One time",
    createdAt,
    orderNumber,
    transactionId,
    providerOrderId,
    contactEmail: getDigitalOrderValue(donation, "contactEmail", ""),
    payerEmail: getDigitalOrderValue(donation, "payerEmail", donation.payerEmail || getDonationRawValue(donation, "BuyerEmail", "")),
    itemName: getDigitalOrderValue(donation, "itemName", DIGITAL_ORDER_ITEM_NAME),
    amount: Number(donation.amount || order.amount || 0),
    currency: order.currency || getDonationRawValue(donation, "Currency", CONFIG.currency),
    provider,
    paymentStatus: donation.status || "COMPLETED",
    fulfillmentStatus: status,
    fulfilledAt: getDigitalOrderValue(donation, "fulfilledAt", ""),
    request: getDigitalOrderValue(donation, "personalizedRequest", donation.message || "No personalized request was entered."),
    blessing: getDigitalOrderValue(
      donation,
      "blessingMessage",
      donation.fortuneMessage || "No blessing or order message was recorded.",
    ),
  };
}

function startPremiumPdfPage(commands, continuation = false) {
  commands.push(`${pdfRgb("#f8f0f7")} rg`, `0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT} re f`);
  pdfRoundedRect(commands, 28, 35, 539, 772, 20, "#ffffff", "#e8e2df", 1.2);
  pdfText(commands, "SEED GARDEN RIGHTS", 50, 785, 9, "F2", "#1593aa");
  if (continuation) {
    pdfText(commands, "Custom order record continued", 50, 758, 18, "F2", "#1d232c");
  }
}

function finishPremiumPdfPage(commands) {
  pdfText(commands, "Seed Garden Rights - Custom Order Record", 50, 50, 8.5, "F1", "#8f95a5");
}

function buildPremiumOrderPdf(donation) {
  const data = getProofPdfData(donation);
  const pages = [];
  let commands = [];
  let y = 0;

  const newPage = (continuation = false) => {
    if (commands.length) {
      finishPremiumPdfPage(commands);
      pages.push(commands);
    }
    commands = [];
    startPremiumPdfPage(commands, continuation);
    y = continuation ? 720 : 0;
  };

  const ensureSpace = (height) => {
    if (y - height < 84) newPage(true);
  };

  const drawSection = (title, value, maxCharacters = 82) => {
    const lines = wrapPdfText(value, maxCharacters);
    ensureSpace(32 + lines.length * 15);
    pdfText(commands, title.toUpperCase(), 50, y, 11, "F2", "#606068");
    y -= 20;
    lines.forEach((line) => {
      ensureSpace(17);
      pdfText(commands, line, 50, y, 10.5, "F1", "#45454a");
      y -= 15;
    });
    y -= 8;
  };

  newPage(false);
  pdfText(commands, data.customerName, 50, 760, 20, "F2", "#232833");
  pdfText(commands, `${data.frequency}  •  ${readableIndiaDateTime(data.createdAt)}`, 50, 736, 11.5, "F2", "#969daa");
  pdfTextRight(commands, `${formatFixedAmount(data.amount)} ${data.currency}`, 545, 760, 20, "F2", "#232833");

  drawPdfInfoCard(commands, { x: 50, y: 650, width: 238, height: 62, label: "Order ID", value: data.orderNumber });
  drawPdfInfoCard(commands, {
    x: 307,
    y: 650,
    width: 238,
    height: 62,
    label: "Transaction ID",
    value: data.transactionId,
  });
  drawPdfInfoCard(commands, {
    x: 50,
    y: 570,
    width: 238,
    height: 62,
    label: "Contact email",
    value: data.contactEmail || "Not provided",
  });
  drawPdfInfoCard(commands, {
    x: 307,
    y: 570,
    width: 238,
    height: 62,
    label: "Item",
    value: data.itemName,
    maxCharacters: 38,
  });

  pdfRoundedRect(commands, 50, 512, 238, 40, 12, "#f3f0ee");
  pdfText(commands, "STATUS", 62, 536, 8.5, "F2", "#969daa");
  pdfText(commands, getFulfillmentStatusLabel(data.fulfillmentStatus, data.itemName), 62, 521, 11.5, "F2", "#232833");
  pdfRoundedRect(commands, 307, 512, 238, 40, 12, "#f3f0ee");
  pdfText(commands, "PAYMENT PROVIDER", 319, 536, 8.5, "F2", "#969daa");
  pdfText(commands, data.provider, 319, 521, 11.5, "F2", "#232833");

  y = 478;
  drawSection("Payment details", `Payment status: ${data.paymentStatus}  •  Provider order ID: ${data.providerOrderId || "Not available"}`);
  drawSection("Buyer email", data.payerEmail || "Not provided by the payment provider.");
  drawSection("Personalized writing request", data.request);
  drawSection("Blessing / order message", data.blessing);

  const noteLines = wrapPdfText(FULFILLED_PDF_NOTE, 86);
  const noteHeight = noteLines.length * 16 + 32;
  ensureSpace(noteHeight + 38);
  pdfText(commands, "FULFILLMENT NOTE", 50, y, 12, "F2", "#606068");
  y -= 20;
  pdfRoundedRect(commands, 50, y - noteHeight, 495, noteHeight, 12, "#faf8f7", "#ded8d4", 1);
  noteLines.forEach((line, index) => {
    pdfText(commands, line, 66, y - 22 - index * 16, 10.5, "F1", "#4e484f");
  });
  y -= noteHeight + 18;
  drawSection("Fulfilled at", data.fulfilledAt ? readableIndiaDateTime(data.fulfilledAt) : "Not available");

  finishPremiumPdfPage(commands);
  pages.push(commands);
  return buildPdfDocument(pages);
}

function buildPdfDocument(pageContents) {
  const pageCount = pageContents.length;
  const fontNormalId = 3 + pageCount * 2;
  const fontBoldId = fontNormalId + 1;
  const pageIds = pageContents.map((_, index) => 3 + index * 2);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`,
  ];

  pageContents.forEach((commands) => {
    const pageId = objects.length + 1;
    const contentId = pageId + 1;
    const content = commands.join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontNormalId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    );
  });

  objects.push(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function getDonationById(donationId) {
  return state.donations.find((donation) => String(donation.id) === String(donationId)) || null;
}

function getOrderProofFilename(donation) {
  const customerName = donation.name || getDigitalOrderValue(donation, "customerName", "Customer");
  const orderNumber = getDigitalOrderValue(donation, "orderNumber", donation.captureId || donation.id || "transaction");
  const toFilenamePart = (value, fallback) =>
    String(value || fallback)
      .trim()
      .replace(/[^a-z0-9-]+/gi, "_")
      .replace(/^_+|_+$/g, "") || fallback;

  return `${toFilenamePart(customerName, "Customer")}_${toFilenamePart(orderNumber, "Order")}_Fulfilled.pdf`;
}

function downloadOrderProofPdf(donationId) {
  const donation = getDonationById(donationId);
  const statusElement = elements.adminActionStatus;

  if (!donation) {
    setAdminStatus("Could not find that payment in the current calendar data.", "error", { persist: true, statusElement });
    showToast("Payment record not found.");
    return;
  }

  const status = getDigitalOrderValue(donation, "fulfillmentStatus", "paid_awaiting_personalized_writing");
  if (status !== "fulfilled") {
    setAdminStatus("Mark this order fulfilled before downloading its proof PDF.", "error", { persist: true, statusElement });
    showToast("Fulfill the order before downloading the PDF.");
    return;
  }

  const pdf = buildPremiumOrderPdf(donation);
  downloadBlobFile(getOrderProofFilename(donation), new Blob([pdf], { type: "application/pdf" }));
  setAdminStatus("Downloaded the fulfilled custom-order PDF.", "success", { statusElement });
}

function updateDonationDigitalOrder(donationId, order) {
  state.donations = state.donations.map((donation) =>
    String(donation.id) === String(donationId)
      ? {
          ...donation,
          digitalOrder: order,
        }
      : donation,
  );
}

function cssAttributeValue(value) {
  const stringValue = String(value);
  return window.CSS?.escape ? window.CSS.escape(stringValue) : stringValue.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function getLocalDatePart(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getLocalTimePart(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function closeFulfillmentDialog() {
  pendingFulfillmentAction = null;
  elements.fulfillmentDialog?.classList.remove("is-open");
  if (typeof elements.fulfillmentDialog?.close === "function") {
    elements.fulfillmentDialog.close();
  } else {
    elements.fulfillmentDialog?.removeAttribute("open");
  }
}

function openFulfillmentDialog(donationId, button) {
  pendingFulfillmentAction = { donationId, button };
  const now = new Date();
  elements.fulfillmentDateInput.value = getLocalDatePart(now);
  elements.fulfillmentTimeInput.value = getLocalTimePart(now);

  if (typeof elements.fulfillmentDialog.showModal === "function") {
    elements.fulfillmentDialog.showModal();
  } else {
    elements.fulfillmentDialog.setAttribute("open", "");
  }

  window.requestAnimationFrame(() => {
    elements.fulfillmentDialog.classList.add("is-open");
  });
  window.setTimeout(() => elements.fulfillmentDateInput.focus(), 80);
}

function getSelectedFulfillmentTimestamp() {
  const localValue = `${elements.fulfillmentDateInput.value}T${elements.fulfillmentTimeInput.value}`;
  const selectedDate = new Date(localValue);
  if (!elements.fulfillmentDateInput.value || !elements.fulfillmentTimeInput.value || Number.isNaN(selectedDate.getTime())) {
    return null;
  }
  return selectedDate.toISOString();
}

async function saveDigitalOrderFulfillment(donationId, button, fulfilledAt = "") {
  const donation = getDonationById(donationId);
  const statusElement = elements.adminActionStatus;
  const panel = elements.adminPanel;
  const detailRoot = elements.adminPanel;
  const noteField = detailRoot.querySelector(`[data-fulfillment-note="${cssAttributeValue(donationId)}"]`);
  const note = noteField?.value || "";
  const order = getDigitalOrder(donation);
  const nextStatus = order?.fulfillmentStatus === "fulfilled" ? "paid_awaiting_personalized_writing" : "fulfilled";

  if (nextStatus === "fulfilled" && !fulfilledAt) {
    openFulfillmentDialog(donationId, button);
    return;
  }

  await runAdminAction(
    {
      panel,
      statusElement,
      button,
      busyText: "Saving...",
      loadingMessage: "Saving digital order fulfillment status...",
      successMessage:
        nextStatus === "fulfilled"
          ? "Digital order marked fulfilled. The proof PDF will include this status."
          : "Digital order moved back to awaiting personalized writing.",
      errorMessage: "Could not update digital order fulfillment.",
    },
    async () => {
      const payload = await callEdge("admin-donations", {
        admin: true,
        method: "PUT",
        body: {
          donationId,
          fulfillmentStatus: nextStatus,
          fulfillmentNote: note,
          fulfilledAt: nextStatus === "fulfilled" ? fulfilledAt : null,
        },
      });

      updateDonationDigitalOrder(donationId, payload.order);
      renderAdminCalendar();
      return payload;
    },
  );
}

async function deleteDonationRecord(donationId, button) {
  const donation = getDonationById(donationId);
  const statusElement = elements.adminActionStatus;
  const name = donation?.name || "this customer";
  const amount = donation ? money(donation.amount) : "this payment";

  if (!donation) {
    setAdminStatus("Could not find that payment in the current calendar data.", "error", { persist: true, statusElement });
    showToast("Payment record not found.");
    return;
  }

  const confirmed = window.confirm(
    `Delete ${amount} from ${name}? This permanently erases the order, payment record, customer access, and any public activity.`,
  );

  if (!confirmed) return;

  await runAdminAction(
    {
      panel: elements.adminPanel,
      statusElement,
      button,
      busyText: "Deleting...",
      loadingMessage: "Deleting order record everywhere...",
      successMessage: "Order and linked payment record deleted from all site surfaces.",
      errorMessage: "Could not delete order record.",
    },
    async () => {
      const payload = await callEdge("admin-donations", {
        admin: true,
        method: "DELETE",
        body: { donationId },
      });

      state.donations = state.donations.filter((item) => String(item.id) !== String(donationId));
      state.seedComments = state.seedComments.filter((item) => String(item.donationId || "") !== String(donationId));
      renderAdminCalendar();
      await loadBackendData({ throwOnError: true });
      renderApp();
      await loadAdminDonations();
      return payload;
    },
  );
}

function toDateKey(date) {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey) {
  const [year, month, day] = String(dateKey).split("-").map(Number);

  if (!year || !month || !day) return new Date();

  return new Date(year, month - 1, day);
}

function getDonationDateKey(donation) {
  return toDateKey(new Date(donation.createdAt || Date.now()));
}

function getLatestDonationDateKey() {
  const latestDonation = state.donations
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];

  return latestDonation ? getDonationDateKey(latestDonation) : toDateKey(new Date());
}

function getDonationsByDate(donations = state.donations) {
  return donations.reduce((groups, donation) => {
    const dateKey = getDonationDateKey(donation);
    groups[dateKey] = groups[dateKey] || [];
    groups[dateKey].push(donation);
    return groups;
  }, {});
}

function formatMonthTitle(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getMonthKey(date) {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return `${safeDate.getFullYear()}-${String(safeDate.getMonth() + 1).padStart(2, "0")}`;
}

async function loadAdminDonations(options = {}) {
  if (!isBackendConfigured() || !getAdminAccessToken()) return;

  const announce = Boolean(options.announce);
  if (announce) {
    setAdminBusy(true);
    elements.adminCalendarPrev.disabled = true;
    elements.adminCalendarNext.disabled = true;
    setAdminStatus(`Loading order records for ${formatMonthTitle(adminCalendarCursor)}...`, "loading", { persist: true });
  }

  try {
    const payload = await callEdge(`admin-donations?month=${getMonthKey(adminCalendarCursor)}`, {
      admin: true,
      method: "GET",
    });
    if (Array.isArray(payload.donations)) {
      state.donations = payload.donations;
      renderAdminCalendar();
      if (state.adminProfile?.role !== "super_admin") {
        renderRecentDonations();
      }
    }

    if (announce) {
      setAdminStatus(`Order calendar loaded for ${formatMonthTitle(adminCalendarCursor)}.`, "success");
    }
  } catch (error) {
    const message = error.message || "Could not load admin order calendar.";
    setAdminStatus(message, "error", { persist: true });
    showToast(message);
  } finally {
    if (announce) {
      elements.adminCalendarPrev.disabled = false;
      elements.adminCalendarNext.disabled = false;
      setAdminBusy(false);
    }
  }
}

async function loadAdminAnalytics(options = {}) {
  if (!isBackendConfigured() || !getAdminAccessToken()) return;

  const announce = Boolean(options.announce);
  const routeLabel = state.adminProfile?.role === "super_admin" ? "SuperAdmin" : "Admin";

  if (announce) {
    setAdminStatus(`Loading ${routeLabel} checkout activity from the last 24 hours...`, "loading", { persist: true });
  }

  try {
    const payload = await callEdge("admin-analytics", {
      admin: true,
      method: "GET",
    });

    state.analytics = normalizeAnalytics(payload);
    const expectedRoute = state.adminProfile?.role === "super_admin" ? "superadmin" : "standard";
    if (
      state.analytics.paymentRoute !== expectedRoute ||
      state.analytics.pageViewsAreCombined !== (expectedRoute === "superadmin")
    ) {
      throw new Error(`${routeLabel} checkout analytics returned an incorrect activity scope.`);
    }
    renderAdminAnalytics();

    if (announce) {
      setAdminStatus(`${routeLabel} checkout activity loaded for the last 24 hours.`, "success");
    }
  } catch (error) {
    const message = error.message || "Could not load page view analytics.";
    setAdminStatus(message, "error", { persist: true });
    showToast(message);
  }
}

async function resetAdminAnalytics() {
  const routeLabel = state.adminProfile?.role === "super_admin" ? "SuperAdmin" : "Admin";
  if (!isBackendConfigured() || !getAdminAccessToken()) {
    state.analytics = createEmptyAnalytics();
    renderAdminAnalytics();
    showToast(`${routeLabel} checkout analytics reset locally.`);
    return;
  }

  await runAdminAction(
    {
      button: elements.resetAdminAnalyticsButton,
      busyText: "Resetting...",
      loadingMessage: `Resetting ${routeLabel} checkout analytics...`,
      successMessage: `${routeLabel} checkout analytics reset. New activity will count from now.`,
      errorMessage: `Could not reset ${routeLabel} checkout analytics.`,
    },
    async () => {
      const payload = await callEdge("admin-analytics", {
        admin: true,
        method: "DELETE",
      });

      state.analytics = normalizeAnalytics(payload);
      renderAdminAnalytics();
      return payload;
    },
  );
}

async function decrementPageView() {
  if (state.adminProfile?.role !== "super_admin") return;

  const currentViews = normalizeAnalytics(state.analytics).pageViewsLast24h;
  if (currentViews <= 0) {
    showToast("There are no page views to subtract.");
    renderAdminAnalytics();
    return;
  }

  if (!isBackendConfigured() || !getAdminAccessToken()) {
    state.analytics = {
      ...normalizeAnalytics(state.analytics),
      generatedAt: new Date().toISOString(),
      pageViewsLast24h: currentViews - 1,
    };
    renderAdminAnalytics();
    showToast("One page view subtracted locally.");
    return;
  }

  await runAdminAction(
    {
      button: elements.decrementPageViewButton,
      busyText: "…",
      loadingMessage: "Subtracting one page view...",
      successMessage: "One page view subtracted.",
      errorMessage: "Could not subtract the page view.",
    },
    async () => {
      const payload = await callEdge("admin-analytics", {
        admin: true,
        method: "POST",
      });

      state.analytics = normalizeAnalytics(payload);
      renderAdminAnalytics();
      return payload;
    },
  );
}

async function refreshAdminPortalData() {
  if (state.adminProfile?.role === "standard") {
    await loadStandardTransactions();
    return;
  }
  if (!isBackendConfigured() || !getAdminAccessToken()) {
    setAdminStatus("Sign in as admin before reloading portal data.", "error", { persist: true });
    return;
  }

  setAdminBusy(true);
  setButtonBusy(elements.refreshAdminButton, true, "Reloading...");
  if (elements.adminCalendarPrev) elements.adminCalendarPrev.disabled = true;
  if (elements.adminCalendarNext) elements.adminCalendarNext.disabled = true;
  const routeLabel = state.adminProfile?.role === "super_admin" ? "SuperAdmin" : "Admin";
  setAdminStatus(`Reloading page content, order records, and ${routeLabel} checkout activity...`, "loading", { persist: true });

  try {
    await loadBackendData({ throwOnError: true });
    renderApp();
    await Promise.all([loadAdminDonations(), loadAdminAnalytics()]);
    setAdminStatus(`${routeLabel} portal data reloaded.`, "success");
    showToast(`${routeLabel} portal data reloaded.`);
  } catch (error) {
    const message = error.message || "Could not reload admin portal data.";
    setAdminStatus(message, "error", { persist: true });
    showToast(message);
  } finally {
    if (elements.adminCalendarPrev) elements.adminCalendarPrev.disabled = false;
    if (elements.adminCalendarNext) elements.adminCalendarNext.disabled = false;
    setButtonBusy(elements.refreshAdminButton, false, "Reloading...");
    setAdminBusy(false);
  }
}

function renderTextWithBreaks(element, value) {
  if (!element) return;
  element.innerHTML = escapeHtml(value).replace(/\n/g, "<br />");
}

function renderParagraphs(element, value) {
  if (!element) return;
  const paragraphs = String(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  element.innerHTML = paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function renderSettings() {
  const settings = state.settings;

  document.title = `${TOP_BRAND_TITLE} | Support the Ministry`;
  elements.brandTitle.textContent = TOP_BRAND_TITLE;
  elements.profileTitle.textContent = settings.profileTitle;
  elements.followersText.textContent = settings.followersText;
  elements.aboutTitle.textContent = settings.aboutTitle;
  renderTextWithBreaks(elements.aboutCollapsed, settings.aboutCollapsed);
  renderParagraphs(elements.aboutExpanded, settings.aboutExpanded);
  elements.topicPill.textContent = settings.topicLabel;
  const dodoTotalAmount = document.querySelector("#dodoTotalAmount");
  if (dodoTotalAmount) dodoTotalAmount.dataset.unitPrice = String(Number(settings.seedPrice) || SEED_DOLLAR_VALUE);
  const dodoCheckout = document.querySelector("#dodoCheckoutForm");
  if (dodoCheckout) dodoCheckout.closest(".dodo-checkout-card").hidden = !settings.dodoCheckoutVisible;
  if (elements.supportCard) {
    const inSuperAdminPortal = elements.supportCard.parentElement === elements.superAdminCheckoutHost;
    elements.supportCard.hidden = !inSuperAdminPortal && !settings.paypalCheckoutVisible;
  }
  if (elements.dodoCardButton) elements.dodoCardButton.hidden = !settings.alternateCardCheckoutVisible || !settings.dodoCheckoutVisible;
  const dodoPaymentPanel = document.querySelector("#dodoPaymentPanel");
  if (dodoPaymentPanel && !document.querySelector("#dodoPaymentDialog")?.open) dodoPaymentPanel.hidden = true;
  if (elements.cardButton) elements.cardButton.hidden = true;
  if (elements.paypalCardButton) elements.paypalCardButton.hidden = true;
  if (elements.retryPaymentButton) elements.retryPaymentButton.href = settings.dodoCheckoutVisible ? "#seedCheckoutCard" : "#support";
  if (elements.seedCommentsPanel) {
    elements.seedCommentsPanel.hidden = !settings.blessingWallEnabled;
  }
  renderAdminForm();
  updateCheckoutLabel();
}

function renderRecentDonations() {
  if (!elements.recentDonationList) return;

  elements.recentDonationList.setAttribute("aria-busy", String(publicContentLoading));
  if (publicContentLoading) {
    elements.recentDonationList.innerHTML = `<p class="empty-state">Loading recent orders…</p>`;
    return;
  }

  const donations = state.donations
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 50);

  elements.recentDonationList.innerHTML = donations.length
    ? donations
        .map((donation) => {
          const name = donation.anonymous ? "Private customer" : donation.name || "Seed Garden customer";
          const seedCount = getSeedCountFromAmount(donation.amount);
          const createdAt = donation.createdAt || new Date().toISOString();

          return `
            <article class="recent-donation-item">
              <span class="avatar">${initials(name)}</span>
              <div>
                <strong>${escapeHtml(name)} sowed ${seedCount} seed${seedCount === 1 ? "" : "s"}</strong>
                <small>${readableDate(createdAt)} · ${relativeTime(createdAt)}</small>
              </div>
            </article>
          `;
        })
        .join("")
    : `<p class="empty-state">No seeds have been recorded yet.</p>`;
}

function renderSeedComments() {
  if (!elements.seedCommentsList) return;

  elements.seedCommentsList.setAttribute("aria-busy", String(publicContentLoading));
  if (publicContentLoading) {
    elements.seedCommentsList.innerHTML = `<p class="empty-state">Loading community comments…</p>`;
    return;
  }

  const comments = normalizeSeedComments(state.seedComments);

  elements.seedCommentsList.innerHTML = comments.length
    ? comments
        .map((comment) => {
          const seedCount = Number.isFinite(comment.seedCount) && comment.seedCount > 0 ? comment.seedCount : null;
          const seedLabel = seedCount
            ? `Custom order for ${seedCount} seed${seedCount === 1 ? "" : "s"}`
            : "Blessing comment";

          return `
            <article class="seed-comment-item">
              <span class="avatar">${initials(comment.name)}</span>
              <div>
                <div class="seed-comment-heading">
                  <strong>${escapeHtml(comment.name)}</strong>
                  <small>${seedLabel} · ${readableDate(comment.createdAt)} · ${readableTime(comment.createdAt)}</small>
                </div>
                <p>${escapeHtml(comment.text)}</p>
              </div>
            </article>
          `;
        })
        .join("")
    : `<p class="empty-state">Blessing comments will appear here after completed custom writing orders.</p>`;
}

function renderAdminForm() {
  const settings = state.settings;
  const inputs = elements.adminInputs;

  inputs.seedPrice.value = settings.seedPrice;
  inputs.blessingWallEnabled.checked = Boolean(settings.blessingWallEnabled);
  const dodoCheckoutToggle = document.querySelector("#dodoCheckoutVisible");
  if (dodoCheckoutToggle) dodoCheckoutToggle.checked = Boolean(settings.dodoCheckoutVisible);
  const paypalCheckoutToggle = document.querySelector("#paypalCheckoutVisible");
  if (paypalCheckoutToggle) paypalCheckoutToggle.checked = Boolean(settings.paypalCheckoutVisible);
  const alternateCardToggle = document.querySelector("#alternateCardCheckoutVisible");
  if (alternateCardToggle) alternateCardToggle.checked = Boolean(settings.alternateCardCheckoutVisible);
}

function getCheckoutRoute() {
  return elements.supportCard?.parentElement === elements.superAdminCheckoutHost
    ? "superadmin"
    : "standard";
}

function renderAdminAnalytics() {
  if (!elements.adminPageViews24h || !elements.adminPaymentStarts24h || !elements.adminAnalyticsUpdated) return;

  const analytics = normalizeAnalytics(state.analytics);
  const isSuperAdmin = state.adminProfile?.role === "super_admin";
  const routeLabel = isSuperAdmin ? "SuperAdmin" : "Admin";
  const generatedAt = analytics.generatedAt ? new Date(analytics.generatedAt) : null;
  const hasValidDate = generatedAt && !Number.isNaN(generatedAt.getTime());

  if (elements.adminAnalyticsTitle) {
    elements.adminAnalyticsTitle.textContent = `3. ${routeLabel} checkout activity`;
  }
  if (elements.adminAnalyticsDescription) {
    elements.adminAnalyticsDescription.textContent = `${isSuperAdmin ? "All page visits" : "Admin checkout page visits"} and ${routeLabel} checkout activity from the last 24 hours. Payment records are private to this account.`;
  }
  if (elements.adminPageViewsLabel) {
    elements.adminPageViewsLabel.textContent = isSuperAdmin
      ? "All checkout-route views last 24 hours"
      : "Admin checkout page views last 24 hours";
  }
  if (elements.adminPaymentStartsLabel) {
    elements.adminPaymentStartsLabel.textContent = `Persisted ${routeLabel} checkout attempts`;
  }
  if (elements.adminPaymentsCompletedLabel) {
    elements.adminPaymentsCompletedLabel.textContent = `Server-verified ${routeLabel} payments`;
  }

  elements.adminPageViews24h.textContent = formatCompactNumber(analytics.pageViewsLast24h);
  if (elements.decrementPageViewButton) {
    elements.decrementPageViewButton.hidden = !isSuperAdmin;
    elements.decrementPageViewButton.disabled = !isSuperAdmin || analytics.pageViewsLast24h <= 0;
  }
  elements.adminPaymentStarts24h.textContent = formatCompactNumber(analytics.paymentStartsLast24h);
  if (elements.adminPaymentsCompleted24h) {
    elements.adminPaymentsCompleted24h.textContent = formatCompactNumber(analytics.completedPaymentsLast24h);
  }
  if (elements.adminPaymentAttemptList) {
    elements.adminPaymentAttemptList.innerHTML = analytics.paymentAttempts.length
      ? analytics.paymentAttempts
          .map((attempt) => {
            const startedAt = attempt.startedAt ? new Date(attempt.startedAt) : null;
            const hasValidStartedAt = startedAt && !Number.isNaN(startedAt.getTime());
            const isCompleted = attempt.displayStatus === "completed";
            const statusLabel = isCompleted ? "Completed" : "Not completed";

            return `
              <article class="admin-payment-attempt">
                <div class="admin-payment-attempt-person">
                  <strong>${escapeHtml(attempt.name)}</strong>
                  <a href="mailto:${escapeHtml(attempt.email)}">${escapeHtml(attempt.email)}</a>
                </div>
                <div class="admin-payment-attempt-meta">
                  <strong>${escapeHtml(money(attempt.amount))}</strong>
                  <span>${hasValidStartedAt ? `${escapeHtml(readableDate(startedAt))} · ${escapeHtml(readableTime(startedAt))}` : "Start time unavailable"}</span>
                </div>
                <span class="admin-payment-attempt-status ${isCompleted ? "is-completed" : "is-incomplete"}">
                  ${statusLabel}
                </span>
              </article>
            `;
          })
          .join("")
      : `<p class="admin-payment-attempt-empty">No ${routeLabel} payment attempts in this window.</p>`;
  }
  elements.adminAnalyticsUpdated.textContent = hasValidDate
    ? `Updated ${readableDate(generatedAt)} at ${readableTime(generatedAt)} · All page visits · ${routeLabel} checkout activity`
    : `Open the ${routeLabel} portal to load ${routeLabel} checkout analytics.`;
}

function renderCalendarDetails(context) {
  if (!context.details) return;

  const donationsByDate = getDonationsByDate(context.donations);
  const donations = (donationsByDate[context.selectedDate] || [])
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const selectedDate = fromDateKey(context.selectedDate);
  const total = donations.reduce((sum, donation) => sum + (Number.parseFloat(donation.amount) || 0), 0);

  if (!donations.length) {
    context.details.innerHTML = `
      <div class="admin-calendar-empty">
        <strong>${readableDate(selectedDate)}</strong>
        <span>No ${escapeHtml(context.emptyRecordLabel)} recorded on this day.</span>
      </div>
    `;
    return;
  }

  context.details.innerHTML = `
    <div class="admin-calendar-detail-heading">
      <div>
        <span>Selected day</span>
        <strong>${readableDate(selectedDate)}</strong>
      </div>
      <b>${donations.length} order${donations.length === 1 ? "" : "s"} · ${money(total)}</b>
    </div>
    <div class="admin-calendar-list">
      ${donations
        .map((donation) => {
          const name = donation.anonymous ? "Private customer" : donation.name || "Unknown customer";
          const amount = Number.parseFloat(donation.amount) || 0;
          const frequency = donation.frequency === "weekly" ? "Weekly" : donation.frequency === "monthly" ? "Monthly" : "One time";
          const createdAt = donation.createdAt || new Date().toISOString();
          const order = getDigitalOrder(donation);
          const isRitualOrder = donation.rawPayment?.product?.type === "ritual";
          const isBookOrder = String(order?.itemName || "").startsWith("Digital Book -");
          const orderNumber = getDigitalOrderValue(
            donation,
            "orderNumber",
            getDonationRawValue(donation, "Reference", donation.orderId || donation.id || "Pending"),
          );
          const captureId = getDigitalOrderValue(
            donation,
            "providerTransactionId",
            getDigitalOrderValue(
              donation,
              "paypalCaptureId",
              donation.captureId || getDonationRawValue(donation, "TransactionId", "Not available"),
            ),
          );
          const contactEmail = getDigitalOrderValue(donation, "contactEmail", "");
          const request = getDigitalOrderValue(donation, "personalizedRequest", donation.message || "No request entered.");
          const status = getDigitalOrderValue(donation, "fulfillmentStatus", "paid_awaiting_personalized_writing");
          const redeemedBookTitle = getDigitalOrderValue(donation, "redeemedBookTitle", "");
          const note = getDigitalOrderValue(donation, "fulfillmentNote", "");
          const isFulfilled = status === "fulfilled";
          const itemName = order?.itemName || DIGITAL_ORDER_ITEM_NAME;
          const itemLabel = context.isAdminPortal && itemName === DIGITAL_ORDER_ITEM_NAME
            ? "Seed"
            : itemName;
          return `
            <article class="admin-calendar-donation${donation.isPreview ? " is-preview" : ""}">
              ${donation.isPreview ? '<p class="admin-order-preview-label">Sample order · No payment was made</p>' : ""}
              <div class="admin-calendar-donation-main">
                <div>
                  <strong>${escapeHtml(name)}</strong>
                  <span>${frequency} · ${readableTime(createdAt)}</span>
                </div>
                <b>${money(amount)}</b>
              </div>
              <div class="admin-order-meta${context.isAdminPortal ? " is-admin-order" : ""}">
                <span><strong>Order ID</strong>${escapeHtml(orderNumber)}</span>
                <span><strong>Transaction ID</strong>${escapeHtml(captureId)}</span>
                <span><strong>Contact email</strong>${escapeHtml(contactEmail || "Not provided")}</span>
                <span><strong>Item</strong>${escapeHtml(itemLabel)}</span>
                ${isRitualOrder ? `<span><strong>Ritual for</strong>${escapeHtml(request)}</span>` : ""}
                ${isRitualOrder ? "" : `<span><strong>Status</strong>${escapeHtml(getFulfillmentStatusLabel(status, order?.itemName))}</span>`}
                ${context.isAdminPortal && !isRitualOrder ? `<span><strong>Reedemed</strong>${redeemedBookTitle ? escapeHtml(redeemedBookTitle) : "&#160;"}</span>` : ""}
              </div>
              ${context.isAdminPortal ? "" : `<p class="admin-order-request"><strong>${isBookOrder ? "Customer message" : "Request"}:</strong> ${escapeHtml(request)}</p>`}
              ${donation.isPreview ? "" : `<label class="admin-fulfillment-field">
                <span>Fulfillment note</span>
                <textarea data-fulfillment-note="${escapeHtml(donation.id)}" placeholder="Write proof notes, delivery details, or custom writing summary.">${escapeHtml(note)}</textarea>
              </label>
              <div class="admin-order-actions">
                <button class="button button-secondary" type="button" data-download-order-proof="${escapeHtml(donation.id)}" ${isFulfilled ? "" : "disabled title=\"Available after the order is fulfilled\""}>Download PDF</button>
                <button class="button button-primary" type="button" data-save-fulfillment="${escapeHtml(donation.id)}">
                  ${isFulfilled ? "Reopen order" : isBookOrder ? "Mark delivered" : "Mark fulfilled"}
                </button>
                ${
                  context.allowDelete
                    ? `<button class="button button-danger" type="button" data-delete-donation-record="${escapeHtml(donation.id)}">Delete order</button>`
                    : ""
                }
              </div>`}
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function getCalendarMonthDonations(context) {
  const year = context.cursor.getFullYear();
  const month = context.cursor.getMonth();

  return context.donations.filter((donation) => {
    const date = new Date(donation.createdAt || Date.now());
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

function renderCalendarSummary(context) {
  if (!context.summary) return;

  const donationsByDate = getDonationsByDate(context.donations);
  const dayDonations = donationsByDate[context.selectedDate] || [];
  const monthDonations = getCalendarMonthDonations(context);
  const dayTotal = dayDonations.reduce((sum, donation) => sum + (Number.parseFloat(donation.amount) || 0), 0);
  const monthTotal = monthDonations.reduce((sum, donation) => sum + (Number.parseFloat(donation.amount) || 0), 0);

  context.summary.innerHTML = `
    <article>
      <span>${readableDate(fromDateKey(context.selectedDate))}</span>
      <strong>${money(dayTotal)}</strong>
      <small>${dayDonations.length} order${dayDonations.length === 1 ? "" : "s"} selected day</small>
    </article>
    <article>
      <span>${formatMonthTitle(context.cursor)}</span>
      <strong>${money(monthTotal)}</strong>
      <small>${monthDonations.length} order${monthDonations.length === 1 ? "" : "s"} this month</small>
    </article>
  `;
}

function renderCalendarGrid(context) {
  if (!context.grid || !context.title) return;

  const donationsByDate = getDonationsByDate(context.donations);
  const year = context.cursor.getFullYear();
  const month = context.cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date());
  const cells = [];

  for (let offset = 0; offset < firstDay.getDay(); offset += 1) {
    cells.push(`<span class="admin-calendar-day is-empty" role="presentation"></span>`);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = toDateKey(date);
    const donations = donationsByDate[dateKey] || [];
    const total = donations.reduce((sum, donation) => sum + (Number.parseFloat(donation.amount) || 0), 0);
    const classes = [
      "admin-calendar-day",
      donations.length ? "has-donations" : "",
      dateKey === context.selectedDate ? "is-selected" : "",
      dateKey === todayKey ? "is-today" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const donationLabel = donations.length
      ? `${donations.length} order${donations.length === 1 ? "" : "s"}, ${money(total)}`
      : "no orders";

    cells.push(`
      <button
        class="${classes}"
        type="button"
        role="gridcell"
        aria-selected="${dateKey === context.selectedDate}"
        aria-label="${readableDate(date)}, ${donationLabel}"
        ${context.dateAttribute}="${dateKey}"
      >
        <span>${day}</span>
        ${donations.length ? `<small>${money(total)}</small>` : ""}
      </button>
    `);
  }

  context.title.textContent = context.titlePrefix
    ? `${context.titlePrefix} · ${formatMonthTitle(context.cursor)}`
    : formatMonthTitle(context.cursor);
  context.grid.innerHTML = cells.join("");
  renderCalendarDetails(context);
  renderCalendarSummary(context);
}

function getPrimaryAdminCalendarContext() {
  return {
    allowDelete: true,
    isAdminPortal: state.adminProfile?.role === "admin",
    cursor: adminCalendarCursor,
    dateAttribute: "data-admin-calendar-date",
    details: elements.adminCalendarDetails,
    donations: showSampleAdminOrder && state.adminProfile?.role === "admin"
      ? [getSampleAdminOrder(), ...state.donations]
      : state.donations,
    emptyRecordLabel: state.adminProfile?.role === "super_admin" ? "SuperAdmin PayPal orders" : "Admin orders",
    grid: elements.adminCalendarGrid,
    selectedDate: selectedAdminCalendarDate,
    summary: elements.adminCalendarSummary,
    title: elements.adminCalendarTitle,
    titlePrefix: state.adminProfile?.role === "super_admin" ? "Private collection" : "",
  };
}

function renderAdminCalendar() {
  renderCalendarGrid(getPrimaryAdminCalendarContext());
}

function updateCheckoutLabel() {
  const amount = Math.max(getAmount(), 0);
  const seedUnits = getSeedUnitsFromAmount(amount, state.settings.seedPrice);

  elements.checkoutLabel.textContent = "Sow Your Spiritual Seed Now";
  elements.checkoutButton.setAttribute("aria-label", `Support this ministry with ${money(amount)}`);
  elements.seedPriceLabel.textContent = String(Math.max(Math.round(seedUnits), 0));
  elements.paypalTotalSeeds.textContent = `(${formatSeedUnits(seedUnits)})`;
}

function getCheckoutUi() {
  return {
    alternateCardCheckoutLink: elements.alternateCardCheckoutLink,
    amountError: elements.amountError,
    amountInput: elements.amountInput,
    cardButton: elements.cardButton,
    checkoutButton: elements.checkoutButton,
    emailError: elements.emailError,
    emailInput: elements.paymentEmailInput,
    form: elements.supportForm,
    inlinePaypalCheckout: elements.inlinePaypalCheckout,
    messageInput: elements.messageInput,
    nameInput: elements.nameInput,
    paypalButton: elements.paypalButton,
    paypalButtonContainer: elements.paypalButtonContainer,
    paypalCardButton: elements.paypalCardButton,
    paypalCardButtonContainer: elements.paypalCardButtonContainer,
    paypalCheckoutLoader: elements.paypalCheckoutLoader,
    paymentStatus: elements.paymentStatus,
  };
}

function getActiveCheckoutAmount() {
  return Number.parseFloat(getCheckoutUi().amountInput?.value) || 0;
}

function getPaymentEmail() {
  return String(getCheckoutUi().emailInput?.value || "").trim();
}

function getPayPalClientId() {
  return getCheckoutRoute() === "superadmin"
    ? paymentConfig.superAdminPayPalClientId
    : paymentConfig.adminPayPalClientId;
}

function isPayPalConfigured() {
  return Boolean(getPayPalClientId());
}

function isValidEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function requirePaymentEmail() {
  const ui = getCheckoutUi();
  const email = getPaymentEmail();

  if (isValidEmailAddress(email)) {
    if (ui.emailError) ui.emailError.textContent = "";
    return email;
  }

  if (ui.emailError) ui.emailError.textContent = "Add a valid email.";
  setPaymentStatus("Add a valid email to continue with PayPal.", true);
  ui.emailInput?.focus();
  throw new Error("A valid email is required for your order detail.");
}

function stepSeedAmount(direction) {
  const seedPrice = Math.max(Number.parseFloat(state.settings.seedPrice) || SEED_DOLLAR_VALUE, 1);
  const currentSeeds = Math.max(Math.round(getAmount() / seedPrice) || 1, 1);
  const nextSeeds = Math.max(currentSeeds + direction, 1);
  setAmount(nextSeeds * seedPrice);
}

function setAmount(amount) {
  const safeAmount = Math.max(Number.parseFloat(amount) || MIN_DONATION_AMOUNT, MIN_DONATION_AMOUNT);
  elements.amountInput.value = safeAmount.toFixed(2);
  elements.amountError.textContent = "";
  updateCheckoutLabel();
}

function validateForm() {
  const amount = getAmount();
  let isValid = true;

  elements.amountError.textContent = "";
  elements.nameInput.value = elements.nameInput.value.trim();
  elements.nameError.textContent = "";
  if (!elements.nameInput.value) {
    elements.nameError.textContent = "Add your name.";
    elements.nameInput.focus();
    isValid = false;
  }
  if (amount < MIN_DONATION_AMOUNT) {
    elements.amountError.textContent = `Enter at least $${MIN_DONATION_AMOUNT}.`;
    isValid = false;
  }

  return isValid;
}

function getRandomFortuneMessage() {
  const index = Math.floor(Math.random() * FORTUNE_MESSAGES.length);
  return FORTUNE_MESSAGES[index];
}

function setPaymentStatus(message, isError = false) {
  const status = getCheckoutUi().paymentStatus;
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("is-error", isError);
  status.hidden = !message;
}

function setPayPalCheckoutLoading(isLoading) {
  const ui = getCheckoutUi();
  ui.inlinePaypalCheckout.classList.toggle("is-loading", isLoading);
  if (ui.paypalCheckoutLoader) ui.paypalCheckoutLoader.hidden = !isLoading;

  if (isLoading) {
    ui.paypalButton.hidden = false;
    ui.paypalCardButton.hidden = true;
    ui.cardButton.hidden = true;
  }
}

function updatePayPalVisibility() {
  const ui = getCheckoutUi();
  const showPayPal = isPayPalConfigured();

  ui.paypalButton.hidden = !showPayPal;
  ui.paypalCardButton.hidden = true;
  ui.cardButton.hidden = true;

  return showPayPal;
}

function submitDonation(event) {
  event.preventDefault();

  if (!validateForm()) {
    closeInlinePayPalCheckout();
    pendingDonation = null;
    return;
  }

  pendingDonation = {
    name: elements.nameInput.value.trim(),
    email: getPaymentEmail(),
    amount: getAmount(),
    frequency: "once",
    message: elements.messageInput.value.trim(),
    paymentRoute: getCheckoutRoute(),
    createdAt: new Date().toISOString(),
  };

  trackCheckoutEvent("checkout_button_clicked", pendingDonation);
  closeInlinePayPalCheckout();
  openInlinePayPalCheckout();
}

function isValidPayPalSdk(paypal) {
  return Boolean(paypal && typeof paypal.Buttons === "function" && paypal.FUNDING);
}

function waitForPayPalSdk(namespace, timeoutMs = 5000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const paypal = window[namespace];
      if (isValidPayPalSdk(paypal)) {
        resolve(paypal);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("PayPal checkout could not finish loading. Please try again."));
        return;
      }

      window.setTimeout(check, 120);
    };

    check();
  });
}

function getPayPalSdkNamespace(weekly = elements.weeklySeedToggle.checked) {
  const route = getCheckoutRoute();
  return `paypalSys${route === "superadmin" ? "SuperAdmin" : "Admin"}${weekly ? "Weekly" : "Once"}`;
}

function resetPayPalSdk(namespace) {
  document
    .querySelectorAll(`script[data-sys-paypal-sdk][data-namespace="${namespace}"]`)
    .forEach((script) => script.remove());

  const sdkKey = paypalSdkKeysByNamespace.get(namespace);
  if (sdkKey) paypalSdkPromises.delete(sdkKey);
  paypalSdkKeysByNamespace.delete(namespace);

  try {
    delete window[namespace];
  } catch {
    window[namespace] = undefined;
  }
}

function resetAllPayPalSdks() {
  resetPayPalSdk(getPayPalSdkNamespace(false));
  resetPayPalSdk(getPayPalSdkNamespace(true));
}

function loadPayPalSdk(weekly = elements.weeklySeedToggle.checked) {
  const clientId = getPayPalClientId();
  const route = getCheckoutRoute();
  const sdkKey = `${route}:${weekly ? "weekly" : "once"}:${clientId}:${paymentConfig.currency || CONFIG.currency}`;
  const namespace = getPayPalSdkNamespace(weekly);
  const activeSdkKey = paypalSdkKeysByNamespace.get(namespace) || "";

  if (!clientId) {
    return Promise.reject(new Error(getCheckoutRoute() === "superadmin"
      ? "Missing SuperAdmin PayPal client id."
      : "Missing Admin PayPal Business client id."));
  }

  if (isValidPayPalSdk(window[namespace]) && activeSdkKey === sdkKey) {
    return Promise.resolve(window[namespace]);
  }

  if (window[namespace] || (activeSdkKey && activeSdkKey !== sdkKey)) {
    resetPayPalSdk(namespace);
  }

  if (paypalSdkPromises.has(sdkKey)) return paypalSdkPromises.get(sdkKey);

  const sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;
    let loadTimeout = 0;
    const params = new URLSearchParams({
      "client-id": clientId,
      currency: paymentConfig.currency || CONFIG.currency,
      intent: weekly ? "subscription" : "capture",
      components: "buttons",
      ...(weekly ? { vault: "true" } : {}),
      "enable-funding": "card",
      "disable-funding": "credit,paylater,venmo",
    });
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(loadTimeout);
      callback(value);
    };
    const fail = (error) => {
      if (settled) return;
      resetPayPalSdk(namespace);
      finish(reject, error);
    };

    script.dataset.sysPaypalSdk = "true";
    script.setAttribute("data-namespace", namespace);
    script.setAttribute("fetchpriority", "high");
    script.async = true;
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    script.onload = () => {
      waitForPayPalSdk(namespace)
        .then((paypal) => finish(resolve, paypal))
        .catch(fail);
    };
    script.onerror = () => fail(new Error("PayPal checkout could not load."));
    loadTimeout = window.setTimeout(() => {
      fail(new Error("PayPal checkout took too long to load. Please try again."));
    }, PAYPAL_SDK_LOAD_TIMEOUT_MS);
    document.head.append(script);
  });

  paypalSdkKeysByNamespace.set(namespace, sdkKey);
  paypalSdkPromises.set(sdkKey, sdkPromise);

  return sdkPromise;
}

function clearPayPalButtons() {
  if (elements.paypalButtonContainer) elements.paypalButtonContainer.innerHTML = "";
  if (elements.paypalCardButtonContainer) elements.paypalCardButtonContainer.innerHTML = "";
}

function hasRenderedPayPalButton(container) {
  return Array.from(container?.querySelectorAll("iframe") || []).some((iframe) => {
    if (!iframe.isConnected) return false;
    const bounds = iframe.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0;
  });
}

async function waitForRenderedPayPalButton(container, label, timeoutMs = 4000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (hasRenderedPayPalButton(container)) return;
    await wait(80);
  }

  throw new Error(`${label} did not finish rendering. Please try again.`);
}

function buildPayPalButtonOptions(paypal, fundingSource) {
  return {
    fundingSource,
    style: {
      layout: "horizontal",
      shape: "pill",
      ...(fundingSource === paypal.FUNDING.PAYPAL ? { label: "paypal" } : {}),
      tagline: false,
      height: 44,
    },
    createOrder: async () => {
      if (!pendingDonation) throw new Error("Order details are missing.");
      const ui = getCheckoutUi();
      const email = requirePaymentEmail();
      pendingDonation = {
        ...pendingDonation,
        name: ui.nameInput.value.trim(),
        email,
        amount: getActiveCheckoutAmount(),
        message: ui.messageInput.value.trim(),
      };
      setPaymentStatus("Opening secure international PayPal checkout...");
      const payload = await callEdge("create-paypal-order", {
        body: {
          amount: pendingDonation.amount,
          name: pendingDonation.name,
          message: pendingDonation.message,
          email: pendingDonation.email,
          paymentRoute: getCheckoutRoute(),
          productType: "seed",
        },
      });
      pendingDonation.paymentRoute = payload.paymentRoute;
      await trackCheckoutEvent("paypal_checkout_started", pendingDonation);
      return payload.id;
    },
    onApprove: async (data) => {
      setPaymentStatus("Confirming your custom order with PayPal...");
      try {
        const payload = await callEdge("capture-paypal-order", {
          body: { orderId: data.orderID },
        });
        await finishVerifiedDonation(payload);
      } catch (error) {
        if (error?.code === "INSTRUMENT_DECLINED") {
          setPaymentStatus(
            "That payment method was declined. Please choose another PayPal payment method.",
            true,
          );
          closeInlinePayPalCheckout();
          openPaymentFailure("paypal");
          return;
        }

        throw error;
      }
    },
    onCancel: () => {
      closeInlinePayPalCheckout();
      openPaymentFailure("paypal");
    },
    onError: (error) => {
      console.warn("PayPal checkout failed.", error);
      closeInlinePayPalCheckout();
      openPaymentFailure("paypal");
    },
  };
}

function buildPayPalSubscriptionButtonOptions(paypal, fundingSource) {
  let checkoutToken = "";
  return {
    fundingSource,
    style: {
      layout: "horizontal",
      shape: "pill",
      ...(fundingSource === paypal.FUNDING.PAYPAL ? { label: "subscribe" } : {}),
      tagline: false,
      height: 44,
    },
    createSubscription: async (_data, actions) => {
      if (!pendingDonation || pendingDonation.frequency !== "weekly") {
        throw new Error("Weekly checkout details are missing.");
      }
      const email = requirePaymentEmail();
      const amount = getActiveCheckoutAmount();
      pendingDonation = {
        ...pendingDonation,
        name: elements.nameInput.value.trim(),
        email,
        amount,
        message: elements.messageInput.value.trim(),
      };
      setPaymentStatus("Preparing your weekly PayPal subscription...");
      const prepared = await callEdge("prepare-paypal-subscription", {
        body: {
          amount,
          name: pendingDonation.name,
          email,
          message: pendingDonation.message,
          paymentRoute: getCheckoutRoute(),
        },
      });
      checkoutToken = prepared.checkoutToken;
      await trackCheckoutEvent("paypal_checkout_started", pendingDonation);
      return actions.subscription.create({
        plan_id: prepared.planId,
        start_time: prepared.startTime,
        custom_id: checkoutToken,
      });
    },
    onApprove: async (data) => {
      try {
        setPaymentStatus("Confirming your weekly subscription...");
        const result = await callEdge("confirm-paypal-subscription", {
          body: { checkoutToken, subscriptionId: data.subscriptionID },
        });
        closeInlinePayPalCheckout();
        pendingDonation = null;
        elements.supportForm.reset();
        elements.paymentEmailInput.value = "";
        setAmount(getInitialDonationAmount());
        updateCheckoutLabel();
        elements.receiptTitle.textContent = "Weekly sowing started";
        elements.receiptKicker.textContent = "Subscription started";
        elements.receiptSummary.textContent = `Your PayPal subscription ${data.subscriptionID} is ${result.subscription.status}. PayPal charges the selected amount now and schedules weekly billing for Mondays at 7:30 AM India time. You can cancel through PayPal.`;
        elements.receiptSummary.hidden = false;
        openReceipt();
      } catch (error) {
        console.warn("PayPal subscription confirmation is pending.", error);
        setPaymentStatus(`PayPal approved subscription ${data.subscriptionID}, but we could not confirm it here. Check your PayPal account before trying again, and contact support with this ID.`, true);
      }
    },
    onCancel: () => {
      closeInlinePayPalCheckout();
      openPaymentFailure("paypal");
    },
    onError: (error) => {
      console.warn("PayPal subscription failed.", error);
      setPaymentStatus(error?.message || "Weekly PayPal checkout failed. Please try again.", true);
    },
  };
}

function renderPayPalButtons() {
  if (paypalRenderPromise) return paypalRenderPromise;

  paypalRenderPromise = renderFreshPayPalButtons().finally(() => {
    paypalRenderPromise = null;
  });

  return paypalRenderPromise;
}

async function renderFreshPayPalButtons() {
  let namespace = "";
  const ui = getCheckoutUi();
  const weekly = pendingDonation?.frequency === "weekly";

  clearPayPalButtons();
  setPaymentStatus("");
  setPayPalCheckoutLoading(true);

  if (!isBackendConfigured() || !backendReady) {
    ui.paypalButton.hidden = true;
    ui.paypalCardButton.hidden = true;
    ui.cardButton.hidden = true;
    setPaymentStatus("PayPal is currently unavailable.");
    setPayPalCheckoutLoading(false);
    return;
  }

  try {
    await loadBackendData({ mode: "critical", throwOnError: true });
    const route = getCheckoutRoute();
    namespace = getPayPalSdkNamespace(weekly);

    if (!isPayPalConfigured()) {
      throw new Error(getCheckoutRoute() === "superadmin"
        ? "SuperAdmin PayPal checkout is currently unavailable."
        : "Admin PayPal Business checkout is currently unavailable.");
    }

    resetAllPayPalSdks();
    clearPayPalButtons();

    if (pendingDonation) {
      pendingDonation = { ...pendingDonation, paymentRoute: route };
    }

    const paypal = await loadPayPalSdk(weekly);

    if (weekly) {
      const subscriptionButtons = paypal.Buttons(buildPayPalSubscriptionButtonOptions(paypal, paypal.FUNDING.PAYPAL));
      const subscriptionCardButtons = paypal.Buttons(buildPayPalSubscriptionButtonOptions(paypal, paypal.FUNDING.CARD));
      if (!subscriptionButtons.isEligible()) {
        throw new Error("PayPal subscriptions are unavailable for this account.");
      }
      await subscriptionButtons.render(ui.paypalButtonContainer);
      await waitForRenderedPayPalButton(ui.paypalButtonContainer, "The PayPal subscription button");
      let cardReady = false;
      if (subscriptionCardButtons.isEligible()) {
        ui.paypalCardButton.hidden = false;
        try {
          await subscriptionCardButtons.render(ui.paypalCardButtonContainer);
          await waitForRenderedPayPalButton(ui.paypalCardButtonContainer, "The PayPal subscription card button");
          cardReady = true;
        } catch (cardError) {
          console.warn("PayPal subscription card button could not load.", cardError);
          ui.paypalCardButtonContainer.innerHTML = "";
        }
      }
      ui.paypalButton.hidden = false;
      ui.paypalCardButton.hidden = !cardReady;
      ui.cardButton.hidden = true;
      setPaymentStatus(cardReady
        ? "Choose PayPal or a debit or credit card for your weekly subscription."
        : "PayPal's debit or credit card option is unavailable for this subscription. Continue with PayPal.");
      return;
    }

    const paypalButtons = paypal.Buttons(buildPayPalButtonOptions(paypal, paypal.FUNDING.PAYPAL));
    const paypalCardButtons = paypal.Buttons(buildPayPalButtonOptions(paypal, paypal.FUNDING.CARD));
    const paypalEligible = paypalButtons.isEligible();
    const paypalCardEligible = paypalCardButtons.isEligible();

    if (!paypalEligible) {
      throw new Error("PayPal did not return an eligible checkout option.");
    }

    await paypalButtons.render(ui.paypalButtonContainer);
    await waitForRenderedPayPalButton(ui.paypalButtonContainer, "The PayPal button");

    let paypalCardReady = false;
    if (paypalCardEligible) {
      // The SDK cannot give the card iframe a measurable size inside a hidden choice.
      ui.paypalCardButton.hidden = false;
      try {
        await paypalCardButtons.render(ui.paypalCardButtonContainer);
        await waitForRenderedPayPalButton(ui.paypalCardButtonContainer, "The PayPal debit or credit card button");
        paypalCardReady = true;
      } catch (cardError) {
        console.warn("PayPal card button could not load.", cardError);
        ui.paypalCardButton.hidden = true;
        ui.paypalCardButtonContainer.innerHTML = "";
      }
    }

    ui.paypalButton.hidden = false;
    ui.paypalCardButton.hidden = !paypalCardReady;
    ui.cardButton.hidden = true;
    setPaymentStatus(paypalCardEligible && !paypalCardReady
      ? "PayPal debit or credit card is temporarily unavailable. You can continue with PayPal."
      : paypalCardReady
        ? "Choose PayPal or PayPal debit or credit card to continue"
        : "Choose PayPal to continue", paypalCardEligible && !paypalCardReady);
  } catch (error) {
    clearPayPalButtons();
    if (namespace) resetPayPalSdk(namespace);
    ui.paypalButton.hidden = true;
    ui.paypalCardButton.hidden = true;
    ui.cardButton.hidden = true;
    setPaymentStatus(error?.message || "PayPal could not load. Please try again.", true);
  } finally {
    setPayPalCheckoutLoading(false);
  }
}

async function finishVerifiedDonation(payload) {
  const donation = payload.donation;
  const isRitual = payload.productType === "ritual";
  const fortuneMessage = payload.fortune || donation?.fortune_message || getRandomFortuneMessage();
  const paymentRoute = donation?.paymentRoute || payload.paymentRoute || pendingDonation?.paymentRoute || "superadmin";

  if (payload.donorAccessToken) {
    setDonorToken(payload.donorAccessToken);
  }

  if (donation && paymentRoute !== "superadmin") {
    state.donations.unshift({
      id: donation.id,
      name: donation.display_name || donation.name || pendingDonation?.name || "Customer",
      amount: Number(donation.amount || pendingDonation?.amount || 0),
      frequency: donation.frequency || pendingDonation?.frequency || "once",
      message: donation.supporter_message || pendingDonation?.message || "",
      fortuneMessage: donation.fortune_message || fortuneMessage,
      digitalOrder: payload.digitalOrder || null,
      rawPayment: donation.raw_payment || null,
      paymentRoute,
      createdAt: donation.created_at || new Date().toISOString(),
    });
    selectedAdminCalendarDate = getDonationDateKey(state.donations[0]);
    adminCalendarCursor = fromDateKey(selectedAdminCalendarDate);
  }

  if (payload.seedComment) {
    state.seedComments = normalizeSeedComments([payload.seedComment, ...(state.seedComments || [])]);
  } else if (!isBackendConfigured() && pendingDonation?.message) {
    state.seedComments = normalizeSeedComments([
      {
        id: `seed-comment-${Date.now()}`,
        name: pendingDonation.name || "Customer",
        text: pendingDonation.message,
        amount: pendingDonation.amount,
        seedCount: getSeedCountFromAmount(pendingDonation.amount),
        source: "payment",
        createdAt: new Date().toISOString(),
      },
      ...(state.seedComments || []),
    ]);
  }

  if (isBackendConfigured()) {
    await loadBackendData();
  } else {
    saveState();
  }

  renderApp();
  elements.receiptKicker.textContent = isRitual ? "Ritual complete" : "YOUR SEED WAS SOWN WITH LOVE, CARE, AND FAITH";
  elements.receiptTitle.textContent = isRitual ? "Your Ritual is Done" : "Your fortune for today";
  elements.receiptSummary.textContent = isRitual
    ? "“With God all things are possible.” — Matthew 19:26"
    : fortuneMessage;
  elements.receiptSummary.hidden = false;
  const ui = getCheckoutUi();
  ui.form.reset();
  if (ui.emailInput) {
    ui.emailInput.value = "";
  }
  setAmount(getInitialDonationAmount());
  updateCheckoutLabel();
  closeInlinePayPalCheckout();
  pendingDonation = null;
  closePaymentFailure();
  openReceipt();
}

function openInlinePayPalCheckout() {
  alternateCheckoutSource = "paypal";
  const ui = getCheckoutUi();
  setPaymentStatus("");
  if (typeof elements.paypalPaymentDialog.showModal === "function") {
    elements.paypalPaymentDialog.showModal();
  } else {
    elements.paypalPaymentDialog.setAttribute("open", "");
  }
  ui.inlinePaypalCheckout.hidden = true;
  elements.paypalContinueButton.hidden = false;
  ui.checkoutButton.classList.add("is-checkout-open");
  ui.checkoutButton.setAttribute("aria-expanded", "true");
  ui.emailInput.focus();
}

function continueWithPayPal() {
  const ui = getCheckoutUi();
  if (!isValidEmailAddress(getPaymentEmail())) {
    ui.emailError.textContent = "Add a valid email.";
    ui.emailInput.focus();
    return;
  }

  if (!elements.nameInput.value.trim()) {
    elements.nameError.textContent = "Add your name.";
    closeInlinePayPalCheckout();
    elements.nameInput.focus();
    return;
  }
  elements.nameError.textContent = "";

  ui.emailError.textContent = "";
  pendingDonation = {
    ...pendingDonation,
    email: getPaymentEmail(),
    frequency: elements.weeklySeedToggle.checked ? "weekly" : "once",
    message: ui.messageInput.value.trim(),
  };
  elements.paypalContinueButton.hidden = true;
  const showPayPal = updatePayPalVisibility();
  ui.inlinePaypalCheckout.hidden = false;

  if (showPayPal) {
    setPayPalCheckoutLoading(true);
    void renderPayPalButtons();
    return;
  }
  setPayPalCheckoutLoading(false);
  setPaymentStatus("PayPal is currently unavailable.");
}

function closeInlinePayPalCheckout() {
  const ui = getCheckoutUi();
  clearPayPalButtons();
  resetAllPayPalSdks();
  setPayPalCheckoutLoading(false);
  ui.paypalButton.hidden = true;
  ui.paypalCardButton.hidden = true;
  ui.cardButton.hidden = true;
  ui.inlinePaypalCheckout.hidden = true;
  elements.paypalContinueButton.hidden = false;
  if (elements.paypalPaymentDialog.open) elements.paypalPaymentDialog.close();
  ui.checkoutButton.classList.remove("is-checkout-open");
  ui.checkoutButton.setAttribute("aria-expanded", "false");
  setPaymentStatus("");
}

function openReceipt({ preview = false } = {}) {
  document.querySelector("#receiptPreviewLabel").hidden = !preview;
  document.body.classList.add("receipt-open");

  if (typeof elements.receiptDialog.showModal === "function") {
    elements.receiptDialog.showModal();
  } else {
    elements.receiptDialog.setAttribute("open", "");
  }
}

function closeReceipt() {
  document.body.classList.remove("receipt-open");
  elements.receiptDialog.close();
}

function openPaymentFailure(source = alternateCheckoutSource, { preview = false } = {}) {
  if (source === "dodo" || source === "paypal") {
    alternateCheckoutSource = source;
  }
  if (document.body.classList.contains("app-loading")) {
    void (async () => {
      while (document.body.classList.contains("app-loading")) await wait(50);
      openPaymentFailure(source, { preview });
    })();
    return;
  }
  if (!elements.paymentFailureDialog || elements.paymentFailureDialog.open) return;

  document.querySelector("#paymentFailurePreviewLabel").hidden = !preview;
  setActiveView("homeView", true);
  document.body.classList.add("payment-failure-open");
  if (typeof elements.paymentFailureDialog.showModal === "function") {
    elements.paymentFailureDialog.showModal();
  } else {
    elements.paymentFailureDialog.setAttribute("open", "");
  }
}

function closePaymentFailure(returnToSupport = false) {
  if (!elements.paymentFailureDialog) return;

  document.body.classList.remove("payment-failure-open");
  if (elements.paymentFailureDialog.open && typeof elements.paymentFailureDialog.close === "function") {
    elements.paymentFailureDialog.close();
  } else {
    elements.paymentFailureDialog.removeAttribute("open");
  }

  if (returnToSupport) {
    window.requestAnimationFrame(returnToSowYourSeed);
  }
}

function openRitualPaymentFailure({ preview = false } = {}) {
  if (document.body.classList.contains("app-loading")) {
    void (async () => {
      while (document.body.classList.contains("app-loading")) await wait(50);
      openRitualPaymentFailure({ preview });
    })();
    return;
  }
  if (!elements.ritualFailureDialog || elements.ritualFailureDialog.open) return;

  document.querySelector("#ritualFailurePreviewLabel").hidden = !preview;
  setActiveView("homeView", true);
  document.body.classList.add("payment-failure-open");
  if (typeof elements.ritualFailureDialog.showModal === "function") {
    elements.ritualFailureDialog.showModal();
  } else {
    elements.ritualFailureDialog.setAttribute("open", "");
  }
}

function closeRitualPaymentFailure(retry = false) {
  if (!elements.ritualFailureDialog) return;
  document.body.classList.remove("payment-failure-open");
  if (elements.ritualFailureDialog.open && typeof elements.ritualFailureDialog.close === "function") {
    elements.ritualFailureDialog.close();
  } else {
    elements.ritualFailureDialog.removeAttribute("open");
  }
  if (retry) {
    window.requestAnimationFrame(() => {
      setActiveView("homeView", true);
      document.querySelector(".support-ritual-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.querySelector("#ritualForm")?.requestSubmit();
    });
  }
}

async function finishDodoPayment(payload) {
  while (document.body.classList.contains("app-loading")) {
    await wait(50);
  }
  pendingDonation = null;
  await finishVerifiedDonation(payload);
}

function openAlternateCheckout(link) {
  if (!state.settings.dodoCheckoutVisible || !state.settings.alternateCardCheckoutVisible || link !== elements.dodoAlternateCardCheckoutLink) return;
  const ui = getCheckoutUi();
  const rawCheckoutUrl = link?.href;
  let checkoutUrl = rawCheckoutUrl;
  if (rawCheckoutUrl) {
    const url = new URL(rawCheckoutUrl);
    const isDodoCheckout = link === elements.dodoAlternateCardCheckoutLink;
    alternateCheckoutSource = isDodoCheckout ? "dodo" : "paypal";
    url.searchParams.set("amount", String(isDodoCheckout
      ? (Number(document.querySelector("#dodoSeedCount")?.value) || 1) * (Number(state.settings.seedPrice) || SEED_DOLLAR_VALUE)
      : pendingDonation?.amount || getActiveCheckoutAmount()));
    url.searchParams.set("email", isDodoCheckout
      ? document.querySelector("#dodoCustomerEmail")?.value.trim() || ""
      : pendingDonation?.email || getPaymentEmail());
    url.searchParams.set("name", isDodoCheckout
      ? document.querySelector("#dodoCustomerName")?.value.trim() || ""
      : pendingDonation?.name || ui.nameInput?.value.trim() || "");
    checkoutUrl = url.toString();
  }
  if (!checkoutUrl || !elements.alternateCheckoutDialog || !elements.alternateCheckoutFrame) return;

  if (link === elements.dodoAlternateCardCheckoutLink) {
    document.querySelector("#dodoPaymentDialog")?.close();
  }
  elements.alternateCheckoutFrame.src = checkoutUrl;
  document.body.classList.add("alternate-checkout-open");

  if (typeof elements.alternateCheckoutDialog.showModal === "function") {
    elements.alternateCheckoutDialog.showModal();
  } else {
    elements.alternateCheckoutDialog.setAttribute("open", "");
  }
}

function closeAlternateCheckout() {
  if (!elements.alternateCheckoutDialog) return;

  document.body.classList.remove("alternate-checkout-open");
  if (elements.alternateCheckoutDialog.open && typeof elements.alternateCheckoutDialog.close === "function") {
    elements.alternateCheckoutDialog.close();
  } else {
    elements.alternateCheckoutDialog.removeAttribute("open");
  }
  if (elements.alternateCheckoutFrame) elements.alternateCheckoutFrame.src = "about:blank";
}

function returnToSowYourSeed() {
  setActiveView("homeView", true);
  const useDodoCheckout = state.settings.dodoCheckoutVisible;
  const checkoutCard = useDodoCheckout
    ? elements.dodoCardButton?.closest(".dodo-checkout-card")
    : elements.supportCard;
  if (!checkoutCard) return;

  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  (useDodoCheckout
    ? document.querySelector("#dodoCheckoutButton")
    : elements.paymentEmailInput)?.focus({ preventScroll: true });
  checkoutCard.scrollIntoView({ behavior, block: "start" });
}

function openAdminLogin() {
  clearAdminSession();
  if (elements.adminEmailInput) {
    elements.adminEmailInput.value = "";
    elements.adminEmailInput.required = isBackendConfigured();
  }
  elements.adminPasswordInput.value = "";
  elements.adminPasswordError.textContent = "";

  if (typeof elements.adminLoginDialog.showModal === "function") {
    elements.adminLoginDialog.showModal();
  } else {
    elements.adminLoginDialog.setAttribute("open", "");
  }

  window.requestAnimationFrame(() => {
    elements.adminLoginDialog.classList.add("is-open");
  });
  window.setTimeout(() => {
    if (isBackendConfigured() && elements.adminEmailInput) {
      elements.adminEmailInput.focus();
    } else {
      elements.adminPasswordInput.focus();
    }
  }, 80);
}

function closeAdminLogin() {
  elements.adminLoginDialog.classList.remove("is-open");

  if (typeof elements.adminLoginDialog.close === "function") {
    elements.adminLoginDialog.close();
  } else {
    elements.adminLoginDialog.removeAttribute("open");
  }
}

function placePayPalCheckoutInPortal(inPortal) {
  if (!elements.supportCard) return;
  if (inPortal) {
    if (elements.superAdminCheckoutHost && elements.supportCard.parentElement !== elements.superAdminCheckoutHost) {
      elements.superAdminCheckoutHost.appendChild(elements.supportCard);
    }
  } else if (elements.supportHomeColumn && elements.supportRitualCard
    && elements.supportCard.nextElementSibling !== elements.supportRitualCard) {
    elements.supportHomeColumn.insertBefore(elements.supportCard, elements.supportRitualCard);
  }
  elements.supportCard.hidden = !inPortal && !state.settings.paypalCheckoutVisible;
}

function renderStandardCalendar() {
  if (!elements.standardCalendarGrid) return;
  const year = standardCalendarCursor.getFullYear();
  const month = standardCalendarCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const byDate = new Map();
  for (const transaction of standardTransactions) {
    const date = String(transaction.createdAt || "").slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(transaction);
  }

  elements.standardCalendarTitle.textContent = formatMonthTitle(standardCalendarCursor);
  elements.standardCalendarGrid.replaceChildren();
  for (let offset = 0; offset < firstDay.getDay(); offset += 1) {
    const blank = document.createElement("span");
    blank.className = "admin-calendar-day is-empty";
    blank.setAttribute("role", "presentation");
    elements.standardCalendarGrid.append(blank);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = toDateKey(date);
    const records = byDate.get(dateKey) || [];
    const button = document.createElement("button");
    button.type = "button";
    button.className = `admin-calendar-day${records.length ? " has-donations" : ""}${dateKey === selectedStandardDate ? " is-selected" : ""}${dateKey === toDateKey(new Date()) ? " is-today" : ""}`;
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-selected", String(dateKey === selectedStandardDate));
    button.setAttribute("aria-label", `${readableDate(date)}, ${records.length} successful transactions`);
    button.dataset.standardCalendarDate = dateKey;
    const dayNumber = document.createElement("span");
    dayNumber.textContent = String(day);
    button.append(dayNumber);
    if (records.length) {
      const count = document.createElement("small");
      count.textContent = "●";
      button.append(count);
    }
    elements.standardCalendarGrid.append(button);
  }

  const selected = byDate.get(selectedStandardDate) || [];
  elements.standardCalendarDetails.replaceChildren();
  const heading = document.createElement("h4");
  heading.textContent = readableDate(fromDateKey(selectedStandardDate));
  elements.standardCalendarDetails.append(heading);
  if (!selected.length) {
    const empty = document.createElement("p");
    empty.textContent = "No successful transactions on this date.";
    elements.standardCalendarDetails.append(empty);
  } else {
    for (const transaction of selected) {
      const row = document.createElement("div");
      row.className = "standard-transaction";
      const name = document.createElement("span");
      name.textContent = transaction.name || "Customer";
      const amount = document.createElement("strong");
      amount.textContent = money(Number(transaction.amount) || 0);
      row.append(name, amount);
      elements.standardCalendarDetails.append(row);
    }
  }
}

async function loadStandardTransactions() {
  const month = getMonthKey(standardCalendarCursor);
  elements.standardCalendarPrev.disabled = true;
  elements.standardCalendarNext.disabled = true;
  elements.standardCalendarDetails.textContent = "Loading successful transactions...";
  try {
    const payload = await callEdge(`standard-transactions?month=${month}`, { admin: true, method: "GET" });
    if (month !== getMonthKey(standardCalendarCursor) || state.adminProfile?.role !== "standard") return;
    standardTransactions = Array.isArray(payload.transactions) ? payload.transactions : [];
    renderStandardCalendar();
  } catch (error) {
    elements.standardCalendarDetails.textContent = error.message || "Could not load transactions.";
  } finally {
    elements.standardCalendarPrev.disabled = false;
    elements.standardCalendarNext.disabled = false;
  }
}

function openAdminPanel() {
  const isSuperAdmin = state.adminProfile?.role === "super_admin";
  if (state.adminProfile?.role === "standard") return openStandardPanel();

  const titleEl = document.getElementById("adminTitle");
  if (titleEl) {
    titleEl.textContent = isSuperAdmin ? "Super Admin Portal" : "Order controls";
  }

  const kickerEl = elements.adminPanel?.querySelector(".admin-panel-header .section-kicker");
  if (kickerEl) {
    kickerEl.textContent = isSuperAdmin ? "Super Admin Portal" : "Admin portal";
  }

  if (document.getElementById("adminSuperCheckoutSection")) {
    document.getElementById("adminSuperCheckoutSection").hidden = !isSuperAdmin;
  }
  elements.adminPanel.classList.toggle("is-super-admin", isSuperAdmin);
  elements.superAdminPayPalSection.hidden = !isSuperAdmin;
  if (elements.adminDonationHeading) {
    elements.adminDonationHeading.textContent = isSuperAdmin
      ? "SuperAdmin collection calendar"
      : "1. Admin order calendar";
  }
  elements.adminCalendarGrid.setAttribute(
    "aria-label",
    isSuperAdmin ? "Daily SuperAdmin PayPal order records" : "Daily Admin order records",
  );

  const sections = document.querySelectorAll(".admin-section");
  sections.forEach(section => {
    const isSuperAdminSection = section.classList.contains("admin-super-checkout-section");
    const isCollectionCalendar = section.classList.contains("admin-donations");
    const isRoleScopedAnalytics = section.classList.contains("admin-analytics-section");
    const shouldShow = isSuperAdmin
      ? isSuperAdminSection || isCollectionCalendar || isRoleScopedAnalytics
      : !isSuperAdminSection;
    section.hidden = !shouldShow;
    section.style.display = shouldShow ? "" : "none";
  });
  placePayPalCheckoutInPortal(isSuperAdmin);

  const saveButton = elements.saveAdminButton;
  if (saveButton) {
    saveButton.style.display = isSuperAdmin ? "none" : "";
  }

  renderAdminForm();
  renderAdminCalendar();
  renderAdminAnalytics();
  
  if (isSuperAdmin) {
    setAdminStatus("SuperAdmin ready. Manage checkout display and private collections.", "info", { persist: true });
  } else {
    setAdminStatus("Admin ready. Manage orders, site settings, and analytics.", "info", { persist: true });
  }
  
  document.body.classList.add("admin-open");
  elements.adminBackdrop.hidden = false;
  elements.adminPanel.setAttribute("aria-hidden", "false");
  elements.adminMenuButton.setAttribute("aria-controls", "adminPanel");
  elements.adminMenuButton.setAttribute("aria-expanded", "true");
  window.requestAnimationFrame(() => {
    elements.adminBackdrop.classList.add("is-open");
    elements.adminPanel.classList.add("is-open");
  });
}

function openStandardPanel() {
  document.body.classList.add("admin-open");
  elements.adminBackdrop.hidden = false;
  elements.standardPanel.setAttribute("aria-hidden", "false");
  elements.adminMenuButton.setAttribute("aria-controls", "standardPanel");
  elements.adminMenuButton.setAttribute("aria-expanded", "true");
  window.requestAnimationFrame(() => {
    elements.adminBackdrop.classList.add("is-open");
    elements.standardPanel.classList.add("is-open");
  });
}

function closeAdminPanel() {
  clearAdminSession();
  placePayPalCheckoutInPortal(false);
  window.clearTimeout(setAdminStatus.timeout);
  if (elements.adminActionStatus) {
    elements.adminActionStatus.hidden = true;
  }
  document.body.classList.remove("admin-open");
  elements.adminBackdrop.classList.remove("is-open");
  elements.adminPanel.classList.remove("is-open");
  elements.standardPanel.classList.remove("is-open");
  elements.adminPanel.setAttribute("aria-hidden", "true");
  elements.standardPanel.setAttribute("aria-hidden", "true");
  elements.adminMenuButton.setAttribute("aria-controls", "adminLoginDialog");
  elements.adminMenuButton.setAttribute("aria-expanded", "false");
  window.setTimeout(() => {
    if (!elements.adminPanel.classList.contains("is-open") && !elements.standardPanel.classList.contains("is-open")) {
      elements.adminBackdrop.hidden = true;
    }
  }, 180);
}

function getAdminSettings() {
  const inputs = elements.adminInputs;

  return normalizeSettings({
    ...state.settings,
    blessingWallEnabled: inputs.blessingWallEnabled.checked,
    seedPrice: inputs.seedPrice.value,
  });
}

function getViewIdFromHash() {
  return "homeView";
}

function setActiveView(viewId, updateHash = false) {
  const targetTab = Array.from(elements.profileTabs).find((tab) => tab.dataset.sectionTab === viewId);

  elements.sectionViews.forEach((view) => {
    const isActive = view.id === viewId;
    view.hidden = !isActive;
    view.classList.toggle("is-active", isActive);
  });

  elements.profileTabs.forEach((tab) => {
    const isActive = tab.dataset.sectionTab === viewId;
    tab.classList.toggle("active", isActive);
    if (isActive) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });

  if (updateHash && targetTab) {
    history.pushState(null, "", targetTab.getAttribute("href"));
  }
}

function setAdminStatus(message, type = "info", options = {}) {
  const statusElement = options.statusElement || elements.adminActionStatus;
  if (!statusElement) return;

  window.clearTimeout(setAdminStatus.timeout);
  statusElement.hidden = false;
  statusElement.textContent = message;
  statusElement.className = `admin-status is-${type}`;

  if (!options.persist) {
    setAdminStatus.timeout = window.setTimeout(() => {
      statusElement.hidden = true;
    }, options.delay || 5200);
  }
}

function setAdminBusy(isBusy, panel = elements.adminPanel) {
  if (!panel) return;
  panel.setAttribute("aria-busy", String(isBusy));
  panel.classList.toggle("is-busy", isBusy);
}

function setButtonBusy(button, isBusy, busyText = "") {
  if (!button) return;

  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent;
  }

  button.disabled = isBusy;
  button.classList.toggle("is-loading", isBusy);

  if (busyText) {
    button.textContent = isBusy ? busyText : button.dataset.defaultText;
  } else if (!isBusy) {
    button.textContent = button.dataset.defaultText;
  }
}

function getSettingsChangeCount(previousSettings, nextSettings) {
  const previous = normalizeSettings(previousSettings);
  const next = normalizeSettings(nextSettings);

  return Object.keys(next).reduce((count, key) => {
    const before = Array.isArray(previous[key]) ? previous[key].join(",") : String(previous[key] ?? "");
    const after = Array.isArray(next[key]) ? next[key].join(",") : String(next[key] ?? "");
    return count + (before === after ? 0 : 1);
  }, 0);
}

async function runAdminAction({ button, busyText, loadingMessage, successMessage, errorMessage }, action) {
  const config = arguments[0] || {};
  const panel = config.panel || elements.adminPanel;
  const statusElement = config.statusElement || elements.adminActionStatus;

  setAdminBusy(true, panel);
  setButtonBusy(button, true, busyText);
  setAdminStatus(loadingMessage, "loading", { persist: true, statusElement });

  try {
    const result = await action();
    const message = typeof successMessage === "function" ? successMessage(result) : successMessage;
    setAdminStatus(message, "success", { statusElement });
    showToast(message);
    return result;
  } catch (error) {
    const message = error.message || errorMessage || "Admin action failed.";
    setAdminStatus(message, "error", { persist: true, statusElement });
    showToast(message);
    return null;
  } finally {
    setButtonBusy(button, false, busyText);
    setAdminBusy(false, panel);
  }
}

function showToast(message) {
  const toast = elements.toast;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderGoalProgress() {
  const goalProgress = normalizeGoalProgress(state.goalProgress);
  const roundedPercentage = Math.round(goalProgress.percentage);

  elements.supportGoalFill?.style.setProperty("--goal-progress", `${goalProgress.percentage}%`);
  if (elements.supportGoalPercent) elements.supportGoalPercent.textContent = `${roundedPercentage}%`;
  elements.supportGoal?.setAttribute(
    "aria-label",
    `${roundedPercentage} percent of support goal reached: $${(goalProgress.confirmedAmountCents / 100).toFixed(2)} of $${(goalProgress.goalAmountCents / 100).toFixed(2)} in confirmed seed payments`,
  );
}

function renderApp() {
  renderSettings();
  renderGoalProgress();
  renderRecentDonations();
  renderSeedComments();
  renderAdminCalendar();
  renderAdminAnalytics();
  updateCheckoutLabel();
}

elements.amountInput.addEventListener("input", () => {
  elements.amountError.textContent = "";
  updateCheckoutLabel();
});
elements.amountInput.addEventListener("blur", () => {
  if (getAmount() < MIN_DONATION_AMOUNT) {
    setAmount(MIN_DONATION_AMOUNT);
  }
});
elements.decreaseSeedButton?.addEventListener("click", () => {
  stepSeedAmount(-1);
});
elements.increaseSeedButton?.addEventListener("click", () => {
  stepSeedAmount(1);
});
elements.adminCalendarPrev.addEventListener("click", () => {
  adminCalendarCursor = new Date(adminCalendarCursor.getFullYear(), adminCalendarCursor.getMonth() - 1, 1);
  selectedAdminCalendarDate = toDateKey(adminCalendarCursor);
  renderAdminCalendar();
  loadAdminDonations({ announce: true });
});

elements.adminCalendarNext.addEventListener("click", () => {
  adminCalendarCursor = new Date(adminCalendarCursor.getFullYear(), adminCalendarCursor.getMonth() + 1, 1);
  selectedAdminCalendarDate = toDateKey(adminCalendarCursor);
  renderAdminCalendar();
  loadAdminDonations({ announce: true });
});

elements.adminCalendarGrid.addEventListener("click", (event) => {
  const dateButton = event.target.closest("[data-admin-calendar-date]");
  if (!dateButton) return;

  selectedAdminCalendarDate = dateButton.dataset.adminCalendarDate;
  adminCalendarCursor = fromDateKey(selectedAdminCalendarDate);
  renderAdminCalendar();
});

function handleAdminCalendarDetailClick(event) {
  const proofButton = event.target.closest("[data-download-order-proof]");
  if (proofButton) {
    downloadOrderProofPdf(proofButton.dataset.downloadOrderProof);
    return;
  }

  const fulfillmentButton = event.target.closest("[data-save-fulfillment]");
  if (fulfillmentButton) {
    saveDigitalOrderFulfillment(fulfillmentButton.dataset.saveFulfillment, fulfillmentButton);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-donation-record]");
  if (deleteButton) {
    deleteDonationRecord(deleteButton.dataset.deleteDonationRecord, deleteButton);
  }
}

elements.adminCalendarDetails.addEventListener("click", handleAdminCalendarDetailClick);
elements.fulfillmentCancelButton?.addEventListener("click", closeFulfillmentDialog);
elements.fulfillmentForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const fulfilledAt = getSelectedFulfillmentTimestamp();
  if (!fulfilledAt || !pendingFulfillmentAction) return;

  const { donationId, button } = pendingFulfillmentAction;
  closeFulfillmentDialog();
  saveDigitalOrderFulfillment(donationId, button, fulfilledAt);
});
elements.fulfillmentDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeFulfillmentDialog();
});
elements.fulfillmentDialog?.addEventListener("close", () => {
  elements.fulfillmentDialog.classList.remove("is-open");
  pendingFulfillmentAction = null;
});

elements.profileTabs.forEach((tab) => {
  tab.addEventListener("click", (event) => {
    event.preventDefault();
    setActiveView(tab.dataset.sectionTab, true);
  });
});

elements.refreshAdminButton.addEventListener("click", refreshAdminPortalData);
elements.resetAdminAnalyticsButton.addEventListener("click", resetAdminAnalytics);
elements.decrementPageViewButton?.addEventListener("click", decrementPageView);

elements.adminForm.addEventListener("input", () => {

  setAdminStatus("Unsaved site setting changes. Click Save site settings to publish them.", "dirty", { persist: true });
});
elements.showMoreButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const content = document.querySelector(`#${button.dataset.toggleTarget}`);
    const card = button.closest(".collapsible-card");
    const isExpanded = button.getAttribute("aria-expanded") === "true";

    button.setAttribute("aria-expanded", String(!isExpanded));
    button.textContent = isExpanded ? "Show more" : "Show less";
    content.classList.toggle("is-expanded", !isExpanded);
    card.classList.toggle("is-expanded", !isExpanded);
  });
});

elements.supportForm.addEventListener("submit", submitDonation);
const ritualOptions = [...document.querySelectorAll("#ritualOptions .ritual-option")];
const previousRitualButton = document.querySelector("#previousRitual");
const nextRitualButton = document.querySelector("#nextRitual");
let selectedRitualIndex = 0;

function setRitualButtonLoading(button, loading) {
  if (!button) return;
  button.disabled = loading;
  button.classList.toggle("is-loading", loading);
  if (loading) {
    const seed = document.createElement("span");
    seed.className = "ritual-loading-seed";
    seed.setAttribute("aria-hidden", "true");
    seed.textContent = "🌱";
    const label = document.createElement("span");
    label.textContent = "Loading…";
    button.replaceChildren(seed, label);
    button.setAttribute("aria-busy", "true");
    button.setAttribute("aria-label", "Loading ritual checkout");
  } else {
    button.textContent = "Perform Ritual";
    button.removeAttribute("aria-busy");
    button.removeAttribute("aria-label");
  }
}

function selectRitual(index) {
  selectedRitualIndex = Math.max(0, Math.min(index, ritualOptions.length - 1));
  ritualOptions.forEach((option, optionIndex) => {
    const selected = optionIndex === selectedRitualIndex;
    option.classList.toggle("is-selected", selected);
    option.querySelector(".ritual-option-name").setAttribute("aria-pressed", String(selected));
  });
  ritualOptions[selectedRitualIndex].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  previousRitualButton.disabled = selectedRitualIndex === 0;
  nextRitualButton.disabled = selectedRitualIndex === ritualOptions.length - 1;
  document.querySelector("#ritualStatus").hidden = true;
}

ritualOptions.forEach((option, index) => option.addEventListener("click", () => selectRitual(index)));
previousRitualButton?.addEventListener("click", () => selectRitual(selectedRitualIndex - 1));
nextRitualButton?.addEventListener("click", () => selectRitual(selectedRitualIndex + 1));
if (previousRitualButton) previousRitualButton.disabled = true;
document.querySelector("#ritualForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const selectedRitual = ritualOptions[selectedRitualIndex];
  const dialog = document.querySelector("#ritualPaymentDialog");
  const status = document.querySelector("#ritualPaymentStatus");
  status.hidden = true;
  status.classList.remove("is-error");
  const continueButton = document.querySelector("#ritualContinueButton");
  continueButton.hidden = false;
  setRitualButtonLoading(continueButton, false);
  document.querySelector("#closeRitualPaymentDialog").disabled = false;
  const paypalButtons = document.querySelector("#ritualPaypalButtons");
  paypalButtons.hidden = true;
  paypalButtons.innerHTML = "";
  const nameInput = document.querySelector("#ritualCustomerName");
  nameInput.value = selectedRitual.querySelector("input").value.trim();
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  (nameInput.value ? document.querySelector("#ritualCustomerEmail") : nameInput).focus();
});
document.querySelector("#closeRitualPaymentDialog")?.addEventListener("click", () => {
  document.querySelector("#ritualPaymentDialog").close();
});
document.querySelector("#ritualPaymentDialog")?.addEventListener("cancel", (event) => {
  if (document.querySelector("#ritualContinueButton").disabled) event.preventDefault();
});
document.querySelector("#ritualContinueButton")?.addEventListener("click", async () => {
  const nameInput = document.querySelector("#ritualCustomerName");
  const emailInput = document.querySelector("#ritualCustomerEmail");
  const ritualForInput = document.querySelector("#ritualFor");
  nameInput.value = nameInput.value.trim();
  ritualForInput.value = ritualForInput.value.trim();
  if (![nameInput, emailInput, ritualForInput].every((input) => input.reportValidity())) return;
  const button = document.querySelector("#ritualContinueButton");
  const closeButton = document.querySelector("#closeRitualPaymentDialog");
  const status = document.querySelector("#ritualPaymentStatus");
  const selectedRitual = ritualOptions[selectedRitualIndex];
  const ritualTier = selectedRitual.querySelector(".ritual-option-price").textContent.slice(1);
  const name = nameInput.value;
  setRitualButtonLoading(button, true);
  closeButton.disabled = true;
  status.hidden = false;
  status.textContent = "Opening secure checkout…";
  try {
    if (state.settings.paypalCheckoutVisible) {
      if (!isBackendConfigured() || !backendReady) throw new Error("PayPal checkout is currently unavailable.");
      await loadBackendData({ mode: "critical", throwOnError: true });
      if (!isPayPalConfigured()) throw new Error("PayPal checkout is currently unavailable.");
      const paypal = await loadPayPalSdk(false);
      const container = document.querySelector("#ritualPaypalButtons");
      const details = {
        ritualTier,
        name,
        email: emailInput.value.trim(),
        message: ritualForInput.value,
      };
      const buttons = paypal.Buttons({
        fundingSource: paypal.FUNDING.PAYPAL,
        style: { layout: "horizontal", shape: "pill", label: "paypal", tagline: false, height: 44 },
        createOrder: async () => {
          status.textContent = "Opening secure PayPal checkout…";
          const order = await callEdge("create-paypal-order", {
            body: { ...details, productType: "ritual", paymentRoute: getCheckoutRoute() },
          });
          return order.id;
        },
        onApprove: async (data) => {
          try {
            status.textContent = "Confirming your ritual payment…";
            const payload = await callEdge("capture-paypal-order", { body: { orderId: data.orderID } });
            document.querySelector("#ritualPaymentDialog").close();
            await finishVerifiedDonation(payload);
          } catch (error) {
            status.textContent = error?.message || "Ritual payment could not be confirmed. Please try again.";
            status.classList.add("is-error");
          }
        },
        onCancel: () => {
          container.hidden = true;
          container.innerHTML = "";
          button.hidden = false;
          button.disabled = false;
          document.querySelector("#ritualPaymentDialog").close();
          openRitualPaymentFailure();
        },
        onError: (error) => {
          console.warn("Ritual PayPal checkout failed.", error);
          container.hidden = true;
          container.innerHTML = "";
          button.hidden = false;
          button.disabled = false;
          document.querySelector("#ritualPaymentDialog").close();
          openRitualPaymentFailure();
        },
      });
      if (!buttons.isEligible()) throw new Error("PayPal checkout is unavailable for this ritual.");
      container.hidden = false;
      await buttons.render(container);
      await waitForRenderedPayPalButton(container, "The ritual PayPal button");
      setRitualButtonLoading(button, false);
      button.hidden = true;
      status.hidden = true;
      closeButton.disabled = false;
      return;
    }
    if (!window.SowYourSeedCheckout?.callEdge) throw new Error("Checkout is still loading. Please try again.");
    const donorAccessToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
    window.sessionStorage.setItem("sow-your-seed-dodo-donor-token", donorAccessToken);
    const payload = await window.SowYourSeedCheckout.callEdge("create-dodo-checkout", {
      body: { ritualTier, name, email: emailInput.value.trim(), message: ritualForInput.value, donorAccessToken },
    });
    if (!payload.checkoutUrl) throw new Error("Dodo did not return a secure checkout link.");
    window.sessionStorage.setItem("sow-your-seed-dodo-product", "ritual");
    window.location.assign(payload.checkoutUrl);
  } catch (error) {
    window.sessionStorage.removeItem("sow-your-seed-dodo-donor-token");
    window.sessionStorage.removeItem("sow-your-seed-dodo-product");
    console.warn("Ritual checkout could not start.", error);
    setRitualButtonLoading(button, false);
    closeButton.disabled = false;
    document.querySelector("#ritualPaymentDialog").close();
    openRitualPaymentFailure();
  }
});
elements.weeklySeedToggle.addEventListener("change", () => {
  elements.amountError.textContent = "";
  elements.nameError.textContent = "";
});
elements.paypalContinueButton.addEventListener("click", continueWithPayPal);
elements.closePaypalPaymentDialog.addEventListener("click", closeInlinePayPalCheckout);
elements.paypalPaymentDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeInlinePayPalCheckout();
});
elements.shareSupportButton?.addEventListener("click", async () => {
  const shareData = {
    title: "Sow Your Seed Here",
    text: "Buy a Seed to Sow for the Love You’ve Been Waiting For 💓💕",
    url: window.location.href,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await navigator.clipboard.writeText(shareData.url);
    showToast("Support page link copied.");
  } catch (error) {
    if (error?.name !== "AbortError") showToast("The support page link could not be shared.");
  }
});
[elements.alternateCardCheckoutLink, elements.dodoAlternateCardCheckoutLink].forEach((link) => {
  link?.addEventListener("click", (event) => {
    event.preventDefault();
    if (!state.settings.dodoCheckoutVisible || !state.settings.alternateCardCheckoutVisible || link !== elements.dodoAlternateCardCheckoutLink) return;
    if (link === elements.dodoAlternateCardCheckoutLink &&
        !document.querySelector("#dodoCustomerEmail")?.reportValidity()) return;
    const dodoNameInput = document.querySelector("#dodoCustomerName");
    dodoNameInput.value = dodoNameInput.value.trim();
    if (!dodoNameInput.reportValidity()) return;
    const cardButton = link.closest(".card-choice");
    if (cardButton?.classList.contains("is-disabled")) return;

    cardButton?.classList.add("is-disabled");
    link.setAttribute("aria-disabled", "true");
    link.setAttribute("tabindex", "-1");
    link.blur();
    openAlternateCheckout(link);
  });
});
elements.paymentEmailInput?.addEventListener("input", () => {
  if (elements.emailError && isValidEmailAddress(elements.paymentEmailInput.value)) {
    elements.emailError.textContent = "";
  }
});
elements.nameInput?.addEventListener("input", () => {
  if (elements.nameError && elements.nameInput.value.trim()) elements.nameError.textContent = "";
});

elements.adminMenuButton.addEventListener("click", openAdminLogin);
elements.transactionBoardList?.addEventListener("scroll", () => {
  const list = elements.transactionBoardList;
  if (list.scrollTop + list.clientHeight >= list.scrollHeight - 40) {
    void loadTransactionBoard();
  }
});
elements.standardCalendarPrev.addEventListener("click", () => {
  standardCalendarCursor = new Date(standardCalendarCursor.getFullYear(), standardCalendarCursor.getMonth() - 1, 1);
  selectedStandardDate = toDateKey(standardCalendarCursor);
  standardTransactions = [];
  renderStandardCalendar();
  loadStandardTransactions();
});
elements.standardCalendarNext.addEventListener("click", () => {
  standardCalendarCursor = new Date(standardCalendarCursor.getFullYear(), standardCalendarCursor.getMonth() + 1, 1);
  selectedStandardDate = toDateKey(standardCalendarCursor);
  standardTransactions = [];
  renderStandardCalendar();
  loadStandardTransactions();
});
elements.standardCalendarGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-standard-calendar-date]");
  if (!button) return;
  selectedStandardDate = button.dataset.standardCalendarDate;
  renderStandardCalendar();
});
elements.adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isBackendConfigured()) {
    const email = elements.adminEmailInput.value.trim();
    const password = elements.adminPasswordInput.value;

    if (!email || !password) {
      elements.adminPasswordError.textContent = "Enter your email and password.";
      return;
    }

    try {
      await signInAdmin(email, password);
      await loadAdminProfile();
      closeAdminLogin();
      if (state.adminProfile?.role === "standard") {
        openStandardPanel();
        await loadStandardTransactions();
      } else {
        openAdminPanel();
        await Promise.all([
          loadAdminDonations({ announce: true }),
          loadAdminAnalytics({ announce: true }),
        ]);
      }
    } catch (error) {
      elements.adminPasswordError.textContent = error.message || "Could not sign in.";
      elements.adminPasswordInput.select();
    }

    return;
  }

  if (elements.adminPasswordInput.value !== DEMO_ADMIN_PASSWORD) {
    elements.adminPasswordError.textContent = "Incorrect password.";
    elements.adminPasswordInput.select();
    return;
  }

  closeAdminLogin();
  openAdminPanel();
});
elements.cancelAdminLoginButton.addEventListener("click", closeAdminLogin);
elements.adminLoginDialog.addEventListener("close", () => {
  elements.adminLoginDialog.classList.remove("is-open");
  elements.adminPasswordError.textContent = "";
});
elements.closeAdminButton.addEventListener("click", closeAdminPanel);
elements.closeStandardButton.addEventListener("click", closeAdminPanel);
elements.adminBackdrop.addEventListener("click", closeAdminPanel);
elements.saveCheckoutDisplayButton?.addEventListener("click", async () => {
  const paypalSelected = document.querySelector("#paypalCheckoutVisible")?.checked === true;
  const nextSettings = normalizeSettings({
    ...state.settings,
    dodoCheckoutVisible: !paypalSelected,
    paypalCheckoutVisible: paypalSelected,
    alternateCardCheckoutVisible: Boolean(
      document.querySelector("#alternateCardCheckoutVisible")?.checked ?? state.settings.alternateCardCheckoutVisible,
    ),
  });

  await runAdminAction(
    {
      button: elements.saveCheckoutDisplayButton,
      busyText: "Saving...",
      loadingMessage: "Saving checkout display settings...",
      successMessage: () => "Checkout display settings saved.",
      errorMessage: "Could not save checkout display settings.",
    },
    async () => {
      if (isBackendConfigured() && getAdminAccessToken()) {
        const payload = await callEdge("admin-settings", {
          admin: true,
          body: { settings: nextSettings },
          method: "PUT",
        });
        if (payload.settings?.dodoCheckoutVisible !== nextSettings.dodoCheckoutVisible ||
            payload.settings?.paypalCheckoutVisible !== nextSettings.paypalCheckoutVisible ||
            payload.settings?.alternateCardCheckoutVisible !== nextSettings.alternateCardCheckoutVisible) {
          throw new Error("The server did not save all checkout switches. Update the admin-settings function.");
        }
        state.settings = normalizeSettings(payload.settings || nextSettings);
        await loadBackendData({ throwOnError: true });
        if (state.settings.dodoCheckoutVisible !== nextSettings.dodoCheckoutVisible ||
            state.settings.paypalCheckoutVisible !== nextSettings.paypalCheckoutVisible ||
            state.settings.alternateCardCheckoutVisible !== nextSettings.alternateCardCheckoutVisible) {
          throw new Error("The checkout switches did not persist after reloading settings.");
        }
      } else {
        state.settings = nextSettings;
        saveState();
      }

      renderApp();
    },
  );
});
elements.adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nextSettings = getAdminSettings();
  const changedCount = getSettingsChangeCount(state.settings, nextSettings);
  const successMessage = changedCount
    ? `Saved ${changedCount} goal setting${changedCount === 1 ? "" : "s"}.`
    : "No goal setting changes found.";

  await runAdminAction(
    {
      button: elements.saveAdminButton,
      busyText: "Saving...",
      loadingMessage: "Saving site settings...",
      successMessage,
      errorMessage: "Could not save site settings.",
    },
    async () => {
      if (isBackendConfigured() && getAdminAccessToken()) {
        const payload = await callEdge("admin-settings", {
          admin: true,
          body: { settings: nextSettings },
          method: "PUT",
        });
        state.settings = normalizeSettings(payload.settings || nextSettings);
        await loadBackendData();
      } else {
        state.settings = nextSettings;
        saveState();
      }

      setAmount(state.settings.seedPrice);
      renderApp();
    },
  );
});

elements.closeReceiptButton.addEventListener("click", closeReceipt);
elements.doneButton.addEventListener("click", closeReceipt);
elements.receiptDialog.addEventListener("close", () => {
  document.body.classList.remove("receipt-open");
});
elements.closePaymentFailureButton?.addEventListener("click", () => closePaymentFailure());
elements.retryPaymentButton?.addEventListener("click", (event) => {
  event.preventDefault();
  closePaymentFailure(true);
});
elements.paymentFailureDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closePaymentFailure();
});
elements.paymentFailureDialog?.addEventListener("click", (event) => {
  if (event.target === elements.paymentFailureDialog) closePaymentFailure();
});
elements.paymentFailureDialog?.addEventListener("close", () => {
  document.body.classList.remove("payment-failure-open");
});
document.querySelector("#closeRitualFailureButton")?.addEventListener("click", () => closeRitualPaymentFailure());
document.querySelector("#retryRitualButton")?.addEventListener("click", (event) => {
  event.preventDefault();
  closeRitualPaymentFailure(true);
});
elements.ritualFailureDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeRitualPaymentFailure();
});
elements.ritualFailureDialog?.addEventListener("click", (event) => {
  if (event.target === elements.ritualFailureDialog) closeRitualPaymentFailure();
});
elements.ritualFailureDialog?.addEventListener("close", () => {
  document.body.classList.remove("payment-failure-open");
});
elements.closeAlternateCheckoutButton?.addEventListener("click", closeAlternateCheckout);
elements.alternateCheckoutDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeAlternateCheckout();
});
elements.alternateCheckoutDialog?.addEventListener("click", (event) => {
  if (event.target === elements.alternateCheckoutDialog) closeAlternateCheckout();
});
elements.alternateCheckoutDialog?.addEventListener("close", () => {
  document.body.classList.remove("alternate-checkout-open");
  if (elements.alternateCheckoutFrame) elements.alternateCheckoutFrame.src = "about:blank";
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("admin-open") &&
      !elements.paypalPaymentDialog.open && !elements.alternateCheckoutDialog?.open) {
    closeAdminPanel();
  }
});

window.addEventListener("hashchange", () => {
  if (window.location.hash === "#admin") return;
  setActiveView(getViewIdFromHash());
});

window.SowYourSeedCheckout = Object.freeze({
  callEdge,
  finishDodoPayment,
  openPaymentFailure,
  openRitualPaymentFailure,
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp, { once: true });
} else {
  initializeApp();
}
