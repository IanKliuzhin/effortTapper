const searchParams = new URLSearchParams(window.location.search);
const taxRate = Number(searchParams.get("tax"));

const scrn = document.getElementById("canvas");
const sctx = scrn.getContext("2d");
scrn.tabIndex = 1;

const GAME_DURATION_MS = 60_000;

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

class Drawer {
  game;
  colors = {
    textGray: "#A2A2A2",
    ballColor: "#DCDCDC",
    lineGray: "#CCCCCC",
  };
  lineWidth_1 = 1;
  lineWidth_2 = 2;
  h1Font = "700 28px courier";
  h2Font = "400 22px Tahoma";

  constructor(game) {
    this.game = game;
  }

  setTextStyles = (h1 = true) => {
    sctx.font = h1 ? this.h1Font : this.h2Font;
    sctx.setLineDash([]);
    sctx.fillStyle = "black";
    sctx.strokeStyle = "black";
  };

  drawCircle = (x, y, radius) => {
    sctx.fillStyle = this.colors.ballColor;
    sctx.beginPath();
    sctx.arc(x, y, radius, 0, 2 * Math.PI);
    sctx.fill();
  };

  drawHorizontalDashedLine = (y, dashOffset) => {
    const { DISPLAY_WITDH } = this.game.ui;

    sctx.lineDashOffset = dashOffset;
    sctx.lineWidth = this.lineWidth_1;
    sctx.beginPath();
    sctx.setLineDash([15, 15]);
    sctx.moveTo(0, y);
    sctx.lineTo(DISPLAY_WITDH, y);
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

  drawDashedCrosshair = (x, y) => {
    const { FLOOR_Y, CEILING_Y, DISPLAY_WITDH } = this.game.ui;

    sctx.lineDashOffset = 0;
    sctx.beginPath();
    sctx.setLineDash([15, 15]);

    sctx.moveTo(x, CEILING_Y);
    sctx.lineTo(x, FLOOR_Y);

    sctx.moveTo(0, y);
    sctx.lineTo(DISPLAY_WITDH, y);

    sctx.strokeStyle = this.colors.lineGray;
    sctx.stroke();
    // sctx.save();
  };
}

class Taxing {
  game;
  taxes = [];

  constructor(game) {
    this.game = game;
  }

  getYByScorePerSecond = (score) => {
    const { FLOOR_Y } = this.game.ui;
    const { MAX_AMPLITUDE_Y } = this.game.ball;

    return Math.abs(Math.floor((MAX_AMPLITUDE_Y * score) / 100 - FLOOR_Y));
  };

  draw = () => {
    const { ui, currentGameStep, playGameStep, framesAmount, TICK_SHIFT_X } =
      this.game;
    const { DISPLAY_WITDH } = ui;

    for (let tax of this.taxes) {
      sctx.fillStyle = "rgba(233, 170, 170, 0.3)";
      const taxWidth = DISPLAY_WITDH - tax.x;
      const taxHeight =
        this.getYByScorePerSecond(0) - this.getYByScorePerSecond(tax.taxRate);
      sctx.fillRect(tax.x, tax.y, taxWidth, taxHeight);
      if (tax.x < 900) {
        sctx.fillStyle = "red";
        sctx.fillText(`${tax.taxRate} ¢`, 940, tax.y + taxRate);
      }
    }

    if (currentGameStep != playGameStep) return;

    if (framesAmount > 200 == 0 && this.taxes.length === 0) {
      this.taxes.push({
        x: DISPLAY_WITDH,
        y: this.getYByScorePerSecond(taxRate),
        taxRate,
      });
    }
    this.taxes.forEach((tax) => (tax.x -= TICK_SHIFT_X));
  };
}

class Ball {
  game;
  X = 350;
  y = 560;
  RADIUS = 35;
  fallingSpeed = 0;
  MIN_GRAVITY = 0.125;
  gravity = this.MIN_GRAVITY;
  coordsHistory = [];
  MAX_TOP_Y;
  MIN_BOTTOM_Y;
  MAX_AMPLITUDE_Y;

  constructor(game) {
    this.game = game;
    this.MAX_TOP_Y = game.ui.CEILING_Y + this.RADIUS; // 135
    this.MIN_BOTTOM_Y = game.ui.FLOOR_Y - this.RADIUS; // 565
    this.MAX_AMPLITUDE_Y = this.MIN_BOTTOM_Y - this.MAX_TOP_Y; // 440
  }

