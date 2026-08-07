/* ASIN Analysis Module */
var apData = [], apLoaded = false;
function loadApData(cb) {
  if (apLoaded) { cb(); return; }
  fetch("bookcase_asin_pivot.json")
    .then(function(r) { return r.json(); })
    .then(function(d) { apData = d; apLoaded = true; cb(); })
    .catch(function(e) { apData = []; apLoaded = true; cb(); });
}

function renderAsinPivot() {
  loadApData(function() {
    var D = apData.slice();
    var sEl = document.getElementById("apSearch"), sortEl = document.getElementById("apSort");
    var search = (sEl ? sEl.value : "").toLowerCase(), sort = sortEl ? sortEl.value : "gmv_total";
    if (search) D = D.filter(function(r) {
      return (r.parent_asin || "").toLowerCase().indexOf(search) >= 0
          || (r.brand || "").toLowerCase().indexOf(search) >= 0
          || (r.company || "").toLowerCase().indexOf(search) >= 0;
    });
    if (sort === "gmv_total") D.sort(function(a, b) { return b.gmv_total - a.gmv_total; });
    else if (sort === "gmv_m7") D.sort(function(a, b) { return b.gmv_m7 - a.gmv_m7; });
    else if (sort === "gmv_m6") D.sort(function(a, b) { return b.gmv_m6 - a.gmv_m6; });
    else if (sort === "child_count") D.sort(function(a, b) { return b.child_count - a.child_count; });
    var s = 0; D.forEach(function(r) { s += r.child_count; });
    var sm = document.getElementById("ap-summary");
    if (sm) sm.textContent = D.length + "/" + apData.length + " 組 | " + s + " ASIN";
    var tb = document.getElementById("apTbody");
    if (!tb) return;
    tb.innerHTML = D.map(function(r) {
      var pid = r.parent_asin.replace(/'/g, "\\'");
      var hasKids = r.children && r.children.length > 0;
      var arrow = hasKids ? "<span class='ap-arrow'>▶</span>" : "";
      var rows = "<tr class='ap-parent' data-ap='" + pid + "' onclick=\"apToggle('" + pid + "')\"><td>" + arrow + "</td>";
      rows += "<td><img src='" + (r.image_url || "") + "' style='width:120px;height:120px;object-fit:contain;border-radius:6px;background:#1a2634' onerror=\"this.style.display='none'\" loading='lazy'></td>";
      rows += "<td><a href='https://www.amazon.com/dp/" + r.parent_asin + "' target=_blank>" + r.parent_asin + "</a></td>";
      rows += "<td>" + (r.brand || "") + "</td><td>" + (r.company || "") + "</td>";
      rows += "<td class=price>$" + (r.gmv_m3 || 0).toLocaleString() + "</td>";
      rows += "<td class=price>$" + (r.gmv_m4 || 0).toLocaleString() + "</td>";
      rows += "<td class=price>$" + (r.gmv_m5 || 0).toLocaleString() + "</td>";
      rows += "<td class=price>$" + (r.gmv_m6 || 0).toLocaleString() + "</td>";
      rows += "<td class=price>$" + (r.gmv_m7 || 0).toLocaleString() + "</td>";
      rows += "<td>" + (r.units_m3 || 0).toLocaleString() + "</td>";
      rows += "<td>" + (r.units_m4 || 0).toLocaleString() + "</td>";
      rows += "<td>" + (r.units_m5 || 0).toLocaleString() + "</td>";
      rows += "<td>" + (r.units_m6 || 0).toLocaleString() + "</td>";
      rows += "<td>" + (r.units_m7 || 0).toLocaleString() + "</td>";
      rows += "<td class=gmv>$" + r.gmv_total.toLocaleString() + "</td>";
      rows += "<td>" + r.child_count + "</td></tr>";
      if (hasKids) {
        r.children.forEach(function(c2) {
          rows += "<tr class='ap-child' data-ap='" + pid + "' style='display:none;background:rgba(255,255,255,.02)'>";
          rows += "<td></td><td></td>";
          rows += "<td style='padding-left:20px;font-size:15px'><a href='https://www.amazon.com/dp/" + c2.asin + "' target=_blank>" + c2.asin + "</a></td>";
          rows += "<td>" + (c2.brand || "") + "</td><td>" + (c2.company || "") + "</td>";
          rows += "<td class=price>$" + (c2.gmv_m3 || 0).toLocaleString() + "</td>";
          rows += "<td class=price>$" + (c2.gmv_m4 || 0).toLocaleString() + "</td>";
          rows += "<td class=price>$" + (c2.gmv_m5 || 0).toLocaleString() + "</td>";
          rows += "<td class=price>$" + (c2.gmv_m6 || 0).toLocaleString() + "</td>";
          rows += "<td class=price>$" + (c2.gmv_m7 || 0).toLocaleString() + "</td>";
          rows += "<td>" + (c2.units_m3 || 0).toLocaleString() + "</td>";
          rows += "<td>" + (c2.units_m4 || 0).toLocaleString() + "</td>";
          rows += "<td>" + (c2.units_m5 || 0).toLocaleString() + "</td>";
          rows += "<td>" + (c2.units_m6 || 0).toLocaleString() + "</td>";
          rows += "<td>" + (c2.units_m7 || 0).toLocaleString() + "</td>";
          rows += "<td class=gmv>$" + c2.gmv_total.toLocaleString() + "</td>";
          rows += "<td></td></tr>";
        });
      }
      return rows;
    }).join("");
  });
}

function apToggle(pid) {
  document.querySelectorAll('[data-ap="' + pid + '"]').forEach(function(r) {
    if (r.classList.contains("ap-child")) r.style.display = r.style.display === "none" ? "" : "none";
  });
  var a = document.querySelector('[data-ap="' + pid + '"] .ap-arrow');
  if (a) a.textContent = a.textContent === "▶" ? "▼" : "▶";
}

/* ===== ASIN Monthly Detail ===== */
var amData = [], amLoaded = false, amLoading = false, amCbs = [];
var amPage = 1, amPageSize = 100;

function loadAmData(cb) {
  if (amLoaded) { cb(); return; }
  amCbs.push(cb);
  if (amLoading) return;
  amLoading = true;
  fetch("bookcase_asin_monthly.json?v=7")
    .then(function(r) { return r.json(); })
    .then(function(d) { amData = d; amLoaded = true; amLoading = false; amCbs.forEach(function(c){c()}); amCbs = []; })
    .catch(function(e) { amData = []; amLoaded = true; amLoading = false; amCbs.forEach(function(c){c()}); amCbs = []; });
}

function amGoPage(n) { amPage = n; renderAsinMonthly(); }
function amReset() { amPage = 1; renderAsinMonthly(); }

function amPopulateFilters() {
  if (!amData.length) return;
  var b = {}, c2 = {}, t2 = {}, ss = {}, ys = {};
  amData.forEach(function(r) { if (r.brand) b[r.brand] = 1; if (r.company) c2[r.company] = 1; if (r.listing_date) { var y = String(r.listing_date).slice(0,4); if (y) ys[y] = 1; } });
  // Collect type/style from PA_TYPE_STYLE map
  var pts = window.PA_TYPE_STYLE || {};
  Object.values(pts).forEach(function(v) { if (v.type) t2[v.type] = 1; if (v.style) ss[v.style] = 1; });
  var sel = document.getElementById("amBrand");
  if (sel) { Object.keys(b).sort().forEach(function(v) { if (!sel.querySelector('option[value="' + v + '"]')) { var o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o); } }); }
  sel = document.getElementById("amCompany");
  if (sel) { Object.keys(c2).sort().forEach(function(v) { if (!sel.querySelector('option[value="' + v + '"]')) { var o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o); } }); }
  sel = document.getElementById("amType");
  if (sel) { Object.keys(t2).sort().forEach(function(v) { if (!sel.querySelector('option[value="' + v + '"]')) { var o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o); } }); }
  sel = document.getElementById("amStyle");
  if (sel) { Object.keys(ss).sort().forEach(function(v) { if (!sel.querySelector('option[value="' + v + '"]')) { var o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o); } }); }
  sel = document.getElementById("amYear");
  if (sel) { Object.keys(ys).sort().forEach(function(v) { if (!sel.querySelector('option[value="' + v + '"]')) { var o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o); } }); }
}

