/* =======================================================
   KONFIGURASI SUPABASE
   ======================================================= */
const SUPABASE_URL = "https://ogmiecjmxnfcgjxjkrkt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_VEtowyIjRdeeQzmrJ4B2DQ_D8zzVhPF";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let pockets = [];
let transactions = [];
let isRegisterMode = false;
let txType = "PENGELUARAN";
let txFilter = "ALL";
let editingPocketId = null;
let editingTxId = null;

const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

/* ---------------- ANIMASI: angka berjalan (count-up) ---------------- */
function animateNumber(el, target){
  if(!el) return;
  const prev = Number(el.dataset.rawValue || 0);
  target = Number(target || 0);
  el.dataset.rawValue = target;
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    el.textContent = rupiah(target);
    return;
  }
  const duration = 700;
  const startTime = performance.now();
  function step(now){
    const p = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = Math.round(prev + (target - prev) * eased);
    el.textContent = rupiah(val);
    if(p < 1) requestAnimationFrame(step);
    else el.textContent = rupiah(target);
  }
  requestAnimationFrame(step);
}

/* ---------------- ANIMASI: top loading bar saat memuat data ---------------- */
function showLoadingBar(){
  const bar = document.getElementById('loadingBar');
  if(!bar) return;
  bar.classList.remove('hidden');
  bar.style.width = '18%';
  clearTimeout(bar._t);
  bar._t = setTimeout(() => { bar.style.width = '68%'; }, 160);
}
function hideLoadingBar(){
  const bar = document.getElementById('loadingBar');
  if(!bar) return;
  bar.style.width = '100%';
  clearTimeout(bar._t);
  setTimeout(() => bar.classList.add('hidden'), 260);
  setTimeout(() => { bar.style.width = '0%'; }, 560);
}

/* ---------------- ANIMASI: efek ripple pada tombol ---------------- */
function setupRippleEffect(){
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-primary, .btn-secondary, .close-btn, .fab, .tab');
    if(!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}

/* ---------------- SIMPLE MINIMALIST LINE ICONS ---------------- */
function svgIcon(path, size, strokeWidth){
  size = size || 20;
  strokeWidth = strokeWidth || 2;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}
const ICONS = {
  home: svgIcon('<path d="M4 10.5 12 4l8 6.5"/><path d="M6 9.5V19a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1V9.5"/>'),
  wallet: svgIcon('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14" r="1"/>'),
  clock: svgIcon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
  settings: svgIcon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/>'),
  arrowDown: svgIcon('<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>', 16),
  arrowUp: svgIcon('<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>', 16),
  swap: svgIcon('<path d="m17 3 4 4-4 4"/><path d="M21 7H9"/><path d="m7 21-4-4 4-4"/><path d="M3 17h12"/>', 16),
  trash: svgIcon('<path d="M5 7h14"/><path d="M10 11v5"/><path d="M14 11v5"/><path d="M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12"/><path d="M9.5 7V4.8A.8.8 0 0 1 10.3 4h3.4a.8.8 0 0 1 .8.8V7"/>', 15, 1.6),
  edit: svgIcon('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>', 15, 1.6),
  plus: svgIcon('<path d="M12 5v14"/><path d="M5 12h14"/>', 24),
  close: svgIcon('<path d="M6 6l12 12"/><path d="M18 6 6 18"/>', 16)
};

function paintIcons(root){
  (root || document).querySelectorAll('[data-icon]').forEach(el=>{
    const name = el.getAttribute('data-icon');
    if(ICONS[name]) el.innerHTML = ICONS[name];
  });
}

/* ---------------- AUTH ---------------- */
function toggleAuthMode(){
  isRegisterMode = !isRegisterMode;
  document.getElementById('authTitle').textContent = isRegisterMode ? "Buat akun baru" : "Masuk ke akun kamu";
  document.getElementById('authSubmitBtn').textContent = isRegisterMode ? "Daftar" : "Masuk";
  document.getElementById('authToggleBtn').textContent = isRegisterMode ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar";
}

async function handleAuthSubmit(){
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errEl = document.getElementById('authError');
  errEl.textContent = "";
  if(!email || !password){ errEl.textContent = "Email dan password wajib diisi."; return; }

  let result;
  if(isRegisterMode){
    result = await sb.auth.signUp({ email, password });
  } else {
    result = await sb.auth.signInWithPassword({ email, password });
  }
  if(result.error){ errEl.textContent = result.error.message; return; }

  if(isRegisterMode && result.data.user && !result.data.session){
    errEl.style.color = "var(--green)";
    errEl.textContent = "Cek email kamu untuk verifikasi, lalu login.";
    return;
  }
  await onLoggedIn(result.data.session.user);
}

async function logout(){
  await sb.auth.signOut();
  location.reload();
}

async function onLoggedIn(user){
  currentUser = user;
  document.getElementById('authView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');
  document.getElementById('bottomNav').classList.remove('hidden');
  document.getElementById('fabBtn').classList.remove('hidden');
  document.getElementById('greeting').textContent = "Halo, " + user.email.split('@')[0] + "!";
  document.getElementById('userEmailLabel').textContent = user.email;
  await loadData();
}

/* ---------------- NAVIGATION ---------------- */
function showView(id){
  ['homeView','pocketsView','historyView','settingsView'].forEach(v=>{
    const el = document.getElementById(v);
    const isActive = v===id;
    el.classList.toggle('hidden', !isActive);
    if(isActive){
      el.classList.remove('view-fade');
      void el.offsetWidth; /* restart animasi transisi */
      el.classList.add('view-fade');
    }
  });
  document.querySelectorAll('#bottomNav .item').forEach(el=>{
    el.classList.toggle('active', el.dataset.v===id);
  });
  document.querySelectorAll('#sideNav .side-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.v===id);
  });
  if(id==='historyView') renderHistory();
}

