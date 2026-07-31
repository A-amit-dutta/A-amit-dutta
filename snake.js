// snake.js (ES module)
class Vec {
  constructor(x, y){ this.x = x; this.y = y; }
  equals(v){ return this.x === v.x && this.y === v.y; }
}

class Snake {
  constructor(initial = [new Vec(8,8), new Vec(7,8), new Vec(6,8)]) {
    this.body = initial;
    this.dir = new Vec(1,0);
    this.growSegments = 0;
  }
  setDirection(dx,dy){
    // prevent reversing into self
    if (this.body.length > 1) {
      const head = this.body[0], neck = this.body[1];
      if (head.x + dx === neck.x && head.y + dy === neck.y) return;
    }
    this.dir = new Vec(dx,dy);
  }
  update() {
    const head = this.body[0];
    const newHead = new Vec(head.x + this.dir.x, head.y + this.dir.y);
    this.body.unshift(newHead);
    if (this.growSegments > 0) {
      this.growSegments--;
    } else {
      this.body.pop();
    }
  }
  grow(n=1){ this.growSegments += n; }
  hitsSelf(){ 
    const head = this.body[0];
    return this.body.slice(1).some(s => s.equals(head));
  }
}

class Game {
  constructor(canvas, gridSize = 20) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gridSize = gridSize;
    this.reset();
    this.bindEvents();
    this.rafId = null;
    this.lastTick = 0;
    this.tickInterval = 100; // ms (speed controlled externally)
  }
  reset(){
    this.cols = Math.floor(this.canvas.width / this.gridSize);
    this.rows = Math.floor(this.canvas.height / this.gridSize);
    const start = [new Vec(Math.floor(this.cols/2), Math.floor(this.rows/2))];
    start.push(new Vec(start[0].x-1, start[0].y));
    this.snake = new Snake(start);
    this.placeApple();
    this.running = false;
    this.score = 0;
  }
  placeApple(){
    const randPos = () => new Vec(
      Math.floor(Math.random()*this.cols),
      Math.floor(Math.random()*this.rows)
    );
    let pos = randPos();
    while (this.snake.body.some(b => b.equals(pos))) pos = randPos();
    this.apple = pos;
  }
  bindEvents(){
    window.addEventListener('keydown', e => {
      const k = e.key;
      if (k === 'ArrowUp' || k === 'w') this.snake.setDirection(0,-1);
      if (k === 'ArrowDown' || k === 's') this.snake.setDirection(0,1);
      if (k === 'ArrowLeft' || k === 'a') this.snake.setDirection(-1,0);
      if (k === 'ArrowRight' || k === 'd') this.snake.setDirection(1,0);
    });
    // resize handling: keep canvas responsive
    window.addEventListener('resize', () => this.resizeCanvas());
  }
  resizeCanvas(){
    // preserve physical pixels for crisp rendering
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(1, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(rect.width * ratio);
    this.canvas.height = Math.floor(rect.width * ratio); // square
    this.ctx.setTransform(ratio,0,0,ratio,0,0);
    this.reset();
    this.render();
  }
  start(speed=10){
    this.tickInterval = Math.round(1000 / speed);
    if (!this.running) {
      this.running = true;
      this.lastTick = performance.now();
      this.loop(this.lastTick);
    }
  }
  pause(){
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }
  loop(now){
    this.rafId = requestAnimationFrame((t) => this.loop(t));
    if (now - this.lastTick < this.tickInterval) return;
    this.lastTick = now;
    this.step();
    this.render();
  }
  step(){
    if (!this.running) return;
    this.snake.update();
    const head = this.snake.body[0];
    // wrap-around behavior (change to game over if you prefer)
    head.x = (head.x + this.cols) % this.cols;
    head.y = (head.y + this.rows) % this.rows;
    // apple collision
    if (head.equals(this.apple)) {
      this.snake.grow(1);
      this.score++;
      this.placeApple();
    }
    // self collision => stop the game
    if (this.snake.hitsSelf()) {
      this.running = false;
    }
  }
  render(){
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.clearRect(0,0,W,H);
    // draw background
    ctx.fillStyle = '#071226';
    ctx.fillRect(0,0,this.canvas.width, this.canvas.height);
    // draw apple
    ctx.fillStyle = '#FF4D4D';
    this.drawCell(this.apple.x, this.apple.y);
    // draw snake
    this.snake.body.forEach((seg, idx) => {
      const color = idx === 0 ? '#A78BFA' : '#22D3EE';
      this.drawCell(seg.x, seg.y, color);
    });
  }
  drawCell(col, row, color){
    const size = this.gridSize;
    const ctx = this.ctx;
    if (color) ctx.fillStyle = color;
    ctx.fillRect(col * size + 1, row * size + 1, size - 2, size - 2);
  }
}
///// Initialization + UI wiring /////
const canvas = document.getElementById('game');
const game = new Game(canvas, 24);

// make canvas responsive initially
(function initCanvasSize(){
  const px = Math.min(600, window.innerWidth * 0.9);
  canvas.style.width = px + 'px';
  canvas.style.height = px + 'px';
  game.resizeCanvas();
})();

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const speedInput = document.getElementById('speed');
const scoreLabel = document.getElementById('score');

startBtn.addEventListener('click', () => { game.start(Number(speedInput.value)); updateScore(); });
pauseBtn.addEventListener('click', () => { game.pause(); updateScore(); });
resetBtn.addEventListener('click', () => { game.reset(); game.render(); updateScore(); });

speedInput.addEventListener('input', () => {
  game.tickInterval = Math.round(1000 / Number(speedInput.value));
});

function updateScore(){ scoreLabel.textContent = `Score: ${game.score}`; }
setInterval(updateScore, 200);
game.render();
