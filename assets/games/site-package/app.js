const BOARD_SIZE = 6;
const dirs = ["N", "E", "S", "W"];
const dirDelta = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

const heroes = [
  {
    id: "tank",
    name: "Tank",
    image: "assets/tank.png",
    health: 20,
    speed: 2,
    strength: 4,
    weight: 10,
    crit: 10,
    bag: "melee",
    active: "Taunt: Once per encounter. Draw aggro within 2 squares.",
    passive: "Stone Skin: Major Passive. Take half damage, round up."
  },
  {
    id: "rogue",
    name: "Rogue",
    image: "assets/rogue.png",
    health: 12,
    speed: 6,
    strength: 6,
    weight: 6,
    crit: 10,
    bag: "melee",
    active: "Swap: Once per encounter. Switch places with an ally.",
    passive: "Backstab: Major Passive. Double damage with advantage."
  },
  {
    id: "mage",
    name: "Mage",
    image: "assets/mage.png",
    health: 10,
    speed: 4,
    strength: 6,
    weight: 8,
    crit: 10,
    bag: "ranged",
    active: "Meteor: Once per encounter. 2x2 area attack anywhere, +2 damage.",
    passive: "Arcane Empowerment: Major Passive. Place x2 modifier along traversed path."
  },
  {
    id: "archer",
    name: "Archer",
    image: "assets/archer.png",
    health: 14,
    speed: 6,
    strength: 2,
    weight: 8,
    crit: 10,
    bag: "ranged",
    active: "Grapple: Once per encounter. Pull a target within 3 squares toward you.",
    passive: "Trap: Major Passive. Snare a single target within 3 squares."
  },
  {
    id: "healer",
    name: "Healer",
    image: "assets/healer.png",
    health: 12,
    speed: 4,
    strength: 4,
    weight: 8,
    crit: 10,
    bag: "ranged",
    active: "Druid's Blessing: Once per encounter. Allies within 2 squares split 10 HP.",
    passive: "Flower Walk: Major Passive. Step over allies to heal them +1."
  }
];

const patterns = {
  melee: [
    ["Melee Pattern 1", [[".", ".", ".", ".", "."], [".", "#", "#", "#", "."], [".", ".", "P", ".", "."], [".", ".", ".", ".", "."], [".", ".", ".", ".", "."]]],
    ["Melee Pattern 2", [[".", ".", ".", ".", "."], [".", "#", ".", "#", "."], [".", ".", "P", ".", "."], [".", ".", ".", ".", "."], [".", ".", ".", ".", "."]]],
    ["Melee Pattern 3", [[".", ".", ".", ".", "."], [".", ".", "#", ".", "."], [".", ".", "P", ".", "."], [".", ".", "#", ".", "."], [".", ".", ".", ".", "."]]],
    ["Melee Pattern 4", [[".", ".", ".", ".", "."], [".", ".", "#", "#", "."], [".", ".", "P", "#", "."], [".", ".", ".", ".", "."], [".", ".", ".", ".", "."]]],
    ["Melee Pattern 5", [[".", ".", "#", ".", "."], [".", ".", "#", ".", "."], [".", "#", "#", "#", "."], [".", ".", "P", ".", "."], [".", ".", ".", ".", "."]]],
    ["Melee Pattern 6", [[".", ".", ".", ".", "."], [".", ".", "#", ".", "."], [".", "#", "P", "#", "."], [".", ".", "#", ".", "."], [".", ".", ".", ".", "."]]],
    ["Melee Pattern 7", [[".", ".", ".", ".", "."], [".", ".", "#", ".", "."], [".", "#", "P", "#", "."], [".", ".", ".", ".", "."], [".", ".", ".", ".", "."]]]
  ].map((entry, i) => toPattern(`melee_${i + 1}`, entry, "melee", "attack")),
  ranged: [
    ["Ranged Pattern 1", [[".", "#", ".", "#", "."], [".", "#", ".", "#", "."], [".", ".", "#", ".", "."], [".", ".", "P", ".", "."], [".", ".", ".", ".", "."]]],
    ["Ranged Pattern 2", [[".", ".", ".", ".", "."], [".", "#", "#", "#", "."], [".", ".", "#", ".", "."], [".", ".", "P", ".", "."], [".", ".", ".", ".", "."]]],
    ["Ranged Pattern 3", [[".", ".", "#", ".", "."], [".", "#", ".", "#", "."], [".", ".", ".", ".", "."], [".", ".", "P", ".", "."], [".", ".", ".", ".", "."]]],
    ["Ranged Pattern 4", [[".", ".", ".", ".", "."], ["#", "#", "#", "#", "#"], [".", ".", ".", ".", "."], [".", ".", "P", ".", "."], [".", ".", ".", ".", "."]]],
    ["Ranged Pattern 5", [["#", "#", "#", "#", "#"], [".", ".", ".", ".", "."], [".", ".", ".", ".", "."], [".", ".", "P", ".", "."], [".", ".", ".", ".", "."]]],
    ["Ranged Pattern 6", [[".", "#", ".", "#", "."], [".", ".", "#", ".", "."], [".", ".", ".", ".", "."], [".", ".", "P", ".", "."], [".", ".", ".", ".", "."]]],
    ["Ranged Pattern 7", [[".", "#", "#", "#", "."], [".", "#", "#", "#", "."], [".", ".", ".", ".", "."], [".", ".", "P", ".", "."], [".", ".", ".", ".", "."]]],
    ["Ranged Pattern 8", [[".", ".", "#", ".", "."], [".", ".", "#", ".", "."], [".", ".", "#", ".", "."], [".", ".", "P", ".", "."], [".", ".", ".", ".", "."]]]
  ].map((entry, i) => toPattern(`ranged_${i + 1}`, entry, "ranged", "attack")),
  move: [
    ["Forward Dash", [[".", ".", "#", ".", "."], [".", ".", "#", ".", "."], [".", ".", "P", ".", "."], [".", ".", ".", ".", "."], [".", ".", ".", ".", "."]]],
    ["Forward Fan", [[".", "#", "#", "#", "."], [".", ".", "#", ".", "."], [".", ".", "P", ".", "."], [".", ".", ".", ".", "."], [".", ".", ".", ".", "."]]],
    ["Sidestep", [[".", ".", ".", ".", "."], ["#", "#", ".", "#", "#"], [".", ".", "P", ".", "."], [".", ".", ".", ".", "."], [".", ".", ".", ".", "."]]],
    ["Diagonal Hop", [["#", ".", ".", ".", "#"], [".", "#", ".", "#", "."], [".", ".", "P", ".", "."], [".", ".", ".", ".", "."], [".", ".", ".", ".", "."]]],
    ["Backstep", [[".", ".", ".", ".", "."], [".", ".", ".", ".", "."], [".", ".", "P", ".", "."], [".", "#", "#", "#", "."], [".", ".", "#", ".", "."]]],
    ["Cross Step", [[".", ".", "#", ".", "."], [".", ".", "#", ".", "."], ["#", "#", "P", "#", "#"], [".", ".", "#", ".", "."], [".", ".", "#", ".", "."]]],
    ["Close Shift", [[".", ".", ".", ".", "."], [".", "#", "#", "#", "."], [".", "#", "P", "#", "."], [".", "#", "#", "#", "."], [".", ".", ".", ".", "."]]]
  ].map((entry, i) => toPattern(`move_${i + 1}`, entry, "move", "sprint"))
};

