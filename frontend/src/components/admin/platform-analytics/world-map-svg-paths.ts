/**
 * Country center coordinates for bubble pin overlay on the official
 * SVG World Map (viewBox: 0 0 2754 1398).
 *
 * Source: https://github.com/prodypanda/SVG-World-Map-with-labels
 * (CC BY-SA 3.0 / MIT — Al MacDonald, Fritz Lekschas, ahuseyn)
 *
 * These are approximate visual centers for each ISO 3166-1 alpha-2
 * country code, used to position pulsating bubble indicators.
 */

export const COUNTRY_CENTERS: Record<string, { cx: number; cy: number }> = {
  // ── Africa ──────────────────────────────────────────────────────
  tn: { cx: 1396, cy: 430 },   // Tunisia
  dz: { cx: 1312, cy: 470 },   // Algeria
  ma: { cx: 1240, cy: 450 },   // Morocco
  eg: { cx: 1490, cy: 470 },   // Egypt
  ly: { cx: 1400, cy: 490 },   // Libya
  ng: { cx: 1330, cy: 620 },   // Nigeria
  za: { cx: 1490, cy: 880 },   // South Africa
  ke: { cx: 1560, cy: 680 },   // Kenya
  et: { cx: 1560, cy: 630 },   // Ethiopia
  gh: { cx: 1270, cy: 620 },   // Ghana
  sn: { cx: 1200, cy: 590 },   // Senegal
  ci: { cx: 1250, cy: 630 },   // Côte d'Ivoire
  cm: { cx: 1380, cy: 640 },   // Cameroon
  cd: { cx: 1470, cy: 710 },   // DR Congo
  tz: { cx: 1550, cy: 730 },   // Tanzania
  sd: { cx: 1500, cy: 580 },   // Sudan
  ao: { cx: 1410, cy: 770 },   // Angola
  mz: { cx: 1560, cy: 820 },   // Mozambique
  mg: { cx: 1600, cy: 820 },   // Madagascar
  ug: { cx: 1520, cy: 680 },   // Uganda
  ml: { cx: 1260, cy: 560 },   // Mali
  ne: { cx: 1340, cy: 560 },   // Niger
  bf: { cx: 1290, cy: 590 },   // Burkina Faso
  td: { cx: 1420, cy: 570 },   // Chad
  gn: { cx: 1210, cy: 610 },   // Guinea
  rw: { cx: 1510, cy: 710 },   // Rwanda
  bj: { cx: 1310, cy: 620 },   // Benin
  tg: { cx: 1300, cy: 620 },   // Togo
  sl: { cx: 1200, cy: 630 },   // Sierra Leone
  lr: { cx: 1215, cy: 640 },   // Liberia
  mr: { cx: 1220, cy: 530 },   // Mauritania
  er: { cx: 1550, cy: 590 },   // Eritrea
  so: { cx: 1600, cy: 650 },   // Somalia
  ss: { cx: 1500, cy: 640 },   // South Sudan
  cf: { cx: 1430, cy: 640 },   // Central African Republic
  cg: { cx: 1420, cy: 710 },   // Republic of Congo
  ga: { cx: 1380, cy: 690 },   // Gabon
  gq: { cx: 1370, cy: 680 },   // Equatorial Guinea
  bi: { cx: 1510, cy: 730 },   // Burundi
  mw: { cx: 1550, cy: 790 },   // Malawi
  zm: { cx: 1490, cy: 790 },   // Zambia
  zw: { cx: 1510, cy: 830 },   // Zimbabwe
  bw: { cx: 1470, cy: 850 },   // Botswana
  na: { cx: 1420, cy: 840 },   // Namibia
  ls: { cx: 1500, cy: 890 },   // Lesotho
  sz: { cx: 1530, cy: 870 },   // Eswatini
  dj: { cx: 1580, cy: 620 },   // Djibouti
  gm: { cx: 1195, cy: 590 },   // Gambia
  gw: { cx: 1200, cy: 600 },   // Guinea-Bissau
  cv: { cx: 1145, cy: 580 },   // Cabo Verde
  km: { cx: 1580, cy: 770 },   // Comoros
  mu: { cx: 1640, cy: 830 },   // Mauritius
  st: { cx: 1340, cy: 680 },   // São Tomé and Príncipe

  // ── Europe ──────────────────────────────────────────────────────
  fr: { cx: 1310, cy: 330 },   // France
  de: { cx: 1370, cy: 295 },   // Germany
  es: { cx: 1260, cy: 365 },   // Spain
  it: { cx: 1380, cy: 350 },   // Italy
  gb: { cx: 1280, cy: 270 },   // United Kingdom
  pt: { cx: 1230, cy: 370 },   // Portugal
  nl: { cx: 1330, cy: 280 },   // Netherlands
  be: { cx: 1325, cy: 295 },   // Belgium
  ch: { cx: 1350, cy: 320 },   // Switzerland
  at: { cx: 1390, cy: 315 },   // Austria
  se: { cx: 1400, cy: 215 },   // Sweden
  no: { cx: 1370, cy: 195 },   // Norway
  dk: { cx: 1360, cy: 260 },   // Denmark
  fi: { cx: 1450, cy: 200 },   // Finland
  ie: { cx: 1245, cy: 270 },   // Ireland
  pl: { cx: 1430, cy: 280 },   // Poland
  cz: { cx: 1400, cy: 300 },   // Czech Republic
  ro: { cx: 1460, cy: 320 },   // Romania
  hu: { cx: 1430, cy: 315 },   // Hungary
  gr: { cx: 1445, cy: 370 },   // Greece
  bg: { cx: 1465, cy: 340 },   // Bulgaria
  rs: { cx: 1440, cy: 330 },   // Serbia
  hr: { cx: 1410, cy: 325 },   // Croatia
  sk: { cx: 1430, cy: 300 },   // Slovakia
  ua: { cx: 1500, cy: 290 },   // Ukraine
  lt: { cx: 1455, cy: 255 },   // Lithuania
  lv: { cx: 1460, cy: 245 },   // Latvia
  ee: { cx: 1460, cy: 230 },   // Estonia
  si: { cx: 1395, cy: 325 },   // Slovenia
  ba: { cx: 1420, cy: 335 },   // Bosnia and Herzegovina
  al: { cx: 1435, cy: 360 },   // Albania
  me: { cx: 1430, cy: 340 },   // Montenegro
  mk: { cx: 1445, cy: 350 },   // North Macedonia
  md: { cx: 1480, cy: 310 },   // Moldova
  by: { cx: 1475, cy: 260 },   // Belarus
  lu: { cx: 1335, cy: 300 },   // Luxembourg
  is: { cx: 1175, cy: 180 },   // Iceland
  mt: { cx: 1395, cy: 385 },   // Malta
  cy: { cx: 1490, cy: 385 },   // Cyprus
  li: { cx: 1360, cy: 315 },   // Liechtenstein
  mc: { cx: 1340, cy: 340 },   // Monaco
  sm: { cx: 1380, cy: 340 },   // San Marino
  va: { cx: 1375, cy: 350 },   // Vatican City
  ad: { cx: 1300, cy: 350 },   // Andorra

  // ── Asia ─────────────────────────────────────────────────────────
  tr: { cx: 1520, cy: 370 },   // Turkey
  sa: { cx: 1570, cy: 480 },   // Saudi Arabia
  ae: { cx: 1620, cy: 480 },   // UAE
  ir: { cx: 1630, cy: 420 },   // Iran
  iq: { cx: 1580, cy: 420 },   // Iraq
  jo: { cx: 1540, cy: 440 },   // Jordan
  il: { cx: 1525, cy: 440 },   // Israel
  lb: { cx: 1530, cy: 420 },   // Lebanon
  sy: { cx: 1550, cy: 400 },   // Syria
  ye: { cx: 1600, cy: 530 },   // Yemen
  om: { cx: 1650, cy: 490 },   // Oman
  kw: { cx: 1600, cy: 440 },   // Kuwait
  qa: { cx: 1620, cy: 470 },   // Qatar
  bh: { cx: 1610, cy: 460 },   // Bahrain
  in: { cx: 1750, cy: 500 },   // India
  cn: { cx: 1880, cy: 400 },   // China
  jp: { cx: 2060, cy: 370 },   // Japan
  kr: { cx: 2010, cy: 380 },   // South Korea
  kp: { cx: 2005, cy: 360 },   // North Korea
  pk: { cx: 1700, cy: 430 },   // Pakistan
  af: { cx: 1690, cy: 400 },   // Afghanistan
  bd: { cx: 1790, cy: 480 },   // Bangladesh
  mm: { cx: 1820, cy: 510 },   // Myanmar
  th: { cx: 1850, cy: 540 },   // Thailand
  vn: { cx: 1890, cy: 530 },   // Vietnam
  my: { cx: 1870, cy: 620 },   // Malaysia
  id: { cx: 1950, cy: 680 },   // Indonesia
  ph: { cx: 1970, cy: 560 },   // Philippines
  sg: { cx: 1870, cy: 640 },   // Singapore
  kh: { cx: 1870, cy: 560 },   // Cambodia
  la: { cx: 1855, cy: 520 },   // Laos
  np: { cx: 1760, cy: 460 },   // Nepal
  lk: { cx: 1760, cy: 560 },   // Sri Lanka
  kz: { cx: 1680, cy: 320 },   // Kazakhstan
  uz: { cx: 1680, cy: 360 },   // Uzbekistan
  tm: { cx: 1650, cy: 370 },   // Turkmenistan
  kg: { cx: 1720, cy: 360 },   // Kyrgyzstan
  tj: { cx: 1710, cy: 375 },   // Tajikistan
  mn: { cx: 1880, cy: 330 },   // Mongolia
  ge: { cx: 1570, cy: 340 },   // Georgia
  am: { cx: 1580, cy: 355 },   // Armenia
  az: { cx: 1600, cy: 350 },   // Azerbaijan
  tw: { cx: 1990, cy: 470 },   // Taiwan
  bt: { cx: 1790, cy: 460 },   // Bhutan
  mv: { cx: 1720, cy: 590 },   // Maldives
  bn: { cx: 1920, cy: 620 },   // Brunei
  tl: { cx: 2020, cy: 720 },   // Timor-Leste

  // ── Americas ────────────────────────────────────────────────────
  us: { cx: 550, cy: 380 },    // United States
  ca: { cx: 500, cy: 250 },    // Canada
  mx: { cx: 440, cy: 490 },    // Mexico
  br: { cx: 700, cy: 740 },    // Brazil
  ar: { cx: 660, cy: 870 },    // Argentina
  co: { cx: 620, cy: 640 },    // Colombia
  cl: { cx: 640, cy: 860 },    // Chile
  pe: { cx: 620, cy: 730 },    // Peru
  ve: { cx: 660, cy: 620 },    // Venezuela
  ec: { cx: 600, cy: 680 },    // Ecuador
  bo: { cx: 660, cy: 780 },    // Bolivia
  py: { cx: 690, cy: 810 },    // Paraguay
  uy: { cx: 710, cy: 860 },    // Uruguay
  gy: { cx: 690, cy: 640 },    // Guyana
  sr: { cx: 710, cy: 640 },    // Suriname
  gf: { cx: 725, cy: 640 },    // French Guiana
  pa: { cx: 560, cy: 610 },    // Panama
  cr: { cx: 540, cy: 610 },    // Costa Rica
  ni: { cx: 530, cy: 580 },    // Nicaragua
  hn: { cx: 520, cy: 570 },    // Honduras
  sv: { cx: 510, cy: 580 },    // El Salvador
  gt: { cx: 490, cy: 570 },    // Guatemala
  bz: { cx: 505, cy: 555 },    // Belize
  cu: { cx: 560, cy: 500 },    // Cuba
  ht: { cx: 610, cy: 520 },    // Haiti
  do: { cx: 630, cy: 520 },    // Dominican Republic
  jm: { cx: 580, cy: 530 },    // Jamaica
  tt: { cx: 680, cy: 610 },    // Trinidad and Tobago
  bs: { cx: 590, cy: 480 },    // Bahamas
  bb: { cx: 685, cy: 580 },    // Barbados

  // ── Oceania ─────────────────────────────────────────────────────
  au: { cx: 2120, cy: 830 },   // Australia
  nz: { cx: 2310, cy: 910 },   // New Zealand
  pg: { cx: 2200, cy: 720 },   // Papua New Guinea
  fj: { cx: 2370, cy: 800 },   // Fiji

  // ── Russia & Central Eurasia ────────────────────────────────────
  ru: { cx: 1700, cy: 240 },   // Russia
};
