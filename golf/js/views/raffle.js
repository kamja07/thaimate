// views/raffle.js — Manual 1-at-a-time roulette raffle with sound effects
import { saveRaffleWinners } from '../domain/awards.js';

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTick() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'square'; o.frequency.value = 900;
  g.gain.value = 0.06;
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
  o.connect(g).connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 0.04);
}

function playFanfare() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    const startT = ctx.currentTime + i * 0.13;
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.18, startT + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, startT + 0.7);
    o.connect(g).connect(ctx.destination);
    o.start(startT); o.stop(startT + 0.7);
  });
  const o2 = ctx.createOscillator(), g2 = ctx.createGain();
  o2.type = 'triangle'; o2.frequency.value = 110;
  g2.gain.value = 0.25;
  g2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
  o2.connect(g2).connect(ctx.destination);
  o2.start(); o2.stop(ctx.currentTime + 0.5);
}

function playDrumroll() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random()*2-1) * (1 - i/ch.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = 0.15;
  src.connect(g).connect(ctx.destination);
  src.start();
}

const PALETTE = ['#FB8C00','#43A047','#1E88E5','#8E24AA','#E53935','#00ACC1','#FDD835','#6D4C41','#7CB342','#5E35B1','#F4511E','#039BE5','#C0CA33','#D81B60','#3949AB','#00897B','#FFB300','#546E7A','#E64A19','#558B2F'];

function escapeText(s) { return String(s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }

function buildWheelSVG(parts, size) {
  size = size || 300;
  const N = parts.length;
  if (N === 0) return '';
  const cx = size/2, cy = size/2;
  const r = size/2 - 6;
  const slice = 360 / N;
  let svg = '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" id="rouletteWheel" style="transform-origin:50% 50%;transition:none;filter:drop-shadow(0 6px 24px rgba(0,0,0,0.35));">';
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r+3) + '" fill="#1a1a1a" />';
  if (N === 1) {
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + PALETTE[0] + '" stroke="#fff" stroke-width="2" />';
    svg += '<text x="' + cx + '" y="' + cy + '" fill="white" font-size="18" text-anchor="middle" dominant-baseline="middle" font-weight="700">' + escapeText((parts[0].name || '').substring(0,10)) + '</text>';
  } else {
    for (let i = 0; i < N; i++) {
      const a1 = (i * slice - 90) * Math.PI/180;
      const a2 = ((i+1) * slice - 90) * Math.PI/180;
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      const large = slice > 180 ? 1 : 0;
      svg += '<path d="M' + cx + ',' + cy + ' L' + x1 + ',' + y1 + ' A' + r + ',' + r + ' 0 ' + large + ' 1 ' + x2 + ',' + y2 + ' Z" fill="' + PALETTE[i % PALETTE.length] + '" stroke="#fff" stroke-width="1.5" />';
      const tA = (i * slice + slice/2 - 90) * Math.PI/180;
      const tx = cx + (r * 0.65) * Math.cos(tA);
      const ty = cy + (r * 0.65) * Math.sin(tA);
      const rot = i * slice + slice/2;
      const fs = Math.max(9, Math.min(16, 220/N));
      svg += '<text x="' + tx + '" y="' + ty + '" fill="white" font-size="' + fs + '" text-anchor="middle" dominant-baseline="middle" font-weight="600" transform="rotate(' + rot + ',' + tx + ',' + ty + ')" style="paint-order:stroke;stroke:rgba(0,0,0,0.4);stroke-width:0.6;">' + escapeText((parts[i].name || '').substring(0, 6)) + '</text>';
    }
  }
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="20" fill="#1a1a1a" stroke="#FFB300" stroke-width="3" />';
  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="#FFB300" />';
  svg += '</svg>';
  return svg;
}