function toPattern(id, [name, grid], bag, type) {
  return { id, name, bag, type, playerDirection: "up", grid };
}

let state = {
  selectedIds: ["tank", "rogue", "mage", "healer"],
  started: false,
  pieces: [],
  enemy: null,
  turnDeck: [],
  turnIndex: 0,
  playedTurns: [],
  wheelOpen: false,
  finished: null,
  animating: false,
  phase: "setup",
  pendingAction: null,
  selectedPatternId: null,
  legalCells: [],
  turnActions: { actionsLeft: 2, rotated: false },
  log: []
};

const els = {
  setupPanel: document.querySelector("#setupPanel"),
  setupSlot: document.querySelector("#setupSlot"),
  roster: document.querySelector("#roster"),
  startButton: document.querySelector("#startButton"),
  newGameButton: document.querySelector("#newGameButton"),
  board: document.querySelector("#board"),
  turnDeck: document.querySelector("#turnDeck"),
  diceLabel: document.querySelector("#diceLabel"),
  diceResult: document.querySelector("#diceResult"),
  statusPill: document.querySelector("#statusPill"),
  heroCards: document.querySelector("#heroCards"),
  enemyCard: document.querySelector("#enemyCard"),
  log: document.querySelector("#log"),
  patternSelect: document.querySelector("#patternSelect"),
  patternHint: document.querySelector("#patternHint"),
  rotateLeftButton: document.querySelector("#rotateLeftButton"),
  rotateRightButton: document.querySelector("#rotateRightButton"),
  moveButton: document.querySelector("#moveButton"),
  sprintButton: document.querySelector("#sprintButton"),
  minorAttackButton: document.querySelector("#minorAttackButton"),
  majorAttackButton: document.querySelector("#majorAttackButton"),
  endTurnButton: document.querySelector("#endTurnButton"),
  fullscreenButton: document.querySelector("#fullscreenButton"),
  wheelToggle: document.querySelector("#wheelToggle"),
  actionWheel: document.querySelector("#actionWheel"),
  endOverlay: document.querySelector("#endOverlay"),
  endTitle: document.querySelector("#endTitle"),
  endMessage: document.querySelector("#endMessage"),
  endKicker: document.querySelector("#endKicker"),
  restartFromEndButton: document.querySelector("#restartFromEndButton")
};

function init() {
  renderRoster();
  wireEvents();
  resetEncounter(false);
  render();
}

function wireEvents() {
  els.startButton.addEventListener("click", () => resetEncounter(true));
  els.newGameButton.addEventListener("click", () => resetEncounter(false));
  els.rotateLeftButton.addEventListener("click", () => rotateActor(-1));
  els.rotateRightButton.addEventListener("click", () => rotateActor(1));
  els.moveButton.addEventListener("click", rollMove);
  els.sprintButton.addEventListener("click", () => beginPattern("sprint"));
  els.minorAttackButton.addEventListener("click", () => beginPattern("minor"));
  els.majorAttackButton.addEventListener("click", () => beginPattern("major"));
  els.endTurnButton.addEventListener("click", () => endTurn());
  els.fullscreenButton.addEventListener("click", toggleFullscreen);
  els.wheelToggle.addEventListener("click", () => {
    state.wheelOpen = !state.wheelOpen;
    render();
  });
  els.restartFromEndButton.addEventListener("click", () => resetEncounter(true));
  if (els.patternSelect) {
    els.patternSelect.addEventListener("change", () => {
      state.selectedPatternId = els.patternSelect.value;
      refreshLegalCells();
      render();
    });
  }
}

