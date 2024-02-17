const searchParams = new URLSearchParams(window.location.search);
const taxRate = Number(searchParams.get('tax'));

const scrn = document.getElementById("canvas");
const sctx = scrn.getContext("2d");
scrn.tabIndex = 1;

const frmaeHeight = 700;
const sceneWidth = 1000;
const ceilingHeight = 100;
const floorHeight = 600;

const BALL_RADIUS = 35;
const BALL_X = 350;
const START_BALL_Y = 560;
const MIN_GRAVITY = 0.125;

const maxSceneHeght = ceilingHeight + BALL_RADIUS; // 135
const minSceneHeight = floorHeight - BALL_RADIUS; // 565
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

let sceneX = 0;
let coordsHistory = [];

class Drawer {
  colors = {
    textGray: "#A2A2A2",
    ballColor: "#DCDCDC",
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
  
  drawCircle = (x, y, radius) => {
    sctx.fillStyle = this.colors.ballColor;
    sctx.beginPath();
    sctx.arc(x, y, radius, 0, 2 * Math.PI);
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

const getScorePerSecondByY = (y) => {
  const result = Math.abs(
    Math.floor((100 * (y - minSceneHeight)) / minSceneMaxHeight)
  );
  return result;
};

const getYByScorePerSecond = (score) => {
  const minSceneMaxHeight = floorHeight - ceilingHeight;
  return Math.abs(Math.floor((minSceneMaxHeight * score) / 100 - floorHeight));
};

const drawHeightOfBall = (x, y) => {
  drawer.setTextStyles(true);

  let scorePerSecond = getScorePerSecondByY(y);
  sctx.textAlign = "left";
  sctx.fillText(scorePerSecond, x + 45, y - 10);

  game.scorePerSecond = scorePerSecond;
};

scrn.addEventListener("click", () => {
  switch (game.currentGameStep) {
    case game.indexGameStep:
      game.currentGameStep = game.playGameStep;
      break;
    case game.playGameStep:
      ball.flap();
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

    if (game.currentGameStep != game.playGameStep) return;

    if (game.framesAmount > 200 == 0 && this.taxes.length === 0) {
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

class Ball {
  X = BALL_X;
  y = START_BALL_Y;
  fallingSpeed = 0;
  gravity = MIN_GRAVITY;

  draw = () => {
    if (game.currentGameStep !== game.playGameStep) {
      drawer.drawCircle(this.X, this.y, BALL_RADIUS);
      return;
    }

    const bottomY = this.y + BALL_RADIUS;
    const isIntersectedWithFloor = bottomY > floorHeight;
    const topY = this.y - BALL_RADIUS;

    this.gravity = MIN_GRAVITY * (1 + getScorePerSecondByY(this.y) / 100)
    this.fallingSpeed += this.gravity;

    if (!isIntersectedWithFloor) {
      const isNextYLowerThenFloor = bottomY + this.fallingSpeed > floorHeight;
      const isNextYHigherThenCeiling = topY + this.fallingSpeed < ceilingHeight;
      if (isNextYLowerThenFloor) {
        this.y = floorHeight - BALL_RADIUS;
      } else if (isNextYHigherThenCeiling) {
        this.y = ceilingHeight + BALL_RADIUS;
      } else {
        this.y += this.fallingSpeed;
      }
    }

    const start =
      coordsHistory.length - 199 > 0 ? coordsHistory.length - 199 : 0;
    const last200Coords = coordsHistory.slice(start);
    coordsHistory = last200Coords.map((coords) => {
      return { x: coords.x - dx, y: coords.y, date: coords.date };
    });
    coordsHistory.push({ x: this.X, y: this.y, date: Date.now() });
    drawer.drawDashedCrosshair();

    drawer.drawCircle(this.X, this.y, BALL_RADIUS);
    drawer.drawLine(coordsHistory);

    drawHeightOfBall(this.X, this.y);
    this.checkIsTaxIntersection()
  };

  flap = () => {
    if (this.y < 0) return;
    let thrust = 5.31 - Math.log1p(game.scorePerSecond / 1.5 || 1);
    this.fallingSpeed = -thrust;
    if (game.startGameTime) game.tapsCounts += 1
    game.results.flaps.push(Date.now());
  };

  checkIsTaxIntersection = () => {
    const isTaxIntersection = this.X > taxing.taxes[0]?.x;
    if (!isTaxIntersection) return
    game.decreaseScoreTaxed()
    game.increaseScoreProduced();
    game.setLeftTimerValue()
    game.setTaxPerSecond(taxing.taxes[0].taxRate)
    if (!game.startGameTime) game.startGameTime = Date.now();
    game.saveResults();
  };
}

const ball = new Ball();

class UI {
  getReadyImage = new Image();
  gameOverImage = new Image();
  tapImages = [new Image(), new Image()];
  frame = 0;

  constructor() {
    this.getReadyImage.src = "img/getReady.png";
    this.gameOverImage.src = "img/gameOver.png";
    this.tapImages[0].src = "img/tap1.png";
    this.tapImages[1].src = "img/tap2.png";
  }
  
  clearScreen = () => {
    sctx.fillRect(0, 0, scrn.width, scrn.height);
  }

  drawBorders = () => {
    drawer.drawDashedLine(floorHeight, sceneX);
    drawer.drawDashedLine(ceilingHeight, sceneX);
  }

  draw = () => {
    switch (game.currentGameStep) {
      case game.indexGameStep:
          this.drawGetReady()
        break;
      case game.finalScreenGameStep:
          this.drawGameOver()
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
    sctx.drawImage(this.tapImages[this.frame], width, height); 
  }

  drawGameOver = () => {
    const x = parseFloat(scrn.width - this.gameOverImage.width) / 2;
    const y = parseFloat(scrn.height - this.gameOverImage.height) / 2;
    // this.tx = parseFloat(scrn.width - this.tapImages[0].width) / 2;
    // this.ty = this.y + this.gameOverImage.height - this.tapImages[0].height;
    sctx.fillStyle = "white";
    // sctx.fillRect(this.x - 150, this.y - 80, 400, 200);
    sctx.drawImage(this.gameOverImage, x, y);
  }

  drawProducedScore = () => {
    drawer.setTextStyles(false);
    sctx.textAlign = "right";
    sctx.fillText(game.scoreProduced + "¢", scrn.width - 150, 40);
    sctx.textAlign = "left";
    sctx.fillStyle = drawer.colors.textGray;
    sctx.fillText("produced", scrn.width - 140, 40);
  };

  drawTaxed = () => {
    drawer.setTextStyles(false);
    sctx.textAlign = "right";
    sctx.fillText(game.scoreTaxed + "¢", scrn.width - 150, 70);
    sctx.fillStyle = drawer.colors.textGray;
    sctx.textAlign = "left";
    sctx.fillText("taxed", scrn.width - 140, 70);
  };
  
  drawProfitScore = () => {
    drawer.setTextStyles(false);
    sctx.textAlign = "right";
    sctx.fillText(game.scoreProduced + game.scoreTaxed + "¢", 500, 40);
    sctx.textAlign = "left";
    sctx.fillStyle = drawer.colors.textGray;
    sctx.fillText("profit", 510, 40);
  };

  drawProfitPerSecond = () => {
    drawer.setTextStyles(false);
    sctx.textAlign = "right";
    sctx.fillText(game.scorePerSecond - game.taxPerSecond + "¢", 500, 70);
    sctx.textAlign = "left";
    sctx.fillStyle = drawer.colors.textGray;
    sctx.fillText("profit /s", 510, 70);
  };

  drawTimer = () => {
    if (!game.leftTimerValue) game.setLeftTimerValue()
    drawer.setTextStyles(false);
    sctx.textAlign = "right";
    sctx.fillText(game.leftTimerValue?.toLocaleTimeString("en-GB") + " /", 200, 70);
    sctx.textAlign = "left";
    const rightTimer = new Date(2000, 0, 0, 1, 0, 0).toLocaleTimeString("en-GB")
    sctx.fillText(rightTimer, 208, 70);
  };

  drawScore = () => {
    drawer.setTextStyles();
    this.drawProducedScore();
    this.drawProfitScore();
    this.drawTaxed();
    this.drawProfitPerSecond();
    this.drawTimer();
  };

  update = () => {
    if (game.currentGameStep === game.finalScreenGameStep) {
      const { results } = game;
      clearInterval(game.interval);
      results.produced = game.scoreProduced
      results.taxed = game.scoreTaxed
      results.profit = game.scoreProduced + game.scoreTaxed
      results.flaps = results.flaps.map((flap) => {
        const isBeforeStart = flap < game.startGameTime
        const time = new Date(isBeforeStart ? game.startGameTime - flap : flap - game.startGameTime)
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

    if (game.startGameTime && game.startGameTime + game.duration < Date.now()) {
      game.currentGameStep = game.finalScreenGameStep
    }

    if (game.currentGameStep === game.playGameStep) return;
    this.frame += game.framesAmount % 10 === 0 ? 1 : 0;
    this.frame = this.frame % this.tapImages.length;
  };
};

const ui = new UI();

class Game {
  duration = 0;
  interval = 0;
  framesAmount = 0;

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
  
  results = {
    scoresBySeconds: [],
    flaps: [],
    taxesBySeconds: [],
    produced: 0,
    taxed: 0,
    profit: 0,
  }

  constructor(duration) {
    this.duration = duration;
  }

  run = () => {
    this.interval = setInterval(this.gameLoop, 20);
  }
  
  gameLoop = () => {
    this.draw();
    this.update();
    this.framesAmount++;
  }

  draw = () => {
    sctx.fillStyle = "white";
    ui.clearScreen();
    taxing.draw();
    ui.drawBorders();
  
    ball.draw();
    ui.draw();
  }

  update = () => {
    ui.update();
    if (this.currentGameStep !== this.playGameStep) return;
    sceneX -= dx;
  }

  increaseScoreProduced = throttle(
    () => (this.scoreProduced += this.scorePerSecond),
    1000
  );
  decreaseScoreTaxed = throttle(
    () => (this.scoreTaxed -= taxRate),
    1000
  );
  setTaxPerSecond = throttle(
    (score) => (this.taxPerSecond = score),
    1000
  );
  setLeftTimerValue = throttle(
    () => {
      const secondsFromStart = Math.floor(Date.now() - this.startGameTime) / (1000)
      this.leftTimerValue = this.startGameTime ? new Date(new Date(0, 0, 0, 0, secondsFromStart, 0)) : new Date(0, 0, 0, 0, 0, 0)
    },
    1000
  );
  
  saveResults = throttle(() => {
    this.results.scoresBySeconds.push(this.scorePerSecond);
    this.results.taxesBySeconds.push(-this.taxPerSecond);
  }, 1000)
}

const game = new Game(GAME_DURATION_MS);

game.run();
