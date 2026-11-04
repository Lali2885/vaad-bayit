import { useState, useEffect, useRef } from 'react';
import { Home, ReceiptText, Building, ChevronRight, Mail, Bell, Plus, Pencil, Trash2, X, Check, Settings, Upload, ImageOff, MessageSquare, Banknote, LogOut, LayoutDashboard, Wallet, TrendingDown, Calendar, FileText, Zap, CreditCard, RefreshCw, ArrowRightLeft, FileDown, Users, ChevronDown } from 'lucide-react';
import { supabase, testConnection } from './supabase';

const INITIAL_SETTINGS = {
  buildingName: 'ועד בית קדושת לוי',
  address: 'קדושת לוי 85, ירושלים',
  managers: [{ id: 1, name: '', phone: '', email: '', role: 'יו"ר הוועד' }],
  logo: null,
  feeHistory: [
    { id: 1, amount: 40, fromMonth: 'תשרי',  fromYear: 'תשפ״ו', note: '' },
    { id: 2, amount: 80, fromMonth: 'תמוז',  fromYear: 'תשפ״ו', note: 'עדכון תעריף' },
  ],
  templates: [
    { id: 1, name: 'תזכורת תשלום', body: 'שלום {שם},\nזוהי תזכורת לתשלום דמי ועד בית עבור חודש {חודש}.\nסכום לתשלום: {סכום}₪\nאנא שלמו עד תאריך {תאריך}.\nבברכה, {מנהל}' },
    { id: 2, name: 'מכתב לדיירים', body: 'לכבוד דיירי הבניין,\n\nנשמח להודיעכם כי...\n\nבברכה,\n{מנהל}\n{טלפון}' },
  ],
  electricityExpenses: [],
  cleaningExpenses: [],
  regularExpenses: [],
  extraordinaryExpenses: [],
  cashOverride: null,
  cashBaseline: null,
  expensesResetAt: 0,
  emailSettings: {
    senderName: 'ועד הבית',
    senderEmail: '',
    serviceId: '',
    templateId: '',
    publicKey: '',
  },
};

const HEBREW_MONTHS = ['תשרי','חשוון','כסלו','טבת','שבט','אדר','אדר א׳','אדר ב׳','ניסן','אייר','סיוון','תמוז','אב','אלול'];
const TWELVE_MONTHS = ['תשרי','חשוון','כסלו','טבת','שבט','אדר','ניסן','אייר','סיוון','תמוז','אב','אלול'];

function numericToHebrewYear(hebrewYear) {
  const y = hebrewYear % 1000;
  const H = ['','ק','ר','ש','ת','תק','תר','תש','תת','תתק'];
  const T = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'];
  const O = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  let h = Math.floor(y / 100), t = Math.floor((y % 100) / 10), o = y % 10;
  if (t === 1 && (o === 5 || o === 6)) { t = 9; o = o === 5 ? 6 : 7; }
  const letters = H[h] + T[t] + O[o];
  return letters.length === 1 ? letters + '׳' : letters.slice(0, -1) + '״' + letters.slice(-1);
}

function getCurrentHebrewDate() {
  const now = new Date();
  const numericMonth = parseInt(new Intl.DateTimeFormat('en-u-ca-hebrew', { month: 'numeric' }).format(now));
  const numericYear = parseInt(new Intl.DateTimeFormat('en-u-ca-hebrew', { year: 'numeric' }).format(now));
  const isLeap = ((7 * numericYear) + 1) % 19 < 7;
  const months = isLeap
    ? ['תשרי','חשוון','כסלו','טבת','שבט','אדר א׳','אדר ב׳','ניסן','אייר','סיוון','תמוז','אב','אלול']
    : ['תשרי','חשוון','כסלו','טבת','שבט','אדר','ניסן','אייר','סיוון','תמוז','אב','אלול'];
  const numericDay = parseInt(new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric' }).format(now));
  const hebDays = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','יא','יב','יג','יד','טו','טז','יז','יח','יט','כ','כא','כב','כג','כד','כה','כו','כז','כח','כט','ל'];
  return { month: months[numericMonth - 1], year: numericToHebrewYear(numericYear), numericYear, day: hebDays[numericDay - 1] || '' };
}


const { year: CURRENT_HEBREW_YEAR } = getCurrentHebrewDate();
const HEBREW_YEARS = (() => {
  const { numericYear } = getCurrentHebrewDate();
  const years = [];
  for (let i = -10; i <= 2; i++) years.push(numericYear + i);
  return years.map(numericToHebrewYear);
})();

const HEBREW_YEAR_TO_NUMERIC = (() => {
  const { numericYear } = getCurrentHebrewDate();
  const years = [];
  for (let i = -10; i <= 2; i++) years.push(numericYear + i);
  return Object.fromEntries(years.map(n => [numericToHebrewYear(n), n]));
})();

// שנה מעוברת (כמו תשפ"ז) - 13 חודשים עם אדר א׳/אדר ב׳ במקום אדר יחיד
function isHebrewLeapYear(numericYear) {
  return ((7 * numericYear) + 1) % 19 < 7;
}
function monthsForNumericYear(numericYear) {
  return isHebrewLeapYear(numericYear)
    ? ['תשרי','חשוון','כסלו','טבת','שבט','אדר א׳','אדר ב׳','ניסן','אייר','סיוון','תמוז','אב','אלול']
    : TWELVE_MONTHS;
}
function monthsForYear(hebrewYearStr) {
  const numericYear = HEBREW_YEAR_TO_NUMERIC[hebrewYearStr];
  return numericYear ? monthsForNumericYear(numericYear) : TWELVE_MONTHS;
}

function isFutureMonth(month, year) {
  const { month: curMonth, year: curYear } = getCurrentHebrewDate();
  const yearNum = HEBREW_YEAR_TO_NUMERIC[year];
  const curYearNum = HEBREW_YEAR_TO_NUMERIC[curYear];
  if (yearNum !== curYearNum) return yearNum > curYearNum;
  const months = monthsForYear(curYear);
  return months.indexOf(month) > months.indexOf(curMonth);
}

function _hebElapsed(year) {
  const m = Math.floor((235 * year - 234) / 19);
  const parts = 12084 + 13753 * m;
  let d = m * 29 + Math.floor(parts / 25920);
  if ((3 * (d + 1)) % 7 < 3) d++;
  return d;
}
function _hebYearDays(year) { return _hebElapsed(year + 1) - _hebElapsed(year); }
function _hebDaysInMonth(year, month) {
  const leap = ((7 * year) + 1) % 19 < 7;
  const yd = _hebYearDays(year);
  if (month === 1) return 30;
  if (month === 2) return yd % 10 === 5 ? 30 : 29;
  if (month === 3) return yd % 10 === 3 ? 29 : 30;
  if (month === 4) return 29;
  if (month === 5) return 30;
  if (month === 6) return leap ? 30 : 29;
  if (month === 7) return leap ? 29 : 30;
  if (month === 8) return leap ? 30 : 29;
  if (month === 9) return leap ? 29 : 30;
  if (month === 10) return leap ? 30 : 29;
  if (month === 11) return leap ? 29 : 30;
  if (month === 12) return leap ? 30 : 29;
  return 29;
}
const _REF_ELAPSED = _hebElapsed(5786);
const _REF_GREG = new Date(2025, 8, 23);
const GREG_MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function hebrewToGregorian(numericYear, monthNum, day) {
  let offset = 0;
  for (let m = 1; m < monthNum; m++) offset += _hebDaysInMonth(numericYear, m);
  const diff = _hebElapsed(numericYear) + offset + (day - 1) - _REF_ELAPSED;
  return new Date(_REF_GREG.getTime() + diff * 86400000);
}

function getHebrewMonthFirstDayOfWeek(monthName, yearStr) {
  const numericYear = HEBREW_YEAR_TO_NUMERIC[yearStr];
  if (!numericYear) return 0;
  const isLeap = ((7 * numericYear) + 1) % 19 < 7;
  const allMonths = isLeap
    ? ['תשרי','חשוון','כסלו','טבת','שבט','אדר א׳','אדר ב׳','ניסן','אייר','סיוון','תמוז','אב','אלול']
    : ['תשרי','חשוון','כסלו','טבת','שבט','אדר','ניסן','אייר','סיוון','תמוז','אב','אלול'];
  const targetName = (monthName === 'אדר' && isLeap) ? 'אדר ב׳' : monthName;
  const targetMonthNum = allMonths.indexOf(targetName) + 1;
  if (targetMonthNum === 0) return 0;
  let daysOffset = 0;
  for (let m = 1; m < targetMonthNum; m++) daysOffset += _hebDaysInMonth(numericYear, m);
  return (_hebElapsed(numericYear) + daysOffset + 1) % 7;
}


// מחרוזת JSON עם מפתחות ממוינים - כדי לזהות שעדכון שחזר מהשרת (realtime) הוא בדיוק מה
// שאנחנו עצמנו כתבנו (Postgres jsonb משנה את סדר המפתחות, אז השוואה רגילה לא מספיקה)
function stableStringify(value) {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).filter(k => value[k] !== undefined).sort()
      .map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
  }
  return JSON.stringify(value) ?? 'null';
}

const TENANTS_VERSION = 'v5-apt1-paid';

const INITIAL_TENANTS = [
  { id: 1,  name: 'קרמרסקי', apt: '1', phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: '', charges: [],
    payments: [
      { id: 101, hebrewMonth: 'תשרי',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40, paidAmount: 40 },
      { id: 102, hebrewMonth: 'חשוון', hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40, paidAmount: 40 },
      { id: 103, hebrewMonth: 'כסלו',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40, paidAmount: 40 },
      { id: 104, hebrewMonth: 'טבת',   hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40, paidAmount: 40 },
      { id: 105, hebrewMonth: 'שבט',   hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40, paidAmount: 40 },
      { id: 106, hebrewMonth: 'אדר',   hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40, paidAmount: 40 },
      { id: 107, hebrewMonth: 'ניסן',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40, paidAmount: 40 },
      { id: 108, hebrewMonth: 'אייר',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40, paidAmount: 40 },
      { id: 109, hebrewMonth: 'סיוון', hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40, paidAmount: 40 },
      { id: 110, hebrewMonth: 'תמוז',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 80, paidAmount: 80 },
      { id: 111, hebrewMonth: 'אב',    hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 80, paidAmount: 80 },
      { id: 112, hebrewMonth: 'אלול',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 80, paidAmount: 80 },
    ],
  },
  { id: 2,  name: 'ויינברגר',         apt: '2',  phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: '', payments: [], charges: [] },
  { id: 3,  name: 'שטרן', apt: '3', phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: '', charges: [],
    payments: [
      { id: 1,  hebrewMonth: 'תשרי',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 2,  hebrewMonth: 'חשוון', hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 3,  hebrewMonth: 'כסלו',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 4,  hebrewMonth: 'טבת',   hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 5,  hebrewMonth: 'שבט',   hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 6,  hebrewMonth: 'אדר',   hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 7,  hebrewMonth: 'ניסן',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 8,  hebrewMonth: 'אייר',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 9,  hebrewMonth: 'סיוון', hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 10, hebrewMonth: 'תמוז',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 80 },
      { id: 11, hebrewMonth: 'אב',    hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 80 },
      { id: 12, hebrewMonth: 'אלול',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 80 },
    ],
  },
  { id: 4,  name: 'גיא',              apt: '4',  phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: '', payments: [], charges: [] },
  { id: 5,  name: 'פרידמן',           apt: '5',  phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: '', payments: [], charges: [] },
  { id: 6,  name: 'הרמן',             apt: '6',  phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: '', payments: [], charges: [] },
  { id: 7,  name: 'שפירא', apt: '7', phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: '', charges: [],
    payments: [
      { id: 1,  hebrewMonth: 'תשרי',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 2,  hebrewMonth: 'חשוון', hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 3,  hebrewMonth: 'כסלו',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 4,  hebrewMonth: 'טבת',   hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 5,  hebrewMonth: 'שבט',   hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 6,  hebrewMonth: 'אדר',   hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 7,  hebrewMonth: 'ניסן',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 8,  hebrewMonth: 'אייר',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 9,  hebrewMonth: 'סיוון', hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 40 },
      { id: 10, hebrewMonth: 'תמוז',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 80 },
      { id: 11, hebrewMonth: 'אב',    hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 80 },
      { id: 12, hebrewMonth: 'אלול',  hebrewYear: CURRENT_HEBREW_YEAR, status: 'שולם', amount: 80 },
    ],
  },
  { id: 8,  name: 'סלנט',             apt: '8',  phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: '', payments: [], charges: [] },
  { id: 9,  name: 'פריזנד',           apt: '9',  phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: '', payments: [], charges: [] },
  { id: 10, name: 'ליווי',            apt: '10', phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: '', payments: [], charges: [] },
  { id: 11, name: 'הלמן',             apt: '11', phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: '', payments: [], charges: [] },
  { id: 12, name: 'פריד',             apt: '12', phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: '', payments: [], charges: [] },
  { id: 13, name: 'דירה ליוי',        apt: '13', phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: 'ליוי', payments: [], charges: [] },
  { id: 14, name: 'דירה ליוי',        apt: '14', phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: 'ליוי', payments: [], charges: [] },
  { id: 15, name: 'דירה הלמן',        apt: '15', phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: 'הלמן', payments: [], charges: [] },
  { id: 16, name: 'דירה קטנה פריד',  apt: '16', phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 60, feePercent: 75, owner: 'פריד', payments: [], charges: [] },
  { id: 17, name: 'דירה גדולה פריד', apt: '17', phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: 'פריד', payments: [], charges: [] },
];

// מצב הדגמה (קובץ תצוגה מקדימה בלבד, נבנה עם VITE_DEMO=1): נתוני דוגמה, בלי התחברות ובלי שום גישה לשרת
const DEMO = import.meta.env.VITE_DEMO === '1';

// 12 החודשים העבריים האחרונים, מהישן לחדש (כולל החודש הנוכחי)
function lastHebrewMonths(count) {
  const { month, numericYear } = getCurrentHebrewDate();
  let y = numericYear;
  let idx = monthsForNumericYear(y).indexOf(month);
  const out = [];
  for (let i = 0; i < count; i++) {
    out.unshift({ month: monthsForNumericYear(y)[idx], year: numericToHebrewYear(y) });
    idx--;
    if (idx < 0) { y--; idx = monthsForNumericYear(y).length - 1; }
  }
  return out;
}

function buildDemoTenants() {
  const { month, year, numericYear } = getCurrentHebrewDate();
  const prevYear = numericToHebrewYear(numericYear - 1);
  const owners = { '13': 10, '14': 10, '15': 11, '16': 12, '17': 12 };
  const owed = { '5': 1, '8': 3, '12': 2, '13': 2, '16': 4, '17': 1 };
  const curMonths = monthsForYear(year);
  const timeline = [
    ...monthsForYear(prevYear).map(m => ({ m, y: prevYear })),
    ...curMonths.slice(0, curMonths.indexOf(month) + 1).map(m => ({ m, y: year })),
  ];
  return INITIAL_TENANTS.map(t => {
    const fee = Math.round(80 * (Number(t.feePercent || 100) / 100));
    const n = owed[t.apt] || 0;
    const payments = timeline.map(({ m, y }, i) => {
      const isDebt = i >= timeline.length - n;
      return { id: i + 1, hebrewMonth: m, hebrewYear: y, amount: fee, paidAmount: isDebt ? 0 : fee, status: isDebt ? 'חוב' : 'שולם', occupantName: t.name };
    });
    const charges = t.apt === '16' ? [{ id: 901, description: 'תיקון דלת כניסה', amount: 100, status: 'חוב', note: '', occupantName: t.name, billTo: 'owner' }] : [];
    return { ...t, payments, charges, ownerId: owners[t.apt] || '', phone: '', email: '' };
  });
}

function buildDemoSettings() {
  const months = lastHebrewMonths(12);
  const cleaningExpenses = months.map((mm, i) => ({ id: 1000 + i, description: 'ניקיון חדר מדרגות', totalAmount: 600, paidAmount: 600, perTenantAmount: 0, hebrewDay: 'א', hebrewMonth: mm.month, hebrewYear: mm.year, note: '' }));
  const electricityExpenses = months.filter((_, i) => i % 2 === 1).map((mm, i) => ({
    id: 2000 + i, fromGreg: '', fromDay: 'א', fromMonth: mm.month, fromYear: mm.year, toGreg: '', toDay: 'כט', toMonth: mm.month, toYear: mm.year,
    totalAmount: 460 + i * 25, paymentMethod: i === 5 ? '' : 'הוראת קבע', paymentGreg: '', paymentDay: 'ה', paymentMonth: mm.month, paymentYear: mm.year, note: '',
  }));
  return { ...INITIAL_SETTINGS, cleaningExpenses, electricityExpenses };
}

// חשבון ה-Gmail של הוועד - ממנו נפתחים המיילים במחשב
const GMAIL_ACCOUNT = 'vaad.bayitk85@gmail.com';

const PAYMENT_METHODS = ['מזומן', 'ביט', 'פייבוקס', 'העברה בנקאית', 'צ׳ק', 'הוראת קבע', 'אחר'];

function monthSortKey(month, year) {
  return (HEBREW_YEAR_TO_NUMERIC[year] || 0) * 100 + monthsForYear(year).indexOf(month);
}

// ===== דירות מושכרות =====
// עיקרון: כל חוב רשום במקום אחד - בכרטיס הדירה שהוא שייך לה. כרטיס בעל הדירה רק מרכז ומציג.
// חריג ישן: חיובי הוצאות חריגות שנוצרו בעבר "על בעל הדירה" רשומים פיזית אצלו עם billedApartmentId -
// הם לא מוזזים (כדי לא לגעת בנתונים), אלא מוצגים ומחושבים תחת הדירה שהם שייכים לה.

// החיובים ששייכים לדירה: { c: החיוב, hostId: הכרטיס שבו הוא רשום בפועל }
function unitCharges(unit, all) {
  const exists = id => all.some(x => x.id === id);
  const own = (unit.charges || [])
    .filter(c => !c.billedApartmentId || c.billedApartmentId === unit.id || !exists(c.billedApartmentId))
    .map(c => ({ c, hostId: unit.id }));
  const elsewhere = all
    .filter(x => x.id !== unit.id)
    .flatMap(x => (x.charges || []).filter(c => c.billedApartmentId === unit.id).map(c => ({ c, hostId: x.id })));
  return [...own, ...elsewhere];
}

// עותק של הדירה עם החיובים ששייכים לה (לחישובים ולמסמכים - לא נשמר)
function unitView(unit, all) {
  return { ...unit, charges: unitCharges(unit, all).map(x => x.c) };
}

function unitDebt(unit, all) {
  return calcDebt(unitView(unit, all));
}

function ownedUnits(owner, all) {
  return all.filter(t => t.ownerId === owner.id);
}

// כמה המשלם צריך לשלם: דירה מושכרת - החוב שלה; בעל דירה - החוב שלו + של כל הדירות שלו
function payerTotal(t, all) {
  if (t.ownerId) return unitDebt(t, all);
  return unitDebt(t, all) + ownedUnits(t, all).reduce((s, a) => s + unitDebt(a, all), 0);
}

function unitDebtItems(unit, all) {
  const monthly = unit.payments
    .filter(p => p.status === 'חוב' && p.amount - (p.paidAmount || 0) > 0)
    .map(p => ({ key: `p-${unit.id}-${p.id}`, kind: 'payment', hostId: unit.id, unitId: unit.id, refId: p.id,
      label: `ועד בית — ${p.hebrewMonth} ${p.hebrewYear}`, due: p.amount - (p.paidAmount || 0), partial: true,
      sortKey: monthSortKey(p.hebrewMonth, p.hebrewYear) }));
  const charges = unitCharges(unit, all)
    .filter(({ c }) => c.status === 'חוב' && c.amount > 0)
    .map(({ c, hostId }) => ({ key: `c-${hostId}-${c.id}`, kind: 'charge', hostId, unitId: unit.id, refId: c.id,
      label: c.description || 'חיוב', due: c.amount, partial: false, sortKey: Infinity }));
  return [...monthly, ...charges];
}

// כל החובות שתשלום מהמשלם הזה יכול לכסות, לפי סדר תשלום: קודם דמי ועד מהחודש הכי ישן
// (בכל הדירות שלו יחד), אחר כך חיובים. דירה מושכרת - רק החובות שלה.
function receiptDebtItems(payer, all) {
  const units = payer.ownerId ? [payer] : [payer, ...ownedUnits(payer, all)];
  const items = units.flatMap(u => unitDebtItems(u, all));
  return items.sort((a, b) => a.sortKey - b.sortKey);
}

// חלוקת סכום על החובות שנבחרו לפי הסדר. חיוב (שאין לו תשלום חלקי) מכוסה רק אם יש מספיק לכולו.
function allocateAmount(items, checkedKeys, amount) {
  let left = amount;
  const alloc = [];
  for (const it of items) {
    if (!checkedKeys.has(it.key) || left <= 0) continue;
    if (it.partial) { const a = Math.min(left, it.due); alloc.push({ ...it, amount: a }); left -= a; }
    else if (left >= it.due) { alloc.push({ ...it, amount: it.due }); left -= it.due; }
  }
  return { alloc, left };
}

// החודשים הבאים אחרי החודש הנוכחי (לתשלום מראש)
function nextMonthsFromNow(count) {
  const { month, numericYear } = getCurrentHebrewDate();
  let y = numericYear;
  let idx = monthsForNumericYear(y).indexOf(month);
  const out = [];
  while (out.length < count) {
    idx++;
    if (idx >= monthsForNumericYear(y).length) { y++; idx = 0; }
    const yearStr = numericToHebrewYear(y);
    if (!HEBREW_YEARS.includes(yearStr)) break;
    out.push({ month: monthsForNumericYear(y)[idx], year: yearStr });
  }
  return out;
}

// רכיב יצירת האקסל (ExcelJS) נטען רק כשלוחצים "הורד אקסל" - כדי לא להגדיל את האפליקציה
let excelJsPromise = null;
function loadExcelJS() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  if (!excelJsPromise) {
    excelJsPromise = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
      el.onload = () => resolve(window.ExcelJS);
      el.onerror = () => { excelJsPromise = null; reject(new Error('טעינת רכיב האקסל נכשלה - בדקי חיבור לאינטרנט ונסי שוב')); };
      document.head.appendChild(el);
    });
  }
  return excelJsPromise;
}

function fmtGregDate(iso) {
  return iso ? iso.split('-').reverse().join('/') : '';
}

function calcDebt(tenant) {
  const fromPayments = tenant.payments.filter(p => p.status === 'חוב').reduce((sum, p) => sum + p.amount - (p.paidAmount || 0), 0);
  const fromCharges = (tenant.charges || []).filter(c => c.status === 'חוב').reduce((sum, c) => sum + c.amount, 0);
  return fromPayments + fromCharges;
}

function calcCredit(tenant) {
  return tenant.payments.filter(p => p.status === 'זכות').reduce((sum, p) => sum + (p.paidAmount || 0), 0);
}

function calcDebtByOccupant(tenant) {
  const map = new Map();
  const add = (occupantName, amount) => {
    const key = occupantName || tenant.name || 'לא ידוע';
    map.set(key, (map.get(key) || 0) + amount);
  };
  tenant.payments.filter(p => p.status === 'חוב').forEach(p => add(p.occupantName, p.amount - (p.paidAmount || 0)));
  (tenant.charges || []).filter(c => c.status === 'חוב').forEach(c => add(c.occupantName, c.amount));
  return [...map.entries()].filter(([, amount]) => amount > 0);
}


function getOccupantNames(tenant) {
  return [...new Set([
    ...tenant.payments.map(p => p.occupantName || tenant.name),
    ...(tenant.charges || []).map(c => c.occupantName || tenant.name),
  ])];
}

function filterTenantByOccupant(tenant, occupant) {
  if (!occupant) return tenant;
  const matches = x => (x.occupantName || tenant.name) === occupant;
  return { ...tenant, payments: tenant.payments.filter(matches), charges: (tenant.charges || []).filter(matches) };
}

const EMPTY_TENANT = { name: '', apt: '', phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 0, owner: '', ownerId: '', payments: [], charges: [], notes: '' };

const HEB_DAYS = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','יא','יב','יג','יד','טו','טז','יז','יח','יט','כ','כא','כב','כג','כד','כה','כו','כז','כח','כט','ל'];
const MONTH_DAYS = {'תשרי':30,'חשוון':29,'כסלו':30,'טבת':29,'שבט':30,'אדר':29,'אדר א׳':30,'אדר ב׳':29,'ניסן':30,'אייר':29,'סיוון':30,'תמוז':29,'אב':30,'אלול':29};

function gregorianToHebrewDate(gregDate) {
  const diff = Math.round((gregDate.getTime() - _REF_GREG.getTime()) / 86400000);
  const targetElapsed = _REF_ELAPSED + diff;
  let year = 5786 + Math.floor(diff / 365);
  while (_hebElapsed(year + 1) <= targetElapsed) year++;
  while (_hebElapsed(year) > targetElapsed) year--;
  const isLeap = ((7 * year) + 1) % 19 < 7;
  const numMonths = isLeap ? 13 : 12;
  let rem = targetElapsed - _hebElapsed(year);
  let monthNum = 1;
  while (monthNum < numMonths && rem >= _hebDaysInMonth(year, monthNum)) {
    rem -= _hebDaysInMonth(year, monthNum); monthNum++;
  }
  const allMonths = isLeap
    ? ['תשרי','חשוון','כסלו','טבת','שבט','אדר א׳','אדר ב׳','ניסן','אייר','סיוון','תמוז','אב','אלול']
    : ['תשרי','חשוון','כסלו','טבת','שבט','אדר','ניסן','אייר','סיוון','תמוז','אב','אלול'];
  const hebYear = numericToHebrewYear(year);
  return { day: HEB_DAYS[rem] || '', month: allMonths[monthNum - 1], year: HEBREW_YEARS.includes(hebYear) ? hebYear : HEBREW_YEARS[1] };
}

function hebDateToGregStr(day, month, year) {
  if (!day || !month || !year) return '';
  const numYear = HEBREW_YEAR_TO_NUMERIC[year];
  if (!numYear) return '';
  const isLeap = ((7 * numYear) + 1) % 19 < 7;
  const allMonths = isLeap
    ? ['תשרי','חשוון','כסלו','טבת','שבט','אדר א׳','אדר ב׳','ניסן','אייר','סיוון','תמוז','אב','אלול']
    : ['תשרי','חשוון','כסלו','טבת','שבט','אדר','ניסן','אייר','סיוון','תמוז','אב','אלול'];
  const monthNum = allMonths.indexOf(month) + 1;
  if (monthNum === 0) return '';
  const dayNum = HEB_DAYS.indexOf(day) + 1;
  if (dayNum === 0) return '';
  const g = hebrewToGregorian(numYear, monthNum, dayNum);
  return `${g.getFullYear()}-${String(g.getMonth()+1).padStart(2,'0')}-${String(g.getDate()).padStart(2,'0')}`;
}

function compareExpenseDateDesc(a, b) {
  const ay = HEBREW_YEAR_TO_NUMERIC[a.hebrewYear] || 0;
  const by = HEBREW_YEAR_TO_NUMERIC[b.hebrewYear] || 0;
  if (ay !== by) return by - ay;
  const yearMonths = monthsForNumericYear(ay);
  const am = yearMonths.indexOf(a.hebrewMonth);
  const bm = yearMonths.indexOf(b.hebrewMonth);
  if (am !== bm) return bm - am;
  const ad = HEB_DAYS.indexOf(a.hebrewDay);
  const bd = HEB_DAYS.indexOf(b.hebrewDay);
  if (ad !== bd) return bd - ad;
  return (b.id || 0) - (a.id || 0);
}

function gregorianToHebrewMonth(gregDate) {
  const diff = Math.round((gregDate.getTime() - _REF_GREG.getTime()) / 86400000);
  const targetElapsed = _REF_ELAPSED + diff;
  let year = 5786 + Math.floor(diff / 365);
  while (_hebElapsed(year + 1) <= targetElapsed) year++;
  while (_hebElapsed(year) > targetElapsed) year--;
  const isLeap = ((7 * year) + 1) % 19 < 7;
  const numMonths = isLeap ? 13 : 12;
  let rem = targetElapsed - _hebElapsed(year);
  let monthNum = 1;
  while (monthNum < numMonths && rem >= _hebDaysInMonth(year, monthNum)) {
    rem -= _hebDaysInMonth(year, monthNum); monthNum++;
  }
  const allMonths = isLeap
    ? ['תשרי','חשוון','כסלו','טבת','שבט','אדר א׳','אדר ב׳','ניסן','אייר','סיוון','תמוז','אב','אלול']
    : ['תשרי','חשוון','כסלו','טבת','שבט','אדר','ניסן','אייר','סיוון','תמוז','אב','אלול'];
  const hebYear = numericToHebrewYear(year);
  return { month: allMonths[monthNum - 1], year: HEBREW_YEARS.includes(hebYear) ? hebYear : HEBREW_YEARS[1] };
}

const _CURR_GREG_YEAR = new Date().getFullYear();
const GREG_YEARS_LIST = [_CURR_GREG_YEAR - 1, _CURR_GREG_YEAR, _CURR_GREG_YEAR + 1, _CURR_GREG_YEAR + 2];

