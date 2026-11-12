// Умный подбор расширения картинок (.png, .jpg, .jpeg, .webp)
function loadSmartImage(imgElement, baseName, fallbackClass) {
    const exts = ['.png', '.jpg', '.jpeg', '.webp', '.PNG', '.JPG'];
    let idx = 0;
    function tryNext() {
        if (idx >= exts.length) {
            imgElement.removeAttribute('src');
            if (fallbackClass) imgElement.classList.add(fallbackClass);
            return;
        }
        imgElement.src = baseName + exts[idx++];
    }
    imgElement.onerror = tryNext;
    tryNext();
}

// Загружаем главных персонажей при старте
loadSmartImage(document.getElementById('boss-img'), 'boss', null);
loadSmartImage(document.getElementById('soul'), 'soul', null);

// Фоновый шейдер
const bgCanvas = document.getElementById('shader-bg');
const ctx = bgCanvas.getContext('2d');
function resizeBg() { bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight; }
window.addEventListener('resize', resizeBg); resizeBg();

let t = 0;
function drawShader() {
    t += 0.025;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    for (let i = 0; i < 12; i++) {
        ctx.strokeStyle = `hsl(${(t * 25 + i * 25) % 360}, 75%, 35%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < bgCanvas.width; x += 25) {
            let y = bgCanvas.height / 2 + Math.sin(x * 0.01 + t + i) * 100 * Math.cos(t * 0.4);
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    requestAnimationFrame(drawShader);
}
drawShader();

// 8-битные звуки
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep(freq, duration) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

// Боевая система
const box = document.getElementById('battle-box');
const soul = document.getElementById('soul');
const diag = document.getElementById('dialogue-box');
let hp = 20, bossHp = 100, soulX = 128, soulY = 88, isDefending = false;
let keys = {}, bullets = [], hazards = [];

window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if ((e.code === 'KeyZ' || e.code === 'Enter') && isDefending) shoot();
});
window.addEventListener('keyup', e => keys[e.code] = false);

function shoot() {
    if (!isDefending || bullets.length > 3) return;
    playBeep(650, 0.07);
    const b = document.createElement('img');
    b.className = 'bullet';
    loadSmartImage(b, 'bullet', 'bullet-fallback');
    b.style.left = (soulX + 6) + 'px';
    b.style.top = (soulY - 18) + 'px';
    box.appendChild(b);
    bullets.push({ el: b, x: soulX + 6, y: soulY - 18 });
}

function startTurn(action) {
    if (isDefending) return;
    playBeep(440, 0.08);

    if (action === 'fight') {
        bossHp -= 25;
        diag.textContent = `* Вы выстрелили в босса! Осталось HP врага: ${Math.max(0, bossHp)}`;
        if (bossHp <= 0) {
            diag.textContent = "* ПОБЕДА! Цветок повержен!";
            document.getElementById('boss-img').style.opacity = '0.2';
            return;
        }
    } else if (action === 'act') {
        diag.textContent = "* Цветок смотрит на вас одним глазом. Стреляйте по полосам!";
    } else if (action === 'item') {
        hp = Math.min(20, hp + 10); updateHP();
        diag.textContent = "* Вы съели кукурузу! Восстановлено 10 HP.";
    } else if (action === 'mercy') {
        diag.textContent = "* Босс не принимает пощаду!";
    }

    isDefending = true;
    let attackTimer = 0;
    const waveInterval = setInterval(() => {
        attackTimer++;
        spawnAttack(attackTimer);
        if (attackTimer >= 14) {
            clearInterval(waveInterval);
            setTimeout(endTurn, 1400);
        }
    }, 550);
}

function spawnAttack(step) {
    if (step % 4 === 0) {
        const bar = document.createElement('img');
        bar.className = 'enemy-bar';
        loadSmartImage(bar, 'bar', 'bar-fallback');
        let w = 130; bar.style.width = w + 'px';
        let startX = Math.random() > 0.5 ? 0 : 150;
        bar.style.left = startX + 'px'; bar.style.top = '0px';
        box.appendChild(bar);
        hazards.push({ el: bar, x: startX, y: 0, w: w, h: 18, vy: 2.8, breakable: true });
    } else {
        const p = document.createElement('div');
        p.className = 'enemy-proj';
        let startX = Math.random() * 265;
        p.style.left = startX + 'px'; p.style.top = '0px';
        box.appendChild(p);
        hazards.push({ el: p, x: startX, y: 0, w: 12, h: 12, vy: 3.5, breakable: false });
    }
}

function endTurn() {
    isDefending = false;
    diag.textContent = "* Ваш ход! Выберите действие.";
    hazards.forEach(h => h.el.remove()); hazards = [];
    bullets.forEach(b => b.el.remove()); bullets = [];
}

function updateHP() {
    document.getElementById('hp-fill').style.width = (hp / 20 * 100) + '%';
    document.getElementById('hp-text').textContent = `${hp}/20`;
    if (hp <= 0) {
        alert("GAME OVER! Душа раскололась.");
        location.reload();
    }
}

function bindTouch(id, keyName) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('pointerdown', e => { e.preventDefault(); keys[keyName] = true; });
    btn.addEventListener('pointerup', e => { e.preventDefault(); keys[keyName] = false; });
    btn.addEventListener('pointerleave', () => keys[keyName] = false);
}
bindTouch('btn-up', 'ArrowUp');
bindTouch('btn-down', 'ArrowDown');
bindTouch('btn-left', 'ArrowLeft');
bindTouch('btn-right', 'ArrowRight');

function gameLoop() {
    if (isDefending) {
        let speed = keys['ShiftLeft'] ? 2 : 3.5;
        if (keys['ArrowLeft'] && soulX > 0) soulX -= speed;
        if (keys['ArrowRight'] && soulX < 248) soulX += speed;
        if (keys['ArrowUp'] && soulY > 0) soulY -= speed;
        if (keys['ArrowDown'] && soulY < 168) soulY += speed;
        soul.style.left = soulX + 'px'; soul.style.top = soulY + 'px';

        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i]; b.y -= 7; b.el.style.top = b.y + 'px';
            if (b.y < -25) { b.el.remove(); bullets.splice(i, 1); }
        }

        for (let i = hazards.length - 1; i >= 0; i--) {
            let h = hazards[i]; h.y += h.vy; h.el.style.top = h.y + 'px';
            if (h.breakable) {
                for (let j = bullets.length - 1; j >= 0; j--) {
                    let b = bullets[j];
                    if (b.x < h.x + h.w && b.x + 12 > h.x && b.y < h.y + h.h && b.y + 24 > h.y) {
                        playBeep(300, 0.05);
                        h.el.remove(); hazards.splice(i, 1);
                        b.el.remove(); bullets.splice(j, 1);
                        break;
                    }
                }
            }
            if (soulX < h.x + h.w && soulX + 20 > h.x && soulY < h.y + h.h && soulY + 20 > h.y) {
                playBeep(150, 0.15);
                hp = Math.max(0, hp - 4); updateHP();
                h.el.remove(); hazards.splice(i, 1);
            } else if (h.y > 210) {
                h.el.remove(); hazards.splice(i, 1);
            }
        }
    }
    requestAnimationFrame(gameLoop);
}
gameLoop();
