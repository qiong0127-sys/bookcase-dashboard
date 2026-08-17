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
      rows += "<td><img src='" + (r.image_url || "") + "' style='width:120px;height:120px;object-fit:contain;border-radius:6px;background:#1a2634;cursor:pointer' title='点击放大' onclick='zoomImage(this)' onerror=\"this.style.display='none'\" loading='lazy'></td>";
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
          rows += "<td style='padding-left:20px;font-size:16px'><a href='https://www.amazon.com/dp/" + c2.asin + "' target=_blank>" + c2.asin + "</a></td>";
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
    if (window.__initFrozen) window.__initFrozen();
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
  if (!amData.length) { setTimeout(amPopulateFilters, 300); return; }
  var b = {}, c2 = {}, t2 = {}, ss = {}, ys = {};
  amData.forEach(function(r) { if (r.brand) b[r.brand] = 1; if (r.company) c2[r.company] = 1; if (r.listing_date) { var y = String(r.listing_date).slice(0,4); if (y) ys[y] = 1; } });
  // Collect type/style from PA_TYPE_STYLE map + amData as fallback
  var pts = window.PA_TYPE_STYLE || {};
  Object.values(pts).forEach(function(v) { if (v.type) t2[v.type] = 1; if (v.style) ss[v.style] = 1; });
  // Fallback: if PA_TYPE_STYLE empty, collect from amData
  if (!Object.keys(t2).length && !Object.keys(ss).length) {
    amData.forEach(function(r) { if (r.type) t2[r.type] = 1; if (r.style) ss[r.style] = 1; });
  }
  function hasOpt(sel, v) { return Array.from(sel.options).some(function(o) { return o.value === v; }); }
  function fill(selId, map) {
    var sel = document.getElementById(selId);
    if (!sel) return;
    Object.keys(map).sort().forEach(function(v) {
      if (!v || hasOpt(sel, v)) return;
      var o = document.createElement("option"); o.value = v; o.textContent = v; sel.appendChild(o);
    });
  }
  fill("amBrand", b); fill("amCompany", c2); fill("amType", t2); fill("amStyle", ss); fill("amYear", ys);
  if(typeof refreshSelectUI === 'function'){['amBrand','amCompany','amType','amStyle','amYear'].forEach(function(id){refreshSelectUI(id)});}
}

