/*

npm install ascii-table blessed eventsource printf

node blaseball.js

TODO:
- [ ] Show team win/loss record
- [ ] Show weather
- [ ] Show game series info (1 of 3, etc)
- [ ] Better winning score indicator
- [ ] Team emoji/avatar display?
- [ ] Better use of space/alignment

*/



const AsciiTable = require("ascii-table");
const printf = require("printf");
const blessed = require("blessed");


// Create a screen object.
const screen = blessed.screen({
  smartCSR: true,
  tput: true,
  cursor: {
    artificial: true,
    shape: "line",
    blink: true,
    color: null,
  },
  style: {
    bg: "blue",
  },
});


screen.key(["q", "C-c"], function (ch, key) {
  return process.exit(0);
});

let titlebox = blessed.box({
  top: 1,
  left: 0,
  height: 4,
  width: "100%",
  tags: true,
});
titlebox.setContent(`{center}.----. .-.     .--.   .----..----..----.   .--.  .-.   .-.   
| {}  }| |    / {} \\ { {__  | {_  | {}  } / {} \\ | |   | |   
| {}  }| \`--./  /\\  \\.-._} }| {__ | {}  }/  /\\  \\| \`--.| \`--.
\`----' \`----'\`-'  \`-'\`----' \`----'\`----' \`-'  \`-'\`----'\`----'{/}`);
screen.append(titlebox);

// Render the screen.
screen.render();


let gameBoxes;

const EventSource = require("eventsource");
const es = new EventSource("https://www.blaseball.com/events/streamData");

// listen for "message"s from the stream
es.addEventListener("message", function (e) {

  let obj = JSON.parse(e.data);

  let row = 0;
  let col = 0;

  if (gameBoxes && gameBoxes.length) {
    gameBoxes.forEach(box => {
      screen.remove(box);
    });
  }

  gameBoxes = [];

  if (!obj.value || !obj.value.games || !obj.value.games.schedule) {
    // something went goofy w/ the data... just bail for now
    return;
  }


  obj.value.games.schedule.forEach(game => {

    let inningInfo = "{red-fg}Final{/}";
    if (!game.gameComplete) {
      if (game.topOfInning) {
        inningInfo = "{green-fg}Top ";
      } else {
        inningInfo = "{green-fg}Bottom ";
      }
      inningInfo += (game.inning + 1) + "{/}";
    }


    let table = AsciiTable.factory();
    table.setBorder(" ");
    table.addRow(printf("%-30s", inningInfo));
    table.addRow("", "");
    table.addRow(printf("%-40s", "{bold}{" + game.awayTeamColor + "-fg}" + game.awayTeamNickname + "{/}"), game.awayScore);
    table.addRow(printf("{#333333-fg}%2.f%%{/}", game.awayOdds * 100), "");
    table.addRow("{bold}{" + game.homeTeamColor + "-fg}" + game.homeTeamNickname + "{/}", game.homeScore);
    table.addRow(printf("{#333333-fg}%2.f%%{/}", game.homeOdds * 100), "");

    let bsoTable = AsciiTable.factory();
    bsoTable.setBorder(" ");
    bsoTable.addRow("Balls", printf("%5s", bsoString(game.atBatBalls, 3)));
    bsoTable.addRow("Strikes", printf("%5s", bsoString(game.atBatStrikes, 2)));
    bsoTable.addRow("Outs", printf("%5s", bsoString(game.halfInningOuts, 2)));

    // create some blessed boxes

    let gameBox = blessed.box({
      border: "line",
      width: "33%",
      height: "24%",
      top: (row * 23 + 7) + "%",
      left: (col * 33) + "%",
      tags: true,
    });

    let scorebox = blessed.box({
      top: 0,
      left: 0,
      width: "50%",
      height: "90%",
      tags: true,
    });
    scorebox.setContent(table.toString());

    let basesbox = blessed.box({
      top: 0,
      left: "50%",
      height: "50%",
      width: "22%",
      tags: true,
    });
    basesbox.setContent(basesString(game.basesOccupied));

    let bsobox = blessed.box({
      top: 0,
      left: "72%",
      height: "50%",
      width: "22%",
      tags: true,
    });
    bsobox.setContent(bsoTable.toString());

    let pbbox = blessed.box({
      top: "50%",
      left: "50%",
      height: "40%",
      width: "45%",
      tags: true,
    });

    pbbox.setContent(printf("%-13s %s", "Pitching:", game.topOfInning ? "{" + game.homeTeamColor + "-fg}" + game.homePitcherName + "{/}" : "{" + game.awayTeamColor + "-fg}" + game.awayPitcherName + "{/}") + "\n" + printf("%-13s %s", "Batting:", game.topOfInning ? "{" + game.awayTeamColor + "-fg}" + game.awayBatterName + "{/}" : "{" + game.homeTeamColor + "-fg}" + game.homeBatterName + "{/}"));

    let logbox = blessed.box({
      top: "80%",
      left: 0,
      width: "95%",
      height: 2,
      tags: true,
    });
    logbox.setContent("{center}" + game.lastUpdate + "{/center}");


    gameBox.append(scorebox);
    if (!game.gameComplete) {
      gameBox.append(basesbox);
      gameBox.append(bsobox);
      gameBox.append(pbbox);
    }
    gameBox.append(logbox);

    gameBoxes.push(gameBox);

    col++;
    if (col === 3) {
      col = 0;
      row++;
      if (row === 3) {
        col = 1; // center 10th game box
      }
    }

  });

  gameBoxes.forEach(box => {
    screen.append(box);
  });

  screen.render();

});

// utility funcs

const bsoString = (filled, total) => {
  let ret = "";
  for (let i = 0; i < filled; i++) {
    ret += "*";
  }
  while (ret.length < total) {
    ret += "o";
  }
  return ret;
};


const basesString = basesArr => {
  let ret = "\n" + "       " + (basesArr.indexOf(1) !== -1 ? "*" : "o") + "\n";
  ret += "     " + (basesArr.indexOf(2) !== -1 ? "*" : "o") + "   " + (basesArr.indexOf(0) !== -1 ? "*" : "o");
  return ret;
};
