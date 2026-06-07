import { Router } from "express";
import { z } from "zod";

import { sendError } from "../lib/http.js";
import {
  getAmazon2023Facets,
  getAmazon2023ProductDetail,
  getAmazon2023ProductDetails,
  searchAmazon2023Products,
  type Amazon2023ProductFilters,
  type Amazon2023Locale,
} from "../repositories/amazon2023.js";

const MAX_AI_ITEMS = 36;
const MAX_COMPARE_ITEMS = 4;
const MIN_STRUCTURED_RESULT_TARGET = 24;

const queryBodySchema = z.object({
  queryId: z.string().optional(),
  query: z.string().trim().min(1),
  criteriaOverrides: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
      }),
    )
    .optional()
    .default([]),
  visibleContext: z.record(z.unknown()).optional().default({}),
  session: z
    .object({
      sessionId: z.string().optional().nullable(),
      participantId: z.string().optional().nullable(),
      locale: z.enum(["en", "ko"]).optional().nullable(),
    })
    .optional()
    .default({}),
});

const compareBodySchema = z.object({
  queryId: z.string().min(1),
  selectedProductIds: z.array(z.string().min(1)).min(2).max(MAX_COMPARE_ITEMS),
  activeDimensions: z.array(z.string()).default([]),
  locale: z.enum(["en", "ko"]).optional(),
});

const stressWeightsSchema = z
  .object({
    price: z.number().min(0).max(1).optional(),
    rating: z.number().min(0).max(1).optional(),
    reviewConfidence: z.number().min(0).max(1).optional(),
    material: z.number().min(0).max(1).optional(),
    comfort: z.number().min(0).max(1).optional(),
    durability: z.number().min(0).max(1).optional(),
    careEase: z.number().min(0).max(1).optional(),
  })
  .partial()
  .default({});

const stressTestBodySchema = z.object({
  queryId: z.string().min(1),
  selectedProductIds: z.array(z.string().min(1)).max(MAX_COMPARE_ITEMS).default([]),
  weights: stressWeightsSchema,
  locale: z.enum(["en", "ko"]).optional(),
});

const refineBodySchema = z.object({
  queryId: z.string().min(1),
  command: z.string().trim().min(1),
  currentSelectedProductIds: z.array(z.string()).default([]),
  activeDimensions: z.array(z.string()).default([]),
  criteriaOverrides: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
      }),
    )
    .optional()
    .default([]),
  locale: z.enum(["en", "ko"]).optional(),
});

type ParsedCriterion = {
  key: string;
  label: string;
  value: string | number | boolean | null;
  displayValue: string;
  status: "applied" | "ambiguous" | "open";
  source: string;
};

type ComparisonDimension = {
  key: string;
  label: string;
  source: string;
  dataType: string;
  active: boolean;
  hasEvidence: boolean;
};

type QueryContext = {
  query: string;
  locale: Amazon2023Locale;
  filters: Amazon2023ProductFilters;
  criteriaFilters?: Amazon2023ProductFilters;
  lensSource?: LensInterpretation["source"];
  dimensions: ComparisonDimension[];
  parsedCriteria: ParsedCriterion[];
  itemIds: string[];
  createdAt: number;
};

type ProductDetailResponse = NonNullable<NonNullable<Awaited<ReturnType<typeof getAmazon2023ProductDetail>>>["product"]>;
type CriteriaOverride = { key: string; value: string | number | boolean | null };
type ClarificationOption = {
  value: string | number | boolean | null;
  label: string;
  criteriaOverrides: CriteriaOverride[];
  estimatedCount: number;
};
type Clarification = {
  key: string;
  label: string;
  question: string;
  selectedValue: string | number | boolean | null;
  options: ClarificationOption[];
};
type LlmCriterionHint = {
  key: string;
  label?: string;
  value: string | number | boolean | null;
  displayValue?: string;
  status: ParsedCriterion["status"];
  source?: string;
};
type LlmClarificationHint = {
  key: string;
  label?: string;
  question?: string;
  selectedValue?: string | number | boolean | null;
  options: Array<{
    value: string | number | boolean | null;
    label?: string;
    criteriaOverrides?: CriteriaOverride[];
  }>;
};
type FilterCorrection = {
  key: string;
  from: unknown;
  to: unknown;
  reason: string;
};
type LensInterpretation = {
  filters: Amazon2023ProductFilters;
  criteriaHints: LlmCriterionHint[];
  clarificationHints: LlmClarificationHint[];
  source: "gemini" | "rule";
  rawFilters?: Record<string, unknown>;
  corrections?: FilterCorrection[];
  error?: string;
};
type ProductSearchItem = NonNullable<Awaited<ReturnType<typeof searchAmazon2023Products>>>["items"][number];

export const amazon2023AiRouter = Router();

const queryContexts = new Map<string, QueryContext>();

const KOREAN_QUERY_ALIASES: Record<string, string> = {
  가벼운: "lightweight",
  가볍: "lightweight",
  가방: "bag",
  가죽: "leather",
  겨울: "winter",
  경량: "lightweight",
  구두: "dress shoes footwear shoes",
  검정: "black",
  검정색: "black",
  깔끔: "minimal clean",
  남성: "men male",
  남성용: "men male",
  남자: "men male",
  노트북: "laptop",
  니트: "knit",
  데님: "denim jeans",
  데일리: "daily casual",
  일상: "daily casual everyday",
  일상용: "daily casual everyday",
  드레스: "dress",
  더플: "duffel bag",
  더플백: "duffel bag",
  따뜻: "warm",
  면접: "interview office formal",
  면접용: "interview office formal",
  로퍼: "loafer shoes",
  리넨: "linen",
  린넨: "linen",
  면: "cotton",
  모자: "hat accessories",
  바지: "pants",
  바람막이: "windbreaker jacket",
  반팔: "short sleeve",
  반팔셔츠: "short sleeve shirt",
  반바지: "shorts",
  바캉스: "vacation resort beach summer travel",
  방수: "waterproof",
  백팩: "backpack",
  베이지: "beige",
  벨트: "belt accessories",
  부츠: "boots",
  블랙: "black",
  블라우스: "blouse tops",
  비: "rain waterproof",
  샌들: "sandals shoes",
  선글라스: "sunglasses accessories",
  셔츠: "shirt",
  손목시계: "watch watches wristwatch",
  수납: "storage pockets capacity",
  숄더백: "shoulder bag",
  스니커즈: "sneakers",
  스웨터: "sweater tops",
  스웨트셔츠: "sweatshirt tops",
  스웻셔츠: "sweatshirt tops",
  스카프: "scarf accessories",
  스커트: "skirt bottoms",
  슬랙스: "slacks pants",
  신발: "shoes",
  시계: "watch watches wristwatch",
  상의: "top tops shirt tee",
  아우터: "outerwear",
  여성: "women female",
  여성용: "women female",
  여자: "women female",
  여름: "summer breathable",
  오피스: "office",
  운동화: "sneakers shoes",
  울: "wool",
  원피스: "dress",
  자켓: "jacket",
  장갑: "gloves accessories",
  재킷: "jacket",
  파티: "party event evening",
  파티용: "party event evening",
  캐주얼: "casual daily everyday",
  캐쥬얼: "casual daily everyday",
  예쁜: "pretty beautiful",
  예쁘: "pretty beautiful",
  조끼: "vest outerwear",
  주머니: "pockets storage",
  지갑: "wallet accessories",
  청바지: "jeans",
  출근용: "commute office",
  출퇴근: "commute office",
  출퇴근용: "commute office",
  출근: "commute office",
  통근: "commute office",
  코트: "coat",
  크로스백: "crossbody bag",
  토트백: "tote bag",
  통기: "breathable",
  티셔츠: "tee shirt tops",
  튼튼: "durable",
  패딩: "puffer jacket outerwear",
  편한: "comfortable",
  편안: "comfortable",
  피서: "vacation resort beach summer travel",
  피서용: "vacation resort beach summer travel",
  플랫: "flats shoes",
  플랫슈즈: "flats shoes",
  긴팔: "long sleeve",
  민소매: "sleeveless",
  하객룩: "occasion dress",
  휴가: "vacation resort beach summer travel",
  후드: "hoodie tops",
  후드티: "hoodie tops",
};

const CATEGORY_ALIASES: Record<string, string> = {
  accessory: "Accessories",
  accessories: "Accessories",
  bag: "Bags",
  bags: "Bags",
  backpack: "Backpacks",
  backpacks: "Backpacks",
  belt: "Belts",
  belts: "Belts",
  blouse: "Tops",
  blouses: "Tops",
  boot: "Shoes",
  boots: "Shoes",
  bottom: "Bottoms",
  bottoms: "Bottoms",
  coat: "Coats",
  coats: "Coats",
  crossbody: "Bags",
  dress: "Dresses",
  dresses: "Dresses",
  duffel: "Bags",
  flat: "Shoes",
  flats: "Shoes",
  footwear: "Shoes",
  glove: "Accessories",
  gloves: "Accessories",
  handbag: "Bags",
  handbags: "Bags",
  hat: "Accessories",
  hats: "Accessories",
  heel: "Shoes",
  heels: "Shoes",
  hoodie: "Tops",
  hoodies: "Tops",
  jacket: "Jackets",
  jackets: "Jackets",
  jewelry: "Jewelry",
  loafer: "Shoes",
  loafers: "Shoes",
  oxford: "Shoes",
  oxfords: "Shoes",
  pants: "Pants",
  pump: "Shoes",
  pumps: "Shoes",
  scarf: "Accessories",
  scarves: "Accessories",
  sandal: "Sandals",
  sandals: "Sandals",
  shirt: "Shirts",
  shirts: "Shirts",
  shorts: "Clothing",
  skirt: "Clothing",
  skirts: "Clothing",
  shoe: "Shoes",
  shoes: "Shoes",
  sneaker: "Sneakers",
  sneakers: "Sneakers",
  sweater: "Tops",
  sweaters: "Tops",
  sweatshirt: "Tops",
  sweatshirts: "Tops",
  tee: "Tops",
  tees: "Tops",
  top: "Tops",
  tops: "Tops",
  tote: "Bags",
  trouser: "Pants",
  trousers: "Pants",
  vest: "Jackets",
  wallet: "Accessories",
  wallets: "Accessories",
  watch: "Watches",
  watches: "Watches",
};

function createQueryId() {
  return `amazon2023_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readLocale(value: unknown): Amazon2023Locale {
  return value === "ko" ? "ko" : "en";
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function queryIncludesAlias(query: string, term: string) {
  if (term.length > 1) {
    return query.includes(term);
  }
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`, "u").test(query);
}

function expandKoreanQueryTerms(query: string) {
  let expanded = query;
  for (const [term, replacement] of Object.entries(KOREAN_QUERY_ALIASES)) {
    if (queryIncludesAlias(query, term)) {
      expanded += ` ${replacement}`;
    }
  }
  return expanded;
}

function parsePriceLimit(query: string) {
  const normalized = query.replace(/,/g, "");
  const krwMatch = normalized.match(/(\d+(?:\.\d+)?)\s*만원대/);
  if (krwMatch) {
    const krw = Number(krwMatch[1]);
    if (Number.isFinite(krw)) {
      return Math.ceil((krw * 10_000) / 1300 / 10) * 10 + 20;
    }
  }
  const patterns = [
    /\$?\s*(\d+(?:\.\d+)?)\s*(?:달러|불|dollars?|usd)?\s*(?:이하|이내|안쪽|아래|밑(?:으로)?|under|below|less than|or less)/i,
    /(\d+(?:\.\d+)?)\s*\$\s*(?:이하|이내|안쪽|아래|밑(?:으로)?|under|below|less than|or less)/i,
    /(\d+(?:\.\d+)?)\s*(?:달러|불|dollars?|usd)\s*(?:넘지|넘으면\s*안|초과하지)/i,
    /(?:not|no)\s+(?:over|above|more than)\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:달러|불|dollars?|usd)?/i,
    /(?:under|below|less than)\s*\$?\s*(\d+(?:\.\d+)?)/i,
    /(?:이하|이내|안쪽|아래|밑(?:으로)?|보다\s*싼|미만|넘지).*?(\d+(?:\.\d+)?)\s*(?:달러|불|usd)?/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  if (/(affordable|cheap|budget|not too expensive|not expensive|저렴|가성비|비싸지|싼)/i.test(query)) {
    return 150;
  }
  return undefined;
}

