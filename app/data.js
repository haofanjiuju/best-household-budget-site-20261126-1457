// HomeLedger seed data + localStorage store.
// All figures describe one realistic household (the Riveras: two adults, two kids,
// one car, a rented three-bedroom) over June–November 2026. The seed is generated
// with a fixed-seed RNG so every fresh browser sees the same books.
const KEY = 'homeledger-v1';

export const CATEGORIES = [
  { id: 'housing', name: 'Housing', color: '#2f6f5e', budget: 1950 },
  { id: 'groceries', name: 'Groceries', color: '#5b8c5a', budget: 1000 },
  { id: 'dining', name: 'Dining Out', color: '#c98a2b', budget: 320 },
  { id: 'transport', name: 'Transport', color: '#3e7cb1', budget: 280 },
  { id: 'utilities', name: 'Utilities', color: '#7a6aa8', budget: 420 },
  { id: 'health', name: 'Health', color: '#b3556e', budget: 220 },
  { id: 'entertainment', name: 'Entertainment', color: '#4a9b8e', budget: 180 },
  { id: 'shopping', name: 'Shopping', color: '#a85d3c', budget: 300 },
  { id: 'kids', name: 'Kids & School', color: '#8a7d3c', budget: 260 },
  { id: 'other', name: 'Other', color: '#8a8f98', budget: 120 },
];

export const INCOME_CATEGORIES = [
  { id: 'paycheck', name: 'Paycheck' },
  { id: 'freelance', name: 'Freelance & Side Income' },
  { id: 'other-income', name: 'Other Income' },
];

export const MONTHS = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
export const CURRENT_MONTH = '2026-11';
// "Today" inside the books: the site renders against the real date, but the seed
// only contains transactions up to this day so the numbers always add up.
export const TODAY = '2026-11-26';

