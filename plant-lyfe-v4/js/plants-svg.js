// ─── SVG Plant Renderer (polished) ───────────────────────────
const W = 64, H = 80;

const PAL = {
  cactus:    { stem:'#4a8a3a', stem2:'#6aaa50', spine:'#d4eec8', pot:'#b85840', pot2:'#d47060', soil:'#4a3020', soil2:'#6a4828', flower:'#ff6090' },
  succulent: { stem:'#5aaa58', stem2:'#80cc70', inner:'#a8d890', tip:'#d04080', pot:'#7a5040', pot2:'#9a7060', soil:'#4a3020', soil2:'#6a4828' },
  fern:      { stem:'#3a7830', stem2:'#58a848', leaf:'#5aaa40', llight:'#90cc70', pot:'#506870', pot2:'#708898', soil:'#344048', soil2:'#485a60' },
  sunflower: { stem:'#507828', stem2:'#70a840', leaf:'#688030', petal:'#f0c820', petal2:'#fce060', centre:'#4a2c10', centre2:'#6a4020', pot:'#6850a0', pot2:'#9070c0', soil:'#4a3020', soil2:'#6a4828' },
  flower:    { stem:'#408038', stem2:'#60a858', leaf:'#50a040', petal:'#e878a8', petal2:'#f8a0c8', centre:'#f0d020', pot:'#4858b0', pot2:'#7080d0', soil:'#344060', soil2:'#485880' },
  bamboo:    { stem:'#7ab030', stem2:'#9ad050', joint:'#507820', leaf:'#a0cc58', pot:'#6a4828', pot2:'#8a6840', soil:'#4a3020', soil2:'#6a4828' },
  mushroom:  { stem:'#d8d0c0', stem2:'#f0e8d8', cap:'#b83020', cap2:'#d84040', spot:'#f8f0e8', spot2:'#ffffff', pot:'#485868', pot2:'#687888', soil:'#343c44', soil2:'#485060' },
  orchid:    { stem:'#58a848', stem2:'#78c868', leaf:'#80c070', petal:'#c080d0', petal2:'#e0a8f0', centre:'#f0c820', pot:'#182060', pot2:'#303890', soil:'#101830', soil2:'#202848' },
  lotus:     { stem:'#408038', pad:'#38a040', pad2:'#58c060', petal:'#e890b8', petal2:'#f8b8d0', centre:'#f0d020', water:'#1060a8', water2:'#2080d0', ripple:'#40a0e0' },
  rainbow:   { stem:'#48a038', stem2:'#68c058', leaf:'#78b858', r:'#e83020', o:'#f08020', y:'#f0d020', g:'#40a830', b:'#2070c0', v:'#8030a0', pot:'#181818', pot2:'#302828', soil:'#101010', soil2:'#201818' },
};

// ── SVG helpers ───────────────────────────────────────────────
const NS = 'http://www.w3.org/2000/svg';
function mkSVG() {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.imageRendering = 'pixelated';
  return svg;
}
function px(svg, x, y, w, h, fill, op) {
  const r = document.createElementNS(NS, 'rect');
  r.setAttribute('x', x); r.setAttribute('y', y);
  r.setAttribute('width', w); r.setAttribute('height', h);
  r.setAttribute('fill', fill);
  if (op !== undefined) r.setAttribute('opacity', op);
  svg.appendChild(r); return r;
}
function circ(svg, cx, cy, r, fill, op) {
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('cx', cx); c.setAttribute('cy', cy);
  c.setAttribute('r', r); c.setAttribute('fill', fill);
  if (op !== undefined) c.setAttribute('opacity', op);
  svg.appendChild(c); return c;
}
function poly(svg, pts, fill, op) {
  const p = document.createElementNS(NS, 'polygon');
  p.setAttribute('points', pts.map(([x,y])=>`${x},${y}`).join(' '));
  p.setAttribute('fill', fill);
  if (op !== undefined) p.setAttribute('opacity', op);
  svg.appendChild(p); return p;
}

