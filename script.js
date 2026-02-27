// script.js
let deck = [];
let playerHand = [];
let dealerHand = [];
let currentBet = 0;
let bankroll = 1000;
let highestBankrollEver = 1000;
let roundActive = false;
let dealerHidden = true;

const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const cardsPerRank = 77; // 13 * 77 = 1001 cards

const bankrollEl = document.getElementById("bankroll");
const highscoreEl = document.getElementById("highscore");
const dealerCardsEl = document.getElementById("dealer-cards");
const playerCardsEl = document.getElementById("player-cards");
const dealerTotalEl = document.getElementById("dealer-total");
const playerTotalEl = document.getElementById("player-total");
const betInputEl = document.getElementById("bet-input");
const dealBtn = document.getElementById("deal-btn");
const hitBtn = document.getElementById("hit-btn");
const standBtn = document.getElementById("stand-btn");
const statusEl = document.getElementById("status-message");
const errorEl = document.getElementById("error-message");

function createDeck() {
  const newDeck = [];
  let extraSuitIndex = 0;

  for (const rank of ranks) {
    const basePerSuit = Math.floor(cardsPerRank / suits.length);
    const remainder = cardsPerRank % suits.length;

    for (let i = 0; i < suits.length; i += 1) {
      const addOne = i === extraSuitIndex && remainder > 0 ? 1 : 0;
      const count = basePerSuit + addOne;

      for (let n = 0; n < count; n += 1) {
        newDeck.push({ rank, suit: suits[i] });
      }
    }

    extraSuitIndex = (extraSuitIndex + 1) % suits.length;
  }

  return newDeck;
}

function shuffleDeck(deckToShuffle) {
  for (let i = deckToShuffle.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deckToShuffle[i], deckToShuffle[j]] = [deckToShuffle[j], deckToShuffle[i]];
  }
  return deckToShuffle;
}

function dealCard() {
  if (deck.length < 15) {
    deck = shuffleDeck(createDeck());
    if (roundActive) {
      statusEl.textContent = "Deck was low and has been reshuffled.";
    }
  }
  return deck.pop();
}