function renderRoster() {
  els.roster.innerHTML = "";
  heroes.forEach(hero => {
    const button = document.createElement("button");
    button.className = `roster-card ${state.selectedIds.includes(hero.id) ? "selected" : ""}`;
    button.style.backgroundImage = `url(${hero.image})`;
    button.innerHTML = `<span>${hero.name}</span>`;
    button.addEventListener("click", () => toggleHero(hero.id));
    els.roster.appendChild(button);
  });
}

function toggleHero(id) {
  if (state.started) return;
  if (state.selectedIds.includes(id)) {
    if (state.selectedIds.length > 4) state.selectedIds = state.selectedIds.filter(heroId => heroId !== id);
    return renderRoster();
  }
  if (state.selectedIds.length >= 4) state.selectedIds.shift();
  state.selectedIds.push(id);
  renderRoster();
}

function resetEncounter(started) {
  state.started = started;
  state.phase = started ? "hero" : "setup";
  state.pendingAction = null;
  state.legalCells = [];
  state.log = [];
  state.playedTurns = [];
  state.finished = null;
  state.wheelOpen = false;
  resetTurnActions();

  const starts = [{ x: 0, y: 5 }, { x: 1, y: 5 }, { x: 0, y: 4 }, { x: 1, y: 4 }];
  const selected = state.selectedIds.slice(0, 4).map(id => heroes.find(hero => hero.id === id));
  state.pieces = selected.map((hero, index) => ({
    ...hero,
    kind: "hero",
    x: starts[index].x,
    y: starts[index].y,
    facing: "N",
    hp: hero.health,
    gold: 0,
    majorReady: false,
    sprintReady: true,
    knockedOut: false
  }));

  const rats = [
    { id: "rat_a", label: "1", x: 4, y: 0, facing: "S", hp: 11 },
    { id: "rat_b", label: "2", x: 5, y: 1, facing: "S", hp: 11 },
    { id: "rat_c", label: "3", x: 3, y: 2, facing: "S", hp: 11 }
  ];
  state.enemy = {
    id: "ratpack",
    name: "Rat Pack",
    image: "assets/ratpack.png",
    health: 33,
    hp: 33,
    speed: 4,
    strength: 6,
    weight: 6,
    range: 1,
    pieces: rats,
    aggroHeroId: null,
    ability: "Swarm: Health and aggro are shared between packs. Health = 11 x pack size."
  };

  state.turnDeck = shuffle([...state.pieces.map(piece => piece.id), ...rats.map(rat => rat.id)]);
  state.turnIndex = 0;
  if (started) {
    assignStartingTiles();
    addLog("Encounter started. Initiative cards are shuffled once and flipped one at a time.");
  }
  renderRoster();
  render();
}

function assignStartingTiles() {
  state.pieces.forEach(hero => {
    const attackDraw = shuffle(patterns[hero.bag]).slice(0, 3);
    const moveDraw = shuffle(patterns.move).slice(0, 2);
    hero.attackDraft = attackDraw;
    hero.moveDraft = moveDraw;
    hero.minorPattern = attackDraw[0];
    hero.majorPattern = attackDraw[1];
    hero.movePattern = moveDraw[0];
    addLog(`${hero.name} draws ${attackDraw.map(tile => tile.name).join(", ")} and keeps ${hero.minorPattern.name} / ${hero.majorPattern.name}. Sprint keeps ${hero.movePattern.name}.`);
  });
}

function currentActorId() {
  return state.turnDeck[state.turnIndex];
}

function currentHero() {
  const id = currentActorId();
  return state.pieces.find(piece => piece.id === id);
}

function currentRat() {
  const id = currentActorId();
  return state.enemy?.pieces.find(piece => piece.id === id);
}

function resetTurnActions() {
  state.turnActions = { actionsLeft: 2, rotated: false };
}

function isHeroTurn() {
  return Boolean(currentHero());
}

function render() {
  els.setupPanel.style.display = state.started ? "none" : "flex";
  els.setupSlot.style.display = state.started ? "none" : "grid";
  if (els.statusPill) els.statusPill.textContent = state.finished ? state.finished : state.started ? `${displayActor()} card flipped` : "Setup";
  els.actionWheel.classList.toggle("open", state.wheelOpen);
  els.wheelToggle.textContent = state.wheelOpen ? "Hide" : "Actions";
  renderEndOverlay();
  renderBoard();
  renderTurnDeck();
  renderCards();
  renderEnemy();
  renderLog();
  if (els.patternSelect) renderPatternSelect();
  syncButtons();
}

