const searchParams = new URLSearchParams(window.location.search);
const taxRate = Number(searchParams.get('tax'));

const scrn = document.getElementById("canvas");
const sctx = scrn.getContext("2d");
scrn.tabIndex = 1;

const frmaeHeight = 700;
const sceneHeight = 500;
const sceneWidth = 1000;
const siblingHeight = 100;
const floorHeight = 600;

const pointRadius = 35;
const pointXCoord = 350;

const maxSceneHeght = siblingHeight + pointRadius; // 135
const minSceneHeight = floorHeight - pointRadius; // 565
const minSceneMaxHeight = minSceneHeight - maxSceneHeght; // 440

const dx = 2;
const gameLength = 60_000;
let gameInterval = 0;

const throttle = (callback, delay) => {
  let shouldWait = false;
  return (...args) => {
    if (shouldWait) return;
    callback(...args);
    shouldWait = true;
    setTimeout(() => {
      shouldWait = false;
    }, delay);
  };
};

let frames = 0;
let sceneX = 0;
let coordsHistory = [];

class Drawer {
  colors = {
    textGray: "#A2A2A2",
    pointColor: "#DCDCDC",
    lineGray: "#CCCCCC"
  }
  lineWidth_1 = 1;
  lineWidth_2 = 2;
  h1Font = "700 28px courier";
  h2Font = "400 22px Tahoma";

  setTextStyles = (h1 = true) => {
    sctx.font = h1 ? this.h1Font : this.h2Font;
    sctx.setLineDash([]);
    sctx.fillStyle = "black";
    sctx.strokeStyle = "black";
  };
  
  drawPoint = (x, y) => {
    sctx.fillStyle = this.colors.pointColor;
    sctx.beginPath();
    sctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
    sctx.fill();
  };

  drawDashedLine = (y, x) => {
    sctx.lineDashOffset = -x;
    sctx.lineWidth = this.lineWidth_1;
    sctx.beginPath();
    sctx.setLineDash([15, 15]);
    sctx.moveTo(0, y);
    sctx.lineTo(sceneWidth, y);
    sctx.strokeStyle = this.colors.lineGray;
    sctx.stroke();
  };

  drawLine = (last200Coords) => {
    sctx.setLineDash([]);
    sctx.lineWidth = this.lineWidth_2;
    sctx.beginPath();
    if (last200Coords.length < 2) return;
    for (let i = 0; i < last200Coords.length - 1; i++) {
      const lastPoint = last200Coords[i];
      const firstPoint = last200Coords[i + 1];
  
      const x_mid = (lastPoint.x + firstPoint.x) / 2;
      const y_mid = (lastPoint.y + firstPoint.y) / 2;
      const cp_x = (x_mid + lastPoint.x) / 2;
      const cp_y = (y_mid + lastPoint.y) / 2;
  
      sctx.quadraticCurveTo(cp_x, cp_y, x_mid, y_mid);
    }
    // const isTaxIntersection = firstPoint.x < tax.taxes[0].x && firstPoint.y > tax.taxes[0].y;
    // sctx.strokeStyle = isTaxIntersection ? "red" : "black";
  
    // const gradient = sctx.createLinearGradient(tax.taxes[0].x, siblingHeight, floorHeight, 500);
    // gradient.addColorStop(0, "black");
    // gradient.addColorStop(0.6, "black");
    // gradient.addColorStop(0.8, "red");
    // gradient.addColorStop(1, "red");
  
    // sctx.strokeStyle = pointXCoord < tax.taxes[0].x ? "black" : gradient;
    sctx.strokeStyle = "black";
    sctx.stroke();
    // sctx.save();
  };

  drawDashedCrosshair = (y, x) => {
    sctx.lineDashOffset = 0;
    sctx.beginPath();
    sctx.setLineDash([15, 15]);

    sctx.moveTo(this.x, 0);
    sctx.lineTo(this.x, frmaeHeight);

    sctx.moveTo(0, this.y);
    sctx.lineTo(sceneWidth, this.y);

    sctx.strokeStyle = this.colors.lineGray;
    sctx.stroke();
    // sctx.save();
  };
}