// ── Pot with rim, body, shadow, soil ─────────────────────────
function drawPot(svg, c, potH=19) {
  const py = H - potH;
  // drop shadow
  px(svg, 14, H-3, 38, 4, '#000000', .25);
  // soil
  px(svg, 15, py+1, 34, 5, c.soil2||'#6a4828');
  px(svg, 15, py+1, 34, 2, c.soil||'#4a3020');
  // pot body (trapezoid: wider at top, narrower at bottom)
  poly(svg, [[13,py+6],[51,py+6],[47,H-3],[17,H-3]], c.pot);
  // pot body highlight (left face)
  poly(svg, [[13,py+6],[20,py+6],[16,H-3],[13,H-3]], c.pot2||c.pot, .5);
  // rim
  px(svg, 10, py+1, 44, 5, c.pot2||c.pot);
  px(svg, 10, py+1, 44, 2, '#ffffff', .12);
  px(svg, 10, py+5, 44, 1, '#000000', .15);
  // rim left/right shading
  px(svg, 10, py+1, 3, 5, '#000000', .15);
  px(svg, 51, py+1, 3, 5, '#000000', .1);
}

// ── Seed bump ─────────────────────────────────────────────────
function drawSeed(svg, c) {
  drawPot(svg, c);
  px(svg, 27, H-21, 10, 4, c.soil2||'#6a4828');
  px(svg, 29, H-23, 6, 3, c.stem||'#5aaa58');
  px(svg, 30, H-24, 3, 2, '#ffffff', .3);
}

// ── CACTUS ────────────────────────────────────────────────────
function drawCactus(svg, pct) {
  const c = PAL.cactus; drawPot(svg, c);
  if (pct < 0.12) { drawSeed(svg,c); return; }
  const h = Math.floor(6 + pct * 44);
  const tx = 28, ty = H-19-h;
  // trunk shadow
  px(svg, tx+6, ty+2, 4, h, '#000000', .2);
  // trunk
  px(svg, tx, ty, 8, h, c.stem);
  px(svg, tx+1, ty, 3, h, c.stem2); // highlight
  px(svg, tx+6, ty, 2, h, '#000000', .15); // shade
  // spines
  for (let i=2; i<h; i+=5) {
    px(svg, tx-3, ty+i, 3, 1, c.spine);
    px(svg, tx+8, ty+i, 3, 1, c.spine);
    px(svg, tx-3, ty+i, 1, 1, '#ffffff', .4);
  }
  // arms (grow in after 45%)
  if (pct > 0.45) {
    const af = Math.min(1, (pct-0.45)/0.55);
    const ah = Math.floor(af * 18);
    // left arm: horizontal then up
    px(svg, tx-8, ty+10, 8, 4, c.stem);
    px(svg, tx-8, ty+10, 8, 2, c.stem2, .6);
    if (ah > 2) {
      px(svg, tx-10, ty+6, 5, ah+4, c.stem);
      px(svg, tx-10, ty+6, 2, ah+4, c.stem2, .6);
      for (let i=0; i<ah; i+=5) px(svg, tx-13, ty+6+i, 3, 1, c.spine);
    }
    // right arm
    px(svg, tx+8, ty+16, 8, 4, c.stem);
    px(svg, tx+8, ty+16, 8, 2, c.stem2, .4);
    if (ah > 2) {
      px(svg, tx+13, ty+10, 5, ah+6, c.stem);
      px(svg, tx+13, ty+10, 2, ah+6, c.stem2, .6);
      for (let i=0; i<ah; i+=5) px(svg, tx+18, ty+10+i, 3, 1, c.spine);
    }
  }
  // flower at top when mature
  if (pct > 0.88) {
    const fp = Math.min(1,(pct-0.88)/0.12);
    circ(svg, tx+4, ty-4, Math.floor(fp*6)+1, c.flower);
    circ(svg, tx+4, ty-4, Math.floor(fp*3), '#ffeecc');
    circ(svg, tx+4, ty-4, 1, '#fff', .8);
  }
}