function spinWheel(wheelEl, parts, winnerIdx, duration) {
  duration = duration || 6500;
  return new Promise(resolve => {
    const N = parts.length;
    if (N <= 1) { setTimeout(() => { playFanfare(); resolve(); }, 800); return; }
    const slice = 360 / N;
    const baseSpins = 7;
    const winnerOffset = -(winnerIdx * slice + slice/2);
    const finalAngle = baseSpins * 360 + winnerOffset + (Math.random() * slice * 0.6 - slice * 0.3);
    const startT = Date.now();
    let lastSegment = -1;
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - startT;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const angle = finalAngle * eased;
      wheelEl.style.transform = 'rotate(' + angle + 'deg)';
      const seg = Math.floor(Math.abs(angle) / slice);
      if (seg !== lastSegment) { playTick(); lastSegment = seg; }
      if (t >= 1) {
        clearInterval(intervalId);
        setTimeout(() => playFanfare(), 100);
        resolve();
      }
    }, 16);
  });
}

const MEDALS = ['🥇','🥈','🥉','🏅','🏅','🎉','🎉','🎉','🎉','🎉'];
function medalFor(i) { return MEDALS[i] || '🎁'; }

export async function runRaffle(eventId, eligibleParts) {
  if (!eligibleParts || !eligibleParts.length) {
    alert('럭키드로우 대상자가 없습니다 (모든 참가자가 이미 시상받음)');
    return null;
  }
  
  const totalPool = eligibleParts.length;
  let remaining = [...eligibleParts];
  const winners = [];
  let spinning = false;
  
  // Build modal — scroll-safe with max-height
  const modal = document.createElement('div');
  modal.id = 'raffleModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;';
  
  const inner = document.createElement('div');
  inner.style.cssText = 'background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:16px;padding:20px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.6);text-align:center;border:2px solid #FFB300;margin:auto;';
  inner.innerHTML = 
    '<h2 style="color:#FFB300;margin:0 0 4px;font-size:20px;">🎁 럭키 드로우</h2>' +
    '<p id="raffleSub" style="color:rgba(255,255,255,0.7);margin:0 0 14px;font-size:12px;">전체 대상자 ' + totalPool + '명</p>' +
    '<div id="raffleStage" style="position:relative;width:300px;height:300px;margin:0 auto;display:flex;align-items:center;justify-content:center;">' +
      '<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-top:24px solid #FF1744;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));z-index:2;"></div>' +
    '</div>' +
    '<div id="raffleWinnersBox" style="margin-top:14px;background:rgba(255,179,0,0.08);border:1px solid rgba(255,179,0,0.3);border-radius:8px;padding:10px;max-height:160px;overflow-y:auto;text-align:left;display:none;">' +
      '<div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">당첨자</div>' +
      '<div id="raffleWinnersList"></div>' +
    '</div>' +
    '<div id="raffleLastWin" style="margin-top:12px;min-height:54px;"></div>' +
    '<div id="raffleControls" style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">' +
      '<button id="raffleNext" style="background:linear-gradient(135deg,#FFB300,#FF6F00);color:#1a1a2e;border:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;flex:1;min-width:140px;">🎰 추첨 시작 (남은 ' + remaining.length + '명)</button>' +
      '<button id="raffleClose" style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.9);border:1px solid rgba(255,255,255,0.3);padding:12px 20px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;flex:1;min-width:120px;">🛑 추첨 종료</button>' +
    '</div>';
  modal.appendChild(inner);
  document.body.appendChild(modal);
  
  const stage = document.getElementById('raffleStage');
  const subEl = document.getElementById('raffleSub');
  const lastWinEl = document.getElementById('raffleLastWin');
  const winnersBox = document.getElementById('raffleWinnersBox');
  const winnersListEl = document.getElementById('raffleWinnersList');
  const nextBtn = document.getElementById('raffleNext');
  const closeBtn = document.getElementById('raffleClose');
  
  // Render initial wheel (preview)
  stage.insertAdjacentHTML('beforeend', buildWheelSVG(remaining, 300));
  
  function renderWinnersList() {
    if (!winners.length) { winnersBox.style.display = 'none'; return; }
    winnersBox.style.display = 'block';
    winnersListEl.innerHTML = winners.map((w, i) => 
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 4px;border-bottom:1px solid rgba(255,179,0,0.15);font-size:14px;">' +
        '<span><span style="color:#FFB300;font-weight:700;margin-right:8px;">' + (i+1) + '.</span><span style="color:white;font-weight:600;">' + medalFor(i) + ' ' + escapeText(w.name) + '</span></span>' +
      '</div>'
    ).join('');
  }
  
  function renderControls() {
    if (remaining.length === 0) {
      nextBtn.style.display = 'none';
      closeBtn.textContent = '✓ 종료';
      closeBtn.style.background = 'linear-gradient(135deg,#43A047,#2E7D32)';
      closeBtn.style.color = 'white';
      closeBtn.style.border = 'none';
      subEl.textContent = '🎊 추첨 완료 — 총 ' + winners.length + '명';
    } else {
      nextBtn.textContent = '🎰 추첨 시작 (남은 ' + remaining.length + '명)';
      subEl.textContent = '전체 ' + totalPool + '명 · 추첨 완료 ' + winners.length + '명 · 남은 ' + remaining.length + '명';
    }
  }
  
  return new Promise(resolveOuter => {
    nextBtn.onclick = async () => {
      if (spinning || remaining.length === 0) return;
      spinning = true;
      nextBtn.disabled = true;
      nextBtn.style.opacity = '0.5';
      nextBtn.textContent = '🎰 추첨 중...';
      
      // Pick winner from remaining
      const idx = Math.floor(Math.random() * remaining.length);
      const winner = remaining[idx];
      
      // Re-render wheel with current remaining
      const pointer = stage.firstElementChild;
      stage.innerHTML = '';
      stage.appendChild(pointer);
      stage.insertAdjacentHTML('beforeend', buildWheelSVG(remaining, 300));
      const wheelEl = document.getElementById('rouletteWheel');
      
      setTimeout(() => playDrumroll(), 80);
      await new Promise(r => setTimeout(r, 600));
      await spinWheel(wheelEl, remaining, idx, 6000);
      
      // Add to winners, remove from pool
      winners.push(winner);
      remaining.splice(idx, 1);
      
      // Save to DB after each draw (incremental persistence)
      try {
        await saveRaffleWinners(eventId, winners.map(w => ({ user_id: w.user_id, name: w.name })), winners.length);
      } catch(e) { /* swallow — UI continues */ }
      
      const medal = medalFor(winners.length - 1);
      lastWinEl.innerHTML = 
        '<div style="background:linear-gradient(135deg,#FFB300,#FF6F00);padding:10px 16px;border-radius:10px;display:inline-block;">' +
          '<div style="font-size:28px;line-height:1;">' + medal + '</div>' +
          '<div style="font-size:11px;color:#1a1a2e;margin-top:2px;">' + winners.length + '번째 당첨</div>' +
          '<div style="font-size:18px;font-weight:700;color:#1a1a2e;margin-top:2px;">' + escapeText(winner.name) + '</div>' +
        '</div>';
      
      renderWinnersList();
      renderControls();
      
      // Update wheel to remaining (if any left)
      if (remaining.length > 0) {
        stage.innerHTML = '';
        stage.appendChild(pointer);
        stage.insertAdjacentHTML('beforeend', buildWheelSVG(remaining, 300));
      } else {
        // No more — show completion
        stage.innerHTML = '';
        stage.appendChild(pointer);
        stage.insertAdjacentHTML('beforeend', '<div style="font-size:80px;line-height:300px;">🎊</div>');
      }
      
      spinning = false;
      nextBtn.disabled = false;
      nextBtn.style.opacity = '1';
    };
    
    closeBtn.onclick = () => {
      if (spinning) return;
      if (document.body.contains(modal)) document.body.removeChild(modal);
      resolveOuter(winners);
    };
  });
}