function amSparkline(m3,m4,m5,m6,m7){var v=[m3||0,m4||0,m5||0,m6||0,m7||0];var max=Math.max.apply(null,v),min=Math.min.apply(null,v);if(max===0)return'<span style="color:var(--t2);font-size:13px">—</span>';var r=max-min||1,W=80,H=28,pad=4,iw=W-2*pad,ih=H-2*pad;var pts=v.map(function(v2,i){var x=pad+(i/4)*iw;var y=H-pad-((v2-min)/r)*ih;return x.toFixed(1)+','+y.toFixed(1)}).join(' ');var dots=v.map(function(v2,i){var x=pad+(i/4)*iw;var y=H-pad-((v2-min)/r)*ih;var color=i===0?'#4da6ff':v2>v[i-1]?'#22c55e':v2<v[i-1]?'#ef4444':'#4da6ff';var rad=i===4?3:2;return'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+rad+'" fill="'+color+'"/>';}).join('');return'<svg width="'+W+'" height="'+H+'" style="vertical-align:middle;display:block"><polyline points="'+pts+'" fill="none" stroke="#4da6ff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'+dots+'</svg>';}

function renderAsinMonthly() {
  loadAmData(function() {
    var tb = document.getElementById("amTbody");
    if (tb) tb.innerHTML = '<tr><td colspan="24" style="text-align:center;color:var(--t2);padding:40px">加载中...</td></tr>';

    var D = amData.slice();
    var sEl = document.getElementById("amSearch"), sortEl = document.getElementById("amSort");
    var rawVal = sEl ? sEl.value : "";
    var search = rawVal.trim().toLowerCase(), sort = (typeof getSelectVal === 'function' ? getSelectVal("amSort") : sortEl ? sortEl.value : "gmv_total");
    if(typeof sort !== 'string') sort = "gmv_total";
    var brand = (typeof getSelectVal === 'function' ? getSelectVal("amBrand") : brandEl ? brandEl.value : "");
    var company = (typeof getSelectVal === 'function' ? getSelectVal("amCompany") : companyEl ? companyEl.value : "");
    var atype = (typeof getSelectVal === 'function' ? getSelectVal("amType") : typeEl ? typeEl.value : "");
    var style = (typeof getSelectVal === 'function' ? getSelectVal("amStyle") : styleEl ? styleEl.value : "");
    if(typeof brand === 'string') brand = brand ? [brand] : [];
    if(typeof company === 'string') company = company ? [company] : [];
    if(typeof atype === 'string') atype = atype ? [atype] : [];
    if(typeof style === 'string') style = style ? [style] : [];
    console.log("[ASIN] search raw='"+rawVal+"' trimmed='"+search+"' amData="+amData.length+" D_before="+D.length);

    if (search) D = D.filter(function(r) {
      return (r.asin || "").toLowerCase().indexOf(search) >= 0
          || (r.parent_asin || "").toLowerCase().indexOf(search) >= 0
          || (r.title || "").toLowerCase().indexOf(search) >= 0
          || (r.brand || "").toLowerCase().indexOf(search) >= 0
          || (r.company || "").toLowerCase().indexOf(search) >= 0
          || (r.type || "").toLowerCase().indexOf(search) >= 0
          || (r.style || "").toLowerCase().indexOf(search) >= 0;
    });
    if (brand.length) D = D.filter(function(r) { return brand.includes(r.brand); });
    if (company.length) D = D.filter(function(r) { return company.includes(r.company); });
    // Enrich rows with type/style from main data map
    var pts = window.PA_TYPE_STYLE || {};
    D.forEach(function(r) {
      var pa = r.parent_asin || r.asin;
      if (!r.type && pts[pa]) r.type = pts[pa].type;
      if (!r.style && pts[pa]) r.style = pts[pa].style;
    });
    if (atype.length) D = D.filter(function(r) { return atype.includes(r.type); });
    if (style.length) D = D.filter(function(r) { return style.includes(r.style); });
    var year = (typeof getSelectVal === 'function' ? getSelectVal("amYear") : (function(){var yel=document.getElementById("amYear");return yel?yel.value:''})());
    if(typeof year === 'string') year = year ? [year] : [];
    if (year.length) D = D.filter(function(r) { return year.includes(String(r.listing_date||'').slice(0,4)); });

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
    var metric = (typeof getSelectVal === 'function' ? getSelectVal("amMetric") : (function(){var mel=document.getElementById("amMetric");return mel?mel.value:'gmv'})());
    if(typeof metric !== 'string') metric = 'gmv';
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
    // 左3列冻结区域：td[1] td[2] 空，td[3] 放合计标签
    sumHTML += '<td data-metric="all"></td>';
    sumHTML += '<td data-metric="all"></td>';
    sumHTML += '<td data-metric="all" style="color:var(--accent);text-align:right;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">合计(' + D.length + ')</td>';
    // 父ASIN~上市列合并（4列）
    sumHTML += '<td data-metric="all" colspan="4"></td>';
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
    document.getElementById("amSummaryRow").innerHTML = sumHTML;

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
        + "<td data-metric='all' style='text-align:center;color:var(--t2);font-size:15px'>" + (start + i + 1) + "</td>"
        + "<td data-metric='all' style='padding:2px'><img src='" + (r.image_url || "") + "' style='width:120px;height:120px;object-fit:contain;border-radius:6px;background:#1a2634;cursor:pointer' title='点击放大' onclick='zoomImage(this)' onerror=\"this.style.display='none'\" loading='lazy'></td>"
        + "<td data-metric='all'>" + (dedupEl && dedupEl.checked ? "" : "<a href='https://www.amazon.com/dp/" + r.asin + "' target=_blank style='color:var(--text);text-decoration:none'>" + r.asin + "</a>") + "</td>"
        + "<td data-metric='all'>" + (r.parent_asin ? "<a href='https://www.amazon.com/dp/" + r.parent_asin + "' target=_blank style='color:var(--text);text-decoration:none'>" + r.parent_asin + "</a>" : "") + "</td>"
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
      if (amPage > 1) ph += '<button class="btn" onclick="amGoPage(' + (amPage - 1) + ')" style="font-size:12px;padding:4px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer">◀</button>';
      for (var i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= amPage - 2 && i <= amPage + 2)) {
          ph += '<button class="btn" onclick="amGoPage(' + i + ')" style="font-size:12px;padding:4px 8px;min-width:30px;background:' + (i === amPage ? 'var(--accent)' : 'var(--bg)') + ';border:1px solid var(--border);border-radius:6px;color:' + (i === amPage ? '#000' : 'var(--text)') + ';cursor:pointer;font-weight:' + (i === amPage ? '600' : '400') + '">' + i + '</button>';
        } else if (i === amPage - 3 || i === amPage + 3) {
          ph += '<span style="color:var(--t2)">...</span>';
        }
      }
      if (amPage < totalPages) ph += '<button class="btn" onclick="amGoPage(' + (amPage + 1) + ')" style="font-size:12px;padding:4px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer">▶</button>';
      pg.innerHTML = ph;
    } else if (pg) {
      pg.innerHTML = "";
    }
    amPopulateFilters();
    if (window.__initFrozen) window.__initFrozen();
  });
}
// ── 搜索栏事件绑定（addEventListener 双保险，确保 oninput 一定生效）──
(function(){
  window.zoomImage = function(img){
    var modal = document.getElementById('img-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'img-modal';
      modal.className = 'img-modal';
      modal.onclick = function(){ modal.classList.remove('show'); };
      modal.innerHTML = '<span class="img-modal-close">&times;</span><img id="modal-img" src="" alt="Product">';
      document.body.appendChild(modal);
    }
    var modalImg = document.getElementById('modal-img');
    if (!modalImg) {
      modalImg = document.createElement('img');
      modalImg.id = 'modal-img';
      modal.appendChild(modalImg);
    }
    modalImg.src = img.src;
    modal.classList.add('show');
  };
  function bindImageZoom(){
    // Kept for backward compat, but onclick on img is the primary trigger
    var table = document.getElementById('amTable');
    if (!table || table._imgZoomBound) return;
    table._imgZoomBound = true;
    table.addEventListener('click', function(e){
      if (e.target.tagName === 'IMG' && e.target.closest('#amTbody, #amPivotTbody')) {
        window.zoomImage(e.target);
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
})();

// ═══ 冻结列引擎: position:sticky 方案 ══
// 左侧 3 列 (# 图片 ASIN) 用 CSS position:sticky 固定
// 只需计算各列 left 偏移量的 CSS 变量
(function(){
  var FZ_L = 3;
  var _timer = null;

  function updateFrozenVars(){
    var table = document.getElementById('amTable');
    if (!table) return;
    var ths = table.querySelectorAll('thead tr:first-child th');
    if (ths.length < FZ_L) return;
    var col1w = ths[0].offsetWidth;
    var col2w = ths[1].offsetWidth;
    document.documentElement.style.setProperty('--fz-l-col1', col1w + 'px');
    document.documentElement.style.setProperty('--fz-l-col2', (col1w + col2w) + 'px');
    // --fz-l-col1 = 第1列宽, --fz-l-col2 = 第1+2列宽
  }

  function initFrozen(){
    updateFrozenVars();
    clearTimeout(_timer);
    _timer = setTimeout(updateFrozenVars, 500);
    _timer = setTimeout(updateFrozenVars, 1500);
  }

  window.__initFrozen = initFrozen;
  window.__syncFrozen = function(){};
  window.__syncRowHeights = function(){};
  window.__onImagesLoaded = function(){
    clearTimeout(_timer);
    _timer = setTimeout(updateFrozenVars, 300);
  };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(initFrozen, 100); });
  else
    setTimeout(initFrozen, 100);
})();