function parseRatingMin(query: string) {
  const normalized = normalizeText(query);
  if (/(highly rated|good reviews|best rated|평점|리뷰 좋은|후기 좋은)/i.test(query)) {
    return 4;
  }
  const match = normalized.match(/(?:rating|rated)\s*(?:over|above|at least)?\s*(\d(?:\.\d)?)/i);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed <= 5) {
      return parsed;
    }
  }
  return undefined;
}

function parseCategory(query: string) {
  const normalized = normalizeText(expandKoreanQueryTerms(query));
  for (const [alias, category] of Object.entries(CATEGORY_ALIASES)) {
    if (normalized.split(" ").includes(alias)) {
      return category;
    }
  }
  return undefined;
}

function parseProductType(query: string) {
  const text = normalizeText(`${query} ${expandKoreanQueryTerms(query)}`);
  const rules: Array<[string, RegExp]> = [
    ["Backpacks", /\b(backpacks?|daypacks?)\b|백팩/i],
    ["Crossbody Bags", /\bcrossbody\b|크로스백/i],
    ["Totes", /\b(totes?|shoppers?)\b|토트백?/i],
    ["Coats", /\b(coats?|parkas?|overcoats?)\b|코트/i],
    ["Rain Jackets", /\b(raincoats?|rain jackets?)\b|레인\s*자켓|방수\s*자켓/i],
    ["Windbreakers", /\bwindbreakers?\b|바람막이/i],
    ["Jackets", /\b(jackets?|blazers?)\b|자켓|재킷/i],
    ["Boots", /\bboots?\b|부츠/i],
    ["Sneakers", /\b(sneakers?|trainers?|running shoes?|athletic shoes?)\b|스니커즈|운동화/i],
    ["Sandals", /\bsandals?\b|샌들/i],
    ["Loafers", /\bloafers?\b|로퍼/i],
    ["Heels", /\b(heels?|pumps?)\b|힐|펌프스/i],
    ["Flats", /\bflats?\b|플랫슈즈?|플랫/i],
    ["Oxfords", /\boxfords?\b|옥스퍼드/i],
    ["Shirt Dresses", /\bshirt dresses?\b|셔츠\s*원피스/i],
    ["Blouses", /\bblouses?\b|블라우스/i],
    ["Tees", /\b(t[- ]?shirts?|tees?)\b|티셔츠|반팔티/i],
    ["Shirts", /\b(button[- ]?downs?|shirts?)\b|셔츠/i],
    ["Sweaters", /\b(sweaters?|cardigans?)\b|스웨터|니트/i],
    ["Hoodies", /\bhoodies?\b|후드티?|후드/i],
    ["Pants", /\b(pants|trousers|slacks|leggings)\b|바지|팬츠|슬랙스/i],
    ["Jeans", /\bjeans\b|청바지|데님/i],
    ["Shorts", /\bshorts\b|반바지/i],
    ["Skirts", /\bskirts?\b|스커트/i],
    ["Dresses", /\bdresses?\b|드레스|원피스/i],
    ["Watches", /\b(watches?|wristwatches?|timepieces?|chronographs?)\b|시계|손목시계/i],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0];
}

function hasIntent(query: string, pattern: RegExp) {
  return pattern.test(`${query} ${expandKoreanQueryTerms(query)}`);
}

function parseGenderTarget(query: string) {
  const text = normalizeText(`${query} ${expandKoreanQueryTerms(query)}`);
  if (/\b(girls?|girl's)\b|여아|여자아이/i.test(text)) return "girls";
  if (/\b(boys?|boy's)\b|남아|남자아이/i.test(text)) return "boys";
  if (/\b(baby|infant|toddler)\b|아기|유아/i.test(text)) return "baby";
  if (/\b(women|woman|women's|female|ladies)\b|여성|여자/i.test(text)) return "women";
  if (/\b(men|men's|mens|male)\b|남성|남자/i.test(text)) return "men";
  if (/\b(unisex)\b|공용/i.test(text)) return "unisex";
  return undefined;
}

function parseSeason(query: string) {
  if (hasIntent(query, /겨울|winter|snow|cold|insulated|따뜻|warm/i)) return "winter";
  if (hasIntent(query, /여름|summer|hot|breathable|linen|sandal|피서|휴가|바캉스|리조트|해변|beach|resort|vacation/i)) return "summer";
  if (hasIntent(query, /사계절|all season|all-season/i)) return "all_season";
  return undefined;
}

function parseMaterial(query: string) {
  const text = normalizeText(`${query} ${expandKoreanQueryTerms(query)}`);
  const materials: Array<[string, RegExp]> = [
    ["cotton", /\b(cotton|면)\b/i],
    ["wool", /\b(wool|울|cashmere|merino)\b/i],
    ["leather", /\b(leather|가죽|suede)\b/i],
    ["polyester", /\b(polyester)\b/i],
    ["nylon", /\b(nylon)\b/i],
    ["denim", /\b(denim|jeans|데님|청바지)\b/i],
    ["fleece", /\b(fleece|플리스)\b/i],
    ["linen", /\b(linen|리넨|린넨)\b/i],
  ];
  return materials.find(([, pattern]) => pattern.test(text))?.[0];
}

function parseClearOccasion(query: string) {
  const text = normalizeText(`${query} ${expandKoreanQueryTerms(query)}`);
  if (/\b(school|student|campus)\b|통학|학교/i.test(text)) return "school";
  if (/\b(travel|airport|trip|weekend|vacation|resort|beach)\b|여행|피서|휴가|바캉스|리조트|해변/i.test(text)) return "travel";
  if (/\b(interview)\b|면접/i.test(text)) return "office";
  if (/\b(outdoor|hiking|trail|camping)\b|야외|등산/i.test(text)) return "outdoor";
  if (/\b(wedding|formal|ceremony)\b|하객|결혼식|격식/i.test(text)) return "formal";
  if (/\b(office|work|business)\b|오피스|업무|회사|직장/i.test(text)) return "office";
  if (/\b(commute|commuting)\b|출근|통근|출퇴근/i.test(text)) return "commute";
  if (/\b(daily|everyday|casual)\b|데일리|일상/i.test(text)) return "daily";
  return undefined;
}

function parseStyle(query: string) {
  const text = normalizeText(`${query} ${expandKoreanQueryTerms(query)}`);
  if (/\b(sporty|athletic|running|active)\b|운동|스포티/i.test(text)) return "sporty";
  if (/\b(formal|dressy|business)\b|포멀|격식|면접/i.test(text)) return "formal";
  if (/\b(outdoor|hiking|trail)\b|아웃도어|야외/i.test(text)) return "outdoor";
  if (/\b(cute|lovely)\b|귀여|러블리/i.test(text)) return "cute";
  if (/\b(minimal|clean|simple|classic)\b|깔끔|미니멀|클래식/i.test(text)) return "classic";
  if (/\b(casual|daily|everyday)\b|캐주얼|데일리|일상/i.test(text)) return "casual";
  return undefined;
}

function parseSleeveLength(query: string) {
  if (hasIntent(query, /반팔|short\s*sleeve|short-sleeve/i)) return "short_sleeve";
  if (hasIntent(query, /긴팔|long\s*sleeve|long-sleeve/i)) return "long_sleeve";
  if (hasIntent(query, /민소매|sleeveless|tank\s*top/i)) return "sleeveless";
  return undefined;
}

function hasAmbiguousStyleIntent(query: string) {
  return hasIntent(query, /예쁜|예쁘|pretty|beautiful|stylish|nice looking/i);
}

function hasPartyIntent(query: string) {
  return hasIntent(query, /파티|파티용|party|evening|event/i);
}

function hasPartyResolution(query: string) {
  return hasIntent(query, /캐주얼|casual|격식|formal|포멀|단정|classic|깔끔|minimal|화려|statement|dressy/i);
}

function hasVacationIntent(query: string) {
  return hasIntent(query, /피서|피서용|휴가|바캉스|리조트|해변|vacation|resort|beach/i);
}

function hasInterviewIntent(query: string) {
  return hasIntent(query, /면접|면접용|interview/i);
}

function hasCoatIntent(query: string) {
  return hasIntent(query, /코트|coat|overcoat|parka/i);
}

function hasStyleOverride(overrides: CriteriaOverride[] = []) {
  return overrides.some((override) => override.key === "style" && override.value !== null && override.value !== undefined && String(override.value).trim() !== "");
}

function hasPartyOverride(overrides: CriteriaOverride[] = []) {
  return overrides.some((override) => ["partyIntent", "style", "occasion"].includes(override.key) && override.value !== null && override.value !== undefined && String(override.value).trim() !== "");
}

function shouldKeepStyleAmbiguous(query: string, overrides: CriteriaOverride[] = []) {
  return hasAmbiguousStyleIntent(query) && !hasStyleOverride(overrides);
}

function shouldKeepPartyAmbiguous(query: string, overrides: CriteriaOverride[] = []) {
  return hasPartyIntent(query) && !hasPartyResolution(query) && !hasPartyOverride(overrides);
}

const llmValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const llmOverrideSchema = z.object({
  key: z.string().min(1),
  value: llmValueSchema,
});
const llmInterpretationSchema = z.object({
  searchText: z.string().trim().optional().nullable(),
  filters: z
    .object({
      category: z.string().optional().nullable(),
      subCategory: z.string().optional().nullable(),
      productType: z.string().optional().nullable(),
      priceMax: z.number().optional().nullable(),
      ratingMin: z.number().optional().nullable(),
      brand: z.string().optional().nullable(),
      genderTarget: z.enum(["men", "women", "boys", "girls", "unisex", "baby"]).optional().nullable(),
      occasion: z.enum(["commute", "school", "daily", "office", "travel", "outdoor", "formal"]).optional().nullable(),
      season: z.enum(["winter", "summer", "all_season"]).optional().nullable(),
      material: z.string().optional().nullable(),
      style: z.enum(["casual", "classic", "sporty", "minimal", "formal", "cute", "outdoor"]).optional().nullable(),
      sleeveLength: z.enum(["short_sleeve", "long_sleeve", "sleeveless"]).optional().nullable(),
      warmthLevelMin: z.number().optional().nullable(),
      comfortLevelMin: z.number().optional().nullable(),
      durabilityLevelMin: z.number().optional().nullable(),
      careEaseLevelMin: z.number().optional().nullable(),
      waterproof: z.boolean().optional().nullable(),
      semanticConfidenceMin: z.number().optional().nullable(),
    })
    .partial()
    .optional()
    .default({}),
  parsedCriteria: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().optional(),
        value: llmValueSchema,
        displayValue: z.string().optional(),
        status: z.enum(["applied", "ambiguous", "open"]),
      }),
    )
    .optional()
    .default([]),
  clarifications: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().optional(),
        question: z.string().optional(),
        selectedValue: llmValueSchema.optional(),
        options: z.array(
          z.object({
            value: llmValueSchema,
            label: z.string().optional(),
            criteriaOverrides: z.array(llmOverrideSchema).optional(),
          }),
        ),
      }),
    )
    .optional()
    .default([]),
});

function geminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || process.env.gemini_key;
}

function llmEnabled() {
  return process.env.AI_AMAZON2023_LLM !== "off" && Boolean(geminiApiKey());
}

function stripJsonFence(value: string) {
  return value.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

function parseGeminiText(value: string) {
  const parsed = JSON.parse(stripJsonFence(value));
  return llmInterpretationSchema.parse(parsed);
}

function buildGeminiPrompt(query: string) {
  return [
    "Interpret this Amazon Fashion natural-language search into executable criteria.",
    "",
    "Return strict JSON with this shape:",
    "{",
    '  "searchText": "English product search text preserving concrete product modifiers",',
    '  "filters": { "category": "...", "season": "...", "sleeveLength": "...", "style": "...", "...": "..." },',
    '  "parsedCriteria": [{ "key": "...", "label": "...", "value": "...", "status": "applied|ambiguous|open" }],',
    '  "clarifications": [{ "key": "...", "question": "...", "options": [{ "value": "...", "label": "...", "criteriaOverrides": [{ "key": "...", "value": "..." }] }] }]',
    "}",
    "",
    "Allowed filters:",
    "category: Accessories, Bags, Backpacks, Belts, Boots, Coats, Dresses, Jackets, Pants, Sandals, Shirts, Shoes, Sneakers, Tops, Watches",
    "subCategory/product type: Backpacks, Boots, Coats, Jackets, Loafers, Heels, Flats, Oxfords, Sandals, Shirts, Tees, Sneakers, Blouses, Dresses, Pants, Watches",
    "genderTarget: men, women, boys, girls, unisex, baby",
    "occasion: commute, school, daily, office, travel, outdoor, formal",
    "season: winter, summer, all_season",
    "material: cotton, wool, leather, polyester, nylon, denim, fleece, linen, synthetic",
    "style: casual, classic, sporty, minimal, formal, cute, outdoor",
    "sleeveLength: short_sleeve, long_sleeve, sleeveless",
    "numeric filters: warmthLevelMin, comfortLevelMin, durabilityLevelMin, careEaseLevelMin, semanticConfidenceMin",
    "boolean filter: waterproof",
    "",
    "Rules:",
    "- Korean and English are both allowed.",
    "- Translate Korean product terms into English searchText.",
    "- Preserve concrete product modifiers. Example: 반팔 셔츠 must become short sleeve shirt, not only shirt.",
    "- Use filters for clear criteria. Example: 여름 => season summer, 반팔 => sleeveLength short_sleeve.",
    "- Use subCategory for concrete product types. Example: 코트/coat => subCategory Coats; 부츠/boots => category Shoes and subCategory Boots; 시계/watch => category Watches and subCategory Watches.",
    "- Do not broaden coat to jackets. Jacket expansion must be represented as a clarification/relaxation option, not applied silently.",
    "- 피서용/vacation/resort/beach means summer + travel/resort use. Do not add winter, warmth, or insulated filters for it.",
    "- 파티용/party/evening is ambiguous. Do not force it to formal unless the query explicitly says formal/격식. Add partyIntent clarification options instead.",
    "- 면접용/interview means office/formal intent for shoes or clothing.",
    "- Do not force subjective words like 예쁜/pretty/beautiful/stylish into one style.",
    "- For subjective words, add an ambiguous parsed criterion and clarification options with criteriaOverrides.",
    "- For 예쁜, prefer styleIntent options: cute/playful => style cute, classic/polished => style classic, minimal/clean => style minimal, casual/everyday => style casual.",
    "- Do not invent filters outside the allowed list.",
    "",
    `User query: ${query}`,
  ].join("\n");
}

async function callGeminiInterpretation(query: string) {
  if (!llmEnabled()) return null;
  const key = geminiApiKey();
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.AI_AMAZON2023_LLM_TIMEOUT_MS ?? 4500));
  const models = [...new Set([process.env.GEMINI_MODEL, "gemini-3.1-flash-lite", "gemini-2.5-flash-lite"].filter(Boolean))] as string[];
  try {
    for (const model of models) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "You are an e-commerce query planner. Return only valid JSON. Never include markdown." }],
          },
          contents: [{ role: "user", parts: [{ text: buildGeminiPrompt(query) }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
          },
        }),
      }).catch(() => null);
      if (!response?.ok) {
        console.warn("[amazon2023-ai] Gemini interpretation unavailable", {
          model,
          status: response?.status ?? "fetch_error",
          statusText: response?.statusText ?? "request_failed",
        });
        continue;
      }
      const json = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();
      if (text) return parseGeminiText(text);
    }
  } finally {
    clearTimeout(timer);
  }
  return null;
}