function HebrewDatePicker({ day, month, year, onChange }) {
  const [open, setOpen] = useState(false);
  const todayHeb = getCurrentHebrewDate();
  const [navMonth, setNavMonth] = useState(month || todayHeb.month);
  const [navYear, setNavYear] = useState(year || todayHeb.year);
  const [mode, setMode] = useState('day');
  const [gregNavYear, setGregNavYear] = useState(_CURR_GREG_YEAR);
  const [displayFormat, setDisplayFormat] = useState('heb');
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function prevMonth() {
    const months = monthsForYear(navYear);
    const idx = months.indexOf(navMonth);
    if (idx <= 0) {
      const prevY = HEBREW_YEARS[Math.max(0, HEBREW_YEARS.indexOf(navYear) - 1)];
      const prevMonths = monthsForYear(prevY);
      setNavMonth(prevMonths[prevMonths.length - 1]);
      setNavYear(prevY);
    } else setNavMonth(months[idx - 1]);
  }
  function nextMonth() {
    const months = monthsForYear(navYear);
    const idx = months.indexOf(navMonth);
    if (idx === -1 || idx === months.length - 1) {
      const nextY = HEBREW_YEARS[Math.min(HEBREW_YEARS.length - 1, HEBREW_YEARS.indexOf(navYear) + 1)];
      setNavMonth(monthsForYear(nextY)[0]);
      setNavYear(nextY);
    } else setNavMonth(months[idx + 1]);
  }
  function goToGreg(gYear, gMonth) {
    const { month: hm, year: hy } = gregorianToHebrewMonth(new Date(gYear, gMonth, 1));
    setNavMonth(hm); setNavYear(hy); setMode('day');
  }

  const numericYear = HEBREW_YEAR_TO_NUMERIC[navYear];
  const isLeap = numericYear ? ((7 * numericYear) + 1) % 19 < 7 : false;
  const allMonthsForYear = isLeap
    ? ['תשרי','חשוון','כסלו','טבת','שבט','אדר א׳','אדר ב׳','ניסן','אייר','סיוון','תמוז','אב','אלול']
    : ['תשרי','חשוון','כסלו','טבת','שבט','אדר','ניסן','אייר','סיוון','תמוז','אב','אלול'];
  const navMonthNum = allMonthsForYear.indexOf(navMonth === 'אדר' && isLeap ? 'אדר ב׳' : navMonth) + 1;
  const daysCount = numericYear && navMonthNum > 0 ? _hebDaysInMonth(numericYear, navMonthNum) : (MONTH_DAYS[navMonth] || 30);
  const firstDayOfWeek = getHebrewMonthFirstDayOfWeek(navMonth, navYear);
  const gregFirstDay = numericYear && navMonthNum > 0 ? hebrewToGregorian(numericYear, navMonthNum, 1) : null;
  const gregLastDay = gregFirstDay ? new Date(gregFirstDay.getTime() + (daysCount - 1) * 86400000) : null;
  const gregMonthsStr = gregFirstDay ? (() => {
    const s = GREG_MONTHS_HE[gregFirstDay.getMonth()];
    const e = GREG_MONTHS_HE[gregLastDay.getMonth()];
    return s === e ? s : `${s}-${e}`;
  })() : '';
  const selectedGregDate = (() => {
    if (!day || !month || !year) return null;
    const sNumYear = HEBREW_YEAR_TO_NUMERIC[year];
    if (!sNumYear) return null;
    const sIsLeap = ((7 * sNumYear) + 1) % 19 < 7;
    const sAllMonths = sIsLeap
      ? ['תשרי','חשוון','כסלו','טבת','שבט','אדר א׳','אדר ב׳','ניסן','אייר','סיוון','תמוז','אב','אלול']
      : ['תשרי','חשוון','כסלו','טבת','שבט','אדר','ניסן','אייר','סיוון','תמוז','אב','אלול'];
    const sMonthNum = sAllMonths.indexOf(month === 'אדר' && sIsLeap ? 'אדר ב׳' : month) + 1;
    const sDayNum = HEB_DAYS.indexOf(day) + 1;
    return sMonthNum > 0 && sDayNum > 0 ? hebrewToGregorian(sNumYear, sMonthNum, sDayNum) : null;
  })();
  const hebLabel = day && month && year ? `${day} ${month} ${year}` : '';
  const gregLabel = selectedGregDate ? `${selectedGregDate.getDate()}/${selectedGregDate.getMonth()+1}/${selectedGregDate.getFullYear()}` : '';
  const label = !hebLabel ? 'בחר תאריך'
    : displayFormat === 'greg' ? (gregLabel || hebLabel)
    : displayFormat === 'both' ? `${hebLabel}  ${gregLabel}`
    : hebLabel;
  const DAY_HEADERS = ['א','ב','ג','ד','ה','ו','ש'];

  return (
    <div className="relative" ref={ref}>
      <button type="button"
        onClick={() => { setNavMonth(month || todayHeb.month); setNavYear(year || todayHeb.year); setMode('day'); setOpen(o => !o); }}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 hover:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white text-right whitespace-nowrap">
        {label}
      </button>
      {open && (
        <div className="absolute z-50 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 mt-1" style={{minWidth:'260px', right:0}}>

          {/* כותרת */}
          <div className="mb-3">
            {mode === 'day' && (
              <>
                <div className="flex items-center justify-between mb-1">
                  <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 text-lg leading-none">›</button>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setMode(m => m === 'month' ? 'day' : 'month')}
                      className="text-sm font-bold px-2 py-0.5 rounded-lg text-gray-700 hover:bg-gray-100">{navMonth}</button>
                    <button type="button" onClick={() => setMode(m => m === 'year' ? 'day' : 'year')}
                      className="text-sm font-bold px-2 py-0.5 rounded-lg text-gray-700 hover:bg-gray-100">{navYear}</button>
                  </div>
                  <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 text-lg leading-none">‹</button>
                </div>
                {gregFirstDay && (
                  <div className="flex items-center justify-center gap-1 border-t pt-1.5">
                    <button type="button" onClick={() => { setGregNavYear(gregFirstDay.getFullYear()); setMode('greg-month'); }}
                      className="text-xs text-gray-500 hover:text-teal-600 px-2 py-0.5 rounded-md hover:bg-gray-50 transition">{gregMonthsStr}</button>
                    <button type="button" onClick={() => { setGregNavYear(gregFirstDay.getFullYear()); setMode('greg-year'); }}
                      className="text-xs text-gray-500 hover:text-teal-600 px-2 py-0.5 rounded-md hover:bg-gray-50 transition">{gregFirstDay.getFullYear()}</button>
                  </div>
                )}
              </>
            )}
            {(mode === 'month' || mode === 'year') && (
              <div className="flex justify-center">
                <button type="button" onClick={() => setMode('day')}
                  className="text-sm font-bold text-gray-700 hover:bg-gray-100 px-3 py-1 rounded-lg">{navMonth} {navYear}</button>
              </div>
            )}
            {mode === 'greg-month' && (
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setGregNavYear(y => y + 1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 text-lg leading-none">›</button>
                <button type="button" onClick={() => setMode('greg-year')} className="text-sm font-bold text-gray-700 hover:bg-gray-100 px-3 py-1 rounded-lg">{gregNavYear}</button>
                <button type="button" onClick={() => setGregNavYear(y => y - 1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 text-lg leading-none">‹</button>
              </div>
            )}
            {mode === 'greg-year' && (
              <div className="flex justify-center">
                <span className="text-sm font-bold text-gray-600">בחר שנה לועזית</span>
              </div>
            )}
          </div>

          {mode === 'month' && (
            <div className="grid grid-cols-3 gap-1">
              {monthsForYear(navYear).map(m => (
                <button key={m} type="button" onClick={() => { setNavMonth(m); setMode('day'); }}
                  className={`py-1.5 text-xs rounded-lg transition ${m === navMonth ? 'bg-teal-600 text-white' : 'text-gray-700 hover:bg-teal-50'}`}>{m}</button>
              ))}
            </div>
          )}

          {mode === 'year' && (
            <div className="grid grid-cols-2 gap-2 py-1">
              {HEBREW_YEARS.map(y => (
                <button key={y} type="button" onClick={() => { setNavYear(y); setMode('day'); }}
                  className={`py-2 text-sm rounded-lg transition ${y === navYear ? 'bg-teal-600 text-white' : 'text-gray-700 hover:bg-teal-50'}`}>{y}</button>
              ))}
            </div>
          )}

          {mode === 'greg-month' && (
            <div className="grid grid-cols-3 gap-1">
              {GREG_MONTHS_HE.map((m, i) => (
                <button key={m} type="button" onClick={() => goToGreg(gregNavYear, i)}
                  className="py-1.5 text-xs rounded-lg text-gray-700 hover:bg-teal-50 transition">{m}</button>
              ))}
            </div>
          )}

          {mode === 'greg-year' && (
            <div className="grid grid-cols-2 gap-2 py-1">
              {GREG_YEARS_LIST.map(y => (
                <button key={y} type="button" onClick={() => { setGregNavYear(y); setMode('greg-month'); }}
                  className={`py-2 text-sm rounded-lg transition ${y === gregNavYear ? 'bg-teal-600 text-white' : 'text-gray-700 hover:bg-teal-50'}`}>{y}</button>
              ))}
            </div>
          )}

          {mode === 'day' && (
            <>
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {DAY_HEADERS.map(h => (
                  <div key={h} className="w-9 h-6 flex items-center justify-center text-[10px] font-bold text-gray-400">{h}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({length: firstDayOfWeek}).map((_, i) => <div key={`e${i}`} className="w-9 h-10" />)}
                {Array.from({length: daysCount}, (_, i) => i + 1).map(d => {
                  const isSelected = HEB_DAYS[d-1] === day && navMonth === month && navYear === year;
                  const gregDay = gregFirstDay ? new Date(gregFirstDay.getTime() + (d-1) * 86400000).getDate() : null;
                  return (
                    <button key={d} type="button"
                      onClick={() => { onChange(HEB_DAYS[d-1], navMonth, navYear); setOpen(false); }}
                      className={`w-9 h-10 text-[10px] rounded-lg flex flex-col items-center justify-center hover:bg-teal-100 transition ${isSelected ? 'bg-teal-600 text-white' : 'text-gray-700'}`}>
                      <span className="font-medium leading-none">{HEB_DAYS[d-1]}</span>
                      {gregDay && <span className={`text-[9px] leading-none mt-0.5 ${isSelected ? 'text-teal-100' : 'text-gray-400'}`}>{gregDay}</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-2 pt-2 border-t flex items-center justify-between gap-1">
            <div className="flex gap-1">
              {[['heb','עברי'],['greg','לועזי'],['both','שניהם']].map(([f, label]) => (
                <button key={f} type="button" onClick={() => setDisplayFormat(f)}
                  className={`text-[11px] px-2 py-0.5 rounded-full transition ${displayFormat === f ? 'bg-teal-600 text-white' : 'text-gray-400 hover:bg-gray-100'}`}>
                  {label}
                </button>
              ))}
            </div>
            {(day || month || year) && (
              <button type="button" onClick={() => { onChange('', '', ''); setOpen(false); }}
                className="text-xs text-gray-400 hover:text-red-400 transition">
                נקה
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tenants, setTenants] = useState(null);
  const [settings, setSettings] = useState(null);

  const [view, setView] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailText, setEmailText] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);
  const [newTenant, setNewTenant] = useState(EMPTY_TENANT);
  const [settingsData, setSettingsData] = useState(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [backupExported, setBackupExported] = useState(false);
  const [selectExpModal, setSelectExpModal] = useState(null);
  const [selectedTenantIds, setSelectedTenantIds] = useState(new Set());
  const [expandedPaidList, setExpandedPaidList] = useState(null);
  const [showStatementModal, setShowStatementModal] = useState(null);
  const [statementYears, setStatementYears] = useState(new Set());
  const [statementMode, setStatementMode] = useState('full');
  const [statementOccupant, setStatementOccupant] = useState('');
  const [includeOwnedApts, setIncludeOwnedApts] = useState(false);
  const [filterYear, setFilterYear] = useState(CURRENT_HEBREW_YEAR);
  const [showTenantMsg, setShowTenantMsg] = useState(false);
  const [tenantMsgText, setTenantMsgText] = useState('');
  const [editingCash, setEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState('');
  const logoInputRef = useRef(null);
  const dataLoadedForUser = useRef(null);
  const skipTenantsSaveRef = useRef(false);
  const skipSettingsSaveRef = useRef(false);
  const pendingWritesRef = useRef(0);
  const tenantsRef = useRef(null);
  const settingsRef = useRef(null);
  const lastSyncedTenantsRef = useRef(null);
  const lastSyncedSettingsRef = useRef(null);
  const saveChainRef = useRef({ tenants: Promise.resolve(), settings: Promise.resolve() });
  const ownWritesRef = useRef({ tenants: [], settings: [] });
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [showRemindersModal, setShowRemindersModal] = useState(false);
  const [openedReminderIds, setOpenedReminderIds] = useState(new Set());
  const [emailSubject, setEmailSubject] = useState('');
  const [tenantMsgSubject, setTenantMsgSubject] = useState('');
  const [receiptModal, setReceiptModal] = useState(null);
  const [openMonth, setOpenMonth] = useState(null);
  const [buildingFilter, setBuildingFilter] = useState('all');

  useEffect(() => {
    if (DEMO) { setSession({ user: { id: 'demo' } }); setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) { setTenants(null); setSettings(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleBeforeUnload(e) {
      if (pendingWritesRef.current > 0) { e.preventDefault(); e.returnValue = ''; }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => { tenantsRef.current = tenants; }, [tenants]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  useEffect(() => {
    if (!session) { dataLoadedForUser.current = null; return; }
    if (dataLoadedForUser.current === session.user.id) return;
    dataLoadedForUser.current = session.user.id;

    if (DEMO) {
      const t = buildDemoTenants();
      const st = buildDemoSettings();
      skipTenantsSaveRef.current = true; skipSettingsSaveRef.current = true;
      tenantsRef.current = t; settingsRef.current = st;
      lastSyncedTenantsRef.current = t; lastSyncedSettingsRef.current = st;
      setTenants(t); setSettings(st);
      return;
    }

    const cacheKeyT = `vaad_tenants_${session.user.id}`;
    const cacheKeyS = `vaad_settings_${session.user.id}`;
    let hasCache = false;
    let cachedTenantsSnapshot, cachedSettingsSnapshot;
    try {
      const ct = localStorage.getItem(cacheKeyT);
      const cs = localStorage.getItem(cacheKeyS);
      if (ct && cs) {
        skipTenantsSaveRef.current = true;
        skipSettingsSaveRef.current = true;
        cachedTenantsSnapshot = JSON.parse(ct);
        cachedSettingsSnapshot = JSON.parse(cs);
        tenantsRef.current = cachedTenantsSnapshot;
        settingsRef.current = cachedSettingsSnapshot;
        lastSyncedTenantsRef.current = cachedTenantsSnapshot;
        lastSyncedSettingsRef.current = cachedSettingsSnapshot;
        setTenants(cachedTenantsSnapshot); setSettings(cachedSettingsSnapshot); hasCache = true;
      }
    } catch (e) {}
    if (!hasCache) setDataLoading(true);

    const { month, year } = getCurrentHebrewDate();
    const autoKey = `${month}-${year}`;
    const yearMonthsList = monthsForYear(year);
    const currentMonthIdx = yearMonthsList.indexOf(month);
    const monthsToFill = yearMonthsList.slice(0, currentMonthIdx + 1);

    Promise.all([
      supabase.from('app_tenants').select('data, last_auto_month').eq('user_id', session.user.id).maybeSingle(),
      supabase.from('app_settings').select('data').eq('user_id', session.user.id).maybeSingle(),
    ]).then(([tenantsRes, settingsRes]) => {
      // הגנה קריטית: אם השרת החזיר שגיאה, או החזיר "אין נתונים" בזמן שיש לנו כבר cache
      // מקומי (כלומר זו לא באמת משתמשת חדשה) — זה ככל הנראה כשל זמני בקריאה (רשת/טוקן),
      // לא מחיקה אמיתית של הרשומה. בעבר מקרה כזה גרם לאיפוס כל נתוני הדיירים לברירת המחדל
      // הקשיחה בקוד ולכתיבה מיידית שלה בחזרה לשרת - דריסה מוחלטת של היסטוריית תשלומים
      // אמיתית. עכשיו: לא נוגעים בכלום, משאירים את מה שכבר מוצג (מה-cache אם יש), ומתריעים.
      const tenantsLooksLost = !tenantsRes.data && hasCache;
      const settingsLooksLost = !settingsRes.data && hasCache;
      if (tenantsRes.error || settingsRes.error || tenantsLooksLost || settingsLooksLost) {
        setDbError(
          tenantsRes.error || settingsRes.error
            ? `שגיאה בטעינת נתונים מהשרת (${(tenantsRes.error || settingsRes.error).message}) - לא בוצע שום שינוי בנתונים, ממשיכה להציג את הנתונים האחרונים שנשמרו במכשיר הזה. נסי לרענן.`
            : `לא הצלחתי לאמת מול השרת שהנתונים עדיין קיימים שם - ממשיכה להציג את הנתונים האחרונים שנשמרו במכשיר הזה בלי לגעת בשרת. נסי לרענן בעוד רגע ותגידי לי אם זה חוזר.`
        );
        setDataLoading(false);
        return;
      }

      let loadedSettings;
      if (settingsRes.data) {
        const p = settingsRes.data.data;
        if (!p.managers) p.managers = [{ id: 1, name: '', phone: '', email: '', role: 'יו"ר הוועד' }];
        if (!p.templates) p.templates = INITIAL_SETTINGS.templates;
        if (!p.feeHistory) p.feeHistory = INITIAL_SETTINGS.feeHistory;
        if (!p.electricityExpenses) p.electricityExpenses = [];
        if (!p.cleaningExpenses) p.cleaningExpenses = [];
        if (!p.regularExpenses) p.regularExpenses = [];
        if (!p.extraordinaryExpenses) p.extraordinaryExpenses = [];
        if (!p.emailSettings) p.emailSettings = INITIAL_SETTINGS.emailSettings;
        loadedSettings = { ...INITIAL_SETTINGS, ...p };
      } else {
        loadedSettings = INITIAL_SETTINGS;
        supabase.from('app_settings').upsert({ user_id: session.user.id, data: INITIAL_SETTINGS });
      }

      let loadedTenants;
      const base = tenantsRes.data
        ? tenantsRes.data.data.map(t => ({
            ...t, charges: t.charges || [],
            payments: (t.payments || []).map(p => p.hebrewMonth ? p : { ...p, hebrewMonth: 'תשרי', hebrewYear: CURRENT_HEBREW_YEAR }),
          }))
        : INITIAL_TENANTS.map(t => ({ ...t }));

      let anyAdded = false;
      const baseId = Date.now();
      loadedTenants = base.map((tenant, tIdx) => {
        let newPayments = tenant.payments.map(p => {
          if (p.status === 'זכות' && monthsToFill.includes(p.hebrewMonth) && p.hebrewYear === year) {
            const paid = p.paidAmount || 0;
            if (paid >= p.amount) { anyAdded = true; return { ...p, status: 'שולם' }; }
            anyAdded = true;
            return { ...p, status: 'חוב' };
          }
          return p;
        });
        monthsToFill.forEach((m, mIdx) => {
          if (!newPayments.some(p => p.hebrewMonth === m && p.hebrewYear === year)) {
            const baseAmount = getFeeForMonth(m, year, loadedSettings.feeHistory);
            const amount = Math.round(baseAmount * (Number(tenant.feePercent || 100) / 100));
            newPayments.push({ id: baseId + tIdx * 100 + mIdx, hebrewMonth: m, hebrewYear: year, status: 'חוב', amount, paidAmount: 0, occupantName: tenant.name });
            anyAdded = true;
          }
        });
        let ownerId = tenant.ownerId;
        if (ownerId === undefined) {
          const match = tenant.owner ? base.find(x => x.name === tenant.owner && x.id !== tenant.id) : null;
          ownerId = match ? match.id : '';
          anyAdded = true;
        }
        return { ...tenant, payments: newPayments, ownerId };
      });

      // אם המשתמשת כבר ערכה נתונים (tenantsRef השתנה) בזמן שחיכינו לתשובה מהשרת — לא לדרוס
      // את העריכה המקומית; השמירה האוטומטית המושהית תשמור אותה, וההתאמה האוטומטית
      // (הוספת חודש חדש וכו') תתבצע בטעינה הבאה במקום לגרום לאובדן נתונים עכשיו.
      const tenantsEditedDuringLoad = hasCache && tenantsRef.current !== lastSyncedTenantsRef.current;
      if (!tenantsEditedDuringLoad) {
        if (anyAdded || !tenantsRes.data) {
          supabase.from('app_tenants')
            .upsert({ user_id: session.user.id, data: loadedTenants, last_auto_month: autoKey }, { onConflict: 'user_id' })
            .then(({ error }) => { if (error) setDbError(`שגיאת שמירה: ${error.message} (${error.code})`); })
            .catch((e) => setDbError(`שגיאת שמירה (בעיית חיבור): ${e.message}`));
        }
        skipTenantsSaveRef.current = true;
        lastSyncedTenantsRef.current = loadedTenants;
        setTenants(loadedTenants);
        try { localStorage.setItem(cacheKeyT, JSON.stringify(loadedTenants)); } catch (e) {}
      }

      // אותה הגנה עבור settings: לא לדרוס עריכה מקומית שנעשתה בזמן הטעינה
      const settingsEditedDuringLoad = hasCache && settingsRef.current !== lastSyncedSettingsRef.current;
      if (!settingsEditedDuringLoad) {
        skipSettingsSaveRef.current = true;
        lastSyncedSettingsRef.current = loadedSettings;
        setSettings(loadedSettings);
        try { localStorage.setItem(cacheKeyS, JSON.stringify(loadedSettings)); } catch (e) {}
      }
      setDataLoading(false);
    }).catch((e) => {
      setDbError(`טעינת הנתונים נכשלה (בעיית חיבור) - לא בוצע שום שינוי בנתונים: ${e.message}`);
      setDataLoading(false);
    });
  }, [session]);

  // שמירה מיידית בכל שינוי (כמו ב-super-off) - בלי debounce, כדי שלא יצטברו כמה עריכות
  // בלי שמירה ויאבדו יחד אם השמירה הסופית נכשלת (רשת לא יציבה וכו').
  // השמירות עוברות בתור - אחת אחרי השנייה - וכל שמירה כותבת את המצב העדכני ביותר ברגע
  // שהגיע תורה. כך שמירה ישנה ואיטית לא יכולה להגיע לשרת אחרי חדשה ולדרוס אותה.
  function enqueueSave(kind) {
    if (DEMO) return Promise.resolve();
    const userId = session?.user?.id;
    if (!userId) return Promise.resolve();
    const isTenants = kind === 'tenants';
    const dataRef = isTenants ? tenantsRef : settingsRef;
    const syncedRef = isTenants ? lastSyncedTenantsRef : lastSyncedSettingsRef;
    const table = isTenants ? 'app_tenants' : 'app_settings';
    const cacheKey = isTenants ? `vaad_tenants_${userId}` : `vaad_settings_${userId}`;
    const label = isTenants ? 'דיירים' : 'הגדרות';
    pendingWritesRef.current++;
    const run = async () => {
      try {
        const data = dataRef.current;
        if (!data || data === syncedRef.current) return;
        const written = ownWritesRef.current[kind];
        written.push(stableStringify(data));
        if (written.length > 10) written.shift();
        const { error } = await supabase.from(table).update({ data }).eq('user_id', userId);
        if (error) { setDbError(`שגיאת שמירת ${label}: ${error.message} (${error.code})`); return; }
        syncedRef.current = data;
        try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (e) {}
      } catch (e) {
        setDbError(`השמירה נכשלה (בעיית חיבור) - העדכון האחרון לא נשמר, בדקי חיבור לאינטרנט ונסי שוב: ${e.message}`);
      } finally { pendingWritesRef.current--; }
    };
    const p = saveChainRef.current[kind].then(run);
    saveChainRef.current[kind] = p;
    return p;
  }

  useEffect(() => {
    if (!session || !tenants) return;
    if (skipTenantsSaveRef.current) { skipTenantsSaveRef.current = false; return; }
    enqueueSave('tenants');
  }, [tenants, session]);

  useEffect(() => {
    if (!session || !settings) return;
    if (skipSettingsSaveRef.current) { skipSettingsSaveRef.current = false; return; }
    enqueueSave('settings');
  }, [settings, session]);

  // סנכרון בזמן אמת בין טאבים/מכשירים: אם אין עריכה מקומית ממתינה (tenantsRef עדיין שווה
  // ל-lastSyncedTenantsRef), מיישמים מיד עדכון שהגיע מטאב/מכשיר אחר. אם יש עריכה מקומית
  // ממתינה - מדלגים כדי לא לדרוס אותה; היא תישמר כרגיל ותעדכן את שאר הטאבים בתורה.
  useEffect(() => {
    if (!session || DEMO) return;
    const channel = supabase
      .channel(`vaad-sync-${session.user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_tenants', filter: `user_id=eq.${session.user.id}` }, (payload) => {
        const incoming = payload.new?.data;
        if (!incoming) return;
        // הד של שמירה שאנחנו עצמנו שלחנו - לא מחילים שוב (הד מאוחר יכול להחזיר מצב ישן למסך)
        if (ownWritesRef.current.tenants.includes(stableStringify(incoming))) return;
        if (tenantsRef.current !== lastSyncedTenantsRef.current) return;
        skipTenantsSaveRef.current = true;
        lastSyncedTenantsRef.current = incoming;
        setTenants(incoming);
        try { localStorage.setItem(`vaad_tenants_${session.user.id}`, JSON.stringify(incoming)); } catch (e) {}
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: `user_id=eq.${session.user.id}` }, (payload) => {
        const incoming = payload.new?.data;
        if (!incoming) return;
        // הד של שמירה שאנחנו עצמנו שלחנו - לא מחילים שוב (הד מאוחר יכול להחזיר מצב ישן למסך)
        if (ownWritesRef.current.settings.includes(stableStringify(incoming))) return;
        if (settingsRef.current !== lastSyncedSettingsRef.current) return;
        skipSettingsSaveRef.current = true;
        lastSyncedSettingsRef.current = incoming;
        setSettings(incoming);
        try { localStorage.setItem(`vaad_settings_${session.user.id}`, JSON.stringify(incoming)); } catch (e) {}
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) setLoginError('אימייל או סיסמה שגויים');
    setLoginLoading(false);
  }

  async function handleLogout() {
    if (DEMO) { window.location.reload(); return; }
    if (session) {
      try {
        localStorage.removeItem(`vaad_tenants_${session.user.id}`);
        localStorage.removeItem(`vaad_settings_${session.user.id}`);
      } catch (e) {}
    }
    await supabase.auth.signOut();
  }

  // פותח מייל מוכן לשליחה: במחשב - Gmail בדפדפן, בטלפון - אפליקציית המייל (Gmail).
  // המייל יוצא מהתיבה של המשתמשת ונשמר אצלה ב"דואר יוצא".
  function openMail({ to = '', bcc = '', subject = '', body = '' }) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const enc = encodeURIComponent;
    if (isMobile) {
      const params = [bcc && `bcc=${enc(bcc)}`, `subject=${enc(subject)}`, `body=${enc(body)}`].filter(Boolean).join('&');
      window.location.href = `mailto:${enc(to)}?${params}`;
    } else {
      const url = `https://mail.google.com/mail/?authuser=${enc(GMAIL_ACCOUNT)}&view=cm&fs=1&to=${enc(to)}${bcc ? `&bcc=${enc(bcc)}` : ''}&su=${enc(subject)}&body=${enc(body)}`;
      window.open(url, '_blank');
    }
  }

  // חיובים שאין להם שנה (חיוב נוסף ידני, או הוצאה חריגה שנמחקה) - מופיעים בכל מסמך בבלוק "חיובים נוספים",
  // כדי שהיתרה במסמך תהיה זהה ליתרה בכרטיס
  function undatedDebtCharges(tenant) {
    const expenseIds = new Set((settings.extraordinaryExpenses || []).map(e => e.id));
    return (tenant.charges || []).filter(c => c.status === 'חוב' && (!c.expenseId || !expenseIds.has(c.expenseId)));
  }

  // בדירה מושכרת: עמודת "על חשבון" (השוכר / בעל הדירה). אחרת null.
  function billLabelsFor(unit) {
    if (!unit.ownerId) return null;
    const lab = v => v === 'owner' ? 'בעל הדירה' : 'השוכר';
    return { monthly: lab(unit.monthlyBillTo || 'occupant'), charge: c => lab(chargeBillTo(c)) };
  }

  // פירוק החובות שבמסמך: כמה לגבות מהשוכר וכמה על חשבון בעל הדירה
  function statementSplit(unit, payments, charges) {
    const monthly = payments.reduce((s, p) => s + p.amount - (p.paidAmount || 0), 0);
    const monthlyOwner = unit.monthlyBillTo === 'owner';
    let occupant = monthlyOwner ? 0 : monthly;
    let owner = monthlyOwner ? monthly : 0;
    charges.forEach(c => { if (chargeBillTo(c) === 'owner') owner += c.amount; else occupant += c.amount; });
    return { occupant, owner };
  }

  function getTenantStatementData(tenant, years) {
    const expenseYearMap = new Map((settings.extraordinaryExpenses || []).map(e => [e.id, e.hebrewYear]));

    const sortedYears = [...years].sort((a, b) => (HEBREW_YEAR_TO_NUMERIC[a] || 0) - (HEBREW_YEAR_TO_NUMERIC[b] || 0));

    const yearsData = sortedYears.map(year => {
      const yearMonths = monthsForYear(year);
      const yearPayments = tenant.payments
        .filter(p => p.hebrewYear === year)
        .sort((a, b) => yearMonths.indexOf(a.hebrewMonth) - yearMonths.indexOf(b.hebrewMonth));
      const paidPayments = yearPayments.filter(p => p.status === 'שולם');
      const debtPayments = yearPayments.filter(p => {
        const rem = p.amount - (p.paidAmount || 0);
        return p.status === 'חוב' && rem > 0;
      });
      const debtCharges = (tenant.charges || []).filter(c =>
        c.expenseId && c.status === 'חוב' && expenseYearMap.get(c.expenseId) === year);

      const yearPaidTotal = paidPayments.reduce((s, p) => s + (p.paidAmount || p.amount), 0);
      const yearDebtTotal = debtPayments.reduce((s, p) => s + p.amount - (p.paidAmount || 0), 0)
        + debtCharges.reduce((s, c) => s + c.amount, 0);

      return { year, paidPayments, debtPayments, debtCharges, yearPaidTotal, yearDebtTotal };
    });

    const otherCharges = undatedDebtCharges(tenant);
    const totalPaid = yearsData.reduce((s, y) => s + y.yearPaidTotal, 0);
    const totalDebtAmt = yearsData.reduce((s, y) => s + y.yearDebtTotal, 0) + otherCharges.reduce((s, c) => s + c.amount, 0);
    const allDebtPayments = yearsData.flatMap(y => y.debtPayments);
    const allDebtCharges = [...yearsData.flatMap(y => y.debtCharges), ...otherCharges];

    return { yearsData, otherCharges, totalPaid, totalDebtAmt, allDebtPayments, allDebtCharges };
  }

  function getTenantStatementDataByOccupant(tenant, years) {
    const expenseYearMap = new Map((settings.extraordinaryExpenses || []).map(e => [e.id, e.hebrewYear]));
    const monthRank = (m, y) => monthsForYear(y).indexOf(m);
    const yearRank = y => HEBREW_YEAR_TO_NUMERIC[y] || 0;

    const debtPayments = tenant.payments.filter(p => years.has(p.hebrewYear) && p.status === 'חוב' && (p.amount - (p.paidAmount || 0)) > 0);
    const debtCharges = [
      ...(tenant.charges || []).filter(c => c.expenseId && c.status === 'חוב' && years.has(expenseYearMap.get(c.expenseId))),
      ...undatedDebtCharges(tenant),
    ];

    const occupantOf = x => x.occupantName || tenant.name;
    const names = [...new Set([...debtPayments.map(occupantOf), ...debtCharges.map(occupantOf)])];

    const occupantsData = names.map(name => {
      const payments = debtPayments
        .filter(p => occupantOf(p) === name)
        .sort((a, b) => yearRank(a.hebrewYear) - yearRank(b.hebrewYear) || monthRank(a.hebrewMonth, a.hebrewYear) - monthRank(b.hebrewMonth, b.hebrewYear));
      const charges = debtCharges.filter(c => occupantOf(c) === name);
      const total = payments.reduce((s, p) => s + p.amount - (p.paidAmount || 0), 0) + charges.reduce((s, c) => s + c.amount, 0);
      return { name, isCurrent: name === tenant.name, payments, charges, total };
    }).sort((a, b) => (b.isCurrent - a.isCurrent) || b.total - a.total);

    const totalDebtAmt = occupantsData.reduce((s, o) => s + o.total, 0);
    return { occupantsData, totalDebtAmt, allDebtPayments: debtPayments, allDebtCharges: debtCharges };
  }

  function buildTenantStatementText(tenantRaw, mode = 'full', years, occupantFilter = '') {
    const tenant = unitView(tenantRaw, tenants);
    const debtsOnly = mode === 'debtsOnly';
    const effTenant = filterTenantByOccupant(tenant, occupantFilter);
    const yearsToUse = years && years.size > 0 ? years : new Set(effTenant.payments.map(p => p.hebrewYear));
    const bill = billLabelsFor(tenantRaw);
    const mTag = bill ? ` (על חשבון ${bill.monthly})` : '';
    const cTag = c => bill ? ` (על חשבון ${bill.charge(c)})` : '';
    const splitLines = data => {
      if (!bill) return [];
      const sp = statementSplit(tenantRaw, data.allDebtPayments, data.allDebtCharges);
      return [`  מתוך זה — לגבות מהשוכר: ₪${sp.occupant.toLocaleString()} · על חשבון בעל הדירה: ₪${sp.owner.toLocaleString()}`];
    };

    if (mode === 'byOccupant') {
      const data = getTenantStatementDataByOccupant(effTenant, yearsToUse);
      const lines = ['פירוט חובות לפי שוכר:', ''];
      if (data.occupantsData.length === 0) {
        lines.push('✓ אין חובות פתוחים');
      } else {
        data.occupantsData.forEach(({ name, isCurrent, payments, charges, total }) => {
          lines.push(`${name}${isCurrent ? ' (שוכר נוכחי)' : ' (שוכר קודם)'}:`);
          payments.forEach(p => lines.push(`    ועד בית — ${p.hebrewMonth} ${p.hebrewYear}: ₪${(p.amount - (p.paidAmount || 0)).toLocaleString()}${mTag}${p.note ? ' — ' + p.note : ''}`));
          charges.forEach(c => lines.push(`    ${c.description || 'חיוב'}: ₪${c.amount.toLocaleString()}${cTag(c)}${c.note ? ' — ' + c.note : ''}`));
          lines.push(`  סה"כ חוב — ${name}: ₪${total.toLocaleString()}`);
          lines.push('');
        });
      }
      lines.push(`יתרת חוב לתשלום: ₪${data.totalDebtAmt.toLocaleString()}`);
      lines.push(...splitLines(data));
      return lines.join('\n');
    }

    const data = getTenantStatementData(effTenant, yearsToUse);
    const lines = [debtsOnly ? 'פירוט חובות:' : 'פירוט תשלומים וחובות:', ''];

    data.yearsData.forEach(({ year, paidPayments, debtPayments, debtCharges, yearPaidTotal, yearDebtTotal }) => {
      lines.push(`שנת ${year}:`);
      if (!debtsOnly) {
        if (paidPayments.length > 0) {
          lines.push('  תשלומים ששולמו:');
          paidPayments.forEach(p => lines.push(`    ${p.hebrewMonth}: ₪${(p.paidAmount || p.amount).toLocaleString()}${p.note ? ' — ' + p.note : ''}`));
        } else {
          lines.push('  אין תשלומים רשומים');
        }
        lines.push(`  סה"כ שולם: ₪${yearPaidTotal.toLocaleString()}`);
      }
      if (debtPayments.length > 0 || debtCharges.length > 0) {
        lines.push('  חובות פתוחים:');
        debtPayments.forEach(p => lines.push(`    ועד בית — ${p.hebrewMonth}: ₪${(p.amount - (p.paidAmount || 0)).toLocaleString()}${mTag}${p.note ? ' — ' + p.note : ''}`));
        debtCharges.forEach(c => lines.push(`    ${c.description || 'הוצאה חריגה'}: ₪${c.amount.toLocaleString()}${cTag(c)}${c.note ? ' — ' + c.note : ''}`));
        lines.push(`  סה"כ חוב לשנת ${year}: ₪${yearDebtTotal.toLocaleString()}`);
      } else {
        lines.push('  ✓ אין חובות פתוחים');
      }
      lines.push('');
    });
    if (data.otherCharges.length > 0) {
      lines.push('חיובים נוספים:');
      data.otherCharges.forEach(c => lines.push(`    ${c.description || 'חיוב'}: ₪${c.amount.toLocaleString()}${cTag(c)}${c.note ? ' — ' + c.note : ''}`));
      lines.push('');
    }

    if (!debtsOnly) lines.push(`סה"כ שולם (כולל): ₪${data.totalPaid.toLocaleString()}`);
    lines.push(`יתרת חוב לתשלום: ₪${data.totalDebtAmt.toLocaleString()}`);
    lines.push(...splitLines(data));

    return lines.join('\n');
  }

  function buildOwnedAptsDebtsText(ownerTenant) {
    const owned = getOwnedApartments(ownerTenant.id);
    if (owned.length === 0) return '';
    const lines = ['חובות דירות מושכרות בבעלותך:', ''];
    owned.forEach(apt => {
      lines.push(`— דירה ${apt.apt} (${apt.name}):`);
      lines.push(buildTenantStatementText(apt, 'debtsOnly'));
      lines.push('');
    });
    return lines.join('\n');
  }

  function debtRowsHtml(payments, charges, bill, withYear) {
    return `${payments.map(p => `<tr>
              <td>ועד בית — ${p.hebrewMonth}${withYear ? ` ${p.hebrewYear}` : ''}</td>
              ${bill ? `<td>${bill.monthly}</td>` : ''}
              <td class="debt">₪${(p.amount - (p.paidAmount || 0)).toLocaleString()}</td>
              <td>${p.note || ''}</td>
            </tr>`).join('')}
            ${charges.map(c => `<tr>
              <td>${c.description || 'חיוב'}</td>
              ${bill ? `<td>${bill.charge(c)}</td>` : ''}
              <td class="debt">₪${c.amount.toLocaleString()}</td>
              <td>${c.note || ''}</td>
            </tr>`).join('')}`;
  }

  function debtTableHeadHtml(bill) {
    return `<thead><tr><th>תיאור</th>${bill ? '<th>על חשבון</th>' : ''}<th>סכום לתשלום</th><th>הערות</th></tr></thead>`;
  }

  function renderYearsBlocksHtml(yearsData, debtsOnly, bill = null, otherCharges = []) {
    return yearsData.map(({ year, paidPayments, debtPayments, debtCharges, yearPaidTotal, yearDebtTotal }) => `
  <div class="year-block">
    <div class="year-title">שנת ${year}</div>

    ${debtsOnly ? '' : `
    <div class="section-title">תשלומים ששולמו</div>
    ${paidPayments.length > 0
      ? `<table>
          <thead><tr><th>חודש</th><th>סכום ששולם</th><th>הערות</th></tr></thead>
          <tbody>
            ${paidPayments.map(p => `<tr>
              <td>${p.hebrewMonth}</td>
              <td class="paid">₪${(p.paidAmount || p.amount).toLocaleString()}</td>
              <td>${p.note || ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      : `<p class="empty">אין תשלומים רשומים</p>`}
    <div class="year-subtotal">סה"כ שולם לשנת ${year}: <span class="paid">₪${yearPaidTotal.toLocaleString()}</span></div>
    `}

    <div class="section-title">חובות פתוחים</div>
    ${debtPayments.length > 0 || debtCharges.length > 0
      ? `<table>
          ${debtTableHeadHtml(bill)}
          <tbody>
            ${debtRowsHtml(debtPayments, debtCharges, bill, false)}
          </tbody>
        </table>`
      : `<p class="empty" style="color:#16a34a">✓ אין חובות פתוחים</p>`}
    ${debtPayments.length > 0 || debtCharges.length > 0
      ? `<div class="year-subtotal">סה"כ חוב לשנת ${year}: <span class="debt">₪${yearDebtTotal.toLocaleString()}</span></div>`
      : ''}
  </div>
  `).join('') + (otherCharges.length > 0 ? `
  <div class="year-block">
    <div class="year-title">חיובים נוספים</div>
    <table>
      ${debtTableHeadHtml(bill)}
      <tbody>
        ${debtRowsHtml([], otherCharges, bill, false)}
      </tbody>
    </table>
    <div class="year-subtotal">סה"כ חיובים נוספים: <span class="debt">₪${otherCharges.reduce((s, c) => s + c.amount, 0).toLocaleString()}</span></div>
  </div>` : '');
  }

  function renderOccupantsBlocksHtml(occupantsData, bill = null) {
    if (occupantsData.length === 0) return `<p class="empty" style="color:#16a34a">✓ אין חובות פתוחים</p>`;
    return occupantsData.map(({ name, isCurrent, payments, charges, total }) => `
  <div class="year-block">
    <div class="year-title">${name}${isCurrent ? ' (שוכר נוכחי)' : ' (שוכר קודם)'}</div>
    <table>
      ${debtTableHeadHtml(bill)}
      <tbody>
        ${debtRowsHtml(payments, charges, bill, true)}
      </tbody>
    </table>
    <div class="year-subtotal">סה"כ חוב — ${name}: <span class="debt">₪${total.toLocaleString()}</span></div>
  </div>
  `).join('');
  }

  function buildTenantStatementHtml(tenantRaw, years, mode = 'full', includeOwned = false, occupantFilter = '') {
    const tenant = unitView(tenantRaw, tenants);
    const debtsOnly = mode === 'debtsOnly';
    const byOccupant = mode === 'byOccupant';
    const { month: curMonth, year: curYear } = getCurrentHebrewDate();
    const logoSrc = settings.logo;
    const displayName = occupantFilter || tenant.name;
    const effTenant = filterTenantByOccupant(tenant, occupantFilter);

    const mainBill = billLabelsFor(tenantRaw);
    const mainData = byOccupant ? getTenantStatementDataByOccupant(effTenant, years) : getTenantStatementData(effTenant, years);
    const totalPaid = byOccupant ? 0 : mainData.totalPaid;
    const totalDebtAmt = mainData.totalDebtAmt;
    const bodyHtml = byOccupant ? renderOccupantsBlocksHtml(mainData.occupantsData, mainBill) : renderYearsBlocksHtml(mainData.yearsData, debtsOnly, mainBill, mainData.otherCharges);
    const splitRowsHtml = (unit, data) => {
      if (!unit.ownerId || data.totalDebtAmt <= 0) return '';
      const sp = statementSplit(unit, data.allDebtPayments, data.allDebtCharges);
      return `<div class="summary-row" style="font-size:13px"><span>מתוך זה — לגבות מהשוכר</span><span>₪${sp.occupant.toLocaleString()}</span></div>
        <div class="summary-row" style="font-size:13px"><span>מתוך זה — על חשבון בעל הדירה</span><span>₪${sp.owner.toLocaleString()}</span></div>`;
    };

    const ownedApts = includeOwned ? getOwnedApartments(tenant.id) : [];
    const ownedSections = ownedApts.map(apt => {
      const effApt = filterTenantByOccupant(unitView(apt, tenants), occupantFilter);
      const aptYears = new Set(effApt.payments.map(p => p.hebrewYear));
      const aptData = byOccupant ? getTenantStatementDataByOccupant(effApt, aptYears) : getTenantStatementData(effApt, aptYears);
      const aptBill = billLabelsFor(apt);
      const aptBodyHtml = byOccupant ? renderOccupantsBlocksHtml(aptData.occupantsData, aptBill) : renderYearsBlocksHtml(aptData.yearsData, debtsOnly, aptBill, aptData.otherCharges);
      const aptPaid = byOccupant ? 0 : aptData.totalPaid;
      return { apt, aptBodyHtml, aptPaid, aptDebt: aptData.totalDebtAmt, aptSplitHtml: splitRowsHtml(apt, aptData) };
    });

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>${debtsOnly || byOccupant ? 'פירוט חובות' : 'פירוט תשלומים'} — ${displayName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 48px 56px; color: #111; background: #fff; direction: rtl; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; border-bottom: 2px solid #0d9488; padding-bottom: 20px; }
    .header-title h1 { font-size: 22px; font-weight: bold; color: #0f766e; margin-bottom: 6px; }
    .header-title p { font-size: 14px; color: #555; }
    .header-title .apt-label { font-size: 14px; font-weight: 600; color: #0f766e; margin-bottom: 6px; }
    .header-info { text-align: left; font-size: 12px; color: #777; line-height: 1.8; }
    .header-logo { max-height: 150px; max-width: 300px; object-fit: contain; display: block; margin-bottom: 8px; background: #fff; }
    .year-block { margin-top: 26px; padding-top: 18px; border-top: 2px dashed #e2e8f0; }
    .year-block:first-of-type { margin-top: 6px; padding-top: 0; border-top: none; }
    .year-title { font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #111; background: #e6f0ef; border-right: 4px solid #0d9488; border-radius: 6px; padding: 8px 14px; margin-bottom: 6px; page-break-after: avoid; break-after: avoid; }
    .year-subtotal { font-size: 12px; color: #666; margin: 4px 2px 0; }
    .section-title { font-size: 15px; font-weight: bold; color: #0f766e; margin: 16px 0 10px; padding-bottom: 5px; border-bottom: 1px solid #ccfbf1; page-break-after: avoid; break-after: avoid; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th { background: #f0fdfa; color: #0f766e; padding: 9px 14px; text-align: right; font-weight: bold; border-bottom: 2px solid #0d9488; }
    td { padding: 8px 14px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #fafafa; }
    .paid { color: #16a34a; font-weight: 600; }
    .debt { color: #dc2626; font-weight: 600; }
    .empty { color: #999; font-size: 13px; padding: 10px 0; }
    .summary { background: #f0fdfa; border: 1px solid #0d9488; border-radius: 10px; padding: 18px 20px; margin-top: 28px; page-break-inside: avoid; break-inside: avoid; }
    .summary-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; color: #444; }
    .summary-total { font-size: 17px; font-weight: bold; border-top: 1px solid #0d9488; margin-top: 10px; padding-top: 10px; color: ${totalDebtAmt > 0 ? '#dc2626' : '#16a34a'}; }
    .footer { margin-top: 40px; font-size: 11px; color: #aaa; text-align: center; }
    @media print { body { padding: 20px 30px; } }
  </style>
  <script>
    window.addEventListener('load', function() {
      var img = document.querySelector('.header-logo');
      if (!img) return;
      var c = document.createElement('canvas');
      c.width = img.naturalWidth || img.width;
      c.height = img.naturalHeight || img.height;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      img.src = c.toDataURL('image\/jpeg', 0.95);
    });
  <\/script>
</head>
<body>
  <div class="header">
    <div class="header-title">
      <h1>משפחת ${displayName} היקרה,</h1>
      <p class="apt-label">דירה ${tenant.apt}</p>
      <p>להלן פירוט ${debtsOnly || byOccupant ? 'החובות' : 'התשלומים'}${byOccupant ? ' מפוצל לפי שוכר' : ''} שלכם נכון לחודש ${curMonth} ${curYear}</p>
    </div>
    <div class="header-info">
      ${logoSrc
        ? `<img src="${logoSrc}" class="header-logo" />`
        : `<div>${settings.buildingName || ''}</div><div>${settings.address || ''}</div>`}
    </div>
  </div>

  ${bodyHtml}

  <div class="summary">
    ${debtsOnly || byOccupant ? '' : `<div class="summary-row"><span>סה"כ שולם</span><span class="paid">₪${totalPaid.toLocaleString()}</span></div>`}
    <div class="summary-row summary-total"><span>יתרת חוב לתשלום</span><span>₪${totalDebtAmt.toLocaleString()}</span></div>
    ${splitRowsHtml(tenantRaw, mainData)}
  </div>

  ${ownedSections.length > 0 ? `
  <div style="margin-top: 44px; padding-top: 26px; border-top: 3px solid #d97706;">
    <h2 style="font-size: 18px; font-weight: bold; color: #b45309; margin-bottom: 4px;">דירות מושכרות בבעלותך</h2>
    <p style="font-size: 12px; color: #92400e; margin-bottom: 18px;">חובת התשלום עבור הדירות הבאות חלה עלייך כבעל/ת הדירה</p>
    ${ownedSections.map(({ apt, aptBodyHtml, aptPaid, aptDebt, aptSplitHtml }) => `
    <div style="margin-bottom: 30px;">
      <div style="font-size: 15px; font-weight: bold; color: #92400e; background: #fffbeb; border-right: 4px solid #d97706; border-radius: 6px; padding: 8px 14px; margin-bottom: 8px;">דירה ${apt.apt} — ${apt.name}</div>
      ${aptBodyHtml}
      <div class="summary" style="margin-top: 12px;">
        ${debtsOnly || byOccupant ? '' : `<div class="summary-row"><span>סה"כ שולם</span><span class="paid">₪${aptPaid.toLocaleString()}</span></div>`}
        <div class="summary-row summary-total" style="color: ${aptDebt > 0 ? '#dc2626' : '#16a34a'};"><span>יתרת חוב לתשלום</span><span>₪${aptDebt.toLocaleString()}</span></div>
        ${aptSplitHtml}
      </div>
    </div>
    `).join('')}
    <div class="summary" style="border-color:#d97706;background:#fffbeb">
      <div class="summary-row summary-total" style="border-top:none;margin-top:0;padding-top:0;color:${totalDebtAmt + ownedSections.reduce((s, x) => s + x.aptDebt, 0) > 0 ? '#dc2626' : '#16a34a'}">
        <span>סה"כ לתשלום — כולל כל הדירות</span><span>₪${(totalDebtAmt + ownedSections.reduce((s, x) => s + x.aptDebt, 0)).toLocaleString()}</span>
      </div>
    </div>
  </div>
  ` : ''}

  <div class="footer">מסמך זה הופק ב-${curMonth} ${curYear} | ${settings.buildingName || ''}</div>
</body>
</html>`;

    return html;
  }

  function printTenantStatement(tenant, years, mode = 'full', includeOwned = false, occupantFilter = '') {
    const html = buildTenantStatementHtml(tenant, years, mode, includeOwned, occupantFilter);
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 800);
  }

  function printExpensesReport() {
    const today = new Date();
    const dateStr = today.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const logo = settings.logo || '';

    const fmtGreg = g => g ? g.split('-').reverse().join('/') : '';
    const elecDate = (greg, d, m, y) => {
      if (greg) return fmtGreg(greg);
      const iso = hebDateToGregStr(d, m, y);
      return iso ? fmtGreg(iso) : '';
    };
    const fmtHeb = (d, m, y) => `${d || ''} ${m || ''} ${y || ''}`.trim();

    const elecRows = (settings.electricityExpenses || []).map(e => {
      const paid = e.paymentMethod ? (e.totalAmount || 0) : 0;
      const remaining = e.paymentMethod ? 0 : (e.totalAmount || 0);
      return `
      <tr class="${e.paymentMethod ? 'paid' : 'unpaid'}">
        <td>${elecDate(e.fromGreg, e.fromDay, e.fromMonth, e.fromYear)}</td>
        <td>${elecDate(e.toGreg, e.toDay, e.toMonth, e.toYear)}</td>
        <td>₪${(e.totalAmount || 0).toLocaleString()}</td>
        <td>₪${paid.toLocaleString()}</td>
        <td>${remaining > 0 ? `<span style="color:#dc2626;font-weight:bold">₪${remaining.toLocaleString()}</span>` : '—'}</td>
        <td>${e.paymentMethod || '—'}</td>
        <td>${elecDate(e.paymentGreg, e.paymentDay, e.paymentMonth, e.paymentYear) || '—'}</td>
        <td>${e.note || ''}</td>
      </tr>`;
    }).join('');

    const makeOtherRows = key => (settings[key] || []).map(e => {
      const linkedCharges = key === 'extraordinaryExpenses'
        ? (tenants || []).flatMap(t => (t.charges || []).filter(c => c.expenseId === e.id))
        : [];
      const isPulled = linkedCharges.length > 0;
      const autoPaid = linkedCharges.filter(c => c.status === 'שולם').reduce((s, c) => s + c.amount, 0);
      const paid = isPulled ? autoPaid : (e.paidAmount || 0);
      const remaining = Math.max(0, (e.totalAmount || 0) - paid);
      return `
      <tr class="${remaining <= 0 && (e.totalAmount || 0) > 0 ? 'paid' : 'unpaid'}">
        <td>${e.description || ''}</td>
        <td>${fmtHeb(e.hebrewDay, e.hebrewMonth, e.hebrewYear)}</td>
        <td>₪${(e.totalAmount || 0).toLocaleString()}</td>
        <td>₪${paid.toLocaleString()}</td>
        <td>${remaining > 0 ? `<span style="color:#dc2626;font-weight:bold">₪${remaining.toLocaleString()}</span>` : '—'}</td>
        <td>${e.note || ''}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8">
    <title>דוח הוצאות</title>
    <style>
      body { font-family: Arial, sans-serif; direction: rtl; padding: 30px; color: #222; font-size: 13px; }
      .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 2px solid #0f766e; padding-bottom: 16px; }
      .logo { max-height: 150px; max-width: 300px; object-fit: contain; }
      .building { font-size: 18px; font-weight: bold; color: #0f766e; }
      .meta { font-size: 12px; color: #666; margin-top: 4px; }
      h3 { margin: 24px 0 8px; font-size: 15px; color: #0f766e; border-bottom: 1px solid #d1fae5; padding-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th { background: #f0fdfa; color: #0f766e; padding: 7px 10px; text-align: right; font-size: 12px; border: 1px solid #e2e8f0; }
      td { padding: 6px 10px; border: 1px solid #e2e8f0; font-size: 12px; }
      tr.paid td { background: #f0fdf4; }
      tr.unpaid td { background: #fff5f5; }
      .footer { margin-top: 32px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
      @media print { body { padding: 15px; } }
    </style></head><body>
    <div class="header">
      <div>
        <div class="building">${settings.buildingName || 'ועד הבית'}</div>
        <div class="meta">${settings.address || ''}</div>
        <div style="font-size:15px;font-weight:bold;margin-top:6px">דוח הוצאות</div>
        <div class="meta">הופק: ${dateStr}</div>
      </div>
      ${logo ? `<img src="${logo}" class="logo" />` : ''}
    </div>

    <h3>⚡ חשמל</h3>
    <table><thead><tr><th>תקופה מ-</th><th>עד</th><th>סכום</th><th>שולם</th><th>יתרה</th><th>אופן תשלום</th><th>תאריך תשלום</th><th>הערות</th></tr></thead>
    <tbody>${elecRows || '<tr><td colspan="8" style="text-align:center;color:#aaa">אין נתונים</td></tr>'}</tbody></table>

    <h3>🧹 ניקיון</h3>
    <table><thead><tr><th>תיאור</th><th>תאריך</th><th>סכום</th><th>שולם</th><th>יתרה</th><th>הערה</th></tr></thead>
    <tbody>${makeOtherRows('cleaningExpenses') || '<tr><td colspan="6" style="text-align:center;color:#aaa">אין נתונים</td></tr>'}</tbody></table>

    <h3>📋 הוצאות שוטפות</h3>
    <table><thead><tr><th>תיאור</th><th>תאריך</th><th>סכום</th><th>שולם</th><th>יתרה</th><th>הערה</th></tr></thead>
    <tbody>${makeOtherRows('regularExpenses') || '<tr><td colspan="6" style="text-align:center;color:#aaa">אין נתונים</td></tr>'}</tbody></table>

    <h3>⚠️ הוצאות חריגות</h3>
    <table><thead><tr><th>תיאור</th><th>תאריך</th><th>סכום</th><th>שולם</th><th>יתרה</th><th>הערה</th></tr></thead>
    <tbody>${makeOtherRows('extraordinaryExpenses') || '<tr><td colspan="6" style="text-align:center;color:#aaa">אין נתונים</td></tr>'}</tbody></table>

    <div class="footer">${settings.buildingName || ''} | הופק ב-${dateStr}</div>
    <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 600); }<\/script>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
  }

  function printTenantsStatusReport() {
    const today = new Date();
    const dateStr = today.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const logo = settings.logo || '';

    const sorted = [...(tenants || [])].sort((a, b) => Number(a.apt) - Number(b.apt));
    const rows = sorted.map(t => {
      const debt = unitDebt(t, tenants);
      const credit = calcCredit(t);
      const debtByOccupant = debt > 0 ? calcDebtByOccupant(unitView(t, tenants)) : [];
      const statusParts = [];
      if (debt > 0) {
        statusParts.push(`<div style="color:#dc2626;font-weight:bold">₪${debt.toLocaleString()} חוב</div>`);
        if (debtByOccupant.length > 1) {
          statusParts.push(debtByOccupant.map(([name, amount]) => `<div style="font-size:11px;font-weight:normal;color:#991b1b">${name}: ₪${amount.toLocaleString()}</div>`).join(''));
        }
      }
      if (credit > 0) {
        statusParts.push(`<div style="color:#16a34a;font-weight:bold">₪${credit.toLocaleString()} זכות</div>`);
      }
      const statusHtml = statusParts.length > 0 ? statusParts.join('') : `<span style="color:#0d9488;font-weight:bold">מעודכן ✓</span>`;
      return `
      <tr class="${debt > 0 ? 'unpaid' : 'paid'}">
        <td>${t.apt}</td>
        <td>${t.name || ''}</td>
        <td>${getOwnerTenant(t)?.name || ''}</td>
        <td>${t.phone || ''}</td>
        <td>₪${(Number(t.monthlyRent) || 0).toLocaleString()}${t.feePercent && Number(t.feePercent) !== 100 ? ` (${t.feePercent}%)` : ''}</td>
        <td>${statusHtml}</td>
      </tr>`;
    }).join('');

    const totalDebtSum = sorted.reduce((s, t) => s + unitDebt(t, tenants), 0);
    const totalCreditSum = sorted.reduce((s, t) => s + calcCredit(t), 0);

    // סיכום לפי בעלי דירות מושכרות: כמה כל אחד חייב בסך הכל (הדירה שלו + הדירות שהוא משכיר)
    const owners = sorted.filter(t => !t.ownerId && getOwnedApartments(t.id).length > 0);
    const ownersSummaryHtml = owners.length === 0 ? '' : `
    <h3 style="color:#b45309;font-size:15px;margin:24px 0 8px">סיכום לפי בעלי דירות מושכרות</h3>
    <table><thead><tr><th>בעל הדירה</th><th>הדירה שלו</th><th>דירות מושכרות</th><th>לגבות מהשוכרים</th><th>על חשבונו (בדירות)</th><th>סה"כ לתשלום</th></tr></thead>
    <tbody>${owners.map(o => {
      const apts = [...getOwnedApartments(o.id)].sort((a, b) => Number(a.apt) - Number(b.apt));
      const own = unitDebt(o, tenants);
      const splits = apts.map(a => unitDebtSplit(a));
      const occ = splits.reduce((s, x) => s + x.occupant, 0);
      const ownr = splits.reduce((s, x) => s + x.owner, 0);
      const total = own + occ + ownr;
      return `<tr class="${total > 0 ? 'unpaid' : 'paid'}">
        <td>${o.name} (דירה ${o.apt})</td>
        <td>₪${own.toLocaleString()}</td>
        <td>${apts.map(a => a.apt).join(', ')}</td>
        <td>₪${occ.toLocaleString()}</td>
        <td>₪${ownr.toLocaleString()}</td>
        <td style="font-weight:bold;color:${total > 0 ? '#dc2626' : '#16a34a'}">₪${total.toLocaleString()}</td>
      </tr>`;
    }).join('')}</tbody></table>`;

    const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8">
    <title>דוח מצב דיירים</title>
    <style>
      body { font-family: Arial, sans-serif; direction: rtl; padding: 30px; color: #222; font-size: 13px; }
      .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 2px solid #0f766e; padding-bottom: 16px; }
      .logo { max-height: 150px; max-width: 300px; object-fit: contain; }
      .building { font-size: 18px; font-weight: bold; color: #0f766e; }
      .meta { font-size: 12px; color: #666; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th { background: #f0fdfa; color: #0f766e; padding: 7px 10px; text-align: right; font-size: 12px; border: 1px solid #e2e8f0; }
      td { padding: 6px 10px; border: 1px solid #e2e8f0; font-size: 12px; }
      tr.paid td { background: #f0fdf4; }
      tr.unpaid td { background: #fff5f5; }
      tfoot td { font-weight: bold; background: #f8fafc; }
      .footer { margin-top: 32px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
      @media print { body { padding: 15px; } }
    </style></head><body>
    <div class="header">
      <div>
        <div class="building">${settings.buildingName || 'ועד הבית'}</div>
        <div class="meta">${settings.address || ''}</div>
        <div style="font-size:15px;font-weight:bold;margin-top:6px">דוח מצב דיירים</div>
        <div class="meta">הופק: ${dateStr}</div>
      </div>
      ${logo ? `<img src="${logo}" class="logo" />` : ''}
    </div>

    <table><thead><tr><th>דירה</th><th>שם</th><th>בעל הדירה</th><th>טלפון</th><th>שכ"ד חודשי</th><th>מצב</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#aaa">אין דיירים</td></tr>'}</tbody>
    <tfoot><tr>
      <td colspan="5">סה"כ</td>
      <td>${totalDebtSum > 0 ? `<span style="color:#dc2626">₪${totalDebtSum.toLocaleString()} חוב</span>` : ''}${totalCreditSum > 0 ? `<span style="color:#16a34a"> ₪${totalCreditSum.toLocaleString()} זכות</span>` : ''}${totalDebtSum === 0 && totalCreditSum === 0 ? '—' : ''}</td>
    </tr></tfoot></table>

    ${ownersSummaryHtml}

    <div class="footer">${settings.buildingName || ''} | הופק ב-${dateStr}</div>
    <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 600); }<\/script>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
  }

  function printReminderSlips(onlyTenant) {
    const { month: curMonth, year: curYear } = getCurrentHebrewDate();
    const dateStr = new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    // דירה מושכרת - הפתק יוצא לבעל הדירה (והחוב שלה כלול בו)
    const payerOf = t => (t.ownerId && getOwnerTenant(t)) || t;
    const sorted = onlyTenant ? [payerOf(onlyTenant)] : [...(tenants || [])].filter(t => !t.ownerId).sort((a, b) => Number(a.apt) - Number(b.apt));

    const slotsPerPage = 6;
    const pages = [];
    for (let i = 0; i < sorted.length; i += slotsPerPage) pages.push(sorted.slice(i, i + slotsPerPage));

    const slipHtml = (tRaw) => {
      const t = unitView(tRaw, tenants);
      const aptLines = getOwnedApartments(tRaw.id)
        .map(a => ({ a, d: unitDebt(a, tenants) })).filter(x => x.d > 0)
        .map(({ a, d }) => ({ d, line: `₪${d.toLocaleString()} – דירה ${a.apt}${a.name && !a.vacant ? ` (${a.name})` : ''}` }));
      const amount = Number(t.monthlyRent) || 0;
      const curPayment = (t.payments || []).find(p => p.hebrewMonth === curMonth && p.hebrewYear === curYear);
      const paidThisMonth = curPayment && curPayment.status === 'שולם';
      const reminderText = paidThisMonth
        ? `שולם עבור חודש ${curMonth} ${curYear}, תודה רבה!`
        : `תזכורת: נא לשלם דמי ועד בית עבור חודש ${curMonth} ${curYear}${amount ? ` בסך ₪${amount.toLocaleString()}` : ''}.`;

      const isCurrentOccupant = x => (x.occupantName || t.name) === t.name;

      const chargeDebtsByDesc = {};
      (t.charges || []).filter(c => c.status === 'חוב' && isCurrentOccupant(c)).forEach(c => {
        const key = c.description || 'הוצאה חריגה';
        chargeDebtsByDesc[key] = (chargeDebtsByDesc[key] || 0) + c.amount;
      });
      const currentMonthDebt = (curPayment && curPayment.status === 'חוב') ? curPayment.amount - (curPayment.paidAmount || 0) : 0;
      const prevMonthsDebt = (t.payments || [])
        .filter(p => p.status === 'חוב' && isCurrentOccupant(p) && !(p.hebrewMonth === curMonth && p.hebrewYear === curYear))
        .reduce((s, p) => s + p.amount - (p.paidAmount || 0), 0);
      const chargesDebtTotal = Object.values(chargeDebtsByDesc).reduce((s, a) => s + a, 0);
      const debt = currentMonthDebt + chargesDebtTotal + prevMonthsDebt + aptLines.reduce((s, x) => s + x.d, 0);
      const debtDetailLines = [
        ...(currentMonthDebt > 0 ? [`₪${currentMonthDebt.toLocaleString()} – חודש ${curMonth} ${curYear} (החודש הנוכחי)`] : []),
        ...Object.entries(chargeDebtsByDesc).map(([desc, amt]) => `₪${amt.toLocaleString()} – ${desc}`),
        ...(prevMonthsDebt > 0 ? [`₪${prevMonthsDebt.toLocaleString()} – תשלומים חודשיים קודמים (ניתן לקבל פירוט מלא במייל)`] : []),
        ...aptLines.map(x => x.line),
      ];

      return `
      <div class="slip">
        <div class="slip-header">
          ${settings.logo ? `<img src="${settings.logo}" class="logo" />` : ''}
          <div class="apt-name-row">
            <span class="apt">דירה ${t.apt}</span>
            <span class="name">${t.name || ''}</span>
          </div>
        </div>
        <div class="reminder ${paidThisMonth ? 'paid-msg' : ''}">${reminderText}</div>
        <div class="debt-line ${debt > 0 ? 'has-debt' : 'no-debt'}">יתרת חוב כוללת: ${debt > 0 ? `₪${debt.toLocaleString()}` : 'אין חוב'}</div>
        ${debtDetailLines.map(line => `<div class="debt-detail">${line}</div>`).join('')}
      </div>`;
    };

    const pagesHtml = pages.map(pageTenants => `
      <div class="sheet">
        ${pageTenants.map(slipHtml).join('')}
      </div>`).join('');

    const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8">
    <title>פתקי תזכורת תשלום</title>
    <style>
      @page { size: A4; margin: 10mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; direction: rtl; color: #222; margin: 0; }
      .sheet { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(3, 1fr); gap: 6mm; height: 277mm; page-break-after: always; }
      .sheet:last-child { page-break-after: auto; }
      .slip { border: 1px dashed #94a3b8; border-radius: 6px; padding: 5mm; display: flex; flex-direction: column; justify-content: space-between; break-inside: avoid; }
      .slip-header { display: flex; flex-direction: column; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 3mm; margin-bottom: 3mm; }
      .logo { max-height: 12mm; max-width: 45mm; object-fit: contain; margin-bottom: 2mm; }
      .apt-name-row { display: flex; justify-content: space-between; align-items: baseline; width: 100%; }
      .apt { font-size: 16px; font-weight: bold; color: #0f766e; }
      .name { font-size: 14px; font-weight: bold; }
      .reminder { font-size: 17px; line-height: 1.6; flex-grow: 1; display: flex; align-items: center; }
      .reminder.paid-msg { color: #16a34a; font-weight: bold; }
      .debt-line { font-size: 19px; font-weight: bold; border-top: 1px solid #e2e8f0; padding-top: 2mm; margin-top: 2mm; }
      .debt-detail { font-size: 10px; color: #64748b; margin-top: 1mm; }
      .has-debt { color: #dc2626; }
      .no-debt { color: #16a34a; }
      @media print { .sheet { page-break-after: always; } }
    </style></head><body>
    ${pagesHtml || '<p>אין דיירים</p>'}
    <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 600); }<\/script>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
  }

  // קובץ אקסל לבעל דירה: סיכום, גיליון לכל דירה (כל ההיסטוריה) וקבלות.
  // מדירה מושכרת - הקובץ יוצא לבעל הדירה, כמו כל ההתנהלות.
  async function downloadOwnerExcel(fromTenant) {
    const payer = (fromTenant.ownerId && getOwnerTenant(fromTenant)) || fromTenant;
    const units = [payer, ...[...getOwnedApartments(payer.id)].sort((a, b) => Number(a.apt) - Number(b.apt))];
    let ExcelJS;
    try { ExcelJS = await loadExcelJS(); } catch (e) { alert(e.message); return; }

    const wb = new ExcelJS.Workbook();
    wb.creator = settings.buildingName || 'ועד הבית';
    const { month: curM, year: curY } = getCurrentHebrewDate();
    const today = new Date().toLocaleDateString('he-IL');
    const TEAL = 'FF0F766E';
    const MONEY = '₪#,##0;-₪#,##0';
    const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
    const thin = { style: 'thin', color: { argb: 'FFE5E7EB' } };
    const border = { top: thin, bottom: thin, left: thin, right: thin };

    const newSheet = (name, title, widths) => {
      const ws = wb.addWorksheet(name.slice(0, 31), { views: [{ rightToLeft: true, state: 'frozen', ySplit: 4 }] });
      widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
      ws.mergeCells(1, 1, 1, widths.length);
      ws.getCell(1, 1).value = title;
      ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: TEAL } };
      ws.mergeCells(2, 1, 2, widths.length);
      ws.getCell(2, 1).value = `${settings.buildingName || ''} · הופק ${today} (${curM} ${curY})`;
      ws.getCell(2, 1).font = { color: { argb: 'FF6B7280' } };
      return ws;
    };
    const addHeader = (ws, labels) => {
      const row = ws.getRow(4);
      row.values = labels;
      row.height = 22;
      row.eachCell(c => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = fill(TEAL);
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c.border = border;
      });
    };
    const addTotalRow = (ws, label, sumCols, firstRow, lastRow) => {
      const row = ws.addRow([]);
      row.getCell(1).value = label;
      sumCols.forEach(col => {
        const L = ws.getColumn(col).letter;
        row.getCell(col).value = lastRow >= firstRow ? { formula: `SUM(${L}${firstRow}:${L}${lastRow})` } : 0;
        row.getCell(col).numFmt = MONEY;
      });
      row.eachCell({ includeEmpty: true }, c => { c.font = { bold: true }; c.fill = fill('FFF1F5F9'); c.border = border; });
    };

    // ---- סיכום ----
    const sum = newSheet('סיכום', `${payer.name} — מצב חשבון ועד בית`, [16, 22, 18, 22, 16]);
    addHeader(sum, ['דירה', 'שוכר', 'לגבות מהשוכר', 'על חשבון בעל הדירה', 'סה״כ חוב']);
    units.forEach(u => {
      const isRental = u.id !== payer.id;
      const split = isRental ? unitDebtSplit(u) : { occupant: 0, owner: unitDebt(u, tenants), total: unitDebt(u, tenants) };
      const row = sum.addRow([
        isRental ? `דירה ${u.apt}` : `דירה ${u.apt} (מגורים)`,
        isRental ? (u.vacant ? 'ריקה' : (u.name || '')) : '—',
        split.occupant, split.owner, split.total,
      ]);
      [3, 4, 5].forEach(c => { row.getCell(c).numFmt = MONEY; });
      row.eachCell(c => { c.border = border; });
      if (split.total > 0) row.getCell(5).font = { bold: true, color: { argb: 'FFDC2626' } };
    });
    addTotalRow(sum, 'סה״כ', [3, 4, 5], 5, 4 + units.length);

    // ---- גיליון לכל דירה ----
    const expById = new Map((settings.extraordinaryExpenses || []).map(e => [e.id, e]));
    units.forEach(u => {
      const isRental = u.id !== payer.id;
      const ws = newSheet(isRental ? `דירה ${u.apt}` : `דירה ${u.apt} (מגורים)`,
        `דירה ${u.apt}${isRental ? ` — שוכר: ${u.vacant ? 'ריקה' : (u.name || '')}` : ` — ${payer.name}`}`,
        [12, 24, 16, 14, 12, 12, 12, 14, 24, 26]);
      addHeader(ws, ['סוג', 'תקופה / תיאור', 'שוכר באותה תקופה', 'על חשבון', 'לתשלום', 'שולם', 'יתרה', 'סטטוס', 'הערה', 'רישום שלי']);
      const rows = [];
      [...u.payments]
        .sort((a, b) => monthSortKey(a.hebrewMonth, a.hebrewYear) - monthSortKey(b.hebrewMonth, b.hebrewYear))
        .forEach(p => {
          const paid = p.status === 'שולם' ? (p.paidAmount || p.amount) : (p.paidAmount || 0);
          const remaining = p.status === 'חוב' ? Math.max(0, p.amount - (p.paidAmount || 0)) : 0;
          const status = p.status === 'שולם' ? 'שולם' : p.status === 'זכות' ? 'שולם מראש' : paid > 0 ? 'שולם חלקית' : 'לא שולם';
          rows.push({ values: ['דמי ועד', `${p.hebrewMonth} ${p.hebrewYear}`, p.occupantName || u.name || '',
            isRental ? ((u.monthlyBillTo || 'occupant') === 'owner' ? 'בעל הדירה' : 'השוכר') : '',
            p.amount, paid, remaining, status, p.note || ''], remaining });
        });
      unitCharges(u, tenants).forEach(({ c }) => {
        const exp = c.expenseId ? expById.get(c.expenseId) : null;
        const when = exp && (exp.hebrewMonth || exp.hebrewYear) ? ` (${[exp.hebrewDay, exp.hebrewMonth, exp.hebrewYear].filter(Boolean).join(' ')})` : '';
        const paid = c.status === 'שולם' ? c.amount : 0;
        const remaining = c.status === 'חוב' ? c.amount : 0;
        rows.push({ values: [c.expenseId ? 'הוצאה חריגה' : 'חיוב נוסף', `${c.description || 'חיוב'}${when}`, c.occupantName || '',
          isRental ? (chargeBillTo(c) === 'owner' ? 'בעל הדירה' : 'השוכר') : '',
          c.amount, paid, remaining, c.status === 'שולם' ? 'שולם' : 'לא שולם', c.note || ''], remaining });
      });
      rows.forEach(({ values, remaining }) => {
        const row = ws.addRow(values);
        [5, 6, 7].forEach(col => { row.getCell(col).numFmt = MONEY; });
        row.eachCell({ includeEmpty: true }, c => { c.border = border; });
        for (let col = 1; col <= 9; col++) row.getCell(col).fill = fill(remaining > 0 ? 'FFFEF2F2' : 'FFF0FDF4');
        if (remaining > 0) row.getCell(7).font = { bold: true, color: { argb: 'FFDC2626' } };
      });
      addTotalRow(ws, 'סה״כ', [5, 6, 7], 5, 4 + rows.length);
    });

    // ---- קבלות ----
    const receipts = units.flatMap(u => (u.receipts || []).map(r => ({ r, u })));
    if (receipts.length > 0) {
      const ws = newSheet('קבלות תשלום', `${payer.name} — קבלות תשלום`, [13, 12, 14, 60, 22, 10]);
      addHeader(ws, ['תאריך', 'סכום', 'אמצעי תשלום', 'עבור', 'הערה', 'סטטוס']);
      receipts.sort((a, b) => b.r.id - a.r.id).forEach(({ r, u }) => {
        const prefix = u.id !== payer.id ? `דירה ${u.apt} · ` : '';
        const row = ws.addRow([fmtGregDate(r.date), r.amount, r.method,
          r.allocations.map(a => `${prefix}${a.label}: ₪${a.amount.toLocaleString()}`).join(' | '), r.note || '', r.cancelled ? 'בוטלה' : '']);
        row.getCell(2).numFmt = MONEY;
        row.getCell(4).alignment = { wrapText: true, vertical: 'top' };
        row.eachCell({ includeEmpty: true }, c => { c.border = border; });
        if (r.cancelled) row.eachCell(c => { c.font = { strike: true, color: { argb: 'FF9CA3AF' } }; });
      });
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ועד בית - ${payer.name} - ${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function openSettings() {
    setSettingsData({ ...settings });
    setView('settings');
    setSettingsSaved(false);
  }

  // רק השדות שנערכים במסך ההגדרות. כל השאר (הוצאות, יתרת קופה וכו') נלקח מהמצב העדכני,
  // כדי ששמירת ההגדרות לא תדרוס הוצאה שנוספה בינתיים (למשל ממכשיר אחר)
  const SETTINGS_PAGE_FIELDS = ['logo', 'buildingName', 'address', 'managers', 'feeHistory', 'emailSettings', 'templates'];

  async function saveSettings() {
    const merged = { ...settingsRef.current };
    SETTINGS_PAGE_FIELDS.forEach(k => { merged[k] = settingsData[k]; });
    skipSettingsSaveRef.current = true;
    settingsRef.current = merged;
    setSettings(merged);
    if (session) {
      setIsSavingSettings(true);
      try { await enqueueSave('settings'); } finally { setIsSavingSettings(false); }
    }
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }

  function exportBackup() {
    const backup = { exportedAt: new Date().toISOString(), tenants, settings };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaad-bayit-גיבוי-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupExported(true);
    setTimeout(() => setBackupExported(false), 2000);
  }

  function applyFeeToAllTenants(amount, fromMonth, fromYear) {
    if (!confirm(`לעדכן את כל הדיירים לתעריף ₪${amount} החל מ-${fromMonth}?`)) return;
    const yearRank = y => HEBREW_YEARS.indexOf(y);
    const fromYearMonths = monthsForYear(fromYear);
    const monthRank = m => fromYearMonths.indexOf(m);
    setTenants(prev => prev.map(t => {
      const tenantAmount = Math.round(amount * (Number(t.feePercent || 100) / 100));
      return {
        ...t,
        monthlyRent: tenantAmount,
        payments: t.payments.map(p => {
          const afterYear = yearRank(p.hebrewYear) > yearRank(fromYear);
          const sameYearAfterMonth = yearRank(p.hebrewYear) === yearRank(fromYear) && monthRank(p.hebrewMonth) >= monthRank(fromMonth);
          return p.status === 'חוב' && (afterYear || sameYearAfterMonth) ? { ...p, amount: tenantAmount } : p;
        }),
      };
    }));
  }

  function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 300;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        setSettingsData(d => ({ ...d, logo: canvas.toDataURL('image/png') }));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  const selectedTenant = tenants?.find(t => t.id === selectedId);

  function openTenant(id) { setSelectedId(id); setView('tenant'); setEditMode(false); setOpenMonth(null); window.scrollTo?.(0, 0); }
  function goList() { setView('list'); setSelectedId(null); setEditMode(false); }

  function startEdit() {
    setEditData({ ...selectedTenant, payments: selectedTenant.payments.map(p => ({ ...p })) });
    setEditMode(true);
  }

  function saveEdit() {
    setTenants(prev => prev.map(t => t.id === editData.id ? editData : t));
    setSelectedId(editData.id);
    setEditMode(false);
  }

  function deleteTenant(id) {
    if (!confirm('למחוק דייר זה?')) return;
    setTenants(prev => prev.filter(t => t.id !== id));
    goList();
  }

  function togglePayment(pId) {
    setTenants(prev => prev.map(t => {
      if (t.id !== selectedId) return t;
      return { ...t, payments: t.payments.map(p => {
        if (p.id !== pId) return p;
        const newStatus = p.status === 'שולם' ? 'חוב' : 'שולם';
        return { ...p, status: newStatus, paidAmount: newStatus === 'שולם' ? p.amount : 0 };
      })};
    }));
  }

  function updatePaymentAmount(pId, amount) {
    setTenants(prev => prev.map(t => {
      if (t.id !== selectedId) return t;
      return { ...t, payments: t.payments.map(p => p.id === pId ? { ...p, amount: Number(amount) } : p) };
    }));
  }

  function updatePaymentPaid(pId, paidAmount) {
    setTenants(prev => prev.map(t => {
      if (t.id !== selectedId) return t;
      return { ...t, payments: t.payments.map(p => {
        if (p.id !== pId) return p;
        const paid = Math.max(Number(paidAmount) || 0, 0);
        const capped = Math.min(paid, p.amount);
        const isFuture = isFutureMonth(p.hebrewMonth, p.hebrewYear);
        if (isFuture) return { ...p, paidAmount: capped, status: capped > 0 ? 'זכות' : 'חוב' };
        return { ...p, paidAmount: capped, status: capped >= p.amount ? 'שולם' : 'חוב' };
      })};
    }));
  }

  function renderTemplateForTenant(tpl, tenant) {
    const mgr = settings.managers[0] || {};
    const { month } = getCurrentHebrewDate();
    return tpl.body
      .replace(/{שם}/g, tenant.name)
      .replace(/{חודש}/g, month)
      .replace(/{סכום}/g, payerTotal(tenant, tenants).toLocaleString())
      .replace(/{תאריך}/g, new Date().toLocaleDateString('he-IL'))
      .replace(/{מנהל}/g, mgr.name || '')
      .replace(/{טלפון}/g, mgr.phone || '')
      .replace(/{כתובת}/g, settings.address || '');
  }

  function getReminderTemplate() {
    return settings.templates.find(t => t.name === 'תזכורת תשלום') || settings.templates[0];
  }

  function openPaymentReminders() {
    if (!getReminderTemplate()) { alert('לא הוגדרה תבנית תזכורת בהגדרות המערכת'); return; }
    setOpenedReminderIds(new Set());
    setShowRemindersModal(true);
  }

  function getOwnerTenant(t) {
    if (!t?.ownerId) return null;
    return tenants.find(x => x.id === t.ownerId) || null;
  }

  function getOwnedApartments(ownerId) {
    if (!ownerId) return [];
    return tenants.filter(t => t.ownerId === ownerId);
  }

  // בדירה מושכרת: על חשבון מי החיוב - 'occupant' (בעל הדירה גובה מהשוכר) או 'owner' (על חשבון בעל הדירה).
  // בחירה ידנית על החיוב > ההגדרה של ההוצאה החריגה > חיוב ישן שנרשם אצל בעל הדירה = על חשבונו.
  function chargeBillTo(c) {
    if (c.billTo) return c.billTo;
    if (c.expenseId) {
      const exp = (settings.extraordinaryExpenses || []).find(e => e.id === c.expenseId);
      if (exp?.billTo) return exp.billTo;
    }
    return c.billedApartmentId ? 'owner' : 'occupant';
  }

  // פירוק חוב של דירה מושכרת: כמה בעל הדירה צריך לגבות מהשוכר וכמה על חשבונו
  function unitDebtSplit(unit) {
    const v = unitView(unit, tenants);
    const monthly = v.payments.filter(p => p.status === 'חוב').reduce((s, p) => s + p.amount - (p.paidAmount || 0), 0);
    const open = v.charges.filter(c => c.status === 'חוב');
    const ownerCharges = open.filter(c => chargeBillTo(c) === 'owner').reduce((s, c) => s + c.amount, 0);
    const occCharges = open.filter(c => chargeBillTo(c) !== 'owner').reduce((s, c) => s + c.amount, 0);
    const monthlyOwner = unit.monthlyBillTo === 'owner';
    return {
      occupant: occCharges + (monthlyOwner ? 0 : monthly),
      owner: ownerCharges + (monthlyOwner ? monthly : 0),
      total: monthly + ownerCharges + occCharges,
    };
  }

  function updateChargeOnHost(hostId, chargeId, patch) {
    setTenants(prev => prev.map(t => t.id !== hostId ? t : { ...t, charges: (t.charges || []).map(x => x.id === chargeId ? { ...x, ...patch } : x) }));
  }

  function deleteChargeOnHost(hostId, chargeId) {
    setTenants(prev => prev.map(t => t.id !== hostId ? t : { ...t, charges: (t.charges || []).filter(x => x.id !== chargeId) }));
  }

  function isExpenseAppliedToTenant(t, expenseId) {
    return unitCharges(t, tenants).some(({ c }) => c.expenseId === expenseId);
  }

  function buildExpenseChargeFor(exp, targetTenant, id) {
    const charge = {
      id,
      description: exp.description,
      amount: exp.perTenantAmount,
      status: 'חוב',
      note: '',
      expenseId: exp.id,
      occupantName: targetTenant.name,
    };
    return { hostId: targetTenant.id, charge };
  }

  function toggleExpenseChargeStatus(hostTenantId, chargeId) {
    setTenants(prev => prev.map(t => t.id !== hostTenantId ? t : {
      ...t, charges: (t.charges || []).map(x => x.id === chargeId ? { ...x, status: x.status === 'שולם' ? 'חוב' : 'שולם' } : x),
    }));
  }

  function getFeeForMonth(month, year, feeHistory = settings.feeHistory) {
    const yearRank = y => HEBREW_YEARS.indexOf(y);
    const monthRankIn = (y, m) => monthsForYear(y).indexOf(m);
    const applicable = [...(feeHistory || [])]
      .filter(f => {
        if (yearRank(year) > yearRank(f.fromYear)) return true;
        if (yearRank(year) === yearRank(f.fromYear) && monthRankIn(year, month) >= monthRankIn(f.fromYear, f.fromMonth)) return true;
        return false;
      })
      .sort((a, b) => (yearRank(b.fromYear) * 100 + monthRankIn(b.fromYear, b.fromMonth)) - (yearRank(a.fromYear) * 100 + monthRankIn(a.fromYear, a.fromMonth)));
    return applicable.length > 0 ? applicable[0].amount : (feeHistory?.[0]?.amount || 40);
  }

  function addPaymentDirect(month, year) {
    const tenant = tenants.find(t => t.id === selectedId);
    const baseAmount = getFeeForMonth(month, year);
    const amount = Math.round(baseAmount * (Number(tenant?.feePercent || 100) / 100));
    const isFuture = isFutureMonth(month, year);
    const status = isFuture ? 'זכות' : 'חוב';
    const newP = { id: Date.now(), hebrewMonth: month, hebrewYear: year, status, amount, paidAmount: isFuture ? amount : 0, occupantName: tenant?.name || '' };
    setTenants(prev => prev.map(t => t.id === selectedId ? { ...t, payments: [...t.payments, newP] } : t));
  }

  // יתרה שנשארת אחרי כיסוי החובות - נזקפת כתשלום מראש לחודשים הבאים (סטטוס 'זכות',
  // בדיוק כמו "+ הוסף" על חודש עתידי). כשהחודש מגיע, הטעינה הופכת אותו ל'שולם' כרגיל.
  function planPrepaid(tenant, amount) {
    let left = amount;
    const plan = [];
    if (left <= 0) return { plan, left };
    for (const { month, year } of nextMonthsFromNow(24)) {
      if (left <= 0) break;
      const existing = tenant.payments.find(p => p.hebrewMonth === month && p.hebrewYear === year);
      if (existing && existing.status === 'שולם') continue;
      const fullAmount = existing ? existing.amount : Math.round(getFeeForMonth(month, year) * (Number(tenant.feePercent || 100) / 100));
      const room = fullAmount - (existing?.paidAmount || 0);
      if (room <= 0) continue;
      const a = Math.min(left, room);
      plan.push({ month, year, amount: a, full: a >= room, existingId: existing?.id, fullAmount });
      left -= a;
    }
    return { plan, left };
  }

  function openReceiptModal(tenant) {
    const items = receiptDebtItems(tenant, tenants);
    setReceiptModal({
      tenantId: tenant.id,
      amount: '',
      date: new Date().toLocaleDateString('en-CA'),
      method: 'מזומן',
      note: '',
      checked: new Set(items.map(it => it.key)),
      prepay: true,
      prepayUnitId: tenant.id,
    });
  }

  function recordReceipt(form) {
    const amount = Math.round(Number(form.amount) || 0);
    if (amount <= 0) return;
    const baseId = Date.now();
    setTenants(prev => {
      const payer = prev.find(t => t.id === form.tenantId);
      if (!payer) return prev;
      const aptOf = id => prev.find(t => t.id === id)?.apt;
      const { alloc, left } = allocateAmount(receiptDebtItems(payer, prev), form.checked, amount);
      const prepayUnit = prev.find(t => t.id === form.prepayUnitId) || payer;
      const { plan, left: unallocated } = form.prepay ? planPrepaid(prepayUnit, left) : { plan: [], left };
      const prefix = unitId => unitId !== payer.id ? `דירה ${aptOf(unitId)} · ` : '';

      const allocations = alloc.map(a => ({ kind: a.kind, refId: a.refId, hostId: a.hostId, unitId: a.unitId, label: prefix(a.unitId) + a.label, amount: a.amount }));
      const payAlloc = new Map(alloc.filter(a => a.kind === 'payment').map(a => [`${a.hostId}:${a.refId}`, a.amount]));
      const chargeAlloc = new Set(alloc.filter(a => a.kind === 'charge').map(a => `${a.hostId}:${a.refId}`));
      const newRows = [];
      const prepaidAdds = new Map();
      plan.forEach((pl, i) => {
        const label = `${prefix(prepayUnit.id)}תשלום מראש — ${pl.month} ${pl.year}`;
        if (pl.existingId != null) {
          prepaidAdds.set(pl.existingId, pl.amount);
          allocations.push({ kind: 'prepaid', refId: pl.existingId, hostId: prepayUnit.id, unitId: prepayUnit.id, label, amount: pl.amount });
        } else {
          const id = baseId + 1 + i;
          newRows.push({ id, hebrewMonth: pl.month, hebrewYear: pl.year, status: 'זכות', amount: pl.fullAmount, paidAmount: pl.amount, occupantName: prepayUnit.name });
          allocations.push({ kind: 'prepaid', refId: id, hostId: prepayUnit.id, unitId: prepayUnit.id, label, amount: pl.amount, created: true });
        }
      });
      const receipt = { id: baseId, date: form.date, amount, method: form.method, note: form.note.trim(), allocations, unallocated };

      return prev.map(t => {
        let payments = t.payments.map(p => {
          const k = `${t.id}:${p.id}`;
          if (payAlloc.has(k)) {
            const paid = (p.paidAmount || 0) + payAlloc.get(k);
            return { ...p, paidAmount: paid, status: paid >= p.amount ? 'שולם' : 'חוב' };
          }
          if (t.id === prepayUnit.id && prepaidAdds.has(p.id)) return { ...p, paidAmount: (p.paidAmount || 0) + prepaidAdds.get(p.id), status: 'זכות' };
          return p;
        });
        if (t.id === prepayUnit.id && newRows.length) payments = [...payments, ...newRows];
        const charges = (t.charges || []).map(c => chargeAlloc.has(`${t.id}:${c.id}`) ? { ...c, status: 'שולם' } : c);
        const receipts = t.id === payer.id ? [...(t.receipts || []), receipt] : t.receipts;
        return { ...t, payments, charges, ...(receipts ? { receipts } : {}) };
      });
    });
    setReceiptModal(null);
  }

  // ביטול קבלה: מחזיר את כל מה שהקבלה כיסתה למצב חוב. הקבלה נשארת ברשימה מסומנת "בוטלה".
  function cancelReceipt(tenantId, receiptId) {
    const tenant = tenants.find(t => t.id === tenantId);
    const receipt = (tenant?.receipts || []).find(r => r.id === receiptId);
    if (!receipt || receipt.cancelled) return;
    if (!confirm(`לבטל את קבלת התשלום של ₪${receipt.amount.toLocaleString()} מ-${fmtGregDate(receipt.date)}?\n\nכל החודשים והחיובים שהיא כיסתה יחזרו להיות חוב.`)) return;
    setTenants(prev => prev.map(t => {
      const mine = receipt.allocations.filter(a => (a.hostId ?? tenantId) === t.id);
      if (mine.length === 0 && t.id !== tenantId) return t;
      let payments = t.payments;
      let charges = t.charges || [];
      mine.forEach(a => {
        if (a.kind === 'charge') {
          charges = charges.map(c => c.id === a.refId ? { ...c, status: 'חוב' } : c);
          return;
        }
        payments = payments.flatMap(p => {
          if (p.id !== a.refId) return [p];
          const paid = Math.max(0, (p.paidAmount || 0) - a.amount);
          if (a.created && paid === 0) return [];
          const status = isFutureMonth(p.hebrewMonth, p.hebrewYear)
            ? (paid > 0 ? 'זכות' : 'חוב')
            : (paid >= p.amount ? 'שולם' : 'חוב');
          return [{ ...p, paidAmount: paid, status }];
        });
      });
      const receipts = t.id === tenantId
        ? (t.receipts || []).map(r => r.id === receiptId ? { ...r, cancelled: true, cancelledAt: new Date().toISOString() } : r)
        : t.receipts;
      return { ...t, payments, charges, ...(receipts ? { receipts } : {}) };
    }));
  }

  function addPaymentRow() {
    const nextId = Math.max(0, ...editData.payments.map(p => p.id)) + 1;
    setEditData(d => ({ ...d, payments: [...d.payments, { id: nextId, hebrewMonth: 'תשרי', hebrewYear: CURRENT_HEBREW_YEAR, status: 'חוב', amount: d.monthlyRent, occupantName: d.name }] }));
  }

  function addNewTenant() {
    const id = Math.max(0, ...tenants.map(t => t.id)) + 1;
    setTenants(prev => [...prev, { ...newTenant, id, apt: String(newTenant.apt).trim(), monthlyRent: Number(newTenant.monthlyRent) || 0, payments: [], charges: [] }]);
    setNewTenant(EMPTY_TENANT);
    setView('list');
  }

  const totalDebt = tenants?.reduce((s, t) => s + calcDebt(t), 0) ?? 0;

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F5]">
      <p className="text-gray-400 text-sm">טוען...</p>
    </div>
  );

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F5] px-4" dir="rtl">
      <div className="bg-white rounded-[20px] border border-[#E3E8E6] p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <Building className="mx-auto text-teal-600 mb-2" size={38} />
          <h1 className="text-xl font-bold text-gray-800">ועד בית</h1>
          <p className="text-xs text-gray-400 mt-1">קדושת לוי 85, ירושלים</p>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">אימייל</label>
            <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required autoFocus
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">סיסמה</label>
            <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          {loginError && <p className="text-red-500 text-xs text-center">{loginError}</p>}
          <button type="submit" disabled={loginLoading}
            className="bg-teal-600 text-white rounded-lg py-2.5 font-bold text-sm hover:bg-teal-700 transition disabled:opacity-50">
            {loginLoading ? 'מתחבר...' : 'כניסה למערכת'}
          </button>
        </form>
      </div>
    </div>
  );

  if (dataLoading || !tenants || !settings) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F5]">
      <p className="text-gray-400 text-sm">טוען נתונים...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F6F5] flex items-start text-[#17211F]" dir="rtl">
      {dbError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <span>{dbError}</span>
          <button onClick={() => setDbError(null)} className="hover:opacity-70" aria-label="סגירה"><X size={16} /></button>
        </div>
      )}
      {(() => {
        const navItems = [
          { key: 'dashboard', label: 'דשבורד', Icon: LayoutDashboard, go: () => setView('dashboard'), active: view === 'dashboard' },
          { key: 'list', label: 'דיירים', Icon: Building, go: goList, active: view === 'list' || view === 'tenant' || view === 'add' },
          { key: 'expenses', label: 'הוצאות', Icon: ReceiptText, go: () => setView('expenses'), active: view === 'expenses' },
          { key: 'settings', label: 'הגדרות', Icon: Settings, go: openSettings, active: view === 'settings' },
        ];
        return (
          <>
            <nav aria-label="ניווט ראשי" className="hidden md:flex w-[220px] shrink-0 flex-col gap-1.5 bg-[#0B3B37] text-[#E6F2F0] px-4 py-7 sticky top-0 h-screen">
              <div className="flex items-center gap-2.5 px-2.5 pb-6">
                {settings.logo
                  ? <img src={settings.logo} alt="לוגו" className="w-11 h-11 rounded-xl object-contain bg-white p-0.5 shrink-0" />
                  : <div className="w-11 h-11 rounded-xl bg-teal-400 text-[#0B3B37] flex items-center justify-center shrink-0"><Building size={22} /></div>}
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-[15px] truncate">{settings.buildingName || 'ועד בית'}</span>
                  <span className="text-xs text-[#9CC9C2] truncate">{settings.address || ''}</span>
                </div>
              </div>
              {navItems.map(({ key, label, Icon, go, active }) => (
                <button key={key} onClick={go} aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-[15px] text-right transition ${active ? 'bg-white/[0.12] text-white font-medium' : 'text-[#C9E4E0] hover:bg-white/[0.06] hover:text-white'}`}>
                  <Icon size={20} /> {label}
                </button>
              ))}
              <button onClick={handleLogout} className="mt-auto flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm text-[#9CC9C2] hover:text-white hover:bg-white/[0.06] transition">
                <LogOut size={18} /> יציאה
              </button>
            </nav>

            <nav aria-label="ניווט ראשי" className="md:hidden fixed bottom-0 inset-x-0 z-40 flex bg-white border-t border-[#E3E8E6] px-1.5 pt-1.5"
              style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
              {navItems.map(({ key, label, Icon, go, active }) => (
                <button key={key} onClick={go} aria-current={active ? 'page' : undefined}
                  className={`flex-1 min-h-[52px] flex flex-col items-center justify-center gap-0.5 text-xs ${active ? 'text-teal-700 font-bold' : 'text-[#5B6B67]'}`}>
                  <Icon size={22} /> {label}
                </button>
              ))}
              <button onClick={handleLogout} className="flex-1 min-h-[52px] flex flex-col items-center justify-center gap-0.5 text-xs text-[#5B6B67]">
                <LogOut size={22} /> יציאה
              </button>
            </nav>
          </>
        );
      })()}

      <main className="flex-1 min-w-0 px-4 pt-5 pb-28 md:px-10 md:pt-8 md:pb-10">
        {DEMO && (
          <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            <b>קובץ תצוגה מקדימה</b> — נתוני דוגמה בלבד. שום דבר כאן לא נשמר ולא נוגע במערכת האמיתית.
          </div>
        )}
        {view === 'dashboard' && (() => {
          const { month: curMonth, year: curYear } = getCurrentHebrewDate();

          const totalIncome = tenants.reduce((sum, t) =>
            sum + t.payments.reduce((s, p) =>
              s + (p.status === 'שולם' ? (p.paidAmount || p.amount) : (p.paidAmount || 0)), 0
            ) + (t.charges || []).filter(c => c.status === 'שולם').reduce((s, c) => s + c.amount, 0), 0
          );

          const EXP_KEYS = ['electricityExpenses', 'cleaningExpenses', 'regularExpenses', 'extraordinaryExpenses'];
          const totalExpensesAll = EXP_KEYS.flatMap(k => settings[k] || []).reduce((sum, e) => sum + (e.totalAmount || 0), 0);

          const balance = totalIncome - totalExpensesAll;
          const cashBaseline = settings.cashBaseline;
          const baselineBalance = cashBaseline
            ? cashBaseline.amount + (totalIncome - cashBaseline.incomeSnapshot) - (totalExpensesAll - cashBaseline.expenseSnapshot)
            : null;

          // לאיזה חודש עברי שייכת הוצאה: חשמל - חודש התשלום (או סוף התקופה), שאר ההוצאות - התאריך שלהן
          const expenseMonthOf = (e, key) => key === 'electricityExpenses'
            ? `${e.paymentMonth || e.toMonth || e.fromMonth}|${e.paymentYear || e.toYear || e.fromYear}`
            : `${e.hebrewMonth}|${e.hebrewYear}`;
          const expenseByMonth = new Map();
          EXP_KEYS.forEach(k => (settings[k] || []).forEach(e => {
            const mk = expenseMonthOf(e, k);
            expenseByMonth.set(mk, (expenseByMonth.get(mk) || 0) + (e.totalAmount || 0));
          }));
          const curKey = `${curMonth}|${curYear}`;
          const thisMonthElec = (settings.electricityExpenses || []).filter(e => expenseMonthOf(e, 'electricityExpenses') === curKey).reduce((s, e) => s + (e.totalAmount || 0), 0);
          const thisMonthTotal = expenseByMonth.get(curKey) || 0;
          const thisMonthOther = thisMonthTotal - thisMonthElec;

          const paidThisMonth = tenants.filter(t => {
            const p = t.payments.find(p => p.hebrewMonth === curMonth && p.hebrewYear === curYear);
            return p && (p.status === 'שולם' || p.status === 'זכות');
          }).length;
          const collectPct = tenants.length ? Math.round(paidThisMonth / tenants.length * 100) : 0;
          const payers = tenants.filter(t => !t.ownerId && payerTotal(t, tenants) > 0)
            .map(t => ({ t, total: payerTotal(t, tenants) })).sort((a, b) => b.total - a.total);

          const calcExpenseRemaining = (e, key) => {
            if (key === 'electricityExpenses') return e.paymentMethod ? 0 : (e.totalAmount || 0);
            const linkedCharges = key === 'extraordinaryExpenses'
              ? tenants.flatMap(t => (t.charges || []).filter(c => c.expenseId === e.id))
              : [];
            const isPulled = linkedCharges.length > 0;
            const autoPaid = linkedCharges.filter(c => c.status === 'שולם').reduce((s, c) => s + c.amount, 0);
            const paid = isPulled ? autoPaid : (e.paidAmount || 0);
            return Math.max(0, (e.totalAmount || 0) - paid);
          };
          const unpaidElec = (settings.electricityExpenses || []).filter(e => !e.paymentMethod);
          const openOther = ['cleaningExpenses', 'regularExpenses', 'extraordinaryExpenses']
            .reduce((s, k) => s + (settings[k] || []).reduce((ss, e) => ss + calcExpenseRemaining(e, k), 0), 0);

          // גרף: גבייה (לפי חודש החיוב) מול הוצאות, 12 חודשים
          const chart = lastHebrewMonths(12).map(({ month, year }) => ({
            month, year,
            income: tenants.reduce((s, t) => s + t.payments
              .filter(p => p.hebrewMonth === month && p.hebrewYear === year)
              .reduce((ss, p) => ss + (p.status === 'שולם' ? (p.paidAmount || p.amount) : (p.paidAmount || 0)), 0), 0),
            expense: expenseByMonth.get(`${month}|${year}`) || 0,
          }));
          const chartMax = Math.max(1, ...chart.map(c => Math.max(c.income, c.expense)));

          const hasBaseline = baselineBalance != null;
          const hasAnchor = hasBaseline || settings.cashOverride != null;
          const displayBalance = hasBaseline ? baselineBalance : (settings.cashOverride != null ? settings.cashOverride : balance);
          const mgrName = (settings.managers?.[0]?.name || '').split(' ')[0];
          const hour = new Date().getHours();
          const greeting = hour < 12 ? 'בוקר טוב' : hour < 18 ? 'צהריים טובים' : 'ערב טוב';
          const card = 'bg-white border border-[#E3E8E6] rounded-[18px] p-5 flex flex-col gap-1.5';

          return (
            <div className="max-w-[1080px] flex flex-col gap-6">
              <header className="flex flex-wrap justify-between items-end gap-4">
                <div>
                  <p className="text-sm text-[#5B6B67]">{curMonth} {curYear} · {GREG_MONTHS_HE[new Date().getMonth()]} {new Date().getFullYear()}</p>
                  <h1 className="text-[26px] md:text-[30px] font-extrabold leading-tight">{greeting}{mgrName ? `, ${mgrName}` : ''}</h1>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button onClick={goList} className="px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-[15px] transition">+ קבלת תשלום</button>
                  <button onClick={openPaymentReminders} className="px-5 py-3 rounded-xl border border-[#CBD5D2] bg-white hover:border-teal-600 text-[15px] font-medium transition">תזכורת לחייבים</button>
                </div>
              </header>

              <section aria-label="מדדים" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className={card}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#5B6B67]">כסף בקופה</span>
                    {!editingCash && (
                      <button onClick={() => { setCashInput(String(displayBalance)); setEditingCash(true); }}
                        className="text-[#9AA8A4] hover:text-teal-700 transition" title="קביעת יתרת פתיחה חדשה" aria-label="עדכון יתרת הקופה">
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                  {editingCash ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <input type="number" value={cashInput} onChange={e => setCashInput(e.target.value)} autoFocus aria-label="יתרה בקופה"
                          className="w-28 border border-[#CBD5D2] rounded-lg px-2 py-1 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-500" />
                        <span className="text-lg font-bold text-[#5B6B67]">₪</span>
                      </div>
                      <p className="text-[11px] text-[#5B6B67] mt-1">הסכום יהפוך ליתרת פתיחה — מכאן כל הכנסה/הוצאה תעודכן ביחס אליו.</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                        <button onClick={() => {
                          setSettings(s => ({ ...s, cashOverride: null, cashBaseline: { amount: Number(cashInput) || 0, incomeSnapshot: totalIncome, expenseSnapshot: totalExpensesAll, setAt: Date.now() } }));
                          setEditingCash(false);
                        }} className="text-teal-700 font-bold hover:underline">שמור</button>
                        <button onClick={() => setEditingCash(false)} className="text-[#5B6B67] hover:underline">ביטול</button>
                        {hasAnchor && (
                          <button onClick={() => { setSettings(s => ({ ...s, cashOverride: null, cashBaseline: null })); setEditingCash(false); }}
                            className="text-amber-700 hover:underline">חשב מההתחלה</button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className={`text-[28px] md:text-[32px] font-extrabold leading-tight ${displayBalance >= 0 ? 'text-teal-700' : 'text-[#B42318]'}`}>₪{displayBalance.toLocaleString()}</span>
                      <span className="text-xs text-[#5B6B67]">{hasBaseline ? `+₪${(totalIncome - cashBaseline.incomeSnapshot).toLocaleString()} / −₪${(totalExpensesAll - cashBaseline.expenseSnapshot).toLocaleString()} מאז יתרת הפתיחה` : settings.cashOverride != null ? 'עודכן ידנית' : `הכנסות ₪${totalIncome.toLocaleString()} · הוצאות ₪${totalExpensesAll.toLocaleString()}`}</span>
                    </>
                  )}
                </div>

                <div className={card}>
                  <span className="text-sm text-[#5B6B67]">נגבה ב{curMonth}</span>
                  <span className="text-[28px] md:text-[32px] font-extrabold leading-tight">{paidThisMonth} <span className="text-base font-medium text-[#5B6B67]">מתוך {tenants.length} דירות</span></span>
                  <div role="img" aria-label={`${collectPct} אחוז נגבה`} className="h-2 rounded-full bg-[#E6F2F0] overflow-hidden mt-1">
                    <div className="h-2 rounded-full bg-teal-700" style={{ width: `${collectPct}%` }} />
                  </div>
                </div>

                <button onClick={goList} className={`${card} text-right hover:border-[#F2B8B2] transition`}>
                  <span className="text-sm text-[#5B6B67]">סה״כ חוב בבניין</span>
                  <span className={`text-[28px] md:text-[32px] font-extrabold leading-tight ${totalDebt > 0 ? 'text-[#B42318]' : 'text-teal-700'}`}>₪{totalDebt.toLocaleString()}</span>
                  <span className="text-xs text-[#5B6B67]">{payers.length > 0 ? `${payers.length} משלמים בחוב` : 'אין חובות פתוחים'}</span>
                </button>

                <button onClick={() => setView('expenses')} className={`${card} text-right hover:border-[#CBD5D2] transition`}>
                  <span className="text-sm text-[#5B6B67]">הוצאות ב{curMonth}</span>
                  <span className="text-[28px] md:text-[32px] font-extrabold leading-tight">₪{thisMonthTotal.toLocaleString()}</span>
                  <span className="text-xs text-[#5B6B67]">{thisMonthTotal === 0 ? 'אין הוצאות רשומות החודש' : `חשמל ₪${thisMonthElec.toLocaleString()} · אחר ₪${thisMonthOther.toLocaleString()}`}</span>
                </button>
              </section>

              <div className="flex flex-wrap gap-4 items-stretch">
                <section aria-label="גבייה מול הוצאות" className="flex-[3_1_460px] min-w-0 bg-white border border-[#E3E8E6] rounded-[18px] p-5 flex flex-col gap-4">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <h2 className="text-lg font-bold">גבייה מול הוצאות — 12 חודשים</h2>
                    <div className="flex gap-3.5 text-xs text-[#5B6B67]">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-teal-700" />גבייה</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-[#F0A35E]" />הוצאות</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-1.5 md:gap-2 items-end h-[190px] border-b border-[#E3E8E6]">
                    {chart.map(c => (
                      <div key={`${c.month}-${c.year}`} className="flex gap-[3px] items-end justify-center h-full"
                        title={`${c.month} ${c.year}: גבייה ₪${c.income.toLocaleString()}, הוצאות ₪${c.expense.toLocaleString()}`}>
                        <div className="w-[40%] bg-teal-700 rounded-t" style={{ height: `${Math.round(c.income / chartMax * 100)}%` }} />
                        <div className="w-[40%] bg-[#F0A35E] rounded-t" style={{ height: `${Math.round(c.expense / chartMax * 100)}%` }} />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-12 gap-1.5 md:gap-2 text-[11px] md:text-xs text-[#5B6B67] text-center">
                    {chart.map(c => <span key={`${c.month}-${c.year}`} className="truncate">{c.month}</span>)}
                  </div>
                  <p className="text-xs text-[#5B6B67]">גבייה = מה ששולם עבור דמי הוועד של אותו חודש</p>
                </section>

                <section aria-label="דורש טיפול" className="flex-[2_1_300px] min-w-0 bg-white border border-[#E3E8E6] rounded-[18px] p-5 flex flex-col gap-2.5">
                  <h2 className="text-lg font-bold">דורש טיפול</h2>
                  {payers.length === 0 && unpaidElec.length === 0 && openOther === 0 && (
                    <p className="text-sm text-[#5B6B67] py-4 text-center">הכל מעודכן ✓</p>
                  )}
                  {payers.slice(0, 5).map(({ t, total }) => {
                    const owned = getOwnedApartments(t.id);
                    const months = t.payments.filter(p => p.status === 'חוב' && p.amount - (p.paidAmount || 0) > 0).length;
                    return (
                      <button key={t.id} onClick={() => openTenant(t.id)} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8FAF9] hover:bg-[#EEF3F1] text-right transition">
                        <span className={`w-9 h-9 rounded-[10px] flex items-center justify-center font-extrabold text-sm shrink-0 ${owned.length ? 'bg-[#FDF3E3] text-[#A15C07]' : 'bg-[#FDECEA] text-[#B42318]'}`}>{t.apt}</span>
                        <span className="flex flex-col flex-1 min-w-0">
                          <span className="font-medium text-[15px] truncate">{t.name}</span>
                          <span className="text-xs text-[#5B6B67] truncate">{owned.length ? `כולל דירות ${owned.map(a => a.apt).join(', ')}` : months ? `${months} חודשים פתוחים` : 'חיובים פתוחים'}</span>
                        </span>
                        <span className="font-bold text-[15px] text-[#B42318]">₪{total.toLocaleString()}</span>
                      </button>
                    );
                  })}
                  {payers.length > 5 && (
                    <button onClick={goList} className="text-sm text-teal-700 font-medium hover:underline text-right">ועוד {payers.length - 5} — לכל הדיירים</button>
                  )}
                  {unpaidElec.map(e => (
                    <button key={e.id} onClick={() => setView('expenses')} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8FAF9] hover:bg-[#EEF3F1] text-right transition">
                      <span className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 bg-[#E8EEF9] text-[#2453A6]"><Zap size={17} /></span>
                      <span className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-[15px]">חשבונית חשמל</span>
                        <span className="text-xs text-[#5B6B67] truncate">{e.fromMonth} {e.fromYear} · לא סומן אמצעי תשלום</span>
                      </span>
                      <span className="font-bold text-[15px] text-[#2453A6]">₪{(e.totalAmount || 0).toLocaleString()}</span>
                    </button>
                  ))}
                  {openOther > 0 && (
                    <button onClick={() => setView('expenses')} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F8FAF9] hover:bg-[#EEF3F1] text-right transition">
                      <span className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 bg-[#F1ECF9] text-[#6B3FA0]"><ReceiptText size={17} /></span>
                      <span className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-[15px]">הוצאות שעוד לא שולמו</span>
                        <span className="text-xs text-[#5B6B67]">ניקיון, שוטפות וחריגות</span>
                      </span>
                      <span className="font-bold text-[15px] text-[#6B3FA0]">₪{openOther.toLocaleString()}</span>
                    </button>
                  )}
                </section>
              </div>
            </div>
          );
        })()}

        {view === 'list' && (() => {
          const { month: curM, year: curY } = getCurrentHebrewDate();
          const known = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17'];
          const extra = [...new Set(tenants.map(t => String(t.apt)).filter(a => !known.includes(a)))];
          const floors = [
            ...(extra.length > 0 ? [{ label: 'נוספות', sub: `${extra.length} דירות`, apts: extra }] : []),
            { label: 'קומה 5', sub: 'שכירות', apts: ['13','14','15','16','17'] },
            { label: 'קומה 4', sub: '3 דירות', apts: ['10','11','12'] },
            { label: 'קומה 3', sub: '3 דירות', apts: ['7','8','9'] },
            { label: 'קומה 2', sub: '3 דירות', apts: ['4','5','6'] },
            { label: 'קומה 1', sub: '3 דירות', apts: ['1','2','3'] },
          ];
          const paidNow = t => { const p = t.payments.find(x => x.hebrewMonth === curM && x.hebrewYear === curY); return !!p && (p.status === 'שולם' || p.status === 'זכות'); };
          const paidCount = tenants.filter(paidNow).length;
          const unpaidCount = tenants.length - paidCount;
          const rentalCount = tenants.filter(t => t.ownerId).length;
          const matches = t => buildingFilter === 'all' || (buildingFilter === 'unpaid' && !paidNow(t)) || (buildingFilter === 'rental' && !!t.ownerId);
          const chip = active => `px-4 py-2 rounded-full text-sm border transition ${active ? 'bg-teal-700 border-teal-700 text-white font-bold' : 'bg-white border-[#CBD5D2] hover:border-teal-600'}`;
          const secondary = 'flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#CBD5D2] bg-white hover:border-teal-600 text-sm font-medium transition';
          return (
            <div className="max-w-[1080px] flex flex-col gap-5">
              <header className="flex flex-wrap justify-between items-end gap-4">
                <div>
                  <h1 className="text-[26px] md:text-[30px] font-extrabold leading-tight">הבניין</h1>
                  <p className="text-[15px] text-[#5B6B67]">{curM} {curY} · {paidCount} מתוך {tenants.length} דירות שילמו · חוב כולל <b className="text-[#B42318]">₪{totalDebt.toLocaleString()}</b></p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { setNewTenant(EMPTY_TENANT); setView('add'); }} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold transition"><Plus size={16} /> דייר חדש</button>
                  <button onClick={openPaymentReminders} className={secondary}><Bell size={15} /> תזכורת לחייבים</button>
                  <button onClick={() => setShowEmailModal(true)} className={secondary}><Mail size={15} /> הודעה לכולם</button>
                  <button onClick={printTenantsStatusReport} className={secondary}><FileDown size={15} /> דוח מצב</button>
                  <button onClick={() => printReminderSlips()} className={secondary}><FileDown size={15} /> פתקי תזכורת</button>
                </div>
              </header>

              <div className="flex flex-wrap items-center gap-2">
                <div role="group" aria-label="סינון" className="flex flex-wrap gap-2">
                  <button aria-pressed={buildingFilter === 'all'} onClick={() => setBuildingFilter('all')} className={chip(buildingFilter === 'all')}>הכל ({tenants.length})</button>
                  <button aria-pressed={buildingFilter === 'unpaid'} onClick={() => setBuildingFilter('unpaid')} className={chip(buildingFilter === 'unpaid')}>לא שילמו ב{curM} ({unpaidCount})</button>
                  <button aria-pressed={buildingFilter === 'rental'} onClick={() => setBuildingFilter('rental')} className={chip(buildingFilter === 'rental')}>שכירות ({rentalCount})</button>
                </div>
                <span className="flex-1" />
                <span className="flex flex-wrap gap-3.5 text-xs text-[#5B6B67]">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#E6F2F0] border border-teal-700" />מעודכן</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#FDECEA] border border-[#B42318]" />בחוב</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border-2 border-dashed border-[#A15C07]" />מושכרת</span>
                </span>
              </div>

              <section aria-label="מבט על הבניין" className="flex flex-col items-center">
                <div aria-hidden="true" className="w-[94%] md:w-[92%] h-0 border-x-[28px] md:border-x-[40px] border-x-transparent border-b-[26px] md:border-b-[34px] border-b-[#0B3B37]" />
                <div className="w-[94%] md:w-[92%] bg-white border-[3px] border-t-0 border-[#0B3B37] rounded-b-md flex flex-col">
                  {floors.map(f => {
                    const floorTenants = tenants.filter(t => f.apts.includes(String(t.apt))).sort((a, b) => Number(a.apt) - Number(b.apt));
                    if (floorTenants.length === 0) return null;
                    return (
                      <div key={f.label} className="flex items-stretch border-b-2 border-[#E3E8E6]">
                        <div className="w-11 md:w-[84px] shrink-0 flex flex-col items-center justify-center gap-0.5 bg-[#F8FAF9] border-l-2 border-[#E3E8E6] text-[11px] md:text-[13px] text-[#5B6B67] text-center px-1">
                          <span className="font-bold text-[13px] md:text-[15px] text-[#17211F]">{f.label}</span>
                          <span>{f.sub}</span>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-wrap gap-1.5 md:gap-3 p-2 md:p-3.5">
                          {floorTenants.map(t => {
                            const rental = !!t.ownerId;
                            const owner = rental ? getOwnerTenant(t) : null;
                            const debt = unitDebt(t, tenants);
                            const credit = calcCredit(t);
                            const ownedDebt = !rental ? getOwnedApartments(t.id).reduce((s, a) => s + unitDebt(a, tenants), 0) : 0;
                            const openMonths = t.payments.filter(p => p.status === 'חוב' && p.amount - (p.paidAmount || 0) > 0).length;
                            const look = rental
                              ? `border-2 border-dashed border-[#A15C07] ${debt > 0 ? 'bg-[#FFF8EE]' : 'bg-white'}`
                              : debt > 0 ? 'border border-[#F2B8B2] bg-[#FDECEA]' : 'border border-[#9FD3CC] bg-[#E6F2F0]';
                            const sub = rental
                              ? `בעלים: ${owner?.name || '—'}${t.feePercent && Number(t.feePercent) !== 100 ? ` · ${t.feePercent}%` : ''}`
                              : ownedDebt > 0 ? `+ ₪${ownedDebt.toLocaleString()} בדירות שלו`
                              : debt > 0 && openMonths ? `${openMonths} חודשים פתוחים` : '';
                            return (
                              <button key={t.id} onClick={() => openTenant(t.id)}
                                className={`flex-[1_1_70px] md:flex-[1_1_120px] min-w-0 text-right rounded-xl p-2 md:p-3 min-h-[96px] flex flex-col gap-1 hover:shadow-md transition ${look} ${matches(t) ? '' : 'opacity-30'}`}>
                                <span className={`text-xl md:text-[22px] font-extrabold leading-none ${rental ? 'text-[#A15C07]' : debt > 0 ? 'text-[#B42318]' : 'text-teal-700'}`}>{t.apt}</span>
                                <span className="text-sm md:text-[15px] font-medium truncate">{rental ? `שוכר: ${t.vacant ? 'ריקה' : (t.name || '—')}` : t.name}</span>
                                {debt > 0 && <span className="text-[13px] md:text-sm font-bold text-[#B42318] whitespace-nowrap">חוב ₪{debt.toLocaleString()}</span>}
                                {credit > 0 && <span className="text-[13px] md:text-sm font-bold text-[#15803D] whitespace-nowrap">זכות ₪{credit.toLocaleString()}</span>}
                                {debt === 0 && credit === 0 && <span className="text-[13px] md:text-sm font-bold text-teal-700 whitespace-nowrap">מעודכן ✓</span>}
                                {sub && <span className="text-[11px] md:text-xs text-[#5B6B67] truncate">{sub}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <div aria-hidden="true" className="flex justify-center pt-2.5">
                    <div className="w-[70px] h-[44px] border-[3px] border-b-0 border-[#0B3B37] rounded-t-[10px] bg-[#E6F2F0]" />
                  </div>
                </div>
                <div aria-hidden="true" className="w-full h-2 bg-[#CBD5D2] rounded" />
              </section>
            </div>
          );
        })()}

        {view === 'tenant' && selectedTenant && (
          <div className="max-w-[1080px]">
            <button onClick={goList} className="flex items-center gap-1 text-teal-700 font-medium mb-4 hover:underline text-sm">
              <ChevronRight size={18} /> חזרה לבניין
            </button>
            {(() => {
              const isRentalUnit = !!selectedTenant.ownerId;
              const owner = getOwnerTenant(selectedTenant);
              const owned = isRentalUnit ? [] : [...getOwnedApartments(selectedTenant.id)].sort((a, b) => Number(a.apt) - Number(b.apt));
              const ownDebt = unitDebt(selectedTenant, tenants);
              const total = payerTotal(selectedTenant, tenants);
              const split = isRentalUnit ? unitDebtSplit(selectedTenant) : null;
              const credit = calcCredit(selectedTenant);
              const prepStatement = () => {
                const available = [...new Set(selectedTenant.payments.map(p => p.hebrewYear))]
                  .sort((a, b) => (HEBREW_YEAR_TO_NUMERIC[b] || 0) - (HEBREW_YEAR_TO_NUMERIC[a] || 0));
                setStatementYears(new Set(available));
                setStatementMode('full');
                setStatementOccupant('');
                setIncludeOwnedApts(owned.length > 0);
              };
              const btn = 'flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#CBD5D2] bg-white hover:border-teal-600 hover:text-teal-800 text-sm font-medium transition';
              const chipCls = 'px-2.5 py-1 rounded-full text-[13px]';
              return (
                <section aria-label="סיכום הדייר" className="bg-white rounded-[20px] border border-[#E3E8E6] p-5 md:p-6 mb-5">
                  <div className="flex flex-wrap items-center gap-4 md:gap-6">
                    <div className={`w-16 h-16 md:w-[72px] md:h-[72px] rounded-[20px] flex items-center justify-center text-white text-2xl md:text-[30px] font-extrabold shrink-0 ${isRentalUnit ? 'bg-[#A15C07]' : 'bg-teal-700'}`}>{selectedTenant.apt}</div>
                    <div className="flex-[1_1_220px] min-w-0">
                      <h1 className="text-2xl md:text-[28px] font-extrabold leading-tight truncate">{isRentalUnit ? `דירה ${selectedTenant.apt}` : (selectedTenant.name || `דירה ${selectedTenant.apt}`)}</h1>
                      <p className="text-[15px] text-[#5B6B67] mt-1">
                        {isRentalUnit
                          ? <>שוכר: {selectedTenant.vacant ? 'הדירה ריקה' : (selectedTenant.name || '—')} · מול הוועד: <b className="text-[#A15C07]">{owner?.name || '—'}</b></>
                          : <>דירה {selectedTenant.apt}{owned.length > 0 && <> · משכיר גם את דירות <b className="text-[#A15C07]">{owned.map(a => a.apt).join(', ')}</b></>}</>}
                      </p>
                      {(selectedTenant.phone || selectedTenant.email) && (
                        <p className="text-sm text-[#5B6B67] mt-0.5 truncate">{[selectedTenant.phone, selectedTenant.email].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                    <div className="min-w-[200px]">
                      <p className="text-sm text-[#5B6B67]">{owned.length > 0 ? 'סה״כ לתשלום (כולל הדירות שלו)' : 'יתרת חוב'}</p>
                      <p className={`text-4xl md:text-[40px] font-extrabold leading-none my-1.5 ${total > 0 ? 'text-[#B42318]' : 'text-teal-700'}`}>₪{total.toLocaleString()}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {owned.length > 0 && <span className={`${chipCls} bg-[#F4F6F5]`}>שלו ₪{ownDebt.toLocaleString()}</span>}
                        {owned.map(a => (
                          <button key={a.id} onClick={() => openTenant(a.id)} className={`${chipCls} bg-[#FDF3E3] text-[#7A4505] hover:bg-[#FBE7C6]`}>דירה {a.apt} ₪{unitDebt(a, tenants).toLocaleString()}</button>
                        ))}
                        {split && split.total > 0 && <>
                          <span className={`${chipCls} bg-[#F4F6F5]`}>לגבות מהשוכר ₪{split.occupant.toLocaleString()}</span>
                          <span className={`${chipCls} bg-[#FDF3E3] text-[#7A4505]`}>על חשבון בעל הדירה ₪{split.owner.toLocaleString()}</span>
                        </>}
                        {credit > 0 && <span className={`${chipCls} bg-[#E6F2F0] text-teal-800`}>שולם מראש ₪{credit.toLocaleString()}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-[#E3E8E6] pt-4 mt-5">
                    <button onClick={() => openReceiptModal(selectedTenant)} disabled={editMode}
                      title={editMode ? 'שמרי או בטלי את עריכת פרטי הדייר קודם' : ''}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold transition disabled:opacity-40">
                      <Banknote size={16} /> קבלת תשלום
                    </button>
                    {!isRentalUnit && (
                      <button onClick={() => { prepStatement(); setTenantMsgText(''); setShowTenantMsg(true); }} className={btn}>
                        <Mail size={15} /> הודעה
                      </button>
                    )}
                    <button onClick={() => { prepStatement(); setShowStatementModal(selectedTenant); }} className={btn}>
                      <FileText size={15} /> מסמך PDF
                    </button>
                    <button onClick={() => downloadOwnerExcel(selectedTenant)} className={btn}>
                      <FileDown size={15} /> {isRentalUnit ? 'אקסל לבעל הדירה' : 'אקסל'}
                    </button>
                    <button onClick={() => printReminderSlips(selectedTenant)} className={btn}>
                      <Bell size={15} /> {isRentalUnit ? 'פתק לבעל הדירה' : 'פתק תזכורת'}
                    </button>
                    <span className="flex-1" />
                    {!editMode && (
                      <button onClick={() => { startEdit(); setTimeout(() => document.getElementById('tenant-details')?.scrollIntoView({ behavior: 'smooth' }), 50); }}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm text-[#5B6B67] hover:text-teal-800 hover:bg-[#F4F6F5] transition">
                        <Pencil size={14} /> עריכת פרטים
                      </button>
                    )}
                  </div>
                </section>
              );
            })()}
            {selectedTenant.ownerId && getOwnerTenant(selectedTenant) && (() => {
              const owner = getOwnerTenant(selectedTenant);
              return (
                <div className="mb-5 px-4 py-3 rounded-2xl border border-[#F1D9B5] bg-[#FFF8EE] flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="text-sm font-bold text-[#7A4505]">דירה מושכרת</span>
                  <label className="flex items-center gap-1.5 text-xs text-amber-900">
                    דמי ועד חודשיים על חשבון:
                    <select value={selectedTenant.monthlyBillTo || 'occupant'}
                      onChange={e => setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, monthlyBillTo: e.target.value }))}
                      className="border border-amber-300 rounded-lg px-1.5 py-0.5 text-xs bg-white focus:outline-none">
                      <option value="occupant">השוכר</option>
                      <option value="owner">בעל הדירה</option>
                    </select>
                  </label>
                  <button onClick={() => openTenant(owner.id)}
                    className="mr-auto text-xs font-bold text-amber-800 border border-amber-300 hover:bg-amber-100 rounded-full px-3 py-1.5 transition">
                    עבור לכרטיס בעל הדירה ←
                  </button>
                </div>
              );
            })()}
            <div className="space-y-5">
                <div className="bg-white p-5 rounded-[20px] border border-[#E3E8E6]">
                  <div className="flex justify-between items-center mb-4 gap-3">
                    <h4 className="font-bold text-base text-teal-800">דמי ועד לפי חודש</h4>
                    <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setOpenMonth(null); }} aria-label="שנה" className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400">
                      {HEBREW_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  {editMode ? (
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead><tr className="border-b text-gray-400 text-xs">
                      <th className="pb-2 font-medium w-20">חודש</th>
                      <th className="pb-2 font-medium">לתשלום</th>
                      <th className="pb-2 font-medium">שולם</th>
                      <th className="pb-2 font-medium">חוב</th>
                      <th className="pb-2 font-medium">שוכר</th>
                      <th className="pb-2 font-medium">הערה</th>
                      <th className="pb-2"></th>
                    </tr></thead>
                    <tbody>
                      {[...monthsForYear(filterYear)].reverse().map(month => {
                        const p = (editMode ? editData.payments : selectedTenant.payments)
                          .find(x => x.hebrewMonth === month && x.hebrewYear === filterYear);
                        if (editMode) {
                          if (!p) return (
                            <tr key={month} className="border-b bg-gray-50/50">
                              <td className="py-2 text-gray-400">{month}</td>
                              <td className="py-2 text-gray-300 text-xs">—</td>
                              <td className="py-2 text-gray-300 text-xs">—</td>
                              <td className="py-2 text-gray-300 text-xs">—</td>
                              <td className="py-2 text-gray-300 text-xs">—</td>
                              <td className="py-2 text-gray-300 text-xs">—</td>
                              <td className="py-2 text-left">
                                <button onClick={() => setEditData(d => ({ ...d, payments: [...d.payments, { id: Date.now(), hebrewMonth: month, hebrewYear: filterYear, status: 'חוב', amount: d.monthlyRent, occupantName: d.name }] }))}
                                  className="text-xs text-teal-500 hover:text-teal-700 border border-teal-200 hover:bg-teal-50 px-2 py-0.5 rounded-full transition">+ הוסף</button>
                              </td>
                            </tr>
                          );
                          const i = editData.payments.findIndex(x => x.id === p.id);
                          return (
                            <tr key={month} className="border-b">
                              <td className="py-2 font-medium">{month}</td>
                              <td className="py-2">
                                <select value={p.status} onChange={e => setEditData(d => ({...d, payments: d.payments.map((x,j) => j===i?{...x,status:e.target.value}:x)}))} className="border rounded px-2 py-1 text-xs">
                                  <option>שולם</option><option>חוב</option>
                                </select>
                              </td>
                              <td className="py-2">
                                <input type="number" value={p.amount} onChange={e => setEditData(d => ({...d, payments: d.payments.map((x,j) => j===i?{...x,amount:Number(e.target.value)}:x)}))} onFocus={e => e.target.select()} className="border rounded px-2 py-1 text-xs w-20" />
                              </td>
                              <td className="py-2 text-gray-300 text-xs">—</td>
                              <td className="py-2">
                                <input value={p.occupantName ?? editData.name ?? ''} onChange={e => setEditData(d => ({...d, payments: d.payments.map((x,j) => j===i?{...x,occupantName:e.target.value}:x)}))} placeholder="שוכר..." className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-gray-50 hover:bg-white focus:border-teal-400 focus:outline-none w-20 transition" />
                              </td>
                              <td className="py-2">
                                <input value={p.note || ''} onChange={e => setEditData(d => ({...d, payments: d.payments.map((x,j) => j===i?{...x,note:e.target.value}:x)}))} placeholder="הערה..." className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-gray-50 hover:bg-white focus:border-teal-400 focus:outline-none w-24 transition" />
                              </td>
                              <td className="py-2 text-left">
                                <button onClick={() => setEditData(d => ({...d, payments: d.payments.filter(x => x.id !== p.id)}))} className="text-gray-200 hover:text-red-400 transition"><Trash2 size={13} /></button>
                              </td>
                            </tr>
                          );
                        }
                        if (!p) return (
                          <tr key={month} className="border-b bg-gray-50/40">
                            <td className="py-2 text-gray-400">{month}</td>
                            <td className="py-2 text-gray-300 text-xs">—</td>
                            <td className="py-2 text-gray-300 text-xs">—</td>
                            <td className="py-2 text-gray-300 text-xs">—</td>
                            <td className="py-2 text-gray-300 text-xs">—</td>
                            <td className="py-2 text-gray-300 text-xs">—</td>
                            <td className="py-2 text-left">
                              <button onClick={() => addPaymentDirect(month, filterYear)}
                                className="text-xs text-teal-500 hover:text-teal-700 border border-teal-200 hover:bg-teal-50 px-2 py-0.5 rounded-full transition">+ הוסף</button>
                            </td>
                          </tr>
                        );
                        const remaining = p.amount - (p.paidAmount || 0);
                        return (
                          <tr key={month} className={`border-b ${p.status === 'זכות' ? 'bg-teal-50/30' : p.status === 'שולם' ? '' : 'bg-red-50/20'}`}>
                            <td className="py-2 font-medium">{month}</td>
                            <td className="py-2">
                              <span className="text-sm font-medium text-gray-700">₪{p.amount.toLocaleString()}</span>
                            </td>
                            <td className="py-2">
                              {p.status === 'זכות'
                                ? <div className="flex items-center gap-1">
                                    <input type="number" value={p.paidAmount || 0} min={0}
                                      onChange={e => updatePaymentPaid(p.id, e.target.value)}
                                      onFocus={e => e.target.select()}
                                      className="border border-teal-300 rounded px-2 py-1 text-xs w-16 focus:outline-none focus:ring-1 focus:ring-teal-400" />
                                    <span className="text-xs text-teal-500">₪ זכות</span>
                                  </div>
                                : p.status === 'שולם'
                                ? <span className="text-green-600 font-semibold text-xs">₪{p.amount.toLocaleString()} ✓</span>
                                : <div className="flex items-center gap-1">
                                    <input type="number" value={p.paidAmount || 0} min={0} max={p.amount}
                                      onChange={e => updatePaymentPaid(p.id, e.target.value)}
                                      onFocus={e => e.target.select()}
                                      className="border rounded px-2 py-1 text-xs w-16 focus:outline-none focus:ring-1 focus:ring-teal-400" />
                                    <span className="text-xs text-gray-400">₪</span>
                                  </div>
                              }
                            </td>
                            <td className="py-2">
                              {p.status === 'שולם' || (p.status === 'זכות' && remaining <= 0)
                                ? <span className="text-green-600 text-xs">₪0</span>
                                : p.status === 'זכות'
                                ? <span className="font-semibold text-xs text-orange-400">₪{remaining.toLocaleString()}</span>
                                : <span className={`font-semibold text-xs ${remaining > 0 ? 'text-red-500' : 'text-green-600'}`}>₪{remaining.toLocaleString()}</span>
                              }
                            </td>
                            <td className="py-2">
                              <input
                                value={p.occupantName ?? selectedTenant.name ?? ''}
                                onChange={e => setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, payments: t.payments.map(x => x.id !== p.id ? x : { ...x, occupantName: e.target.value }) }))}
                                placeholder="שוכר..."
                                className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-gray-50 hover:bg-white focus:border-teal-400 focus:outline-none focus:bg-white text-gray-600 w-20 transition"
                              />
                            </td>
                            <td className="py-2 pl-4">
                              <input
                                value={p.note || ''}
                                onChange={e => setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, payments: t.payments.map(x => x.id !== p.id ? x : { ...x, note: e.target.value }) }))}
                                placeholder="הערה..."
                                className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-gray-50 hover:bg-white focus:border-teal-400 focus:outline-none focus:bg-white text-gray-600 w-full min-w-[80px] transition"
                              />
                            </td>
                            <td className="py-2 text-left">
                              <div className="flex items-center gap-1 justify-end">
                                {p.status === 'זכות'
                                  ? <>
                                      {remaining > 0 && <button onClick={() => togglePayment(p.id)} className="text-xs text-green-600 border border-green-200 hover:bg-green-50 px-2 py-0.5 rounded-full transition whitespace-nowrap">שולם מלא</button>}
                                      <button onClick={() => setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, payments: t.payments.map(x => x.id !== p.id ? x : { ...x, status: 'חוב', paidAmount: 0 }) }))} className="text-xs text-gray-400 hover:text-red-400 border border-gray-200 hover:border-red-200 px-2 py-0.5 rounded-full transition whitespace-nowrap">בטל</button>
                                    </>
                                  : p.status === 'שולם'
                                  ? <button onClick={() => togglePayment(p.id)} className="text-xs text-gray-400 hover:text-red-400 border border-gray-200 hover:border-red-200 px-2 py-0.5 rounded-full transition">בטל</button>
                                  : <button onClick={() => togglePayment(p.id)} className="text-xs text-green-600 border border-green-200 hover:bg-green-50 px-2 py-0.5 rounded-full transition whitespace-nowrap">שולם מלא</button>
                                }
                                <button onClick={() => { if (!confirm(`למחוק את שורת התשלום של ${month} ${filterYear}?`)) return; setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, payments: t.payments.filter(x => x.id !== p.id) })); }}
                                  className="text-gray-200 hover:text-red-400 transition"><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                  ) : (() => {
                    const yearMonths = monthsForYear(filterYear);
                    const rowOf = m => selectedTenant.payments.find(x => x.hebrewMonth === m && x.hebrewYear === filterYear);
                    const tileState = (p, m) => {
                      if (!p) return isFutureMonth(m, filterYear)
                        ? { cls: 'bg-white border border-dashed border-[#CBD5D2]', fg: 'text-[#5B6B67]', label: 'עתידי' }
                        : { cls: 'bg-[#F8FAF9] border border-dashed border-[#CBD5D2]', fg: 'text-[#5B6B67]', label: 'לא נרשם' };
                      const rem = p.amount - (p.paidAmount || 0);
                      if (p.status === 'שולם') return { cls: 'bg-[#E6F2F0] border border-[#9FD3CC]', fg: 'text-teal-800', label: 'שולם ✓' };
                      if (p.status === 'זכות') return rem <= 0
                        ? { cls: 'bg-[#E6F2F0] border border-[#9FD3CC]', fg: 'text-teal-800', label: 'שולם מראש ✓' }
                        : { cls: 'bg-[#FFF8EE] border border-[#F1D9B5]', fg: 'text-[#7A4505]', label: `מראש · חסר ₪${rem.toLocaleString()}` };
                      return (p.paidAmount || 0) > 0
                        ? { cls: 'bg-[#FDECEA] border border-[#F2B8B2]', fg: 'text-[#B42318]', label: `חלקי · נותר ₪${rem.toLocaleString()}` }
                        : { cls: 'bg-[#FDECEA] border border-[#F2B8B2]', fg: 'text-[#B42318]', label: `חוב ₪${p.amount.toLocaleString()}` };
                    };
                    const sel = openMonth && yearMonths.includes(openMonth) ? openMonth : null;
                    const p = sel ? rowOf(sel) : null;
                    const updateRow = patch => setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, payments: t.payments.map(x => x.id !== p.id ? x : { ...x, ...patch }) }));
                    const field = 'border border-[#CBD5D2] rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500';
                    return (
                      <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-2.5">
                          {yearMonths.map(m => {
                            const st = tileState(rowOf(m), m);
                            const active = sel === m;
                            return (
                              <button key={m} type="button" onClick={() => setOpenMonth(active ? null : m)} aria-expanded={active}
                                className={`text-right rounded-[14px] p-2.5 md:p-3 min-h-[64px] transition hover:shadow-sm ${st.cls} ${active ? 'ring-2 ring-teal-600 ring-offset-1' : ''}`}>
                                <span className="block text-sm font-bold">{m}</span>
                                <span className={`block text-xs md:text-[13px] font-medium ${st.fg}`}>{st.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-[#5B6B67] mt-2">לחיצה על חודש פותחת אותו לעדכון</p>
                        {sel && (
                          <div className="mt-3 rounded-2xl border border-[#E3E8E6] bg-[#F8FAF9] p-4">
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-bold">{sel} {filterYear}</span>
                              <button onClick={() => setOpenMonth(null)} aria-label="סגירה" className="text-[#5B6B67] hover:text-[#17211F]"><X size={18} /></button>
                            </div>
                            {!p ? (
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm text-[#5B6B67]">{isFutureMonth(sel, filterYear) ? 'חודש עתידי — אפשר לרשום תשלום מראש' : 'לא נרשם חיוב לחודש הזה'}</span>
                                <button onClick={() => addPaymentDirect(sel, filterYear)} className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold transition">+ הוסף חודש</button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
                                <div>
                                  <span className="block text-xs text-[#5B6B67] mb-1">לתשלום</span>
                                  <span className="text-lg font-bold">₪{p.amount.toLocaleString()}</span>
                                </div>
                                <label className="block">
                                  <span className="block text-xs text-[#5B6B67] mb-1">שולם</span>
                                  {p.status === 'שולם'
                                    ? <span className="text-lg font-bold text-teal-700">₪{(p.paidAmount || p.amount).toLocaleString()} ✓</span>
                                    : <input type="number" min={0} value={p.paidAmount || 0} onFocus={e => e.target.select()}
                                        onChange={e => updatePaymentPaid(p.id, e.target.value)} className={`${field} w-24`} />}
                                </label>
                                <label className="block">
                                  <span className="block text-xs text-[#5B6B67] mb-1">שוכר באותו חודש</span>
                                  <input value={p.occupantName ?? selectedTenant.name ?? ''} onChange={e => updateRow({ occupantName: e.target.value })} className={`${field} w-32`} />
                                </label>
                                <label className="block flex-[1_1_160px]">
                                  <span className="block text-xs text-[#5B6B67] mb-1">הערה</span>
                                  <input value={p.note || ''} onChange={e => updateRow({ note: e.target.value })} placeholder="הערה..." className={`${field} w-full`} />
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {p.status !== 'שולם' && !(p.status === 'זכות' && p.amount - (p.paidAmount || 0) <= 0) && (
                                    <button onClick={() => togglePayment(p.id)} className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold transition">שולם מלא</button>
                                  )}
                                  {p.status === 'שולם' && (
                                    <button onClick={() => togglePayment(p.id)} className="px-4 py-2 rounded-xl border border-[#CBD5D2] bg-white hover:border-[#B42318] hover:text-[#B42318] text-sm transition">ביטול התשלום</button>
                                  )}
                                  {p.status === 'זכות' && (
                                    <button onClick={() => updateRow({ status: 'חוב', paidAmount: 0 })} className="px-4 py-2 rounded-xl border border-[#CBD5D2] bg-white hover:border-[#B42318] hover:text-[#B42318] text-sm transition">ביטול התשלום מראש</button>
                                  )}
                                  <button onClick={() => {
                                    if (!confirm(`למחוק את שורת התשלום של ${sel} ${filterYear}?`)) return;
                                    setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, payments: t.payments.filter(x => x.id !== p.id) }));
                                    setOpenMonth(null);
                                  }} aria-label="מחיקת החודש" className="px-3 py-2 rounded-xl text-[#5B6B67] hover:text-[#B42318] hover:bg-[#FDECEA] transition"><Trash2 size={16} /></button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {!selectedTenant.ownerId && getOwnedApartments(selectedTenant.id).length > 0 && (() => {
                  const { month: curM, year: curY } = getCurrentHebrewDate();
                  const apts = [...getOwnedApartments(selectedTenant.id)].sort((a, b) => Number(a.apt) - Number(b.apt));
                  const rows = apts.map(a => ({ a, split: unitDebtSplit(a), cur: a.payments.find(p => p.hebrewMonth === curM && p.hebrewYear === curY) }));
                  const sum = k => rows.reduce((s, r) => s + r.split[k], 0);
                  return (
                    <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm">
                      <h4 className="font-bold text-base text-amber-800 mb-1">הדירות המושכרות של {selectedTenant.name}</h4>
                      <p className="text-xs text-gray-400 mb-3">כל החובות של הדירות האלה נגבים דרך {selectedTenant.name}. לחיצה על דירה פותחת את הכרטיס שלה.</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                          <thead><tr className="border-b text-gray-400 text-xs">
                            <th className="pb-2 font-medium">דירה</th>
                            <th className="pb-2 font-medium">שוכר</th>
                            <th className="pb-2 font-medium">{curM}</th>
                            <th className="pb-2 font-medium">לגבות מהשוכר</th>
                            <th className="pb-2 font-medium">על חשבון המשכיר</th>
                            <th className="pb-2 font-medium">סה״כ</th>
                          </tr></thead>
                          <tbody>
                            {rows.map(({ a, split, cur }) => (
                              <tr key={a.id} onClick={() => openTenant(a.id)} className="border-b cursor-pointer hover:bg-amber-50/60 transition">
                                <td className="py-2 font-bold text-amber-800">{a.apt}</td>
                                <td className="py-2 text-gray-700">{a.vacant ? <span className="text-gray-400">ריקה</span> : (a.name || '—')}</td>
                                <td className="py-2 text-xs">
                                  {!cur ? <span className="text-gray-300">—</span>
                                    : cur.status === 'חוב' ? <span className="text-red-500 font-medium">לא שולם</span>
                                    : <span className="text-green-600 font-medium">שולם ✓</span>}
                                </td>
                                <td className="py-2 text-gray-700">{split.occupant > 0 ? `₪${split.occupant.toLocaleString()}` : '—'}</td>
                                <td className="py-2 text-gray-700">{split.owner > 0 ? `₪${split.owner.toLocaleString()}` : '—'}</td>
                                <td className={`py-2 font-bold ${split.total > 0 ? 'text-red-600' : 'text-green-600'}`}>₪{split.total.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot><tr className="text-xs font-bold text-gray-600">
                            <td className="pt-2" colSpan={3}>סה״כ דירות</td>
                            <td className="pt-2">₪{sum('occupant').toLocaleString()}</td>
                            <td className="pt-2">₪{sum('owner').toLocaleString()}</td>
                            <td className="pt-2 text-red-600">₪{sum('total').toLocaleString()}</td>
                          </tr></tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  // קבלות שנרשמו בכרטיס הזה + קבלות קשורות בכרטיסים אחרים:
                  // בעל דירה רואה גם תשלומים ששוכר שילם ישירות; דירה מושכרת רואה גם מה שבעל הדירה שילם עבורה
                  const list = [];
                  (selectedTenant.receipts || []).forEach(r => list.push({ r, storedOn: selectedTenant, via: '', allocations: r.allocations, shown: r.amount }));
                  if (!selectedTenant.ownerId) {
                    getOwnedApartments(selectedTenant.id).forEach(a => (a.receipts || []).forEach(r => list.push({
                      r, storedOn: a, via: `שולם ישירות בדירה ${a.apt}`,
                      allocations: r.allocations.map(x => ({ ...x, label: `דירה ${a.apt} · ${x.label}` })), shown: r.amount,
                    })));
                  } else {
                    const owner = getOwnerTenant(selectedTenant);
                    (owner?.receipts || []).forEach(r => {
                      const mine = r.allocations.filter(x => x.unitId === selectedTenant.id);
                      if (mine.length === 0) return;
                      list.push({ r, storedOn: owner, via: `שולם דרך ${owner.name} (מתוך קבלה של ₪${r.amount.toLocaleString()})`,
                        allocations: mine.map(x => ({ ...x, label: x.label.replace(/^דירה [^·]+ · /, '') })), shown: mine.reduce((s, x) => s + x.amount, 0) });
                    });
                  }
                  if (list.length === 0) return null;
                  list.sort((a, b) => b.r.id - a.r.id);
                  return (
                    <div className="bg-white p-5 rounded-[20px] border border-[#E3E8E6]">
                      <h4 className="font-bold text-base text-teal-800 mb-4">קבלות תשלום</h4>
                      <div className="space-y-2">
                        {list.map(({ r, storedOn, via, allocations, shown }) => {
                          const heb = r.date ? (() => { const [yy, mm, dd] = r.date.split('-').map(Number); const h = gregorianToHebrewDate(new Date(yy, mm - 1, dd)); return `${h.day} ${h.month} ${h.year}`; })() : '';
                          return (
                            <div key={`${storedOn.id}-${r.id}`} className={`p-3 rounded-xl border text-sm ${r.cancelled ? 'bg-gray-50 border-gray-200 opacity-60' : via ? 'bg-amber-50/40 border-amber-100' : 'bg-teal-50/40 border-teal-100'}`}>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className={`font-bold text-base ${r.cancelled ? 'line-through text-gray-500' : 'text-teal-700'}`}>₪{shown.toLocaleString()}</span>
                                <span className="text-gray-600">{fmtGregDate(r.date)}</span>
                                <span className="text-xs text-gray-400">{heb}</span>
                                <span className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600">{r.method}</span>
                                {r.cancelled
                                  ? <span className="text-xs font-bold text-red-500 mr-auto">בוטלה</span>
                                  : <button onClick={() => cancelReceipt(storedOn.id, r.id)} className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-full px-2 py-0.5 mr-auto transition">ביטול קבלה</button>}
                              </div>
                              {via && <div className="text-xs text-amber-700 mt-1">{via}</div>}
                              <div className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                                {allocations.map(a => `${a.label.replace('ועד בית — ', '')}: ₪${a.amount.toLocaleString()}`).join(' · ')}
                                {!via && r.unallocated > 0 && <span className="text-orange-500"> · לא שויך: ₪{r.unallocated.toLocaleString()}</span>}
                              </div>
                              {r.note && <div className="text-xs text-gray-600 mt-1">הערה: {r.note}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* חיובים חד-פעמיים */}
                <div className="bg-white p-5 rounded-[20px] border border-[#E3E8E6]">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-base text-teal-800">חיובים נוספים / חד-פעמיים</h4>
                    <button onClick={() => {
                      const newCharge = { id: Date.now(), description: '', amount: 0, status: 'חוב', note: '', occupantName: selectedTenant?.name || '' };
                      setTenants(prev => prev.map(t => t.id === selectedId ? { ...t, charges: [...(t.charges||[]), newCharge] } : t));
                    }} className="flex items-center gap-1 text-teal-700 hover:text-teal-800 text-sm font-bold">
                      <Plus size={14} /> הוסף חיוב
                    </button>
                  </div>
                  {(selectedTenant.charges || []).filter(c => !c.expenseId).length === 0
                    ? <p className="text-sm text-gray-400 text-center py-4">אין חיובים נוספים</p>
                    : <div className="overflow-x-auto"><table className="w-full text-sm text-right">
                        <thead><tr className="border-b text-gray-400 text-xs">
                          <th className="pb-2 font-medium">תיאור</th>
                          <th className="pb-2 font-medium">{selectedTenant.ownerId ? 'על חשבון' : 'שוכר'}</th>
                          <th className="pb-2 font-medium">הערה</th>
                          <th className="pb-2 font-medium">סכום</th>
                          <th className="pb-2 font-medium">סטטוס</th>
                          <th className="pb-2"></th>
                        </tr></thead>
                        <tbody>
                          {(selectedTenant.charges || []).filter(c => !c.expenseId).map(c => (
                            <tr key={c.id} className="border-b group">
                              <td className="py-2">
                                <input value={c.description} onChange={e => setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, charges: t.charges.map(x => x.id===c.id ? {...x,description:e.target.value} : x) }))}
                                  placeholder="תיאור החיוב" className="border-b border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none text-sm bg-transparent w-full" />
                              </td>
                              <td className="py-2">
                                {selectedTenant.ownerId
                                  ? <select value={chargeBillTo(c)} onChange={e => updateChargeOnHost(selectedId, c.id, { billTo: e.target.value })}
                                      className="border border-gray-200 rounded-lg px-1.5 py-0.5 text-xs bg-gray-50 focus:outline-none focus:border-teal-400">
                                      <option value="occupant">השוכר</option>
                                      <option value="owner">בעל הדירה</option>
                                    </select>
                                  : <input value={c.occupantName ?? selectedTenant.name ?? ''} onChange={e => setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, charges: t.charges.map(x => x.id===c.id ? {...x,occupantName:e.target.value} : x) }))}
                                      placeholder="שוכר" className="border-b border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none text-sm bg-transparent w-20" />}
                              </td>
                              <td className="py-2">
                                <input value={c.note} onChange={e => setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, charges: t.charges.map(x => x.id===c.id ? {...x,note:e.target.value} : x) }))}
                                  placeholder="הערה" className="border-b border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none text-sm bg-transparent w-full text-gray-500" />
                              </td>
                              <td className="py-2">
                                <input type="number" value={c.amount} onFocus={e => e.target.select()} onChange={e => setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, charges: t.charges.map(x => x.id===c.id ? {...x,amount:Number(e.target.value)} : x) }))}
                                  className="border-b border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none text-sm bg-transparent w-20" />
                                <span className="text-xs text-gray-400">₪</span>
                              </td>
                              <td className="py-2">
                                <button onClick={() => setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, charges: t.charges.map(x => x.id===c.id ? {...x,status:x.status==='שולם'?'חוב':'שולם'} : x) }))}
                                  className={`text-xs px-2 py-1 rounded-full border font-medium transition ${c.status==='שולם'?'text-green-600 border-green-200 hover:bg-green-50':'text-red-500 border-red-200 hover:bg-red-50'}`}>
                                  {c.status}
                                </button>
                              </td>
                              <td className="py-2 text-left">
                                <button onClick={() => { if (!confirm(`למחוק את החיוב "${c.description || 'הוצאה חריגה'}"?`)) return; setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, charges: t.charges.filter(x => x.id !== c.id) })); }}
                                  className="text-gray-200 hover:text-red-400 transition md:opacity-0 md:group-hover:opacity-100">
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table></div>
                  }
                </div>

                {settings.extraordinaryExpenses && settings.extraordinaryExpenses.length > 0 && (
                  <div className="bg-white p-5 rounded-[20px] border border-[#E3E8E6]">
                    <h4 className="font-bold text-base text-teal-800 mb-4">הוצאות חריגות</h4>

                    {unitCharges(selectedTenant, tenants).filter(({ c }) => c.expenseId).length > 0 && (
                      <div className="overflow-x-auto">
                      <table className="w-full text-sm text-right mb-4">
                        <thead><tr className="border-b text-gray-400 text-xs">
                          <th className="pb-2 font-medium">תיאור</th>
                          {selectedTenant.ownerId && <th className="pb-2 font-medium">על חשבון</th>}
                          <th className="pb-2 font-medium">סכום</th>
                          <th className="pb-2 font-medium">סטטוס</th>
                          <th className="pb-2"></th>
                        </tr></thead>
                        <tbody>
                          {unitCharges(selectedTenant, tenants).filter(({ c }) => c.expenseId).map(({ c, hostId }) => (
                            <tr key={`${hostId}-${c.id}`} className="border-b group">
                              <td className="py-2 text-sm text-gray-700">{c.description || 'הוצאה חריגה'}</td>
                              {selectedTenant.ownerId && (
                                <td className="py-2">
                                  <select value={chargeBillTo(c)} onChange={e => updateChargeOnHost(hostId, c.id, { billTo: e.target.value })}
                                    className="border border-gray-200 rounded-lg px-1.5 py-0.5 text-xs bg-gray-50 focus:outline-none focus:border-teal-400">
                                    <option value="occupant">השוכר</option>
                                    <option value="owner">בעל הדירה</option>
                                  </select>
                                </td>
                              )}
                              <td className="py-2 font-medium text-gray-800">₪{(c.amount||0).toLocaleString()}</td>
                              <td className="py-2">
                                <button onClick={() => toggleExpenseChargeStatus(hostId, c.id)}
                                  className={`text-xs px-2 py-1 rounded-full border font-medium transition ${c.status==='שולם'?'text-green-600 border-green-200 hover:bg-green-50':'text-red-500 border-red-200 hover:bg-red-50'}`}>
                                  {c.status}
                                </button>
                              </td>
                              <td className="py-2 text-left">
                                <button onClick={() => { if (!confirm(`למחוק את החיוב "${c.description || 'הוצאה חריגה'}"?`)) return; deleteChargeOnHost(hostId, c.id); }}
                                  className="text-gray-200 hover:text-red-400 transition md:opacity-0 md:group-hover:opacity-100"><Trash2 size={13} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    )}

                    <div className="space-y-2">
                      {settings.extraordinaryExpenses
                        .filter(exp => !isExpenseAppliedToTenant(selectedTenant, exp.id))
                        .map(exp => (
                          <div key={exp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-700">{exp.description || 'הוצאה ללא שם'}</span>
                              {(exp.hebrewMonth || exp.hebrewYear) && <span className="text-xs text-gray-400">{exp.hebrewDay ? `${exp.hebrewDay} ` : ''}{exp.hebrewMonth} {exp.hebrewYear}</span>}
                              <span className="text-xs font-semibold text-teal-600">₪{(exp.perTenantAmount||0).toLocaleString()} לדייר</span>
                              {selectedTenant.ownerId && exp.billTo === 'owner' && <span className="text-xs font-semibold text-amber-600">על חשבון בעל הדירה</span>}
                            </div>
                            <button onClick={() => {
                              const { hostId, charge } = buildExpenseChargeFor(exp, selectedTenant, Date.now());
                              setTenants(prev => prev.map(t => t.id === hostId ? { ...t, charges: [...(t.charges||[]), charge] } : t));
                            }} className="text-xs text-teal-700 border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap">
                              משוך לדייר
                            </button>
                          </div>
                        ))}
                      {settings.extraordinaryExpenses.every(exp => isExpenseAppliedToTenant(selectedTenant, exp.id)) && (
                        <p className="text-xs text-gray-400 text-center py-2">כל ההוצאות החריגות כבר משוכות לדייר</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-white p-5 rounded-[20px] border border-[#E3E8E6]">
                  <h4 className="font-bold text-base text-teal-800 mb-3">הערות</h4>
                  <textarea
                    value={selectedTenant.notes || ''}
                    onChange={e => setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, notes: e.target.value }))}
                    placeholder="הערות חשובות לגבי הדייר..."
                    rows={4}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-teal-400 text-gray-700 placeholder-gray-300"
                    dir="rtl"
                  />
                </div>
                <div id="tenant-details" className="bg-white p-5 rounded-[20px] border border-[#E3E8E6] scroll-mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-base text-teal-800">פרטי דייר</h3>
                    {!editMode
                      ? <button onClick={startEdit} className="flex items-center gap-1 text-teal-600 hover:text-teal-700 text-sm"><Pencil size={14} /> ערוך</button>
                      : <div className="flex gap-2">
                          <button onClick={saveEdit} className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm"><Check size={14} /> שמור</button>
                          <button onClick={() => setEditMode(false)} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm"><X size={14} /> בטל</button>
                        </div>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[{label:'שם מלא',key:'name'},{label:'מספר דירה',key:'apt'},{label:'תעודת זהות',key:'idCard'},{label:'מייל',key:'email'},{label:'טלפון',key:'phone'},{label:'תאריך חיוב',key:'dueDate'},{label:'שכ"ד חודשי (₪)',key:'monthlyRent'}].map(({label,key}) => (
                      <div key={key}>
                        <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
                        <input
                          readOnly={!editMode}
                          value={editMode ? (editData[key] ?? '') : (selectedTenant[key] ?? '-')}
                          onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))}
                          className={`w-full p-2 rounded-lg border text-sm ${editMode ? 'bg-white border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-400' : 'bg-gray-50 border-gray-200'}`}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">בעל הדירה</label>
                      {editMode ? (
                        <select
                          value={editData.ownerId ?? ''}
                          onChange={e => setEditData(d => ({ ...d, ownerId: e.target.value ? Number(e.target.value) : '' }))}
                          className="w-full p-2 rounded-lg border bg-white border-teal-300 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400">
                          <option value="">— הדירה בבעלות הדייר עצמו —</option>
                          {[...tenants].filter(t => t.id !== selectedTenant.id).sort((a,b) => Number(a.apt)-Number(b.apt)).map(t => (
                            <option key={t.id} value={t.id}>דירה {t.apt} — {t.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input readOnly value={getOwnerTenant(selectedTenant)?.name || '-'}
                          className="w-full p-2 rounded-lg border text-sm bg-gray-50 border-gray-200" />
                      )}
                    </div>
                    {(editMode ? editData.ownerId : selectedTenant.ownerId) && (
                      <div className="sm:col-span-2">
                        <label className={`flex items-center gap-2 text-sm ${editMode ? 'cursor-pointer' : ''}`}>
                          <input type="checkbox"
                            disabled={!editMode}
                            checked={editMode ? !!editData.vacant : !!selectedTenant.vacant}
                            onChange={e => setEditData(d => ({ ...d, vacant: e.target.checked }))}
                            className="w-4 h-4 accent-amber-600" />
                          <span className={selectedTenant.vacant ? 'text-amber-700 font-medium' : 'text-gray-500'}>הדירה עומדת ריקה כרגע</span>
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end border-t border-[#E3E8E6] mt-5 pt-4">
                    <button onClick={() => deleteTenant(selectedTenant.id)} className="flex items-center gap-1.5 text-sm text-[#B42318] hover:bg-[#FDECEA] px-3 py-2 rounded-lg transition">
                      <Trash2 size={14} /> מחיקת דייר
                    </button>
                  </div>
                </div>

                {(() => {
                  const { month: curM, year: curY } = getCurrentHebrewDate();
                  const baseFee = getFeeForMonth(curM, curY);
                  const pct = Number(selectedTenant.feePercent || 100);
                  const effective = Math.round(baseFee * pct / 100);
                  return (
                    <div className="bg-white p-5 rounded-[20px] border border-[#E3E8E6]">
                      <h4 className="font-bold text-sm text-teal-800 mb-3">תעריף גבייה</h4>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">תעריף בסיס</span>
                          <span className="font-medium text-gray-700">₪{baseFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">אחוז תשלום</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number" min="1" max="100"
                              value={pct}
                              onFocus={e => e.target.select()}
                              onChange={e => {
                                const newPct = Math.min(100, Math.max(1, Number(e.target.value) || 100));
                                const newRent = Math.round(baseFee * newPct / 100);
                                setTenants(prev => prev.map(t => {
                                  if (t.id !== selectedId) return t;
                                  return {
                                    ...t,
                                    feePercent: newPct,
                                    monthlyRent: newRent,
                                    payments: t.payments.map(p => {
                                      if (p.status === 'שולם') return p;
                                      const baseForMonth = getFeeForMonth(p.hebrewMonth, p.hebrewYear);
                                      return { ...p, amount: Math.round(baseForMonth * newPct / 100) };
                                    }),
                                  };
                                }));
                              }}
                              className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-14 text-center focus:outline-none focus:ring-1 focus:ring-teal-400"
                            />
                            <span className="text-xs text-gray-400">%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2.5">
                          <span className="text-gray-500 font-medium">לתשלום בפועל</span>
                          <span className="font-bold text-teal-700 text-base">₪{effective.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
          </div>
        )}

        {view === 'add' && (
          <div className="max-w-2xl mx-auto">
            <button onClick={goList} className="flex items-center text-teal-800 font-bold mb-5 hover:underline text-sm">
              <ChevronRight size={18} /> חזרה
            </button>
            <div className="bg-white p-6 rounded-[20px] border border-[#E3E8E6]">
              <h3 className="font-bold text-base text-teal-800 mb-5">הוספת דייר חדש</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[{label:'שם מלא',key:'name'},{label:'מספר דירה',key:'apt'},{label:'תעודת זהות',key:'idCard'},{label:'מייל',key:'email'},{label:'טלפון',key:'phone'},{label:'תאריך חיוב',key:'dueDate'},{label:'שכ"ד חודשי (₪)',key:'monthlyRent'}].map(({label,key}) => (
                  <div key={key}>
                    <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
                    <input value={newTenant[key] ?? ''} onChange={e => setNewTenant(d => ({...d,[key]:e.target.value}))}
                      className="w-full p-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
                      type={key==='monthlyRent'?'number':'text'} />
                  </div>
                ))}
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">בעל הדירה</label>
                  <select value={newTenant.ownerId ?? ''} onChange={e => setNewTenant(d => ({ ...d, ownerId: e.target.value ? Number(e.target.value) : '' }))}
                    className="w-full p-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400">
                    <option value="">— הדירה בבעלות הדייר עצמו —</option>
                    {[...tenants].sort((a,b) => Number(a.apt)-Number(b.apt)).map(t => (
                      <option key={t.id} value={t.id}>דירה {t.apt} — {t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={addNewTenant} disabled={!newTenant.name||!newTenant.apt} className="bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-teal-600 transition">שמור דייר</button>
                <button onClick={goList} className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition">ביטול</button>
              </div>
            </div>
          </div>
        )}

        {view === 'expenses' && settings && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex justify-end">
              <button onClick={printExpensesReport} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 hover:border-teal-400 hover:text-teal-700 px-4 py-2 rounded-full text-sm font-medium shadow-sm transition">
                <FileDown size={15} /> הורד דוח PDF
              </button>
            </div>
            {[
              { key: 'electricityExpenses', label: 'חשמל' },
              { key: 'cleaningExpenses', label: 'ניקיון' },
              { key: 'regularExpenses', label: 'הוצאות שוטפות' },
              { key: 'extraordinaryExpenses', label: 'הוצאות חריגות' },
            ].map(({ key, label }) => (
              <div key={key}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">{label}</h2>
                  <button onClick={() => {
                    const { month: curM, year: curY, day: curD } = getCurrentHebrewDate();
                    const newExp = key === 'electricityExpenses'
                      ? { id: Date.now(), fromGreg: '', fromDay: curD, fromMonth: curM, fromYear: curY, toGreg: '', toDay: '', toMonth: '', toYear: '', totalAmount: 0, paymentMethod: '', paymentGreg: '', paymentDay: '', paymentMonth: '', paymentYear: '', note: '' }
                      : { id: Date.now(), description: '', totalAmount: 0, paidAmount: 0, perTenantAmount: 0, hebrewDay: curD, hebrewMonth: curM, hebrewYear: curY, note: '', ...(key === 'extraordinaryExpenses' ? { billTo: 'occupant' } : {}) };
                    setSettings(s => ({ ...s, [key]: [...(s[key] || []), newExp] }));
                  }} className="flex items-center gap-2 bg-teal-700 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-teal-600 transition">
                    <Plus size={14} /> {key === 'electricityExpenses' ? 'הוסף חשבונית' : 'הוסף הוצאה'}
                  </button>
                </div>
                <div className="bg-white rounded-[20px] border border-[#E3E8E6] overflow-visible">
                  {(!settings[key] || settings[key].length === 0)
                    ? <p className="text-center text-gray-400 text-sm py-14">{key === 'electricityExpenses' ? 'אין חשבוניות חשמל.' : `אין הוצאות ${label}.`} לחצי על הכפתור כדי להתחיל.</p>
                    : key === 'electricityExpenses'
                      ? <div className="overflow-x-auto"><table className="w-full text-sm text-right">
                          <thead>
                            <tr className="border-b bg-gray-50 text-gray-500 text-xs">
                              <th className="px-3 py-3 font-medium">תקופה מ-</th>
                              <th className="px-3 py-3 font-medium">עד</th>
                              <th className="px-3 py-3 font-medium">סה״כ כולל מע״מ</th>
                              <th className="px-3 py-3 font-medium">אופן תשלום</th>
                              <th className="px-3 py-3 font-medium">תאריך תשלום</th>
                              <th className="px-3 py-3 font-medium">הערות</th>
                              <th className="px-3 py-3"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {settings[key].map(exp => (
                              <tr key={exp.id} className={`border-b group transition ${exp.paymentMethod ? 'bg-green-50/40 hover:bg-green-50/70' : 'bg-red-50/40 hover:bg-red-50/70'}`}>
                                <td className="px-2 py-2">
                                  <input type="date"
                                    value={exp.fromGreg || hebDateToGregStr(exp.fromDay, exp.fromMonth, exp.fromYear)}
                                    onChange={e => { const g=e.target.value; if (!g) return; const [yy,mm,dd]=g.split('-').map(Number); const h=gregorianToHebrewDate(new Date(yy,mm-1,dd)); setSettings(s=>({...s,[key]:s[key].map(x=>x.id===exp.id?{...x,fromGreg:g,fromDay:h.day,fromMonth:h.month,fromYear:h.year}:x)})); }}
                                    className="border border-gray-200 rounded px-1 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-teal-400 w-28" />
                                </td>
                                <td className="px-2 py-2">
                                  <input type="date"
                                    value={exp.toGreg || hebDateToGregStr(exp.toDay, exp.toMonth, exp.toYear)}
                                    onChange={e => { const g=e.target.value; if (!g) return; const [yy,mm,dd]=g.split('-').map(Number); const h=gregorianToHebrewDate(new Date(yy,mm-1,dd)); setSettings(s=>({...s,[key]:s[key].map(x=>x.id===exp.id?{...x,toGreg:g,toDay:h.day,toMonth:h.month,toYear:h.year}:x)})); }}
                                    className="border border-gray-200 rounded px-1 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-teal-400 w-28" />
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex items-center gap-0.5">
                                    <input type="number" value={exp.totalAmount||0} onFocus={e => e.target.select()}
                                      onChange={e => setSettings(s => ({ ...s, [key]: s[key].map(x => x.id===exp.id ? {...x,totalAmount:Number(e.target.value)} : x) }))}
                                      className="border-b border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none text-xs bg-transparent w-16" />
                                    <span className="text-[10px] text-gray-400">₪</span>
                                  </div>
                                </td>
                                <td className="px-2 py-2">
                                  <select
                                    value={exp.paymentMethod || ''}
                                    onChange={e => setSettings(s => ({ ...s, [key]: s[key].map(x => x.id===exp.id ? {...x, paymentMethod: e.target.value} : x) }))}
                                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-gray-50 focus:border-teal-400 focus:outline-none text-gray-600 w-full">
                                    <option value="">— בחר —</option>
                                    <option>הוראת קבע</option>
                                    <option>העברה בנקאית</option>
                                    <option>כרטיס אשראי</option>
                                    <option>מזומן</option>
                                  </select>
                                </td>
                                <td className="px-2 py-2">
                                  <input type="date"
                                    value={exp.paymentGreg || hebDateToGregStr(exp.paymentDay, exp.paymentMonth, exp.paymentYear)}
                                    onChange={e => { const g=e.target.value; if (!g) return; const [yy,mm,dd]=g.split('-').map(Number); const h=gregorianToHebrewDate(new Date(yy,mm-1,dd)); setSettings(s=>({...s,[key]:s[key].map(x=>x.id===exp.id?{...x,paymentGreg:g,paymentDay:h.day,paymentMonth:h.month,paymentYear:h.year}:x)})); }}
                                    className="border border-gray-200 rounded px-1 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-teal-400 w-28" />
                                </td>
                                <td className="px-2 py-2">
                                  <input value={exp.note||''} onChange={e => setSettings(s => ({ ...s, [key]: s[key].map(x => x.id===exp.id ? {...x,note:e.target.value} : x) }))}
                                    placeholder="הערות" className="border-b border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none text-xs bg-transparent w-full text-gray-500" />
                                </td>
                                <td className="px-3 py-3 text-left">
                                  <button onClick={() => { if (!confirm(`למחוק את חשבונית החשמל (₪${(exp.totalAmount||0).toLocaleString()})?`)) return; setSettings(s => ({ ...s, [key]: s[key].filter(x => x.id !== exp.id) })); }}
                                    className="text-gray-200 hover:text-red-400 transition md:opacity-0 md:group-hover:opacity-100">
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table></div>
                      : <div className="p-3 space-y-2">
                          {[...settings[key]].sort(compareExpenseDateDesc).map(exp => {
                            const linkedCharges = key === 'extraordinaryExpenses'
                              ? tenants.flatMap(t => (t.charges||[]).filter(c => c.expenseId === exp.id).map(c => ({ ...c, tenant: t })))
                              : [];
                            const isPulled = linkedCharges.length > 0;
                            const paidCharges = linkedCharges.filter(c => c.status === 'שולם');
                            const autoPaid = paidCharges.reduce((s,c) => s + c.amount, 0);
                            const paidAmount = isPulled ? autoPaid : (exp.paidAmount || 0);
                            const remaining = Math.max(0, (exp.totalAmount||0) - paidAmount);
                            const isFullyPaid = (exp.totalAmount||0) > 0 && remaining <= 0;
                            const isPartlyPaid = paidAmount > 0 && !isFullyPaid;
                            const expensePaidAmount = exp.paidAmount || 0;
                            const payRemaining = Math.max(0, (exp.totalAmount||0) - expensePaidAmount);
                            const cardColor = isFullyPaid ? 'bg-green-50/40 hover:bg-green-50/70' : isPartlyPaid ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-gray-50/50';
                            return (
                              <div key={exp.id} className={`group px-4 py-3 border border-gray-200 rounded-xl transition ${cardColor}`}>
                                <div className="flex items-center gap-4 flex-wrap">
                                  <input value={exp.description||''}
                                    onChange={e => setSettings(s => ({ ...s, [key]: s[key].map(x => x.id===exp.id ? {...x,description:e.target.value} : x) }))}
                                    placeholder="תיאור ההוצאה"
                                    className="flex-1 min-w-[140px] border-b border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none text-sm font-medium text-gray-900 bg-transparent" />

                                  <HebrewDatePicker day={exp.hebrewDay||''} month={exp.hebrewMonth||''} year={exp.hebrewYear||''}
                                    onChange={(d,m,y) => setSettings(s => ({ ...s, [key]: s[key].map(x => x.id===exp.id ? {...x,hebrewDay:d,hebrewMonth:m,hebrewYear:y} : x) }))} />

                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">סה"כ</span>
                                    <input type="number" value={exp.totalAmount||0} onFocus={e => e.target.select()}
                                      onChange={e => setSettings(s => ({ ...s, [key]: s[key].map(x => x.id===exp.id ? {...x,totalAmount:Number(e.target.value)} : x) }))}
                                      className="border-b border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none text-sm text-gray-900 font-medium bg-transparent w-16" />
                                    <span className="text-xs text-gray-400">₪</span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">חלק לדייר</span>
                                    <input type="number" value={exp.perTenantAmount||0} onFocus={e => e.target.select()}
                                      onChange={e => setSettings(s => ({ ...s, [key]: s[key].map(x => x.id===exp.id ? {...x,perTenantAmount:Number(e.target.value)} : x) }))}
                                      className="border-b border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none text-sm text-gray-900 font-medium bg-transparent w-16" />
                                    <span className="text-xs text-gray-400">₪</span>
                                  </div>

                                  {key === 'extraordinaryExpenses' && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-gray-400 whitespace-nowrap">בדירה מושכרת על חשבון</span>
                                      <select
                                        value={exp.billTo || 'occupant'}
                                        onChange={e => {
                                          const newVal = e.target.value;
                                          setSettings(s => ({ ...s, [key]: s[key].map(x => x.id===exp.id ? {...x, billTo: newVal} : x) }));
                                        }}
                                        className="border border-gray-200 rounded-lg px-1.5 py-1 text-xs bg-gray-50 focus:border-teal-400 focus:outline-none text-gray-600">
                                        <option value="occupant">השוכר</option>
                                        <option value="owner">בעל הדירה</option>
                                      </select>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{isPulled ? 'התקבל' : 'שולם'}</span>
                                    {isPulled ? (
                                      <>
                                        <span className="text-sm font-medium text-green-700" title="מתעדכן אוטומטית לפי תשלומי הדיירים">₪{paidAmount.toLocaleString()}</span>
                                        <button onClick={() => setExpandedPaidList(id => id === exp.id ? null : exp.id)}
                                          className="flex items-center gap-0.5 text-[10px] text-teal-600 border border-teal-200 hover:bg-teal-50 px-1.5 py-0.5 rounded-full transition whitespace-nowrap">
                                          <Users size={10} /> {paidCharges.length}/{linkedCharges.length}
                                          <ChevronDown size={10} className={`transition-transform ${expandedPaidList === exp.id ? 'rotate-180' : ''}`} />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <input type="number" value={exp.paidAmount||0} onFocus={e => e.target.select()}
                                          onChange={e => setSettings(s => ({ ...s, [key]: s[key].map(x => x.id===exp.id ? {...x,paidAmount:Number(e.target.value)} : x) }))}
                                          className="border-b border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none text-sm bg-transparent w-16 text-green-700 font-medium" />
                                        <span className="text-xs text-gray-400">₪</span>
                                      </>
                                    )}
                                  </div>

                                  {remaining > 0 && (
                                    <span className="text-xs font-bold text-red-500 whitespace-nowrap">{isPulled ? 'יתרה לתקבול' : 'יתרה'}: ₪{remaining.toLocaleString()}</span>
                                  )}

                                  {isPulled && (
                                    <>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">שולם</span>
                                        <input type="number" value={exp.paidAmount||0} onFocus={e => e.target.select()}
                                          onChange={e => setSettings(s => ({ ...s, [key]: s[key].map(x => x.id===exp.id ? {...x,paidAmount:Number(e.target.value)} : x) }))}
                                          className="border-b border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none text-sm bg-transparent w-16 text-blue-700 font-medium" />
                                        <span className="text-xs text-gray-400">₪</span>
                                      </div>

                                      {payRemaining > 0 && (
                                        <span className="text-xs font-bold text-orange-500 whitespace-nowrap">יתרה לתשלום: ₪{payRemaining.toLocaleString()}</span>
                                      )}
                                    </>
                                  )}

                                  <input value={exp.note||''} onChange={e => setSettings(s => ({ ...s, [key]: s[key].map(x => x.id===exp.id ? {...x,note:e.target.value} : x) }))}
                                    placeholder="הערה..." className="w-20 border-b border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none text-xs bg-transparent text-gray-800" />

                                  <div className="flex items-center gap-2 mr-auto">
                                    {key === 'extraordinaryExpenses' && (
                                      <>
                                        <button onClick={() => {
                                          if (!confirm(`לשלוף "${exp.description||'הוצאה חריגה'}" (₪${(exp.perTenantAmount||0).toLocaleString()}) לכל הדיירים?`)) return;
                                          setTenants(prev => {
                                            const additions = new Map();
                                            prev.forEach((t, i) => {
                                              if (isExpenseAppliedToTenant(t, exp.id)) return;
                                              const { hostId, charge } = buildExpenseChargeFor(exp, t, Date.now()+i);
                                              if (!additions.has(hostId)) additions.set(hostId, []);
                                              additions.get(hostId).push(charge);
                                            });
                                            return prev.map(t => additions.has(t.id) ? { ...t, charges: [...(t.charges||[]), ...additions.get(t.id)] } : t);
                                          });
                                        }} className="text-xs text-teal-600 border border-teal-200 hover:bg-teal-50 px-2 py-1 rounded-full font-medium transition whitespace-nowrap">
                                          שלוף לכולם
                                        </button>
                                        <button onClick={() => {
                                          setSelectExpModal({ expId: exp.id, description: exp.description, perTenantAmount: exp.perTenantAmount });
                                          setSelectedTenantIds(new Set());
                                        }} className="text-xs text-purple-600 border border-purple-200 hover:bg-purple-50 px-2 py-1 rounded-full font-medium transition whitespace-nowrap">
                                          שלוף לדירות...
                                        </button>
                                      </>
                                    )}
                                    <button onClick={() => {
                                      const msg = isPulled
                                        ? `למחוק את "${exp.description||'הוצאה חריגה'}"?

שימי לב: ההוצאה משויכת ל-${linkedCharges.length} דיירים (${paidCharges.length} כבר שילמו) - כל החיובים האלה יימחקו מכרטיסי הדיירים.`
                                        : `למחוק את ההוצאה "${exp.description||'ללא שם'}"?`;
                                      if (!confirm(msg)) return;
                                      setSettings(s => ({ ...s, [key]: s[key].filter(x => x.id !== exp.id) }));
                                      if (key === 'extraordinaryExpenses') {
                                        setTenants(prev => prev.map(t => ({ ...t, charges: (t.charges||[]).filter(c => c.expenseId !== exp.id) })));
                                      }
                                    }} className="text-gray-300 hover:text-red-400 transition md:opacity-0 md:group-hover:opacity-100">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>

                                {isPulled && expandedPaidList === exp.id && (
                                  <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1.5">
                                    {linkedCharges.length === 0
                                      ? <span className="text-xs text-gray-400">אין דיירים משויכים</span>
                                      : linkedCharges.map(c => {
                                        const aptTenant = c.billedApartmentId ? tenants.find(x => x.id === c.billedApartmentId) : c.tenant;
                                        return (
                                          <span key={c.id} className={`text-[11px] px-2 py-0.5 rounded-full border ${c.status === 'שולם' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                            דירה {aptTenant?.apt} — {c.billedApartmentId ? `${c.tenant.name} (בעלים)` : c.tenant.name}
                                          </span>
                                        );
                                      })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                  }
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'settings' && settingsData && (
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">הגדרות מערכת</h2>
              <button onClick={saveSettings} disabled={isSavingSettings} className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition disabled:opacity-60 ${settingsSaved ? 'bg-green-600 text-white' : 'bg-teal-700 hover:bg-teal-600 text-white'}`}>
                {isSavingSettings ? <>שומר...</> : settingsSaved ? <><Check size={15} /> נשמר!</> : <><Check size={15} /> שמור הגדרות</>}
              </button>
            </div>

            <div className="space-y-5">
              {/* גיבוי נתונים */}
              <div className="bg-white p-6 rounded-[20px] border border-[#E3E8E6]">
                <h3 className="font-bold text-base text-teal-800 mb-2">גיבוי נתונים</h3>
                <p className="text-sm text-gray-500 mb-4">מוריד קובץ עם כל נתוני הדיירים (תשלומים, חיובים, הערות) וההגדרות (תעריפים, הוצאות חריגות) כפי שהם עכשיו. שווה להוריד מדי פעם כגיבוי אישי אצלך במחשב.</p>
                <button onClick={exportBackup} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition ${backupExported ? 'bg-green-600 text-white' : 'bg-teal-700 hover:bg-teal-600 text-white'}`}>
                  {backupExported ? <><Check size={15} /> ירד!</> : <><FileDown size={15} /> ייצוא גיבוי</>}
                </button>
              </div>

              {/* Logo */}
              <div className="bg-white p-6 rounded-[20px] border border-[#E3E8E6]">
                <h3 className="font-bold text-base text-teal-800 mb-4">לוגו הבניין</h3>
                <div className="flex items-center gap-6">
                  <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                    {settingsData.logo
                      ? <img src={settingsData.logo} alt="לוגו" className="w-full h-full object-contain p-1" />
                      : <ImageOff size={32} className="text-gray-300" />}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-3">הלוגו יופיע בתזכורות תשלום ובמכתבים שיוצאים מהמערכת.</p>
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <div className="flex gap-2">
                      <button onClick={() => logoInputRef.current.click()} className="flex items-center gap-2 bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-teal-600 transition">
                        <Upload size={14} /> העלה לוגו
                      </button>
                      {settingsData.logo && (
                        <button onClick={() => setSettingsData(d => ({ ...d, logo: null }))} className="flex items-center gap-1 border border-red-200 text-red-500 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-50 transition">
                          <X size={14} /> הסר
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Building info */}
              <div className="bg-white p-6 rounded-[20px] border border-[#E3E8E6]">
                <h3 className="font-bold text-base text-teal-800 mb-4">פרטי הבניין</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[{label:'שם הבניין / ועד',key:'buildingName'},{label:'כתובת',key:'address'}].map(({label,key}) => (
                    <div key={key}>
                      <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
                      <input value={settingsData[key]} onChange={e => setSettingsData(d => ({...d,[key]:e.target.value}))}
                        className="w-full p-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Managers */}
              <div className="bg-white p-6 rounded-[20px] border border-[#E3E8E6]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-base text-teal-800">חברי ועד הבית</h3>
                  <button onClick={() => setSettingsData(d => ({ ...d, managers: [...d.managers, { id: Date.now(), name: '', phone: '', email: '', role: '' }] }))}
                    className="flex items-center gap-1 text-teal-700 hover:text-teal-800 text-sm font-bold">
                    <Plus size={15} /> הוסף חבר ועד
                  </button>
                </div>
                <div className="space-y-4">
                  {settingsData.managers.map((mgr, i) => (
                    <div key={mgr.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 relative">
                      {settingsData.managers.length > 1 && (
                        <button onClick={() => setSettingsData(d => ({ ...d, managers: d.managers.filter(m => m.id !== mgr.id) }))}
                          className="absolute top-3 left-3 text-gray-300 hover:text-red-400 transition">
                          <X size={15} />
                        </button>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[{label:'שם מלא',key:'name'},{label:'תפקיד',key:'role'},{label:'טלפון',key:'phone'},{label:'מייל',key:'email'}].map(({label,key}) => (
                          <div key={key}>
                            <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
                            <input value={mgr[key]} onChange={e => setSettingsData(d => ({ ...d, managers: d.managers.map((m,j) => j===i ? {...m,[key]:e.target.value} : m) }))}
                              className="w-full p-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fee history */}
              <div className="bg-white p-6 rounded-[20px] border border-[#E3E8E6]">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-base text-teal-800">היסטוריית סכום גבייה</h3>
                    <p className="text-xs text-gray-400 mt-0.5">הסכום הפעיל הוא הרשומה האחרונה לפי תאריך</p>
                  </div>
                  <button onClick={() => setSettingsData(d => ({ ...d, feeHistory: [...d.feeHistory, { id: Date.now(), amount: 0, fromMonth: 'תשרי', fromYear: CURRENT_HEBREW_YEAR, note: '' }] }))}
                    className="flex items-center gap-1 text-teal-700 hover:text-teal-800 text-sm font-bold">
                    <Plus size={15} /> עדכון סכום
                  </button>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead><tr className="border-b text-gray-400 text-xs">
                    <th className="pb-2 font-medium">סכום (₪)</th>
                    <th className="pb-2 font-medium">החל מחודש</th>
                    <th className="pb-2 font-medium">שנה</th>
                    <th className="pb-2 font-medium">הערה</th>
                    <th className="pb-2"></th>
                  </tr></thead>
                  <tbody>
                    {[...(settingsData.feeHistory || [])].reverse().map((fee, ri) => {
                      const i = settingsData.feeHistory.length - 1 - ri;
                      const isActive = ri === 0;
                      return (
                        <tr key={fee.id} className={`border-b ${isActive ? 'bg-teal-50/40' : ''}`}>
                          <td className="py-2">
                            <div className="flex items-center gap-1">
                              <input type="number" value={fee.amount} onChange={e => setSettingsData(d => ({ ...d, feeHistory: d.feeHistory.map((x,j) => j===i?{...x,amount:Number(e.target.value)}:x) }))}
                                onFocus={e => e.target.select()}
                                className="border rounded px-2 py-1 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-teal-400" />
                              {isActive && <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-medium">פעיל</span>}
                            </div>
                          </td>
                          <td className="py-2">
                            <select value={fee.fromMonth} onChange={e => setSettingsData(d => ({ ...d, feeHistory: d.feeHistory.map((x,j) => j===i?{...x,fromMonth:e.target.value}:x) }))}
                              className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400">
                              {monthsForYear(fee.fromYear).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </td>
                          <td className="py-2">
                            <select value={fee.fromYear} onChange={e => setSettingsData(d => ({ ...d, feeHistory: d.feeHistory.map((x,j) => j===i?{...x,fromYear:e.target.value}:x) }))}
                              className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400">
                              {HEBREW_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </td>
                          <td className="py-2">
                            <input value={fee.note} onChange={e => setSettingsData(d => ({ ...d, feeHistory: d.feeHistory.map((x,j) => j===i?{...x,note:e.target.value}:x) }))}
                              placeholder="לדוגמא: עדכון שנתי" className="border-b border-transparent hover:border-gray-200 focus:border-teal-400 focus:outline-none text-xs bg-transparent w-full" />
                          </td>
                          <td className="py-2 text-left">
                            <div className="flex items-center gap-2 justify-end">
                              {isActive && (
                                <button onClick={() => applyFeeToAllTenants(fee.amount, fee.fromMonth, fee.fromYear)}
                                  className="text-xs bg-teal-700 hover:bg-teal-600 text-white px-2 py-1 rounded-lg font-medium transition whitespace-nowrap">
                                  החל על כולם
                                </button>
                              )}
                              {settingsData.feeHistory.length > 1 && (
                                <button onClick={() => setSettingsData(d => ({ ...d, feeHistory: d.feeHistory.filter(x => x.id !== fee.id) }))}
                                  className="text-gray-200 hover:text-red-400 transition"><X size={14} /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>

              {/* הגדרות EmailJS - הוסתרו: המיילים נפתחים עכשיו ב-Gmail. ההגדרות הישנות נשמרות בנתונים ולא נמחקו */}
              {false && (<>
              <div className="bg-white p-6 rounded-[20px] border border-[#E3E8E6]">
                <h3 className="font-bold text-base text-teal-800 mb-1">הגדרות מייל</h3>
                <p className="text-xs text-gray-400 mb-4">פרטי EmailJS לשליחת מיילים מהמערכת</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'שם השולח', key: 'senderName', placeholder: 'ועד הבית' },
                    { label: 'מייל השולח (לתצוגה)', key: 'senderEmail', placeholder: 'vaad@gmail.com' },
                    { label: 'Service ID', key: 'serviceId', placeholder: 'vaad-gmail' },
                    { label: 'Template ID', key: 'templateId', placeholder: 'template_xxxxxxx' },
                    { label: 'Public Key', key: 'publicKey', placeholder: 'xxxxxxxxxxxxxxxxx' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key} className={key === 'publicKey' ? 'col-span-2' : ''}>
                      <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
                      <input
                        value={(settingsData.emailSettings || {})[key] || ''}
                        onChange={e => setSettingsData(d => ({ ...d, emailSettings: { ...(d.emailSettings || {}), [key]: e.target.value } }))}
                        placeholder={placeholder}
                        className="w-full p-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
                      />
                    </div>
                  ))}
                </div>
              </div>

              </>)}

              {/* Templates */}
              <div className="bg-white p-6 rounded-[20px] border border-[#E3E8E6]">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-base text-teal-800">תבניות הודעות</h3>
                  <button onClick={() => setSettingsData(d => ({ ...d, templates: [...d.templates, { id: Date.now(), name: 'תבנית חדשה', body: '' }] }))}
                    className="flex items-center gap-1 text-teal-700 hover:text-teal-800 text-sm font-bold">
                    <Plus size={15} /> תבנית חדשה
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-4">משתנים: {'{שם}'} {'{חודש}'} {'{סכום}'} {'{תאריך}'} {'{מנהל}'} {'{טלפון}'} {'{כתובת}'}</p>
                <div className="space-y-4">
                  {settingsData.templates.map((tpl, i) => (
                    <div key={tpl.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <input value={tpl.name} onChange={e => setSettingsData(d => ({ ...d, templates: d.templates.map((t,j) => j===i ? {...t,name:e.target.value} : t) }))}
                          placeholder="שם התבנית"
                          className="font-bold text-sm text-teal-800 bg-transparent border-b border-teal-200 focus:outline-none focus:border-teal-500 w-48 pb-0.5" />
                        {settingsData.templates.length > 1 && (
                          <button onClick={() => setSettingsData(d => ({ ...d, templates: d.templates.filter(t => t.id !== tpl.id) }))}
                            className="text-gray-300 hover:text-red-400 transition"><X size={15} /></button>
                        )}
                      </div>
                      <textarea value={tpl.body} onChange={e => setSettingsData(d => ({ ...d, templates: d.templates.map((t,j) => j===i ? {...t,body:e.target.value} : t) }))}
                        className="w-full border border-gray-200 rounded-lg p-2 text-sm h-24 resize-none focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white" dir="rtl" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>


      {receiptModal && (() => {
        const tenant = tenants.find(t => t.id === receiptModal.tenantId);
        if (!tenant) return null;
        const items = receiptDebtItems(tenant, tenants);
        const amount = Math.round(Number(receiptModal.amount) || 0);
        const { alloc, left } = allocateAmount(items, receiptModal.checked, amount);
        const allocByKey = new Map(alloc.map(a => [a.key, a.amount]));
        const ownedForPrepay = tenant.ownerId ? [] : [...getOwnedApartments(tenant.id)].sort((a, b) => Number(a.apt) - Number(b.apt));
        const prepayUnit = tenants.find(t => t.id === receiptModal.prepayUnitId) || tenant;
        const { plan, left: unallocated } = receiptModal.prepay ? planPrepaid(prepayUnit, left) : { plan: [], left };
        // לכל שורה: באיזו דירה, ובדירה מושכרת - על חשבון מי
        const itemTag = it => {
          const unit = tenants.find(t => t.id === it.unitId);
          if (!unit?.ownerId) return it.unitId !== tenant.id ? `דירה ${unit?.apt}` : '';
          let billTo;
          if (it.kind === 'payment') billTo = unit.monthlyBillTo || 'occupant';
          else {
            const c = (tenants.find(t => t.id === it.hostId)?.charges || []).find(x => x.id === it.refId);
            billTo = c ? chargeBillTo(c) : 'occupant';
          }
          const who = billTo === 'owner' ? 'על חשבון בעל הדירה' : 'לגבות מהשוכר';
          return it.unitId !== tenant.id ? `דירה ${unit.apt} · ${who}` : who;
        };
        const checkedDue = items.filter(it => receiptModal.checked.has(it.key)).reduce((s, it) => s + it.due, 0);
        const skippedCharges = items.filter(it => receiptModal.checked.has(it.key) && !it.partial && !allocByKey.has(it.key));
        const setForm = patch => setReceiptModal(m => ({ ...m, ...patch }));
        const canSave = amount > 0 && unallocated === 0 && receiptModal.date;
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReceiptModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto" dir="rtl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Banknote size={20} className="text-teal-600" /> קבלת תשלום</h3>
                  <p className="text-sm text-gray-500">{tenant.name} · דירה {tenant.apt}</p>
                </div>
                <button onClick={() => setReceiptModal(null)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">סכום שהתקבל</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" inputMode="numeric" autoFocus value={receiptModal.amount}
                      onChange={e => setForm({ amount: e.target.value })}
                      className="w-36 border border-teal-300 rounded-xl px-3 py-2 text-2xl font-bold text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    <span className="text-xl font-bold text-gray-400">₪</span>
                    {checkedDue > 0 && (
                      <button onClick={() => setForm({ amount: String(checkedDue) })}
                        className="text-xs text-teal-700 border border-teal-200 hover:bg-teal-50 rounded-full px-3 py-1.5 transition">
                        כל החוב שנבחר — ₪{checkedDue.toLocaleString()}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">תאריך</label>
                  <input type="date" value={receiptModal.date} onChange={e => setForm({ date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">אמצעי תשלום</label>
                  <select value={receiptModal.method} onChange={e => setForm({ method: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-400">
                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">הערה (לא חובה)</label>
                  <input value={receiptModal.note} onChange={e => setForm({ note: e.target.value })} placeholder="למשל: מספר צ׳ק, מי מסר..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400" />
                </div>
              </div>

              <p className="text-sm font-bold text-gray-700 mb-2">על מה התשלום</p>
              {items.length === 0
                ? <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-3 mb-3">אין חובות פתוחים — כל הסכום ייזקף כתשלום מראש</p>
                : <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 mb-3 max-h-60 overflow-y-auto">
                    {items.map(it => {
                      const got = allocByKey.get(it.key) || 0;
                      return (
                        <label key={it.key} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                          <input type="checkbox" checked={receiptModal.checked.has(it.key)}
                            onChange={() => setReceiptModal(m => { const next = new Set(m.checked); if (next.has(it.key)) next.delete(it.key); else next.add(it.key); return { ...m, checked: next }; })}
                            className="w-4 h-4 accent-teal-600" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-700">{it.label}</div>
                            {itemTag(it) && <div className="text-[11px] text-amber-700">{itemTag(it)}</div>}
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">חוב ₪{it.due.toLocaleString()}</span>
                          <span className={`text-sm font-bold w-20 text-left whitespace-nowrap ${got >= it.due ? 'text-green-600' : got > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                            {got > 0 ? `₪${got.toLocaleString()}${got >= it.due ? ' ✓' : ''}` : '—'}
                          </span>
                        </label>
                      );
                    })}
                  </div>}

              {skippedCharges.length > 0 && (
                <p className="text-xs text-amber-600 mb-2">לא נשאר מספיק לכיסוי מלא של: {skippedCharges.map(c => c.label).join(', ')} (חיוב נסגר רק בתשלום מלא)</p>
              )}

              {left > 0 && (
                <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 mb-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={receiptModal.prepay} onChange={e => setForm({ prepay: e.target.checked })} className="w-4 h-4 accent-sky-600" />
                    <span>נשארו <b>₪{left.toLocaleString()}</b> — לזקוף כתשלום מראש לחודשים הבאים</span>
                  </label>
                  {receiptModal.prepay && ownedForPrepay.length > 0 && (
                    <label className="flex items-center gap-2 text-xs text-sky-800 mt-2 mr-6">
                      עבור:
                      <select value={prepayUnit.id} onChange={e => setForm({ prepayUnitId: Number(e.target.value) })}
                        className="border border-sky-200 rounded-lg px-1.5 py-0.5 text-xs bg-white focus:outline-none">
                        <option value={tenant.id}>הדירה שלו ({tenant.apt})</option>
                        {ownedForPrepay.map(a => <option key={a.id} value={a.id}>דירה {a.apt}{a.name && !a.vacant ? ` (${a.name})` : ''}</option>)}
                      </select>
                    </label>
                  )}
                  {receiptModal.prepay && plan.length > 0 && (
                    <p className="text-xs text-sky-700 mt-1.5 mr-6">
                      {plan.map(pl => `${pl.month} ${pl.year}${pl.full ? '' : ` (חלקי ₪${pl.amount.toLocaleString()})`}`).join(' · ')}
                    </p>
                  )}
                </div>
              )}
              {unallocated > 0 && (
                <p className="text-xs text-red-500 font-medium mb-3">₪{unallocated.toLocaleString()} מהסכום לא משויכים לשום חוב — סמני עוד חובות, סמני "תשלום מראש" או הקטיני את הסכום.</p>
              )}

              <div className="flex gap-2 border-t pt-4">
                <button onClick={() => setReceiptModal(null)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">ביטול</button>
                <button onClick={() => recordReceipt(receiptModal)} disabled={!canSave}
                  className="flex-1 bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-600 transition disabled:opacity-40 flex items-center justify-center gap-1">
                  <Check size={15} /> אישור קבלת ₪{amount.toLocaleString()}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showTenantMsg && selectedTenant && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-teal-800">שליחת הודעה לדייר</h3>
                <p className="text-sm text-gray-500">{selectedTenant.name} · דירה {selectedTenant.apt}</p>
              </div>
              <button onClick={() => setShowTenantMsg(false)}><X size={20} className="text-gray-500 hover:text-gray-700" /></button>
            </div>

            {settings.templates.length > 0 && (
              <div className="mb-3">
                <label className="text-[10px] text-gray-400 block mb-1">טען תבנית</label>
                <select defaultValue="" onChange={e => {
                  const tpl = settings.templates.find(t => String(t.id) === e.target.value);
                  if (!tpl) return;
                  setTenantMsgText(renderTemplateForTenant(tpl, selectedTenant));
                }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400">
                  <option value="">-- בחר תבנית --</option>
                  {settings.templates.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                </select>
              </div>
            )}

            <div className="mb-3">
              <label className="text-[10px] text-gray-400 block mb-1">נושא</label>
              <input value={tenantMsgSubject} onChange={e => setTenantMsgSubject(e.target.value)} placeholder="נושא ההודעה"
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400" dir="rtl" />
            </div>
            <textarea value={tenantMsgText} onChange={e => setTenantMsgText(e.target.value)}
              placeholder="כתוב את ההודעה כאן..."
              className="w-full border rounded-xl p-3 text-sm h-40 resize-none focus:outline-none focus:ring-1 focus:ring-teal-400" dir="rtl" />
            {!selectedTenant?.email && (
              <p className="text-xs text-orange-500 mt-2">לדייר זה אין כתובת מייל — המייל ייפתח בלי נמען (אפשר להוסיף מייל בפרטי הדייר)</p>
            )}

            <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-3">
              <p className="text-sm font-medium text-gray-700">הוספת פירוט לגוף ההודעה</p>
              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="radio" name="msgStatementMode" checked={statementMode === 'full'} onChange={() => setStatementMode('full')} className="w-3.5 h-3.5 accent-sky-600" />
                  פירוט מלא
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="radio" name="msgStatementMode" checked={statementMode === 'debtsOnly'} onChange={() => setStatementMode('debtsOnly')} className="w-3.5 h-3.5 accent-sky-600" />
                  חובות בלבד
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="radio" name="msgStatementMode" checked={statementMode === 'byOccupant'} onChange={() => setStatementMode('byOccupant')} className="w-3.5 h-3.5 accent-sky-600" />
                  חובות לפי שוכר
                </label>
              </div>
              {(() => {
                const availableYears = [...new Set(selectedTenant.payments.map(p => p.hebrewYear))]
                  .sort((a, b) => (HEBREW_YEAR_TO_NUMERIC[b] || 0) - (HEBREW_YEAR_TO_NUMERIC[a] || 0));
                const ownedApts = getOwnedApartments(selectedTenant.id);
                const occupantNames = getOccupantNames(selectedTenant);
                return (
                  <>
                    {occupantNames.length > 1 && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 whitespace-nowrap">שוכר:</label>
                        <select value={statementOccupant} onChange={e => setStatementOccupant(e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-400 flex-1">
                          <option value="">כל השוכרים</option>
                          {occupantNames.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {availableYears.map(year => (
                        <label key={year} className="flex items-center gap-1 text-xs bg-white border rounded-full px-2 py-1 cursor-pointer">
                          <input type="checkbox" checked={statementYears.has(year)} onChange={() => setStatementYears(prev => {
                            const next = new Set(prev);
                            if (next.has(year)) next.delete(year); else next.add(year);
                            return next;
                          })} className="w-3 h-3 accent-sky-600" />
                          {year}
                        </label>
                      ))}
                    </div>
                    {ownedApts.length > 0 && (
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={includeOwnedApts} onChange={() => setIncludeOwnedApts(v => !v)} className="w-3.5 h-3.5 accent-amber-600" />
                        כלול דירות מושכרות בבעלות ({ownedApts.length})
                      </label>
                    )}
                    <button type="button" disabled={statementYears.size === 0}
                      onClick={() => {
                        let text = buildTenantStatementText(selectedTenant, statementMode, statementYears, statementOccupant);
                        if (includeOwnedApts) {
                          const ownedText = buildOwnedAptsDebtsText(selectedTenant);
                          if (ownedText) text += '\n\n' + ownedText;
                        }
                        setTenantMsgText(t => (t.trim() ? t.trim() + '\n\n' : '') + text);
                      }}
                      className="text-xs border border-sky-200 rounded-full px-3 py-1.5 text-sky-700 hover:bg-sky-50 transition flex items-center gap-1 disabled:opacity-40">
                      <FileText size={12} /> הוסף להודעה
                    </button>
                    {statementYears.size === 0 && <p className="text-xs text-orange-500">בחרי לפחות שנה אחת</p>}
                  </>
                );
              })()}
            </div>

            {(selectedTenant.phone || selectedTenant.email) && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 space-y-1">
                {selectedTenant.phone && <p>טלפון: <span className="font-medium text-gray-700 select-all">{selectedTenant.phone}</span></p>}
                {selectedTenant.email && <p>מייל: <span className="font-medium text-gray-700 select-all">{selectedTenant.email}</span></p>}
              </div>
            )}

            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowTenantMsg(false)} className="border px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition">ביטול</button>
              <button disabled={!tenantMsgText.trim()}
                onClick={() => {
                  openMail({ to: selectedTenant.email || '', subject: tenantMsgSubject || settings.buildingName || 'ועד הבית', body: tenantMsgText });
                  setShowTenantMsg(false); setTenantMsgText(''); setTenantMsgSubject('');
                }}
                className="bg-sky-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-sky-700 transition flex items-center gap-1 disabled:opacity-50">
                <Mail size={14} /> פתח ב-Gmail
              </button>
            </div>
          </div>
        </div>
      )}

      {showStatementModal && (() => {
        const tenant = showStatementModal;
        const occupantNames = getOccupantNames(tenant);
        const effTenant = filterTenantByOccupant(tenant, statementOccupant);
        const availableYears = [...new Set(effTenant.payments.map(p => p.hebrewYear))]
          .sort((a, b) => (HEBREW_YEAR_TO_NUMERIC[b] || 0) - (HEBREW_YEAR_TO_NUMERIC[a] || 0));
        const ownedApts = getOwnedApartments(tenant.id);
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowStatementModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs max-h-[90vh] overflow-y-auto" dir="rtl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-800 mb-1">הפקת מסמך</h3>
              <p className="text-sm text-gray-500 mb-4">משפחת {tenant.name}</p>

              <div className="space-y-1 mb-4">
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 py-2 px-2 rounded-lg border border-gray-200">
                  <input type="radio" name="statementMode" checked={statementMode === 'full'}
                    onChange={() => setStatementMode('full')}
                    className="w-4 h-4 accent-indigo-600" />
                  <span className="text-sm font-medium text-gray-700">פירוט מלא — תשלומים וחובות</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 py-2 px-2 rounded-lg border border-gray-200">
                  <input type="radio" name="statementMode" checked={statementMode === 'debtsOnly'}
                    onChange={() => setStatementMode('debtsOnly')}
                    className="w-4 h-4 accent-indigo-600" />
                  <span className="text-sm font-medium text-gray-700">חובות בלבד</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 py-2 px-2 rounded-lg border border-gray-200">
                  <input type="radio" name="statementMode" checked={statementMode === 'byOccupant'}
                    onChange={() => setStatementMode('byOccupant')}
                    className="w-4 h-4 accent-indigo-600" />
                  <span className="text-sm font-medium text-gray-700">חובות בלבד — מפוצל לפי שוכר</span>
                </label>
              </div>

              {occupantNames.length > 1 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">שוכר</p>
                  <select value={statementOccupant} onChange={e => setStatementOccupant(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400">
                    <option value="">כל השוכרים (מפוצל לפי שנים כרגיל)</option>
                    {occupantNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              )}

              <p className="text-sm text-gray-500 mb-2">בחרי שנים לכלול במסמך</p>
              <div className="space-y-1 mb-3 max-h-64 overflow-y-auto">
                {availableYears.map(year => {
                  const hasDebt = effTenant.payments.some(p => p.hebrewYear === year && p.status === 'חוב' && (p.amount - (p.paidAmount || 0)) > 0);
                  return (
                    <label key={year} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 py-2 px-2 rounded-lg">
                      <input type="checkbox"
                        checked={statementYears.has(year)}
                        onChange={() => setStatementYears(prev => {
                          const next = new Set(prev);
                          if (next.has(year)) next.delete(year); else next.add(year);
                          return next;
                        })}
                        className="w-4 h-4 accent-indigo-600" />
                      <span className="text-sm font-medium text-gray-700">{year}</span>
                      {hasDebt && <span className="text-xs text-red-400 mr-auto font-medium">יש חוב</span>}
                    </label>
                  );
                })}
              </div>

              {ownedApts.length > 0 && (
                <label className="flex items-center gap-3 cursor-pointer hover:bg-amber-50 py-2 px-2 rounded-lg border border-amber-200 bg-amber-50/50 mb-3">
                  <input type="checkbox" checked={includeOwnedApts} onChange={() => setIncludeOwnedApts(v => !v)}
                    className="w-4 h-4 accent-amber-600" />
                  <span className="text-sm font-medium text-amber-800">כלול דירות מושכרות בבעלות ({ownedApts.length})</span>
                </label>
              )}
              <div className="flex items-center gap-3 text-xs mb-4 px-1">
                <button onClick={() => setStatementYears(new Set(availableYears))} className="text-indigo-600 hover:text-indigo-800">בחר הכל</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => setStatementYears(new Set())} className="text-gray-400 hover:text-gray-600">נקה</button>
              </div>
              <div className="flex gap-2 border-t pt-4">
                <button onClick={() => setShowStatementModal(null)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">ביטול</button>
                <button onClick={() => {
                  if (statementYears.size === 0) return;
                  printTenantStatement(tenant, statementYears, statementMode, includeOwnedApts, statementOccupant);
                  setShowStatementModal(null);
                }} disabled={statementYears.size === 0}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-40 flex items-center justify-center gap-1">
                  <FileText size={14} /> הפק מסמך
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showEmailModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-teal-800">שליחת הודעה לכל הדיירים</h3>
              <button onClick={() => setShowEmailModal(false)}><X size={20} className="text-gray-500 hover:text-gray-700" /></button>
            </div>
            <div className="mb-3">
              <label className="text-[10px] text-gray-400 block mb-1">נושא</label>
              <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="נושא ההודעה"
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400" dir="rtl" />
            </div>
            <textarea value={emailText} onChange={e => setEmailText(e.target.value)} placeholder="כתוב את ההודעה כאן..."
              className="w-full border rounded-xl p-3 text-sm h-32 resize-none focus:outline-none focus:ring-1 focus:ring-teal-400" dir="rtl" />
            <p className="text-xs text-gray-400 mt-2">
              ייפתח מייל אחד ב-Gmail עם {tenants.filter(t => t.email && !t.ownerId).length} דיירים בהעתק מוסתר (BCC) — אף דייר לא יראה את הכתובות של האחרים. שוכרים לא נכללים (הפנייה היא לבעל הדירה)
            </p>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowEmailModal(false)} className="border px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition">ביטול</button>
              <button disabled={!emailText.trim() || tenants.filter(t => t.email && !t.ownerId).length === 0} onClick={() => {
                const bcc = [...new Set(tenants.filter(t => t.email && !t.ownerId).map(t => t.email.trim()))].join(',');
                openMail({ bcc, subject: emailSubject || settings.buildingName || 'ועד הבית', body: emailText });
                setShowEmailModal(false); setEmailText(''); setEmailSubject('');
              }} className="bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-sky-600 transition disabled:opacity-50 flex items-center gap-1">
                <Mail size={14} /> פתח ב-Gmail
              </button>
            </div>
          </div>
        </div>
      )}

      {showRemindersModal && (() => {
        const tpl = getReminderTemplate();
        // דירות מושכרות לא מקבלות תזכורת בנפרד - החוב שלהן כלול בתזכורת לבעל הדירה
        const debtors = [...tenants].filter(t => !t.ownerId && payerTotal(t, tenants) > 0).sort((a, b) => Number(a.apt) - Number(b.apt));
        const withEmail = debtors.filter(t => t.email);
        const noEmail = debtors.filter(t => !t.email);
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRemindersModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] flex flex-col" dir="rtl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Bell size={18} className="text-teal-600" /> תזכורת לחייבים</h3>
                <button onClick={() => setShowRemindersModal(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
              </div>
              <p className="text-xs text-gray-500 mb-4">כל לחיצה פותחת מייל אישי מוכן (תבנית "{tpl?.name}") — בודקים ולוחצים "שלח" ב-Gmail</p>
              <div className="overflow-y-auto flex-1 divide-y divide-gray-100 mb-3">
                {withEmail.length === 0 && <p className="text-sm text-gray-400 text-center py-6">אין דיירים בחוב עם כתובת מייל</p>}
                {withEmail.map(t => {
                  const opened = openedReminderIds.has(t.id);
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-2.5">
                      <span className="w-8 h-8 rounded-full bg-teal-50 text-teal-800 font-bold text-sm flex items-center justify-center shrink-0">{t.apt}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{t.name}</div>
                        <div className="text-xs text-red-500 font-semibold">₪{payerTotal(t, tenants).toLocaleString()} חוב{getOwnedApartments(t.id).length > 0 ? ' (כולל הדירות שלו)' : ''}</div>
                      </div>
                      <button onClick={() => {
                        openMail({ to: t.email, subject: tpl.name, body: renderTemplateForTenant(tpl, t) });
                        setOpenedReminderIds(prev => new Set(prev).add(t.id));
                      }} className={`text-xs px-3 py-1.5 rounded-full font-bold border transition flex items-center gap-1 whitespace-nowrap ${opened ? 'text-green-700 border-green-200 bg-green-50' : 'text-white bg-sky-600 border-sky-600 hover:bg-sky-700'}`}>
                        {opened ? <><Check size={12} /> נפתח</> : <><Mail size={12} /> פתח ב-Gmail</>}
                      </button>
                    </div>
                  );
                })}
              </div>
              {noEmail.length > 0 && (
                <p className="text-xs text-orange-500 border-t pt-3">בחוב בלי כתובת מייל: {noEmail.map(t => `${t.name} (דירה ${t.apt})`).join(', ')}</p>
              )}
            </div>
          </div>
        );
      })()}

      {selectExpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectExpModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm max-h-[80vh] flex flex-col" dir="rtl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-1">שלוף לדירות נבחרות</h3>
            <p className="text-sm text-gray-500 mb-4">{selectExpModal.description || 'הוצאה חריגה'} — ₪{(selectExpModal.perTenantAmount||0).toLocaleString()} לדייר</p>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100 mb-4">
              {(() => {
                const available = (tenants||[]).filter(t => !isExpenseAppliedToTenant(t, selectExpModal.expId));
                const allSelected = available.length > 0 && available.every(t => selectedTenantIds.has(t.id));
                return (
                  <>
                    <label className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-gray-50 font-semibold text-gray-700">
                      <input type="checkbox"
                        checked={allSelected}
                        onChange={() => {
                          if (allSelected) {
                            setSelectedTenantIds(new Set());
                          } else {
                            setSelectedTenantIds(new Set(available.map(t => t.id)));
                          }
                        }}
                        className="w-4 h-4 accent-purple-500" />
                      <span className="text-sm">סמן הכל</span>
                    </label>
                    {(tenants||[]).map(t => {
                      const alreadyApplied = isExpenseAppliedToTenant(t, selectExpModal.expId);
                      return (
                        <label key={t.id} className={`flex items-center gap-3 py-2.5 ${alreadyApplied ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}>
                          <input type="checkbox"
                            checked={selectedTenantIds.has(t.id) || alreadyApplied}
                            disabled={alreadyApplied}
                            onChange={() => {
                              if (alreadyApplied) return;
                              setSelectedTenantIds(prev => {
                                const next = new Set(prev);
                                if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
                                return next;
                              });
                            }}
                            className="w-4 h-4 accent-purple-500" />
                          <span className="text-sm font-medium text-gray-700">דירה {t.apt}</span>
                          <span className="text-sm text-gray-500">{t.name}</span>
                          {alreadyApplied && <span className="text-xs text-gray-400 mr-auto">שולף</span>}
                        </label>
                      );
                    })}
                  </>
                );
              })()}
            </div>
            <div className="flex gap-2 justify-between items-center border-t pt-4">
              <button onClick={() => setSelectExpModal(null)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">ביטול</button>
              <button onClick={() => {
                if (selectedTenantIds.size === 0) return;
                const exp = (settings.extraordinaryExpenses || []).find(e => e.id === selectExpModal.expId);
                if (!exp) return;
                setTenants(prev => {
                  const additions = new Map();
                  prev.forEach((t, i) => {
                    if (!selectedTenantIds.has(t.id) || isExpenseAppliedToTenant(t, exp.id)) return;
                    const { hostId, charge } = buildExpenseChargeFor(exp, t, Date.now()+i);
                    if (!additions.has(hostId)) additions.set(hostId, []);
                    additions.get(hostId).push(charge);
                  });
                  return prev.map(t => additions.has(t.id) ? { ...t, charges: [...(t.charges||[]), ...additions.get(t.id)] } : t);
                });
                setSelectExpModal(null);
                setSelectedTenantIds(new Set());
              }} className="bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-600 transition">
                שלוף
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
