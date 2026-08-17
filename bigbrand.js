/* 大牌数据看板 */
var bigBrandData = null, bbActiveBrand = null, bbActiveCat = '', bbSortBy = 'default', bbLoading = false, bbCallbacks = [], bbFromGoPage = false;
var bbPage = 1, bbPageSize = 50;
var _bbWidgetsInit = false;

function bbOnLoad(cb) {
  if (bigBrandData) { cb(); return; }
  bbCallbacks.push(cb);
  if (bbLoading) return;
  bbLoading = true;
  fetch('bigbrand_data.json?v=4')
    .then(function(r) { return r.json(); })
    .then(function(d) { bigBrandData = d; bbLoading = false; var q = bbCallbacks; bbCallbacks = []; q.forEach(function(f) { f(); }); })
    .catch(function() { bigBrandData = []; bbLoading = false; var q = bbCallbacks; bbCallbacks = []; q.forEach(function(f) { f(); }); });
}

function bbPrice(p) { return p.sale_price || p.price || 0; }

// Category extraction (non-overlapping, best-match)
function bbCat(name) {
  if (!name) return 'Other';
  var n = name.toLowerCase();
  // Order matters: more specific first
  if (/\bwall units?\b/.test(n)) return 'Bookshelf';
  if (/\bdesks?\b|\bworkstations?\b|\bworktables?\b|\bsecretary\b|\breturns?\b/.test(n)) return 'Desk';
  if (/\bbookcases?\b|\bbookshel(?:f|ves)\b|\bbook shel(?:f|ves)\b|\bshelving\b|\bshel(?:f|ves)\b|\bétagères?\b|\betageres?\b|\bledges?\b|\btowers?\b|\bback panels?\b/.test(n)) return 'Bookshelf';
  if (/\bsideboards?\b|\bbuffets?\b|\bcredenzas?\b/.test(n)) return 'Sideboard';
  if (/\bfiling\b|\bfiles?\b|\bpedestals?\b/.test(n)) return 'File Cabinet';
  if (/\bhutch(?:es)?\b/.test(n)) return 'Hutch';
  if (/\bdressers?\b|\bdrawer chests?\b|\btall chests?\b|\blow chests?\b|\bdresser\b/.test(n)) return 'Dresser';
  if (/\bchest(?:s)? of drawers\b|\bchests?\b/.test(n)) return 'Chest';
  if (/\bcabinets?\b|\bstorage\b|\barmoires?\b|\bwardrobes?\b|\blockers?\b|\bentertainment (?:centers?|piers?)\b/.test(n)) return 'Cabinet';
  if (/\blamps?\b|\blighting\b|\bchandeliers?\b|\bsconces?\b/.test(n)) return 'Lamp';
  if (/\bconsoles?\b/.test(n)) return 'Console Table';
  if (/\bside tables?\b|\bc-tables?\b|\bc-shaped\b|\bnest(?:ing)? tables?\b|\bend tables?\b|\bpersonal tables?\b/.test(n)) return 'Side Table';
  if (/\bdining tables?\b/.test(n)) return 'Dining Table';
  if (/\bconference tables?\b|\bmeeting tables?\b|\bcommunal tables?\b/.test(n)) return 'Conference Table';
  if (/\btables?\b|\bvanit(?:y|ies)\b|\bnightstands?\b/.test(n)) return 'Table';
  if (/\bchairs?\b|\bstools?\b|\bbench(?:es)?\b|\bottomans?\b|\bseats?\b|\bseating\b/.test(n)) return 'Chair';
  if (/\bsofas?\b|\bloveseats?\b|\bsectionals?\b|\bcouch(?:es)?\b/.test(n)) return 'Sofa';
  if (/\bbeds?\b|\bheadboards?\b/.test(n)) return 'Bed';
  if (/\bmirrors?\b/.test(n)) return 'Mirror';
  if (/\brugs?\b|\bcarpets?\b/.test(n)) return 'Rug';
  if (/\bmodular\b|\bsuites?\b|\bsystems?\b/.test(n)) return 'Modular';
  if (/\bcarts?\b|\btrolley\b|\btrolleys?\b|\bbar carts?\b/.test(n)) return 'Cart';
  if (/\bdividers?\b|\bscreens?\b|\bpartitions?\b/.test(n)) return 'Room Divider';
  return 'Other';
}