function calculateHandValue(hand) {
  let total = 0;
  let acesAsEleven = 0;

  for (const card of hand) {
    if (card.rank === "A") {
      total += 11;
      acesAsEleven += 1;
    } else if (["K", "Q", "J"].includes(card.rank)) {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }

  while (total > 21 && acesAsEleven > 0) {
    total -= 10;
    acesAsEleven -= 1;
  }

  return total;
}

function isBlackjack(hand) {
  return hand.length === 2 && calculateHandValue(hand) === 21;
}

function startRound() {
  if (roundActive) {
    return;
  }

  if (bankroll <= 0) {
    statusEl.textContent = "Game Over. Bankroll is 0.";
    updateUI();
    return;
  }

  errorEl.textContent = "";
  const rawBet = betInputEl.value.trim();
  const bet = Number(rawBet);

  if (!rawBet) {
    errorEl.textContent = "Enter a bet first.";
    return;
  }

  if (!Number.isInteger(bet) || bet <= 0) {
    errorEl.textContent = "Bet must be a whole number greater than 0.";
    return;
  }

  if (bet > bankroll) {
    errorEl.textContent = "Bet cannot exceed current bankroll.";
    return;
  }

  currentBet = bet;
  playerHand = [dealCard(), dealCard()];
  dealerHand = [dealCard(), dealCard()];
  dealerHidden = true;
  roundActive = true;

  statusEl.textContent = `Round started. Bet: ${formatMoney(currentBet)}. Hit or Stand.`;

  if (isBlackjack(playerHand) || isBlackjack(dealerHand)) {
    resolveRound("initialBlackjack");
    return;
  }

  updateUI();
}

function playerHit() {
  if (!roundActive) {
    return;
  }

  playerHand.push(dealCard());

  if (calculateHandValue(playerHand) > 21) {
    resolveRound("playerBust");
    return;
  }

  updateUI();
}

function playerStand() {
  if (!roundActive) {
    return;
  }

  dealerHidden = false;
  dealerPlay();
  resolveRound("stand");
}

function dealerPlay() {
  while (calculateHandValue(dealerHand) < 17) {
    dealerHand.push(dealCard());
  }
}

function resolveRound(reason) {
  dealerHidden = false;

  const playerValue = calculateHandValue(playerHand);
  const dealerValue = calculateHandValue(dealerHand);
  const playerBJ = isBlackjack(playerHand);
  const dealerBJ = isBlackjack(dealerHand);

  if (reason === "playerBust") {
    bankroll = roundMoney(bankroll - currentBet);
    statusEl.textContent = `Player busts with ${playerValue}. You lose ${formatMoney(currentBet)}.`;
  } else if (playerBJ || dealerBJ || reason === "initialBlackjack") {
    if (playerBJ && dealerBJ) {
      statusEl.textContent = "Both player and dealer have Blackjack. Push.";
    } else if (playerBJ) {
      const profit = roundMoney(currentBet * 1.5);
      bankroll = roundMoney(bankroll + profit);
      statusEl.textContent = `Blackjack! You win ${formatMoney(profit)} (3:2 payout).`;
    } else {
      bankroll = roundMoney(bankroll - currentBet);
      statusEl.textContent = "Dealer has Blackjack. You lose.";
    }
  } else if (dealerValue > 21) {
    bankroll = roundMoney(bankroll + currentBet);
    statusEl.textContent = `Dealer busts with ${dealerValue}. You win ${formatMoney(currentBet)}.`;
  } else if (playerValue > dealerValue) {
    bankroll = roundMoney(bankroll + currentBet);
    statusEl.textContent = `You win ${formatMoney(currentBet)} (${playerValue} vs ${dealerValue}).`;
  } else if (playerValue < dealerValue) {
    bankroll = roundMoney(bankroll - currentBet);
    statusEl.textContent = `Dealer wins (${dealerValue} vs ${playerValue}). You lose ${formatMoney(currentBet)}.`;
  } else {
    statusEl.textContent = `Push at ${playerValue}. Bet returned.`;
  }

  if (bankroll <= 0) {
    bankroll = 0;
    statusEl.textContent += " Game Over.";
  }

  roundActive = false;
  updateHighScore();
  updateUI();
}

function updateUI() {
  bankrollEl.textContent = formatMoney(bankroll);
  highscoreEl.textContent = formatMoney(highestBankrollEver);

  renderHand(dealerCardsEl, dealerHand, dealerHidden);
  renderHand(playerCardsEl, playerHand, false);

  const playerTotal = calculateHandValue(playerHand);
  playerTotalEl.textContent = playerHand.length ? `(${playerTotal})` : "";

  if (!dealerHand.length) {
    dealerTotalEl.textContent = "";
  } else if (dealerHidden) {
    const visibleValue = calculateHandValue([dealerHand[0]]);
    dealerTotalEl.textContent = `(${visibleValue} + ?)`;
  } else {
    dealerTotalEl.textContent = `(${calculateHandValue(dealerHand)})`;
  }

  const gameOver = bankroll <= 0;

  dealBtn.disabled = roundActive || gameOver;
  hitBtn.disabled = !roundActive || gameOver;
  standBtn.disabled = !roundActive || gameOver;
  betInputEl.disabled = roundActive || gameOver;

  if (gameOver) {
    dealBtn.textContent = "Game Over";
  } else {
    dealBtn.textContent = "Deal";
  }
}

function updateHighScore() {
  if (bankroll > highestBankrollEver) {
    highestBankrollEver = bankroll;
    localStorage.setItem("highestBankrollEver", String(highestBankrollEver));
  }
}

function renderHand(container, hand, hideSecondCard) {
  container.innerHTML = "";

  hand.forEach((card, index) => {
    const shouldHide = hideSecondCard && index === 1;
    container.appendChild(createCardElement(card, shouldHide));
  });
}

function createCardElement(card, hidden = false) {
  const cardEl = document.createElement("div");
  cardEl.className = "card";

  if (hidden) {
    cardEl.classList.add("back");
    cardEl.innerHTML = '<div class="center">🂠</div>';
    return cardEl;
  }

  if (card.suit === "♥" || card.suit === "♦") {
    cardEl.classList.add("red");
  }

  cardEl.innerHTML = `
    <div class="corner top">${card.rank}${card.suit}</div>
    <div class="center">${card.suit}</div>
    <div class="corner bottom">${card.rank}${card.suit}</div>
  `;

  return cardEl;
}

function roundMoney(amount) {
  return Math.round(amount * 100) / 100;
}

function formatMoney(amount) {
  if (Number.isInteger(amount)) {
    return amount.toString();
  }
  return amount.toFixed(2);
}

function initializeGame() {
  const storedHigh = Number(localStorage.getItem("highestBankrollEver"));

  if (!Number.isNaN(storedHigh) && storedHigh > 0) {
    highestBankrollEver = storedHigh;
  } else {
    highestBankrollEver = bankroll;
    localStorage.setItem("highestBankrollEver", String(highestBankrollEver));
  }

  deck = shuffleDeck(createDeck());
  updateUI();
}

dealBtn.addEventListener("click", startRound);
hitBtn.addEventListener("click", playerHit);
standBtn.addEventListener("click", playerStand);

betInputEl.addEventListener("input", () => {
  errorEl.textContent = "";
});

initializeGame();