  getScorePerSecondByY = (y) => {
    const result = Math.abs(
      Math.floor((100 * (y - this.MIN_BOTTOM_Y)) / this.MAX_AMPLITUDE_Y)
    );
    return result;
  };

  drawHeight = (x, y) => {
    const { drawer } = this.game;

    drawer.setTextStyles(true);

    let scorePerSecond = this.getScorePerSecondByY(y);
    sctx.textAlign = "left";
    sctx.fillText(scorePerSecond, x + 45, y - 10);

    this.game.scorePerSecond = scorePerSecond;
  };

  draw = () => {
    const { drawer, currentGameStep, playGameStep, ui, TICK_SHIFT_X } =
      this.game;
    const { FLOOR_Y, CEILING_Y } = ui;

    if (currentGameStep !== playGameStep) {
      drawer.drawCircle(this.X, this.y, this.RADIUS);
      return;
    }

    const bottomY = this.y + this.RADIUS;
    const isIntersectedWithFloor = bottomY > FLOOR_Y;
    const topY = this.y - this.RADIUS;

    this.gravity =
      this.MIN_GRAVITY * (1 + (1.23 * this.getScorePerSecondByY(this.y)) / 100);
    this.fallingSpeed += this.gravity;

    if (!isIntersectedWithFloor) {
      const isNextYLowerThenFloor = bottomY + this.fallingSpeed > FLOOR_Y;
      const isNextYHigherThenCeiling = topY + this.fallingSpeed < CEILING_Y;
      if (isNextYLowerThenFloor) {
        this.y = FLOOR_Y - this.RADIUS;
      } else if (isNextYHigherThenCeiling) {
        this.y = CEILING_Y + this.RADIUS;
      } else {
        this.y += this.fallingSpeed;
      }
    }

    const start =
      this.coordsHistory.length - 199 > 0 ? this.coordsHistory.length - 199 : 0;
    const last200Coords = this.coordsHistory.slice(start);
    this.coordsHistory = last200Coords.map((coords) => {
      return { x: coords.x - TICK_SHIFT_X, y: coords.y, date: coords.date };
    });
    this.coordsHistory.push({ x: this.X, y: this.y, date: Date.now() });
    drawer.drawDashedCrosshair(this.X, this.y);

    drawer.drawCircle(this.X, this.y, this.RADIUS);
    drawer.drawLine(this.coordsHistory);

    this.drawHeight(this.X, this.y);
    this.checkIsTaxIntersection();
  };

  flap = () => {
    const { scorePerSecond, startGameTime, results } = this.game;

    if (this.y < 0) return;
    let thrust = 5.31 - Math.log1p(scorePerSecond / 1.5 || 1);
    this.fallingSpeed = -thrust;
    if (startGameTime) this.game.tapsCounts += 1;
    results.flaps.push(Date.now());
  };

  checkIsTaxIntersection = () => {
    const { taxing } = this.game;

    const isTaxIntersection = this.X > taxing.taxes[0]?.x;
    if (!isTaxIntersection) return;
    this.game.decreaseScoreTaxed();
    this.game.increaseScoreProduced();
    this.game.setLeftTimerValue();
    this.game.setTaxPerSecond(taxing.taxes[0].taxRate);
    if (!this.game.startGameTime) this.game.startGameTime = Date.now();
    this.game.saveResults();
  };
}

class UI {
  game;
  getReadyImage = new Image();
  gameOverImage = new Image();
  tapImages = [new Image(), new Image()];
  frameIndex = 0;
  CEILING_Y = 100;
  FLOOR_Y = 600;
  DISPLAY_WITDH = 1000;

  constructor(game) {
    this.game = game;

    this.getReadyImage.src = "img/getReady.png";
    this.gameOverImage.src = "img/gameOver.png";
    this.tapImages[0].src = "img/tap1.png";
    this.tapImages[1].src = "img/tap2.png";
  }

  clearScreen = () => {
    sctx.fillRect(0, 0, scrn.width, scrn.height);
  };

  drawBorders = () => {
    const { drawer, displayPositionX } = this.game;

    drawer.drawHorizontalDashedLine(this.FLOOR_Y, -displayPositionX);
    drawer.drawHorizontalDashedLine(this.CEILING_Y, -displayPositionX);
  };