// Size extraction
function bbSize(name) {
  if (!name) return '';
  var m = name.match(/(\d+\.?\d*)\s*[""″]\s*-\s*(\d+\.?\d*)\s*[""″]/);
  if (m) return m[1] + '" - ' + m[2] + '"';
  m = name.match(/(\d+\.?\d*)\s*[""″]\s*[xX×]\s*(\d+\.?\d*)\s*[""″]/);
  if (m) return m[1] + '" x ' + m[2] + '"';
  m = name.match(/(\d+\.?\d*)\s*[""″]/);
  if (m) return m[1] + '"';
  m = name.match(/(\d+\.?\d*)\s*in(?:ch)?\b/i);
  if (m) return m[1] + '"';
  m = name.match(/(\d+\.?\d*)-inch/i);
  if (m) return m[1] + '"';
  return '';
}

// Material extraction
function bbMat(name) {
  if (!name) return '';
  var map = {
    'Wood': /wood/i, 'Oak': /oak/i, 'Acacia': /acacia/i, 'Walnut': /walnut/i,
    'Marble': /marble/i, 'Metal': /metal/i, 'Glass': /glass/i, 'Stone': /stone/i,
    'Leather': /leather/i, 'Linen': /linen/i, 'Velvet': /velvet/i, 'Brass': /brass/i,
    'Iron': /iron/i, 'Steel': /steel/i, 'Resin': /resin/i, 'Concrete': /concrete/i,
    'Ceramic': /ceramic/i, 'Teak': /teak/i, 'Cane': /cane/i, 'Rattan': /rattan/i,
    'Mango': /mango/i, 'Birch': /birch/i, 'Ash Wood': /ash/i, 'Elm': /elm/i,
    'Pine': /pine/i, 'Bamboo': /bamboo/i, 'Cement': /cement/i,
    'Wool': /\bwool\b/i, 'Boucle': /boucl[eé]/i, 'Mohair': /mohair/i,
    'Shearling': /shearling/i, 'Faux Fur': /faux fur/i, 'Laminate': /laminate/i,
    'Veneer': /veneer/i, 'Seagrass': /seagrass/i, 'Jute': /jute/i, 'Rush': /\brush\b/i
  };
  var found = [];
  for (var k in map) {
    if (map[k].test(name)) found.push(k);
  }
  return found.slice(0, 2).join(', ');
}

// Sort handler
function bbSort(col) {
  if (bbSortBy === col + '_asc') bbSortBy = col + '_desc';
  else bbSortBy = col + '_asc';
  bbPage = 1;
  renderBigBrand();
}

// Page navigation
function bbGoPage(n) {
  bbPage = n;
  bbFromGoPage = true;
  renderBigBrand();
}