// ── SUCCULENT ─────────────────────────────────────────────────
function drawSucculent(svg, pct) {
  const c = PAL.succulent; drawPot(svg, c);
  if (pct < 0.12) { drawSeed(svg,c); return; }
  const n = Math.max(1, Math.round(pct * 8));
  const cx = 32, base = H-21;
  const leaves = [
    {dx:-13,dy:1,w:11,h:9,a:0},  {dx:10,dy:1,w:11,h:9,a:0},
    {dx:-10,dy:-7,w:10,h:9,a:1}, {dx:8,dy:-7,w:10,h:9,a:1},
    {dx:-6,dy:-14,w:9,h:9,a:0},  {dx:5,dy:-14,w:9,h:9,a:0},
    {dx:-3,dy:-21,w:9,h:9,a:1},  {dx:2,dy:-21,w:9,h:9,a:1},
  ];
  leaves.slice(0,n).forEach((l,i) => {
    const col  = i%2===0 ? c.stem  : c.inner;
    const col2 = i%2===0 ? c.stem2 : c.stem;
    px(svg, cx+l.dx, base+l.dy, l.w, l.h, col);
    px(svg, cx+l.dx+1, base+l.dy, 3, l.h, col2, .5);
    px(svg, cx+l.dx, base+l.dy, l.w, 2, '#ffffff', .08);
    if (pct > 0.82) circ(svg, cx+l.dx+l.w/2, base+l.dy+l.h/2-1, 2, c.tip);
  });
  // centre bud
  if (n >= 5) {
    circ(svg, cx, base-16, 4, c.stem2);
    circ(svg, cx, base-16, 2, '#fff', .3);
  }
}

// ── FERN ──────────────────────────────────────────────────────
function drawFern(svg, pct) {
  const c = PAL.fern; drawPot(svg, c);
  if (pct < 0.12) { drawSeed(svg,c); return; }
  const fronds = Math.max(1, Math.round(pct * 6));
  const base = H-21;
  const configs = [
    {sx:32,sy:base,ex:14,ey:base-20,side:-1},
    {sx:32,sy:base,ex:50,ey:base-20,side:1},
    {sx:32,sy:base,ex:10,ey:base-32,side:-1},
    {sx:32,sy:base,ex:52,ey:base-32,side:1},
    {sx:32,sy:base,ex:18,ey:base-42,side:-1},
    {sx:32,sy:base,ex:46,ey:base-42,side:1},
  ];
  configs.slice(0,fronds).forEach(f => {
    const steps = 10;
    for (let i=0; i<steps; i++) {
      const t = i/steps;
      // slight arc
      const curve = Math.sin(t * Math.PI) * 4 * f.side;
      const x = Math.round(f.sx + (f.ex-f.sx)*t + curve);
      const y = Math.round(f.sy + (f.ey-f.sy)*t);
      px(svg, x-1, y-1, 4, 4, c.stem);
      if (i%2===1 && i > 0) {
        px(svg, x+f.side*3, y-2, 7, 4, c.leaf);
        px(svg, x+f.side*5, y-3, 5, 3, c.llight, .8);
        px(svg, x+f.side*3, y-2, 7, 1, '#ffffff', .1);
      }
    }
  });
}

