const searchParams = new URLSearchParams(window.location.search);
const taxRate = Number(searchParams.get("tax"));

const scrn = document.getElementById("canvas");

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
  sctx;

  COLORS = {
    black: "black",
    textGray: "#A2A2A2",
    ballColor: "#DCDCDC",
    lineGray: "#CCCCCC",
    taxRect: "rgba(233, 170, 170, 0.3)",
    taxRate: "red",
  };
  BIG_FONT = "700 28px courier";
  SMALL_FONT = "400 22px Tahoma";
  DASH_LENGTH = 15;

  constructor(game) {
    this.game = game;

    this.sctx = game.scrn.getContext("2d");
  }

  clearScreen = () => {
    const { scrn } = game;

    this.sctx.fillStyle = "white";
    this.sctx.fillRect(0, 0, scrn.width, scrn.height);
  };

  drawCircle = (x, y, radius, color) => {
    this.sctx.fillStyle = this.COLORS[color];
    this.sctx.beginPath();
    this.sctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.sctx.fill();
  };

  drawHorizontalDashedLine = (y, dashOffset, color, lineWidth) => {
    const { DISPLAY_WITDH } = this.game.ui;

    this.sctx.lineDashOffset = dashOffset;
    this.sctx.lineWidth = lineWidth;
    this.sctx.strokeStyle = this.COLORS[color];

    this.sctx.beginPath();
    this.sctx.setLineDash([this.DASH_LENGTH, this.DASH_LENGTH]);
    this.sctx.moveTo(0, y);
    this.sctx.lineTo(DISPLAY_WITDH, y);
    this.sctx.stroke();
  };

  drawCurvedLine = (coords, lineWidth) => {
    this.sctx.setLineDash([]);
    this.sctx.lineWidth = lineWidth;

    this.sctx.beginPath();
    for (let i = 0; i < coords.length - 1; i++) {
      const lastPoint = coords[i];
      const firstPoint = coords[i + 1];

      const x_mid = (lastPoint.x + firstPoint.x) / 2;
      const y_mid = (lastPoint.y + firstPoint.y) / 2;
      const cp_x = (x_mid + lastPoint.x) / 2;
      const cp_y = (y_mid + lastPoint.y) / 2;

      this.sctx.quadraticCurveTo(cp_x, cp_y, x_mid, y_mid);
    }
    // const isTaxIntersection = firstPoint.x < tax.taxes[0].x && firstPoint.y > tax.taxes[0].y;
    // sctx.strokeStyle = isTaxIntersection ? "red" : "black";

    // const gradient = sctx.createLinearGradient(tax.taxes[0].x, siblingHeight, floorHeight, 500);
    // gradient.addColorStop(0, "black");
    // gradient.addColorStop(0.6, "black");
    // gradient.addColorStop(0.8, "red");
    // gradient.addColorStop(1, "red");

    // sctx.strokeStyle = pointXCoord < tax.taxes[0].x ? "black" : gradient;
    this.sctx.strokeStyle = this.COLORS.black;
    this.sctx.stroke();
    // sctx.save();
  };

  drawDashedCrosshair = (x, y, color) => {
    const { FLOOR_Y, CEILING_Y, DISPLAY_WITDH } = this.game.ui;

    this.sctx.lineDashOffset = 0;
    this.sctx.setLineDash([15, 15]);
    this.sctx.strokeStyle = this.COLORS[color];

    this.sctx.beginPath();

    this.sctx.moveTo(x, CEILING_Y);
    this.sctx.lineTo(x, FLOOR_Y);

    this.sctx.moveTo(0, y);
    this.sctx.lineTo(DISPLAY_WITDH, y);

    this.sctx.stroke();
    // sctx.save();
  };

  drawRectangle = (x, y, width, height, color) => {
    this.sctx.fillStyle = this.COLORS[color];
    this.sctx.fillRect(x, y, width, height);
  };

  drawText = ({ text, x, y, color, isBig = false, align = "left" }) => {
    this.sctx.font = isBig ? this.BIG_FONT : this.SMALL_FONT;
    this.sctx.setLineDash([]);

    if (align) {
      this.sctx.textAlign = align;
    }

    if (color) {
      this.sctx.fillStyle = this.COLORS[color];
    } else {
      this.sctx.fillStyle = this.COLORS.black;
    }

    this.sctx.fillText(text, x, y);
  };

  drawImage = (image, x, y) => {
    this.sctx.drawImage(image, x, y);
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
    const { ui, drawer, currentStage, STAGES, framesAmount, TICK_SHIFT_X } =
      this.game;
    const { DISPLAY_WITDH } = ui;

    for (let tax of this.taxes) {
      const taxWidth = DISPLAY_WITDH - tax.x;
      const taxHeight =
        this.getYByScorePerSecond(0) - this.getYByScorePerSecond(tax.taxRate);
      drawer.drawRectangle(tax.x, tax.y, taxWidth, taxHeight, "taxRect");

      if (tax.x < 900) {
        drawer.drawText({
          text: `${tax.taxRate} ¢`,
          x: 940,
          y: tax.y + tax.taxRate,
          color: "taxRate",
        });
      }
    }

    if (currentStage !== STAGES.play) return;

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

  draw = () => {
    const { drawer, ui, currentStage, STAGES, TICK_SHIFT_X } = this.game;
    const { FLOOR_Y, CEILING_Y } = ui;

    if (currentStage !== STAGES.play) {
      drawer.drawCircle(this.X, this.y, this.RADIUS, "ballColor");
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
    drawer.drawDashedCrosshair(this.X, this.y, "lineGray");

    drawer.drawCircle(this.X, this.y, this.RADIUS, "ballColor");

    if (this.coordsHistory.length > 1) {
      drawer.drawCurvedLine(this.coordsHistory, 2);
    }

    let scorePerSecond = this.getScorePerSecondByY(this.y);
    this.game.scorePerSecond = scorePerSecond;
    drawer.drawText({
      text: scorePerSecond,
      x: this.X + 45,
      y: this.y - 10,
      isBig: true,
      align: "left",
    });

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

  drawBorders = () => {
    const { drawer, displayPositionX } = this.game;

    drawer.drawHorizontalDashedLine(
      this.FLOOR_Y,
      -displayPositionX,
      "lineGray",
      1
    );
    drawer.drawHorizontalDashedLine(
      this.CEILING_Y,
      -displayPositionX,
      "lineGray",
      1
    );
  };

  draw = () => {
    const { currentStage, STAGES } = this.game;

    switch (currentStage) {
      case STAGES.getReady:
        this.drawGetReady();
        break;
      case STAGES.gameOver:
        this.drawGameOver();
        break;
      default:
        this.drawScore();
    }
  };

  drawGetReady = () => {
    const { drawer, scrn } = this.game;

    const x = parseFloat(scrn.width - this.getReadyImage.width) / 2;
    const y = parseFloat(scrn.height - this.getReadyImage.height) / 2;
    const width = parseFloat(scrn.width - this.tapImages[0].width) / 2;
    const height = y + this.getReadyImage.height - this.tapImages[0].height;

    drawer.drawImage(this.getReadyImage, x, y);
    drawer.drawImage(this.tapImages[this.frameIndex], width, height);
  };

  drawGameOver = () => {
    const { drawer } = this.game;

    const x = parseFloat(scrn.width - this.gameOverImage.width) / 2;
    const y = parseFloat(scrn.height - this.gameOverImage.height) / 2;
    // this.tx = parseFloat(scrn.width - this.tapImages[0].width) / 2;
    // this.ty = this.y + this.gameOverImage.height - this.tapImages[0].height;
    // sctx.fillStyle = "white";
    // sctx.fillRect(this.x - 150, this.y - 80, 400, 200);
    drawer.drawImage(this.gameOverImage, x, y);
  };

  drawProducedScore = () => {
    const { drawer, scrn, scoreProduced } = this.game;

    drawer.drawText({
      text: `${scoreProduced}¢`,
      x: scrn.width - 150,
      y: 40,
      isBig: false,
      align: "right",
    });
    drawer.drawText({
      text: "produced",
      x: scrn.width - 140,
      y: 40,
      color: "textGray",
      align: "left",
    });
  };

  drawTaxed = () => {
    const { drawer, scrn, scoreTaxed } = this.game;

    drawer.drawText({
      text: `${scoreTaxed}¢`,
      x: scrn.width - 150,
      y: 70,
      isBig: false,
      align: "right",
    });
    drawer.drawText({
      text: "taxed",
      x: scrn.width - 140,
      y: 70,
      color: "textGray",
      align: "left",
    });
  };

  drawProfitScore = () => {
    const { drawer, scoreProduced, scoreTaxed } = this.game;

    drawer.drawText({
      text: `${scoreProduced + scoreTaxed}¢`,
      x: 500,
      y: 40,
      isBig: false,
      align: "right",
    });
    drawer.drawText({
      text: "profit",
      x: 510,
      y: 40,
      color: "textGray",
      align: "left",
    });
  };

  drawProfitPerSecond = () => {
    const { drawer, scorePerSecond, taxPerSecond } = this.game;

    drawer.drawText({
      text: `${scorePerSecond - taxPerSecond}¢`,
      x: 500,
      y: 70,
      isBig: false,
      align: "right",
    });
    drawer.drawText({
      text: "profit/s",
      x: 510,
      y: 70,
      color: "textGray",
      align: "left",
    });
  };

  drawTimer = () => {
    const { drawer, leftTimerValue } = this.game;

    if (!leftTimerValue) this.game.setLeftTimerValue();

    drawer.drawText({
      text: `${leftTimerValue?.toLocaleTimeString("en-GB")} /`,
      x: 200,
      y: 70,
      align: "right",
    });

    const rightTimer = new Date(2000, 0, 0, 1, 0, 0).toLocaleTimeString(
      "en-GB"
    );

    drawer.drawText({
      text: rightTimer,
      x: 208,
      y: 70,
      align: "left",
    });
  };

  drawScore = () => {
    this.drawProducedScore();
    this.drawProfitScore();
    this.drawTaxed();
    this.drawProfitPerSecond();
    this.drawTimer();
  };

  update = () => {
    const {
      currentStage,
      STAGES,
      interval,
      scoreProduced,
      scoreTaxed,
      startGameTime,
      results,
      duration,
      framesAmount,
    } = this.game;

    if (currentStage === STAGES.gameOver) {
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
      this.game.currentStage = STAGES.gameOver;
    }

    if (currentStage === STAGES.play) return;
    this.frameIndex += framesAmount % 10 === 0 ? 1 : 0;
    this.frameIndex = this.frameIndex % this.tapImages.length;
  };
}

class Game {
  drawer;
  taxing;
  ball;
  ui;

  scrn;

  STAGES = {
    getReady: 0,
    play: 1,
    gameOver: 2,
  };

  duration = 0;
  interval = 0;
  framesAmount = 0;
  displayPositionX = 0;

  currentStage;
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

  constructor(scrn, duration) {
    this.scrn = scrn;
    this.scrn.tabIndex = 1;

    this.duration = duration;

    this.drawer = new Drawer(this);
    this.taxing = new Taxing(this);
    this.ui = new UI(this);
    this.ball = new Ball(this);

    this.currentStage = this.STAGES.getReady;

    this.scrn.addEventListener("click", () => {
      switch (this.currentStage) {
        case this.STAGES.getReady:
          this.currentStage = this.STAGES.play;
          break;
        case this.STAGES.play:
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
    this.drawer.clearScreen();
    this.taxing.draw();
    this.ui.drawBorders();

    this.ball.draw();
    this.ui.draw();
  };

  update = () => {
    this.ui.update();
    if (this.currentStage === this.STAGES.play) {
      this.displayPositionX -= this.TICK_SHIFT_X;
    }
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

const game = new Game(scrn, GAME_DURATION_MS);

game.run();