function numericOverrideValue(value: string | number | boolean | null) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stringOverrideValue(value: string | number | boolean | null) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function priceRangeOverrideValue(value: string | number | boolean | null) {
  const raw = String(value ?? "").trim().toLowerCase();
  const numbers = raw.match(/\d+(?:\.\d+)?/g)?.map((item) => Number(item)).filter(Number.isFinite) ?? [];
  if (!raw || !numbers.length) return null;
  if (numbers.length >= 2) {
    const [left, right] = numbers;
    return {
      priceMin: Math.min(left, right),
      priceMax: Math.max(left, right),
    };
  }
  const [amount] = numbers;
  if (/under|below|less|lt|^<|이하|미만|아래|언더/i.test(raw)) {
    return { priceMin: undefined, priceMax: amount };
  }
  if (/over|above|more|greater|gt|plus|\+|^>|이상|초과|넘는/i.test(raw)) {
    return { priceMin: amount, priceMax: undefined };
  }
  return { priceMin: undefined, priceMax: amount };
}

function normalizeCriteriaOverrides(overrides: CriteriaOverride[] = []): CriteriaOverride[] {
  return overrides.flatMap((override) => {
    if (override.key !== "priceRange") return [override];
    const range = priceRangeOverrideValue(override.value);
    if (!range) return [override];
    return [
      { key: "priceMin", value: range.priceMin ?? null },
      { key: "priceMax", value: range.priceMax ?? null },
    ];
  });
}

function applyCriteriaOverride(filters: Amazon2023ProductFilters, override: { key: string; value: string | number | boolean | null }) {
  if (override.key === "priceRange") {
    const range = priceRangeOverrideValue(override.value);
    if (range) {
      filters.priceMin = range.priceMin;
      filters.priceMax = range.priceMax;
    }
  }
  if (override.key === "priceMin") filters.priceMin = numericOverrideValue(override.value);
  if (override.key === "priceMax") filters.priceMax = numericOverrideValue(override.value);
  if (override.key === "ratingMin") filters.ratingMin = typeof override.value === "number" ? override.value : undefined;
  if (override.key === "category") filters.category = typeof override.value === "string" ? override.value : undefined;
  if (override.key === "subCategory" || override.key === "productType") filters.subCategory = typeof override.value === "string" ? override.value : undefined;
  if (override.key === "brand") filters.brand = typeof override.value === "string" ? override.value : undefined;
  if (override.key === "genderTarget") filters.genderTarget = stringOverrideValue(override.value);
  if (override.key === "occasion") filters.occasion = stringOverrideValue(override.value);
  if (override.key === "season") filters.season = stringOverrideValue(override.value);
  if (override.key === "material") filters.material = stringOverrideValue(override.value);
  if (override.key === "style") filters.style = stringOverrideValue(override.value);
  if (override.key === "sleeveLength") filters.sleeveLength = stringOverrideValue(override.value);
  if (override.key === "warmthLevelMin") filters.warmthLevelMin = numericOverrideValue(override.value);
  if (override.key === "comfortLevelMin") filters.comfortLevelMin = numericOverrideValue(override.value);
  if (override.key === "durabilityLevelMin") filters.durabilityLevelMin = numericOverrideValue(override.value);
  if (override.key === "careEaseLevelMin") filters.careEaseLevelMin = numericOverrideValue(override.value);
  if (override.key === "waterproof") filters.waterproof = typeof override.value === "boolean" ? override.value : String(override.value) === "true";
  if (override.key === "semanticConfidenceMin") filters.semanticConfidenceMin = numericOverrideValue(override.value);
}

function buildFilters(query: string, overrides: { key: string; value: string | number | boolean | null }[] = []): Amazon2023ProductFilters {
  const priceMax = parsePriceLimit(query);
  const ratingMin = parseRatingMin(query);
  const category = parseCategory(query);
  const searchText = expandKoreanQueryTerms(query);
  const genderTarget = parseGenderTarget(query);
  const season = parseSeason(query);
  const material = parseMaterial(query);
  const occasion = parseClearOccasion(query);
  const style = parseStyle(query);
  const sleeveLength = parseSleeveLength(query);
  const parsedProductType = parseProductType(query);
  const subCategory = parsedProductType === "Shirts" && sleeveLength ? undefined : parsedProductType;
  const filters: Amazon2023ProductFilters = {
    query: searchText,
    category,
    subCategory,
    priceMax,
    ratingMin,
    genderTarget,
    season,
    material,
    occasion,
    style,
    sleeveLength,
    waterproof: hasIntent(query, /방수|waterproof|water resistant/i) ? true : undefined,
    durabilityLevelMin: hasIntent(query, /튼튼|durable|durability|sturdy/i) ? 4 : undefined,
    careEaseLevelMin: hasIntent(query, /세탁|관리\s*쉬|washable|easy care|easy-care/i) ? 4 : undefined,
  };

  for (const override of overrides) {
    applyCriteriaOverride(filters, override);
  }

  return filters;
}

function validateFiltersForQuery(filters: Amazon2023ProductFilters, query: string, overrides: CriteriaOverride[] = []) {
  if (hasCoatIntent(query)) {
    filters.category = "Coats";
    filters.subCategory = "Coats";
  }

  if (filters.subCategory === "Shirts" && filters.sleeveLength) {
    filters.subCategory = undefined;
  }

  if (hasVacationIntent(query)) {
    filters.season = "summer";
    filters.occasion = "travel";
    filters.warmthLevelMin = undefined;
  }

  if (hasInterviewIntent(query)) {
    filters.occasion = filters.occasion ?? "office";
    filters.style = filters.style ?? "formal";
  }

  if (shouldKeepStyleAmbiguous(query, overrides)) {
    filters.style = undefined;
  }

  if (shouldKeepPartyAmbiguous(query, overrides)) {
    filters.occasion = undefined;
    filters.style = undefined;
  }

  if (filters.subCategory && ["Boots", "Sneakers", "Sandals", "Loafers", "Heels", "Flats", "Oxfords", "Slippers"].includes(filters.subCategory)) {
    filters.category = "Shoes";
  }

  if (filters.subCategory && ["Tees", "Blouses", "Sweaters", "Hoodies"].includes(filters.subCategory)) {
    filters.category = "Tops";
  }

  if (filters.subCategory && ["Watch", "Watches", "watch", "watches"].includes(filters.subCategory)) {
    filters.category = "Watches";
    filters.subCategory = "Watches";
  }

  if (filters.category && ["Watch", "Watches", "watch", "watches"].includes(filters.category)) {
    filters.category = "Watches";
    filters.subCategory = filters.subCategory ?? "Watches";
  }
}

function assignDefined<T extends Record<string, unknown>>(target: T, values: Record<string, unknown>) {
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") {
      target[key as keyof T] = value as T[keyof T];
    }
  }
}

function normalizeLlmFilters(filters: Record<string, unknown>): { filters: Record<string, unknown>; corrections: FilterCorrection[] } {
  const normalized = { ...filters };
  const corrections: FilterCorrection[] = [];
  if (!normalized.subCategory && typeof normalized.productType === "string") {
    normalized.subCategory = normalized.productType;
    corrections.push({
      key: "subCategory",
      from: null,
      to: normalized.productType,
      reason: "Mapped LLM productType to the executable subCategory filter.",
    });
  }
  delete normalized.productType;
  return { filters: normalized, corrections };
}

function mergeParsedCriteria(base: ParsedCriterion[], hints: LlmCriterionHint[], source: string) {
  const merged = [...base];
  const keys = new Set(base.map((criterion) => criterion.key));
  for (const hint of hints) {
    if (hint.key === "style" && hint.status === "ambiguous" && keys.has("styleIntent")) continue;
    if (!hint.key || keys.has(hint.key)) continue;
    merged.push({
      key: hint.key,
      label: hint.label ?? hint.key,
      value: hint.value,
      displayValue: hint.displayValue ?? (hint.value === null ? "Any" : String(hint.value)),
      status: hint.status,
      source: hint.source ?? source,
    });
    keys.add(hint.key);
  }
  return merged;
}