// ── SUNFLOWER ─────────────────────────────────────────────────
function drawSunflower(svg, pct) {
  const c = PAL.sunflower; drawPot(svg, c);
  if (pct < 0.12) { drawSeed(svg,c); return; }
  const stemH = Math.floor(pct * 48);
  const sx=30, base=H-19;
  // stem shadow
  px(svg, sx+3, base-stemH+2, 3, stemH, '#000000', .15);
  // stem
  px(svg, sx, base-stemH, 4, stemH, c.stem);
  px(svg, sx, base-stemH, 2, stemH, c.stem2, .6);
  // leaves (appear and grow)
  if (pct > 0.22) {
    const lf = Math.min(1,(pct-0.22)/0.4);
    const lw = Math.floor(lf*14)+4;
    px(svg, sx-lw, base-stemH*0.38, lw, 5, c.leaf);
    px(svg, sx-lw+1, base-stemH*0.38, lw-2, 2, '#ffffff', .1);
  }
  if (pct > 0.35) {
    const lf = Math.min(1,(pct-0.35)/0.4);
    const lw = Math.floor(lf*12)+4;
    px(svg, sx+4, base-stemH*0.58, lw, 5, c.leaf);
    px(svg, sx+5, base-stemH*0.58, lw-2, 2, '#ffffff', .1);
  }
  // head
  if (pct > 0.65) {
    const hf = Math.min(1,(pct-0.65)/0.35);
    const hx = sx+2, hy = Math.round(base-stemH-3);
    const pr = Math.floor(hf*10)+3;
    // petals outer
    for (let i=0; i<8; i++) {
      const a = (i/8)*Math.PI*2;
      const bx = Math.round(hx+Math.cos(a)*pr), by = Math.round(hy+Math.sin(a)*pr);
      px(svg, bx-4, by-4, 8, 8, c.petal);
      px(svg, bx-3, by-4, 4, 3, c.petal2, .7);
    }
    // centre disc
    circ(svg, hx, hy, Math.floor(hf*7)+2, c.centre);
    circ(svg, hx, hy, Math.floor(hf*4), c.centre2);
    // seed pattern dots
    if (hf > 0.6) {
      [[-2,-2],[1,-2],[-2,1],[2,1],[0,0]].forEach(([dx,dy])=>
        circ(svg, hx+dx, hy+dy, 1, '#f8d080', .6)
      );
    }
  }
}

// ── FLOWER ────────────────────────────────────────────────────
function drawFlower(svg, pct) {
  const c = PAL.flower; drawPot(svg, c);
  if (pct < 0.12) { drawSeed(svg,c); return; }
  const stemH = Math.floor(pct * 44);
  const sx=30, base=H-19;
  px(svg, sx+3, base-stemH+2, 3, stemH, '#000000', .15);
  px(svg, sx, base-stemH, 4, stemH, c.stem);
  px(svg, sx, base-stemH, 2, stemH, c.stem2, .6);
  if (pct > 0.2) {
    const lf = Math.min(1,(pct-0.2)/0.5);
    px(svg, sx-Math.floor(lf*10)-2, base-Math.round(stemH*0.45), Math.floor(lf*10)+4, 6, c.leaf);
    px(svg, sx+4, base-Math.round(stemH*0.65), Math.floor(lf*10)+4, 6, c.leaf);
  }
  if (pct > 0.6) {
    const hf = Math.min(1,(pct-0.6)/0.4);
    const hx=sx+2, hy=Math.round(base-stemH-5);
    // 5 petals with rounded shapes
    for (let i=0; i<5; i++) {
      const a = (i/5)*Math.PI*2 - Math.PI/2;
      const r = Math.floor(hf*9)+2;
      const bx=Math.round(hx+Math.cos(a)*r), by=Math.round(hy+Math.sin(a)*r);
      circ(svg, bx, by, Math.floor(hf*5)+2, c.petal);
      circ(svg, bx-1, by-1, Math.floor(hf*2)+1, c.petal2, .7);
    }
    // sepal under petals
    circ(svg, hx, hy, Math.floor(hf*4)+2, c.stem);
    circ(svg, hx, hy, Math.floor(hf*4)+1, c.centre);
    circ(svg, hx, hy, 2, '#ffffff', .6);
  }
}