  draw = () => {
    const { currentGameStep, indexGameStep, finalScreenGameStep } = this.game;

    switch (currentGameStep) {
      case indexGameStep:
        this.drawGetReady();
        break;
      case finalScreenGameStep:
        this.drawGameOver();
        break;
      default:
        this.drawScore();
    }
  };

  drawGetReady = () => {
    const x = parseFloat(scrn.width - this.getReadyImage.width) / 2;
    const y = parseFloat(scrn.height - this.getReadyImage.height) / 2;
    const width = parseFloat(scrn.width - this.tapImages[0].width) / 2;
    const height = y + this.getReadyImage.height - this.tapImages[0].height;
    sctx.drawImage(this.getReadyImage, x, y);
    sctx.drawImage(this.tapImages[this.frameIndex], width, height);
  };

  drawGameOver = () => {
    const x = parseFloat(scrn.width - this.gameOverImage.width) / 2;
    const y = parseFloat(scrn.height - this.gameOverImage.height) / 2;
    // this.tx = parseFloat(scrn.width - this.tapImages[0].width) / 2;
    // this.ty = this.y + this.gameOverImage.height - this.tapImages[0].height;
    sctx.fillStyle = "white";
    // sctx.fillRect(this.x - 150, this.y - 80, 400, 200);
    sctx.drawImage(this.gameOverImage, x, y);
  };

  drawProducedScore = () => {
    const { drawer, scoreProduced } = this.game;

    drawer.setTextStyles(false);
    sctx.textAlign = "right";
    sctx.fillText(scoreProduced + "¢", scrn.width - 150, 40);
    sctx.textAlign = "left";
    sctx.fillStyle = drawer.colors.textGray;
    sctx.fillText("produced", scrn.width - 140, 40);
  };

  drawTaxed = () => {
    const { drawer, scoreTaxed } = this.game;

    drawer.setTextStyles(false);
    sctx.textAlign = "right";
    sctx.fillText(scoreTaxed + "¢", scrn.width - 150, 70);
    sctx.fillStyle = drawer.colors.textGray;
    sctx.textAlign = "left";
    sctx.fillText("taxed", scrn.width - 140, 70);
  };

  drawProfitScore = () => {
    const { drawer, scoreProduced, scoreTaxed } = this.game;

    drawer.setTextStyles(false);
    sctx.textAlign = "right";
    sctx.fillText(scoreProduced + scoreTaxed + "¢", 500, 40);
    sctx.textAlign = "left";
    sctx.fillStyle = drawer.colors.textGray;
    sctx.fillText("profit", 510, 40);
  };

  drawProfitPerSecond = () => {
    const { drawer, scorePerSecond, taxPerSecond } = this.game;

    drawer.setTextStyles(false);
    sctx.textAlign = "right";
    sctx.fillText(scorePerSecond - taxPerSecond + "¢", 500, 70);
    sctx.textAlign = "left";
    sctx.fillStyle = drawer.colors.textGray;
    sctx.fillText("profit /s", 510, 70);
  };

  drawTimer = () => {
    const { drawer, leftTimerValue } = this.game;

    if (!leftTimerValue) this.game.setLeftTimerValue();
    drawer.setTextStyles(false);
    sctx.textAlign = "right";
    sctx.fillText(leftTimerValue?.toLocaleTimeString("en-GB") + " /", 200, 70);
    sctx.textAlign = "left";
    const rightTimer = new Date(2000, 0, 0, 1, 0, 0).toLocaleTimeString(
      "en-GB"
    );
    sctx.fillText(rightTimer, 208, 70);
  };

  drawScore = () => {
    const { drawer } = this.game;

    drawer.setTextStyles();
    this.drawProducedScore();
    this.drawProfitScore();
    this.drawTaxed();
    this.drawProfitPerSecond();
    this.drawTimer();
  };