async function buildLensInterpretation(query: string, overrides: CriteriaOverride[] = []): Promise<LensInterpretation> {
  const filters = buildFilters(query);
  try {
    const llm = await callGeminiInterpretation(query);
    if (llm) {
      const normalizedLlm = normalizeLlmFilters(llm.filters);
      if (llm.searchText) filters.query = llm.searchText;
      assignDefined(filters as unknown as Record<string, unknown>, normalizedLlm.filters);
      for (const override of overrides) {
        applyCriteriaOverride(filters, override);
      }
      validateFiltersForQuery(filters, query, overrides);
      return {
        filters,
        criteriaHints: llm.parsedCriteria
          .filter((criterion) => !(shouldKeepStyleAmbiguous(query, overrides) && criterion.key === "style"))
          .filter((criterion) => !(shouldKeepPartyAmbiguous(query, overrides) && ["style", "occasion"].includes(criterion.key)))
          .map((criterion) => ({ ...criterion, source: "gemini_natural_language" })),
        clarificationHints: llm.clarifications,
        source: "gemini",
        rawFilters: llm.filters,
        corrections: normalizedLlm.corrections,
      };
    }
  } catch (error) {
    for (const override of overrides) {
      applyCriteriaOverride(filters, override);
    }
    validateFiltersForQuery(filters, query, overrides);
    return {
      filters,
      criteriaHints: [],
      clarificationHints: [],
      source: "rule",
      corrections: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }

  for (const override of overrides) {
    applyCriteriaOverride(filters, override);
  }
  validateFiltersForQuery(filters, query, overrides);
  return {
    filters,
    criteriaHints: [],
    clarificationHints: [],
    source: "rule",
    corrections: [],
  };
}

function buildContextOverrideLens(query: string, baseFilters: Amazon2023ProductFilters, overrides: CriteriaOverride[], source: LensInterpretation["source"]): LensInterpretation {
  const filters = { ...baseFilters };
  for (const override of normalizeCriteriaOverrides(overrides)) {
    applyCriteriaOverride(filters, override);
  }
  validateFiltersForQuery(filters, query, overrides);
  return {
    filters,
    criteriaHints: [],
    clarificationHints: [],
    source,
    corrections: [],
  };
}

function loosenFreeText(filters: Amazon2023ProductFilters): Amazon2023ProductFilters {
  return {
    ...filters,
    query: undefined,
  };
}

function loosenCategory(filters: Amazon2023ProductFilters): Amazon2023ProductFilters {
  return {
    ...filters,
    query: undefined,
    category: undefined,
  };
}

function loosenOccasion(filters: Amazon2023ProductFilters): Amazon2023ProductFilters {
  return {
    ...filters,
    occasion: undefined,
  };
}

async function executeAmazon2023AiSearch(filters: Amazon2023ProductFilters, limit = MAX_AI_ITEMS, locale: Amazon2023Locale = "en") {
  let result = await searchAmazon2023Products({ ...filters, locale, limit, offset: 0, sort: "rating_desc" });
  let resolvedFilters = filters;
  if (result && result.pagination.total === 0 && filters.occasion) {
    const relaxedFilters = loosenOccasion(filters);
    const relaxedResult = await searchAmazon2023Products({ ...relaxedFilters, locale, limit, offset: 0, sort: "rating_desc" });
    if (relaxedResult && relaxedResult.pagination.total > result.pagination.total) {
      resolvedFilters = relaxedFilters;
      result = relaxedResult;
    }
  }
  if (result && result.pagination.total < MIN_STRUCTURED_RESULT_TARGET && filters.query) {
    const relaxedFilters = loosenFreeText(resolvedFilters);
    const relaxedResult = await searchAmazon2023Products({ ...relaxedFilters, locale, limit, offset: 0, sort: "rating_desc" });
    if (relaxedResult && relaxedResult.pagination.total > result.pagination.total) {
      resolvedFilters = relaxedFilters;
      result = relaxedResult;
    }
  }
  if (result && result.pagination.total === 0 && resolvedFilters.category) {
    const relaxedFilters = loosenCategory(resolvedFilters);
    const relaxedResult = await searchAmazon2023Products({ ...relaxedFilters, locale, limit, offset: 0, sort: "rating_desc" });
    if (relaxedResult && relaxedResult.pagination.total > result.pagination.total) {
      resolvedFilters = relaxedFilters;
      result = relaxedResult;
    }
  }
  return { result, resolvedFilters };
}

function compactFilters(filters: Amazon2023ProductFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function buildDecompositionDiagnostics(lens: LensInterpretation, filters: Amazon2023ProductFilters, candidateCount?: number) {
  const validatedFilters = compactFilters(filters);
  const appliedFilterCount = Object.keys(validatedFilters).length;
  const correctionCount = lens.corrections?.length ?? 0;
  const confidenceBase = lens.source === "gemini" ? 0.76 : 0.5;
  const confidence = Math.max(
    0.1,
    Math.min(0.95, confidenceBase + Math.min(appliedFilterCount, 6) * 0.03 - correctionCount * 0.04),
  );
  return {
    source: lens.source,
    fallbackUsed: lens.source !== "gemini",
    confidence,
    rawFilters: lens.rawFilters ?? null,
    validatedFilters,
    corrections: lens.corrections ?? [],
    candidateCount: candidateCount ?? null,
  };
}

function shouldDiversifyUngenderedResults(filters: Amazon2023ProductFilters, query: string) {
  if (filters.genderTarget) return false;
  const text = `${query} ${filters.query ?? ""} ${filters.category ?? ""} ${filters.subCategory ?? ""}`.toLowerCase();
  return /\b(tops?|shirts?|tees?|t[- ]?shirts?)\b|상의|티셔츠|반팔티|셔츠|블라우스/i.test(text);
}

function resultGenderBucket(item: ProductSearchItem) {
  const record = item as ProductSearchItem & Record<string, unknown>;
  const semantic = semanticAttribute(record, "genderTarget");
  const semanticValue = String(semantic?.valueText ?? semantic?.value ?? "").toLowerCase();
  const categoryPath = Array.isArray(record.categoryPath) ? record.categoryPath.join(" ") : "";
  const text = [
    semanticValue,
    record.category,
    record.mainCategory,
    record.subCategory,
    categoryPath,
  ]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
  if (/\bwomen|woman|female|ladies\b/.test(text)) return "women";
  if (/\bmen|mens|male\b/.test(text)) return "men";
  if (/\bunisex\b/.test(text)) return "unisex";
  if (/\bgirls?\b/.test(text)) return "girls";
  if (/\bboys?\b/.test(text)) return "boys";
  if (/\bbaby|infant|toddler\b/.test(text)) return "baby";
  return "other";
}

function diversifyUngenderedResults<T extends ProductSearchItem>(items: T[]) {
  const order = ["women", "men", "unisex", "girls", "boys", "baby", "other"];
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = resultGenderBucket(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const diversified: T[] = [];
  let added = true;
  while (added && diversified.length < items.length) {
    added = false;
    for (const key of order) {
      const group = groups.get(key);
      if (group?.length) {
        diversified.push(group.shift() as T);
        added = true;
      }
    }
  }
  return diversified;
}

function criterion(key: string, label: string, value: string | number | boolean | null, source: string, status?: ParsedCriterion["status"]): ParsedCriterion {
  return {
    key,
    label,
    value,
    displayValue: value === null ? "Any" : String(value),
    status: status ?? (value === null ? "open" : "applied"),
    source,
  };
}

function buildParsedCriteria(filters: Amazon2023ProductFilters, displayQuery?: string): ParsedCriterion[] {
  const queryCriterion = criterion("query", "Search text", filters.query ?? displayQuery ?? null, filters.query ? "natural_language_query" : "natural_language_query_relaxed");
  if (displayQuery && !filters.query) {
    queryCriterion.status = "ambiguous";
  }
  return [
    queryCriterion,
    criterion("category", "Category", filters.category ?? null, "category_alias"),
    criterion("productType", "Product type", filters.subCategory ?? null, "product_type_alias"),
    criterion("priceMin", "Min price", filters.priceMin ?? null, "natural_language_query"),
    criterion("priceMax", "Max price", filters.priceMax ?? null, "natural_language_query"),
    criterion("ratingMin", "Minimum rating", filters.ratingMin ?? null, "natural_language_query"),
    criterion("brand", "Brand", filters.brand ?? null, "user_override"),
    criterion("genderTarget", "Gender Target", filters.genderTarget ?? null, "semantic_metadata"),
    criterion("occasion", "Occasion", filters.occasion ?? null, "semantic_metadata_reviews"),
    criterion("season", "Season", filters.season ?? null, "semantic_metadata"),
    criterion("material", "Material", filters.material ?? null, "semantic_metadata"),
    criterion("style", "Style", filters.style ?? null, "semantic_metadata"),
    criterion("sleeveLength", "Sleeve length", filters.sleeveLength ?? null, "natural_language_query"),
    criterion("warmthLevel", "Warmth", filters.warmthLevelMin ? `${filters.warmthLevelMin}+` : null, "semantic_review_smoothed"),
    criterion("comfortLevel", "Comfort", filters.comfortLevelMin ? `${filters.comfortLevelMin}+` : null, "semantic_review_smoothed"),
    criterion("waterproof", "Waterproof", filters.waterproof ?? null, "semantic_metadata_reviews"),
    criterion("durabilityLevel", "Durability", filters.durabilityLevelMin ? `${filters.durabilityLevelMin}+` : null, "semantic_review_smoothed"),
    criterion("careEaseLevel", "Care Ease", filters.careEaseLevelMin ? `${filters.careEaseLevelMin}+` : null, "semantic_review_smoothed"),
    ...(displayQuery && hasIntent(displayQuery, /따뜻|warm|보온/i) && !filters.warmthLevelMin
      ? [criterion("warmthIntent", "Warmth intent", "Needs clarification", "ambiguous_natural_language", "ambiguous")]
      : []),
    ...(displayQuery && hasIntent(displayQuery, /편한|편안|comfortable|comfy/i) && !filters.comfortLevelMin
      ? [criterion("comfortIntent", "Comfort intent", "Needs clarification", "ambiguous_natural_language", "ambiguous")]
      : []),
    ...(displayQuery && hasIntent(displayQuery, /출근|통근|commute|office/i) && !filters.occasion
      ? [criterion("occasionIntent", "Occasion intent", "Needs clarification", "ambiguous_natural_language", "ambiguous")]
      : []),
    ...(displayQuery && hasAmbiguousStyleIntent(displayQuery) && !filters.style
      ? [criterion("styleIntent", "Style intent", "Needs clarification", "ambiguous_natural_language", "ambiguous")]
      : []),
    ...(displayQuery && shouldKeepPartyAmbiguous(displayQuery) && !filters.style && !filters.occasion
      ? [criterion("partyIntent", "Party intent", "Needs clarification", "ambiguous_natural_language", "ambiguous")]
      : []),
  ].filter((item) => item.value !== null || item.key === "query");
}

async function estimatedCountForOption(filters: Amazon2023ProductFilters, overrides: CriteriaOverride[]) {
  const nextFilters = { ...filters };
  for (const override of normalizeCriteriaOverrides(overrides)) {
    applyCriteriaOverride(nextFilters, override);
  }
  const result = await executeAmazon2023AiSearch(nextFilters, 1);
  return result.result?.pagination.total ?? 0;
}

async function optionWithCount(filters: Amazon2023ProductFilters, value: string, label: string, overrides: CriteriaOverride[]) {
  const criteriaOverrides = normalizeCriteriaOverrides(overrides);
  return {
    value,
    label,
    criteriaOverrides,
    estimatedCount: await estimatedCountForOption(filters, criteriaOverrides),
  };
}

function dedupeClarifications(clarifications: Clarification[]) {
  const seen = new Set<string>();
  return clarifications.filter((clarification) => {
    if (seen.has(clarification.key)) return false;
    seen.add(clarification.key);
    return true;
  });
}

function priceRangeLabel(min: number | null, max: number) {
  return min === null ? `Under $${max}` : `$${min} - $${max}`;
}

function priceRangeValue(min: number | null, max: number) {
  return min === null ? `under_${max}` : `${min}_to_${max}`;
}

async function buildPriceRangeClarification(filters: Amazon2023ProductFilters): Promise<Clarification | null> {
  if (!filters.priceMax || filters.priceMin || filters.priceMax <= 50) return null;
  const priceMax = filters.priceMax;
  const upperBounds = [50, 100, 150, 200].filter((bound) => bound < priceMax);
  const bounds = [...upperBounds, priceMax];
  const ranges: Array<{ min: number | null; max: number }> = [];
  let previous = 0;
  for (const bound of bounds) {
    const min = previous === 0 ? null : previous;
    if (bound > previous) ranges.push({ min, max: bound });
    previous = bound;
  }
  if (ranges.length < 2) return null;
  const options = await Promise.all(
    ranges.slice(0, 4).map((range) =>
      optionWithCount(filters, priceRangeValue(range.min, range.max), priceRangeLabel(range.min, range.max), [
        { key: "priceMin", value: range.min },
        { key: "priceMax", value: range.max },
      ]),
    ),
  );
  return {
    key: "priceRange",
    label: "Price range",
    question: "Would you like to narrow the price range?",
    selectedValue: null,
    options,
  };
}

async function materializeLlmClarification(filters: Amazon2023ProductFilters, hint: LlmClarificationHint): Promise<Clarification | null> {
  if (!hint.key || !hint.options?.length) return null;
  const key = hint.key === "style" && !filters.style ? "styleIntent" : hint.key;
  const options = await Promise.all(
    hint.options.slice(0, 5).map(async (option) => {
      const criteriaOverrides = option.criteriaOverrides?.length ? option.criteriaOverrides : [{ key: hint.key, value: option.value }];
      return optionWithCount(filters, String(option.value ?? ""), option.label ?? String(option.value ?? "Option"), criteriaOverrides);
    }),
  );
  return {
    key,
    label: hint.label ?? hint.key,
    question: hint.question ?? "Which interpretation should be used?",
    selectedValue: hint.selectedValue ?? null,
    options,
  };
}

async function buildClarifications(query: string, filters: Amazon2023ProductFilters, llmHints: LlmClarificationHint[] = []) {
  const clarifications: Clarification[] = [];
  for (const hint of llmHints) {
    const materialized = await materializeLlmClarification(filters, hint);
    if (materialized) clarifications.push(materialized);
  }
  const priceRangeClarification = await buildPriceRangeClarification(filters);
  if (priceRangeClarification) clarifications.push(priceRangeClarification);

  if (hasIntent(query, /따뜻|warm|보온/i) && !filters.warmthLevelMin) {
    clarifications.push({
      key: "warmthIntent",
      label: "Warmth",
      question: "What should warm mean for this search?",
      selectedValue: null,
      options: [
        await optionWithCount(filters, "review_warmth", "Review-backed warmth", [
          { key: "warmthLevelMin", value: 4 },
          { key: "semanticConfidenceMin", value: 0.25 },
        ]),
        await optionWithCount(filters, "winter_outerwear", "Winter/insulated items", [
          { key: "season", value: "winter" },
          { key: "warmthLevelMin", value: 3 },
          { key: "semanticConfidenceMin", value: 0.2 },
        ]),
        await optionWithCount(filters, "warm_materials", "Wool/fleece-like materials", [
          { key: "material", value: "wool" },
          { key: "semanticConfidenceMin", value: 0.2 },
        ]),
      ],
    });
  }

  if (hasIntent(query, /편한|편안|comfortable|comfy/i) && !filters.comfortLevelMin) {
    clarifications.push({
      key: "comfortIntent",
      label: "Comfort",
      question: "What should comfortable mean for this search?",
      selectedValue: null,
      options: [
        await optionWithCount(filters, "review_comfort", "Review-backed comfort", [
          { key: "comfortLevelMin", value: 4 },
          { key: "ratingMin", value: 4 },
          { key: "semanticConfidenceMin", value: 0.25 },
        ]),
        await optionWithCount(filters, "soft_casual", "Soft casual wear", [
          { key: "style", value: "casual" },
          { key: "comfortLevelMin", value: 3 },
          { key: "semanticConfidenceMin", value: 0.2 },
        ]),
        await optionWithCount(filters, "supportive_shoes", "Supportive shoes", [
          { key: "category", value: "Shoes" },
          { key: "comfortLevelMin", value: 4 },
          { key: "semanticConfidenceMin", value: 0.2 },
        ]),
      ],
    });
  }

  if (hasIntent(query, /출근|통근|commute|office/i) && !filters.occasion) {
    clarifications.push({
      key: "occasionIntent",
      label: "Occasion",
      question: "Which use case should be prioritized?",
      selectedValue: null,
      options: [
        await optionWithCount(filters, "commute", "Commute", [
          { key: "occasion", value: "commute" },
          { key: "semanticConfidenceMin", value: 0.2 },
        ]),
        await optionWithCount(filters, "office", "Office/work", [
          { key: "occasion", value: "office" },
          { key: "semanticConfidenceMin", value: 0.2 },
        ]),
        await optionWithCount(filters, "daily", "Daily use", [
          { key: "occasion", value: "daily" },
          { key: "semanticConfidenceMin", value: 0.2 },
        ]),
      ],
    });
  }

  if (shouldKeepPartyAmbiguous(query)) {
    clarifications.push({
      key: "partyIntent",
      label: "Party",
      question: "What kind of party outfit should be prioritized?",
      selectedValue: null,
      options: [
        await optionWithCount(filters, "casual_party", "Casual party", [
          { key: "style", value: "casual" },
          { key: "occasion", value: "daily" },
          { key: "semanticConfidenceMin", value: 0.18 },
        ]),
        await optionWithCount(filters, "formal_event", "Formal event", [
          { key: "style", value: "formal" },
          { key: "occasion", value: "formal" },
          { key: "semanticConfidenceMin", value: 0.18 },
        ]),
        await optionWithCount(filters, "statement_style", "Statement/playful style", [
          { key: "style", value: "cute" },
          { key: "semanticConfidenceMin", value: 0.18 },
        ]),
        await optionWithCount(filters, "polished_shirt", "Polished shirt", [
          { key: "style", value: "classic" },
          { key: "semanticConfidenceMin", value: 0.18 },
        ]),
      ],
    });
  }

  if (hasAmbiguousStyleIntent(query) && !filters.style) {
    clarifications.push({
      key: "styleIntent",
      label: "Style",
      question: "What should pretty mean for this search?",
      selectedValue: null,
      options: [
        await optionWithCount(filters, "cute", "Cute/playful", [
          { key: "style", value: "cute" },
          { key: "semanticConfidenceMin", value: 0.2 },
        ]),
        await optionWithCount(filters, "classic", "Classic/polished", [
          { key: "style", value: "classic" },
          { key: "semanticConfidenceMin", value: 0.2 },
        ]),
        await optionWithCount(filters, "minimal", "Minimal/clean", [
          { key: "style", value: "minimal" },
          { key: "semanticConfidenceMin", value: 0.2 },
        ]),
        await optionWithCount(filters, "casual", "Casual/everyday", [
          { key: "style", value: "casual" },
          { key: "semanticConfidenceMin", value: 0.2 },
        ]),
      ],
    });
  }

  return dedupeClarifications(clarifications)
    .map((clarification) => ({
      ...clarification,
      options: clarification.options.some((option) => option.estimatedCount > 0)
        ? clarification.options.filter((option) => option.estimatedCount > 0)
        : clarification.options,
    }))
    .slice(0, 4);
}

function makeDimension(key: string, label: string, source: string, dataType: string, active = true, hasEvidence = false): ComparisonDimension {
  return { key, label, source, dataType, active, hasEvidence };
}

function buildDimensions() {
  return [
    makeDimension("price", "Price", "product", "number"),
    makeDimension("brand", "Brand", "product", "text"),
    makeDimension("rating", "Rating", "product", "number"),
    makeDimension("reviewCount", "Review Count", "product", "number"),
    makeDimension("category", "Category", "category_path", "text"),
    makeDimension("productType", "Product Type", "category_path", "text"),
    makeDimension("subCategory", "Subcategory", "category_path", "text", false),
    makeDimension("colorFamily", "Color", "details", "text", false),
    makeDimension("color", "Color", "details", "text", false),
    makeDimension("size", "Size", "details", "text"),
    makeDimension("sleeveLength", "Sleeve Length", "details", "text", false),
    makeDimension("material", "Material", "details", "text", true, true),
    makeDimension("occasion", "Occasion", "metadata_reviews", "text", false, true),
    makeDimension("style", "Style", "metadata_reviews", "text", false, true),
    makeDimension("season", "Season", "metadata_reviews", "text", false, true),
    makeDimension("genderTarget", "Gender Target", "metadata", "text", false),
    makeDimension("capacityLiters", "Capacity", "metadata_reviews", "evidence", false, true),
    makeDimension("pocketUtilityLevel", "Pocket Utility", "metadata_reviews", "evidence", false, true),
    makeDimension("strapComfortLevel", "Strap Comfort", "reviews", "evidence", false, true),
    makeDimension("waterproof", "Water Resistance", "metadata_reviews", "evidence", false, true),
    makeDimension("weightGrams", "Weight", "metadata_reviews", "evidence", false, true),
    makeDimension("warmthLevel", "Warmth", "metadata_reviews", "evidence", false, true),
    makeDimension("shoulderStructure", "Shoulder Structure", "metadata_reviews", "evidence", false, true),
    makeDimension("careComplexityLevel", "Care Complexity", "metadata_reviews", "evidence", false, true),
    makeDimension("careEaseLevel", "Care Ease", "metadata_reviews", "evidence", false, true),
    makeDimension("lengthFit", "Length Fit", "metadata_reviews", "evidence", false, true),
    makeDimension("comfortLevel", "Comfort", "reviews", "evidence", false, true),
    makeDimension("durabilityLevel", "Durability", "reviews", "evidence", false, true),
    makeDimension("breathabilityLevel", "Breathability", "metadata_reviews", "evidence", false, true),
    makeDimension("stretchLevel", "Stretch", "metadata_reviews", "evidence", false, true),
    makeDimension("softnessLevel", "Softness", "metadata_reviews", "evidence", false, true),
    makeDimension("machineWashable", "Machine Washable", "metadata_reviews", "boolean", false, true),
    makeDimension("waistRise", "Waist Rise", "metadata_reviews", "text", false, true),
    makeDimension("toeBoxFit", "Toe Box Fit", "metadata_reviews", "evidence", false, true),
    makeDimension("archSupportLevel", "Arch Support", "reviews", "evidence", false, true),
    makeDimension("soleGripLevel", "Sole Grip", "reviews", "evidence", false, true),
    makeDimension("opacityLevel", "Opacity", "reviews", "evidence", false, true),
    makeDimension("fit", "Fit", "review_text", "evidence", true, true),
    makeDimension("reviewStrengths", "Review Strengths", "reviews", "evidence", true, true),
    makeDimension("reviewRisks", "Review Risks", "reviews", "evidence", true, true),
  ];
}

function normalizeLookupKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function stringifyValue(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    const values = value.map((item) => String(item).trim()).filter(Boolean);
    return values.length ? values.join(", ") : undefined;
  }
  if (typeof value === "object") {
    const serialized = JSON.stringify(value);
    return serialized === "{}" || serialized === "[]" ? undefined : serialized;
  }
  const text = String(value).trim();
  return text || undefined;
}

function detailValue(product: ProductDetailResponse, keys: string[]) {
  if (!product?.details || typeof product.details !== "object") {
    return undefined;
  }
  const details = product.details as Record<string, unknown>;
  const normalizedKeys = keys.map(normalizeLookupKey);
  for (const key of keys) {
    const value = details[key] ?? details[key.toLowerCase()] ?? details[key.replace(/\s+/g, "_").toLowerCase()];
    const text = stringifyValue(value);
    if (text) {
      return text;
    }
  }
  for (const [key, value] of Object.entries(details)) {
    if (normalizedKeys.includes(normalizeLookupKey(key))) {
      return stringifyValue(value);
    }
  }
  return undefined;
}

function attributeValue(product: ProductDetailResponse, keys: string[]) {
  const directDetail = detailValue(product, keys);
  if (directDetail) {
    return directDetail;
  }
  const normalizedKeys = keys.map(normalizeLookupKey);
  const attributes = Array.isArray((product as ProductDetailResponse & { attributes?: unknown[] })?.attributes)
    ? ((product as ProductDetailResponse & { attributes?: Array<Record<string, unknown>> }).attributes ?? [])
    : [];
  for (const attribute of attributes) {
    const key = typeof attribute.key === "string" ? attribute.key : "";
    const label = typeof attribute.label === "string" ? attribute.label : "";
    const sourcePath = typeof attribute.sourcePath === "string" ? attribute.sourcePath : "";
    const candidates = [key, label, sourcePath].map(normalizeLookupKey);
    if (candidates.some((candidate) => normalizedKeys.includes(candidate))) {
      return stringifyValue(attribute.valueText ?? attribute.valueNumber ?? attribute.valueBoolean ?? attribute.valueJson);
    }
  }
  return undefined;
}

const DIMENSION_LOOKUPS: Record<string, { keys: string[]; reviewPattern?: RegExp; fallback: string }> = {
  colorFamily: { keys: ["Color", "Color Name", "Colour"], fallback: "No color metadata" },
  color: { keys: ["Color", "Color Name", "Colour"], fallback: "No color metadata" },
  size: { keys: ["Size", "Size Name", "Department"], fallback: "No size metadata" },
  sleeveLength: { keys: ["Sleeve Type", "Sleeve Length", "Sleeve"], reviewPattern: /short sleeve|long sleeve|sleeveless|반팔|긴팔|민소매/i, fallback: "No sleeve metadata" },
  material: { keys: ["Material", "Fabric Type", "Outer Material", "Sole Material", "Metal Type"], reviewPattern: /material|fabric|leather|wool|cotton|nylon|polyester|denim|소재|가죽|울|면/i, fallback: "No material metadata" },
  occasion: { keys: ["Occasion", "Department", "Target Gender"], reviewPattern: /office|commute|work|travel|wedding|daily|casual|학교|출근|여행|데일리/i, fallback: "No occasion signal" },
  style: { keys: ["Style", "Pattern", "Closure Type", "Item Shape"], reviewPattern: /style|cute|beautiful|clean|minimal|dressy|casual|예쁘|깔끔|오피스룩/i, fallback: "No style signal" },
  season: { keys: ["Season", "Seasons"], reviewPattern: /winter|summer|spring|fall|warm|breathable|겨울|여름|따뜻|통기/i, fallback: "No season signal" },
  genderTarget: { keys: ["Department", "Target Gender", "Gender"], fallback: "No gender metadata" },
  capacityLiters: { keys: ["Capacity", "Volume", "Item Volume", "Laptop Size", "Compatible Laptop Size"], reviewPattern: /capacity|storage|room|space|fits.*laptop|pocket|수납|노트북|공간/i, fallback: "No capacity signal" },
  pocketUtilityLevel: { keys: ["Pocket", "Pockets", "Number of Pockets", "Pocket Description"], reviewPattern: /pocket|pockets|organizer|storage|주머니|수납/i, fallback: "No pocket signal" },
  strapComfortLevel: { keys: ["Strap Type", "Strap Drop", "Shoulder Strap"], reviewPattern: /strap|shoulder|padded|comfortable|hurt|pain|어깨|스트랩|아프/i, fallback: "No strap comfort signal" },
  waterproof: { keys: ["Water Resistance Level", "Water Resistant", "Waterproof"], reviewPattern: /waterproof|water resistant|rain|wet|soaked|방수|비|젖/i, fallback: "No water-resistance signal" },
  weightGrams: { keys: ["Item Weight", "Weight", "Package Weight"], reviewPattern: /lightweight|light weight|heavy|weight|가벼|무겁|경량/i, fallback: "No weight signal" },
  warmthLevel: { keys: ["Insulation", "Lining Description", "Fill Material"], reviewPattern: /warm|winter|lined|insulated|cold|thin|따뜻|겨울|보온|얇/i, fallback: "No warmth signal" },
  shoulderStructure: { keys: ["Shoulder Style", "Shoulder", "Sleeve Type"], reviewPattern: /shoulder|broad|structured|pad|어깨/i, fallback: "No shoulder-structure signal" },
  careComplexityLevel: { keys: ["Care Instructions", "Fabric Care Instructions"], reviewPattern: /machine washable|washable|dry clean|easy to clean|wash|세탁|드라이|관리/i, fallback: "No care signal" },
  lengthFit: { keys: ["Length", "Inseam", "Item Length", "Rise Style"], reviewPattern: /length|long|short|petite|tall|inseam|기장|길|짧|키작|키큰/i, fallback: "No length-fit signal" },
  comfortLevel: { keys: ["Comfort", "Cushioning", "Insole"], reviewPattern: /comfortable|comfy|soft|cushion|hurts|편안|편하|아프/i, fallback: "No comfort signal" },
  durabilityLevel: { keys: ["Durability", "Construction Type"], reviewPattern: /durable|sturdy|held up|broke|tore|ripped|튼튼|내구|찢/i, fallback: "No durability signal" },
  breathabilityLevel: { keys: ["Breathability", "Fabric Type"], reviewPattern: /breathable|breathability|ventilated|hot|sweat|통기|시원/i, fallback: "No breathability signal" },
  stretchLevel: { keys: ["Stretch", "Fabric Stretch"], reviewPattern: /stretch|elastic|spandex|flex|신축|스판/i, fallback: "No stretch signal" },
  softnessLevel: { keys: ["Softness", "Fabric Type"], reviewPattern: /soft|scratchy|itchy|smooth|부드|까슬/i, fallback: "No softness signal" },
  machineWashable: { keys: ["Care Instructions", "Fabric Care Instructions"], reviewPattern: /machine washable|washable|washer|세탁기|세탁/i, fallback: "No washability signal" },
  waistRise: { keys: ["Rise Style", "Waist", "Waist Style"], reviewPattern: /high rise|mid rise|low rise|waist|허리|밑위/i, fallback: "No waist-rise signal" },
  toeBoxFit: { keys: ["Toe Style", "Toe Box", "Toe"], reviewPattern: /toe box|toebox|toe|wide|narrow|앞코|발볼/i, fallback: "No toe-box signal" },
  archSupportLevel: { keys: ["Arch Support", "Support"], reviewPattern: /arch support|supportive|support|아치|지지/i, fallback: "No arch-support signal" },
  soleGripLevel: { keys: ["Sole Material", "Outer Material"], reviewPattern: /grip|traction|slip|sole|미끄|접지|밑창/i, fallback: "No sole-grip signal" },
  opacityLevel: { keys: ["Opacity", "Fabric Type"], reviewPattern: /opaque|see through|thin|lined|비침|얇/i, fallback: "No opacity signal" },
};

function evidenceMatchesDimension(item: { attributeKey?: string }, dimension?: string) {
  if (!dimension || dimension === "all") return true;
  if (dimension === "reviewStrengths" || dimension === "reviewRisks") return true;
  return item.attributeKey === dimension;
}

function reviewEvidence(product: ProductDetailResponse, mode: "strength" | "risk" | "all" = "all", dimension?: string) {
  const reviews = Array.isArray(product?.reviews) ? product.reviews : [];
  const reviewsById = new Map(reviews.map((review) => [review.id, review]));
  const storedEvidence = Array.isArray((product as ProductDetailResponse & { reviewEvidence?: unknown[] })?.reviewEvidence)
    ? ((product as ProductDetailResponse & { reviewEvidence?: Array<Record<string, unknown>> }).reviewEvidence ?? [])
    : [];
  const stored = storedEvidence
    .map((item) => {
      const sentiment = typeof item.sentiment === "string" ? item.sentiment : "neutral";
      const reviewId = typeof item.reviewId === "string" ? item.reviewId : undefined;
      const review = reviewId ? reviewsById.get(reviewId) : undefined;
      return {
        sentiment,
        attributeKey: typeof item.attributeKey === "string" ? item.attributeKey : "review",
        attributeLabel: typeof item.attributeLabel === "string" ? item.attributeLabel : "Review Evidence",
        issueType: typeof item.issueType === "string" ? item.issueType : "none",
        severity: sentiment === "negative" ? 3 : 1,
        text: String(item.evidenceText ?? item.text ?? ""),
        evidenceText: String(item.evidenceText ?? item.text ?? ""),
        reviewId,
        reviewExternalId: review?.sourceReviewId,
        reviewTitle: review?.title ?? null,
        reviewBody: review?.body ?? null,
        reviewComment: review?.body ?? null,
        rating: review?.rating ?? null,
        date: review?.reviewTimestamp ?? null,
        confidence: typeof item.confidence === "number" ? item.confidence : null,
        source: typeof item.source === "string" ? item.source : "shopping_review_evidence",
        sourceType: review ? "review" : "metadata",
      };
    })
    .filter((item) => item.evidenceText.trim())
    .filter((item) => evidenceMatchesDimension(item, dimension))
    .filter((item) => mode === "all" || (mode === "strength" ? item.sentiment === "positive" : item.sentiment === "negative"));
  if (stored.length) {
    return stored.slice(0, 12);
  }

  const positive = /(comfortable|soft|great|love|perfect|warm|durable|fits well|true to size|high quality|편|좋|부드|따뜻|튼튼)/i;
  const negative = /(small|large|tight|thin|itchy|cheap|broke|poor|uncomfortable|scratchy|작|크|불편|얇|까슬|별로)/i;
  return (product?.reviews ?? [])
    .map((review) => {
      const text = [review.title, review.body].filter(Boolean).join(" - ");
      const sentiment = negative.test(text) ? "negative" : positive.test(text) ? "positive" : "neutral";
      return {
        sentiment,
        attributeKey: sentiment === "negative" ? "reviewRisks" : "reviewStrengths",
        attributeLabel: sentiment === "negative" ? "Review Risks" : "Review Strengths",
        issueType: sentiment === "negative" ? "review_complaint" : "none",
        severity: sentiment === "negative" ? 3 : 1,
        text,
        evidenceText: text,
        reviewId: review.id,
        reviewExternalId: review.sourceReviewId,
        reviewTitle: review.title,
        reviewBody: review.body,
        reviewComment: review.body,
        rating: review.rating,
        date: review.reviewTimestamp,
        sourceType: "review",
      };
    })
    .filter((item) => evidenceMatchesDimension(item, dimension))
    .filter((item) => mode === "all" || (mode === "strength" ? item.sentiment === "positive" : item.sentiment === "negative"))
    .slice(0, 12);
}

function buildEvidenceOverlay(product: ProductDetailResponse, dimension?: string) {
  const supporting = reviewEvidence(product, "strength", dimension).slice(0, 6);
  const skeptical = reviewEvidence(product, "risk", dimension).slice(0, 6);
  const missing: Array<{ key: string; label: string }> = [];
  if (!supporting.length) {
    missing.push({ key: "supporting", label: "No positive review evidence was found for this criterion." });
  }
  if (!skeptical.length) {
    missing.push({ key: "skeptical", label: "No cautionary review evidence was found for this criterion." });
  }
  return {
    supporting,
    skeptical,
    missing,
  };
}

function semanticAttributes(product: unknown) {
  return Array.isArray((product as { semanticAttributes?: unknown[] } | null)?.semanticAttributes)
    ? ((product as { semanticAttributes?: Array<Record<string, unknown>> }).semanticAttributes ?? [])
    : [];
}

function semanticAttribute(product: unknown, key: string) {
  return semanticAttributes(product).find((attribute) => attribute.key === key);
}

function semanticDisplayValue(attribute: Record<string, unknown> | undefined) {
  if (!attribute) return undefined;
  const value = attribute.valueText ?? attribute.valueNumber ?? attribute.valueBoolean ?? attribute.value;
  if (value === undefined || value === null || value === "") return undefined;
  const confidence = typeof attribute.confidence === "number" ? attribute.confidence : Number(attribute.confidence ?? 0);
  const suffix = confidence > 0 && confidence < 0.35 ? " (low confidence)" : "";
  return `${value}${suffix}`;
}

function attachDecisionEvidence(item: ProductSearchItem) {
  const semanticRows = semanticAttributes(item);
  const semanticReasons = semanticRows
    .filter((attribute) => ["genderTarget", "occasion", "season", "material", "style", "warmthLevel", "comfortLevel", "waterproof"].includes(String(attribute.key)))
    .slice(0, 4)
    .map((attribute) => `${attribute.key}: ${semanticDisplayValue(attribute) ?? "matched"}`);
  const lowConfidence = semanticRows
    .filter((attribute) => Number(attribute.confidence ?? 1) < 0.35)
    .slice(0, 2)
    .map((attribute) => `${attribute.key}: low-confidence semantic signal`);
  return {
    ...item,
    decisionEvidence: {
      primaryDifferentiator: item.brand ? `${item.brand} with dataset-backed metadata` : "Dataset-backed Amazon Fashion item",
      reasons: [
        ...semanticReasons,
        item.rating ? `Rating ${item.rating}` : "Rating unavailable",
        item.reviewCount ? `${item.reviewCount} reviews` : "Limited review count",
        item.mainCategory ? `Category: ${item.mainCategory}` : "Fashion catalog match",
      ],
      tradeoffs: [
        ...(item.imageFallbackStatus === "fallback_candidate" ? ["Image needs fallback thumbnail"] : []),
        ...lowConfidence,
      ],
      evidenceStrength: item.reviewCount >= 50 ? "high" : item.reviewCount >= 10 ? "medium" : "low",
      snippetsPreview: [],
    },
  };
}

function displayReviewEvidenceText(item: Record<string, unknown> | undefined) {
  if (!item) return undefined;
  const reviewBody = typeof item.reviewBody === "string" ? item.reviewBody.trim() : "";
  if (/\p{Script=Hangul}/u.test(reviewBody)) {
    const reviewTitle = typeof item.reviewTitle === "string" && /\p{Script=Hangul}/u.test(item.reviewTitle) ? item.reviewTitle.trim() : "";
    return [reviewTitle, reviewBody].filter(Boolean).join(" - ");
  }
  const text = typeof item.text === "string" ? item.text.trim() : "";
  if (text) return text;
  const evidenceText = typeof item.evidenceText === "string" ? item.evidenceText.trim() : "";
  return evidenceText || undefined;
}

function reviewEvidenceMatches(item: Record<string, unknown>, pattern: RegExp) {
  return [item.text, item.evidenceText, item.reviewTitle, item.reviewBody, item.reviewComment]
    .filter((value): value is string => typeof value === "string")
    .some((value) => pattern.test(value));
}

function reviewSignalValue(product: ProductDetailResponse, pattern: RegExp, fallback: string) {
  const item = reviewEvidence(product, "all").find((row) => reviewEvidenceMatches(row, pattern));
  return displayReviewEvidenceText(item) ?? fallback;
}

function detailTaxonomyText(product: ProductDetailResponse) {
  return [product?.name, product?.mainCategory, product?.category, product?.subCategory, ...((product?.categoryPath ?? []) as string[])].join(" ").toLowerCase();
}

function normalizedParentCategory(product: ProductDetailResponse) {
  const direct = (product as ProductDetailResponse & { normalizedParentCategory?: string | null })?.normalizedParentCategory;
  if (direct) return direct;
  const text = detailTaxonomyText(product);
  if (/\b(shoe|sneaker|boot|sandal|slipper|loafer|heel|pump|flat|oxford|footwear)\b/.test(text)) return "Footwear";
  if (/\b(coat|jacket|parka|anorak|windbreaker|raincoat|blazer|outerwear)\b/.test(text)) return "Outerwear";
  if (/\b(backpack|bag|tote|crossbody|duffel|handbag|purse)\b/.test(text)) return "Bags";
  if (/\b(dress|gown)\b/.test(text)) return "Dresses";
  if (/\b(shirt|tee|t[- ]?shirt|blouse|top|sweater|hoodie|cardigan|sweatshirt)\b/.test(text)) return "Tops";
  if (/\b(pants|trouser|trousers|jeans|slacks|leggings|shorts|skirt)\b/.test(text)) return "Bottoms";
  return product?.category ?? product?.mainCategory ?? "N/A";
}

function normalizedProductType(product: ProductDetailResponse) {
  return (product as ProductDetailResponse & { productType?: string | null })?.productType
    ?? product?.subCategory
    ?? product?.categoryPath?.[product.categoryPath.length - 1]
    ?? "N/A";
}

function comparisonValue(product: ProductDetailResponse, dimension: string) {
  if (!product) return "N/A";
  if (dimension === "price") return product.price ?? "N/A";
  if (dimension === "brand") return product.brand ?? product.store ?? "N/A";
  if (dimension === "rating") return product.rating ?? "N/A";
  if (dimension === "reviewCount") return product.reviewCount ?? 0;
  if (dimension === "category") return normalizedParentCategory(product);
  if (dimension === "productType") return normalizedProductType(product);
  if (dimension === "subCategory") return product.categoryPath?.[product.categoryPath.length - 1] ?? product.mainCategory ?? "N/A";
  const semantic = semanticDisplayValue(semanticAttribute(product, dimension));
  if (semantic) return semantic;
  if (dimension === "fit") return displayReviewEvidenceText(reviewEvidence(product, "all").find((item) => reviewEvidenceMatches(item, /fit|size|small|large|tight|true to size|맞|작|크|타이트|헐거/i))) ?? "No fit review preview";
  if (dimension === "reviewStrengths") return displayReviewEvidenceText(reviewEvidence(product, "strength")[0]) ?? "No positive review preview";
  if (dimension === "reviewRisks") return displayReviewEvidenceText(reviewEvidence(product, "risk")[0]) ?? "No repeated risk preview";
  const lookup = DIMENSION_LOOKUPS[dimension];
  if (lookup) {
    const structuredValue = attributeValue(product, lookup.keys);
    if (structuredValue) {
      return structuredValue;
    }
    if (lookup.reviewPattern) {
      return reviewSignalValue(product, lookup.reviewPattern, lookup.fallback);
    }
    return lookup.fallback;
  }
  return "N/A";
}

function comparisonEvidenceMode(dimension: string): "strength" | "risk" | "all" {
  if (dimension === "reviewStrengths") return "strength";
  if (dimension === "reviewRisks") return "risk";
  return "all";
}

function comparisonEvidenceAvailable(product: ProductDetailResponse, dimension: string) {
  return reviewEvidence(product, comparisonEvidenceMode(dimension), dimension).length > 0;
}

const DEFAULT_STRESS_WEIGHTS = {
  price: 0.55,
  rating: 0.5,
  reviewConfidence: 0.6,
  material: 0.45,
  comfort: 0.7,
  durability: 0.55,
  careEase: 0.45,
};

type StressWeightKey = keyof typeof DEFAULT_STRESS_WEIGHTS;

const STRESS_METRIC_KEYS = Object.keys(DEFAULT_STRESS_WEIGHTS) as StressWeightKey[];

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function numericValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
  }
  return undefined;
}

