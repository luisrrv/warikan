import './style.css';
import { detectLang, getLang, setLang, t, onLangChange, type StringKey } from './i18n';
import { splitBill, type SplitResult } from './calc';

// ---------- DOM lookup ----------

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`Missing element: ${sel}`);
  return el;
};

const totalInput = $<HTMLInputElement>('#total');
const peopleInput = $<HTMLInputElement>('#people');
const resultEl = $<HTMLSpanElement>('#result');
const shareBtn = $<HTMLButtonElement>('#share');
const langBtns = document.querySelectorAll<HTMLButtonElement>('.lang-btn');

// ---------- App state ----------
// Single source of truth. All UI updates funnel through render().

const state = {
  total: NaN,
  people: NaN,
  result: null as SplitResult | null,
};

// ---------- i18n wiring ----------

setLang(detectLang());

function applyTranslations(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n as StringKey | undefined;
    if (key) el.textContent = t(key);
  });

  totalInput.placeholder = t('placeholderTotal');
  peopleInput.placeholder = t('placeholderPeople');

  langBtns.forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === getLang()));
  });

  document.documentElement.lang = getLang();
 
  syncSuffixPadding();	
}

function syncSuffixPadding(): void {
  document.querySelectorAll<HTMLElement>('.input-wrap').forEach((wrap) => {
    const suffix = wrap.querySelector<HTMLElement>('.suffix');
    if (!suffix) return;
    // suffix sits 14px from the right edge; pad input by suffix width + that gap + breathing room
    const pad = Math.ceil(suffix.getBoundingClientRect().width) + 14 + 8;
    wrap.style.setProperty('--suffix-pad', `${pad}px`);
  });
}

onLangChange(applyTranslations);
window.addEventListener('resize', syncSuffixPadding);
applyTranslations();

langBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const lang = btn.dataset.lang;
    if (lang === 'ja' || lang === 'en') setLang(lang);
  });
});

// ---------- Input handling ----------
// Strip everything that isn't a digit. Keeps the model strictly numeric
// while letting the user type with any formatting they want.

function parseNumeric(raw: string): number {
  const cleaned = raw.replace(/[^\d]/g, '');
  return cleaned === '' ? NaN : Number(cleaned);
}

function formatThousands(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '';
}

function onTotalInput(): void {
  const n = parseNumeric(totalInput.value);
  state.total = n;
  // Reformat without breaking the cursor: only reformat on blur or when content actually changed.
  // For v1 we accept that the cursor jumps to the end on reformat — acceptable tradeoff for simplicity.
  const formatted = formatThousands(n);
  if (totalInput.value !== formatted) totalInput.value = formatted;
  recompute();
}

function onPeopleInput(): void {
  state.people = parseNumeric(peopleInput.value);
  recompute();
}

totalInput.addEventListener('input', onTotalInput);
peopleInput.addEventListener('input', onPeopleInput);

// ---------- Compute + render ----------

function recompute(): void {
  state.result = splitBill(state.total, state.people);
  render();
}

function render(): void {
  if (state.result) {
    resultEl.textContent = formatYen(state.result.perPerson);
    shareBtn.disabled = false;
  } else {
    resultEl.textContent = '—';
    shareBtn.disabled = true;
  }
}

function formatYen(n: number): string {
  return `¥${n.toLocaleString('en-US')}`;
}

// ---------- Share button (placeholder) ----------
// Real LIFF integration lands in the next step. Wire the click now so we have a
// hookable button; v1's share.ts will replace the body of this handler.

shareBtn.addEventListener('click', () => {
  if (!state.result) return;
  console.log('share clicked, would send:', state.result);
  alert(`v1 share placeholder: ¥${state.result.perPerson} × ${state.result.people}人`);
});
