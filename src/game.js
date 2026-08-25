// Maze Chase — a simple maze game
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// Game state
const COLS = 16;
const ROWS = 12;
let cellW, cellH;
const PACMAN_SPEED = 0.1;
const GHOST_SPEED = 0.07;

// Maze: 0=wall, 1=path, 2=dot
const mazeTemplate = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,0],
  [0,1,0,0,1,0,1,0,0,1,0,1,0,0,1,0],
  [0,1,0,1,1,1,1,1,1,1,1,1,1,0,1,0],
  [0,1,1,1,0,0,0,0,0,0,0,0,1,1,1,0],
  [0,0,0,1,0,1,1,2,2,1,1,0,1,0,0,0],
  [0,1,1,1,0,1,2,2,2,2,1,0,1,1,1,0],
  [0,1,0,0,0,1,2,2,2,2,1,0,0,0,1,0],
  [0,1,1,1,0,1,1,1,1,1,1,0,1,1,1,0],
  [0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0],
  [0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

let maze = [];
let dotsRemaining = 0;
let pacman = { x: 1, y: 1, dir: 'right', nextDir: 'right' };
let ghosts = [
  { x: 14, y: 1, color: '#f00', dir: 'left' },
  { x: 13, y: 10, color: '#ffb8ff', dir: 'up' },
  { x: 2, y: 10, color: '#00ffff', dir: 'right' }
];
let score = 0;
let gameOver = false;
let won = false;

function initMaze() {
  maze = mazeTemplate.map(r => r.slice());
  dotsRemaining = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (maze[y][x] === 2) dotsRemaining++;
    }
  }
}

function resize() {
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  cellW = Math.floor(maxW / COLS);
  cellH = Math.floor(maxH / ROWS);
  canvas.width = COLS * cellW;
  canvas.height = ROWS * cellH;
}

function canMove(x, y) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS && maze[y][x] !== 0;
}

function wrapPos(x, y) {
  if (x < 0) x = COLS - 1;
  if (x >= COLS) x = 0;
  return { x, y };
}

let keys = {};
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === 'ArrowRight') pacman.nextDir = 'right';
  if (e.key === 'ArrowLeft') pacman.nextDir = 'left';
  if (e.key === 'ArrowUp') pacman.nextDir = 'up';
  if (e.key === 'ArrowDown') pacman.nextDir = 'down';
});
window.addEventListener('keyup', e => keys[e.key] = false);

function movePacman(dt) {
  const dirs = {
    right: { dx: 1, dy: 0 },
    left: { dx: -1, dy: 0 },
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 }
  };
  const nd = dirs[pacman.nextDir];
  const cd = dirs[pacman.dir];
  
  let nx = pacman.x + nd.dx * PACMAN_SPEED * dt;
  let ny = pacman.y + nd.dy * PACMAN_SPEED * dt;
  
  // Check grid-aligned movement
  const gx = Math.round(nx);
  const gy = Math.round(ny);
  
  if (canMove(gx, gy)) {
    pacman.x = nx;
    pacman.y = ny;
    if (nd.dx !== 0 || nd.dy !== 0) pacman.nextDir = pacman.nextDir;
  } else {
    // Try current dir
    const cgx = Math.round(pacman.x + cd.dx * PACMAN_SPEED * dt);
    const cgy = Math.round(pacman.y + cd.dy * PACMAN_SPEED * dt);
    if (canMove(cgx, cgy)) {
      pacman.x += cd.dx * PACMAN_SPEED * dt * 0.5;
      pacman.y += cd.dy * PACMAN_SPEED * dt * 0.5;
    }
  }
  
  // Wrap
  const wrapped = wrapPos(pacman.x, pacman.y);
  if (wrapped.x !== Math.round(pacman.x)) {
    pacman.x = wrapped.x;
  }
  
  // Eat dots
  const px = Math.round(pacman.x);
  const py = Math.round(pacman.y);
  if (px >= 0 && px < COLS && py >= 0 && py < ROWS && maze[py][px] === 2) {
    maze[py][px] = 1;
    score += 10;
    dotsRemaining--;
    if (dotsRemaining <= 0) won = true;
  }
}