function productPriceNumber(product: ProductDetailResponse) {
  return numericValue(product.price) ?? numericValue((product as ProductDetailResponse & { priceNumber?: unknown }).priceNumber);
}

function productReviewCount(product: ProductDetailResponse) {
  return numericValue(product.reviewCount) ?? numericValue((product as ProductDetailResponse & { reviewCountNumber?: unknown }).reviewCountNumber) ?? 0;
}

function semanticNumberScore(product: ProductDetailResponse, key: string) {
  const attribute = semanticAttribute(product, key);
  const raw = numericValue(attribute?.valueNumber ?? attribute?.valueText ?? attribute?.value);
  if (raw !== undefined) return clamp01(raw / 5);
  return reviewEvidence(product, "strength", key).length ? 0.65 : 0.35;
}

function materialScore(product: ProductDetailResponse) {
  const attribute = semanticAttribute(product, "material");
  const value = attribute?.valueText ?? attribute?.value;
  if (value) {
    const confidence = numericValue(attribute?.confidence) ?? 0.6;
    return clamp01(0.55 + confidence * 0.35);
  }
  return attributeValue(product, ["Material", "Fabric Type"]) ? 0.6 : 0.25;
}

function stressMetricScore(product: ProductDetailResponse, key: StressWeightKey, products: ProductDetailResponse[]) {
  if (key === "price") {
    const prices = products.map(productPriceNumber).filter((value): value is number => value !== undefined);
    const price = productPriceNumber(product);
    if (price === undefined || prices.length < 2) return 0.5;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (max === min) return 0.75;
    return clamp01(1 - (price - min) / (max - min));
  }
  if (key === "rating") {
    const rating = numericValue(product.rating);
    return rating === undefined ? 0.35 : clamp01(rating / 5);
  }
  if (key === "reviewConfidence") {
    const counts = products.map(productReviewCount);
    const max = Math.max(1, ...counts);
    return clamp01(Math.log1p(productReviewCount(product)) / Math.log1p(max));
  }
  if (key === "material") return materialScore(product);
  if (key === "comfort") return semanticNumberScore(product, "comfortLevel");
  if (key === "durability") return semanticNumberScore(product, "durabilityLevel");
  if (key === "careEase") return semanticNumberScore(product, "careEaseLevel");
  return 0.5;
}