function closeModal(id){ document.getElementById(id).classList.add('hidden'); }

/* ---------------- LOAD DATA ---------------- */
async function loadData(){
  showLoadingBar();

  const { data: pocketData, error: pErr } = await sb.from('pockets').select('*').order('created_at');
  if(!pErr) pockets = pocketData || [];

  const { data: txData, error: tErr } = await sb.from('transactions')
    .select('*').order('created_at', { ascending:false });
  if(!tErr) transactions = txData || [];

  renderAll();
  hideLoadingBar();
}

function renderAll(){
  renderTotals();
  renderPockets();
  renderRecentTx();
  renderHistory();
  renderRightPanel();
  fillPocketSelects();
  paintIcons();
}

function renderTotals(){
  const total = pockets.reduce((s,p)=>s+Number(p.balance),0);
  const income = transactions.filter(t=>t.type==='PEMASUKAN').reduce((s,t)=>s+Number(t.amount),0);
  const expense = transactions.filter(t=>t.type==='PENGELUARAN').reduce((s,t)=>s+Number(t.amount),0);
  animateNumber(document.getElementById('totalBalance'), total);
  animateNumber(document.getElementById('totalIncome'), income);
  animateNumber(document.getElementById('totalExpense'), expense);
}

function pocketCardHTML(p, withActions){
  return `
  <div class="pocket">
    <span class="badge">${p.type}</span>
    ${withActions ? `
    <div class="pocket-actions">
      <button class="close-btn sm" onclick="openPocketModal('${p.id}')" title="Edit kantong">${ICONS.edit}</button>
      <button class="close-btn sm danger" onclick="deletePocket('${p.id}')" title="Hapus kantong">${ICONS.trash}</button>
    </div>` : ''}
    <div class="pocket-name">${p.name}</div>
    <div class="pocket-code">${p.code}</div>
    <div class="sisa">Sisa saldo</div>
    <div class="pocket-balance">${rupiah(p.balance)}</div>
  </div>`;
}

function renderPockets(){
  document.getElementById('pocketsPreview').innerHTML =
    pockets.slice(0,4).map(p=>pocketCardHTML(p,false)).join('') || `<div class="empty">Belum ada kantong</div>`;
  document.getElementById('pocketsFull').innerHTML =
    pockets.map(p=>pocketCardHTML(p,true)).join('') || `<div class="empty">Belum ada kantong</div>`;
}

function txIconAndSign(t){
  if(t.type==='PEMASUKAN') return {icon:ICONS.arrowDown, cls:'in', sign:'+', amtCls:'pos'};
  if(t.type==='PENGELUARAN') return {icon:ICONS.arrowUp, cls:'out', sign:'-', amtCls:'neg'};
  return {icon:ICONS.swap, cls:'out', sign:'', amtCls:'neg'};
}