const drawer = new Drawer();

const state = {
  currentGameStep: 0,
  indexGameStep: 0,
  playGameStep: 1,
  finalScreenGameStep: 2,
  scorePerSecond: 0,
  scoreProduced: 0,
  scoreProfit: 0,
  scoreTaxed: 0,
  taxPerSecond: 0,
  startGameTime: null,
  leftTimerValue: null,
  tapsCounts: 0
};

const results = {
  scoresBySeconds: [],
  flaps: [],
  taxesBySeconds: [],
  produced: 0,
  taxed: 0,
  profit: 0,
}

const getScorePerSecondByY = (y) => {
  const result = Math.abs(
    Math.floor((100 * (y - minSceneHeight)) / minSceneMaxHeight)
  );
  return result;
};

const getYByScorePerSecond = (score) => {
  const minSceneMaxHeight = floorHeight - siblingHeight;
  return Math.abs(Math.floor((minSceneMaxHeight * score) / 100 - floorHeight));
};

const drawHeightOfPoint = (x, y) => {
  drawer.setTextStyles(true);

  let scorePerSecond = getScorePerSecondByY(y);
  sctx.textAlign = "left";
  sctx.fillText(scorePerSecond, x + 45, y - 10);

  state.scorePerSecond = scorePerSecond;
};

const increaseScoreProduced = throttle(
  () => (state.scoreProduced += state.scorePerSecond),
  1000
);
const decreaseScoreTaxed = throttle(
  () => (state.scoreTaxed -= taxRate),
  1000
);
const setTaxPerSecond = throttle(
  (score) => (state.taxPerSecond = score),
  1000
);
const setLeftTimerValue = throttle(
  () => {
    const secondsFromStart = Math.floor(Date.now() - state.startGameTime) / (1000)
    state.leftTimerValue = state.startGameTime ? new Date(new Date(0, 0, 0, 0, secondsFromStart, 0)) : new Date(0, 0, 0, 0, 0, 0)
  },
  1000
);

const saveResults = throttle(() => {
  results.scoresBySeconds.push(state.scorePerSecond);
  results.taxesBySeconds.push(-state.taxPerSecond);
}, 1000)

const drawProducedScore = () => {
  drawer.setTextStyles(false);
  sctx.textAlign = "right";
  sctx.fillText(state.scoreProduced + "¢", scrn.width - 150, 40);
  sctx.textAlign = "left";
  sctx.fillStyle = drawer.colors.textGray;
  sctx.fillText("produced", scrn.width - 140, 40);
};
const drawTaxed = () => {
  drawer.setTextStyles(false);
  sctx.textAlign = "right";
  sctx.fillText(state.scoreTaxed + "¢", scrn.width - 150, 70);
  sctx.fillStyle = drawer.colors.textGray;
  sctx.textAlign = "left";
  sctx.fillText("taxed", scrn.width - 140, 70);
};

const drawProfitScore = () => {
  drawer.setTextStyles(false);
  sctx.textAlign = "right";
  sctx.fillText(state.scoreProduced + state.scoreTaxed + "¢", 500, 40);
  sctx.textAlign = "left";
  sctx.fillStyle = drawer.colors.textGray;
  sctx.fillText("profit", 510, 40);
};
const drawProfitPerSecond = () => {
  drawer.setTextStyles(false);
  sctx.textAlign = "right";
  sctx.fillText(state.scorePerSecond - state.taxPerSecond + "¢", 500, 70);
  sctx.textAlign = "left";
  sctx.fillStyle = drawer.colors.textGray;
  sctx.fillText("profit /s", 510, 70);
};
const drawTimer = () => {
  if (!state.leftTimerValue) setLeftTimerValue()
  drawer.setTextStyles(false);
  sctx.textAlign = "right";
  sctx.fillText(state.leftTimerValue?.toLocaleTimeString("en-GB") + " /", 200, 70);
  sctx.textAlign = "left";
  const rightTimer = new Date(2000, 0, 0, 1, 0, 0).toLocaleTimeString("en-GB")
  sctx.fillText(rightTimer, 208, 70);
};