export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
export function fmt(n) {
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function fmt0(n) {
  return (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261126);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (lo, hi) => Math.round((lo + rnd() * (hi - lo)) * 100) / 100;

function seedBills() {
  return [
    { id: 'b-rent', name: 'Rent — Maple Court Apt 4B', amount: 1850, dueDay: 1, category: 'housing', autopay: true },
    { id: 'b-electric', name: 'City Power & Light', amount: 132, dueDay: 12, category: 'utilities', autopay: true },
    { id: 'b-water', name: 'Water & Sewer', amount: 68, dueDay: 15, category: 'utilities', autopay: false },
    { id: 'b-internet', name: 'Fiber Internet 500 Mbps', amount: 79, dueDay: 8, category: 'utilities', autopay: true },
    { id: 'b-mobile', name: 'Mobile — 2 lines', amount: 112, dueDay: 18, category: 'utilities', autopay: true },
    { id: 'b-insurance', name: 'Car Insurance', amount: 146, dueDay: 22, category: 'transport', autopay: true },
    { id: 'b-streaming', name: 'StreamBox Family', amount: 15.49, dueDay: 9, category: 'entertainment', autopay: true },
    { id: 'b-gym', name: 'Neighborhood Gym', amount: 39, dueDay: 3, category: 'health', autopay: false },
  ];
}

function seedGoals() {
  return [
    { id: 'g-emergency', name: 'Emergency Fund', target: 10000, saved: 6400, note: '6 months of essentials' },
    { id: 'g-vacation', name: 'Summer Beach Trip', target: 3500, saved: 1150, note: 'Flights + a week by the coast' },
    { id: 'g-car', name: 'Next Car — Down Payment', target: 12000, saved: 4800, note: 'Trade in the 2016 sedan' },
    { id: 'g-college', name: "Kids' College Fund", target: 20000, saved: 7250, note: '$150 a month, auto-transfer' },
  ];
}

function seedTransactions() {
  const txs = [];
  let id = 1;
  const seedPaid = { '2026-11': ['b-rent', 'b-electric', 'b-water', 'b-internet', 'b-mobile', 'b-streaming', 'b-gym'] };
  const add = (date, description, category, amount, type) => {
    txs.push({ id: 't' + (id++), date, description, category, amount, type });
  };
  const GROCERS = ['GreenMart', 'Fresh Foods Market', 'Neighborhood Grocery', 'Costco Run', 'Corner Market'];
  const EATERIES = ['Pasta House', 'Sushi Bar', 'Burger Joint', 'Coffee & Bagels', 'Taco Truck', 'Pizza Night', 'Noodle House'];
  for (const ym of MONTHS) {
    const [y, m] = ym.split('-').map(Number);
    const lastDay = ym === CURRENT_MONTH ? 26 : new Date(y, m, 0).getDate();
    const d = (day) => `${ym}-${String(day).padStart(2, '0')}`;
    // Recurring income + housing
    add(d(1), 'Rent — Maple Court Apt 4B', 'housing', 1850, 'expense');
    add(d(5), 'Paycheck — Maya Rivera', 'paycheck', 3420, 'income');
    add(d(20), 'Paycheck — Maya Rivera', 'paycheck', 3420, 'income');
    if (rnd() < 0.7) add(d(14 + Math.floor(rnd() * 10)), 'Freelance — weekend design work', 'freelance', between(180, 420), 'income');
    // Utilities — a bill only appears as a transaction in the current month
    // if the household has actually paid it (see paidBills); earlier months
    // are fully settled, so every bill shows up there.
    const billSettled = (billId) => ym !== CURRENT_MONTH || (seedPaid[CURRENT_MONTH] || []).includes(billId);
    if (billSettled('b-electric')) add(d(12), 'City Power & Light', 'utilities', between(96, 158), 'expense');
    if (billSettled('b-water')) add(d(15), 'Water & Sewer', 'utilities', between(58, 76), 'expense');
    if (billSettled('b-internet')) add(d(8), 'Fiber Internet 500 Mbps', 'utilities', 79, 'expense');
    if (billSettled('b-mobile')) add(d(18), 'Mobile — 2 lines', 'utilities', 112, 'expense');
    if (billSettled('b-insurance')) add(d(22), 'Car Insurance', 'transport', 146, 'expense');
    if (billSettled('b-streaming')) add(d(9), 'StreamBox Family', 'entertainment', 15.49, 'expense');
    if (billSettled('b-gym')) add(d(3), 'Neighborhood Gym', 'health', 39, 'expense');
    // Groceries: roughly every 4 days
    for (let day = 2; day <= lastDay; day += 3 + Math.floor(rnd() * 3)) {
      add(d(day), pick(GROCERS), 'groceries', between(65, 140), 'expense');
    }
    // Dining: 2-3 times a week
    for (let day = 3; day <= lastDay; day += 2 + Math.floor(rnd() * 3)) {
      add(d(day), pick(EATERIES), 'dining', between(16, 68), 'expense');
    }
    // Transport: fuel weekly, transit monthly, parking now and then
    for (let day = 4; day <= lastDay; day += 7) add(d(day), 'Shell Fuel Station', 'transport', between(38, 62), 'expense');
    add(d(6), 'Metro Transit Pass', 'transport', 34, 'expense');
    if (rnd() < 0.6) add(d(11 + Math.floor(rnd() * 12)), 'Downtown Parking', 'transport', between(9, 18), 'expense');
    // Health: pharmacy + the odd appointment
    add(d(10 + Math.floor(rnd() * 12)), 'CVS Pharmacy', 'health', between(12, 46), 'expense');
    if (rnd() < 0.45) add(d(7 + Math.floor(rnd() * 18)), 'Dental Checkup — Dr. Patel', 'health', between(45, 120), 'expense');
    // Entertainment: movie nights, a book, a game
    if (rnd() < 0.8) add(d(13 + Math.floor(rnd() * 10)), 'Movie Night — Regal Cinema', 'entertainment', between(26, 48), 'expense');
    if (rnd() < 0.5) add(d(5 + Math.floor(rnd() * 20)), 'Bookstore — Chapters', 'entertainment', between(14, 32), 'expense');
    // Shopping: clothes, home bits
    for (let i = 0; i < 2 + Math.floor(rnd() * 2); i++) {
      add(d(4 + Math.floor(rnd() * (lastDay - 4))), pick(['Target — Household', 'Old Navy — Kids Clothes', 'Hardware Store', 'Amazon — Home Goods']), 'shopping', between(24, 138), 'expense');
    }
    // Kids & school
    add(d(2), 'School Lunch Account', 'kids', between(40, 60), 'expense');
    if (rnd() < 0.8) add(d(9 + Math.floor(rnd() * 14)), pick(['Soccer Club Fee', 'Piano Lessons', 'Art Supplies — School']), 'kids', between(28, 95), 'expense');
    // Occasional other
    if (rnd() < 0.5) add(d(16 + Math.floor(rnd() * 9)), 'Birthday Gift — Grandma', 'other', between(25, 60), 'expense');
  }
  // A few November specifics so the current month reads like real life
  add('2026-11-07', 'Thanksgiving Grocery Stock-up', 'groceries', 164.36, 'expense');
  add('2026-11-21', 'Winter Coats — Kids', 'shopping', 156.8, 'expense');
  add('2026-11-24', 'Flu Shots — Family', 'health', 60, 'expense');
  txs.sort((a, b) => (a.date < b.date ? 1 : -1));
  return txs;
}

function seed() {
  return {
    version: 1,
    household: 'Rivera Household',
    budgets: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.budget])),
    bills: seedBills(),
    goals: seedGoals(),
    transactions: seedTransactions(),
    // bills paid in a given month: { '2026-11': ['b-rent', ...] }
    paidBills: { '2026-11': ['b-rent', 'b-electric', 'b-water', 'b-internet', 'b-mobile', 'b-streaming', 'b-gym'] },
  };
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.version === 1 && Array.isArray(data.transactions)) return data;
    }
  } catch { /* corrupted storage: reseed */ }
  const data = seed();
  saveStore(data);
  return data;
}

export function saveStore(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function resetStore() {
  const data = seed();
  saveStore(data);
  return data;
}

export function categoryName(id) {
  const c = CATEGORIES.find((x) => x.id === id) || INCOME_CATEGORIES.find((x) => x.id === id);
  return c ? c.name : id;
}
export function categoryColor(id) {
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? c.color : '#8a8f98';
}
export function monthTx(data, ym) {
  return data.transactions.filter((t) => t.date.startsWith(ym));
}
export function monthTotals(data, ym) {
  let income = 0, expense = 0;
  for (const t of data.transactions) {
    if (!t.date.startsWith(ym)) continue;
    if (t.type === 'income') income += t.amount; else expense += t.amount;
  }
  return { income, expense, remaining: income - expense, savingsRate: income > 0 ? (income - expense) / income : 0 };
}
export function spentByCategory(data, ym) {
  const out = {};
  for (const t of data.transactions) {
    if (t.type !== 'expense' || !t.date.startsWith(ym)) continue;
    out[t.category] = (out[t.category] || 0) + t.amount;
  }
  return out;
}
export function isBillPaid(data, billId, ym) {
  return (data.paidBills[ym] || []).includes(billId);
}
export function billStatus(data, bill, ym) {
  const todayDay = Number(TODAY.slice(8, 10));
  if (isBillPaid(data, bill.id, ym)) return 'paid';
  if (ym === CURRENT_MONTH && bill.dueDay < todayDay) return 'overdue';
  return 'upcoming';
}
