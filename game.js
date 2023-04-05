console.group();

const RAD = Math.PI / 180;
const scrn = document.getElementById("canvas");
const sctx = scrn.getContext("2d");
scrn.tabIndex = 1;

const sceneHeight = 500;
const sceneWidth = 1000;
const siblingHeight = 100;
const floorHeight = 600;

let frames = 0;
let sceneX = 0;
const pointRadius = 35;
const pointXCoord = 250;
const dx = 2;
let coordsHistory = [];
const state = {
  curr: 0,
  getReady: 0,
  Play: 1,
  gameOver: 2,
};
const pointColor = "#E7E7E7";
const bottomColor = "#00000033";

const drawPoint = (x, y) => {
  sctx.beginPath();
  sctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
  sctx.fillStyle = pointColor;
  sctx.fill();
  sctx.save();
};

const drawLine = (coordsHistory) => {
  sctx.beginPath();
  sctx.setLineDash([]);
  sctx.lineWidth = 2;

  for (const coord of coordsHistory.slice((coordsHistory.length - 250, 0))) {
    sctx.lineTo(coord.x, coord.y);
  }
  sctx.strokeStyle = "black";
  sctx.stroke();
  sctx.save();
};

const drawDashedLine = (y, x) => {
  sctx.beginPath();
  sctx.setLineDash([15, 15]);
  sctx.moveTo(0, y);
  sctx.lineTo(1000, y);
  sctx.strokeStyle = bottomColor;
  sctx.lineDashOffset = -x;
  sctx.stroke();
  sctx.save();
};

scrn.addEventListener("click", () => {
  switch (state.curr) {
    case state.getReady:
      state.curr = state.Play;
      break;
    case state.Play:
      point.flap();
      break;
    case state.gameOver:
      state.curr = state.getReady;
      point.speed = 0;
      point.y = 100;
      // pipe.pipes = [];
      UI.score.curr = 0;
      break;
  }
});
const sibling = {
  y: siblingHeight,
  draw: function () {
    drawDashedLine(this.y, sceneX);

    if (state.curr !== state.Play) return;
    sceneX -= dx;
  },
};

const floor = {
  y: floorHeight,
  draw: function () {
    drawDashedLine(this.y, sceneX);
  },
};

const point = {
  x: pointXCoord,
  y: 350,
  speed: 0,
  // gravity: 0.125,
  gravity: 0.5,
  acceleration: 3,
  thrust: 10,
  // thrust: 3.6,
  frame: 0,
  draw: function () {
    if (state.curr !== state.Play) {
      drawPoint(this.x, this.y);
      return;
    }

    const bottomOfThePoint = this.y + pointRadius;
    const floorPointIntersection = bottomOfThePoint > floorHeight;
    const topOfThePoint = this.y - pointRadius;

    this.speed += this.gravity;

    if (!floorPointIntersection) {
      const isNextYLowerThenFloor = bottomOfThePoint + this.speed > floorHeight;
      const isNextYHigherThenSibbling =
        topOfThePoint + this.speed < siblingHeight;
      if (isNextYLowerThenFloor) {
        this.y = floorHeight - pointRadius;
      } else if (isNextYHigherThenSibbling) {
        this.y = siblingHeight + pointRadius;
      } else {
        this.y += this.speed;
      }
    }
    drawPoint(this.x, this.y);

    coordsHistory = coordsHistory.map((coords, i, arr) => {
      return { x: coords.x - dx, y: coords.y };
    });
    coordsHistory.push({ x: this.x, y: this.y });

    console.log("this.coordsHistory", coordsHistory);
    drawLine(coordsHistory);
  },
  flap: function () {
    if (this.y < 0) return;
    this.speed = -this.thrust;
  },
};

const UI = {
  getReady: { sprite: new Image() },
  gameOver: { sprite: new Image() },
  tap: [{ sprite: new Image() }, { sprite: new Image() }],
  score: {
    curr: 0,
    best: 0,
  },
  x: 0,
  y: 0,
  tx: 0,
  ty: 0,
  frame: 0,
  draw: function () {
    switch (state.curr) {
      case state.getReady:
        this.y = parseFloat(scrn.height - this.getReady.sprite.height) / 2;
        this.x = parseFloat(scrn.width - this.getReady.sprite.width) / 2;
        this.tx = parseFloat(scrn.width - this.tap[0].sprite.width) / 2;
        this.ty =
          this.y + this.getReady.sprite.height - this.tap[0].sprite.height;
        sctx.drawImage(this.getReady.sprite, this.x, this.y);
        sctx.drawImage(this.tap[this.frame].sprite, this.tx, this.ty);
        break;
      case state.gameOver:
        this.y = parseFloat(scrn.height - this.gameOver.sprite.height) / 2;
        this.x = parseFloat(scrn.width - this.gameOver.sprite.width) / 2;
        this.tx = parseFloat(scrn.width - this.tap[0].sprite.width) / 2;
        this.ty =
          this.y + this.gameOver.sprite.height - this.tap[0].sprite.height;
        sctx.drawImage(this.gameOver.sprite, this.x, this.y);
        sctx.drawImage(this.tap[this.frame].sprite, this.tx, this.ty);
        break;
    }
    this.drawScore();
  },
  drawScore: function () {
    sctx.fillStyle = "white";
    sctx.strokeStyle = "black";
    sctx.setLineDash([]);
    switch (state.curr) {
      case state.Play:
        sctx.lineWidth = "2";
        sctx.font = "35px Squada One";
        sctx.fillText(this.score.curr, scrn.width / 2 - 5, 50);
        sctx.strokeText(this.score.curr, scrn.width / 2 - 5, 50);
        break;
      case state.gameOver:
        sctx.lineWidth = "2";
        sctx.font = "40px Squada One";
        let sc = `SCORE :     ${this.score.curr}`;
        try {
          this.score.best = Math.max(
            this.score.curr,
            localStorage.getItem("best")
          );
          localStorage.setItem("best", this.score.best);
          let bs = `BEST  :     ${this.score.best}`;
          sctx.fillText(sc, scrn.width / 2 - 80, scrn.height / 2 + 0);
          sctx.strokeText(sc, scrn.width / 2 - 80, scrn.height / 2 + 0);
          sctx.fillText(bs, scrn.width / 2 - 80, scrn.height / 2 + 30);
          sctx.strokeText(bs, scrn.width / 2 - 80, scrn.height / 2 + 30);
        } catch (e) {
          sctx.fillText(sc, scrn.width / 2 - 85, scrn.height / 2 + 15);
          sctx.strokeText(sc, scrn.width / 2 - 85, scrn.height / 2 + 15);
        }

        break;
    }
  },
  update: function () {
    if (state.curr == state.Play) return;
    this.frame += frames % 10 == 0 ? 1 : 0;
    this.frame = this.frame % this.tap.length;
  },
};

UI.gameOver.sprite.src = "img/go.png";
UI.getReady.sprite.src = "img/getready.png";
UI.tap[0].sprite.src = "img/tap/t0.png";
UI.tap[1].sprite.src = "img/tap/t1.png";

function draw() {
  sctx.fillStyle = "white";
  sctx.fillRect(0, 0, scrn.width, scrn.height);

  sibling.draw();
  floor.draw();
  point.draw();
  // historyLine.draw();
  UI.draw();
}
function update() {
  // sibling.update();
  // floor.update();
  UI.update();
}
function gameLoop() {
  update();
  draw();
  frames++;
  // console.log("state: ", state);
}

setInterval(gameLoop, 20);

console.groupEnd();
