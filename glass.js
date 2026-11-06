// 유리판: 도감 상세와 등록 순간에 꽃 그림을 유리 아래에 놓고 빛과 물결을 그립니다.
// 화면에 하나만 띄웁니다. 쓸 수 없는 기기에서는 아래에 깔린 정지 그림이 그대로 보입니다.
window.GlassPlate = (function () {
  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const FS = `
precision highp float;
uniform vec2 uRes,uC,uH,uTap,uL;
uniform float uR,uBev,uT,uRev,uTapT,uD,uSpan,uSide;
uniform vec3 uTA,uTB,uTC;
uniform sampler2D uLine,uCol;

float sd(vec2 p){
  vec2 q=abs(p)-uH+uR, m=max(q,0.);
  return pow(pow(m.x,3.2)+pow(m.y,3.2),1./3.2)+min(max(q.x,q.y),0.)-uR;
}
vec3 ground(vec2 p){
  float k=clamp((p.y-uC.y)/uH.y*.5+.5,0.,1.);
  return mix(vec3(.968,.975,.984),vec3(.905,.92,.938),k);
}
vec3 scene(vec2 p,float rv){
  vec2 uv=(p-uC)/uSpan+.5;
  float k=1.-uv.y;
  uv.x+=sin(uT*.85)*.018*k*k+sin(uT*1.9+uv.y*3.)*.004*k;
  vec4 ln=texture2D(uLine,uv), cl=texture2D(uCol,uv);
  vec3 c=ground(p);
  return mix(c*(1.-ln.a)+ln.rgb,c*(1.-cl.a)+cl.rgb,rv);
}
void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 rp=p-uC;
  float s=sd(rp);
  float cs=exp(-max(sd(rp-vec2(0.,uSide*.02)),0.)/(uSide*.04));
  float rim=min(min(p.x,uRes.x-p.x),min(p.y,uRes.y-p.y))/(uSide*.05);
  vec4 shadow=vec4(.05,.09,.17,1.)*cs*.2*smoothstep(0.,1.,rim);
  if(s>1.5*uD){ gl_FragColor=shadow; return; }

  vec2 e=vec2(1.5*uD,0.);
  vec2 g=vec2(sd(rp+e.xy)-sd(rp-e.xy),sd(rp+e.yx)-sd(rp-e.yx));
  g/=max(length(g),1e-4);
  vec2 ld=normalize(uL);
  float d=-s;
  float t=clamp(d/uBev,0.,1.), ed=1.-t;
  float inside=1.-smoothstep(-uD,uD,s);

  /* 가운데서 퍼지는 색 물결 */
  float rd=length(rp)/length(uH);
  float rv=1.-smoothstep(uRev-.16,uRev,rd);
  float fr=(rd-uRev+.08)/.09;
  float front=exp(-fr*fr)*step(.001,uRev)*(1.-smoothstep(1.3,1.55,uRev));

  /* 누른 곳에서 퍼지는 물결 */
  vec2 off=normalize(rp+1e-3)*front*9.*uD;
  float rip=0.;
  if(uTapT<2.6){
    vec2 dv=p-uTap;
    float dist=length(dv);
    float w=(dist-uTapT*uSide*1.5)/(uSide*.12);
    rip=sin(w*5.)*exp(-w*w)*exp(-uTapT*1.8);
    off+=dv/max(dist,1.)*rip*uSide*.04;
  }

  /* 굴절: 가장자리에서 가장 세고, 빛깔마다 조금씩 어긋남 */
  float bend=ed*ed*(ed*.6+.4);
  vec2 o=off-g*bend*uBev*1.25;
  float ca=.2;
  vec3 col=vec3(scene(p+o*(1.-ca),rv).r,scene(p+o,rv).g,scene(p+o*(1.+ca),rv).b);
  col+=front*.05;

  /* 유리 표면 */
  float slope=ed/sqrt(max(1.-ed*ed,.03));
  vec3 n=normalize(vec3(g*min(slope,3.),1.));
  vec3 h=normalize(normalize(vec3(ld*.8,.75))+vec3(0.,0.,1.));
  float spec=pow(max(dot(n,h),0.),130.);
  float sweep=dot(g,ld);
  float cover=smoothstep(.58,.95,abs(sweep))*smoothstep(.3,.66,ed)*(1.-.25*smoothstep(.95,1.,ed));
  vec3 sp=ed<.78?mix(uTA,uTB,smoothstep(.4,.78,ed)):mix(uTB,uTC,smoothstep(.78,.88,ed));
  col*=1.-ed*ed*.16;
  col=mix(col,sp,cover*.94);
  col+=spec*.85;
  col+=clamp(-rp.y/uH.y,0.,1.)*.02*t;
  col+=(1.-smoothstep(0.,1.6*uD,abs(d-1.1*uD)))*.5;
  col+=rip*.05;
  gl_FragColor=mix(shadow,vec4(col,1.),inside);
}`;
  const CLEAR = { a: '#38D6FF', b: '#1F5BFF', c: '#FF2F5B' };
  const FULL = 1.7, SPAN = .82, TILE = .88;
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches;

  let cv = null, gl = null, u = null, texLine = null, texCol = null, scratch = null, c2 = null;
  let host = null, raf = 0, token = 0, broken = false, last = 0, time = 0, dpr = 1, st = null, drag = null;

  function drop() {
    unmount();
    cv = gl = u = null;
  }
  function makeTex(unit) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }
  function shader(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader');
    return sh;
  }
  function init() {
    if (gl) return true;
    if (broken) return false;
    try {
      cv = document.createElement('canvas');
      cv.className = 'gl-canvas';
      cv.setAttribute('aria-hidden', 'true');
      gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
      if (!gl) throw new Error('no webgl');
      const prog = gl.createProgram();
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
      gl.bindAttribLocation(prog, 0, 'a');
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const cache = {};
      u = new Proxy(cache, { get: (c, k) => c[k] || (c[k] = gl.getUniformLocation(prog, k)) });
      texLine = makeTex(0);
      texCol = makeTex(1);
      gl.uniform1i(u.uLine, 0);
      gl.uniform1i(u.uCol, 1);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      scratch = document.createElement('canvas');
      scratch.width = scratch.height = 1024;
      c2 = scratch.getContext('2d');
      cv.addEventListener('webglcontextlost', drop);
      cv.addEventListener('pointerdown', onDown);
      cv.addEventListener('pointermove', onMove);
      cv.addEventListener('pointerup', onUp);
      cv.addEventListener('pointercancel', onCancel);
      return true;
    } catch (e) {
      broken = true;
      cv = gl = u = null;
      return false;
    }
  }
  function paint(unit, tex, markup) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        c2.clearRect(0, 0, 1024, 1024);
        c2.drawImage(img, 0, 0, 1024, 1024);
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scratch);
        gl.generateMipmap(gl.TEXTURE_2D);
        res();
      };
      img.onerror = rej;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
    });
  }
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = host.getBoundingClientRect();
    cv.width = Math.max(2, Math.round(r.width * dpr));
    cv.height = Math.max(2, Math.round(r.height * dpr));
    gl.viewport(0, 0, cv.width, cv.height);
  }
  function pos(e) {
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr];
  }
  function onDown(e) {
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
  }
  function onMove(e) {
    if (!drag || !st) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    st.gx = clamp(dx * .35, -18, 18) * dpr;
    st.gy = clamp(dy * .35, -18, 18) * dpr;
    st.bias = [clamp(dx / 120, -1, 1), clamp(dy / 120, -1, 1)];
  }
  function onCancel() {
    drag = null;
    if (st) { st.gx = st.gy = 0; st.bias = [0, 0]; }
  }
  function onUp(e) {
    if (drag && drag.moved < 8 && st) {
      st.tap = pos(e);
      st.tapT = 0;
      st.wobV += 1.3;
    }
    onCancel();
  }
  function frame(now) {
    if (!host || !host.isConnected) { unmount(); return; }
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    if (!reduced()) time += dt;
    st.rev += clamp(st.revT - st.rev, -dt * 1.05, dt * 1.05);
    if (now < st.wait) st.rev = 0;
    st.tapT += dt;
    st.vx += (-110 * (st.ox - st.gx) - 13 * st.vx) * dt; st.ox += st.vx * dt;
    st.vy += (-110 * (st.oy - st.gy) - 13 * st.vy) * dt; st.oy += st.vy * dt;
    st.wobV += (-240 * st.wob - 11 * st.wobV) * dt; st.wob += st.wobV * dt;

    const W = cv.width, H = cv.height, side = Math.min(W, H) * TILE;
    const a = -.78 + Math.sin(time * .32) * .42;
    const c = clamp(st.rev / 1.3, 0, 1), T = st.tint;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u.uRes, W, H);
    gl.uniform2f(u.uC, W / 2 + st.ox, H / 2 + st.oy + Math.sin(time * .8) * 1.5 * dpr);
    gl.uniform2f(u.uH, side / 2 * (1 + st.wob * .08), side / 2 * (1 - st.wob * .08));
    gl.uniform2f(u.uL, Math.cos(a) + st.bias[0], Math.sin(a) + st.bias[1]);
    gl.uniform2f(u.uTap, st.tap[0], st.tap[1]);
    gl.uniform1f(u.uR, side * .235);
    gl.uniform1f(u.uBev, side * .095);
    gl.uniform1f(u.uSpan, side * SPAN);
    gl.uniform1f(u.uSide, side);
    gl.uniform1f(u.uT, time);
    gl.uniform1f(u.uRev, st.rev);
    gl.uniform1f(u.uTapT, st.tapT);
    gl.uniform1f(u.uD, dpr);
    gl.uniform3fv(u.uTA, mix(st.clear.a, T.a, c));
    gl.uniform3fv(u.uTB, mix(st.clear.b, T.b, c));
    gl.uniform3fv(u.uTC, mix(st.clear.c, T.c, c));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  }
  /* opt.line: 맑은 그림 SVG, opt.color: 물든 그림 SVG, opt.tint: {color, core}, opt.reveal: 'play'면 맑은 유리에서 색이 번짐 */
  async function mount(el, opt) {
    if (!init()) return false;
    unmount();
    const my = ++token;
    host = el;
    el.append(cv);
    size();
    try {
      await paint(0, texLine, opt.line);
      if (my !== token) return false;
      await paint(1, texCol, opt.color || opt.line);
      if (my !== token) return false;
    } catch (e) {
      unmount();
      return false;
    }
    const clear = { a: rgb(CLEAR.a), b: rgb(CLEAR.b), c: rgb(CLEAR.c) };
    const t = opt.tint, base = t ? rgb(t.color) : null;
    const play = !!(opt.color && opt.reveal === 'play' && !reduced());
    st = {
      clear,
      tint: t ? { a: mix(base, [1, 1, 1], .35), b: base, c: rgb(t.core) } : clear,
      rev: opt.color && !play ? FULL : 0, revT: opt.color ? FULL : 0,
      wait: play ? performance.now() + 450 : 0,
      tapT: 99, tap: [0, 0], ox: 0, oy: 0, vx: 0, vy: 0, gx: 0, gy: 0, wob: 0, wobV: 0, bias: [0, 0],
    };
    cv.classList.add('on');
    last = performance.now();
    raf = requestAnimationFrame(frame);
    return true;
  }
  function unmount() {
    token++;
    cancelAnimationFrame(raf);
    raf = 0;
    st = null;
    drag = null;
    host = null;
    if (cv) { cv.classList.remove('on'); cv.remove(); }
  }
  return { mount, unmount };
})();