// ── BAMBOO ────────────────────────────────────────────────────
function drawBamboo(svg, pct) {
  const c = PAL.bamboo; drawPot(svg, c);
  if (pct < 0.12) { drawSeed(svg,c); return; }
  const stalks = pct>0.45?3:pct>0.22?2:1;
  const defs = [
    {x:27, h:pct*50, lean:0},
    {x:33, h:pct*40, lean:2},
    {x:30, h:pct*44, lean:-1},
  ];
  defs.slice(0,stalks).forEach((d,s) => {
    const sh = Math.floor(d.h), base=H-19;
    // shadow
    px(svg, d.x+4, base-sh+2, 3, sh, '#000000', .15);
    // stalk segments
    for (let y=0; y<sh; y+=10) {
      const segH = Math.min(10, sh-y);
      const shade = y%20<10 ? 0 : .08;
      px(svg, d.x, base-y-segH, 5, segH, c.stem);
      px(svg, d.x, base-y-segH, 2, segH, c.stem2, .7);
      px(svg, d.x+3, base-y-segH, 2, segH, '#000000', .1+shade);
    }
    // joints
    for (let j=8; j<sh; j+=10) {
      px(svg, d.x-1, base-j-1, 7, 3, c.joint);
      px(svg, d.x, base-j-1, 5, 1, '#ffffff', .2);
    }
    // leaves at top
    if (sh > 14) {
      const lx = d.x + d.lean;
      px(svg, lx-12, base-sh+3, 14, 4, c.leaf);
      px(svg, lx-10, base-sh+3, 10, 2, '#ffffff', .12);
      px(svg, lx+4,  base-sh+9, 14, 4, c.leaf);
      if (sh > 28) {
        px(svg, lx-10, base-sh+15, 12, 4, c.leaf);
      }
    }
  });
}

// ── MUSHROOM ──────────────────────────────────────────────────
function drawMushroom(svg, pct) {
  const c = PAL.mushroom; drawPot(svg, c);
  if (pct < 0.12) { drawSeed(svg,c); return; }
  const h = Math.floor(pct * 20)+2;
  const sx=27, base=H-19;
  // stem shadow
  px(svg, sx+7, base-h+2, 4, h, '#000000', .2);
  // stem (slightly tapered)
  px(svg, sx, base-h, 10, h, c.stem);
  px(svg, sx, base-h, 4, h, c.stem2, .5);
  px(svg, sx+7, base-h, 3, h, '#000000', .1);
  // gills under cap
  if (pct > 0.2) {
    const capW = Math.floor((pct-0.2)/0.8*30)+6;
    const capH = Math.floor((pct-0.2)/0.8*16)+4;
    const capX = 32-capW/2, capY = base-h-capH+2;
    // gills (lighter underside)
    px(svg, capX, capY+capH-3, capW, 3, '#e8e0d0');
    // cap dome
    for (let row=0; row<capH; row++) {
      const ratio = 1 - row/capH;
      const rw = Math.floor(capW * Math.sqrt(ratio));
      const rx = 32-rw/2;
      const shade = row < 3 ? .15 : 0;
      px(svg, rx, capY+row, rw, 2, c.cap);
      if (row===0) px(svg, rx, capY, rw, 2, c.cap2||c.cap, .6);
      px(svg, rx, capY+row, Math.floor(rw*.3), 2, '#ffffff', .1-shade);
    }
    // spots
    if (pct > 0.5) {
      const sf = Math.min(1,(pct-0.5)/0.5);
      [[5,5],[13,3],[9,9],[-3,7],[16,8]].forEach(([dx,dy],i) => {
        if (i/5 < sf) {
          circ(svg, 32+dx, capY+dy+2, 2, c.spot, .9);
          circ(svg, 32+dx, capY+dy+1, 1, c.spot2||'#ffffff', .8);
        }
      });
    }
  }
}