scrn.addEventListener("click", () => {
  switch (state.currentGameStep) {
    case state.indexGameStep:
      state.currentGameStep = state.playGameStep;
      break;
    case state.playGameStep:
      point.flap();
      break;
    // case state.finalScreenGameStep:
      // state.currentGameStep = state.indexGameStep;
      // point.speed = 0;
      // point.y = 100;
      // UI.score.currentGameStep = 0;
      // break;
  }
});

class Taxing {
  taxes = [];

  draw = () => {
    for (let tax of this.taxes) {
      sctx.fillStyle = "rgba(233, 170, 170, 0.3)";
      const taxWidth = sceneWidth - tax.x;
      const taxHeight = getYByScorePerSecond(0) - getYByScorePerSecond(tax.taxRate);
      sctx.fillRect(tax.x, tax.y, taxWidth, taxHeight);
      if (tax.x < 900) {
        sctx.fillStyle = "red";
        sctx.fillText(`${tax.taxRate} ¢`, 940, tax.y + taxRate);
      }
    }

    if (state.currentGameStep != state.playGameStep) return;

    if (frames > 200 == 0 && this.taxes.length === 0) {
      this.taxes.push({
        x: sceneWidth,
        y: getYByScorePerSecond(taxRate),
        taxRate
      });
    }
    this.taxes.forEach((tax) => tax.x -= dx);
  };
}

const taxing = new Taxing();

const point = {
  x: pointXCoord,
  y: 560,
  speed: 0,
  gravity: 0.125,
  frame: 0,
  draw: function () {
    if (state.currentGameStep !== state.playGameStep) {
      drawer.drawPoint(this.x, this.y);
      return;
    }

    const bottomOfThePoint = this.y + pointRadius;
    const floorPointIntersection = bottomOfThePoint > floorHeight;
    const topOfThePoint = this.y - pointRadius;

    this.speed += (this.gravity * (2 * getScorePerSecondByY(this.y) / 100));

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

    const start =
      coordsHistory.length - 199 > 0 ? coordsHistory.length - 199 : 0;
    const last200Coords = coordsHistory.slice(start);
    coordsHistory = last200Coords.map((coords) => {
      return { x: coords.x - dx, y: coords.y, date: coords.date };
    });
    const data = { x: this.x, y: this.y, date: Date.now() };
    coordsHistory.push(data);
    // throtle(coordsHistory.push(data), 1000);
    drawer.drawDashedCrosshair();

    drawer.drawPoint(this.x, this.y);
    drawer.drawLine(coordsHistory);

    drawHeightOfPoint(this.x, this.y);
    this.checkIsTaxIntersection()
    // console.log("coordsHistory: ", coordsHistory);
  },
  flap: function () {
    if (this.y < 0) return;
    let thrust = 5.31 - Math.log1p(state.scorePerSecond / 1.5 || 1);
    this.speed = -thrust;
    if (state.startGameTime) state.tapsCounts += 1
    results.flaps.push(Date.now());
  },
  checkIsTaxIntersection: function () {
    const isTaxIntersection = this.x > taxing.taxes[0]?.x;
    if (!isTaxIntersection) return
    decreaseScoreTaxed()
    increaseScoreProduced();
    setLeftTimerValue()
    setTaxPerSecond(taxing.taxes[0].taxRate)
    if (!state.startGameTime) state.startGameTime = Date.now();
    saveResults();
  }
};