function txRowHTML(t){
  const pocket = pockets.find(p=>p.id===t.pocket_id);
  const {icon,cls,sign,amtCls} = txIconAndSign(t);
  const dateStr = new Date(t.created_at).toLocaleDateString('id-ID',{day:'2-digit',month:'short'});
  return `
  <div class="tx">
    <div class="icon ${cls}">${icon}</div>
    <div class="tx-info">
      <div class="tx-title">${t.note || t.category || t.type}</div>
      <div class="tx-sub">${t.category || ''} • ${dateStr}${pocket ? ' • '+pocket.name : ''}</div>
    </div>
    <div class="tx-amount ${amtCls}">${sign} ${rupiah(t.amount)}</div>
    <div class="tx-actions">
      <button class="close-btn sm danger" onclick="deleteTransaction('${t.id}')" title="Hapus mutasi">${ICONS.trash}</button>
    </div>
  </div>`;
}

function renderRecentTx(){
  document.getElementById('txPreview').innerHTML =
    transactions.slice(0,4).map(txRowHTML).join('') || `<div class="empty">Belum ada mutasi</div>`;
}

function setTxFilter(f){
  txFilter = f;
  document.querySelectorAll('#historyView .tab').forEach(t=>t.classList.toggle('active', t.dataset.filter===f));
  renderHistory();
}

function renderHistory(){
  const q = (document.getElementById('searchTx')?.value || '').toLowerCase();
  let list = transactions;
  if(txFilter!=='ALL') list = list.filter(t=>t.type===txFilter);
  if(q) list = list.filter(t => (t.note||'').toLowerCase().includes(q) || (t.category||'').toLowerCase().includes(q));
  document.getElementById('historyList').innerHTML =
    list.map(txRowHTML).join('') || `<div class="empty">Tidak ada transaksi</div>`;
}

function renderRightPanel(){
  const rp = document.getElementById('rightPockets');
  if(rp){
    rp.innerHTML = pockets.slice(0,5).map(p=>`
      <div class="mini-row"><span>${p.name}</span><span class="mini-row-amt">${rupiah(p.balance)}</span></div>
    `).join('') || `<div class="empty">Belum ada kantong</div>`;
  }
  const rc = document.getElementById('rightCategories');
  if(rc){
    const catTotals = {};
    transactions.filter(t=>t.type==='PENGELUARAN').forEach(t=>{
      const c = t.category || 'Lainnya';
      catTotals[c] = (catTotals[c]||0) + Number(t.amount);
    });
    const sorted = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).slice(0,5);
    rc.innerHTML = sorted.map(([cat,amt])=>`
      <div class="mini-row"><span>${cat}</span><span class="mini-row-amt">${rupiah(amt)}</span></div>
    `).join('') || `<div class="empty">Belum ada pengeluaran</div>`;
  }
}

function fillPocketSelects(){
  const opts = pockets.map(p=>`<option value="${p.id}">${p.name} (${rupiah(p.balance)})</option>`).join('');
  document.getElementById('txPocket').innerHTML = opts;
  document.getElementById('txFromPocket').innerHTML = opts;
  document.getElementById('txToPocket').innerHTML = opts;
}

/* ---------------- POCKET CRUD ---------------- */
function openPocketModal(id){
  editingPocketId = id || null;
  document.getElementById('pocketError').textContent = '';

  if(editingPocketId){
    const p = pockets.find(x=>x.id===editingPocketId);
    if(!p){ editingPocketId = null; return; }
    document.getElementById('pocketName').value = p.name;
    document.getElementById('pocketType').value = p.type;
    document.getElementById('pocketInitialBalance').value = p.balance;
    document.getElementById('pocketModalTitle').textContent = 'Edit kantong';
    document.getElementById('pocketBalanceLabel').textContent = 'Saldo saat ini (Rp)';
    document.getElementById('pocketSubmitBtn').textContent = 'Simpan perubahan';
  } else {
    document.getElementById('pocketName').value = '';
    document.getElementById('pocketType').value = 'BAYAR';
    document.getElementById('pocketInitialBalance').value = '';
    document.getElementById('pocketModalTitle').textContent = 'Tambah kantong';
    document.getElementById('pocketBalanceLabel').textContent = 'Saldo awal (Rp)';
    document.getElementById('pocketSubmitBtn').textContent = 'Buat kantong';
  }
  document.getElementById('pocketModal').classList.remove('hidden');
}

async function submitPocket(){
  const name = document.getElementById('pocketName').value.trim();
  const type = document.getElementById('pocketType').value;
  const balanceVal = Number(document.getElementById('pocketInitialBalance').value || 0);
  const errEl = document.getElementById('pocketError');
  if(!name){ errEl.textContent = "Nama kantong wajib diisi."; return; }

  if(editingPocketId){
    const { error } = await sb.from('pockets').update({ name, type, balance: balanceVal }).eq('id', editingPocketId);
    if(error){ errEl.textContent = error.message; return; }
  } else {
    const code = 'PKT-' + Math.floor(100000 + Math.random()*899999);
    const { error } = await sb.from('pockets').insert({
      user_id: currentUser.id, name, code, type, balance: balanceVal
    });
    if(error){ errEl.textContent = error.message; return; }
  }
  editingPocketId = null;
  closeModal('pocketModal');
  await loadData();
}

