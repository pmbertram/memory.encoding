(() => {
  "use strict";

  const WORD_DURATION_MS = 4000;
  const BLOCK_SIZE = 6;
  const DISTRACTOR_SECONDS = 30;

  // Three matched-in-spirit lists of common, concrete, single-word nouns.
  const WORD_LISTS = [
    ["APPLE", "LADDER", "CANDLE", "RIVER", "HAMMER", "TIGER"],
    ["BOTTLE", "BRIDGE", "PILLOW", "GUITAR", "LEMON", "CASTLE"],
    ["SPOON", "FOREST", "MIRROR", "BICYCLE", "CLOUD", "ANCHOR"]
  ];

  const STRATEGIES = [
    {
      id: "maintenance_rehearsal",
      name: "Maintenance rehearsal",
      title: "Maintenance Rehearsal",
      instructions: "When each word appears, repeat it silently to yourself several times. Focus on keeping the word active in your mind. Do not try to connect it to a personal memory or create a mental picture.",
      hint: "Repeat the word silently to yourself."
    },
    {
      id: "self_reference",
      name: "Self-reference",
      title: "Self-Reference",
      instructions: "When each word appears, think about how it relates to you personally. For example, consider whether you own it, use it, like it, or have an experience connected to it. Make a brief personal connection for each word.",
      hint: "Think about how the word relates to you."
    },
    {
      id: "mental_imagery",
      name: "Mental imagery",
      title: "Mental Imagery",
      instructions: "When each word appears, create a clear mental picture of the object. Imagine what it looks like, its color, shape, size, or details. Try to make the image vivid.",
      hint: "Picture the object clearly in your mind."
    }
  ];

  const screens = ["welcome-screen", "instruction-screen", "study-screen", "transition-screen",
    "distractor-screen", "recall-screen", "results-screen"];
  const $ = id => document.getElementById(id);
  let session = null;
  let blockIndex = 0;
  let wordIndex = 0;
  let wordTimer = null;
  let distractorTimer = null;
  let distractorStart = 0;
  let startNumber = 0;

  function showScreen(id) {
    screens.forEach(screen => $(screen).classList.toggle("hidden", screen !== id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function createSession() {
    const strategyOrder = shuffle(STRATEGIES);
    const listOrder = shuffle([0, 1, 2]);
    const now = new Date();
    const sessionId = $("participant-id").value.trim() ||
      `S-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

    const blocks = strategyOrder.map((strategy, i) => ({
      strategy,
      listNumber: listOrder[i] + 1,
      words: WORD_LISTS[listOrder[i]].map((word, j) => ({
        word, strategyId: strategy.id, strategyName: strategy.name,
        blockOrder: i + 1, positionInBlock: j + 1, recalled: false, matchedResponse: ""
      }))
    }));

    return {
      sessionId,
      startedAt: now.toISOString(),
      blocks,
      distractorStart: null,
      distractorResponse: "",
      recallResponse: "",
      completedAt: null,
      recallTokens: []
    };
  }

  function beginBlock() {
    const block = session.blocks[blockIndex];
    $("block-label").textContent = `ENCODING BLOCK ${blockIndex + 1} OF 3`;
    $("strategy-count").textContent = `${blockIndex + 1} / 3`;
    $("progress-fill").style.width = `${(blockIndex / 3) * 100}%`;
    $("strategy-title").textContent = block.strategy.title;
    $("strategy-instructions").textContent = block.strategy.instructions;
    showScreen("instruction-screen");
  }

  function startStudyBlock() {
    wordIndex = 0;
    showScreen("study-screen");
    $("study-block-label").textContent = `BLOCK ${blockIndex + 1} OF 3`;
    $("study-strategy-name").textContent = session.blocks[blockIndex].strategy.name.toUpperCase();
    showWord();
  }

  function showWord() {
    const block = session.blocks[blockIndex];
    if (wordIndex >= BLOCK_SIZE) {
      clearTimeout(wordTimer);
      if (blockIndex < 2) {
        $("completed-blocks").textContent = `${blockIndex + 1} OF 3 BLOCKS COMPLETE`;
        showScreen("transition-screen");
      } else {
        prepareDistractor();
      }
      return;
    }
    $("word-counter").textContent = `WORD ${wordIndex + 1} OF 6`;
    $("study-progress-fill").style.width = `${((wordIndex + 1) / BLOCK_SIZE) * 100}%`;
    $("study-word").textContent = block.words[wordIndex].word;
    $("study-hint").textContent = block.strategy.hint;
    wordTimer = setTimeout(() => {
      wordIndex += 1;
      showWord();
    }, WORD_DURATION_MS);
  }

  function prepareDistractor() {
    startNumber = Math.floor(100 + Math.random() * 900);
    session.distractorStart = startNumber;
    $("starting-number").textContent = startNumber;
    $("counting-response").value = "";
    $("timer").textContent = "00:30";
    $("timer-fill").style.width = "100%";
    $("start-counting-button").disabled = false;
    $("start-counting-button").textContent = "Start 30-second task";
    showScreen("distractor-screen");
  }

  function startDistractor() {
    $("start-counting-button").disabled = true;
    $("start-counting-button").textContent = "Counting task in progress…";
    $("counting-response").focus();
    distractorStart = Date.now();
    distractorTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - distractorStart) / 1000);
      const remaining = Math.max(0, DISTRACTOR_SECONDS - elapsed);
      $("timer").textContent = `00:${String(remaining).padStart(2, "0")}`;
      $("timer-fill").style.width = `${(remaining / DISTRACTOR_SECONDS) * 100}%`;
      if (remaining <= 0) {
        clearInterval(distractorTimer);
        session.distractorResponse = $("counting-response").value.trim();
        showScreen("recall-screen");
        $("recall-response").focus();
      }
    }, 100);
  }

  function tokenize(text) {
    return text.toLocaleLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s'-]/g, " ")
      .split(/[\s,;]+/)
      .map(token => token.replace(/^['-]+|['-]+$/g, ""))
      .filter(Boolean);
  }

  function editDistance(a, b) {
    const row = Array.from({length: b.length + 1}, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let previous = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const old = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i-1] === b[j-1] ? 0 : 1));
        previous = old;
      }
    }
    return row[b.length];
  }

  function typoMatch(token, target) {
    if (token === target.toLowerCase()) return true;
    // Conservative allowance for minor typos; avoids accepting unrelated words.
    const maxDistance = target.length >= 8 ? 2 : 1;
    return Math.abs(token.length - target.length) <= maxDistance &&
      editDistance(token, target.toLowerCase()) <= maxDistance;
  }

  function scoreRecall() {
    const response = $("recall-response").value.trim();
    session.recallResponse = response;
    const tokens = tokenize(response);
    const usedTokens = new Set();
    const allTrials = session.blocks.flatMap(block => block.words);

    // Match each studied word to at most one response token. Exact matches are preferred.
    allTrials.forEach(trial => {
      let matchIndex = tokens.findIndex((token, i) => !usedTokens.has(i) && token === trial.word.toLowerCase());
      if (matchIndex === -1) {
        matchIndex = tokens.findIndex((token, i) => !usedTokens.has(i) && typoMatch(token, trial.word));
      }
      if (matchIndex !== -1) {
        trial.recalled = true;
        trial.matchedResponse = tokens[matchIndex];
        usedTokens.add(matchIndex);
      }
    });
    session.recallTokens = tokens;
    session.completedAt = new Date().toISOString();
    renderResults();
  }

  function renderResults() {
    const grid = $("results-grid");
    const tbody = $("results-table");
    grid.innerHTML = "";
    tbody.innerHTML = "";
    let total = 0;

    session.blocks.forEach(block => {
      const score = block.words.filter(w => w.recalled).length;
      total += score;
      const card = document.createElement("div");
      card.className = "score-card";
      const strategy = document.createElement("div");
      strategy.className = "strategy";
      strategy.textContent = block.strategy.name;
      const scoreEl = document.createElement("div");
      scoreEl.className = "score";
      scoreEl.textContent = `${score}/6`;
      const percent = document.createElement("div");
      percent.className = "percent";
      percent.textContent = `${Math.round(score / 6 * 100)}% recalled`;
      card.append(strategy, scoreEl, percent);
      grid.appendChild(card);

      const row = document.createElement("tr");
      [block.strategy.name, `${score} / 6`, block.words.filter(w => w.recalled).map(w => w.word).join(", ") || "—"].forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });
    $("total-score").textContent = `${total} / 18`;
    $("result-session-id").textContent = session.sessionId;
    showScreen("results-screen");
  }

  function csvEscape(value) {
    const s = String(value ?? "");
    return `"${s.replace(/"/g, '""')}"`;
  }

  function downloadCsv(filename, rows) {
    const csv = rows.map(row => row.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], {type: "text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadSummary() {
    const rows = [[
      "session_id", "participant_code", "started_at", "completed_at",
      "strategy_order", "word_list_assignment", "maintenance_rehearsal_recalled",
      "self_reference_recalled", "mental_imagery_recalled", "total_recalled",
      "total_studied", "distractor_start_number", "distractor_response", "free_recall_response"
    ]];
    const scores = Object.fromEntries(session.blocks.map(b => [b.strategy.id, b.words.filter(w => w.recalled).length]));
    const order = session.blocks.map(b => b.strategy.name).join(" > ");
    const assignment = session.blocks.map(b => `${b.strategy.name}:List${b.listNumber}`).join(" | ");
    rows.push([
      session.sessionId, $("participant-id").value.trim(), session.startedAt, session.completedAt,
      order, assignment, scores.maintenance_rehearsal, scores.self_reference, scores.mental_imagery,
      session.blocks.flatMap(b => b.words).filter(w => w.recalled).length, 18,
      session.distractorStart, session.distractorResponse, session.recallResponse
    ]);
    downloadCsv(`memory_experiment_summary_${safeFilePart(session.sessionId)}.csv`, rows);
  }

  function downloadTrials() {
    const rows = [[
      "session_id", "participant_code", "block_order", "strategy_id", "strategy_name",
      "word_list_number", "position_in_block", "stimulus_word", "recalled",
      "matched_recall_response", "free_recall_response", "started_at", "completed_at"
    ]];
    session.blocks.forEach(block => block.words.forEach(trial => {
      rows.push([
        session.sessionId, $("participant-id").value.trim(), trial.blockOrder,
        trial.strategyId, trial.strategyName, block.listNumber, trial.positionInBlock,
        trial.word, trial.recalled ? 1 : 0, trial.matchedResponse,
        session.recallResponse, session.startedAt, session.completedAt
      ]);
    }));
    downloadCsv(`memory_experiment_trials_${safeFilePart(session.sessionId)}.csv`, rows);
  }

  function safeFilePart(value) {
    return String(value).replace(/[^a-z0-9_-]/gi, "_").slice(0, 50);
  }

  function reset() {
    clearTimeout(wordTimer);
    clearInterval(distractorTimer);
    $("participant-id").value = "";
    $("recall-response").value = "";
    $("counting-response").value = "";
    session = null;
    blockIndex = 0;
    showScreen("welcome-screen");
  }

  $("start-button").addEventListener("click", () => {
    session = createSession();
    blockIndex = 0;
    beginBlock();
  });
  $("begin-block-button").addEventListener("click", startStudyBlock);
  $("continue-button").addEventListener("click", () => {
    blockIndex += 1;
    beginBlock();
  });
  $("start-counting-button").addEventListener("click", startDistractor);
  $("submit-recall-button").addEventListener("click", scoreRecall);
  $("summary-download").addEventListener("click", downloadSummary);
  $("trial-download").addEventListener("click", downloadTrials);
  $("restart-button").addEventListener("click", reset);
})();