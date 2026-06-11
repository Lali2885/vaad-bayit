import { useState, useEffect, useRef } from 'react';
import { Home, ReceiptText, Building, ChevronRight, Mail, Bell, Plus, Pencil, Trash2, X, Check, Settings, Upload, ImageOff, MessageSquare, Banknote, LogOut } from 'lucide-react';
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
  return { month: months[numericMonth - 1], year: numericToHebrewYear(numericYear), numericYear };
}

const { year: CURRENT_HEBREW_YEAR } = getCurrentHebrewDate();
const HEBREW_YEARS = (() => {
  const { numericYear } = getCurrentHebrewDate();
  return [numericYear - 1, numericYear, numericYear + 1, numericYear + 2].map(numericToHebrewYear);
})();

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
  { id: 16, name: 'דירה קטנה פריד',  apt: '16', phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 40, owner: 'פריד', payments: [], charges: [] },
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

const EMPTY_TENANT = { name: '', apt: '', phone: '', email: '', idCard: '', dueDate: '', monthlyRent: 0, owner: '', payments: [], charges: [] };

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
  const [filterYear, setFilterYear] = useState(CURRENT_HEBREW_YEAR);
  const [showTenantMsg, setShowTenantMsg] = useState(false);
  const [tenantMsgText, setTenantMsgText] = useState('');
  const logoInputRef = useRef(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [dbError, setDbError] = useState(null);

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
    if (!session) return;
    setDataLoading(true);
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
        return { ...tenant, payments: newPayments };
      });

      if (anyAdded || !tenantsRes.data) {
        supabase.from('app_tenants')
          .upsert({ user_id: session.user.id, data: loadedTenants, last_auto_month: autoKey }, { onConflict: 'user_id' })
          .then(({ error }) => { if (error) setDbError(`שגיאת שמירה: ${error.message} (${error.code})`); });
      }
      setTenants(loadedTenants);

      if (settingsRes.data) {
        const p = settingsRes.data.data;
        if (!p.managers) p.managers = [{ id: 1, name: '', phone: '', email: '', role: 'יו"ר הוועד' }];
        if (!p.templates) p.templates = INITIAL_SETTINGS.templates;
        if (!p.feeHistory) p.feeHistory = INITIAL_SETTINGS.feeHistory;
        setSettings({ ...INITIAL_SETTINGS, ...p });
      } else {
        setSettings(INITIAL_SETTINGS);
        supabase.from('app_settings').upsert({ user_id: session.user.id, data: INITIAL_SETTINGS });
      }
      setDataLoading(false);
    });
  }, [session]);

  useEffect(() => {
    if (!session || !tenants) return;
    const t = setTimeout(async () => {
      const { error } = await supabase.from('app_tenants')
        .update({ data: tenants })
        .eq('user_id', session.user.id);
      if (error) console.error('שגיאת שמירת דיירים:', error);
    }, 800);
    return () => clearTimeout(t);
  }, [tenants, session]);

  useEffect(() => {
    if (!session || !settings) return;
    const t = setTimeout(async () => {
      const { error } = await supabase.from('app_settings')
        .update({ data: settings })
        .eq('user_id', session.user.id);
      if (error) console.error('שגיאת שמירת הגדרות:', error);
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
    await supabase.auth.signOut();
  }

  function openSettings() {
    setSettingsData({ ...settings });
    setView('settings');
    setSettingsSaved(false);
  }

  function saveSettings() {
    setSettings(settingsData);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }

  function applyFeeToAllTenants(amount, fromMonth, fromYear) {
    if (!confirm(`לעדכן את כל הדיירים לתעריף ${amount}₪ החל מ-${fromMonth}?`)) return;
    const yearRank = y => HEBREW_YEARS.indexOf(y);
    const monthRank = m => TWELVE_MONTHS.indexOf(m);
    setTenants(prev => prev.map(t => ({
      ...t,
      monthlyRent: amount,
      payments: t.payments.map(p => {
        const afterYear = yearRank(p.hebrewYear) > yearRank(fromYear);
        const sameYearAfterMonth = yearRank(p.hebrewYear) === yearRank(fromYear) && monthRank(p.hebrewMonth) >= monthRank(fromMonth);
        return p.status === 'חוב' && (afterYear || sameYearAfterMonth) ? { ...p, amount } : p;
      }),
    })));
  }

  function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setSettingsData(d => ({ ...d, logo: ev.target.result }));
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
    const { month: curMonth, year: curYear } = getCurrentHebrewDate();
    const curIdx = TWELVE_MONTHS.indexOf(curMonth);
    setTenants(prev => prev.map(t => {
      if (t.id !== selectedId) return t;
      return { ...t, payments: t.payments.map(p => {
        if (p.id !== pId) return p;
        const paid = Math.max(Number(paidAmount) || 0, 0);
        const capped = Math.min(paid, p.amount);
        if (capped >= p.amount) return { ...p, paidAmount: capped, status: 'שולם' };
        const isFuture = p.hebrewYear === curYear && TWELVE_MONTHS.indexOf(p.hebrewMonth) > curIdx;
        return { ...p, paidAmount: capped, status: isFuture && capped > 0 ? 'זכות' : 'חוב' };
      })};
    }));
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
    const amount = getFeeForMonth(month, year);
    const { month: curMonth, year: curYear } = getCurrentHebrewDate();
    const isFuture = year === curYear && TWELVE_MONTHS.indexOf(month) > TWELVE_MONTHS.indexOf(curMonth);
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
      <div className="w-28 shrink-0 flex flex-col items-center py-8 gap-6 text-white"
        style={{background: 'linear-gradient(160deg, #0f766e 0%, #0284c7 60%, #0c4a6e 100%)'}}>
        {settings.logo
          ? <img src={settings.logo} alt="לוגו" className="w-14 h-14 object-contain rounded-full bg-white/20 p-1.5 shadow" />
          : <Building size={38} className="text-cyan-100" />}
        <div className="flex flex-col items-center gap-2 mt-2 w-full px-2">
          <button onClick={goList} className={`flex flex-col items-center gap-1.5 w-full py-3 rounded-2xl transition-all ${view === 'list' ? 'bg-white/20 text-white' : 'text-cyan-100 hover:text-white hover:bg-white/10'}`}>
            <Home size={26} /><span className="text-[11px] font-medium">דיירים</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 w-full py-3 rounded-2xl text-cyan-100 hover:text-white hover:bg-white/10 transition-all">
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

      <main className="flex-1 p-6 overflow-auto bg-sky-50">
        {view === 'list' && (
          <>
            <header className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">ניהול דיירים</h2>
                <p className="text-sm text-gray-500">סה"כ חוב בבניין: <span className="font-bold text-red-600">{totalDebt.toLocaleString()}₪</span></p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <button onClick={() => alert('תזכורות תשלום נשלחו!')} className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1 transition">
                  <Bell size={15} /> תזכורת
                </button>
                <button onClick={() => setShowEmailModal(true)} className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1 transition">
                  <Mail size={15} /> שלח לכולם
                </button>
              </div>
            </header>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {tenants.map(t => {
                const debt = calcDebt(t);
                const credit = calcCredit(t);
                const isRental = Number(t.apt) >= 13;
                return (
                  <div key={t.id} onClick={() => openTenant(t.id)}
                    className={`p-5 rounded-2xl border text-center cursor-pointer hover:shadow-lg transition-all ${
                      isRental
                        ? debt > 0 ? 'bg-orange-50 border-orange-200' : 'bg-amber-50 border-amber-200'
                        : debt > 0 ? 'bg-red-50 border-red-100' : 'bg-teal-50/60 border-teal-100'
                    }`}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl text-white mx-auto mb-3 shadow-sm"
                      style={{background: isRental ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #0d9488, #0ea5e9)'}}>
                      {t.apt}
                    </div>
                    <p className="font-bold text-sm text-gray-800">{t.name}</p>
                    <div className="flex flex-col items-center gap-0.5 mt-2">
                      {debt > 0 && (
                        <div className="flex items-center justify-center gap-1 text-xs font-semibold text-red-500">
                          <Banknote size={13} /> {debt.toLocaleString()}₪ חוב
                        </div>
                      )}
                      {credit > 0 && (
                        <div className="flex items-center justify-center gap-1 text-xs font-semibold text-green-600">
                          <Check size={12} /> {credit.toLocaleString()}₪ זכות
                        </div>
                      )}
                      {debt === 0 && credit === 0 && (
                        <div className="flex items-center justify-center gap-1 text-xs font-semibold text-teal-600">
                          <Check size={12} /> מעודכן
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div onClick={() => setView('add')} className="bg-white p-5 rounded-2xl border border-dashed border-teal-200 text-center cursor-pointer hover:shadow-md hover:border-teal-400 transition-all">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{background: 'linear-gradient(135deg, #0d948822, #0ea5e922)'}}>
                  <Plus size={28} className="text-teal-600" />
                </div>
                <p className="font-bold text-sm text-teal-600">דייר חדש</p>
              </div>
            </div>
          </>
        )}

        {view === 'tenant' && selectedTenant && (
          <div className="max-w-5xl mx-auto">
            <button onClick={goList} className="flex items-center text-teal-800 font-bold mb-5 hover:underline text-sm">
              <ChevronRight size={18} /> חזרה לרשימת הדיירים
            </button>
            <div className="grid grid-cols-3 gap-5">
              <div className="col-span-2 space-y-5">
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
                  <div className="grid grid-cols-2 gap-3">
                    {[{label:'שם מלא',key:'name'},{label:'מספר דירה',key:'apt'},{label:'בעל הדירה',key:'owner'},{label:'תעודת זהות',key:'idCard'},{label:'מייל',key:'email'},{label:'טלפון',key:'phone'},{label:'תאריך חיוב',key:'dueDate'},{label:'שכ"ד חודשי (₪)',key:'monthlyRent'}].map(({label,key}) => (
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
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border shadow-sm">
                  <div className="flex justify-between items-center mb-4 gap-3">
                    <h4 className="font-bold text-base text-teal-800">תשלומים שוטפים</h4>
                    <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400">
                      {HEBREW_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <table className="w-full text-sm text-right">
                    <thead><tr className="border-b text-gray-400 text-xs">
                      <th className="pb-2 font-medium w-20">חודש</th>
                      <th className="pb-2 font-medium">לתשלום</th>
                      <th className="pb-2 font-medium">שולם</th>
                      <th className="pb-2 font-medium">חוב</th>
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
                              <span className="text-sm font-medium text-gray-700">{p.amount.toLocaleString()}₪</span>
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
                                ? <span className="text-green-600 font-semibold text-xs">{p.amount.toLocaleString()}₪ ✓</span>
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
                                ? <span className="text-green-600 text-xs">0₪</span>
                                : p.status === 'זכות'
                                ? <span className="font-semibold text-xs text-orange-400">{remaining.toLocaleString()}₪</span>
                                : <span className={`font-semibold text-xs ${remaining > 0 ? 'text-red-500' : 'text-green-600'}`}>{remaining.toLocaleString()}₪</span>
                              }
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
                  {(selectedTenant.charges || []).length === 0
                    ? <p className="text-sm text-gray-400 text-center py-4">אין חיובים נוספים</p>
                    : <table className="w-full text-sm text-right">
                        <thead><tr className="border-b text-gray-400 text-xs">
                          <th className="pb-2 font-medium">תיאור</th>
                          <th className="pb-2 font-medium">הערה</th>
                          <th className="pb-2 font-medium">סכום</th>
                          <th className="pb-2 font-medium">סטטוס</th>
                          <th className="pb-2"></th>
                        </tr></thead>
                        <tbody>
                          {(selectedTenant.charges || []).map(c => (
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
                      </table>
                  }
                </div>
              </div>

              <div className="space-y-5">
                <div className="bg-white p-5 rounded-2xl border shadow-sm text-center">
                  <p className="text-gray-500 text-sm font-medium">סך יתרת חוב</p>
                  <p className={`text-4xl font-bold my-2 ${calcDebt(selectedTenant)>0?'text-red-600':'text-green-600'}`}>{calcDebt(selectedTenant).toLocaleString()}₪</p>
                  <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center text-xl font-bold text-teal-800 mx-auto">{selectedTenant.apt}</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-2">
                  <h4 className="font-bold text-base text-teal-800 mb-3">פעולות</h4>
                  <button className="w-full bg-teal-700 hover:bg-teal-600 text-white py-2.5 rounded-xl text-sm font-bold transition">תשלום גבייה</button>
                  <button className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-sm font-bold transition">הסדר תשלום</button>
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
              <div className="grid grid-cols-2 gap-4">
                {[{label:'שם מלא',key:'name'},{label:'מספר דירה',key:'apt'},{label:'בעל הדירה',key:'owner'},{label:'תעודת זהות',key:'idCard'},{label:'מייל',key:'email'},{label:'טלפון',key:'phone'},{label:'תאריך חיוב',key:'dueDate'},{label:'שכ"ד חודשי (₪)',key:'monthlyRent'}].map(({label,key}) => (
                  <div key={key}>
                    <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
                    <input value={newTenant[key]} onChange={e => setNewTenant(d => ({...d,[key]:e.target.value}))}
                      className="w-full p-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
                      type={key==='monthlyRent'?'number':'text'} />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={addNewTenant} disabled={!newTenant.name||!newTenant.apt} className="bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-teal-600 transition">שמור דייר</button>
                <button onClick={goList} className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition">ביטול</button>
              </div>
            </div>
          </div>
        )}

        {view === 'settings' && settingsData && (
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">הגדרות מערכת</h2>
              <button onClick={saveSettings} className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition ${settingsSaved ? 'bg-green-600 text-white' : 'bg-teal-700 hover:bg-teal-600 text-white'}`}>
                {settingsSaved ? <><Check size={15} /> נשמר!</> : <><Check size={15} /> שמור הגדרות</>}
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
                <div className="grid grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-2 gap-3">
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
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
                  const mgr = settings.managers[0] || {};
                  const { month } = getCurrentHebrewDate();
                  setTenantMsgText(tpl.body
                    .replace(/{שם}/g, selectedTenant.name)
                    .replace(/{חודש}/g, month)
                    .replace(/{סכום}/g, calcDebt(selectedTenant).toLocaleString())
                    .replace(/{תאריך}/g, new Date().toLocaleDateString('he-IL'))
                    .replace(/{מנהל}/g, mgr.name || '')
                    .replace(/{טלפון}/g, mgr.phone || '')
                    .replace(/{כתובת}/g, settings.address || ''));
                }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400">
                  <option value="">-- בחר תבנית --</option>
                  {settings.templates.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                </select>
              </div>
            )}

            <textarea value={tenantMsgText} onChange={e => setTenantMsgText(e.target.value)}
              placeholder="כתוב את ההודעה כאן..."
              className="w-full border rounded-xl p-3 text-sm h-40 resize-none focus:outline-none focus:ring-1 focus:ring-teal-400" dir="rtl" />

            {(selectedTenant.phone || selectedTenant.email) && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 space-y-1">
                {selectedTenant.phone && <p>טלפון: <span className="font-medium text-gray-700 select-all">{selectedTenant.phone}</span></p>}
                {selectedTenant.email && <p>מייל: <span className="font-medium text-gray-700 select-all">{selectedTenant.email}</span></p>}
              </div>
            )}

            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowTenantMsg(false)} className="border px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition">ביטול</button>
              <button onClick={() => { alert(`ההודעה נשלחה ל-${selectedTenant.name}!`); setShowTenantMsg(false); setTenantMsgText(''); }}
                className="bg-sky-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-sky-700 transition flex items-center gap-1">
                <Mail size={14} /> שלח
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-teal-800">שליחת הודעה לכל הדיירים</h3>
              <button onClick={() => setShowEmailModal(false)}><X size={20} className="text-gray-500 hover:text-gray-700" /></button>
            </div>
            <textarea value={emailText} onChange={e => setEmailText(e.target.value)} placeholder="כתוב את ההודעה כאן..."
              className="w-full border rounded-xl p-3 text-sm h-32 resize-none focus:outline-none focus:ring-1 focus:ring-teal-400" dir="rtl" />
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => setShowEmailModal(false)} className="border px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition">ביטול</button>
              <button onClick={() => { alert('ההודעה נשלחה!'); setShowEmailModal(false); setEmailText(''); }} className="bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-sky-600 transition">שלח</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