async function deletePocket(id){
  if(!confirm('Hapus kantong ini? Semua mutasi terkait juga akan terhapus.')) return;
  await sb.from('pockets').delete().eq('id', id);
  await loadData();
}

/* ---------------- TRANSACTION CRUD ---------------- */
function openTxModal(id){
  editingTxId = id || null;
  document.getElementById('txError').textContent = '';

  if(editingTxId){
    const t = transactions.find(x=>x.id===editingTxId);
    if(!t){ editingTxId = null; return; }
    document.getElementById('txAmount').value = t.amount;
    document.getElementById('txCategory').value = t.category || '';
    document.getElementById('txNote').value = t.note || '';
    setTxType(t.type);
    if(t.type === 'TRANSFER'){
      document.getElementById('txFromPocket').value = t.pocket_id;
      document.getElementById('txToPocket').value = t.related_pocket_id;
    } else {
      document.getElementById('txPocket').value = t.pocket_id;
    }
    document.getElementById('txModalTitle').textContent = 'Edit mutasi';
    document.getElementById('txSubmitBtn').textContent = 'Simpan perubahan';
  } else {
    document.getElementById('txAmount').value = '';
    document.getElementById('txCategory').value = '';
    document.getElementById('txNote').value = '';
    setTxType('PENGELUARAN');
    document.getElementById('txModalTitle').textContent = 'Tambah mutasi';
    document.getElementById('txSubmitBtn').textContent = 'Kirim mutasi';
  }
  document.getElementById('txModal').classList.remove('hidden');
}

function setTxType(type){
  txType = type;
  document.querySelectorAll('#txModal .tab').forEach(t=>t.classList.toggle('active', t.dataset.type===type));
  document.getElementById('txSinglePocketWrap').classList.toggle('hidden', type==='TRANSFER');
  document.getElementById('txTransferWrap').classList.toggle('hidden', type!=='TRANSFER');
}

/* Undo the balance effect of an existing transaction (used before edit/delete) */
async function reverseTransactionEffect(t) {
  const { data: currentPockets } = await sb.from('pockets').select('*');
  const list = currentPockets || pockets;

  if (t.type === 'PEMASUKAN') {
    const p = list.find(x => x.id === t.pocket_id);
    if (p) {
      await sb.from('pockets').update({ balance: Number(p.balance) - Number(t.amount) }).eq('id', t.pocket_id);
    }
  } else if (t.type === 'PENGELUARAN') {
    const p = list.find(x => x.id === t.pocket_id);
    if (p) {
      await sb.from('pockets').update({ balance: Number(p.balance) + Number(t.amount) }).eq('id', t.pocket_id);
    }
  } else if (t.type === 'TRANSFER') {
    const pFrom = list.find(x => x.id === t.pocket_id);
    const pTo = list.find(x => x.id === t.related_pocket_id);
    if (pFrom) {
      await sb.from('pockets').update({ balance: Number(pFrom.balance) + Number(t.amount) }).eq('id', t.pocket_id);
    }
    if (pTo) {
      await sb.from('pockets').update({ balance: Number(pTo.balance) - Number(t.amount) }).eq('id', t.related_pocket_id);
    }
  }
}

/* Apply transaction effect to pocket balance */
async function applyTransactionEffect(type, amount, pocketId, relatedPocketId) {
  const { data: currentPockets } = await sb.from('pockets').select('*');
  const list = currentPockets || pockets;

  if (type === 'PEMASUKAN') {
    const p = list.find(x => x.id === pocketId);
    if (p) {
      await sb.from('pockets').update({ balance: Number(p.balance) + amount }).eq('id', pocketId);
    }
  } else if (type === 'PENGELUARAN') {
    const p = list.find(x => x.id === pocketId);
    if (p) {
      await sb.from('pockets').update({ balance: Number(p.balance) - amount }).eq('id', pocketId);
    }
  } else if (type === 'TRANSFER') {
    const pFrom = list.find(x => x.id === pocketId);
    const pTo = list.find(x => x.id === relatedPocketId);
    if (pFrom) {
      await sb.from('pockets').update({ balance: Number(pFrom.balance) - amount }).eq('id', pocketId);
    }
    if (pTo) {
      await sb.from('pockets').update({ balance: Number(pTo.balance) + amount }).eq('id', relatedPocketId);
    }
  }
}