function renderBoard() {
  els.board.innerHTML = "";
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const cell = document.createElement("button");
      cell.className = "cell";
      if ((x === 0 || x === 1) && (y === 4 || y === 5)) cell.classList.add("start");
      if (state.legalCells.some(pos => pos.x === x && pos.y === y && pos.mode === "attack")) cell.classList.add("target");
      if (state.legalCells.some(pos => pos.x === x && pos.y === y && pos.mode === "move")) cell.classList.add("legal");
      cell.addEventListener("click", () => handleCellClick(x, y));

      const piece = pieceAt(x, y);
      if (piece) {
        const token = document.createElement("div");
        token.className = `piece ${piece.kind} ${piece.ringClass || ""} ${piece.id === currentActorId() ? "current-piece" : ""}`;
        token.style.backgroundImage = `url(${piece.image || "assets/ratpack.png"})`;
        token.style.transform = `rotate(${facingDegrees(piece.facing)}deg)`;
        token.title = piece.name || "Rat";
        token.dataset.info = pieceInfo(piece);
        cell.appendChild(token);
      }
      els.board.appendChild(cell);
    }
  }
}

function pieceAt(x, y) {
  const hero = state.pieces.find(piece => piece.x === x && piece.y === y && piece.hp > 0);
  if (hero) return { ...hero, kind: "hero" };
  const ratIndex = state.enemy?.pieces.findIndex(piece => piece.x === x && piece.y === y && piece.hp > 0) ?? -1;
  const rat = ratIndex >= 0 ? state.enemy.pieces[ratIndex] : null;
  if (rat) return { ...rat, kind: "rat", name: `Rat ${rat.label}`, image: "assets/ratpack.png", ringClass: `rat-ring-${rat.label}` };
  return null;
}

function pieceInfo(piece) {
  if (piece.kind === "hero") {
    return `${piece.name}\nHealth ${piece.hp}/${piece.health}\nSprint ${piece.sprintReady ? "◆" : "◇"}\nMajor ${piece.majorReady ? "◆" : "◇"}`;
  }
  return `${piece.name}\nHealth ${piece.hp}/11\nPack HP ${Math.max(0, state.enemy.hp)}/${state.enemy.health}`;
}

function renderTurnDeck() {
  els.turnDeck.innerHTML = "";
  if (!state.started) {
    els.turnDeck.innerHTML = `<div class="turn-card"><span>Deck</span><strong>Not shuffled</strong></div>`;
    return;
  }
  const current = document.createElement("div");
  current.className = "turn-card current";
  current.innerHTML = `<span>Now</span><strong>${nameForId(currentActorId())}</strong>`;
  els.turnDeck.appendChild(current);
  state.turnDeck.forEach((id, index) => {
    const item = document.createElement("div");
    item.className = `turn-card ${index === state.turnIndex ? "current" : ""}`;
    item.innerHTML = `<span>${index + 1}</span><strong>${shortNameForId(id)}</strong>`;
    els.turnDeck.appendChild(item);
  });
}

function renderCards() {
  els.heroCards.innerHTML = "";
  const hero = currentHero();
  if (!state.started) return;
  const rat = currentRat();
  if (!hero && rat) {
    const card = document.createElement("article");
    card.className = "hero-card";
    card.innerHTML = `
      <div class="card-art" style="background-image:url(${state.enemy.image})">
        <div class="card-title"><span>Rat ${rat.label}</span><span>${Math.max(0, state.enemy.hp)}/${state.enemy.health}</span></div>
      </div>
      <div class="card-body">
        ${slider("Shared HP", Math.max(0, state.enemy.hp), state.enemy.health)}
        ${slider("Speed", state.enemy.speed, 10)}
        ${slider("Strength", state.enemy.strength, 10)}
        ${slider("Weight", state.enemy.weight, 10)}
        <div class="ability">Aggro: ${state.enemy.aggroHeroId ? nameForId(state.enemy.aggroHeroId) : "none"} | This rat: ${rat.hp}/11</div>
      </div>`;
    els.heroCards.appendChild(card);
    return;
  }
  if (!hero) return;
    const card = document.createElement("article");
    card.className = "hero-card";
    card.innerHTML = `
      <div class="card-art" style="background-image:url(${hero.image})">
        <div class="card-title"><span>${hero.name}</span><span>${hero.hp}/${hero.health}</span></div>
      </div>
      <div class="card-body">
        ${slider("Health", hero.hp, hero.health)}
        ${slider("Speed", hero.speed, 10)}
        ${slider("Strength", hero.strength, 10)}
        ${slider("Weight", hero.weight, 10)}
        ${slider("Crit", hero.crit, 20)}
        <div class="ability">Gold: ${hero.gold} | Actions left: ${state.turnActions.actionsLeft} | Rotate: ${state.turnActions.rotated ? "used" : "ready"}</div>
        <div class="ability">Major: ${hero.majorReady ? "ready" : "locked/cooling"} | Sprint: ${hero.sprintReady ? "ready" : "cooling"}</div>
        <div class="equipped-tiles">
          ${tilePreview("Minor", hero.minorPattern)}
          ${tilePreview("Major", hero.majorPattern)}
          ${tilePreview("Sprint", hero.movePattern)}
        </div>
      </div>`;
    els.heroCards.appendChild(card);
}