// ── ORCHID ────────────────────────────────────────────────────
function drawOrchid(svg, pct) {
  const c = PAL.orchid; drawPot(svg, c);
  if (pct < 0.12) { drawSeed(svg,c); return; }
  const stemH = Math.floor(pct*46), sx=30, base=H-19;
  px(svg, sx+3, base-stemH+2, 3, stemH, '#000000', .15);
  px(svg, sx, base-stemH, 4, stemH, c.stem);
  px(svg, sx, base-stemH, 2, stemH, c.stem2, .5);
  // leaves (wide, lush)
  if (pct > 0.15) {
    const lf = Math.min(1,(pct-0.15)/0.4);
    const lw = Math.floor(lf*16)+4;
    px(svg, sx-lw, base-Math.round(stemH*0.3), lw, 7, c.leaf);
    px(svg, sx-lw+1, base-Math.round(stemH*0.3), lw-2, 2, '#ffffff', .12);
    px(svg, sx+4, base-Math.round(stemH*0.5), lw, 7, c.leaf);
    if (pct > 0.3) px(svg, sx-Math.floor(lw*.7), base-Math.round(stemH*0.68), Math.floor(lw*.9), 6, c.leaf);
  }
  // blooms (cascade down the stem)
  if (pct > 0.55) {
    const bf = Math.min(1,(pct-0.55)/0.45);
    const maxBlooms = Math.round(bf*5)+1;
    const bPositions = [
      [sx+2, base-stemH-2],
      [sx-10, base-stemH+9],
      [sx+12, base-stemH+7],
      [sx-6,  base-stemH-13],
      [sx+8,  base-stemH-10],
    ];
    bPositions.slice(0,maxBlooms).forEach(([bx,by]) => {
      // 6 petals
      for(let i=0;i<6;i++){
        const a=(i/6)*Math.PI*2;
        const pr=7;
        const px2=Math.round(bx+Math.cos(a)*pr-3), py2=Math.round(by+Math.sin(a)*pr-3);
        px(svg,px2,py2,6,6,c.petal);
        px(svg,px2+1,py2,3,3,c.petal2,.6);
      }
      circ(svg,bx,by,4,c.stem);
      circ(svg,bx,by,3,c.centre);
      circ(svg,bx,by,1,'#ffffff',.8);
    });
  }
}

// ── LOTUS ─────────────────────────────────────────────────────
function drawLotus(svg, pct) {
  const c = PAL.lotus;
  // water (layered for depth)
  px(svg, 6, H-16, 52, 16, c.water);
  px(svg, 6, H-16, 52, 4, c.water2, .5);
  // water ripples
  if (pct > 0.1) {
    px(svg, 10, H-10, 44, 1, c.ripple, .2);
    px(svg, 16, H-7,  32, 1, c.ripple, .15);
  }
  if (pct < 0.12) {
    circ(svg, 32, H-14, 8, c.pad); return;
  }
  // lily pads
  const pads = pct > 0.35 ? 2 : 1;
  [[32,H-13],[18,H-11]].slice(0,pads).forEach(([px2,py2])=>{
    circ(svg, px2, py2, 11, c.pad);
    circ(svg, px2, py2, 11, c.pad2, .4);
    // notch in pad
    poly(svg, [[px2,py2-11],[px2+4,py2-4],[px2-4,py2-4]], c.water);
    // veins
    px(svg, px2-1, py2-10, 2, 8, '#000000', .08);
  });
  // stem
  if (pct > 0.28) {
    const sf = Math.min(1,(pct-0.28)/0.3);
    const stemH = Math.floor(sf*14);
    px(svg, 30, H-13-stemH, 4, stemH, c.stem);
    // bloom petals
    if (pct > 0.52) {
      const bf = Math.min(1,(pct-0.52)/0.48);
      const petals = Math.round(bf*7)+1;
      const angles = [0,45,90,135,180,225,270,315].slice(0,petals);
      angles.forEach(a => {
        const rad=a*Math.PI/180;
        const spread = 3 + bf*6;
        const bx=Math.round(32+Math.cos(rad)*spread), by=Math.round(H-14-stemH+Math.sin(rad)*spread);
        // petal (taller as it opens)
        const ph = Math.floor(bf*10)+4;
        const pw = 6;
        px(svg, bx-pw/2, by-ph/2, pw, ph, c.petal);
        px(svg, bx-1, by-ph/2, 3, Math.floor(ph*.4), c.petal2, .7);
      });
      circ(svg, 32, H-14-stemH, Math.floor(bf*5)+2, c.centre);
      circ(svg, 32, H-14-stemH, 2, '#ffffff', .7);
    }
  }
}