function normalizeStressWeights(weights: Partial<Record<StressWeightKey, number>>) {
  return Object.fromEntries(
    STRESS_METRIC_KEYS.map((key) => [key, clamp01(Number(weights[key] ?? DEFAULT_STRESS_WEIGHTS[key]))]),
  ) as Record<StressWeightKey, number>;
}

function scoreStressProducts(products: ProductDetailResponse[], weights: Record<StressWeightKey, number>) {
  const totalWeight = STRESS_METRIC_KEYS.reduce((sum, key) => sum + weights[key], 0) || 1;
  return products
    .map((product) => {
      const metricScores = Object.fromEntries(
        STRESS_METRIC_KEYS.map((key) => [key, stressMetricScore(product, key, products)]),
      ) as Record<StressWeightKey, number>;
      const score = STRESS_METRIC_KEYS.reduce((sum, key) => sum + metricScores[key] * weights[key], 0) / totalWeight;
      const drivers = STRESS_METRIC_KEYS
        .map((key) => ({ key, contribution: metricScores[key] * weights[key], score: metricScores[key] }))
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 3);
      return {
        productId: product.id,
        name: product.name,
        score,
        metricScores,
        drivers,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildStressTest(products: ProductDetailResponse[], weights: Partial<Record<StressWeightKey, number>>) {
  const normalizedWeights = normalizeStressWeights(weights);
  const baselineWeights = normalizeStressWeights(DEFAULT_STRESS_WEIGHTS);
  const baseline = scoreStressProducts(products, baselineWeights).map((item, index) => ({ ...item, rank: index + 1 }));
  const baselineRankById = new Map(baseline.map((item) => [item.productId, item.rank]));
  const items = scoreStressProducts(products, normalizedWeights).map((item, index) => {
    const rank = index + 1;
    const baselineRank = baselineRankById.get(item.productId) ?? rank;
    return {
      ...item,
      rank,
      baselineRank,
      rankDelta: baselineRank - rank,
    };
  });
  const top = items[0];
  return {
    weights: normalizedWeights,
    baseline,
    items,
    insight: top
      ? `${top.name} ranks #${top.rank} under the current preference weights.`
      : "Select products to test preference sensitivity.",
  };
}

function storeContext(queryId: string, context: QueryContext) {
  queryContexts.set(queryId, context);
  for (const [key, value] of queryContexts) {
    if (Date.now() - value.createdAt > 30 * 60 * 1000) {
      queryContexts.delete(key);
    }
  }
}

amazon2023AiRouter.post("/interpret", async (req, res, next) => {
  try {
    const parsed = queryBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "INVALID_REQUEST", "query must use the documented AI query shape.");
    }
    const lens = await buildLensInterpretation(parsed.data.query, parsed.data.criteriaOverrides);
    const locale = readLocale(parsed.data.session.locale);
    const filters = lens.filters;
    const facets = await getAmazon2023Facets(filters);
    if (!facets) {
      return sendError(res, 404, "DATASET_NOT_FOUND", "Amazon Reviews 2023 dataset has not been imported yet.");
    }
    const queryId = createQueryId();
    const dimensions = buildDimensions();
    const parsedCriteria = mergeParsedCriteria(buildParsedCriteria(filters, parsed.data.query), lens.criteriaHints, lens.source === "gemini" ? "gemini_natural_language" : "rule_natural_language");
    const clarifications = await buildClarifications(parsed.data.query, filters, lens.clarificationHints);
    if (facets.brands.length) {
      clarifications.push({
        key: "brand",
        label: "Brand",
        question: "Which brand/store should be prioritized?",
        selectedValue: filters.brand ?? null,
        options: facets.brands.slice(0, 5).map((brand) => ({
          value: brand.value,
          label: brand.label,
          criteriaOverrides: [{ key: "brand", value: brand.value }],
          estimatedCount: brand.count,
        })),
      });
    }
    storeContext(queryId, {
      query: parsed.data.query,
      locale,
      filters,
      criteriaFilters: filters,
      lensSource: lens.source,
      dimensions,
      parsedCriteria,
      itemIds: [],
      createdAt: Date.now(),
    });
    return res.json({
      queryId,
      status: "planning",
      interpretation: {
        summary: `Amazon Fashion criteria prepared against ${facets.total} matching products.`,
        warning: lens.source === "gemini"
          ? "Gemini decomposed the natural-language query; backend validated the criteria against dataset-backed filters."
          : "Rule fallback decomposed the query because Gemini was unavailable; backend still validated criteria against dataset-backed filters.",
      },
      decomposition: buildDecompositionDiagnostics(lens, filters, facets.total),
      parsedCriteria,
      clarifications,
      comparisonDimensions: dimensions,
      estimatedTotal: facets.total,
      actions: [{ type: "compare", label: "Compare selected products", command: "compare_selected" }],
    });
  } catch (error) {
    return next(error);
  }
});

amazon2023AiRouter.post("/query", async (req, res, next) => {
  try {
    const parsed = queryBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "INVALID_REQUEST", "query must use the documented AI query shape.");
    }
    const previous = parsed.data.queryId ? queryContexts.get(parsed.data.queryId) : undefined;
    const queryText = previous?.query ?? parsed.data.query;
    const locale = readLocale(parsed.data.session.locale ?? previous?.locale);
    const lens =
      previous && parsed.data.criteriaOverrides.length
        ? buildContextOverrideLens(queryText, previous.criteriaFilters ?? previous.filters, parsed.data.criteriaOverrides, previous.lensSource ?? "rule")
        : await buildLensInterpretation(queryText, parsed.data.criteriaOverrides);
    const filters = lens.filters;
    const criteriaFilters = { ...filters };
    const { result, resolvedFilters } = await executeAmazon2023AiSearch(filters, MAX_AI_ITEMS, locale);
    if (!result) {
      return sendError(res, 404, "DATASET_NOT_FOUND", "Amazon Reviews 2023 dataset has not been imported yet.");
    }
    const queryId = parsed.data.queryId ?? createQueryId();
    const dimensions = previous?.dimensions ?? buildDimensions();
    const parsedCriteria = mergeParsedCriteria(buildParsedCriteria(criteriaFilters, queryText), lens.criteriaHints, lens.source === "gemini" ? "gemini_natural_language" : "rule_natural_language");
    const clarifications = await buildClarifications(queryText, criteriaFilters, lens.clarificationHints);
    let items = result.items.map(attachDecisionEvidence);
    if (shouldDiversifyUngenderedResults(criteriaFilters, queryText)) {
      items = diversifyUngenderedResults(items);
    }
    storeContext(queryId, {
      query: queryText,
      locale,
      filters: resolvedFilters,
      criteriaFilters,
      lensSource: lens.source,
      dimensions,
      parsedCriteria,
      itemIds: items.map((item) => item.id),
      createdAt: Date.now(),
    });
    return res.json({
      queryId,
      status: "ok",
      interpretation: {
        summary: `Found ${result.pagination.total} Amazon Fashion candidates.`,
        warning: lens.source === "gemini"
          ? "Gemini decomposed the natural-language query; backend executed only dataset-backed filters."
          : "Rule fallback decomposed the query because Gemini was unavailable; backend executed only dataset-backed filters.",
      },
      decomposition: buildDecompositionDiagnostics(lens, criteriaFilters, result.pagination.total),
      parsedCriteria,
      clarifications,
      comparisonDimensions: dimensions,
      items,
      actions: [{ type: "compare", label: "Compare selected products", command: "compare_selected" }],
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
});

amazon2023AiRouter.get("/query/:queryId/items/:productId/evidence", async (req, res, next) => {
  try {
    const context = queryContexts.get(req.params.queryId);
    const locale = readLocale(req.query.locale ?? context?.locale);
    const detail = await getAmazon2023ProductDetail(req.params.productId, undefined, locale);
    if (!detail) {
      return sendError(res, 404, "DATASET_NOT_FOUND", "Amazon Reviews 2023 dataset has not been imported yet.");
    }
    if (!detail.product) {
      return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found.");
    }
    const dimension = typeof req.query.dimension === "string" ? req.query.dimension : undefined;
    const mode = dimension === "reviewStrengths" ? "strength" : dimension === "reviewRisks" ? "risk" : "all";
    return res.json({
      queryId: req.params.queryId,
      productId: detail.product.id,
      dimension: dimension ?? "all",
      evidence: reviewEvidence(detail.product, mode, dimension),
      overlay: buildEvidenceOverlay(detail.product, dimension),
    });
  } catch (error) {
    return next(error);
  }
});

amazon2023AiRouter.post("/stress-test", async (req, res, next) => {
  try {
    const parsed = stressTestBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "INVALID_REQUEST", "queryId, optional selectedProductIds, and stress weights are required.");
    }
    const context = queryContexts.get(parsed.data.queryId);
    if (!context) {
      return sendError(res, 404, "QUERY_NOT_FOUND", "AI query context has expired. Submit a new AI query.");
    }
    const selectedProductIds = parsed.data.selectedProductIds.length
      ? parsed.data.selectedProductIds
      : context.itemIds.slice(0, MAX_COMPARE_ITEMS);
    if (selectedProductIds.length < 2) {
      return sendError(res, 400, "INVALID_REQUEST", "At least two products are required for preference stress testing.");
    }
    const locale = readLocale(parsed.data.locale ?? context.locale);
    const details = await getAmazon2023ProductDetails(selectedProductIds.slice(0, MAX_COMPARE_ITEMS), undefined, locale);
    if (!details) {
      return sendError(res, 404, "DATASET_NOT_FOUND", "Amazon Reviews 2023 dataset has not been imported yet.");
    }
    const products = details.products.filter(Boolean) as NonNullable<ProductDetailResponse>[];
    if (products.length < 2) {
      return sendError(res, 404, "PRODUCT_NOT_FOUND", "At least two selected products must exist.");
    }
    return res.json({
      queryId: parsed.data.queryId,
      stressTest: buildStressTest(products, parsed.data.weights),
    });
  } catch (error) {
    return next(error);
  }
});

