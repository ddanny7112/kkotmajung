/* 꽃보라 도감 그림
   84종을 압화 표본처럼 그립니다. 줄기와 잎은 선으로, 꽃잎은 플레이어의 사진 색으로 칠합니다.
   화면 좌표는 가로 120, 땅 높이 142를 기준으로 합니다. */
window.FlowerArt = (function () {
  'use strict';
  const n = (v) => +v.toFixed(1);
  const rad = (a) => (a * Math.PI) / 180;
  function rng(seed) {
    let h = 2166136261;
    for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
  }

  const STEM = 'stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"';
  const WOOD = 'stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"';
  const FINE = 'stroke="currentColor" stroke-width=".6" stroke-linecap="round" fill="none"';
  const LEAF = 'fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width=".7" stroke-linejoin="round"';
  const G = 142;

  /* 꽃잎과 잎의 윤곽. 모두 0,0에서 위쪽(-y)으로 자랍니다. */
  const OUT = {
    point: (l, w) => `M0 0C${n(w)} ${n(-l * .32)} ${n(w * .72)} ${n(-l * .76)} 0 ${n(-l)}C${n(-w * .72)} ${n(-l * .76)} ${n(-w)} ${n(-l * .32)} 0 0Z`,
    round: (l, w) => `M0 0C${n(w * .8)} ${n(-l * .2)} ${n(w * 1.16)} ${n(-l * .96)} 0 ${n(-l)}C${n(-w * 1.16)} ${n(-l * .96)} ${n(-w * .8)} ${n(-l * .2)} 0 0Z`,
    notch: (l, w) => `M0 0C${n(w * .8)} ${n(-l * .25)} ${n(w * 1.2)} ${n(-l * 1.02)} ${n(w * .28)} ${n(-l)}Q${n(w * .08)} ${n(-l * .98)} 0 ${n(-l * .86)}Q${n(-w * .08)} ${n(-l * .98)} ${n(-w * .28)} ${n(-l)}C${n(-w * 1.2)} ${n(-l * 1.02)} ${n(-w * .8)} ${n(-l * .25)} 0 0Z`,
    tooth: (l, w) => `M0 0C${n(w * .7)} ${n(-l * .3)} ${n(w * 1.05)} ${n(-l * .78)} ${n(w * .9)} ${n(-l * .97)}L${n(w * .46)} ${n(-l * .9)}L${n(w * .18)} ${n(-l * 1.03)}L0 ${n(-l * .92)}L${n(-w * .18)} ${n(-l * 1.03)}L${n(-w * .46)} ${n(-l * .9)}L${n(-w * .9)} ${n(-l * .97)}C${n(-w * 1.05)} ${n(-l * .78)} ${n(-w * .7)} ${n(-l * .3)} 0 0Z`,
    fringe: (l, w) => {
      let d = `M0 0C${n(w * .7)} ${n(-l * .3)} ${n(w)} ${n(-l * .7)} ${n(w)} ${n(-l * .86)}`;
      for (let i = 0; i < 8; i++) {
        const t = (i + 1) / 8, x = w * (1 - 2 * t), y = -l * (.86 + .16 * Math.sin(Math.PI * t));
        d += `L${n(x + (w / 8))} ${n(y - (i % 2 ? 0 : l * .07))}L${n(x)} ${n(y)}`;
      }
      return `${d}C${n(-w)} ${n(-l * .7)} ${n(-w * .7)} ${n(-l * .3)} 0 0Z`;
    },
    strap: (l, w) => `M0 0C${n(w * .9)} ${n(-l * .2)} ${n(w)} ${n(-l * .88)} 0 ${n(-l)}C${n(-w)} ${n(-l * .88)} ${n(-w * .9)} ${n(-l * .2)} 0 0Z`,
    curl: (l, w) => `M0 0C${n(w * 1.4)} ${n(-l * .35)} ${n(w * 2.2)} ${n(-l * .78)} ${n(w * .9)} ${n(-l)}C${n(w * .9)} ${n(-l * .72)} ${n(-w * .7)} ${n(-l * .3)} 0 0Z`,
    heart: (l, w) => `M0 0C${n(w * .5)} ${n(-l * .12)} ${n(w * 1.2)} ${n(-l * .28)} ${n(w * 1.05)} ${n(-l * .68)}C${n(w * .9)} ${n(-l * 1.02)} ${n(w * .2)} ${n(-l * 1.02)} 0 ${n(-l * .78)}C${n(-w * .2)} ${n(-l * 1.02)} ${n(-w * .9)} ${n(-l * 1.02)} ${n(-w * 1.05)} ${n(-l * .68)}C${n(-w * 1.2)} ${n(-l * .28)} ${n(-w * .5)} ${n(-l * .12)} 0 0Z`,
  };
  function pet(x, y, l, w, rot, attr, tip) {
    return `<path transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)})" d="${(OUT[tip] || OUT.point)(l, w)}" ${attr}/>`;
  }
  const dot = (x, y, r, attr) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" ${attr}/>`;
  const qp = (a, b, c, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1]];
  const curve = (a, b, c, attr) => `<path d="M${n(a[0])} ${n(a[1])}Q${n(b[0])} ${n(b[1])} ${n(c[0])} ${n(c[1])}" ${attr}/>`;

  function ring(x, y, k, l, w, off, attr, tip, R, jit = 3) {
    let o = '';
    for (let i = 0; i < k; i++) o += pet(x, y, l * (1 - R() * .06), w, off + (i * 360) / k + (R() - .5) * jit, attr, tip);
    return o;
  }
  function stamens(x, y, k, len, P, R, spread = 360, start = -90) {
    let o = '';
    for (let i = 0; i < k; i++) {
      const a = rad(start + (spread === 360 ? (i * 360) / k : (i / (k - 1 || 1) - .5) * spread)), l = len * (.75 + R() * .3);
      const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l;
      o += `<path d="M${n(x)} ${n(y)}L${n(ex)} ${n(ey)}" stroke="${P.ink}" stroke-width=".5" fill="none"/>${dot(ex, ey, .9, P.c)}`;
    }
    return o;
  }
  function disc(x, y, rd, P, R, seeded) {
    let o = dot(x, y, rd, P.c);
    const k = seeded ? Math.round(rd * rd * .55) : 0;
    for (let i = 0; i < k; i++) {
      const a = i * 2.4, d = rd * .92 * Math.sqrt((i + .5) / k);
      o += dot(x + Math.cos(a) * d, y + Math.sin(a) * d, .55, 'fill="currentColor" fill-opacity=".55"');
    }
    return o;
  }
  const mini = (x, y, s, k, attr, tip, R) => ring(x, y, k, s, s * (k <= 4 ? .5 : .42), R() * 90, attr, tip || 'round', R, 2);

  /* 꽃 머리 모양 */
  const HEAD = {
    radial(a, P, x, y, r, R) {
      const k = a.n || 5, tip = a.tip || 'round', w = (a.w || 1.7 / k) * r, lay = a.lay || 1;
      let o = '';
      for (let L = 0; L < lay; L++) {
        const s = 1 - L * (a.step || .2);
        o += ring(x, y, k, r * s, w * (1 - L * .1), (L * 180) / k + (a.spin || 0), L % 2 ? P.b : P.a, tip, R);
      }
      if (a.tube) o += dot(x, y, r * a.tube, P.b);
      if (a.col) { const ex = x + r * .5, ey = y - r * .42; o += `<path d="M${n(x)} ${n(y)}L${n(ex)} ${n(ey)}" stroke="${P.ink}" stroke-width="1.1" stroke-linecap="round" fill="none"/>`; for (let i = 0; i < 7; i++) { const f = .45 + i * .09; o += dot(x + (ex - x) * f + (i % 2 ? 1.2 : -1.2), y + (ey - y) * f, .8, P.c); } }
      if (a.st) o += stamens(x, y, a.st, r * (a.sl || .42), P, R);
      if (a.disc) o += disc(x, y, r * a.disc, P, R, a.disc > .2);
      else if (!a.st) o += dot(x, y, r * .08, P.c);
      return o;
    },
    cup(a, P, x, y, r, R) {
      const k = a.n || 5, open = a.open || 30, by = y + r * .7, l = r * (a.cl || 1.55), w = r * (a.w || .5), tip = a.tip || 'point';
      let o = '';
      const fan = (m, spread, ll, at) => { for (let i = 0; i < m; i++) o += pet(x, by, ll, w, m > 1 ? -spread + (2 * spread * i) / (m - 1) : 0, at, tip); };
      fan(k - 1, open * 1.2, l * .94, P.b);
      if (a.st) o += stamens(x, by - l * .52, a.st, r * .34, P, R);
      fan(Math.max(2, k - 3), open * .62, l, P.a);
      if (a.hair) for (let i = 0; i < 16; i++) { const t = R(), s = (R() - .5) * r * 1.3; o += `<path d="M${n(x + s)} ${n(by + 2 + t * 5)}l${n((R() - .5) * 5)} ${n(3 + R() * 3)}" ${FINE}/>`; }
      return o;
    },
    funnel(a, P, x, y, r, R, rot) {
      rot = rot || a.tilt || 0;
      const l = r * (a.fl || 1.5), fw = r * (a.fw || .62), tw = r * .13;
      let body = `<path d="M${n(-tw)} 0C${n(-tw)} ${n(-l * .5)} ${n(-fw * .5)} ${n(-l * .78)} ${n(-fw)} ${n(-l)}C${n(-fw * .4)} ${n(-l * 1.14)} ${n(fw * .4)} ${n(-l * 1.14)} ${n(fw)} ${n(-l)}C${n(fw * .5)} ${n(-l * .78)} ${n(tw)} ${n(-l * .5)} ${n(tw)} 0Z" ${P.a}/>`;
      body += `<ellipse cx="0" cy="${n(-l * 1.02)}" rx="${n(fw)}" ry="${n(fw * .28)}" ${P.b}/>`;
      if (a.lobes) for (const s of [-1, -.4, .4, 1]) body += pet(s * fw * .78, -l * 1.0, r * .36, r * .17, s * 62, P.a, a.tip || 'round');
      if (a.st) for (let i = 0; i < 3; i++) body += `<path d="M0 ${n(-l * .7)}L${n((i - 1) * fw * .3)} ${n(-l * 1.24)}" stroke="${P.ink}" stroke-width=".5" fill="none"/>${dot((i - 1) * fw * .3, -l * 1.24, .9, P.c)}`;
      return `<g transform="translate(${n(x)} ${n(y + l * .55)}) rotate(${n(rot)})">${body}</g>`;
    },
    morning(a, P, x, y, r, R) {
      let o = dot(x, y, r, P.a) + ring(x, y, 5, r * .94, r * .13, 36, P.b, 'point', R, 0);
      return o + dot(x, y, r * .26, 'fill="currentColor" fill-opacity=".9"') + dot(x, y, r * .08, P.c);
    },
    fan(a, P, x, y, r, R) {
      const by = y + r * .72;
      let o = '';
      for (const [ang, l] of [[-64, 1.16], [64, 1.16], [-38, 1.36], [38, 1.36], [-14, 1.5], [14, 1.5]]) o += pet(x, by, r * l, r * .46, ang, P.b, 'fringe');
      for (const [ang, l] of [[-46, 1.02], [46, 1.02], [-20, 1.2], [20, 1.2], [0, 1.26]]) o += pet(x, by, r * l, r * .38, ang, P.a, 'fringe');
      return o + pet(x, by + r * .66, r * .72, r * .2, 0, LEAF, 'strap');
    },
    pom(a, P, x, y, r, R) {
      let o = '';
      [[13, 1], [12, .83], [11, .66], [9, .48], [6, .3]].forEach(([k, s], i) => { o += ring(x, y, k, r * s, r * .22 * (s + .3), i * 13, i % 2 ? P.b : P.a, 'notch', R, 2); });
      return o + dot(x, y, r * .1, P.c);
    },
    camellia(a, P, x, y, r, R) {
      let o = ring(x, y, 6, r, r * .62, 8, P.b, 'round', R, 5) + ring(x, y, 5, r * .76, r * .5, 40, P.a, 'round', R, 5);
      o += dot(x, y, r * .3, P.c);
      for (let i = 0; i < 18; i++) { const t = i * 2.4, d = r * .28 * Math.sqrt((i + .5) / 18); o += dot(x + Math.cos(t) * d, y + Math.sin(t) * d, .6, 'fill="currentColor" fill-opacity=".7"'); }
      return o;
    },
    star(a, P, x, y, r, R) {
      let o = ring(x, y, a.n || 6, r, r * (a.w || .3), a.spin || 30, P.a, a.tip || 'point', R);
      o += dot(x, y, r * .3, P.b);
      if (a.st) o += stamens(x, y, a.st, r * .55, P, R);
      return o + dot(x, y, r * .08, P.c);
    },
    daffodil(a, P, x, y, r, R) {
      let o = ring(x, y, 6, r, r * .34, 0, P.a, 'point', R);
      let d = '';
      for (let i = 0; i <= 18; i++) { const t = (i / 18) * Math.PI * 2, rr = r * (.42 + (i % 2 ? .05 : 0)); d += `${i ? 'L' : 'M'}${n(x + Math.cos(t) * rr)} ${n(y + Math.sin(t) * rr)}`; }
      o += `<path d="${d}Z" ${P.b}/>${dot(x, y, r * .22, P.c)}`;
      return o;
    },
    turk(a, P, x, y, r, R) {
      let o = '';
      for (let i = 0; i < 6; i++) {
        const rot = -110 + i * 44;
        o += pet(x, y, r * 1.02, r * .15, rot, i % 2 ? P.b : P.a, 'curl');
      }
      if (a.spots) for (let i = 0; i < 16; i++) { const t = R() * Math.PI * 2, d = r * (.25 + R() * .4); o += dot(x + Math.cos(t) * d, y - Math.abs(Math.sin(t)) * d, .7, P.c); }
      o += stamens(x, y, 6, r * .9, P, R, 70, 90);
      return o;
    },
    spider(a, P, x, y, r, R) {
      const k = a.n || 5, wide = a.wide || 0;
      let o = '';
      for (let i = 0; i < k; i++) {
        const ang = -90 + (i / (k - 1) - .5) * (a.fan || 170), fx = x + Math.cos(rad(ang)) * r * .62, fy = y + r * .32 + Math.sin(rad(ang)) * r * .62;
        o += `<path d="M${n(x)} ${n(y + r * .55)}L${n(fx)} ${n(fy)}" ${FINE}/>`;
        for (let j = 0; j < 6; j++) o += pet(fx, fy, r * (wide ? .56 : .5), r * (wide ? .15 : .065), ang + (j - 2.5) * (wide ? 26 : 34) + (R() - .5) * 8, j % 2 ? P.b : P.a, wide ? 'point' : 'curl');
        o += stamens(fx, fy, 6, r * (wide ? .68 : .92), P, R, wide ? 40 : 76, ang);
      }
      return o;
    },
    umbel(a, P, x, y, r, R) {
      const k = a.n || 13, base = [x, y + r * (a.deep || .8)];
      let o = '';
      for (let i = 0; i < k; i++) {
        const t = i / (k - 1) - .5, ang = -90 + t * (a.fan || 150), d = r * (1 - Math.abs(t) * .12), ex = x + Math.cos(rad(ang)) * d, ey = base[1] + Math.sin(rad(ang)) * d * (a.flat || 1);
        o += `<path d="M${n(base[0])} ${n(base[1])}L${n(ex)} ${n(ey)}" ${FINE}/>`;
        for (let j = 0; j < (a.sub || 4); j++) o += mini(ex + (R() - .5) * r * .34, ey + (R() - .5) * r * .28, r * (a.fs || .13), a.fp || 5, j % 2 ? P.a : P.b, 'round', R);
      }
      return o;
    },
    panicle(a, P, x, y, r, R) {
      const k = a.n || 34, h = r * (a.hh || 2), wd = r * (a.wd || .7), tip = a.tip || 'round';
      let o = `<path d="M${n(x)} ${n(y + h * .45)}L${n(x)} ${n(y - h * .55)}" ${FINE}/>`;
      for (let i = 0; i < k; i++) {
        const t = (i + .5) / k, fy = y + h * .45 - t * h, sp = wd * Math.pow(1 - t, a.pow || .8), fx = x + (R() - .5) * 2 * sp;
        o += `<path d="M${n(x)} ${n(fy + 3)}L${n(fx)} ${n(fy)}" ${FINE}/>`;
        o += mini(fx, fy, r * (a.fs || .15), a.fp || 4, i % 2 ? P.a : P.b, tip, R);
      }
      return o;
    },
    spike(a, P, x, y, r, R) {
      const k = a.n || 10, h = r * (a.hh || 2.3);
      let o = '';
      for (let i = 0; i < k; i++) {
        const t = i / (k - 1), fy = y + h * .5 - t * h, w = r * (a.wd || .36) * (1 - t * .55);
        o += pet(x, fy, w * 1.2, w * .5, -58, P.a, 'round') + pet(x, fy, w * 1.2, w * .5, 58, P.b, 'round');
        if (a.bead) o += dot(x, fy - w * .3, w * .34, P.a);
      }
      return o;
    },
    hang(a, P, x, y, r, R) {
      const k = a.n || 13, h = r * (a.hh || 2.7);
      let o = `<path d="M${n(x)} ${n(y)}Q${n(x + 3)} ${n(y + h * .5)} ${n(x - 1)} ${n(y + h)}" ${FINE}/>`;
      for (let i = 0; i < k; i++) {
        const t = i / (k - 1), fy = y + 2 + t * h, w = r * (a.wd || .42) * (1 - t * .68), s = i % 2 ? 1 : -1;
        o += pet(x + s * w * .15, fy, w * 1.22, w * .62, s * 112, i % 2 ? P.a : P.b, 'round');
      }
      return o;
    },
    hearts(a, P, x, y, r, R) {
      const k = a.n || 6, a0 = [x - r * 1.5, y + r * 1.1], c = [x, y - r * 1.05], b0 = [x + r * 1.45, y + r * .6];
      let o = curve(a0, c, b0, STEM);
      for (let i = 0; i < k; i++) {
        const t = .3 + (i / (k - 1)) * .66, p = qp(a0, c, b0, t), s = r * (.34 - (i / k) * .16);
        o += `<path d="M${n(p[0])} ${n(p[1])}v${n(s * .42)}" ${FINE}/>`;
        o += `<g transform="translate(${n(p[0])} ${n(p[1] + s * .42 + s * 1.05)}) rotate(180)">${`<path d="${OUT.heart(s * 1.08, s * .62)}" ${P.a}/>`}</g>${dot(p[0], p[1] + s * 1.6, s * .15, P.b)}`;
      }
      return o;
    },
    globe(a, P, x, y, r, R) {
      const k = a.n || 30;
      let o = '';
      for (let i = 0; i < k; i++) {
        const t = i * 2.4, d = r * .94 * Math.sqrt((i + .5) / k);
        o += mini(x + Math.cos(t) * d, y + Math.sin(t) * d * (a.squash || .9), r * (a.fs || .22), a.fp || 4, i % 3 ? P.a : P.b, a.tip || 'round', R);
      }
      return o;
    },
    puff(a, P, x, y, r, R) {
      const k = a.n || 13;
      let o = '';
      for (let i = 0; i < k; i++) {
        const t = i * 2.4, d = r * Math.sqrt((i + .5) / k), ex = x + Math.cos(t) * d, ey = y + Math.sin(t) * d;
        o += `<path d="M${n(x)} ${n(y)}L${n(ex)} ${n(ey)}" ${FINE}/>` + mini(ex, ey, r * (a.fs || .2), a.fp || 4, P.a, a.tip || 'point', R);
      }
      return o;
    },
    rose(a, P, x, y, r, R) {
      const tip = a.tip || 'round';
      let o = ring(x, y, a.n || 7, r, r * (a.w || .56), 0, P.b, tip, R, 8) + ring(x, y, 6, r * .76, r * .48, 24, P.a, tip, R, 8);
      if (a.st) return o + ring(x, y, 5, r * .5, r * .34, 8, P.b, tip, R, 8) + stamens(x, y, a.st, r * .32, P, R) + dot(x, y, r * .12, P.c);
      o += ring(x, y, 5, r * .54, r * .34, 8, P.b, tip, R, 8) + ring(x, y, 4, r * .34, r * .24, 40, P.a, tip, R, 8);
      if (a.swirl) o += `<path d="M${n(x)} ${n(y - r * .14)}a${n(r * .12)} ${n(r * .12)} 0 1 1 ${n(-r * .16)} ${n(r * .14)}" stroke="${P.ink}" stroke-width=".7" fill="none"/>`;
      return o + dot(x, y, r * .07, P.c);
    },
    dahlia(a, P, x, y, r, R) {
      let o = '';
      [[16, 1], [14, .8], [12, .6], [9, .42], [6, .24]].forEach(([k, s], i) => { o += ring(x, y, k, r * s, r * .15 * (s + .35), i * 11, i % 2 ? P.b : P.a, 'point', R, 1); });
      return o;
    },
    iris(a, P, x, y, r, R) {
      let o = pet(x, y, r * .98, r * .34, 0, P.b, 'round') + pet(x, y, r * .86, r * .28, -30, P.b, 'round') + pet(x, y, r * .86, r * .28, 30, P.b, 'round');
      for (const s of [-122, 122, 180]) o += pet(x, y + r * .05, r * 1.02, r * .4, s, P.a, 'round');
      for (const s of [-122, 122, 180]) o += `<g transform="translate(${n(x)} ${n(y)}) rotate(${s})"><path d="M0 ${n(-r * .28)}V${n(-r * .68)}" stroke="${P.ink}" stroke-width="${a.signal ? 1.6 : .9}" stroke-linecap="round" fill="none"/></g>`;
      return o + dot(x, y, r * .1, P.c);
    },
    viola(a, P, x, y, r, R) {
      const big = a.big ? 1 : 0;
      let o = pet(x, y, r * .95, r * (big ? .62 : .32), -26, P.b, 'round') + pet(x, y, r * .95, r * (big ? .62 : .32), 26, P.b, 'round');
      o += pet(x, y, r * .88, r * (big ? .55 : .3), -96, P.a, 'round') + pet(x, y, r * .88, r * (big ? .55 : .3), 96, P.a, 'round');
      o += pet(x, y, r * 1, r * (big ? .66 : .38), 180, P.a, 'round');
      if (!big) o += `<path d="M${n(x + r * .3)} ${n(y + r * .1)}q${n(r * .5)} ${n(r * .1)} ${n(r * .72)} ${n(-r * .2)}" stroke="${P.ink}" stroke-width="1.5" stroke-linecap="round" fill="none"/>`;
      const lines = big ? 7 : 5;
      for (let i = 0; i < lines; i++) { const t = rad(90 + (i - (lines - 1) / 2) * 13); o += `<path d="M${n(x)} ${n(y)}L${n(x + Math.cos(t) * r * (big ? .62 : .55))} ${n(y + Math.sin(t) * r * (big ? .62 : .55))}" stroke="${P.ink}" stroke-width=".55" fill="none"/>`; }
      return o + dot(x, y, r * .1, P.c);
    },
    orchid(a, P, x, y, r, R) {
      let o = pet(x, y, r, r * .36, 0, P.b, 'round') + pet(x, y, r * .95, r * .3, 132, P.b, 'round') + pet(x, y, r * .95, r * .3, -132, P.b, 'round');
      o += pet(x, y, r * 1.02, r * .62, 72, P.a, 'round') + pet(x, y, r * 1.02, r * .62, -72, P.a, 'round');
      o += pet(x, y + r * .06, r * .5, r * .24, 180, P.c, 'round') + dot(x, y, r * .1, P.c);
      return o;
    },
    commel(a, P, x, y, r, R) {
      let o = pet(x, y - r * .05, r, r * .62, -38, P.a, 'round') + pet(x, y - r * .05, r, r * .62, 38, P.a, 'round');
      o += pet(x, y, r * .3, r * .12, 180, 'fill="currentColor" fill-opacity=".8"', 'round');
      o += stamens(x, y, 5, r * .62, P, R, 74, 90);
      o += pet(x, y + r * .34, r * .78, r * .24, 112, LEAF, 'point');
      return o;
    },
    cycl(a, P, x, y, r, R) {
      const by = y + r * .62;
      let o = '';
      [-34, -16, 2, 20, 38].forEach((ang, i) => { o += pet(x, by, r * 1.45, r * .3, ang, i % 2 ? P.b : P.a, 'curl'); });
      return o + dot(x, by, r * .13, P.c);
    },
    bell(a, P, x, y, r, R) {
      const k = a.n || 3, top = [x - r * .9, y - r * .9], ctrl = [x, y - r * 1.5], end = [x + r, y - r * .35];
      let o = curve(top, ctrl, end, FINE);
      for (let i = 0; i < k; i++) {
        const p = qp(top, ctrl, end, .25 + (i / (k - 1 || 1)) * .72), len = r * (1.15 - i * .14), w = len * .4;
        o += `<path d="M${n(p[0])} ${n(p[1])}v3" ${FINE}/><g transform="translate(${n(p[0])} ${n(p[1] + 3)})"><path d="M0 0C${n(w)} 0 ${n(w)} ${n(len * .5)} ${n(w * .9)} ${n(len * .84)}L${n(w * 1.08)} ${n(len)}L${n(w * .4)} ${n(len * .9)}L0 ${n(len * 1.02)}L${n(-w * .4)} ${n(len * .9)}L${n(-w * 1.08)} ${n(len)}L${n(-w * .9)} ${n(len * .84)}C${n(-w)} ${n(len * .5)} ${n(-w)} 0 0 0Z" ${i % 2 ? P.b : P.a}/></g>`;
      }
      return o;
    },
    bract(a, P, x, y, r, R) {
      let o = ring(x, y, 8, r, r * .25, 0, P.a, 'point', R, 6) + ring(x, y, 6, r * .66, r * .2, 22, P.b, 'point', R, 6);
      for (let i = 0; i < 6; i++) { const t = i * 2.4, d = r * .13 * Math.sqrt(i + .5); o += dot(x + Math.cos(t) * d, y + Math.sin(t) * d, r * .05, P.c); }
      return o;
    },
    lotus(a, P, x, y, r, R) {
      const by = y + r * .68;
      let o = '';
      [[84, 1.08], [58, 1.28], [32, 1.42], [10, 1.5]].forEach(([ang, s], i) => {
        for (const sgn of [-1, 1]) o += pet(x, by, r * s, r * .36, sgn * ang, i % 2 ? P.a : P.b, 'point');
      });
      o += pet(x, by, r * 1.5, r * .34, 0, P.a, 'point');
      return o;
    },
    mist(a, P, x, y, r, R) {
      let o = '';
      const twig = (sx, sy, ang, len, d) => {
        const ex = sx + Math.cos(rad(ang)) * len, ey = sy + Math.sin(rad(ang)) * len;
        o += `<path d="M${n(sx)} ${n(sy)}L${n(ex)} ${n(ey)}" ${FINE}/>`;
        if (d <= 0) { o += dot(ex, ey, r * .05, P.a); return; }
        o += dot(ex, ey, r * .036, P.b);
        twig(ex, ey, ang - 24 - R() * 20, len * .74, d - 1);
        twig(ex, ey, ang + 24 + R() * 20, len * .74, d - 1);
      };
      for (let i = 0; i < 5; i++) twig(x, y + r * .95, -90 + (i - 2) * 26, r * .46, 4);
      return o;
    },
    daphne(a, P, x, y, r, R) {
      let o = '';
      const k = a.n || 9;
      for (let i = 0; i < k; i++) {
        const t = i * 2.4, d = r * .72 * Math.sqrt((i + .5) / k), fx = x + Math.cos(t) * d, fy = y + Math.sin(t) * d * .86;
        o += ring(fx, fy, 4, r * .3, r * .14, R() * 45, i % 2 ? P.a : P.b, 'point', R, 2) + dot(fx, fy, r * .05, P.c);
      }
      return o;
    },
    bud(a, P, x, y, r) { return pet(x, y + r * .4, r * 1.2, r * .4, 0, P.a, 'point'); },
  };
  function head(a, P, x, y, r, R, rot) {
    const fn = HEAD[a.h] || HEAD.radial;
    return fn(a, P, x, y, r, R, rot);
  }

  /* 잎 모양 */
  function leaf(type, x, y, len, rot, R) {
    switch (type) {
      case 'none': return '';
      case 'lance': return pet(x, y, len, len * .15, rot, LEAF, 'point');
      case 'oval': return pet(x, y, len, len * .32, rot, LEAF, 'round');
      case 'glossy': {
        const t = rad(rot - 90), ex = x + Math.cos(t) * len * .86, ey = y + Math.sin(t) * len * .86;
        return pet(x, y, len, len * .3, rot, 'fill="currentColor" fill-opacity=".3" stroke="currentColor" stroke-width=".7"', 'point') + `<path d="M${n(x)} ${n(y)}L${n(ex)} ${n(ey)}" ${FINE}/>`;
      }
      case 'strap': return pet(x, y, len, len * .075, rot, LEAF, 'strap');
      case 'sword': return pet(x, y, len, len * .09, rot, LEAF, 'point');
      case 'needle': {
        let o = '';
        const t = rad(rot - 90), ex = x + Math.cos(t) * len, ey = y + Math.sin(t) * len;
        o += `<path d="M${n(x)} ${n(y)}L${n(ex)} ${n(ey)}" stroke="currentColor" stroke-width="1" stroke-linecap="round" fill="none"/>`;
        return o;
      }
      case 'heart': return pet(x, y, len, len * .46, rot, LEAF, 'heart');
      case 'kidney': return pet(x, y, len * .9, len * .62, rot, LEAF, 'heart');
      case 'tooth': return pet(x, y, len, len * .24, rot, LEAF, 'fringe');
      case 'feather': case 'pinnate': {
        const t = rad(rot - 90), ex = x + Math.cos(t) * len, ey = y + Math.sin(t) * len, m = type === 'feather' ? 6 : 5, wide = type === 'pinnate';
        let o = `<path d="M${n(x)} ${n(y)}L${n(ex)} ${n(ey)}" ${FINE}/>`;
        for (let i = 1; i <= m; i++) {
          const f = i / (m + .6), px = x + (ex - x) * f, py = y + (ey - y) * f, l = len * .34 * (1.15 - f);
          for (const s of [-1, 1]) o += wide ? pet(px, py, l, l * .3, rot + s * 52, LEAF, 'round') : `<path d="M${n(px)} ${n(py)}l${n(Math.cos(t + s * .85) * l)} ${n(Math.sin(t + s * .85) * l)}" ${FINE}/>`;
        }
        return wide ? pet(ex, ey, len * .2, len * .07, rot, LEAF, 'round') + o : o;
      }
      case 'dandelion': {
        const m = 4; let d = 'M0 0';
        for (let i = 0; i < m; i++) { const y0 = -len * (i / m), y1 = -len * ((i + .55) / m); d += `L${n(len * .12)} ${n(y1 + len * .1)}L${n(len * .045)} ${n(y0 - len * .16)}`; }
        d += `L0 ${n(-len)}`;
        for (let i = m - 1; i >= 0; i--) { const y0 = -len * (i / m), y1 = -len * ((i + .55) / m); d += `L${n(-len * .045)} ${n(y0 - len * .16)}L${n(-len * .12)} ${n(y1 + len * .1)}`; }
        return `<path transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)})" d="${d}Z" ${LEAF}/>`;
      }
      case 'palm': {
        let o = '';
        for (let i = -2; i <= 2; i++) o += pet(x, y, len * (1 - Math.abs(i) * .14), len * .17, rot + i * 34, LEAF, 'point');
        return o;
      }
      case 'pad': return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(len)}" ry="${n(len * .22)}" ${LEAF}/>`;
      default: return pet(x, y, len, len * .2, rot, LEAF, 'point');
    }
  }

  /* 식물 전체의 자람새 */
  const HABIT = {
    herb(a, P, R) {
      const hy = a.y || 48, r = a.r || 26, lean = (R() - .5) * 8, hx = 60 + lean, A = [60, G], C = [60 - lean * .4, (G + hy) / 2], B = [hx, hy + r * .1];
      let o = '';
      const pairs = a.pairs || 3, ltype = a.l || 'lance', len = a.ll || 26;
      for (let i = 0; i < pairs; i++) {
        const t = .16 + (i / pairs) * .58, p = qp(A, C, B, t), L = len * (1 - i * .13);
        o += leaf(ltype, p[0], p[1], L, -62 - R() * 14, R) + leaf(ltype, p[0], p[1], L * .92, 62 + R() * 14, R);
      }
      o += curve(A, C, B, a.tall ? 'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"' : STEM);
      if (a.thorn) for (let i = 0; i < 5; i++) { const p = qp(A, C, B, .15 + i * .15), s = i % 2 ? 1 : -1; o += `<path d="M${n(p[0])} ${n(p[1])}l${s * 3} -1.800" ${FINE}/>`; }
      if (a.side) for (const s of [-1, 1]) {
        const p = qp(A, C, B, .62), tip = [hx + s * 25, hy + 24];
        o += curve(p, [p[0] + s * 10, p[1] - 12], tip, STEM) + HEAD.bud(a, P, tip[0], tip[1] - 5, 7);
      }
      return o + head(a, P, hx, hy, r, R);
    },
    tower(a, P, R) {
      const k = a.k || 3, A = [60, G], B = [60, 24], r = a.r || 15;
      let o = `<path d="M60 ${G}L60 24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`;
      for (let i = 0; i < 4; i++) {
        const y = G - 14 - i * 20, L = (a.ll || 30) * (1 - i * .17);
        o += leaf(a.l || 'oval', 60, y, L, i % 2 ? 72 : -72, R);
      }
      for (let i = 0; i < k; i++) {
        const t = i / (k - 1 || 1), y = 84 - t * 52, x = 60 + (i % 2 ? 13 : -13), s = 1 - t * .32;
        o += `<path d="M60 ${n(y + 7)}L${x} ${n(y)}" ${FINE}/>` + head(a, P, x, y, r * s, R);
      }
      return o + HEAD.bud(a, P, 60, 22, 7);
    },
    scape(a, P, R) {
      const hy = a.y || 46, r = a.r || 26, lean = (R() - .5) * 6, hx = 60 + lean, ltype = a.l || 'strap';
      const k = a.lc || 6, spread = a.ls || 62, len = a.ll || 44;
      let o = '';
      const stalked = ['heart', 'kidney', 'oval'].includes(ltype);
      for (let i = 0; i < k; i++) {
        const t = k > 1 ? i / (k - 1) - .5 : 0;
        if (stalked) {
          const tip = [60 + t * (a.lw || 82), G - 12 - (.5 - Math.abs(t)) * (a.lr || 30)];
          o += curve([60, G], [60 + t * 26, G - 3], tip, STEM) + leaf(ltype, tip[0], tip[1], len, t * 96 + (R() - .5) * 8, R);
        } else o += leaf(ltype, 60 + t * 12, G, len * (1 - Math.abs(t) * .34), t * 2 * spread + (R() - .5) * 6, R);
      }
      o += curve([60, G], [60 - lean, (G + hy) / 2], [hx, hy + r * .2], STEM);
      if (a.k > 1) {
        const tip = [hx + 24, hy + 26];
        o += curve([60, G], [66, hy + 58], tip, STEM) + head(a, P, tip[0], tip[1], r * .68, R);
      }
      return o + head(a, P, hx, hy, r, R);
    },
    branch(a, P, R) {
      const A = [16, G - 2], C = [50, 84], B = [106, 40];
      const k = a.k || 6, r = a.r || 12;
      let o = curve(A, C, B, WOOD);
      const twigs = [[.42, -1], [.62, 1], [.8, -1]];
      const spots = [];
      for (const [t, s] of twigs) {
        const p = qp(A, C, B, t), e = [p[0] + (s > 0 ? 24 : -10), p[1] + (s > 0 ? 10 : -30)];
        o += curve(p, [(p[0] + e[0]) / 2 + s * 3, (p[1] + e[1]) / 2 + 2], e, 'stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"');
        spots.push(e);
      }
      for (let i = 0; i < k - spots.length; i++) spots.push(qp(A, C, B, .34 + (i / Math.max(1, k - spots.length - 1)) * .66));
      for (let i = 0; i < 4; i++) {
        if (a.l && a.l !== 'none') { const p = qp(A, C, B, .28 + i * .2), s = i % 2 ? 1 : -1; o += leaf(a.l, p[0], p[1], a.ll || 22, s * 70 + 40, R); }
      }
      spots.forEach((s, i) => {
        const jx = (R() - .5) * 4, jy = (R() - .5) * 4;
        o += head(a, P, s[0] + jx, s[1] + jy, r * (.86 + R() * .24), R, i * 40 - 30);
      });
      return o;
    },
    shrub(a, P, R) {
      const k = a.k || 3, r = a.r || 15, hy = a.y || 52;
      let o = '';
      const tips = [];
      for (let i = 0; i < k; i++) {
        const t = k > 1 ? i / (k - 1) - .5 : 0, tip = [60 + t * (a.wide || 64) + (R() - .5) * 4, hy + Math.abs(t) * 30 + (R() - .5) * 8], c = [60 + t * 18, (G + tip[1]) / 2 + 8];
        o += curve([60, G], c, tip, STEM);
        for (let j = 0; j < (a.pairs || 3); j++) {
          const p = qp([60, G], c, tip, .25 + j * .2);
          o += leaf(a.l || 'lance', p[0], p[1], (a.ll || 17) * (1 - j * .14), (j % 2 ? 60 : -60) + t * 40, R);
        }
        tips.push(tip);
      }
      tips.forEach((tip) => { o += head(a, P, tip[0], tip[1], r * (.9 + R() * .2), R); });
      return o;
    },
    vine(a, P, R) {
      let o = `<path d="M34 ${G}C76 118 22 92 58 68S96 34 78 18" ${STEM}/>`;
      const pts = [[47, 112], [52, 80], [76, 52]];
      pts.forEach(([x, y], i) => { o += leaf(a.l || 'heart', x, y, a.ll || 22, i % 2 ? 66 : -74, R); });
      o += `<path d="M66 96c8-4 13 0 10 6s-9 3-6-2" ${FINE}/>`;
      const heads = a.rot ? [[52, 48, -22], [88, 66, 34], [28, 88, -40]] : [[42, 54, 0], [88, 42, 0], [78, 96, 0]];
      heads.slice(0, a.k || 2).forEach(([x, y, rot]) => { o += head(a, P, x, y, a.r || 19, R, rot); });
      return o;
    },
    water(a, P, R) {
      const hy = a.y || 52, r = a.r || 26, w = 128;
      let o = '';
      if (a.h !== 'radial' || a.pad) o += leaf('pad', 92, w - 2, 21, 0, R) + `<path d="M92 ${w - 2}L78 ${w + 12}" ${FINE}/>`;
      o += leaf('pad', 30, w + 2, 15, 0, R);
      for (const [x, y, l] of [[14, w + 9, 26], [62, w + 8, 34], [84, w + 12, 24]]) o += `<path d="M${x} ${y}h${l}" ${FINE}/>`;
      if (a.spine) for (let i = 0; i < 14; i++) { const x = 72 + i * 3, y = w - 3 + (i % 2); o += `<path d="M${x} ${y}v-2" ${FINE}/>`; }
      o += curve([56, G], [52, (G + hy) / 2], [60, hy + r * .5], STEM);
      if (a.feather) for (const [x, y] of [[44, w + 8], [68, w + 6]]) o += leaf('feather', x, y, 18, x < 56 ? -130 : 130, R);
      return o + head(a, P, 60, hy, r, R);
    },
    arch(a, P, R) {
      const k = a.k || 3, A = [46, G - 8], C = [22, 22], B = [112, 58];
      let o = '';
      for (const [rot, len] of [[-66, 40], [64, 42], [-30, 30], [36, 30]]) o += leaf(a.l || 'oval', 54, G - 4, len, rot, R);
      o += curve(A, C, B, STEM);
      for (let i = 0; i < k; i++) {
        const p = qp(A, C, B, .46 + (i / (k - 1 || 1)) * .52);
        if (a.h === 'funnel') o += head(a, P, p[0], p[1] - 3, (a.r || 12) * (1 - i * .08), R, 58);
        else o += `<path d="M${n(p[0])} ${n(p[1])}v5" ${FINE}/>` + head(a, P, p[0], p[1] + 12, (a.r || 15) * (1 - i * .1), R);
      }
      return o;
    },
    bar(a, P, R) {
      let o = `<path d="M6 22Q60 12 114 26" ${WOOD}/>`;
      for (const [x, y, rot] of [[100, 23, 164], [22, 21, 200]]) o += leaf(a.l || 'pinnate', x, y, a.ll || 30, rot, R);
      o += `<path d="M42 18l-5 -9M78 18l4 -9" ${STEM}/>`;
      o += head(a, P, 48, 18, a.r || 24, R) + head(a, P, 80, 19, (a.r || 24) * .78, R);
      return o;
    },
  };

  const ART = {
    복수초: { s: 'herb', y: 74, r: 27, l: 'feather', pairs: 2, ll: 28, h: 'radial', n: 16, w: .15, st: 18, sl: .3, lay: 2, step: .14 },
    매화: { s: 'branch', k: 6, r: 12, h: 'radial', n: 5, w: .42, st: 14, sl: .56 },
    프리지어: { s: 'arch', k: 5, r: 11, l: 'sword', h: 'funnel', lobes: 1, fw: .6, tilt: 0 },
    산수유: { s: 'branch', k: 7, r: 13, h: 'puff', n: 12, fs: .2 },
    개나리: { s: 'branch', k: 9, r: 10, h: 'radial', n: 4, tip: 'strap', w: .2, tube: .1 },
    진달래: { s: 'branch', k: 5, r: 14, h: 'radial', n: 5, w: .5, st: 7, sl: .72, tube: .12 },
    목련: { s: 'branch', k: 4, r: 15, h: 'cup', n: 6, open: 28, w: .42, tip: 'round' },
    왕벚나무: { s: 'branch', k: 8, r: 11, h: 'radial', n: 5, tip: 'notch', w: .42, st: 9, sl: .5 },
    유채: { s: 'herb', y: 46, r: 22, l: 'oval', pairs: 3, ll: 28, h: 'panicle', n: 26, wd: .72, pow: .55, fs: .2, fp: 4 },
    민들레: { s: 'scape', y: 60, r: 25, l: 'dandelion', lc: 6, ls: 58, ll: 50, h: 'radial', n: 26, tip: 'strap', w: .06, lay: 3, step: .24 },
    제비꽃: { s: 'scape', y: 72, r: 21, l: 'heart', lc: 4, ll: 22, h: 'viola' },
    튤립: { s: 'scape', y: 48, r: 25, l: 'lance', lc: 3, ls: 26, ll: 62, h: 'cup', n: 5, open: 18, cl: 1.5, w: .56, tip: 'round' },
    철쭉: { s: 'branch', k: 5, r: 16, l: 'oval', ll: 18, h: 'radial', n: 5, w: .58, st: 10, sl: .62, tube: .1 },
    라일락: { s: 'shrub', k: 2, r: 15, y: 46, wide: 46, l: 'heart', pairs: 3, ll: 19, h: 'panicle', n: 42, wd: .78, fs: .2, tip: 'round' },
    모란: { s: 'shrub', k: 2, r: 27, y: 50, wide: 48, l: 'pinnate', pairs: 2, ll: 24, h: 'rose', n: 8, w: .6, tip: 'notch', st: 26 },
    등나무: { s: 'bar', r: 25, l: 'pinnate', h: 'hang', n: 15, wd: .46 },
    아까시나무: { s: 'bar', r: 22, l: 'pinnate', h: 'hang', n: 11, wd: .5, hh: 2.2 },
    이팝나무: { s: 'branch', k: 5, r: 16, l: 'oval', ll: 18, h: 'puff', n: 14, fs: .34, fp: 4, tip: 'strap' },
    금낭화: { s: 'scape', y: 56, r: 33, l: 'lance', lc: 4, ls: 44, ll: 34, h: 'hearts', n: 6 },
    작약: { s: 'herb', y: 46, r: 30, l: 'lance', pairs: 3, ll: 32, h: 'pom' },
    애기똥풀: { s: 'shrub', k: 3, r: 12, y: 56, l: 'feather', pairs: 2, ll: 24, h: 'radial', n: 4, w: .55, st: 12, sl: .34 },
    장미: { s: 'herb', y: 46, r: 25, l: 'pinnate', pairs: 2, ll: 30, thorn: 1, h: 'rose', n: 5, w: .62, tip: 'point', swirl: 1 },
    수국: { s: 'shrub', k: 2, r: 26, y: 54, wide: 44, l: 'oval', pairs: 2, ll: 28, h: 'globe', n: 30, fs: .25, fp: 4 },
    라벤더: { s: 'shrub', k: 5, r: 15, y: 40, wide: 58, l: 'needle', pairs: 3, ll: 18, h: 'spike', n: 11 },
    백합: { s: 'herb', y: 52, r: 25, l: 'lance', pairs: 5, ll: 22, side: 0, h: 'funnel', lobes: 1, tip: 'point', fw: .74, st: 1, tilt: 34 },
    큰금계국: { s: 'herb', y: 48, r: 26, l: 'lance', pairs: 2, ll: 34, h: 'radial', n: 8, tip: 'tooth', w: .3, disc: .2 },
    접시꽃: { s: 'tower', k: 4, r: 18, l: 'palm', ll: 26, h: 'radial', n: 5, w: .66, tube: .26, col: 1 },
    맥문동: { s: 'scape', y: 48, r: 18, l: 'strap', lc: 9, ls: 56, ll: 62, h: 'spike', n: 12, wd: .3, bead: 1 },
    봉선화: { s: 'tower', k: 4, r: 13, l: 'lance', ll: 34, h: 'radial', n: 5, w: .55, tip: 'notch', tube: .12 },
    개망초: { s: 'shrub', k: 5, r: 12, y: 50, wide: 74, l: 'lance', pairs: 2, ll: 20, h: 'radial', n: 26, tip: 'strap', w: .06, disc: .3 },
    메리골드: { s: 'shrub', k: 3, r: 17, y: 54, wide: 56, l: 'feather', pairs: 2, ll: 20, h: 'pom' },
    참나리: { s: 'tower', k: 3, r: 19, l: 'lance', ll: 26, h: 'turk', spots: 1 },
    능소화: { s: 'vine', k: 3, r: 18, rot: 1, l: 'pinnate', ll: 28, h: 'funnel', lobes: 1, fw: .72, st: 0 },
    연꽃: { s: 'water', y: 56, r: 30, h: 'lotus' },
    해바라기: { s: 'herb', y: 44, r: 33, l: 'heart', pairs: 2, ll: 32, tall: 1, h: 'radial', n: 22, w: .14, tip: 'point', lay: 2, step: .1, disc: .5 },
    나팔꽃: { s: 'vine', k: 2, r: 19, l: 'heart', ll: 24, h: 'morning' },
    달맞이꽃: { s: 'tower', k: 3, r: 17, l: 'lance', ll: 32, h: 'radial', n: 4, tip: 'notch', w: .62, st: 8, sl: .36 },
    닭의장풀: { s: 'herb', y: 58, r: 23, l: 'lance', pairs: 3, ll: 30, h: 'commel' },
    배롱나무: { s: 'branch', k: 4, r: 14, l: 'oval', ll: 18, h: 'panicle', n: 16, wd: .9, fs: .32, fp: 6, tip: 'fringe', pow: .7 },
    무궁화: { s: 'branch', k: 3, r: 21, l: 'oval', ll: 22, h: 'radial', n: 5, w: .66, tube: .22, col: 1 },
    달리아: { s: 'herb', y: 46, r: 30, l: 'pinnate', pairs: 2, ll: 30, h: 'dahlia' },
    쑥부쟁이: { s: 'shrub', k: 4, r: 15, y: 48, wide: 70, l: 'lance', pairs: 3, ll: 20, h: 'radial', n: 16, tip: 'strap', w: .09, disc: .24 },
    용담: { s: 'herb', y: 56, r: 21, l: 'lance', pairs: 4, ll: 24, h: 'funnel', fw: .6, lobes: 1, tip: 'point', side: 1 },
    코스모스: { s: 'herb', y: 44, r: 29, l: 'feather', pairs: 3, ll: 30, h: 'radial', n: 8, tip: 'tooth', w: .3, disc: .15 },
    꽃무릇: { s: 'scape', y: 46, r: 30, l: 'none', lc: 0, h: 'spider', n: 5 },
    구절초: { s: 'herb', y: 48, r: 26, l: 'feather', pairs: 3, ll: 26, h: 'radial', n: 15, tip: 'round', w: .12, disc: .22 },
    국화: { s: 'herb', y: 46, r: 29, l: 'tooth', pairs: 3, ll: 26, h: 'radial', n: 16, tip: 'strap', w: .09, lay: 4, step: .19 },
    산국: { s: 'shrub', k: 6, r: 10, y: 48, wide: 74, l: 'tooth', pairs: 3, ll: 17, h: 'radial', n: 12, w: .15, tip: 'round', disc: .34 },
    털머위: { s: 'scape', y: 46, r: 21, k: 2, l: 'kidney', lc: 3, ll: 28, lw: 62, lr: 10, h: 'radial', n: 11, tip: 'strap', w: .13, disc: .26 },
    감국: { s: 'shrub', k: 5, r: 12, y: 50, wide: 66, l: 'tooth', pairs: 3, ll: 18, h: 'radial', n: 14, w: .12, tip: 'round', disc: .3 },
    애기동백: { s: 'branch', k: 4, r: 17, l: 'glossy', ll: 20, h: 'radial', n: 7, w: .42, tip: 'notch', st: 18, sl: .34 },
    팬지: { s: 'scape', y: 62, r: 29, l: 'oval', lc: 5, ll: 24, lr: 22, h: 'viola', big: 1 },
    시클라멘: { s: 'scape', y: 52, r: 21, k: 2, l: 'heart', lc: 5, ll: 22, h: 'cycl' },
    포인세티아: { s: 'herb', y: 50, r: 34, l: 'oval', pairs: 2, ll: 34, h: 'bract' },
    동백: { s: 'branch', k: 3, r: 20, l: 'glossy', ll: 22, h: 'camellia' },
    수선화: { s: 'scape', y: 48, r: 22, k: 2, l: 'strap', lc: 6, ls: 34, ll: 70, h: 'daffodil' },
    호접란: { s: 'arch', k: 3, r: 16, l: 'oval', h: 'orchid' },
    거베라: { s: 'scape', y: 46, r: 30, l: 'dandelion', lc: 5, ls: 50, ll: 54, h: 'radial', n: 24, tip: 'strap', w: .085, lay: 2, step: .16, disc: .24 },
    카네이션: { s: 'herb', y: 50, r: 25, l: 'lance', pairs: 4, ll: 26, h: 'fan' },
    안개꽃: { s: 'scape', y: 62, r: 44, l: 'lance', lc: 3, ls: 66, ll: 24, h: 'mist' },
    금강초롱꽃: { s: 'herb', y: 66, r: 25, l: 'oval', pairs: 2, ll: 28, h: 'bell', n: 3 },
    매화마름: { s: 'water', y: 90, r: 20, feather: 1, pad: 0, h: 'radial', n: 5, w: .56, st: 12, sl: .34 },
    동강할미꽃: { s: 'herb', y: 62, r: 22, l: 'feather', pairs: 2, ll: 30, h: 'cup', n: 6, open: 30, w: .44, st: 12, hair: 1 },
    메밀꽃: { s: 'shrub', k: 3, r: 15, y: 48, wide: 56, l: 'heart', pairs: 2, ll: 22, h: 'puff', n: 13, fs: .24, fp: 5, tip: 'round' },
    미선나무: { s: 'branch', k: 9, r: 10, h: 'radial', n: 4, tip: 'round', w: .36, tube: .12 },
    모감주나무: { s: 'branch', k: 3, r: 18, l: 'pinnate', ll: 22, h: 'panicle', n: 24, wd: .66, fs: .2, fp: 4, pow: .7 },
    변산바람꽃: { s: 'herb', y: 82, r: 23, l: 'feather', pairs: 1, ll: 30, h: 'radial', n: 5, w: .46, tip: 'point', st: 14, sl: .4, tube: .12 },
    노랑붓꽃: { s: 'scape', y: 56, r: 24, l: 'sword', lc: 5, ls: 22, ll: 72, h: 'iris' },
    위도상사화: { s: 'scape', y: 48, r: 30, lc: 0, l: 'none', h: 'spider', n: 5, wide: 1, fan: 150 },
    홍도원추리: { s: 'scape', y: 56, r: 24, k: 2, l: 'strap', lc: 6, ls: 66, ll: 58, h: 'funnel', lobes: 1, tip: 'round', fw: .7, st: 1, tilt: -26 },
    진노랑상사화: { s: 'scape', y: 48, r: 28, lc: 0, l: 'none', h: 'spider', n: 4, wide: 1, fan: 128 },
    모데미풀: { s: 'herb', y: 66, r: 24, l: 'palm', pairs: 2, ll: 24, h: 'radial', n: 5, w: .32, tip: 'point', st: 16, sl: .4, tube: .14 },
    노랑무늬붓꽃: { s: 'scape', y: 62, r: 23, l: 'sword', lc: 4, ls: 30, ll: 62, h: 'iris', signal: 1 },
    금강제비꽃: { s: 'scape', y: 64, r: 20, l: 'heart', lc: 3, ll: 24, lw: 64, h: 'viola' },
    가시연꽃: { s: 'water', y: 88, r: 27, pad: 1, spine: 1, h: 'radial', n: 16, w: .13, tip: 'point', lay: 2, step: .2, st: 8, sl: .22 },
    백서향: { s: 'branch', k: 3, r: 18, l: 'glossy', ll: 24, h: 'daphne', n: 11 },
    해국: { s: 'shrub', k: 3, r: 17, y: 62, wide: 60, l: 'oval', pairs: 2, ll: 18, h: 'radial', n: 20, tip: 'strap', w: .08, disc: .26 },
    제주백서향: { s: 'branch', k: 2, r: 20, l: 'glossy', ll: 26, h: 'daphne', n: 8 },
    문주란: { s: 'scape', y: 50, r: 30, l: 'strap', lc: 7, ls: 58, ll: 52, h: 'spider', n: 7, fan: 196 },
    참꽃나무: { s: 'branch', k: 4, r: 17, l: 'oval', ll: 16, h: 'radial', n: 5, w: .56, st: 5, sl: .6, tube: .12 },
    섬말나리: { s: 'tower', k: 2, r: 20, l: 'lance', ll: 30, h: 'turk' },
    섬기린초: { s: 'herb', y: 54, r: 24, l: 'tooth', pairs: 4, ll: 22, h: 'umbel', n: 9, fan: 150, flat: .6, sub: 3, fs: .15, fp: 5 },
    울릉국화: { s: 'shrub', k: 3, r: 18, y: 54, wide: 54, l: 'feather', pairs: 3, ll: 22, h: 'radial', n: 18, tip: 'round', w: .1, disc: .24 },
    섬바디: { s: 'herb', y: 44, r: 29, tall: 1, l: 'pinnate', pairs: 2, ll: 34, h: 'umbel', n: 15, fan: 164, flat: .5, sub: 5, fs: .09, fp: 5 },
  };

  return {
    has: (name) => !!ART[name],
    /* 꽃 전체 표본 */
    specimen(sp, P, seed) {
      const a = ART[sp.name], R = rng(seed);
      return (HABIT[a.s] || HABIT.herb)(a, P, R);
    },
    /* 작은 칸에 쓰는 꽃 머리만 */
    head(sp, P, x, y, r, seed) {
      const a = ART[sp.name], R = rng(seed);
      return head(a, P, x, y, r, R, 0);
    },
    /* 씨앗 목록처럼 아주 작은 칸에 쓰는 꽃 */
    mini(sp, P, seed) {
      const a = ART[sp.name], R = rng(seed);
      const place = { hang: [50, 8, 31], spike: [50, 50, 30], panicle: [50, 50, 32], hearts: [50, 58, 30], bell: [50, 62, 36], umbel: [50, 44, 40], spider: [50, 44, 40], mist: [50, 42, 44], cup: [50, 46, 32], cycl: [50, 44, 34], funnel: [50, 34, 30], lotus: [50, 44, 34], fan: [50, 44, 32] }[a.h] || [50, 50, 40];
      return head(a, P, place[0], place[1], place[2], R, 0);
    },
    /* 싹이 자라는 동안의 잎 */
    leaf(sp, x, y, len, rot, seed) {
      const a = ART[sp.name];
      const t = a && a.l && !['none'].includes(a.l) ? a.l : 'lance';
      return leaf(t, x, y, len, rot, rng(seed));
    },
  };
})();
