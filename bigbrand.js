/* 大牌数据看板 */
var bigBrandData = null, bbActiveBrand = null, bbActiveCat = '', bbSortBy = 'default', bbLoading = false, bbCallbacks = [], bbFromGoPage = false;
var bbPage = 1, bbPageSize = 50;

function bbOnLoad(cb) {
  if (bigBrandData) { cb(); return; }
  bbCallbacks.push(cb);
  if (bbLoading) return;
  bbLoading = true;
  fetch('bigbrand_data.json?v=2')
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
  if (/\bbookcase\b|\bbookshelf\b|\bbook shelf\b|\bshelving\b|\bshelf\b|\bétagère\b|\betagere\b/.test(n)) return 'Bookshelf';
  if (/\bdesk\b|\bwriting desk\b|\bcomputer desk\b|\bstanding desk\b/.test(n)) return 'Desk';
  if (/\bcabinet\b|\bstorage\b|\bdresser\b|\bchest\b|\bsideboard\b|\bhutch\b|\bcredenza\b|\bbuffet\b|\barmoire\b|\bwardrobe\b|\bfiling\b|\bdrawer\b/.test(n)) return 'Storage';
  if (/\btable\b|\bconsole\b|\bvanity\b|\bnightstand\b/.test(n)) return 'Table';
  if (/\bchair\b|\bstool\b|\bbench\b|\bottoman\b|\bseat\b|\bseating\b/.test(n)) return 'Seating';
  if (/\bsofa\b|\bloveseat\b|\bsectional\b|\bcouch\b/.test(n)) return 'Sofa';
  if (/\bbed\b|\bheadboard\b/.test(n)) return 'Bed';
  if (/\bmirror\b/.test(n)) return 'Mirror';
  if (/\blamp\b|\blighting\b|\bchandelier\b|\bsconce\b/.test(n)) return 'Lighting';
  if (/\brug\b|\bcarpet\b/.test(n)) return 'Rug';
  if (/\bmodular\b/.test(n)) return 'Modular';
  if (/\bcart\b|\btrolley\b|\bbar cart\b/.test(n)) return 'Cart';
  if (/\bdivider\b|\bscreen\b|\bpartition\b/.test(n)) return 'Room Divider';
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

function renderBigBrand() {
  bbOnLoad(function() {
    var A = bigBrandData;
    var tbody = document.getElementById('bb-tbody');
    if (!A || !A.length) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--t3);padding:60px">数据加载失败</td></tr>';
      return;
    }

    var search = (document.getElementById('bb-search') ? document.getElementById('bb-search').value : '').toLowerCase();
    var bandEl = document.getElementById('bb-band'), band = bandEl ? bandEl.value : '';

    // Filter
    var D = A.slice();
    if (bbActiveBrand) D = D.filter(function(p) { return p.brand === bbActiveBrand; });
    if (bbActiveCat) D = D.filter(function(p) { return bbCat(p.name) === bbActiveCat; });
    // Reset page only when not navigating pages
    if (!bbFromGoPage) { bbPage = 1; }
    bbFromGoPage = false;
    if (band) {
      var bp = band.split('-'), lo = +bp[0], hi = +bp[1];
      D = D.filter(function(p) { var x = bbPrice(p); return x >= lo && x < hi; });
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

    // Brand chips
    var brands = [], seen = {};
    A.forEach(function(p) { if (!seen[p.brand]) { seen[p.brand] = true; brands.push(p.brand); } });
    brands.sort();
    var fhtml = '<span class="bb-chip' + (bbActiveBrand ? '' : ' active') + '" data-bb="">全部品牌 (' + A.length + ')</span>';
    brands.forEach(function(b) {
      var n = 0; A.forEach(function(p) { if (p.brand === b) n++; });
      fhtml += '<span class="bb-chip' + (bbActiveBrand === b ? ' active' : '') + '" data-bb="' + b.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '">' + b + '</span>';
    });
    // Category chips
    fhtml += '<span style="margin-left:12px"></span>';
    var cats = {}, catOrder = ['Desk','Bookshelf','Storage','Table','Seating','Sofa','Bed','Modular','Mirror','Lighting','Rug','Cart','Room Divider','Other'];
    var allFiltered = A.slice();
    if (bbActiveBrand) allFiltered = allFiltered.filter(function(p) { return p.brand === bbActiveBrand; });
    if (band) {
      var bp2 = band.split('-'), lo2 = +bp2[0], hi2 = +bp2[1];
      allFiltered = allFiltered.filter(function(p) { var x = bbPrice(p); return x >= lo2 && x < hi2; });
    }
    catOrder.forEach(function(c) { cats[c] = 0; });
    allFiltered.forEach(function(p) { var c = bbCat(p.name); cats[c] = (cats[c] || 0) + 1; });
    fhtml += '<span class="bb-chip cat-chip' + (bbActiveCat === '' ? ' active' : '') + '" data-cat="">全部品类 (' + allFiltered.length + ')</span>';
    catOrder.forEach(function(c) {
      if (cats[c] > 0) {
        fhtml += '<span class="bb-chip cat-chip' + (bbActiveCat === c ? ' active' : '') + '" data-cat="' + c + '">' + c + ' (' + cats[c] + ')</span>';
      }
    });

    var fel = document.getElementById('bb-filters'); if (fel) fel.innerHTML = fhtml;
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
  });
}

// Event delegation
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-bb]');
  if (el) { bbActiveBrand = el.getAttribute('data-bb') || null; renderBigBrand(); return; }
  el = e.target.closest('[data-cat]');
  if (el) { bbActiveCat = el.getAttribute('data-cat') || ''; renderBigBrand(); return; }
  el = e.target.closest('[data-band]');
  if (el) { var bv = el.getAttribute('data-band'); var sel = document.getElementById('bb-band'); if (sel) sel.value = bv; renderBigBrand(); return; }
  el = e.target.closest('[data-sort]');
  if (el) { bbSort(el.getAttribute('data-sort')); return; }
});