function tilePreview(label, pattern) {
  if (!pattern) return "";
  return `
    <div class="tile-preview">
      <span>${label}</span>
      <div class="tile-grid">
        ${pattern.grid.flatMap(row => row.map(cell => `<i class="${cell === "P" ? "origin" : cell === "#" ? "mark" : ""}">${cell === "P" ? "▲" : ""}</i>`)).join("")}
      </div>
    </div>`;
}

function renderEnemy() {
  const defeated = state.enemy.hp <= 0;
  els.enemyCard.innerHTML = `
    <article class="enemy-card">
      <div class="card-art" style="background-image:url(${state.enemy.image})">
        <div class="card-title"><span>${state.enemy.name}</span><span>${Math.max(0, state.enemy.hp)}/${state.enemy.health}</span></div>
      </div>
      <div class="card-body">
        ${slider("Shared HP", Math.max(0, state.enemy.hp), state.enemy.health)}
        ${slider("Speed", state.enemy.speed, 10)}
        ${slider("Strength", state.enemy.strength, 10)}
        ${slider("Weight", state.enemy.weight, 10)}
        <div class="ability"><strong>${state.enemy.ability}</strong></div>
        <div class="ability">Aggro: ${state.enemy.aggroHeroId ? nameForId(state.enemy.aggroHeroId) : "none"} | Pieces: ${state.enemy.pieces.filter(rat => rat.hp > 0).length} | ${defeated ? "Defeated" : "Active"}</div>
      </div>
    </article>`;
}

function slider(label, value, max) {
  return `
    <div class="slider-row">
      <span>${label}</span>
      <input type="range" min="0" max="${max}" value="${value}">
      <strong>${value}</strong>
    </div>`;
}

function renderLog() {
  els.log.innerHTML = "";
  state.log.slice(-16).reverse().forEach(entry => {
    const li = document.createElement("li");
    li.textContent = entry;
    els.log.appendChild(li);
  });
}

function renderPatternSelect() {
  const hero = currentHero();
  const action = state.pendingAction;
  const options = hero && action
    ? equippedOptions(hero, action)
    : [];
  els.patternSelect.innerHTML = "";
  options.forEach(pattern => {
    const option = document.createElement("option");
    option.value = pattern.id;
    option.textContent = pattern.name;
    els.patternSelect.appendChild(option);
  });
  if (options[0] && !options.some(pattern => pattern.id === state.selectedPatternId)) state.selectedPatternId = options[0].id;
  els.patternSelect.value = state.selectedPatternId || "";
  els.patternHint.textContent = action ? `${actionLabel(action)}: # squares are ${action === "sprint" ? "legal landing spaces" : "affected targets"}.` : "Select an action to preview pattern targets.";
}

function syncButtons() {
  const hero = currentHero();
  const active = state.started && !state.finished && !state.animating && Boolean(hero);
  const hasAction = active && state.turnActions.actionsLeft > 0 && !hero.knockedOut;
  els.rotateLeftButton.disabled = !active || state.turnActions.rotated;
  els.rotateRightButton.disabled = !active || state.turnActions.rotated;
  els.moveButton.disabled = !hasAction;
  els.sprintButton.disabled = !hasAction || !hero.sprintReady;
  els.minorAttackButton.disabled = !hasAction;
  els.majorAttackButton.disabled = !hasAction || !hero.majorReady;
  els.endTurnButton.disabled = !state.started || Boolean(state.finished);
  if (els.patternSelect) els.patternSelect.disabled = !active || !state.pendingAction;
}

async function handleCellClick(x, y) {
  if (!state.pendingAction) return;
  const legal = state.legalCells.find(pos => pos.x === x && pos.y === y);
  if (!legal) {
    addLog("Illegal action blocked: selected square is outside the active pattern.");
    return render();
  }
  if (state.pendingAction === "move") await moveTo(x, y);
  else if (state.pendingAction === "sprint") await sprintTo(x, y);
  else await resolvePatternAttack(state.pendingAction);
}

function rotateActor(step) {
  const hero = currentHero();
  if (!hero || state.turnActions.rotated) return;
  const next = (dirs.indexOf(hero.facing) + step + dirs.length) % dirs.length;
  hero.facing = dirs[next];
  state.turnActions.rotated = true;
  addLog(`${hero.name} faces ${hero.facing}.`);
  refreshLegalCells();
  render();
}

function rollMove() {
  const hero = currentHero();
  if (!hero || state.turnActions.actionsLeft <= 0) return;
  const roll = rollDie(hero.speed, `${hero.name} Speed`);
  const reachable = cardinalReach(hero.x, hero.y, roll).filter(pos => !pieceAt(pos.x, pos.y));
  state.pendingAction = "move";
  state.legalCells = reachable.map(pos => ({ ...pos, mode: "move" }));
  addLog(`${hero.name} may move up to ${roll} cardinal spaces. Click a highlighted square.`);
  render();
}

async function sprintTo(x, y) {
  const hero = currentHero();
  if (!hero || pieceAt(x, y)) {
    addLog("Illegal sprint blocked: cannot finish on an occupied square.");
    return render();
  }
  await movePieceAlongPath(hero, buildPath(hero, { x, y }));
  hero.sprintReady = false;
  spendAction();
  state.pendingAction = null;
  state.legalCells = [];
  addLog(`${hero.name} sprints to ${coord(x, y)}. Sprint enters cooldown.`);
  render();
}

