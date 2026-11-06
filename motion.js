// 꽃 모션: 도감 상세와 등록 순간에 꽃 그림이 자라고, 흔들리고, 사진 색으로 물듭니다.
// 화면에 하나만 띄웁니다. 쓸 수 없는 기기에서는 아래에 깔린 정지 그림이 그대로 보입니다.
window.FlowerMotion = (function () {
  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const FS = `
precision highp float;
uniform vec2 uRes,uTap;
uniform float uT,uRev,uGrow,uTapT,uSpan;
uniform sampler2D uLine,uCol;
void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 rp=p-uRes*.5;

  /* 가운데서 퍼지는 색 물결 */
  float rd=length(rp)/(uSpan*.5);
  float rv=1.-smoothstep(uRev-.18,uRev,rd);
  float fr=(rd-uRev+.09)/.1;
  float front=exp(-fr*fr)*step(.001,uRev)*(1.-smoothstep(1.4,1.62,uRev));
  vec2 off=normalize(rp+1e-3)*front*uSpan*.012;

  /* 누른 곳에서 퍼지는 물결 */
  if(uTapT<2.6){
    vec2 dv=p-uTap;
    float dist=length(dv);
    float w=(dist-uTapT*uSpan*1.4)/(uSpan*.1);
    off+=dv/max(dist,1.)*sin(w*5.)*exp(-w*w)*exp(-uTapT*1.8)*uSpan*.035;
  }

  /* 줄기 아래를 축으로 흔들림 */
  vec2 uv=(p+off-uRes*.5)/uSpan+.5;
  float k=1.-uv.y;
  uv.x+=sin(uT*.85)*.018*k*k+sin(uT*1.9+uv.y*3.)*.004*k;

  vec4 ln=texture2D(uLine,uv), cl=texture2D(uCol,uv);
  vec4 art=mix(ln,cl,rv)*(1.-smoothstep(uGrow-.1,uGrow,k));
  art.rgb+=art.a*front*.2;
  gl_FragColor=art;
}`;
  const FULL = 1.7, GROWN = 1.15;
  const reduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches;

  let cv = null, gl = null, u = null, texLine = null, texCol = null, scratch = null, c2 = null;
  let host = null, raf = 0, token = 0, broken = false, last = 0, time = 0, dpr = 1, st = null, downAt = null;

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
      cv.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
      cv.addEventListener('pointercancel', () => { downAt = null; });
      cv.addEventListener('pointerup', onUp);
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
  function onUp(e) {
    if (downAt && st && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 8) {
      const r = cv.getBoundingClientRect();
      st.tap = [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr];
      st.tapT = 0;
    }
    downAt = null;
  }
  function frame(now) {
    if (!host || !host.isConnected) { unmount(); return; }
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    if (!reduced()) time += dt;
    st.tapT += dt;
    if (st.play) {
      const e = (now - st.t0) / 1000;
      st.grow = Math.min(GROWN, e * 1.2);
      if (e > 1.15) {
        st.rev = Math.min(FULL, (e - 1.15) * 1.05);
        if (st.onBloom) { const f = st.onBloom; st.onBloom = null; f(); }
      }
    }
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u.uRes, cv.width, cv.height);
    gl.uniform2f(u.uTap, st.tap[0], st.tap[1]);
    gl.uniform1f(u.uSpan, Math.min(cv.width, cv.height));
    gl.uniform1f(u.uT, time);
    gl.uniform1f(u.uRev, st.rev);
    gl.uniform1f(u.uGrow, st.grow);
    gl.uniform1f(u.uTapT, st.tapT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  }
  /* opt.line: 투명한 그림 SVG, opt.color: 물든 그림 SVG, opt.reveal: 'play'면 자라난 뒤 물듦, opt.onBloom: 물들기 시작할 때 */
  async function mount(el, opt) {
    if (!init()) return false;
    unmount();
    const my = ++token;
    host = el;
    el.append(cv);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = el.getBoundingClientRect();
    cv.width = Math.max(2, Math.round(r.width * dpr));
    cv.height = Math.max(2, Math.round(r.height * dpr));
    gl.viewport(0, 0, cv.width, cv.height);
    try {
      await paint(0, texLine, opt.line);
      if (my !== token) return false;
      await paint(1, texCol, opt.color || opt.line);
      if (my !== token) return false;
    } catch (e) {
      unmount();
      return false;
    }
    const play = !!(opt.color && opt.reveal === 'play' && !reduced());
    st = {
      play, t0: performance.now(), onBloom: play ? opt.onBloom : null,
      grow: play ? 0 : GROWN, rev: opt.color && !play ? FULL : 0, tapT: 99, tap: [0, 0],
    };
    if (!play && opt.onBloom) opt.onBloom();
    el.classList.add('live');
    last = performance.now();
    raf = requestAnimationFrame(frame);
    return true;
  }
  function unmount() {
    token++;
    cancelAnimationFrame(raf);
    raf = 0;
    st = null;
    downAt = null;
    if (host) host.classList.remove('live');
    host = null;
    if (cv) cv.remove();
  }
  return { mount, unmount };
})();
