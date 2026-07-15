import { useState, useEffect, useRef } from 'react';
import { Home, ReceiptText, Building, ChevronRight, Mail, Bell, Plus, Pencil, Trash2, X, Check, Settings, Upload, ImageOff, MessageSquare, Banknote, LogOut, LayoutDashboard, Wallet, TrendingDown, Calendar, FileText, Zap, CreditCard, RefreshCw, ArrowRightLeft, FileDown, Users, ChevronDown } from 'lucide-react';
import emailjs from '@emailjs/browser';
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

function isFutureMonth(month, year) {
  const { month: curMonth, year: curYear } = getCurrentHebrewDate();
  const yearNum = HEBREW_YEAR_TO_NUMERIC[year];
  const curYearNum = HEBREW_YEAR_TO_NUMERIC[curYear];
  if (yearNum !== curYearNum) return yearNum > curYearNum;
  return TWELVE_MONTHS.indexOf(month) > TWELVE_MONTHS.indexOf(curMonth);
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

function calcDebt(tenant) {
  const fromPayments = tenant.payments.filter(p => p.status === 'חוב').reduce((sum, p) => sum + p.amount - (p.paidAmount || 0), 0);
  const fromCharges = (tenant.charges || []).filter(c => c.status === 'חוב').reduce((sum, c) => sum + c.amount, 0);
  return fromPayments + fromCharges;
}

function calcCredit(tenant) {
  return tenant.payments.filter(p => p.status === 'זכות').reduce((sum, p) => sum + (p.paidAmount || 0), 0);
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
  const am = TWELVE_MONTHS.indexOf(a.hebrewMonth);
  const bm = TWELVE_MONTHS.indexOf(b.hebrewMonth);
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
    const idx = TWELVE_MONTHS.indexOf(navMonth);
    if (idx === 0) { setNavMonth(TWELVE_MONTHS[11]); setNavYear(HEBREW_YEARS[Math.max(0, HEBREW_YEARS.indexOf(navYear) - 1)]); }
    else setNavMonth(TWELVE_MONTHS[idx - 1]);
  }
  function nextMonth() {
    const idx = TWELVE_MONTHS.indexOf(navMonth);
    if (idx === 11) { setNavMonth(TWELVE_MONTHS[0]); setNavYear(HEBREW_YEARS[Math.min(HEBREW_YEARS.length - 1, HEBREW_YEARS.indexOf(navYear) + 1)]); }
    else setNavMonth(TWELVE_MONTHS[idx + 1]);
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
              {TWELVE_MONTHS.map(m => (
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
  const [selectExpModal, setSelectExpModal] = useState(null);
  const [selectedTenantIds, setSelectedTenantIds] = useState(new Set());
  const [expandedPaidList, setExpandedPaidList] = useState(null);
  const [showStatementModal, setShowStatementModal] = useState(null);
  const [statementYears, setStatementYears] = useState(new Set());
  const [statementMode, setStatementMode] = useState('full');
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
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [tenantMsgSubject, setTenantMsgSubject] = useState('');

  useEffect(() => {
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

  useEffect(() => {
    if (!session) { dataLoadedForUser.current = null; return; }
    if (dataLoadedForUser.current === session.user.id) return;
    dataLoadedForUser.current = session.user.id;

    const cacheKeyT = `vaad_tenants_${session.user.id}`;
    const cacheKeyS = `vaad_settings_${session.user.id}`;
    let hasCache = false;
    try {
      const ct = localStorage.getItem(cacheKeyT);
      const cs = localStorage.getItem(cacheKeyS);
      if (ct && cs) {
        skipTenantsSaveRef.current = true;
        skipSettingsSaveRef.current = true;
        setTenants(JSON.parse(ct)); setSettings(JSON.parse(cs)); hasCache = true;
      }
    } catch (e) {}
    if (!hasCache) setDataLoading(true);

    const { month, year } = getCurrentHebrewDate();
    const autoKey = `${month}-${year}`;
    const currentMonthIdx = TWELVE_MONTHS.indexOf(month);
    const monthsToFill = TWELVE_MONTHS.slice(0, currentMonthIdx + 1);

    Promise.all([
      supabase.from('app_tenants').select('data, last_auto_month').eq('user_id', session.user.id).maybeSingle(),
      supabase.from('app_settings').select('data').eq('user_id', session.user.id).maybeSingle(),
    ]).then(([tenantsRes, settingsRes]) => {
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
            newPayments.push({ id: baseId + tIdx * 100 + mIdx, hebrewMonth: m, hebrewYear: year, status: 'חוב', amount: tenant.monthlyRent, paidAmount: 0 });
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

      if (anyAdded || !tenantsRes.data) {
        supabase.from('app_tenants')
          .upsert({ user_id: session.user.id, data: loadedTenants, last_auto_month: autoKey }, { onConflict: 'user_id' })
          .then(({ error }) => { if (error) setDbError(`שגיאת שמירה: ${error.message} (${error.code})`); });
      }
      skipTenantsSaveRef.current = true;
      setTenants(loadedTenants);
      try { localStorage.setItem(cacheKeyT, JSON.stringify(loadedTenants)); } catch (e) {}

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
      skipSettingsSaveRef.current = true;
      setSettings(loadedSettings);
      try { localStorage.setItem(cacheKeyS, JSON.stringify(loadedSettings)); } catch (e) {}
      setDataLoading(false);
    });
  }, [session]);

  useEffect(() => {
    if (!session || !tenants) return;
    if (skipTenantsSaveRef.current) { skipTenantsSaveRef.current = false; return; }
    const t = setTimeout(async () => {
      pendingWritesRef.current++;
      try {
        const { error } = await supabase.from('app_tenants')
          .update({ data: tenants })
          .eq('user_id', session.user.id);
        if (error) setDbError(`שגיאת שמירת דיירים: ${error.message} (${error.code})`);
        else try { localStorage.setItem(`vaad_tenants_${session.user.id}`, JSON.stringify(tenants)); } catch (e) {}
      } finally { pendingWritesRef.current--; }
    }, 800);
    return () => clearTimeout(t);
  }, [tenants, session]);

  useEffect(() => {
    if (!session || !settings) return;
    if (skipSettingsSaveRef.current) { skipSettingsSaveRef.current = false; return; }
    const t = setTimeout(async () => {
      pendingWritesRef.current++;
      try {
        const { error } = await supabase.from('app_settings')
          .update({ data: settings })
          .eq('user_id', session.user.id);
        if (error) setDbError(`שגיאת שמירת הגדרות: ${error.message} (${error.code})`);
        else try { localStorage.setItem(`vaad_settings_${session.user.id}`, JSON.stringify(settings)); } catch (e) {}
      } finally { pendingWritesRef.current--; }
    }, 800);
    return () => clearTimeout(t);
  }, [settings, session]);


  async function handleLogin(e) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) setLoginError('אימייל או סיסמה שגויים');
    setLoginLoading(false);
  }

  async function handleLogout() {
    if (session) {
      try {
        localStorage.removeItem(`vaad_tenants_${session.user.id}`);
        localStorage.removeItem(`vaad_settings_${session.user.id}`);
      } catch (e) {}
    }
    await supabase.auth.signOut();
  }

  async function sendEmail(toEmail, subject, message) {
    const es = settings.emailSettings || {};
    if (!es.serviceId || !es.templateId || !es.publicKey) {
      throw new Error('חסרות הגדרות מייל — אנא מלאי פרטי EmailJS בהגדרות המערכת.');
    }
    await emailjs.send(es.serviceId, es.templateId, {
      to_email: toEmail,
      subject: subject || 'הודעה מועד הבית',
      message,
      from_name: es.senderName || 'ועד הבית',
      reply_to: es.senderEmail || '',
    }, es.publicKey);
    return true;
  }

  function getTenantStatementData(tenant, years) {
    const expenseYearMap = new Map((settings.extraordinaryExpenses || []).map(e => [e.id, e.hebrewYear]));

    const sortedYears = [...years].sort((a, b) => (HEBREW_YEAR_TO_NUMERIC[a] || 0) - (HEBREW_YEAR_TO_NUMERIC[b] || 0));

    const yearsData = sortedYears.map(year => {
      const yearPayments = tenant.payments
        .filter(p => p.hebrewYear === year)
        .sort((a, b) => TWELVE_MONTHS.indexOf(a.hebrewMonth) - TWELVE_MONTHS.indexOf(b.hebrewMonth));
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

    const totalPaid = yearsData.reduce((s, y) => s + y.yearPaidTotal, 0);
    const totalDebtAmt = yearsData.reduce((s, y) => s + y.yearDebtTotal, 0);

    return { yearsData, totalPaid, totalDebtAmt };
  }

  function buildTenantStatementText(tenant, mode = 'full') {
    const debtsOnly = mode === 'debtsOnly';
    const years = new Set(tenant.payments.map(p => p.hebrewYear));
    const { yearsData, totalPaid, totalDebtAmt } = getTenantStatementData(tenant, years);

    const lines = [debtsOnly ? 'פירוט חובות:' : 'פירוט תשלומים וחובות:', ''];

    yearsData.forEach(({ year, paidPayments, debtPayments, debtCharges, yearPaidTotal, yearDebtTotal }) => {
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
        debtPayments.forEach(p => lines.push(`    ועד בית — ${p.hebrewMonth}: ₪${(p.amount - (p.paidAmount || 0)).toLocaleString()}${p.note ? ' — ' + p.note : ''}`));
        debtCharges.forEach(c => lines.push(`    ${c.description || 'הוצאה חריגה'}: ₪${c.amount.toLocaleString()}${c.note ? ' — ' + c.note : ''}`));
        lines.push(`  סה"כ חוב לשנת ${year}: ₪${yearDebtTotal.toLocaleString()}`);
      } else {
        lines.push('  ✓ אין חובות פתוחים');
      }
      lines.push('');
    });

    if (!debtsOnly) lines.push(`סה"כ שולם (כולל): ₪${totalPaid.toLocaleString()}`);
    lines.push(`יתרת חוב לתשלום: ₪${totalDebtAmt.toLocaleString()}`);

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

  function renderYearsBlocksHtml(yearsData, debtsOnly) {
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
          <thead><tr><th>תיאור</th><th>סכום לתשלום</th><th>הערות</th></tr></thead>
          <tbody>
            ${debtPayments.map(p => `<tr>
              <td>ועד בית — ${p.hebrewMonth}</td>
              <td class="debt">₪${(p.amount - (p.paidAmount || 0)).toLocaleString()}</td>
              <td>${p.note || ''}</td>
            </tr>`).join('')}
            ${debtCharges.map(c => `<tr>
              <td>${c.description || 'הוצאה חריגה'}</td>
              <td class="debt">₪${c.amount.toLocaleString()}</td>
              <td>${c.note || ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      : `<p class="empty" style="color:#16a34a">✓ אין חובות פתוחים</p>`}
    ${debtPayments.length > 0 || debtCharges.length > 0
      ? `<div class="year-subtotal">סה"כ חוב לשנת ${year}: <span class="debt">₪${yearDebtTotal.toLocaleString()}</span></div>`
      : ''}
  </div>
  `).join('');
  }

  function printTenantStatement(tenant, years, mode = 'full', includeOwned = false) {
    const debtsOnly = mode === 'debtsOnly';
    const { month: curMonth, year: curYear } = getCurrentHebrewDate();
    const logoSrc = settings.logo;

    const { yearsData, totalPaid, totalDebtAmt } = getTenantStatementData(tenant, years);
    const ownedApts = includeOwned ? getOwnedApartments(tenant.id) : [];
    const ownedSections = ownedApts.map(apt => {
      const aptYears = new Set(apt.payments.map(p => p.hebrewYear));
      const { yearsData: aptYearsData, totalPaid: aptPaid, totalDebtAmt: aptDebt } = getTenantStatementData(apt, aptYears);
      return { apt, aptYearsData, aptPaid, aptDebt };
    });

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>${debtsOnly ? 'פירוט חובות' : 'פירוט תשלומים'} — ${tenant.name}</title>
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
    .year-title { font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #111; background: #e6f0ef; border-right: 4px solid #0d9488; border-radius: 6px; padding: 8px 14px; margin-bottom: 6px; }
    .year-subtotal { font-size: 12px; color: #666; margin: 4px 2px 0; }
    .section-title { font-size: 15px; font-weight: bold; color: #0f766e; margin: 16px 0 10px; padding-bottom: 5px; border-bottom: 1px solid #ccfbf1; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f0fdfa; color: #0f766e; padding: 9px 14px; text-align: right; font-weight: bold; border-bottom: 2px solid #0d9488; }
    td { padding: 8px 14px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #fafafa; }
    .paid { color: #16a34a; font-weight: 600; }
    .debt { color: #dc2626; font-weight: 600; }
    .empty { color: #999; font-size: 13px; padding: 10px 0; }
    .summary { background: #f0fdfa; border: 1px solid #0d9488; border-radius: 10px; padding: 18px 20px; margin-top: 28px; }
    .summary-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; color: #444; }
    .summary-total { font-size: 17px; font-weight: bold; border-top: 1px solid #0d9488; margin-top: 10px; padding-top: 10px; color: ${totalDebtAmt > 0 ? '#dc2626' : '#16a34a'}; }
    .footer { margin-top: 40px; font-size: 11px; color: #aaa; text-align: center; }
    @media print { body { padding: 20px 30px; } .year-block { break-inside: avoid; } }
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
      <h1>משפחת ${tenant.name} היקרה,</h1>
      <p class="apt-label">דירה ${tenant.apt}</p>
      <p>להלן פירוט ${debtsOnly ? 'החובות' : 'התשלומים'} שלכם נכון לחודש ${curMonth} ${curYear}</p>
    </div>
    <div class="header-info">
      ${logoSrc
        ? `<img src="${logoSrc}" class="header-logo" />`
        : `<div>${settings.buildingName || ''}</div><div>${settings.address || ''}</div>`}
    </div>
  </div>

  ${renderYearsBlocksHtml(yearsData, debtsOnly)}

  <div class="summary">
    ${debtsOnly ? '' : `<div class="summary-row"><span>סה"כ שולם</span><span class="paid">₪${totalPaid.toLocaleString()}</span></div>`}
    <div class="summary-row summary-total"><span>יתרת חוב לתשלום</span><span>₪${totalDebtAmt.toLocaleString()}</span></div>
  </div>

  ${ownedSections.length > 0 ? `
  <div style="margin-top: 44px; padding-top: 26px; border-top: 3px solid #d97706;">
    <h2 style="font-size: 18px; font-weight: bold; color: #b45309; margin-bottom: 4px;">דירות מושכרות בבעלותך</h2>
    <p style="font-size: 12px; color: #92400e; margin-bottom: 18px;">חובת התשלום עבור הדירות הבאות חלה עלייך כבעל/ת הדירה</p>
    ${ownedSections.map(({ apt, aptYearsData, aptPaid, aptDebt }) => `
    <div style="margin-bottom: 30px;">
      <div style="font-size: 15px; font-weight: bold; color: #92400e; background: #fffbeb; border-right: 4px solid #d97706; border-radius: 6px; padding: 8px 14px; margin-bottom: 8px;">דירה ${apt.apt} — ${apt.name}</div>
      ${renderYearsBlocksHtml(aptYearsData, debtsOnly)}
      <div class="summary" style="margin-top: 12px;">
        ${debtsOnly ? '' : `<div class="summary-row"><span>סה"כ שולם</span><span class="paid">₪${aptPaid.toLocaleString()}</span></div>`}
        <div class="summary-row summary-total" style="color: ${aptDebt > 0 ? '#dc2626' : '#16a34a'};"><span>יתרת חוב לתשלום</span><span>₪${aptDebt.toLocaleString()}</span></div>
      </div>
    </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="footer">מסמך זה הופק ב-${curMonth} ${curYear} | ${settings.buildingName || ''}</div>
</body>
</html>`;

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
      const debt = calcDebt(t);
      const credit = calcCredit(t);
      const statusHtml = debt > 0
        ? `<span style="color:#dc2626;font-weight:bold">₪${debt.toLocaleString()} חוב</span>`
        : credit > 0
        ? `<span style="color:#16a34a;font-weight:bold">₪${credit.toLocaleString()} זכות</span>`
        : `<span style="color:#0d9488;font-weight:bold">מעודכן ✓</span>`;
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

    const totalDebtSum = sorted.reduce((s, t) => s + calcDebt(t), 0);
    const totalCreditSum = sorted.reduce((s, t) => s + calcCredit(t), 0);

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

    <div class="footer">${settings.buildingName || ''} | הופק ב-${dateStr}</div>
    <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 600); }<\/script>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
  }

  function openSettings() {
    setSettingsData({ ...settings });
    setView('settings');
    setSettingsSaved(false);
  }

  async function saveSettings() {
    skipSettingsSaveRef.current = true;
    setSettings(settingsData);
    if (session) {
      pendingWritesRef.current++;
      setIsSavingSettings(true);
      try {
        const { error } = await supabase.from('app_settings').update({ data: settingsData }).eq('user_id', session.user.id);
        if (error) { setDbError(`שגיאת שמירת הגדרות: ${error.message} (${error.code})`); return; }
        try { localStorage.setItem(`vaad_settings_${session.user.id}`, JSON.stringify(settingsData)); } catch (e) {}
      } finally { pendingWritesRef.current--; setIsSavingSettings(false); }
    }
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }

  function applyFeeToAllTenants(amount, fromMonth, fromYear) {
    if (!confirm(`לעדכן את כל הדיירים לתעריף ₪${amount} החל מ-${fromMonth}?`)) return;
    const yearRank = y => HEBREW_YEARS.indexOf(y);
    const monthRank = m => TWELVE_MONTHS.indexOf(m);
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

  function openTenant(id) { setSelectedId(id); setView('tenant'); setEditMode(false); }
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
      .replace(/{סכום}/g, calcDebt(tenant).toLocaleString())
      .replace(/{תאריך}/g, new Date().toLocaleDateString('he-IL'))
      .replace(/{מנהל}/g, mgr.name || '')
      .replace(/{טלפון}/g, mgr.phone || '')
      .replace(/{כתובת}/g, settings.address || '');
  }

  async function sendPaymentReminders() {
    const tpl = settings.templates.find(t => t.name === 'תזכורת תשלום') || settings.templates[0];
    if (!tpl) { alert('לא הוגדרה תבנית תזכורת בהגדרות המערכת'); return; }
    const targets = tenants.filter(t => calcDebt(t) > 0 && t.email);
    if (targets.length === 0) { alert('אין דיירים עם חוב פתוח וכתובת מייל'); return; }
    if (!confirm(`לשלוח תזכורת תשלום ל-${targets.length} דיירים עם חוב פתוח?`)) return;
    setIsSendingReminders(true);
    let ok = 0, fail = 0;
    for (const t of targets) {
      try {
        await sendEmail(t.email, tpl.name, renderTemplateForTenant(tpl, t));
        ok++;
      } catch { fail++; }
    }
    setIsSendingReminders(false);
    alert(fail === 0 ? `נשלחו תזכורות ל-${ok} דיירים בהצלחה!` : `נשלח בהצלחה ל-${ok} דיירים, נכשל עבור ${fail}`);
  }

  function getOwnerTenant(t) {
    if (!t?.ownerId) return null;
    return tenants.find(x => x.id === t.ownerId) || null;
  }

  function getOwnedApartments(ownerId) {
    if (!ownerId) return [];
    return tenants.filter(t => t.ownerId === ownerId);
  }

  function getFeeForMonth(month, year) {
    const yearRank = y => HEBREW_YEARS.indexOf(y);
    const monthRank = m => TWELVE_MONTHS.indexOf(m);
    const applicable = [...(settings.feeHistory || [])]
      .filter(f => {
        if (yearRank(year) > yearRank(f.fromYear)) return true;
        if (yearRank(year) === yearRank(f.fromYear) && monthRank(month) >= monthRank(f.fromMonth)) return true;
        return false;
      })
      .sort((a, b) => (yearRank(b.fromYear) * 100 + monthRank(b.fromMonth)) - (yearRank(a.fromYear) * 100 + monthRank(a.fromMonth)));
    return applicable.length > 0 ? applicable[0].amount : (settings.feeHistory?.[0]?.amount || 40);
  }

  function addPaymentDirect(month, year) {
    const tenant = tenants.find(t => t.id === selectedId);
    const baseAmount = getFeeForMonth(month, year);
    const amount = Math.round(baseAmount * (Number(tenant?.feePercent || 100) / 100));
    const isFuture = isFutureMonth(month, year);
    const status = isFuture ? 'זכות' : 'חוב';
    const newP = { id: Date.now(), hebrewMonth: month, hebrewYear: year, status, amount, paidAmount: isFuture ? amount : 0 };
    setTenants(prev => prev.map(t => t.id === selectedId ? { ...t, payments: [...t.payments, newP] } : t));
  }

  function addPaymentRow() {
    const nextId = Math.max(0, ...editData.payments.map(p => p.id)) + 1;
    setEditData(d => ({ ...d, payments: [...d.payments, { id: nextId, hebrewMonth: 'תשרי', hebrewYear: CURRENT_HEBREW_YEAR, status: 'חוב', amount: d.monthlyRent }] }));
  }

  function addNewTenant() {
    const id = Math.max(0, ...tenants.map(t => t.id)) + 1;
    setTenants(prev => [...prev, { ...newTenant, id, monthlyRent: Number(newTenant.monthlyRent) || 0, payments: [] }]);
    setNewTenant(EMPTY_TENANT);
    setView('list');
  }

  const totalDebt = tenants?.reduce((s, t) => s + calcDebt(t), 0) ?? 0;

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50">
      <p className="text-gray-400 text-sm">טוען...</p>
    </div>
  );

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-sky-100" dir="rtl">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-80">
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
    <div className="min-h-screen flex items-center justify-center bg-sky-50">
      <p className="text-gray-400 text-sm">טוען נתונים...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-sky-50 flex font-sans" dir="rtl">
      {dbError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <span>{dbError}</span>
          <button onClick={() => setDbError(null)} className="hover:opacity-70"><X size={16} /></button>
        </div>
      )}
      <div className="hidden md:flex w-28 shrink-0 flex-col items-center py-8 gap-6 text-white"
        style={{background: 'linear-gradient(160deg, #0f766e 0%, #0284c7 60%, #0c4a6e 100%)'}}>
        {settings.logo
          ? <img src={settings.logo} alt="לוגו" className="w-24 h-24 object-contain rounded-full bg-white/20 p-1 shadow" />
          : <Building size={38} className="text-cyan-100" />}
        <div className="flex flex-col items-center gap-2 mt-2 w-full px-2">
          <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1.5 w-full py-3 rounded-2xl transition-all ${view === 'dashboard' ? 'bg-white/20 text-white' : 'text-cyan-100 hover:text-white hover:bg-white/10'}`}>
            <LayoutDashboard size={26} /><span className="text-[11px] font-medium">דשבורד</span>
          </button>
          <button onClick={goList} className={`flex flex-col items-center gap-1.5 w-full py-3 rounded-2xl transition-all ${view === 'list' ? 'bg-white/20 text-white' : 'text-cyan-100 hover:text-white hover:bg-white/10'}`}>
            <Home size={26} /><span className="text-[11px] font-medium">דיירים</span>
          </button>
          <button onClick={() => setView('expenses')} className={`flex flex-col items-center gap-1.5 w-full py-3 rounded-2xl transition-all ${view === 'expenses' ? 'bg-white/20 text-white' : 'text-cyan-100 hover:text-white hover:bg-white/10'}`}>
            <ReceiptText size={26} /><span className="text-[11px] font-medium">הוצאות</span>
          </button>
          <button onClick={openSettings} className={`flex flex-col items-center gap-1.5 w-full py-3 rounded-2xl transition-all ${view === 'settings' ? 'bg-white/20 text-white' : 'text-cyan-100 hover:text-white hover:bg-white/10'}`}>
            <Settings size={26} /><span className="text-[11px] font-medium">הגדרות</span>
          </button>
        </div>
        <div className="mt-auto pb-2">
          <button onClick={handleLogout} title="יציאה"
            className="flex flex-col items-center gap-1 text-cyan-300 hover:text-white transition opacity-60 hover:opacity-100">
            <LogOut size={20} /><span className="text-[10px]">יציאה</span>
          </button>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around text-white shadow-lg"
        style={{background: 'linear-gradient(160deg, #0f766e 0%, #0284c7 60%, #0c4a6e 100%)', paddingBottom: 'env(safe-area-inset-bottom)'}}>
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-0.5 flex-1 py-2 transition-all ${view === 'dashboard' ? 'text-white bg-white/15' : 'text-cyan-100'}`}>
          <LayoutDashboard size={21} /><span className="text-[10px] font-medium">דשבורד</span>
        </button>
        <button onClick={goList} className={`flex flex-col items-center gap-0.5 flex-1 py-2 transition-all ${view === 'list' || view === 'tenant' || view === 'add' ? 'text-white bg-white/15' : 'text-cyan-100'}`}>
          <Home size={21} /><span className="text-[10px] font-medium">דיירים</span>
        </button>
        <button onClick={() => setView('expenses')} className={`flex flex-col items-center gap-0.5 flex-1 py-2 transition-all ${view === 'expenses' ? 'text-white bg-white/15' : 'text-cyan-100'}`}>
          <ReceiptText size={21} /><span className="text-[10px] font-medium">הוצאות</span>
        </button>
        <button onClick={openSettings} className={`flex flex-col items-center gap-0.5 flex-1 py-2 transition-all ${view === 'settings' ? 'text-white bg-white/15' : 'text-cyan-100'}`}>
          <Settings size={21} /><span className="text-[10px] font-medium">הגדרות</span>
        </button>
        <button onClick={handleLogout} className="flex flex-col items-center gap-0.5 flex-1 py-2 text-cyan-200">
          <LogOut size={21} /><span className="text-[10px]">יציאה</span>
        </button>
      </div>

      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-auto bg-sky-50">
        {view === 'dashboard' && (() => {
          const { month: curMonth, year: curYear } = getCurrentHebrewDate();

          const totalIncome = tenants.reduce((sum, t) =>
            sum + t.payments.reduce((s, p) =>
              s + (p.status === 'שולם' ? (p.paidAmount || p.amount) : (p.paidAmount || 0)), 0
            ) + (t.charges || []).filter(c => c.status === 'שולם').reduce((s, c) => s + c.amount, 0), 0
          );

          const totalExpensesAll = [
            ...(settings.electricityExpenses || []),
            ...(settings.cleaningExpenses || []),
            ...(settings.regularExpenses || []),
            ...(settings.extraordinaryExpenses || []),
          ].reduce((sum, e) => sum + (e.totalAmount || 0), 0);

          const balance = totalIncome - totalExpensesAll;
          const cashBaseline = settings.cashBaseline;
          const baselineBalance = cashBaseline
            ? cashBaseline.amount + (totalIncome - cashBaseline.incomeSnapshot) - (totalExpensesAll - cashBaseline.expenseSnapshot)
            : null;

          const expensesResetAt = settings.expensesResetAt || 0;
          const thisMonthElec = (settings.electricityExpenses || [])
            .filter(e => e.id > expensesResetAt)
            .reduce((sum, e) => sum + (e.totalAmount || 0), 0);
          const thisMonthOther = [
            ...(settings.cleaningExpenses || []),
            ...(settings.regularExpenses || []),
            ...(settings.extraordinaryExpenses || []),
          ].filter(e => e.id > expensesResetAt)
           .reduce((sum, e) => sum + (e.totalAmount || 0), 0);
          const thisMonthTotal = thisMonthElec + thisMonthOther;

          const unpaidThisMonth = tenants.filter(t => {
            const p = t.payments.find(p => p.hebrewMonth === curMonth && p.hebrewYear === curYear);
            return !p || p.status === 'חוב';
          }).length;
          const debtorsCount = tenants.filter(t => calcDebt(t) > 0).length;

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
          const openElec = (settings.electricityExpenses || []).reduce((s, e) => s + calcExpenseRemaining(e, 'electricityExpenses'), 0);
          const openCleaning = (settings.cleaningExpenses || []).reduce((s, e) => s + calcExpenseRemaining(e, 'cleaningExpenses'), 0);
          const openRegular = (settings.regularExpenses || []).reduce((s, e) => s + calcExpenseRemaining(e, 'regularExpenses'), 0);
          const openExtraordinary = (settings.extraordinaryExpenses || []).reduce((s, e) => s + calcExpenseRemaining(e, 'extraordinaryExpenses'), 0);
          const totalOpenExpenses = openElec + openCleaning + openRegular + openExtraordinary;

          return (
            <>
              <header className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">דשבורד</h2>
                <p className="text-sm text-gray-500">
                  {curMonth} {curYear}
                  <span className="mx-2 text-gray-300">|</span>
                  {GREG_MONTHS_HE[new Date().getMonth()]} {new Date().getFullYear()}
                </p>
              </header>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">

                {(() => {
                  const hasBaseline = baselineBalance != null;
                  const hasAnchor = hasBaseline || settings.cashOverride != null;
                  const displayBalance = hasBaseline ? baselineBalance : (settings.cashOverride != null ? settings.cashOverride : balance);
                  return (
                <div className={`bg-white rounded-2xl border shadow-sm p-5 ${displayBalance >= 0 ? 'border-teal-100' : 'border-red-100'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${displayBalance >= 0 ? 'bg-teal-100' : 'bg-red-100'}`}>
                        <Wallet size={18} className={displayBalance >= 0 ? 'text-teal-600' : 'text-red-500'} />
                      </div>
                      <span className="text-sm font-medium text-gray-500">כסף בקופה</span>
                    </div>
                    {!editingCash && (
                      <button onClick={() => { setCashInput(String(displayBalance)); setEditingCash(true); }}
                        className="text-gray-300 hover:text-teal-600 transition" title="קביעת יתרת פתיחה חדשה">
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                  {editingCash ? (
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <input type="number" value={cashInput} onChange={e => setCashInput(e.target.value)} autoFocus
                          className="w-32 border border-gray-200 rounded-lg px-2 py-1 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-400" />
                        <span className="text-lg font-bold text-gray-400">₪</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">הסכום הזה יהפוך ליתרת פתיחה — מכאן והלאה כל הכנסה/הוצאה חדשה תעודכן אוטומטית ביחס אליו.</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <button onClick={() => {
                          setSettings(s => ({ ...s, cashOverride: null, cashBaseline: { amount: Number(cashInput) || 0, incomeSnapshot: totalIncome, expenseSnapshot: totalExpensesAll, setAt: Date.now() } }));
                          setEditingCash(false);
                        }} className="text-teal-600 font-bold hover:underline">שמור כיתרת פתיחה</button>
                        <button onClick={() => setEditingCash(false)} className="text-gray-400 hover:underline">ביטול</button>
                        {hasAnchor && (
                          <button onClick={() => { setSettings(s => ({ ...s, cashOverride: null, cashBaseline: null })); setEditingCash(false); }}
                            className="text-amber-500 hover:underline">חשב אוטומטית (הכל מההתחלה)</button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className={`text-3xl font-bold mb-3 ${displayBalance >= 0 ? 'text-teal-700' : 'text-red-500'}`}>
                      ₪{displayBalance.toLocaleString()}
                      {hasBaseline && <span className="text-xs font-normal text-gray-400 mr-2">(מיתרת פתיחה)</span>}
                      {!hasBaseline && settings.cashOverride != null && <span className="text-xs font-normal text-gray-400 mr-2">(עודכן ידנית — לא עוקב אוטומטית)</span>}
                    </p>
                  )}
                  <div className="text-xs text-gray-400 space-y-1">
                    <div className="flex justify-between"><span>{hasBaseline ? 'הכנסות מאז האיפוס' : 'הכנסות'}</span><span className="text-green-600 font-semibold">₪{(hasBaseline ? (totalIncome - cashBaseline.incomeSnapshot) : totalIncome).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>{hasBaseline ? 'הוצאות מאז האיפוס' : 'הוצאות'}</span><span className="text-red-400 font-semibold">₪{(hasBaseline ? (totalExpensesAll - cashBaseline.expenseSnapshot) : totalExpensesAll).toLocaleString()}</span></div>
                  </div>
                </div>
                  );
                })()}

                <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-100">
                        <TrendingDown size={18} className="text-orange-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-500">הוצאות החודש</span>
                    </div>
                    <button onClick={() => { if (confirm('לאפס את הוצאות החודש? החל מעכשיו רק הוצאות חדשות שיתווספו יספרו.')) setSettings(s => ({ ...s, expensesResetAt: Date.now() })); }}
                      className="text-gray-300 hover:text-orange-500 transition" title="איפוס הוצאות החודש">
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <p className="text-3xl font-bold text-orange-600 mb-3">₪{thisMonthTotal.toLocaleString()}</p>
                  <div className="text-xs text-gray-400 space-y-1">
                    {thisMonthElec > 0 && <div className="flex justify-between"><span>חשמל</span><span className="font-semibold">₪{thisMonthElec.toLocaleString()}</span></div>}
                    {thisMonthOther > 0 && <div className="flex justify-between"><span>אחר</span><span className="font-semibold">₪{thisMonthOther.toLocaleString()}</span></div>}
                    {thisMonthTotal === 0 && <span className="text-gray-300">אין הוצאות רשומות החודש</span>}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-100">
                      <Bell size={18} className="text-sky-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">עדכונים</span>
                  </div>
                  <p className="text-3xl font-bold text-sky-600 mb-3">{unpaidThisMonth} דיירים</p>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div className="flex justify-between"><span>לא שילמו החודש</span><span className="font-semibold text-red-400">{unpaidThisMonth}</span></div>
                    <div className="flex justify-between"><span>בחוב כולל</span><span className="font-semibold text-red-400">{debtorsCount}</span></div>
                    <div className="flex justify-between"><span>סה״כ חוב</span><span className="font-semibold text-red-400">₪{totalDebt.toLocaleString()}</span></div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-100">
                      <Calendar size={18} className="text-purple-500" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">הוצאות צפויות</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-600 mb-3">₪{totalOpenExpenses.toLocaleString()}</p>
                  <div className="text-xs text-gray-400 space-y-1">
                    {openElec > 0 && <div className="flex justify-between"><span>חשמל</span><span className="font-semibold">₪{openElec.toLocaleString()}</span></div>}
                    {openCleaning > 0 && <div className="flex justify-between"><span>ניקיון</span><span className="font-semibold">₪{openCleaning.toLocaleString()}</span></div>}
                    {openRegular > 0 && <div className="flex justify-between"><span>הוצאות שוטפות</span><span className="font-semibold">₪{openRegular.toLocaleString()}</span></div>}
                    {openExtraordinary > 0 && <div className="flex justify-between"><span>הוצאות חריגות</span><span className="font-semibold">₪{openExtraordinary.toLocaleString()}</span></div>}
                    {totalOpenExpenses === 0 && <span className="text-gray-300">אין הוצאות פתוחות</span>}
                  </div>
                </div>

                {(() => {
                  const unpaidElec = (settings.electricityExpenses || []).filter(e => !e.paymentMethod).length;
                  const totalElec = (settings.electricityExpenses || []).length;
                  return (
                    <div className={`bg-white rounded-2xl border shadow-sm p-5 col-span-2 ${unpaidElec > 0 ? 'border-red-100' : 'border-green-100'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${unpaidElec > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                          <Zap size={18} className={unpaidElec > 0 ? 'text-red-500' : 'text-green-600'} />
                        </div>
                        <span className="text-sm font-medium text-gray-500">חברת חשמל</span>
                        <span className={`mr-auto text-xs font-bold px-2 py-0.5 rounded-full ${unpaidElec > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                          {unpaidElec > 0 ? `${unpaidElec} לא שולמו` : 'הכל שולם ✓'}
                        </span>
                      </div>
                      <div className="flex gap-6 text-xs text-gray-400">
                        <div className="flex justify-between gap-2"><span>סה"כ חשבוניות</span><span className="font-semibold text-gray-600">{totalElec}</span></div>
                        <div className="flex justify-between gap-2"><span>שולמו</span><span className="font-semibold text-green-600">{totalElec - unpaidElec}</span></div>
                        {unpaidElec > 0 && <div className="flex justify-between gap-2"><span>ממתינות לתשלום</span><span className="font-semibold text-red-500">{unpaidElec}</span></div>}
                      </div>
                    </div>
                  );
                })()}

              </div>
            </>
          );
        })()}

        {view === 'list' && (
          <>
            <header className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">ניהול דיירים</h2>
                <p className="text-sm text-gray-500">סה"כ חוב בבניין: <span className="font-bold text-red-600">₪{totalDebt.toLocaleString()}</span></p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <button onClick={sendPaymentReminders} disabled={isSendingReminders} className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1 transition disabled:opacity-50">
                  <Bell size={15} /> {isSendingReminders ? 'שולח...' : 'תזכורת'}
                </button>
                <button onClick={() => setShowEmailModal(true)} className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1 transition">
                  <Mail size={15} /> שלח לכולם
                </button>
                <button onClick={printTenantsStatusReport} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 hover:border-teal-400 hover:text-teal-700 px-4 py-2 rounded-full text-sm font-medium shadow-sm transition">
                  <FileDown size={15} /> הורד דוח מצב
                </button>
              </div>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {[
                { label: 'קומה 1', apts: ['1','2','3'], rental: false },
                { label: 'קומה 2', apts: ['4','5','6'], rental: false },
                { label: 'קומה 3', apts: ['7','8','9'], rental: false },
                { label: 'קומה 4', apts: ['10','11','12'], rental: false },
                { label: 'קומה 5 — שכירות', apts: ['13','14','15','16','17'], rental: true, full: true },
              ].map(floor => {
                const floorTenants = tenants.filter(t => floor.apts.includes(t.apt));
                return (
                  <div key={floor.label} className={`rounded-2xl border p-4 ${floor.full ? 'sm:col-span-2 border-amber-200 bg-amber-50/30' : 'border-teal-100 bg-white'}`}>
                    <h3 className={`text-xs font-bold mb-3 pb-1.5 border-b ${floor.rental ? 'text-amber-600 border-amber-200' : 'text-teal-700 border-teal-100'}`}>{floor.label}</h3>
                    <div className={`grid gap-3 ${floor.full ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-3'}`}>
                      {floorTenants.map(t => {
                        const debt = calcDebt(t);
                        const credit = calcCredit(t);
                        const isRental = floor.rental;
                        return (
                          <div key={t.id} onClick={() => openTenant(t.id)}
                            className={`p-4 rounded-2xl border text-center cursor-pointer hover:shadow-lg transition-all ${
                              isRental
                                ? debt > 0 ? 'bg-orange-50 border-orange-200' : 'bg-amber-50 border-amber-200'
                                : debt > 0 ? 'bg-red-50 border-red-100' : 'bg-teal-50/60 border-teal-100'
                            }`}>
                            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white mx-auto mb-2 shadow-sm"
                              style={{background: isRental ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #0d9488, #0ea5e9)'}}>
                              {t.apt}
                            </div>
                            <p className="font-bold text-sm text-gray-800 leading-tight truncate">{t.name}</p>
                            {isRental && getOwnerTenant(t) && (
                              <p className="text-[11px] text-amber-700 leading-tight truncate">בעל הדירה: {getOwnerTenant(t).name}</p>
                            )}
                            {t.feePercent && Number(t.feePercent) !== 100 && (
                              <span className="text-[10px] text-amber-600 font-medium bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full mt-1 inline-block">{t.feePercent}%</span>
                            )}
                            <div className="mt-1.5">
                              {debt > 0 && (
                                <div className="text-xs font-semibold text-red-500">₪{debt.toLocaleString()} חוב</div>
                              )}
                              {credit > 0 && (
                                <div className="text-xs font-semibold text-green-600">₪{credit.toLocaleString()} זכות</div>
                              )}
                              {debt === 0 && credit === 0 && (
                                <div className="text-xs font-semibold text-teal-500">מעודכן ✓</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === 'tenant' && selectedTenant && (
          <div className="max-w-5xl mx-auto">
            <button onClick={goList} className="flex items-center text-teal-800 font-bold mb-5 hover:underline text-sm">
              <ChevronRight size={18} /> חזרה לרשימת הדיירים
            </button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 space-y-5">
                <div className="bg-white p-5 rounded-2xl border shadow-sm">
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
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border shadow-sm">
                  <div className="flex justify-between items-center mb-4 gap-3">
                    <h4 className="font-bold text-base text-teal-800">תשלומים שוטפים</h4>
                    <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400">
                      {HEBREW_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead><tr className="border-b text-gray-400 text-xs">
                      <th className="pb-2 font-medium w-20">חודש</th>
                      <th className="pb-2 font-medium">לתשלום</th>
                      <th className="pb-2 font-medium">שולם</th>
                      <th className="pb-2 font-medium">חוב</th>
                      <th className="pb-2 font-medium">הערה</th>
                      <th className="pb-2"></th>
                    </tr></thead>
                    <tbody>
                      {[...TWELVE_MONTHS].reverse().map(month => {
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
                              <td className="py-2 text-left">
                                <button onClick={() => setEditData(d => ({ ...d, payments: [...d.payments, { id: Date.now(), hebrewMonth: month, hebrewYear: filterYear, status: 'חוב', amount: d.monthlyRent }] }))}
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
                                <button onClick={() => setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, payments: t.payments.filter(x => x.id !== p.id) }))}
                                  className="text-gray-200 hover:text-red-400 transition"><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>

                {/* חיובים חד-פעמיים */}
                <div className="bg-white p-5 rounded-2xl border shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-base text-teal-800">חיובים נוספים / חד-פעמיים</h4>
                    <button onClick={() => {
                      const newCharge = { id: Date.now(), description: '', amount: 0, status: 'חוב', note: '' };
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
                                <button onClick={() => setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, charges: t.charges.filter(x => x.id !== c.id) }))}
                                  className="text-gray-200 hover:text-red-400 transition opacity-0 group-hover:opacity-100">
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
                  <div className="bg-white p-5 rounded-2xl border shadow-sm">
                    <h4 className="font-bold text-base text-teal-800 mb-4">הוצאות חריגות</h4>

                    {(selectedTenant.charges || []).filter(c => c.expenseId).length > 0 && (
                      <div className="overflow-x-auto">
                      <table className="w-full text-sm text-right mb-4">
                        <thead><tr className="border-b text-gray-400 text-xs">
                          <th className="pb-2 font-medium">תיאור</th>
                          <th className="pb-2 font-medium">סכום</th>
                          <th className="pb-2 font-medium">סטטוס</th>
                          <th className="pb-2"></th>
                        </tr></thead>
                        <tbody>
                          {(selectedTenant.charges || []).filter(c => c.expenseId).map(c => (
                            <tr key={c.id} className="border-b group">
                              <td className="py-2 text-sm text-gray-700">{c.description || 'הוצאה חריגה'}</td>
                              <td className="py-2 font-medium text-gray-800">₪{(c.amount||0).toLocaleString()}</td>
                              <td className="py-2">
                                <button onClick={() => setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, charges: t.charges.map(x => x.id===c.id ? {...x,status:x.status==='שולם'?'חוב':'שולם'} : x) }))}
                                  className={`text-xs px-2 py-1 rounded-full border font-medium transition ${c.status==='שולם'?'text-green-600 border-green-200 hover:bg-green-50':'text-red-500 border-red-200 hover:bg-red-50'}`}>
                                  {c.status}
                                </button>
                              </td>
                              <td className="py-2 text-left">
                                <button onClick={() => setTenants(prev => prev.map(t => t.id !== selectedId ? t : { ...t, charges: t.charges.filter(x => x.id !== c.id) }))}
                                  className="text-gray-200 hover:text-red-400 transition opacity-0 group-hover:opacity-100"><Trash2 size={13} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    )}

                    <div className="space-y-2">
                      {settings.extraordinaryExpenses
                        .filter(exp => !(selectedTenant.charges || []).some(c => c.expenseId === exp.id))
                        .map(exp => (
                          <div key={exp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-700">{exp.description || 'הוצאה ללא שם'}</span>
                              {(exp.hebrewMonth || exp.hebrewYear) && <span className="text-xs text-gray-400">{exp.hebrewDay ? `${exp.hebrewDay} ` : ''}{exp.hebrewMonth} {exp.hebrewYear}</span>}
                              <span className="text-xs font-semibold text-teal-600">₪{(exp.perTenantAmount||0).toLocaleString()} לדייר</span>
                            </div>
                            <button onClick={() => {
                              const newCharge = { id: Date.now(), description: exp.description, amount: exp.perTenantAmount, status: 'חוב', note: '', expenseId: exp.id };
                              setTenants(prev => prev.map(t => t.id === selectedId ? { ...t, charges: [...(t.charges||[]), newCharge] } : t));
                            }} className="text-xs text-teal-700 border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap">
                              משוך לדייר
                            </button>
                          </div>
                        ))}
                      {settings.extraordinaryExpenses.every(exp => (selectedTenant.charges || []).some(c => c.expenseId === exp.id)) && (
                        <p className="text-xs text-gray-400 text-center py-2">כל ההוצאות החריגות כבר משוכות לדייר</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-white p-5 rounded-2xl border shadow-sm">
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
              </div>

              <div className="space-y-5">
                <div className="bg-white p-5 rounded-2xl border shadow-sm text-center">
                  <p className="text-gray-500 text-sm font-medium">סך יתרת חוב</p>
                  <p className={`text-4xl font-bold my-2 ${calcDebt(selectedTenant)>0?'text-red-600':'text-green-600'}`}>₪{calcDebt(selectedTenant).toLocaleString()}</p>
                  <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center text-xl font-bold text-teal-800 mx-auto">{selectedTenant.apt}</div>
                </div>

                {(() => {
                  const { month: curM, year: curY } = getCurrentHebrewDate();
                  const baseFee = getFeeForMonth(curM, curY);
                  const pct = Number(selectedTenant.feePercent || 100);
                  const effective = Math.round(baseFee * pct / 100);
                  return (
                    <div className="bg-white p-5 rounded-2xl border shadow-sm">
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

                <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-2">
                  <h4 className="font-bold text-base text-teal-800 mb-3">פעולות</h4>
                  <button className="w-full bg-teal-700 hover:bg-teal-600 text-white py-2.5 rounded-xl text-sm font-bold transition">תשלום גבייה</button>
                  <button className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-sm font-bold transition">הסדר תשלום</button>
                  <button onClick={() => {
                    const available = [...new Set(selectedTenant.payments.map(p => p.hebrewYear))]
                      .sort((a, b) => (HEBREW_YEAR_TO_NUMERIC[b] || 0) - (HEBREW_YEAR_TO_NUMERIC[a] || 0));
                    setStatementYears(new Set(available));
                    setStatementMode('full');
                    setIncludeOwnedApts(false);
                    setShowStatementModal(selectedTenant);
                  }} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-1">
                    <FileText size={14} /> הורד מסמך
                  </button>
                  <button onClick={() => { setTenantMsgText(''); setShowTenantMsg(true); }} className="w-full bg-sky-600 hover:bg-sky-700 text-white py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-1">
                    <MessageSquare size={14} /> שלח הודעה
                  </button>
                  <button onClick={() => deleteTenant(selectedTenant.id)} className="w-full border border-red-200 text-red-500 hover:bg-red-50 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-1">
                    <Trash2 size={14} /> מחק דייר
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'add' && (
          <div className="max-w-2xl mx-auto">
            <button onClick={goList} className="flex items-center text-teal-800 font-bold mb-5 hover:underline text-sm">
              <ChevronRight size={18} /> חזרה
            </button>
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
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
                      : { id: Date.now(), description: '', totalAmount: 0, paidAmount: 0, perTenantAmount: 0, hebrewDay: curD, hebrewMonth: curM, hebrewYear: curY, note: '' };
                    setSettings(s => ({ ...s, [key]: [...(s[key] || []), newExp] }));
                  }} className="flex items-center gap-2 bg-teal-700 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-teal-600 transition">
                    <Plus size={14} /> {key === 'electricityExpenses' ? 'הוסף חשבונית' : 'הוסף הוצאה'}
                  </button>
                </div>
                <div className="bg-white rounded-2xl border shadow-sm overflow-visible">
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
                                  <button onClick={() => setSettings(s => ({ ...s, [key]: s[key].filter(x => x.id !== exp.id) }))}
                                    className="text-gray-200 hover:text-red-400 transition opacity-0 group-hover:opacity-100">
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
                                          setTenants(prev => prev.map((t,i) =>
                                            (t.charges||[]).some(c => c.expenseId===exp.id) ? t : {
                                              ...t, charges: [...(t.charges||[]), { id: Date.now()+i, description: exp.description, amount: exp.perTenantAmount, status: 'חוב', note: '', expenseId: exp.id }]
                                            }
                                          ));
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
                                      setSettings(s => ({ ...s, [key]: s[key].filter(x => x.id !== exp.id) }));
                                      if (key === 'extraordinaryExpenses') {
                                        setTenants(prev => prev.map(t => ({ ...t, charges: (t.charges||[]).filter(c => c.expenseId !== exp.id) })));
                                      }
                                    }} className="text-gray-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>

                                {isPulled && expandedPaidList === exp.id && (
                                  <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1.5">
                                    {linkedCharges.length === 0
                                      ? <span className="text-xs text-gray-400">אין דיירים משויכים</span>
                                      : linkedCharges.map(c => (
                                        <span key={c.id} className={`text-[11px] px-2 py-0.5 rounded-full border ${c.status === 'שולם' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                          דירה {c.tenant.apt} — {c.tenant.name}
                                        </span>
                                      ))}
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
              {/* Logo */}
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
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
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
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
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
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
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
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
                              {TWELVE_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
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

              {/* Email Settings */}
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
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

              {/* Templates */}
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
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
            <div className="flex items-center gap-2 mb-2">
              <button type="button"
                onClick={() => setTenantMsgText(t => (t.trim() ? t.trim() + '\n\n' : '') + buildTenantStatementText(selectedTenant, 'full'))}
                className="text-xs border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:border-teal-400 hover:text-teal-700 transition flex items-center gap-1">
                <FileText size={12} /> הוסף פירוט מלא
              </button>
              <button type="button"
                onClick={() => setTenantMsgText(t => (t.trim() ? t.trim() + '\n\n' : '') + buildTenantStatementText(selectedTenant, 'debtsOnly'))}
                className="text-xs border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:border-teal-400 hover:text-teal-700 transition flex items-center gap-1">
                <FileText size={12} /> הוסף פירוט חובות
              </button>
              {getOwnedApartments(selectedTenant.id).length > 0 && (
                <button type="button"
                  onClick={() => setTenantMsgText(t => (t.trim() ? t.trim() + '\n\n' : '') + buildOwnedAptsDebtsText(selectedTenant))}
                  className="text-xs border border-purple-200 rounded-full px-3 py-1.5 text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition flex items-center gap-1">
                  <FileText size={12} /> הוסף חובות דירות בבעלות
                </button>
              )}
            </div>
            <textarea value={tenantMsgText} onChange={e => setTenantMsgText(e.target.value)}
              placeholder="כתוב את ההודעה כאן..."
              className="w-full border rounded-xl p-3 text-sm h-40 resize-none focus:outline-none focus:ring-1 focus:ring-teal-400" dir="rtl" />
            {!selectedTenant?.email && (
              <p className="text-xs text-orange-500 mt-2">לדייר זה אין כתובת מייל — הוסיפי בפרטי הדייר</p>
            )}

            {(selectedTenant.phone || selectedTenant.email) && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 space-y-1">
                {selectedTenant.phone && <p>טלפון: <span className="font-medium text-gray-700 select-all">{selectedTenant.phone}</span></p>}
                {selectedTenant.email && <p>מייל: <span className="font-medium text-gray-700 select-all">{selectedTenant.email}</span></p>}
              </div>
            )}

            {sendResult && (
              <p className={`text-xs mt-3 font-medium ${sendResult.ok ? 'text-green-600' : 'text-red-500'}`}>{sendResult.msg}</p>
            )}
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => { setShowTenantMsg(false); setSendResult(null); }} className="border px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition">ביטול</button>
              <button disabled={isSending || !tenantMsgText.trim() || !selectedTenant?.email}
                onClick={async () => {
                  setIsSending(true);
                  setSendResult(null);
                  try {
                    await sendEmail(selectedTenant.email, tenantMsgSubject, tenantMsgText);
                    setSendResult({ ok: true, msg: `נשלח בהצלחה ל-${selectedTenant.name}!` });
                    setTimeout(() => { setShowTenantMsg(false); setTenantMsgText(''); setTenantMsgSubject(''); setSendResult(null); }, 1500);
                  } catch { setSendResult({ ok: false, msg: 'שגיאה בשליחה — בדקי הגדרות מייל' }); }
                  setIsSending(false);
                }}
                className="bg-sky-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-sky-700 transition flex items-center gap-1 disabled:opacity-50">
                {isSending ? 'שולח...' : <><Mail size={14} /> שלח</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStatementModal && (() => {
        const tenant = showStatementModal;
        const availableYears = [...new Set(tenant.payments.map(p => p.hebrewYear))]
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
              </div>

              <p className="text-sm text-gray-500 mb-2">בחרי שנים לכלול במסמך</p>
              <div className="space-y-1 mb-3 max-h-64 overflow-y-auto">
                {availableYears.map(year => {
                  const hasDebt = tenant.payments.some(p => p.hebrewYear === year && p.status === 'חוב' && (p.amount - (p.paidAmount || 0)) > 0);
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
                  printTenantStatement(tenant, statementYears, statementMode, includeOwnedApts);
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
              <button onClick={() => { setShowEmailModal(false); setSendResult(null); }}><X size={20} className="text-gray-500 hover:text-gray-700" /></button>
            </div>
            <div className="mb-3">
              <label className="text-[10px] text-gray-400 block mb-1">נושא</label>
              <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="נושא ההודעה"
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400" dir="rtl" />
            </div>
            <textarea value={emailText} onChange={e => setEmailText(e.target.value)} placeholder="כתוב את ההודעה כאן..."
              className="w-full border rounded-xl p-3 text-sm h-32 resize-none focus:outline-none focus:ring-1 focus:ring-teal-400" dir="rtl" />
            <p className="text-xs text-gray-400 mt-2">
              ישלח ל-{tenants.filter(t => t.email).length} דיירים עם כתובת מייל
            </p>
            {sendResult && (
              <p className={`text-xs mt-2 font-medium ${sendResult.ok ? 'text-green-600' : 'text-red-500'}`}>{sendResult.msg}</p>
            )}
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => { setShowEmailModal(false); setSendResult(null); }} className="border px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition">ביטול</button>
              <button disabled={isSending || !emailText.trim()} onClick={async () => {
                setIsSending(true);
                setSendResult(null);
                const targets = tenants.filter(t => t.email);
                let ok = 0, fail = 0;
                for (const t of targets) {
                  try {
                    await sendEmail(t.email, emailSubject, emailText);
                    ok++;
                  } catch { fail++; }
                }
                setIsSending(false);
                setSendResult(fail === 0
                  ? { ok: true, msg: `נשלח בהצלחה ל-${ok} דיירים!` }
                  : { ok: false, msg: `נשלח ל-${ok}, נכשל ל-${fail}` });
                if (fail === 0) { setTimeout(() => { setShowEmailModal(false); setEmailText(''); setEmailSubject(''); setSendResult(null); }, 1500); }
              }} className="bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-sky-600 transition disabled:opacity-50 flex items-center gap-1">
                {isSending ? 'שולח...' : <><Mail size={14} /> שלח</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectExpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectExpModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm max-h-[80vh] flex flex-col" dir="rtl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-1">שלוף לדירות נבחרות</h3>
            <p className="text-sm text-gray-500 mb-4">{selectExpModal.description || 'הוצאה חריגה'} — ₪{(selectExpModal.perTenantAmount||0).toLocaleString()} לדייר</p>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100 mb-4">
              {(() => {
                const available = (tenants||[]).filter(t => !(t.charges||[]).some(c => c.expenseId === selectExpModal.expId));
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
                      const alreadyApplied = (t.charges||[]).some(c => c.expenseId === selectExpModal.expId);
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
                          <span className="text-sm font-medium text-gray-700">דירה {t.apartment}</span>
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
                setTenants(prev => prev.map((t, i) =>
                  selectedTenantIds.has(t.id) && !(t.charges||[]).some(c => c.expenseId===selectExpModal.expId)
                    ? { ...t, charges: [...(t.charges||[]), { id: Date.now()+i, description: selectExpModal.description, amount: selectExpModal.perTenantAmount, status: 'חוב', note: '', expenseId: selectExpModal.expId }] }
                    : t
                ));
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