async function moveTo(x, y) {
  const hero = currentHero();
  if (!hero || pieceAt(x, y)) {
    addLog("Illegal move blocked: cannot finish on an occupied square.");
    return render();
  }
  await movePieceAlongPath(hero, buildPath(hero, { x, y }));
  spendAction();
  state.pendingAction = null;
  state.legalCells = [];
  addLog(`${hero.name} moves to ${coord(x, y)}.`);
  render();
}

function buildPath(piece, destination) {
  const path = [];
  let x = piece.x;
  let y = piece.y;
  while (x !== destination.x) {
    x += destination.x > x ? 1 : -1;
    path.push({ x, y });
  }
  while (y !== destination.y) {
    y += destination.y > y ? 1 : -1;
    path.push({ x, y });
  }
  return path;
}

async function movePieceAlongPath(piece, path) {
  if (!path.length) return;
  state.animating = true;
  syncButtons();
  for (const step of path) {
    piece.x = step.x;
    piece.y = step.y;
    render();
    await delay(150);
  }
  state.animating = false;
}

function spendAction() {
  state.turnActions.actionsLeft = Math.max(0, state.turnActions.actionsLeft - 1);
}

function beginPattern(action) {
  const hero = currentHero();
  if (!hero || state.turnActions.actionsLeft <= 0) return;
  state.pendingAction = action;
  const list = equippedOptions(hero, action);
  state.selectedPatternId = list[0].id;
  refreshLegalCells();
  addLog(`${hero.name} prepares ${actionLabel(action)}.`);
  render();
}

function refreshLegalCells() {
  const hero = currentHero();
  if (!hero || !state.pendingAction) {
    state.legalCells = [];
    return;
  }
  if (state.pendingAction === "move") return;
  const list = equippedOptions(hero, state.pendingAction);
  const pattern = list.find(item => item.id === state.selectedPatternId) || list[0];
  const mode = state.pendingAction === "sprint" ? "move" : "attack";
  state.legalCells = patternCells(hero, pattern).map(pos => ({ ...pos, mode }));
}

function equippedOptions(hero, action) {
  if (action === "sprint") return [hero.movePattern].filter(Boolean);
  if (action === "minor") return [hero.minorPattern].filter(Boolean);
  if (action === "major") return [hero.majorPattern].filter(Boolean);
  return [];
}

function attackCell(x, y, action, batch = false) {
  const hero = currentHero();
  const rat = state.enemy.pieces.find(piece => piece.x === x && piece.y === y && piece.hp > 0);
  const ally = state.pieces.find(piece => piece.x === x && piece.y === y && piece.id !== hero.id && piece.hp > 0);
  if (!rat && !ally) {
    addLog("Attack resolved against empty space. No damage rolled.");
    state.pendingAction = null;
    state.legalCells = [];
    if (!batch) return render();
    return;
  }
  const dice = action === "major" ? 2 : 1;
  let damage = 0;
  for (let i = 0; i < dice; i += 1) damage += rollDie(hero.strength, `${hero.name} Strength`);
  if (action === "major") {
    const critRoll = rollDie(10, `${hero.name} Crit`);
    if (critRoll >= hero.crit) {
      damage *= 2;
      addLog(`${hero.name} crits. Damage doubled to ${damage}.`);
    }
    hero.majorReady = false;
  } else {
    hero.majorReady = true;
  }
  if (!batch) animatePattern(hero.id === "healer" ? "heal" : hero.bag, [{ x, y }]);
  if (rat) {
    const dodge = rollDie(state.enemy.weight, "Pack Rat Dodge");
    if (dodge === state.enemy.weight) {
      addLog(`Pack Rat dodge ${dodge}: all ${damage} incoming damage is negated.`);
      damage = 0;
    } else if (dodge === state.enemy.weight - 1) {
      addLog(`Pack Rat dodge ${dodge}: incoming damage is reduced by 1.`);
      damage = Math.max(0, damage - 1);
    }
    if (hero.id === "healer") {
      const previous = state.enemy.hp;
      state.enemy.hp = Math.min(state.enemy.health, state.enemy.hp + damage);
      rat.hp = Math.min(11, rat.hp + damage);
      hero.gold = Math.max(0, hero.gold - damage);
      addLog(`${hero.name}'s attack heals the Pack Rat at ${coord(x, y)} for ${state.enemy.hp - previous}. Gold penalty applied.`);
    } else {
      state.enemy.hp -= damage;
      rat.hp = Math.max(0, rat.hp - damage);
      state.enemy.aggroHeroId = hero.id;
      hero.gold += action === "major" ? damage : 1;
      addLog(`${hero.name} hits Pack Rat at ${coord(x, y)} for ${damage}. Shared HP now ${Math.max(0, state.enemy.hp)}.`);
      if (state.enemy.hp <= 0) finishEncounter("win");
    }
  }
  if (ally) {
    if (hero.id === "healer") {
      const previous = ally.hp;
      ally.hp = Math.min(ally.health, ally.hp + damage);
      hero.gold += 1;
      addLog(`${hero.name}'s attack heals ally ${ally.name} for ${ally.hp - previous}.`);
    } else {
      ally.hp = Math.max(0, ally.hp - damage);
      hero.gold = Math.max(0, hero.gold - 1);
      addLog(`${hero.name} hits ally ${ally.name} for ${damage}. Gold penalty applied.`);
    }
  }
  if (!batch) {
    spendAction();
    state.pendingAction = null;
    state.legalCells = [];
    checkOutcome();
    render();
  }
}