// ── RAINBOW ───────────────────────────────────────────────────
function drawRainbow(svg, pct) {
  const c = PAL.rainbow; drawPot(svg, c);
  if (pct < 0.12) { drawSeed(svg,c); return; }
  const stemH = Math.floor(pct*40), sx=30, base=H-19;
  px(svg, sx+3, base-stemH+2, 3, stemH, '#000000', .2);
  px(svg, sx, base-stemH, 4, stemH, c.stem);
  px(svg, sx, base-stemH, 2, stemH, c.stem2, .6);
  if (pct > 0.2) {
    const lf = Math.min(1,(pct-0.2)/0.4);
    const lw = Math.floor(lf*12)+4;
    px(svg, sx-lw, base-Math.round(stemH*0.42), lw, 5, c.leaf);
    px(svg, sx+4,  base-Math.round(stemH*0.62), lw, 5, c.leaf);
  }
  // rainbow arcs grow in band by band
  if (pct > 0.5) {
    const rf = Math.min(1,(pct-0.5)/0.5);
    const arcs = [c.r, c.o, c.y, c.g, c.b, c.v];
    const visible = Math.round(rf*6);
    const hx=32, hy=base-stemH-4;
    arcs.slice(0,visible).forEach((col,i) => {
      const r2 = 18-i*2.5;
      const thick = 3;
      // draw semi-arc as pixel steps
      for (let a=0; a<=180; a+=8) {
        const rad = a*Math.PI/180;
        const ax = Math.round(hx + Math.cos(rad)*r2);
        const ay = Math.round(hy - Math.sin(rad)*r2);
        px(svg, ax-1, ay-1, thick, thick, col);
        // highlight top
        if (a > 60 && a < 120) px(svg, ax, ay-1, 2, 2, '#ffffff', .2);
      }
    });
    // sparkle at top when nearly done
    if (rf > 0.85) {
      circ(svg, hx, hy-18, 2, '#ffffff', rf);
      circ(svg, hx-8, hy-14, 1, '#ffffff', rf*.7);
      circ(svg, hx+8, hy-14, 1, '#ffffff', rf*.7);
    }
  }
}

// ── Dead plant ────────────────────────────────────────────────
function drawDead(svg) {
  drawPot(svg, {pot:'#484030',pot2:'#605848',soil:'#302820',soil2:'#403830'});
  // wilted droopy stem
  px(svg, 30, H-24, 3, 8, '#605848');
  px(svg, 27, H-23, 5, 4, '#484030');
  px(svg, 22, H-21, 8, 3, '#484030');
  px(svg, 34, H-22, 8, 3, '#484030');
  // fallen leaves
  px(svg, 20, H-19, 10, 3, '#504038', .8);
  px(svg, 34, H-20, 9,  3, '#504038', .8);
  // skull-ish X eyes (optional but fun)
  px(svg, 29, H-26, 2, 2, '#302820');
  px(svg, 33, H-26, 2, 2, '#302820');
}

// ─── Dispatcher ───────────────────────────────────────────────
const DRAW_FNS = {
  cactus: drawCactus, succulent: drawSucculent, fern: drawFern,
  sunflower: drawSunflower, flower: drawFlower, bamboo: drawBamboo,
  mushroom: drawMushroom, orchid: drawOrchid, lotus: drawLotus,
  rainbow: drawRainbow,
};

function drawPlantSVG(plantId, growPct, dead=false) {
  const svg = mkSVG();
  if (dead) { drawDead(svg); return svg; }
  const fn = DRAW_FNS[plantId];
  if (fn) fn(svg, Math.max(0, Math.min(1, growPct)));
  return svg;
}