// Populate brand & category select options
function bbPopulateFilters() {
  var A = bigBrandData;
  if (!A || !A.length) return;

  // Brand options
  var brandSel = document.getElementById('bbBrand');
  if (brandSel) {
    var brands = [], seenB = {};
    A.forEach(function(p) { if (!seenB[p.brand]) { seenB[p.brand] = true; brands.push(p.brand); } });
    brands.sort();
    brandSel.innerHTML = brands.map(function(b) { var n = 0; A.forEach(function(p) { if (p.brand === b) n++; }); return '<option value="' + b.replace(/"/g, '&quot;') + '">' + b + ' (' + n + ')</option>'; }).join('');
  }

  // Category options
  var catSel = document.getElementById('bbCat');
  if (catSel) {
    var catOrder = ['Desk','Bookshelf','Dresser','Chest','Cabinet','File Cabinet','Sideboard','Hutch','Console Table','Table','Side Table','Dining Table','Conference Table','Chair','Sofa','Bed','Lamp','Modular','Mirror','Rug','Cart','Room Divider','Other'];
    var cats = {};
    catOrder.forEach(function(c) { cats[c] = 0; });
    A.forEach(function(p) { var c = bbCat(p.name); cats[c] = (cats[c] || 0) + 1; });
    catSel.innerHTML = catOrder.map(function(c) { if (cats[c] > 0) return '<option value="' + c + '">' + c + ' (' + cats[c] + ')</option>'; return ''; }).join('');
  }

  // Init widgets once
  if (!_bbWidgetsInit) {
    _bbWidgetsInit = true;
    if (typeof initSelectWidget === 'function') {
      initSelectWidget('bbBrand', true);
      initSelectWidget('bbCat', true);
    }
  } else {
    if (typeof refreshSelectUI === 'function') {
      refreshSelectUI('bbBrand');
      refreshSelectUI('bbCat');
    }
  }
}

function renderBigBrand() {
  bbOnLoad(function() {
    var A = bigBrandData;
    var tbody = document.getElementById('bb-tbody');
    if (!A || !A.length) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:var(--t3);padding:60px">数据加载失败</td></tr>';
      return;
    }

    // Populate / refresh select widgets
    bbPopulateFilters();

    var search = (document.getElementById('bb-search') ? document.getElementById('bb-search').value : '').toLowerCase();
    var bandEl = document.getElementById('bb-band'), band = bandEl ? bandEl.value : '';

    // Read multi-select filter values
    var selBrands = typeof getSelectVal === 'function' ? getSelectVal('bbBrand') : [];
    var selCats = typeof getSelectVal === 'function' ? getSelectVal('bbCat') : [];

    // Filter
    var D = A.slice();
    if (selBrands && selBrands.length) D = D.filter(function(p) { return selBrands.includes(p.brand); });
    if (selCats && selCats.length) D = D.filter(function(p) { return selCats.includes(bbCat(p.name)); });
    // Reset page only when not navigating pages
    var wasPageNav = bbFromGoPage;
    if (!bbFromGoPage) { bbPage = 1; }
    bbFromGoPage = false;
    if (band) {
      D = D.filter(function(p) { return p.upload_time === band; });
    }
    if (search) D = D.filter(function(p) {
      return p.name.toLowerCase().indexOf(search) >= 0 || p.brand.toLowerCase().indexOf(search) >= 0;
    });

    // Sort
    if (bbSortBy === 'price_asc') D.sort(function(a, b) { return bbPrice(a) - bbPrice(b); });
    else if (bbSortBy === 'price_desc') D.sort(function(a, b) { return bbPrice(b) - bbPrice(a); });
    else if (bbSortBy === 'brand_asc') D.sort(function(a, b) { return a.brand.localeCompare(b.brand); });
    else if (bbSortBy === 'brand_desc') D.sort(function(a, b) { return b.brand.localeCompare(a.brand); });
    else if (bbSortBy === 'size_asc') D.sort(function(a, b) { return bbSize(a.name).localeCompare(bbSize(b.name)); });
    else if (bbSortBy === 'size_desc') D.sort(function(a, b) { return bbSize(b.name).localeCompare(bbSize(a.name)); });
    else if (bbSortBy === 'name_asc') D.sort(function(a, b) { return a.name.localeCompare(b.name); });
    else if (bbSortBy === 'name_desc') D.sort(function(a, b) { return b.name.localeCompare(a.name); });
    else if (bbSortBy === 'cat_asc') D.sort(function(a, b) { return bbCat(a.name).localeCompare(bbCat(b.name)); });
    else if (bbSortBy === 'cat_desc') D.sort(function(a, b) { return bbCat(b.name).localeCompare(bbCat(a.name)); });

    document.getElementById('bb-total').textContent = D.length + ' / ' + A.length + ' 件';

    // Pagination
    var totalPages = Math.ceil(D.length / bbPageSize);
    if (bbPage > totalPages) bbPage = totalPages;
    if (bbPage < 1) bbPage = 1;
    var start = (bbPage - 1) * bbPageSize;
    var pageItems = D.slice(start, start + bbPageSize);

    // Table
    if (!tbody) return;
    tbody.innerHTML = pageItems.map(function(p) {
      var dp = p.sale_price || 0, rp = p.price || 0;
      var priceHtml = dp > 0 ? '<span class="bb-sale">$' + dp.toLocaleString() + '</span>' + (rp > dp ? ' <span class="bb-orig">$' + rp.toLocaleString() + '</span>' : '') : (rp > 0 ? '$' + rp.toLocaleString() : '');
      return '<tr>' +
        '<td class="bb-td-img"><img src="' + (p.image || '') + '" loading="lazy" onerror="this.style.display=\'none\'" onclick="event.stopPropagation();showModal(this.src)" style="cursor:pointer" title="点击放大"></td>' +
        '<td>' + p.brand + '</td>' +
        '<td class="bb-td-name"><a href="' + (p.link || '#') + '" target="_blank" title="' + p.name.replace(/"/g, '&quot;') + '">' + p.name + '</a></td>' +
        '<td>' + bbCat(p.name) + '</td>' +
        '<td>' + bbSize(p.name) + '</td>' +
        '<td>' + bbMat(p.name) + '</td>' +
        '<td class="bb-td-price">' + priceHtml + '</td>' +
        '<td style="text-align:center">' + (p.link ? '<a href="' + p.link + '" target="_blank" class="bb-link">🔗</a>' : '') + '</td>' +
        '<td></td>' +
        '<td style="text-align:center;font-size:11px;color:var(--t2)">' + (p.upload_time || '') + '</td>' +
        '</tr>';
    }).join('');
    // Add column resize handles
    if (typeof addHandles === 'function') addHandles();

    // Pagination controls
    var pager = document.getElementById('bb-pager');
    if (pager && totalPages > 1) {
      var ph = '<span style="font-size:12px;color:var(--t3);margin-right:8px">' + D.length + ' 件 | 第 ' + bbPage + '/' + totalPages + ' 页</span>';
      if (bbPage > 1) ph += '<button class="btn" onclick="bbGoPage(' + (bbPage-1) + ')" style="font-size:11px">◀ 上一页</button>';
      for (var i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= bbPage - 2 && i <= bbPage + 2)) {
          ph += '<button class="btn' + (i === bbPage ? ' primary' : '') + '" onclick="bbGoPage(' + i + ')" style="font-size:11px;min-width:32px;padding:4px 8px">' + i + '</button>';
        } else if (i === bbPage - 3 || i === bbPage + 3) {
          ph += '<span style="color:var(--t3)">...</span>';
        }
      }
      if (bbPage < totalPages) ph += '<button class="btn" onclick="bbGoPage(' + (bbPage+1) + ')" style="font-size:11px">下一页 ▶</button>';
      pager.innerHTML = ph;
    } else if (pager) {
      pager.innerHTML = D.length <= bbPageSize ? '' : '<span style="font-size:12px;color:var(--t3)">共 ' + D.length + ' 件</span>';
    }
    // Scroll to top after page change
    if (wasPageNav) {
      var tbl = document.getElementById('bb-table');
      if (tbl && tbl.parentElement) { tbl.parentElement.scrollTop = 0; }
    }
  });
}

// Event delegation
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-band]');
  if (el) { var bv = el.getAttribute('data-band'); var sel = document.getElementById('bb-band'); if (sel) sel.value = bv; renderBigBrand(); return; }
  el = e.target.closest('[data-sort]');
  if (el) { bbSort(el.getAttribute('data-sort')); return; }
});