async function resolvePatternAttack(action) {
  const hero = currentHero();
  if (!hero || !state.legalCells.length) return;
  const targets = state.legalCells
    .map(pos => ({ ...pos, rat: state.enemy.pieces.find(piece => piece.x === pos.x && piece.y === pos.y && piece.hp > 0), ally: state.pieces.find(piece => piece.x === pos.x && piece.y === pos.y && piece.id !== hero.id && piece.hp > 0) }))
    .filter(pos => pos.rat || pos.ally);

  if (!targets.length) {
    await animatePattern(hero.bag, state.legalCells);
    addLog(`${hero.name}'s pattern resolves with no occupied targets.`);
    spendAction();
    state.pendingAction = null;
    state.legalCells = [];
    return render();
  }

  await animatePattern(hero.id === "healer" ? "heal" : hero.bag, state.legalCells);
  targets.forEach(target => attackCell(target.x, target.y, action, true));
  spendAction();
  state.pendingAction = null;
  state.legalCells = [];
  checkOutcome();
  render();
}

async function endTurn() {
  if (!state.started || state.finished) return;
  state.pendingAction = null;
  state.legalCells = [];
  state.playedTurns.push(currentActorId());
  if (state.turnIndex >= state.turnDeck.length - 1) {
    state.turnIndex = 0;
    addLog("Turn order loops back to the first revealed card. No reshuffle during this encounter.");
  } else {
    state.turnIndex += 1;
  }
  resetTurnActions();
  const hero = currentHero();
  if (hero && !hero.sprintReady) {
    hero.sprintReady = true;
    addLog(`${hero.name}'s Sprint tile re-slots.`);
  }
  const rat = currentRat();
  if (rat) await runEnemyTurn(rat);
  checkOutcome();
  render();
}

async function runEnemyTurn(activeRat) {
  if (state.enemy.hp <= 0 || !activeRat || activeRat.hp <= 0) return;
  addLog(`Rat ${activeRat.label} turn begins.`);
  const target = chooseRatTarget();
  state.enemy.aggroHeroId = target.id;
  faceToward(activeRat, target);
  const distance = manhattan(activeRat, target);
  if (distance <= state.enemy.range) {
    await animatePattern("melee", [{ x: target.x, y: target.y }]);
    enemyAttack(activeRat, target);
    addLog(`Rat ${activeRat.label} turn ends.`);
    return;
  }
  const roll = rollDie(state.enemy.speed, `Rat ${activeRat.label} Speed`);
  const path = [];
  const start = { x: activeRat.x, y: activeRat.y };
  for (let step = 0; step < roll; step += 1) {
    const next = stepToward(activeRat, target);
    if (!next || pieceAt(next.x, next.y)) break;
    path.push({ x: next.x, y: next.y });
    activeRat.x = next.x;
    activeRat.y = next.y;
  }
  activeRat.x = start.x;
  activeRat.y = start.y;
  await movePieceAlongPath(activeRat, path);
  faceToward(activeRat, target);
  if (manhattan(activeRat, target) <= state.enemy.range) {
    await animatePattern("melee", [{ x: target.x, y: target.y }]);
    enemyAttack(activeRat, target);
  }
  addLog(`Rat ${activeRat.label} turn ends.`);
}

function chooseRatTarget() {
  const living = state.pieces.filter(hero => hero.hp > 0);
  const aggro = living.find(hero => hero.id === state.enemy.aggroHeroId);
  if (aggro) return aggro;
  return living.sort((a, b) => nearestRatDistance(a) - nearestRatDistance(b))[0];
}

function enemyAttack(rat, hero) {
  const damage = rollDie(state.enemy.strength, "Rat Pack Strength");
  const dodge = rollDie(hero.weight, `${hero.name} Dodge`);
  let finalDamage = damage;
  if (dodge === hero.weight) finalDamage = 0;
  else if (dodge === hero.weight - 1) finalDamage = Math.max(0, damage - 1);
  hero.hp = Math.max(0, hero.hp - finalDamage);
  if (finalDamage === 0) hero.gold += 1;
  addLog(`Rat at ${coord(rat.x, rat.y)} attacks ${hero.name}: ${damage} incoming, dodge ${dodge}, ${finalDamage} dealt.`);
  if (hero.hp === 0 && !hero.knockedOut) {
    hero.knockedOut = true;
    addLog(`${hero.name} is Knocked Out. Strict death timing needs next-turn tracking in the next pass.`);
  }
}

function checkOutcome() {
  if (state.finished) return;
  if (state.enemy && state.enemy.hp <= 0) finishEncounter("win");
  if (state.started && state.pieces.length && state.pieces.every(hero => hero.hp <= 0)) finishEncounter("lose");
}

function finishEncounter(result) {
  if (state.finished) return;
  state.finished = result;
  state.pendingAction = null;
  state.legalCells = [];
  state.wheelOpen = false;
  if (result === "win") {
    addLog("Victory: the Pack Rat group is defeated.");
  } else {
    addLog("Defeat: all owls are knocked out.");
  }
}