async function submitTransaction() {
  const amount = Number(document.getElementById('txAmount').value);
  const category = document.getElementById('txCategory').value.trim();
  const note = document.getElementById('txNote').value.trim();
  const errEl = document.getElementById('txError');
  errEl.textContent = '';

  if (!amount || amount <= 0) {
    errEl.textContent = 'Masukkan jumlah nominal yang valid.';
    return;
  }

  let pocketId = null;
  let relatedPocketId = null;

  if (txType === 'TRANSFER') {
    pocketId = document.getElementById('txFromPocket').value;
    relatedPocketId = document.getElementById('txToPocket').value;
    if (!pocketId || !relatedPocketId) {
      errEl.textContent = 'Pilih kantong asal dan tujuan.';
      return;
    }
    if (pocketId === relatedPocketId) {
      errEl.textContent = 'Kantong asal dan tujuan tidak boleh sama.';
      return;
    }
  } else {
    pocketId = document.getElementById('txPocket').value;
    if (!pocketId) {
      errEl.textContent = 'Pilih kantong terlebih dahulu.';
      return;
    }
  }

  if (editingTxId) {
    const oldTx = transactions.find(t => t.id === editingTxId);
    if (oldTx) {
      await reverseTransactionEffect(oldTx);
    }

    const { error } = await sb.from('transactions').update({
      type: txType,
      amount: amount,
      pocket_id: pocketId,
      related_pocket_id: relatedPocketId,
      category: category,
      note: note
    }).eq('id', editingTxId);

    if (error) {
      errEl.textContent = error.message;
      return;
    }
  } else {
    const { error } = await sb.from('transactions').insert({
      user_id: currentUser.id,
      type: txType,
      amount: amount,
      pocket_id: pocketId,
      related_pocket_id: relatedPocketId,
      category: category,
      note: note
    });

    if (error) {
      errEl.textContent = error.message;
      return;
    }
  }

  await applyTransactionEffect(txType, amount, pocketId, relatedPocketId);

  editingTxId = null;
  closeModal('txModal');
  await loadData();
}

async function deleteTransaction(id) {
  if (!confirm('Apakah kamu yakin ingin menghapus mutasi ini?')) return;
  const t = transactions.find(x => x.id === id);
  if (t) {
    await reverseTransactionEffect(t);
    await sb.from('transactions').delete().eq('id', id);
    await loadData();
  }
}

/* ---------------- EXPORT DATA ---------------- */
function exportCSV() {
  if (!transactions.length) return alert('Tidak ada data transaksi.');
  let csv = 'Tanggal,Tipe,Kategori,Catatan,Jumlah\n';
  transactions.forEach(t => {
    const date = new Date(t.created_at).toISOString().split('T')[0];
    csv += `"${date}","${t.type}","${t.category || ''}","${t.note || ''}",${t.amount}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `mutasi_keuangan_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

function exportExcel() {
  if (!transactions.length) return alert('Tidak ada data transaksi.');
  const data = transactions.map(t => ({
    Tanggal: new Date(t.created_at).toLocaleDateString('id-ID'),
    Tipe: t.type,
    Kategori: t.category || '-',
    Catatan: t.note || '-',
    Jumlah: t.amount
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mutasi");
  XLSX.writeFile(wb, `mutasi_keuangan_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function exportPDF() {
  if (!transactions.length) return alert('Tidak ada data transaksi.');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("Laporan Mutasi Keuangan Ranting", 14, 15);
  
  const tableData = transactions.map(t => [
    new Date(t.created_at).toLocaleDateString('id-ID'),
    t.type,
    t.category || '-',
    t.note || '-',
    rupiah(t.amount)
  ]);

  doc.autoTable({
    head: [['Tanggal', 'Tipe', 'Kategori', 'Catatan', 'Jumlah']],
    body: tableData,
    startY: 20
  });

  doc.save(`mutasi_keuangan_${new Date().toISOString().split('T')[0]}.pdf`);
}

/* ---------------- INITIALIZATION ---------------- */
sb.auth.getSession().then(({ data: { session } }) => {
  if (session) onLoggedIn(session.user);
});

sb.auth.onAuthStateChange((_, session) => {
  if (session && !currentUser) onLoggedIn(session.user);
});

window.addEventListener('DOMContentLoaded', () => {
  paintIcons();
  setupRippleEffect();
});