function moveGhost(ghost, dt) {
  const dirs = [
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
    { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
  ];
  
  let gx = ghost.x + (ghost.dir === 'left' ? -1 : ghost.dir === 'right' ? 1 : 0) * GHOST_SPEED * dt;
  let gy = ghost.y + (ghost.dir === 'up' ? -1 : ghost.dir === 'down' ? 1 : 0) * GHOST_SPEED * dt;
  
  const ngx = Math.round(gx);
  const ngy = Math.round(gy);
  
  if (!canMove(ngx, ngy) || (Math.abs(gx - Math.round(gx)) < 0.1 && Math.abs(gy - Math.round(gy)) < 0.1)) {
    // Pick new direction
    const valid = dirs.filter(d => canMove(Math.round(ghost.x + d.dx), Math.round(ghost.y + d.dy)));
    if (valid.length > 0) {
      const pick = valid[Math.floor(Math.random() * valid.length)];
      ghost.dir = pick.dx === 1 ? 'right' : pick.dx === -1 ? 'left' : pick.dy === 1 ? 'down' : 'up';
    }
    gx = ghost.x;
    gy = ghost.y;
  } else {
    ghost.x = gx;
    ghost.y = gy;
  }
  
  const w = wrapPos(ghost.x, ghost.y);
  ghost.x = w.x;
  ghost.y = w.y;
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (maze[y][x] === 0) {
        ctx.fillStyle = '#1919a6';
        ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
      } else if (maze[y][x] === 2) {
        ctx.fillStyle = '#ffb8ae';
        ctx.beginPath();
        ctx.arc(x * cellW + cellW/2, y * cellH + cellH/2, Math.min(cellW, cellH)/6, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }
  
  // Pacman
  const px = pacman.x * cellW + cellW/2;
  const py = pacman.y * cellH + cellH/2;
  const pr = Math.min(cellW, cellH) / 2 - 2;
  ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  ctx.arc(px, py, pr, 0.2 * Math.PI, 1.8 * Math.PI);
  ctx.lineTo(px, py);
  ctx.fill();
  
  // Ghosts
  ghosts.forEach(g => {
    const gx = g.x * cellW + cellW/2;
    const gy = g.y * cellH + cellH/2;
    const gr = Math.min(cellW, cellH) / 2 - 2;
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.arc(gx, gy - gr*0.2, gr, Math.PI, 0);
    ctx.lineTo(gx + gr, gy + gr*0.6);
    ctx.lineTo(gx - gr, gy + gr*0.6);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(gx - gr*0.3, gy - gr*0.2, gr*0.25, 0, Math.PI*2);
    ctx.arc(gx + gr*0.3, gy - gr*0.2, gr*0.25, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#00f';
    ctx.beginPath();
    ctx.arc(gx - gr*0.3, gy - gr*0.2, gr*0.12, 0, Math.PI*2);
    ctx.arc(gx + gr*0.3, gy - gr*0.2, gr*0.12, 0, Math.PI*2);
    ctx.fill();
  });
  
  // Score
  ctx.fillStyle = '#fff';
  ctx.font = '16px monospace';
  ctx.fillText('Score: ' + score, 10, canvas.height - 10);
  
  if (won) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f0';
    ctx.font = '36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU WIN!', canvas.width/2, canvas.height/2);
    ctx.font = '18px monospace';
    ctx.fillText('Score: ' + score, canvas.width/2, canvas.height/2 + 40);
  }
  
  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f00';
    ctx.font = '36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
  }
}

let lastTime = 0;
function gameLoop(time) {
  const dt = time - lastTime || 16;
  lastTime = time;
  
  movePacman(dt);
  ghosts.forEach(g => moveGhost(g, dt));
  
  // Check collision
  ghosts.forEach(g => {
    if (Math.abs(pacman.x - g.x) < 0.5 && Math.abs(pacman.y - g.y) < 0.5) {
      gameOver = true;
    }
  });
  
  draw();
  requestAnimationFrame(gameLoop);
}

function startGame() {
  initMaze();
  resize();
  pacman = { x: 1, y: 5, dir: 'right', nextDir: 'right' };
  gameOver = false;
  won = false;
  score = 0;
  requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', resize);
startGame();