function renderEndOverlay() {
  if (!els.endOverlay) return;
  els.endOverlay.classList.toggle("show", Boolean(state.finished));
  if (!state.finished) return;
  if (state.finished === "win") {
    els.endKicker.textContent = "Victory";
    els.endTitle.textContent = "OwlCrest Lives";
    els.endMessage.textContent = "OwlCrest lives safe another day, but the danger is far from gone. Support OwlCrest and save your people!";
  } else {
    els.endKicker.textContent = "Defeat";
    els.endTitle.textContent = "OwlCrest Distress Grows";
    els.endMessage.textContent = "OwlCrest distress grows. Brave adventurer, return to the fight.";
  }
}

async function animatePattern(kind, cells) {
  state.animating = true;
  syncButtons();
  cells.forEach((target, indexOffset) => {
    const index = target.y * BOARD_SIZE + target.x;
    const cell = els.board.children[index];
    if (!cell) return;
    const fx = document.createElement("div");
    fx.className = `fx ${kind === "heal" ? "heal" : kind === "melee" ? "slash" : "orb"}`;
    fx.style.animationDelay = `${indexOffset * 40}ms`;
    cell.appendChild(fx);
    const piece = cell.querySelector(".piece");
    if (piece && kind !== "heal") piece.classList.add("shake");
    if (piece && kind === "heal") piece.classList.add("healed");
    setTimeout(() => fx.remove(), 900);
    setTimeout(() => {
      if (piece) piece.classList.remove("shake", "healed");
    }, 900);
  });
  await delay(820);
  state.animating = false;
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      els.fullscreenButton.textContent = "Exit Full Screen";
    } else {
      await document.exitFullscreen();
      els.fullscreenButton.textContent = "Full Screen";
    }
  } catch (error) {
    addLog("Fullscreen request was blocked by the browser.");
    render();
  }
}

function rollDie(sides, label) {
  const result = Math.floor(Math.random() * sides) + 1;
  if (els.diceLabel) els.diceLabel.textContent = `d${sides} ${label}`;
  if (els.diceResult) els.diceResult.textContent = result;
  addLog(`${label}: d${sides} = ${result}.`);
  return result;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function patternCells(hero, pattern) {
  const origin = findOrigin(pattern.grid);
  const cells = [];
  pattern.grid.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== "#") return;
      const dx = x - origin.x;
      const dy = y - origin.y;
      const rotated = rotateOffset(dx, dy, hero.facing);
      const bx = hero.x + rotated.x;
      const by = hero.y + rotated.y;
      if (inBounds(bx, by)) cells.push({ x: bx, y: by });
    });
  });
  return cells;
}

function findOrigin(grid) {
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      if (grid[y][x] === "P") return { x, y };
    }
  }
  return { x: 2, y: 2 };
}

function rotateOffset(dx, dy, facing) {
  if (facing === "N") return { x: dx, y: dy };
  if (facing === "E") return { x: -dy, y: dx };
  if (facing === "S") return { x: -dx, y: -dy };
  return { x: dy, y: -dx };
}

function cardinalReach(x, y, steps) {
  const seen = new Set([`${x},${y}`]);
  let frontier = [{ x, y, d: 0 }];
  const cells = [];
  while (frontier.length) {
    const current = frontier.shift();
    if (current.d > 0) cells.push({ x: current.x, y: current.y });
    if (current.d === steps) continue;
    Object.values(dirDelta).forEach(([dx, dy]) => {
      const next = { x: current.x + dx, y: current.y + dy, d: current.d + 1 };
      const key = `${next.x},${next.y}`;
      if (!inBounds(next.x, next.y) || seen.has(key)) return;
      seen.add(key);
      frontier.push(next);
    });
  }
  return cells;
}

function faceToward(piece, target) {
  const dx = target.x - piece.x;
  const dy = target.y - piece.y;
  if (Math.abs(dx) > Math.abs(dy)) piece.facing = dx > 0 ? "E" : "W";
  else piece.facing = dy > 0 ? "S" : "N";
}

function stepToward(piece, target) {
  const options = Object.entries(dirDelta)
    .map(([, [dx, dy]]) => ({ x: piece.x + dx, y: piece.y + dy }))
    .filter(pos => inBounds(pos.x, pos.y))
    .sort((a, b) => manhattan(a, target) - manhattan(b, target));
  return options[0];
}

function nearestRatDistance(hero) {
  return Math.min(...state.enemy.pieces.filter(rat => rat.hp > 0).map(rat => manhattan(hero, rat)));
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function facingDegrees(facing) {
  return { N: 0, E: 90, S: 180, W: 270 }[facing] || 0;
}

function actionLabel(action) {
  return { minor: "Minor Attack", major: "Major Attack", sprint: "Sprint Tile" }[action] || action;
}

function displayActor() {
  return nameForId(currentActorId());
}

function nameForId(id) {
  const rat = state.enemy?.pieces.find(piece => piece.id === id);
  if (rat) return `Rat ${rat.label}`;
  return heroes.find(hero => hero.id === id)?.name || id;
}

function shortNameForId(id) {
  const rat = state.enemy?.pieces.find(piece => piece.id === id);
  if (rat) return `R${rat.label}`;
  return (heroes.find(hero => hero.id === id)?.name || id).slice(0, 3);
}

function coord(x, y) {
  return `${String.fromCharCode(65 + x)}${y + 1}`;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function addLog(message) {
  state.log.push(message);
}

init();