function amSparkline(m3,m4,m5,m6,m7){var v=[m3||0,m4||0,m5||0,m6||0,m7||0];var max=Math.max.apply(null,v),min=Math.min.apply(null,v);if(max===0)return'<span style="color:var(--t2);font-size:12px">—</span>';var r=max-min||1,W=80,H=28,pad=4,iw=W-2*pad,ih=H-2*pad;var pts=v.map(function(v2,i){var x=pad+(i/4)*iw;var y=H-pad-((v2-min)/r)*ih;return x.toFixed(1)+','+y.toFixed(1)}).join(' ');var dots=v.map(function(v2,i){var x=pad+(i/4)*iw;var y=H-pad-((v2-min)/r)*ih;var color=i===0?'#4da6ff':v2>v[i-1]?'#22c55e':v2<v[i-1]?'#ef4444':'#4da6ff';var rad=i===4?3:2;return'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+rad+'" fill="'+color+'"/>';}).join('');return'<svg width="'+W+'" height="'+H+'" style="vertical-align:middle;display:block"><polyline points="'+pts+'" fill="none" stroke="#4da6ff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'+dots+'</svg>';}

function renderAsinMonthly() {
  loadAmData(function() {
    var tb = document.getElementById("amTbody");
    if (tb) tb.innerHTML = '<tr><td colspan="24" style="text-align:center;color:var(--t2);padding:40px">加载中...</td></tr>';

    var D = amData.slice();
    var sEl = document.getElementById("amSearch"), sortEl = document.getElementById("amSort");
    var brandEl = document.getElementById("amBrand"), companyEl = document.getElementById("amCompany"), typeEl = document.getElementById("amType"), styleEl = document.getElementById("amStyle");
    var rawVal = sEl ? sEl.value : "";
    var search = rawVal.trim().toLowerCase(), sort = sortEl ? sortEl.value : "gmv_total";
    console.log("[ASIN] search raw='"+rawVal+"' trimmed='"+search+"' amData="+amData.length+" D_before="+D.length);
    var brand = (brandEl ? brandEl.value : ""), company = (companyEl ? companyEl.value : ""), atype = (typeEl ? typeEl.value : ""), style = (styleEl ? styleEl.value : "");

    if (search) D = D.filter(function(r) {
      return (r.asin || "").toLowerCase().indexOf(search) >= 0
          || (r.parent_asin || "").toLowerCase().indexOf(search) >= 0
          || (r.title || "").toLowerCase().indexOf(search) >= 0
          || (r.brand || "").toLowerCase().indexOf(search) >= 0
          || (r.company || "").toLowerCase().indexOf(search) >= 0
          || (r.type || "").toLowerCase().indexOf(search) >= 0
          || (r.style || "").toLowerCase().indexOf(search) >= 0;
    });
    if (brand) D = D.filter(function(r) { return r.brand === brand; });
    if (company) D = D.filter(function(r) { return r.company === company; });
    // Enrich rows with type/style from main data map
    var pts = window.PA_TYPE_STYLE || {};
    D.forEach(function(r) {
      var pa = r.parent_asin || r.asin;
      if (!r.type && pts[pa]) r.type = pts[pa].type;
      if (!r.style && pts[pa]) r.style = pts[pa].style;
    });
    if (atype) D = D.filter(function(r) { return r.type === atype; });
    if (style) D = D.filter(function(r) { return r.style === style; });
    var yearEl = document.getElementById("amYear"); var year = (yearEl ? yearEl.value : "");
    if (year) D = D.filter(function(r) { return String(r.listing_date||'').slice(0,4) === year; });

    // 去重父ASIN：按父ASIN聚合，GMV/销量累加，单价取当月GMV最高子体
    var dedupEl = document.getElementById("amDedup");
    if (dedupEl && dedupEl.checked) {
      var paMap = {}, noPa = [];
      D.forEach(function(r) {
        var p = r.parent_asin;
        if (!p) { noPa.push(r); return; }
        if (!paMap[p]) {
          paMap[p] = {
            asin: p, parent_asin: p, brand: r.brand, company: r.company,
            image_url: r.image_url || '', listing_date: r.listing_date,
            type: r.type, style: r.style,
            gmv_m3:0,gmv_m4:0,gmv_m5:0,gmv_m6:0,gmv_m7:0,gmv_total:0,
            units_m3:0,units_m4:0,units_m5:0,units_m6:0,units_m7:0,units_total:0,
            price_m3:0,price_m4:0,price_m5:0,price_m6:0,price_m7:0,price_avg:0,
            trend:'', child_count:0,
            _b:{m3:{g:0,p:0},m4:{g:0,p:0},m5:{g:0,p:0},m6:{g:0,p:0},m7:{g:0,p:0}},
            _maxG:0
          };
        }
        var a = paMap[p]; a.child_count++;
        if ((r.gmv_total||0) > a._maxG) { a._maxG = r.gmv_total||0; a.image_url = r.image_url||''; a.title = r.title; }
        a.gmv_m3+=r.gmv_m3||0; a.gmv_m4+=r.gmv_m4||0; a.gmv_m5+=r.gmv_m5||0; a.gmv_m6+=r.gmv_m6||0; a.gmv_m7+=r.gmv_m7||0;
        a.gmv_total+=r.gmv_total||0;
        a.units_m3+=r.units_m3||0; a.units_m4+=r.units_m4||0; a.units_m5+=r.units_m5||0; a.units_m6+=r.units_m6||0; a.units_m7+=r.units_m7||0;
        a.units_total+=r.units_total||0;
        ['m3','m4','m5','m6','m7'].forEach(function(m){
          var g = r['gmv_'+m]||0;
          if (g > a._b[m].g) { a._b[m].g = g; a._b[m].p = r['price_'+m]||0; }
        });
        if (!a.listing_date || (r.listing_date && r.listing_date < a.listing_date)) a.listing_date = r.listing_date;
      });
      var result = [];
      Object.keys(paMap).forEach(function(p){
        var r = paMap[p];
        r.price_m3=r._b.m3.p; r.price_m4=r._b.m4.p; r.price_m5=r._b.m5.p; r.price_m6=r._b.m6.p; r.price_m7=r._b.m7.p;
        r.trend = amSparkline(r.gmv_m3,r.gmv_m4,r.gmv_m5,r.gmv_m6,r.gmv_m7);
        r.price_avg = (r.units_total > 0) ? Math.round(r.gmv_total / r.units_total) : 0;
        delete r._b; delete r._maxG;
        result.push(r);
      });
      D = result.concat(noPa);
    }

    if (sort === "gmv_total") D.sort(function(a, b) { return b.gmv_total - a.gmv_total; });
    else if (sort === "gmv_m7") D.sort(function(a, b) { return b.gmv_m7 - a.gmv_m7; });
    else if (sort === "gmv_m6") D.sort(function(a, b) { return b.gmv_m6 - a.gmv_m6; });
    else if (sort === "gmv_m5") D.sort(function(a, b) { return b.gmv_m5 - a.gmv_m5; });
    else if (sort === "gmv_m4") D.sort(function(a, b) { return b.gmv_m4 - a.gmv_m4; });
    else if (sort === "gmv_m3") D.sort(function(a, b) { return b.gmv_m3 - a.gmv_m3; });
    else if (sort === "price_avg") D.sort(function(a, b) { return b.price_avg - a.price_avg; });
    else if (sort === "company") D.sort(function(a, b) { return (a.company || "").localeCompare(b.company || ""); });

    // Metric filter
    var metricEl = document.getElementById("amMetric");
    var metric = metricEl ? metricEl.value : "gmv";
    var amTable = document.getElementById("amTable");
    if (amTable) {
      amTable.className = amTable.className.replace(/metric-\w+/g,'').trim();
      if (metric !== "all") amTable.className += " metric-" + metric;
    }

    var totalPages = Math.ceil(D.length / amPageSize);
    if (amPage > totalPages) amPage = totalPages;
    if (amPage < 1) amPage = 1;
    var start = (amPage - 1) * amPageSize;
    var pageItems = D.slice(start, start + amPageSize);

    var sm = document.getElementById("am-summary");
    var paSet={},brSet={},coSet={};D.forEach(function(r){if(r.parent_asin)paSet[r.parent_asin]=1;if(r.brand)brSet[r.brand]=1;if(r.company)coSet[r.company]=1});
    var paCnt=Object.keys(paSet).length,brCnt=Object.keys(brSet).length,coCnt=Object.keys(coSet).length;
    var sG7=0;D.forEach(function(r){sG7+=r.gmv_m7||0});
    if (sm) sm.innerHTML = '当前 <b>'+D.length+'/'+amData.length+'</b> 条 · <b>'+paCnt+'</b> 父ASIN · <b>'+brCnt+'</b> 品牌 · <b>'+coCnt+'</b> 公司 · 7月GMV合计 <b style="color:var(--accent);font-weight:600">$'+Math.round(sG7).toLocaleString()+'</b> | 第'+amPage+'/'+totalPages+'页';

    // Summary row (3-7月)
    var sG3 = 0, sG4 = 0, sG5 = 0, sG6 = 0, sG7 = 0, sU3 = 0, sU4 = 0, sU5 = 0, sU6 = 0, sU7 = 0, sGT = 0, sUT = 0;
    var sP3 = 0, sP4 = 0, sP5 = 0, sP6 = 0, sP7 = 0, c3 = 0, c4 = 0, c5 = 0, c6 = 0, c7 = 0;
    D.forEach(function(r) {
      sG3 += r.gmv_m3 || 0; sG4 += r.gmv_m4 || 0; sG5 += r.gmv_m5 || 0; sG6 += r.gmv_m6 || 0; sG7 += r.gmv_m7 || 0;
      sU3 += r.units_m3 || 0; sU4 += r.units_m4 || 0; sU5 += r.units_m5 || 0; sU6 += r.units_m6 || 0; sU7 += r.units_m7 || 0;
      sGT += r.gmv_total || 0; sUT += r.units_total || 0;
      if (r.price_m3 > 0) { sP3 += r.price_m3; c3++; }
      if (r.price_m4 > 0) { sP4 += r.price_m4; c4++; }
      if (r.price_m5 > 0) { sP5 += r.price_m5; c5++; }
      if (r.price_m6 > 0) { sP6 += r.price_m6; c6++; }
      if (r.price_m7 > 0) { sP7 += r.price_m7; c7++; }
    });
    var sumHTML = '<tr>';
    sumHTML += '<td data-metric="all" colspan="7" style="color:var(--accent);text-align:right">合计 (' + D.length + '条)</td>';
    sumHTML += '<td data-metric="all">$' + (sUT > 0 ? (sGT / sUT).toFixed(2) : '0.00') + '</td>';
    sumHTML += '<td data-metric="gmv" style="color:var(--a4)">$' + sG3.toLocaleString() + '</td>';
    sumHTML += '<td data-metric="gmv" style="color:var(--a4)">$' + sG4.toLocaleString() + '</td>';
    sumHTML += '<td data-metric="gmv" style="color:var(--a4)">$' + sG5.toLocaleString() + '</td>';
    sumHTML += '<td data-metric="gmv" style="color:var(--a4)">$' + sG6.toLocaleString() + '</td>';
    sumHTML += '<td data-metric="gmv" style="color:var(--a4)">$' + sG7.toLocaleString() + '</td>';
    sumHTML += '<td data-metric="units" style="color:var(--accent)">' + sU3.toLocaleString() + '</td>';
    sumHTML += '<td data-metric="units" style="color:var(--accent)">' + sU4.toLocaleString() + '</td>';
    sumHTML += '<td data-metric="units" style="color:var(--accent)">' + sU5.toLocaleString() + '</td>';
    sumHTML += '<td data-metric="units" style="color:var(--accent)">' + sU6.toLocaleString() + '</td>';
    sumHTML += '<td data-metric="units" style="color:var(--accent)">' + sU7.toLocaleString() + '</td>';
    sumHTML += '<td data-metric="price" style="color:var(--t2)">$' + (c3 ? sP3 / c3 : 0).toFixed(0) + '</td>';
    sumHTML += '<td data-metric="price" style="color:var(--t2)">$' + (c4 ? sP4 / c4 : 0).toFixed(0) + '</td>';
    sumHTML += '<td data-metric="price" style="color:var(--t2)">$' + (c5 ? sP5 / c5 : 0).toFixed(0) + '</td>';
    sumHTML += '<td data-metric="price" style="color:var(--t2)">$' + (c6 ? sP6 / c6 : 0).toFixed(0) + '</td>';
    sumHTML += '<td data-metric="price" style="color:var(--t2)">$' + (c7 ? sP7 / c7 : 0).toFixed(0) + '</td>';
    sumHTML += '<td data-metric="all" style="color:var(--a4);font-size:18px">$' + sGT.toLocaleString() + '</td>';
    sumHTML += '<td data-metric="all" style="text-align:center;padding:2px 4px">' + amSparkline(sG3, sG4, sG5, sG6, sG7) + '</td></tr>';
    document.getElementById("amSummary").innerHTML = sumHTML;

    // 检测重复父ASIN：同一父ASIN出现≥2次 → 整行高亮
    var paCount = {};
    pageItems.forEach(function(r) { var p = r.parent_asin; if (p) paCount[p] = (paCount[p] || 0) + 1; });
    var dupSet = {};
    Object.keys(paCount).forEach(function(p) { if (paCount[p] >= 2) dupSet[p] = true; });

    if (!tb) return;
    tb.innerHTML = pageItems.map(function(r, i) {
      var isDup = dupSet[r.parent_asin];
      var dupClass = isDup ? " class='dup-row'" : "";
      return "<tr" + dupClass + ">"
        + "<td data-metric='all' style='text-align:center;color:var(--t2);font-size:14px'>" + (start + i + 1) + "</td>"
        + "<td data-metric='all' style='padding:2px'><img src='" + (r.image_url || "") + "' style='width:120px;height:120px;object-fit:contain;border-radius:6px;background:#1a2634' onerror=\"this.style.display='none'\" loading='lazy'></td>"
        + "<td data-metric='all'>" + (dedupEl && dedupEl.checked ? "" : "<a href='https://www.amazon.com/dp/" + r.asin + "' target=_blank style='color:var(--text);text-decoration:none'>" + r.asin + "</a>") + "</td>"
        + "<td data-metric='all'>" + (r.parent_asin || "") + "</td>"
        + "<td data-metric='all'>" + (r.brand || "") + "</td><td data-metric='all'>" + (r.company || "") + "</td><td data-metric='all'>" + (r.listing_date || "") + "</td>"
        + "<td data-metric='all'>$" + (r.units_total > 0 ? (r.gmv_total / r.units_total).toFixed(2) : '0.00') + "</td>"
        + "<td data-metric='gmv' class=price>$" + (r.gmv_m3 || 0).toLocaleString() + "</td>"
        + "<td data-metric='gmv' class=price>$" + (r.gmv_m4 || 0).toLocaleString() + "</td>"
        + "<td data-metric='gmv' class=price>$" + (r.gmv_m5 || 0).toLocaleString() + "</td>"
        + "<td data-metric='gmv' class=price>$" + (r.gmv_m6 || 0).toLocaleString() + "</td>"
        + "<td data-metric='gmv' class=price>$" + (r.gmv_m7 || 0).toLocaleString() + "</td>"
        + "<td data-metric='units'>" + (r.units_m3 || 0).toLocaleString() + "</td>"
        + "<td data-metric='units'>" + (r.units_m4 || 0).toLocaleString() + "</td>"
        + "<td data-metric='units'>" + (r.units_m5 || 0).toLocaleString() + "</td>"
        + "<td data-metric='units'>" + (r.units_m6 || 0).toLocaleString() + "</td>"
        + "<td data-metric='units'>" + (r.units_m7 || 0).toLocaleString() + "</td>"
        + "<td data-metric='price'>$" + (r.price_m3 || 0).toFixed(0) + "</td>"
        + "<td data-metric='price'>$" + (r.price_m4 || 0).toFixed(0) + "</td>"
        + "<td data-metric='price'>$" + (r.price_m5 || 0).toFixed(0) + "</td>"
        + "<td data-metric='price'>$" + (r.price_m6 || 0).toFixed(0) + "</td>"
        + "<td data-metric='price'>$" + (r.price_m7 || 0).toFixed(0) + "</td>"
        + "<td data-metric='all' class=gmv>$" + r.gmv_total.toLocaleString() + "</td>"
        + "<td data-metric='all' style='text-align:center;padding:2px 4px'>" + (r.trend || amSparkline(r.gmv_m3,r.gmv_m4,r.gmv_m5,r.gmv_m6,r.gmv_m7)) + "</td>"
        + "</tr>";
    }).join("");

    var pg = document.getElementById("amPager");
    if (pg && totalPages > 1) {
      var ph = "";
      if (amPage > 1) ph += '<button class="btn" onclick="amGoPage(' + (amPage - 1) + ')" style="font-size:11px;padding:4px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer">◀</button>';
      for (var i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= amPage - 2 && i <= amPage + 2)) {
          ph += '<button class="btn" onclick="amGoPage(' + i + ')" style="font-size:11px;padding:4px 8px;min-width:30px;background:' + (i === amPage ? 'var(--accent)' : 'var(--bg)') + ';border:1px solid var(--border);border-radius:6px;color:' + (i === amPage ? '#000' : 'var(--text)') + ';cursor:pointer;font-weight:' + (i === amPage ? '600' : '400') + '">' + i + '</button>';
        } else if (i === amPage - 3 || i === amPage + 3) {
          ph += '<span style="color:var(--t2)">...</span>';
        }
      }
      if (amPage < totalPages) ph += '<button class="btn" onclick="amGoPage(' + (amPage + 1) + ')" style="font-size:11px;padding:4px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer">▶</button>';
      pg.innerHTML = ph;
    } else if (pg) {
      pg.innerHTML = "";
    }
  });
}
// ── 搜索栏事件绑定（addEventListener 双保险，确保 oninput 一定生效）──
(function(){
  function bindImageZoom(){
    var table = document.getElementById('amTable');
    if (!table || table._imgZoomBound) return;
    table._imgZoomBound = true;
    table.addEventListener('click', function(e){
      if (e.target.tagName === 'IMG' && e.target.closest('#amTbody, #amPivotTbody')) {
        var modal = document.getElementById('img-modal');
        var modalImg = document.getElementById('modal-img');
        if (modal && modalImg) {
          modalImg.src = e.target.src;
          modal.classList.add('show');
        }
      }
    });
  }
  function bindSearch(){
    var amSearch = document.getElementById('amSearch');
    if (amSearch && !amSearch._bound) {
      amSearch._bound = true;
      amSearch.addEventListener('input', function(){
        amPage = 1;
        renderAsinMonthly();
      });
    }
    ['amMetric','amSort','amBrand','amCompany','amType','amStyle','amYear','amDedup'].forEach(function(id){
      var el = document.getElementById(id);
      if (el && !el._bound) {
        el._bound = true;
        el.addEventListener('change', function(){
          amPage = 1;
          renderAsinMonthly();
        });
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSearch);
    document.addEventListener('DOMContentLoaded', bindImageZoom);
  } else {
    bindSearch();
    bindImageZoom();
  }
  // ── 冻结滚动: 表头(CSS sticky兜底) + 合计行(JS累积transform) ──
  var _freezeWrapper = null, _freezeThead = null, _freezeSummary = null, _freezeOn = false;
  function setupFreeze(){
    _freezeWrapper = document.querySelector('#sc-asin .table-wrapper');
    _freezeThead = document.querySelector('#amTable thead');
    _freezeSummary = document.getElementById('amSummary');
    _freezeOn = !!(_freezeWrapper && _freezeThead && _freezeSummary);
    if (_freezeOn && !window._freezeListening) {
      window._freezeListening = true;
      window.addEventListener('scroll', onFreezeScroll, {passive: true});
    }
  }
  function onFreezeScroll(){
    if (!_freezeOn) { setupFreeze(); if (!_freezeOn) return; }
    var wr = _freezeWrapper.getBoundingClientRect();
    // 表头 (CSS sticky 兜底)
    if (wr.top < 0 && wr.bottom > 0) {
      _freezeThead.style.transform = 'translateY(' + (-wr.top) + 'px)';
    } else {
      _freezeThead.style.transform = '';
    }
    // 合计行: 累积transform，抵消自然滚动位移
    if (_freezeSummary && wr.bottom > 0) {
      var thR = _freezeThead.getBoundingClientRect();
      var sr = _freezeSummary.getBoundingClientRect();
      var target = thR.bottom;
      // sr.top 包含已有transform; 减去已有T值得自然位置
      var curT = _freezeSummary._tfY || 0;
      var natural = sr.top - curT;
      if (natural < target) {
        var newT = target - natural;
        _freezeSummary._tfY = newT;
        _freezeSummary.style.transform = 'translateY(' + newT + 'px)';
      } else {
        _freezeSummary._tfY = 0;
        _freezeSummary.style.transform = '';
      }
    }
  }
  // renderAsinMonthly 会用 innerHTML 重建子元素，重置了 tbody 的 style.transform。
  // 包装原 renderAsinMonthly 在其后恢复冻结。
  (function(){
    var _origRender = window.renderAsinMonthly;
    if (_origRender && !_origRender._freezePatched) {
      _origRender._freezePatched = true;
      window.renderAsinMonthly = function(){
        _origRender.apply(this, arguments);
        if (_freezeSummary && _freezeSummary._tfY) {
          _freezeSummary.style.transform = 'translateY(' + _freezeSummary._tfY + 'px)';
        }
      };
    }
  })();
  setupFreeze();
  onFreezeScroll();
  // 切ASIN tab后重新绑定
  var _wrapPoll = setInterval(function(){
    if (typeof window.switchSubTab === 'function' && !window.switchSubTab._wrapped) {
      window.switchSubTab._wrapped = true;
      var _orig = window.switchSubTab;
      window.switchSubTab = function(t) {
        _orig(t);
        if (t === 'asin') { setTimeout(bindSearch, 300); setTimeout(setupFreeze, 400); setTimeout(onFreezeScroll, 500); }
      };
      clearInterval(_wrapPoll);
    }
  }, 30);
  setTimeout(function(){ clearInterval(_wrapPoll); }, 5000);
})();
