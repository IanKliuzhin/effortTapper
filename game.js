const searchParams = new URLSearchParams(window.location.search);
const taxes = JSON.parse(searchParams.get("taxes"));

const scrn = document.getElementById("canvas");
const finalScrn = document.getElementById("final");

const GAME_DURATION_S = 60;
const TIMER_START_DELAY_S = 6;

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

  FONTS = {
    courier_28_bold: "700 28px courier",
    tahoma_17: "400 17px Tahoma",
    tahoma_28_bold: "700 28px Tahoma"
  }

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

  drawVerticalLine = (x, y1, y2, lineWidth, color) => {
    this.sctx.strokeStyle = this.COLORS[color];
    this.sctx.setLineDash([]);
    this.sctx.lineWidth = lineWidth;

    this.sctx.beginPath();
    this.sctx.moveTo(x, y1);
    this.sctx.lineTo(x, y2);
    this.sctx.stroke();
  };

  drawCircle = (x, y, radius, color) => {
    this.sctx.fillStyle = this.COLORS[color];
    this.sctx.beginPath();
    this.sctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.sctx.fill();
  };

  drawHorizontalDashedLine = (y, dashOffset, color, lineWidth) => {
    const { DISPLAY_WIDTH } = this.game.ui;

    this.sctx.lineDashOffset = dashOffset;
    this.sctx.lineWidth = lineWidth;
    this.sctx.strokeStyle = this.COLORS[color];

    this.sctx.beginPath();
    this.sctx.setLineDash([this.DASH_LENGTH, this.DASH_LENGTH]);
    this.sctx.moveTo(0, y);
    this.sctx.lineTo(DISPLAY_WIDTH, y);
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
    const { FLOOR_Y, CEILING_Y, DISPLAY_WIDTH } = this.game.ui;

    this.sctx.lineDashOffset = 0;
    this.sctx.setLineDash([15, 15]);
    this.sctx.strokeStyle = this.COLORS[color];

    this.sctx.beginPath();

    this.sctx.moveTo(x, CEILING_Y);
    this.sctx.lineTo(x, FLOOR_Y);

    this.sctx.moveTo(0, y);
    this.sctx.lineTo(DISPLAY_WIDTH, y);

    this.sctx.stroke();
    // sctx.save();
  };

  drawRectangle = (x, y, width, height, color) => {
    this.sctx.fillStyle = this.COLORS[color];
    this.sctx.fillRect(x, y, width, height);
  };

  drawText = ({ text, x, y, color, font = "tahoma_17", align = "left" }) => {
    this.sctx.font = this.FONTS[font];
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
  currentRate;

  constructor(game, taxes) {
    this.game = game;
    this.taxes = taxes.map(([startSecond, endSecond, rate]) => {
      const framesTillIn =
        game.ball.X / game.FRAME_SHIFT_X +
        ((game.timerStartDelay + startSecond) * 1000) / game.FRAME_DURATION_MS -
        game.ui.DISPLAY_WIDTH / game.FRAME_SHIFT_X;
      const framesTillOut =
        game.ball.X / game.FRAME_SHIFT_X +
        ((game.timerStartDelay + endSecond) * 1000) / game.FRAME_DURATION_MS;
      return { rate, framesTillIn, framesTillOut };
    });
  }

  getYByScorePerSecond = (score) => {
    const { FLOOR_Y } = this.game.ui;
    const { MAX_AMPLITUDE_Y } = this.game.ball;

    return Math.abs(Math.floor((MAX_AMPLITUDE_Y * score) / 100 - FLOOR_Y));
  };

  draw = () => {
    const {
      ui,
      ball,
      drawer,
      currentStage,
      STAGES,
      framesPassed,
      FRAME_SHIFT_X,
    } = this.game;
    const { DISPLAY_WIDTH, FLOOR_Y } = ui;
    const { X: ballX } = ball;

    if (currentStage === STAGES.play) {
      this.currentRate = 0;
      for (let { rate, framesTillIn, framesTillOut } of this.taxes) {
        if (framesPassed > framesTillIn && framesPassed < framesTillOut) {
          const startX =
            (framesTillIn - framesPassed) * FRAME_SHIFT_X + DISPLAY_WIDTH;
          let endX = (framesTillOut - framesPassed) * FRAME_SHIFT_X;
          if (endX > DISPLAY_WIDTH) endX = DISPLAY_WIDTH;

          if (startX <= ballX && endX >= ballX) {
            this.currentRate = rate;
          }

          const y = this.getYByScorePerSecond(rate);
          const width = endX - startX;
          const height = FLOOR_Y - y;

          drawer.drawRectangle(startX, y, width, height, "taxRect");

          if (startX < 900) {
            drawer.drawText({
              text: `${rate} ¢`,
              x: endX - 50,
              y: y + 30,
              color: "taxRate",
            });
          }
        }
      }
    }
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
  coordYHistory = [];
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

  calculate = () => {
    const { FLOOR_Y, CEILING_Y } = this.game.ui;

    const bottomY = this.y + this.RADIUS;
    const topY = this.y - this.RADIUS;

    this.gravity =
      this.MIN_GRAVITY * (1 + (1.23 * this.getScorePerSecondByY(this.y)) / 100);
    this.fallingSpeed += this.gravity;

    const isNextYLowerThenFloor = bottomY + this.fallingSpeed > FLOOR_Y;
    const isNextYHigherThenCeiling = topY + this.fallingSpeed < CEILING_Y;
    if (isNextYLowerThenFloor) {
      this.y = FLOOR_Y - this.RADIUS;
    } else if (isNextYHigherThenCeiling) {
      this.y = CEILING_Y + this.RADIUS;
    } else {
      this.y += this.fallingSpeed;
    }
    this.coordYHistory.push(this.y);

    let scorePerSecond = this.getScorePerSecondByY(this.y);
    this.game.scorePerSecond = scorePerSecond;
  };

  drawBall = () => {
    this.game.drawer.drawCircle(this.X, this.y, this.RADIUS, "ballColor");
  };

  drawCrosshair = () => {
    this.game.drawer.drawDashedCrosshair(this.X, this.y, "lineGray");
  };

  drawWay = () => {
    const { FRAME_SHIFT_X } = this.game;

    const lastCoords = this.coordYHistory.slice(-200).map((y, index, arr) => ({
      x: this.X - FRAME_SHIFT_X * (arr.length - index),
      y,
    }));
    this.game.drawer.drawCurvedLine(lastCoords, 2);
  };

  drawScorePerSecond = () => {
    this.game.drawer.drawText({
      text: this.game.scorePerSecond,
      x: this.X + 45,
      y: this.y - 10,
      font: "courier_28_bold",
      align: "left",
    });
  };

  draw = () => {
    const { currentStage, STAGES } = this.game;

    if (currentStage !== STAGES.play) {
      this.drawBall();
      return;
    }

    this.calculate();

    this.drawCrosshair();

    this.drawBall();

    if (this.coordYHistory.length > 1) {
      this.drawWay();
    }

    this.drawScorePerSecond();
  };

  flap = () => {
    let thrust = 5.31 - Math.log1p(this.game.scorePerSecond / 1.5 || 1);
    this.fallingSpeed = -thrust;
  };
}

class UI {
  game;
  getReadyImage = new Image();
  gameOverImage = new Image();
  tapImages = [new Image(), new Image()];
  tapImageIndex = 0;
  CEILING_Y = 100;
  FLOOR_Y = 600;
  DISPLAY_WIDTH = 1000;
  timerDuration = "";

  constructor(game) {
    this.game = game;

    this.getReadyImage.src = "img/getReady.png";
    this.gameOverImage.src = "img/gameOver.png";
    this.tapImages[0].src = "img/tap1.png";
    this.tapImages[1].src = "img/tap2.png";

    const durationMinutes = Math.floor(game.durationInSeconds / 60);
    const durationSeconds = game.durationInSeconds % 60;
    this.timerDuration = `${String(durationMinutes).padStart(2, "00")}:${String(
      durationSeconds
    ).padStart(2, "00")}`;
  }

  drawBorders = () => {
    const { drawer, framesPassed, FRAME_SHIFT_X } = this.game;

    drawer.drawHorizontalDashedLine(
      this.FLOOR_Y,
      framesPassed * FRAME_SHIFT_X,
      "lineGray",
      1
    );
    drawer.drawHorizontalDashedLine(
      this.CEILING_Y,
      framesPassed * FRAME_SHIFT_X,
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
      case STAGES.play:
      default:
        this.drawScore();
        this.drawTimer();
    }
  };

  drawGetReady = () => {
    const { drawer, scrn } = this.game;

    const x = parseFloat(scrn.width - this.getReadyImage.width) / 2;
    const y = parseFloat(scrn.height - this.getReadyImage.height) / 2;
    const width = parseFloat(scrn.width - this.tapImages[0].width) / 2;
    const height = y + this.getReadyImage.height - this.tapImages[0].height;

    drawer.drawImage(this.getReadyImage, x, y);
    drawer.drawImage(this.tapImages[this.tapImageIndex], width, height);
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
    const {
      drawer,
      scorePerSecond,
      taxing: { currentRate },
    } = this.game;

    drawer.drawText({
      text: `${scorePerSecond - currentRate}¢`,
      x: 500,
      y: 70,
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

  drawScore = () => {
    this.drawProducedScore();
    this.drawProfitScore();
    this.drawTaxed();
    this.drawProfitPerSecond();
  };

  drawTimer = () => {
    const { drawer, timerSecondsPassed } = this.game;

    const passedMinutes = Math.floor(timerSecondsPassed / 60);
    const passedSeconds = timerSecondsPassed % 60;

    drawer.drawText({
      text: `${String(passedMinutes).padStart(2, "00")}:${String(
        passedSeconds
      ).padStart(2, "00")} / ${this.timerDuration}`,
      x: 200,
      y: 70,
      font: "tahoma_28_bold",
      align: "right",
    });
  };

  updateTapImage = () => {
    const { framesPassed } = this.game;

    this.tapImageIndex += framesPassed % 10 === 0 ? 1 : 0;
    this.tapImageIndex = this.tapImageIndex % this.tapImages.length;
  };

  drawFinish = (framesLeft) => {
    const {
      scrn,
      ball: { X: ballX },
      FRAME_SHIFT_X,
    } = this.game;

    const lineX = ballX + framesLeft * FRAME_SHIFT_X + FRAME_SHIFT_X / 2;

    this.game.drawer.drawVerticalLine(
      lineX,
      this.CEILING_Y + 10,
      scrn.height,
      3.5,
      "black"
    );
    this.game.drawer.drawText({
      text: "Finish",
      x: lineX - 45,
      y: this.CEILING_Y,
      font: "tahoma_28_bold",
      color: "black",
    });
  };
}

class Game {
  drawer;
  taxing;
  ball;
  ui;

  scrn;
  finalScrn;

  STAGES = {
    getReady: 0,
    play: 1,
    gameOver: 2,
  };

  durationInSeconds;
  timerStartDelay;

  durationInFrames;

  drawInterval;

  framesPassed = 0;
  secondsPassed = 0;
  timerSecondsPassed = 0;

  currentStage;
  scorePerSecond = 0;
  scoreProduced = 0;
  scoreTaxed = 0;

  FRAME_DURATION_MS = 20;
  FRAME_SHIFT_X = 2;

  hasTimerFinished = false;

  results = {
    scoresBySeconds: [],
    flapsBySeconds: [],
    flapsByScorePerSecond: [],
    flapsByTaxPerSecond: [],
    taxesBySeconds: [],
    produced: 0,
    taxed: 0,
    profit: 0,
  };

  constructor(scrn, finalScrn, durationInSeconds, timerStartDelay, taxes) {
    this.scrn = scrn;
    this.finalScrn = finalScrn;
    this.scrn.tabIndex = 1;

    this.durationInSeconds = durationInSeconds;
    this.durationInFrames = (timerStartDelay + durationInSeconds) * 1000 / this.FRAME_DURATION_MS;
    this.timerStartDelay = timerStartDelay;

    this.drawer = new Drawer(this);
    this.ui = new UI(this);
    this.ball = new Ball(this); // should be after ui
    this.taxing = new Taxing(this, taxes); // should be after ball & ui

    this.currentStage = this.STAGES.getReady;

    this.scrn.addEventListener("click", () => {
      switch (this.currentStage) {
        case this.STAGES.getReady:
          this.currentStage = this.STAGES.play;
          this.framesPassed = 0;
          break;
        case this.STAGES.play:
          this.ball.flap();
          this.results.flapsBySeconds.push(this.framesPassed);
          this.results.flapsByScorePerSecond.push(this.scorePerSecond);
          this.results.flapsByTaxPerSecond.push(this.taxing.currentRate);
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
    this.drawInterval = setInterval(this.draw, this.FRAME_DURATION_MS);
  };

  draw = () => {
    this.drawer.clearScreen();
    this.taxing.draw();
    this.ui.drawBorders();
    this.ball.draw();
    this.ui.draw();
    this.framesPassed++;

    if (this.currentStage === this.STAGES.getReady) this.ui.updateTapImage();

    if (this.currentStage === this.STAGES.play) {
      const framesLeft = this.durationInFrames - this.framesPassed;
      
      if (this.ball.X + framesLeft * this.FRAME_SHIFT_X <= this.ui.DISPLAY_WIDTH) {
        this.ui.drawFinish(framesLeft);
      }
      
      if (this.timerSecondsPassed >= this.durationInSeconds) this.endGame();

      if (
        this.framesPassed % (1000 / this.FRAME_DURATION_MS) === 0
      ) {
        this.update();
      }
    }
  };

  update = () => {
    this.secondsPassed++;
    if (this.secondsPassed >= this.timerStartDelay + 1) {
      this.timerSecondsPassed++;
      this.decreaseScoreTaxed();
      this.increaseScoreProduced();

      this.saveResults();
    }
  };

  increaseScoreProduced = () => {
    this.scoreProduced += this.scorePerSecond;
  };

  decreaseScoreTaxed = () => {
    this.scoreTaxed -= this.taxing.currentRate;
  };

  saveResults = () => {
    this.results.scoresBySeconds.push(this.scorePerSecond);
    this.results.taxesBySeconds.push(-this.taxing.currentRate);
  };

  sendResults = () => {
    const { results } = this;

    results.produced = this.scoreProduced;
    results.taxed = this.scoreTaxed;
    results.profit = this.scoreProduced + this.scoreTaxed;

    results.flapsBySeconds = results.flapsBySeconds
      .map((flapFrame) =>
        (
          (flapFrame * this.FRAME_DURATION_MS) / 1000 -
          this.timerStartDelay
        ).toFixed(2)
      )
      .join(", ");
    results.scoresBySeconds = results.scoresBySeconds.join(", ");
    results.taxesBySeconds = results.taxesBySeconds.join(", ");
    results.flapsByScorePerSecond = results.flapsByScorePerSecond.join(", ");
    results.flapsByTaxPerSecond = results.flapsByTaxPerSecond.join(", ");

    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("id");
    if (id) {
      dbFunctions.set(dbFunctions.ref(db, id), {
        ...results,
      });
    }
  };

  endGame = () => {
    this.currentStage = this.STAGES.gameOver;

    clearInterval(this.drawInterval);

    setTimeout(() => {
      this.finalScrn.style.display = "block";
      this.scrn.classList.add("notVisible");
      this.scrn.classList.remove("visible");
      this.finalScrn.classList.add("visible");
      this.finalScrn.classList.remove("notVisible");
    }, 1500);

    this.sendResults();
  };
}

const game = new Game(
  scrn,
  finalScrn,
  GAME_DURATION_S,
  TIMER_START_DELAY_S,
  taxes
);

game.run();