  update = () => {
    const {
      currentGameStep,
      finalScreenGameStep,
      interval,
      scoreProduced,
      scoreTaxed,
      startGameTime,
      results,
      duration,
      playGameStep,
      framesAmount,
    } = this.game;

    if (currentGameStep === finalScreenGameStep) {
      clearInterval(interval);
      results.produced = scoreProduced;
      results.taxed = scoreTaxed;
      results.profit = scoreProduced + scoreTaxed;
      results.flaps = results.flaps
        .map((flap) => {
          const isBeforeStart = flap < startGameTime;
          const time = new Date(
            isBeforeStart ? startGameTime - flap : flap - startGameTime
          );
          return `${
            isBeforeStart ? "-" : ""
          }${time.getSeconds()}.${time.getMilliseconds()}`;
        })
        .join(", ");
      results.scoresBySeconds = results.scoresBySeconds.join(", ");
      results.taxesBySeconds = results.taxesBySeconds.join(", ");

      const searchParams = new URLSearchParams(window.location.search);
      const id = searchParams.get("UUID");
      if (id) {
        dbFunctions.set(dbFunctions.ref(db, id), {
          ...results,
        });
      }

      setTimeout(() => {
        const gameScreen = document.getElementById("canvas");
        const finalScreen = document.getElementById("final");
        finalScreen.style.display = "block";
        gameScreen.classList.add("notVisible");
        gameScreen.classList.remove("visible");
        finalScreen.classList.add("visible");
        finalScreen.classList.remove("notVisible");
      }, 750);
    }

    if (startGameTime && startGameTime + duration < Date.now()) {
      this.game.currentGameStep = finalScreenGameStep;
    }

    if (currentGameStep === playGameStep) return;
    this.frameIndex += framesAmount % 10 === 0 ? 1 : 0;
    this.frameIndex = this.frameIndex % this.tapImages.length;
  };
}

class Game {
  drawer;
  taxing;
  ball;
  ui;

  duration = 0;
  interval = 0;
  framesAmount = 0;
  displayPositionX = 0;

  currentGameStep = 0;
  indexGameStep = 0;
  playGameStep = 1;
  finalScreenGameStep = 2;
  scorePerSecond = 0;
  scoreProduced = 0;
  scoreTaxed = 0;
  taxPerSecond = 0;
  startGameTime = null;
  leftTimerValue = null;
  tapsCounts = 0;
  TICK_DURATION_MS = 20;
  TICK_SHIFT_X = 2;

  results = {
    scoresBySeconds: [],
    flaps: [],
    taxesBySeconds: [],
    produced: 0,
    taxed: 0,
    profit: 0,
  };

  constructor(duration) {
    this.duration = duration;

    this.drawer = new Drawer(this);
    this.taxing = new Taxing(this);
    this.ui = new UI(this);
    this.ball = new Ball(this);

    scrn.addEventListener("click", () => {
      switch (this.currentGameStep) {
        case this.indexGameStep:
          this.currentGameStep = this.playGameStep;
          break;
        case this.playGameStep:
          this.ball.flap();
          break;
        // case state.finalScreenGameStep:
        // state.currentGameStep = state.indexGameStep;
        // point.speed = 0;
        // point.y = 100;
        // UI.score.currentGameStep = 0;
        // break;
      }
    });
  }

  run = () => {
    this.interval = setInterval(this.gameLoop, this.TICK_DURATION_MS);
  };

  gameLoop = () => {
    this.draw();
    this.update();
    this.framesAmount++;
  };

  draw = () => {
    sctx.fillStyle = "white";
    this.ui.clearScreen();
    this.taxing.draw();
    this.ui.drawBorders();

    this.ball.draw();
    this.ui.draw();
  };

  update = () => {
    this.ui.update();
    if (this.currentGameStep !== this.playGameStep) return;
    this.displayPositionX -= this.TICK_SHIFT_X;
  };

  increaseScoreProduced = throttle(
    () => (this.scoreProduced += this.scorePerSecond),
    1000
  );
  decreaseScoreTaxed = throttle(() => (this.scoreTaxed -= taxRate), 1000);
  setTaxPerSecond = throttle((score) => (this.taxPerSecond = score), 1000);
  setLeftTimerValue = throttle(() => {
    const secondsFromStart = Math.floor(Date.now() - this.startGameTime) / 1000;
    this.leftTimerValue = this.startGameTime
      ? new Date(new Date(0, 0, 0, 0, secondsFromStart, 0))
      : new Date(0, 0, 0, 0, 0, 0);
  }, 1000);

  saveResults = throttle(() => {
    this.results.scoresBySeconds.push(this.scorePerSecond);
    this.results.taxesBySeconds.push(-this.taxPerSecond);
  }, 1000);
}

const game = new Game(GAME_DURATION_MS);

game.run();