amazon2023AiRouter.post("/compare", async (req, res, next) => {
  try {
    const parsed = compareBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "INVALID_REQUEST", "queryId, 2-4 selectedProductIds, and activeDimensions are required.");
    }
    const context = queryContexts.get(parsed.data.queryId);
    const locale = readLocale(parsed.data.locale ?? context?.locale);
    const dimensions = context?.dimensions ?? buildDimensions();
    const activeDimensions = parsed.data.activeDimensions.length ? parsed.data.activeDimensions : dimensions.filter((dimension) => dimension.active).map((dimension) => dimension.key);
    const details = await getAmazon2023ProductDetails(parsed.data.selectedProductIds, undefined, locale);
    if (!details) {
      return sendError(res, 404, "DATASET_NOT_FOUND", "Amazon Reviews 2023 dataset has not been imported yet.");
    }
    const products = details.products.filter(Boolean) as NonNullable<ProductDetailResponse>[];
    if (products.length < 2) {
      return sendError(res, 404, "PRODUCT_NOT_FOUND", "At least two selected products must exist.");
    }
    return res.json({
      queryId: parsed.data.queryId,
      comparison: {
        dimensions: activeDimensions.map((key) => dimensions.find((dimension) => dimension.key === key)?.label ?? key),
        rows: products.map((product, index) => ({
          productId: product.id,
          visibleNumber: index + 1,
          name: product.name,
          imageUrl: product.imageUrl,
          cells: Object.fromEntries(activeDimensions.map((dimension) => [dimension, comparisonValue(product, dimension)])),
          evidenceAvailable: Object.fromEntries(activeDimensions.map((dimension) => [dimension, comparisonEvidenceAvailable(product, dimension)])),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
});

amazon2023AiRouter.post("/refine", async (req, res, next) => {
  try {
    const parsed = refineBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "INVALID_REQUEST", "queryId, command, selected products, and activeDimensions are required.");
    }
    const context = queryContexts.get(parsed.data.queryId);
    if (!context) {
      return sendError(res, 404, "QUERY_NOT_FOUND", "AI query context has expired. Submit a new AI query.");
    }
    const lens = await buildLensInterpretation(`${context.query} ${parsed.data.command}`, parsed.data.criteriaOverrides);
    const overrideFilters = lens.filters;
    const filters = {
      ...context.filters,
      ...Object.fromEntries(Object.entries(overrideFilters).filter(([, value]) => value !== undefined && value !== null)),
    };
    if (/more evidence|thin evidence|리뷰|근거/i.test(parsed.data.command)) {
      filters.ratingMin = Math.max(filters.ratingMin ?? 0, 4);
    }
    const locale = readLocale(parsed.data.locale ?? context.locale);
    const result = await searchAmazon2023Products({ ...filters, locale, limit: MAX_AI_ITEMS, offset: 0, sort: "rating_desc" });
    if (!result) {
      return sendError(res, 404, "DATASET_NOT_FOUND", "Amazon Reviews 2023 dataset has not been imported yet.");
    }
    const dimensions = buildDimensions().map((dimension) => ({
      ...dimension,
      active: parsed.data.activeDimensions.length ? parsed.data.activeDimensions.includes(dimension.key) : dimension.active,
    }));
    const parsedCriteria = mergeParsedCriteria(buildParsedCriteria(filters, `${context.query} ${parsed.data.command}`), lens.criteriaHints, lens.source === "gemini" ? "gemini_natural_language" : "rule_natural_language");
    let items = result.items.map(attachDecisionEvidence);
    if (shouldDiversifyUngenderedResults(filters, context.query)) {
      items = diversifyUngenderedResults(items);
    }
    const previous = new Set(context.itemIds);
    const nextIds = new Set(items.map((item) => item.id));
    storeContext(parsed.data.queryId, {
      ...context,
      locale,
      filters,
      dimensions,
      parsedCriteria,
      itemIds: items.map((item) => item.id),
      createdAt: Date.now(),
    });
    return res.json({
      queryId: parsed.data.queryId,
      status: "ok",
      updateSummary: `Updated lens: ${parsed.data.command}`,
      removedItems: [...previous].filter((id) => !nextIds.has(id)).slice(0, 4).map((productId) => ({ productId, reason: "Removed by refined Amazon 2023 filters." })),
      addedItems: items.filter((item) => !previous.has(item.id)).slice(0, 4).map((item) => ({ productId: item.id, reason: "Added by refined Amazon 2023 filters." })),
      decomposition: buildDecompositionDiagnostics(lens, filters, result.pagination.total),
      parsedCriteria,
      clarifications: [],
      comparisonDimensions: dimensions,
      items,
      actions: [{ type: "undo", label: "Undo", command: "undo_last_refine" }],
    });
  } catch (error) {
    return next(error);
  }
});