const UI = {
  indexGameStep: { sprite: new Image() },
  gameOver: { sprite: new Image() },
  tap: [{ sprite: new Image() }, { sprite: new Image() }],
  x: 0,
  y: 0,
  tx: 0,
  ty: 0,
  frame: 0,
  draw: function () {
    switch (state.currentGameStep) {
      case state.indexGameStep:
          this.y = parseFloat(scrn.height - this.indexGameStep.sprite.height) / 2;
          this.x = parseFloat(scrn.width - this.indexGameStep.sprite.width) / 2;
          this.tx = parseFloat(scrn.width - this.tap[0].sprite.width) / 2;
          this.ty =
            this.y + this.indexGameStep.sprite.height - this.tap[0].sprite.height;
          sctx.drawImage(this.indexGameStep.sprite, this.x, this.y);
        sctx.drawImage(this.tap[this.frame].sprite, this.tx, this.ty);   
        break;
      case state.finalScreenGameStep:
          this.y = parseFloat(scrn.height - this.gameOver.sprite.height) / 2;
          this.x = parseFloat(scrn.width - this.gameOver.sprite.width) / 2;
          this.tx = parseFloat(scrn.width - this.tap[0].sprite.width) / 2;
          this.ty =
          this.y + this.gameOver.sprite.height - this.tap[0].sprite.height;
          
        sctx.fillStyle = "white";
          // sctx.fillRect(this.x - 150, this.y - 80, 400, 200);
          sctx.drawImage(this.gameOver.sprite, this.x, this.y);
        break;
    }
    this.drawScore();
  },
  drawScore: function () {
    drawer.setTextStyles();
    drawProducedScore();
    drawProfitScore();
    drawTaxed();
    drawProfitPerSecond();
    drawTimer();
  },
  update: function () {
    if (state.currentGameStep === state.finalScreenGameStep) {
      clearInterval(gameInterval);
      results.produced = state.scoreProduced
      results.taxed = state.scoreTaxed
      results.profit = state.scoreProduced + state.scoreTaxed
      results.flaps = results.flaps.map((flap) => {
        const isBeforeStart = flap < state.startGameTime
        const time = new Date(isBeforeStart ? state.startGameTime - flap : flap - state.startGameTime)
        return `${isBeforeStart ? '-' : ''}${time.getSeconds()}.${time.getMilliseconds()}`
      }).join(', ')
      results.scoresBySeconds = results.scoresBySeconds.join(', ')
      results.taxesBySeconds = results.taxesBySeconds.join(', ')

      const searchParams = new URLSearchParams(window.location.search);
      const id = searchParams.get("UUID");
      if (id) {
        dbFunctions.set(dbFunctions.ref(db, id), {
          ...results,
        })
      }

      setTimeout(() => {
        const gameScreen = document.getElementById("canvas")
        const finalScreen = document.getElementById("final")
        finalScreen.style.display = 'block'
        gameScreen.classList.add("notVisible");
        gameScreen.classList.remove("visible");
        finalScreen.classList.add("visible");
        finalScreen.classList.remove("notVisible");
      }, 750)
    }

    if (state.startGameTime && state.startGameTime + gameLength < Date.now()) {
      state.currentGameStep = state.finalScreenGameStep
    }

    if (state.currentGameStep === state.playGameStep) return;
    this.frame += frames % 10 === 0 ? 1 : 0;
    this.frame = this.frame % this.tap.length;
  },
};

function draw() {
  sctx.fillStyle = "white";
  sctx.fillRect(0, 0, scrn.width, scrn.height);
  taxing.draw();
  drawer.drawDashedLine(floorHeight, sceneX);
  drawer.drawDashedLine(siblingHeight, sceneX);

  point.draw();
  UI.draw();
}

function update() {
  UI.update();
  if (state.currentGameStep !== state.playGameStep) return;
  sceneX -= dx;
}

function gameLoop() {
  draw();
  update();
  frames++;
}

const runGame = () => {
  UI.gameOver.sprite.src = "img/gameOver.png";
  UI.indexGameStep.sprite.src = "img/getReady.png";
  UI.tap[0].sprite.src = "img/tap1.png";
  UI.tap[1].sprite.src = "img/tap2.png";

  gameInterval = setInterval(gameLoop, 20);
};

runGame();
