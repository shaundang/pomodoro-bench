import { describe, it, expect } from 'vitest';
import { mountApp } from './helpers/mountApp.js';
import { KEYS, readJSON } from './helpers/storage.js';
import { todayKey, daysAgoKey } from './helpers/dates.js';

// The garden's own key is not in helpers/storage.js because seeds are derived
// from the session log rather than stored: this key holds only what has been
// spent and where each bought item sits (js/app.js:1680).
const GARDEN_KEY = 'pomodoroBench.garden.v1';

function seedSessions(list) {
  localStorage.setItem(KEYS.sessions, JSON.stringify(list));
}

let clock = 0;
function session(overrides) {
  clock += 1000;
  return {
    id: 's' + clock,
    date: todayKey(),
    category: 'Work',
    task: 'Write the thing',
    taskId: null,
    minutes: 50,
    timestamp: clock,
    status: 'completed',
    type: 'focus',
    intention: null,
    quality: null,
    ...overrides
  };
}

// n completed focus pomodoros — i.e. n seeds earned.
function pomodoros(n, overrides) {
  return Array.from({ length: n }, () => session(overrides));
}

function seedGarden(garden) {
  localStorage.setItem(GARDEN_KEY, JSON.stringify(garden));
}


const gardenState = () => readJSON(GARDEN_KEY, null);

// An item as it is stored. `plantedSeeds` is the all-time pomodoro count at the
// moment it went in, so its age (and therefore its stage) is
// earnedNow - plantedSeeds.
let itemSeq = 0;
function item(kind, plantedSeeds, row, col) {
  itemSeq += 1;
  return { id: 'g' + itemSeq, kind, col, row, plantedAt: 1700000000000 + itemSeq, plantedSeeds };
}

// The garden renders on the way into its own tab (and on any refreshStats), so
// every test reaches it the way a user does.
async function mountGarden() {
  const els = await mountApp();
  els.tabGardenBtn.click();
  return els;
}

const shopButtons = (els) => [...els.gardenShop.querySelectorAll('button.shop-item')];
// One parcel is ten plots, five across and two deep, so plot (row, col) belongs
// to parcel floor(row/2)*2 + floor(col/5).
const parcels = (els) => [...els.gardenPlot.querySelectorAll('.parcel')];
const parcel = (els, index) => els.gardenPlot.querySelector('.parcel[data-parcel="' + index + '"]');
const buySign = (els, index) => parcel(els, index).querySelector('.parcel-buy');
const signPrice = (els, index) => {
  const sign = buySign(els, index);
  return sign ? Number(sign.querySelector('.parcel-buy-price').textContent) : null;
};
const shopBtn = (els, kind) => els.gardenShop.querySelector('[data-shop="' + kind + '"]');
const slots = (els) => [...els.gardenPlot.querySelectorAll('button.plot-slot')];
const slot = (els, row, col) =>
  els.gardenPlot.querySelector('[data-row="' + row + '"][data-col="' + col + '"]');
  // The balance is drawn as a coin plus a number, so the words are no longer in
  // the text. Reading it therefore means reading three things, and all three
  // matter: the number a person sees, the coin that tells them it is money, and
  // the label a screen reader gets, which is the only place the word "tokens"
  // still lives.
  const shownTokens = (els) => els.gardenCount.textContent.trim();
  const spokenTokens = (els) => els.gardenCount.getAttribute('aria-label');
  const hasCoin = (el) => !!el.querySelector('svg.coin circle.c-face');

const plants = (els) => [...els.gardenPlot.querySelectorAll('span.plant')];
const stagesOf = (els) => plants(els).map((p) => p.getAttribute('data-stage'));
const blossoms = (p) => p.querySelectorAll('.t-bloom').length;

describe('garden tokens', () => {
  it('earns one seed per completed focus pomodoro, and none for breaks or abandoned work', async () => {
    seedSessions([
      ...pomodoros(3),
      session({ type: 'break', minutes: 10 }),
      session({ status: 'abandoned' })
    ]);
    const els = await mountGarden();
    expect(shownTokens(els)).toBe('3');
    expect(spokenTokens(els)).toBe('3 tokens available');
    expect(hasCoin(els.gardenCount)).toBe(true);
  });

  // Seeds are a view of the session log, not a second balance to keep in sync:
  // nothing is written to the garden key until something is actually bought.
  it('derives the balance from the log rather than storing it', async () => {
    seedSessions(pomodoros(4));
    await mountGarden();
    expect(localStorage.getItem(GARDEN_KEY)).toBeNull();
  });

  it('subtracts what has been spent and says how much is in the ground', async () => {
    seedSessions(pomodoros(10));
    seedGarden({ spent: 4, items: [item('sunflower', 10, 3, 0)] });
    const els = await mountGarden();
    expect(shownTokens(els)).toBe('6');
    expect(spokenTokens(els)).toBe('6 tokens available');
  });

  it('counts a single seed in the singular', async () => {
    seedSessions(pomodoros(1));
    const els = await mountGarden();
    expect(shownTokens(els)).toBe('1');
    // Singular, because one token is one token and the label is read aloud.
    expect(spokenTokens(els)).toBe('1 token available');
  });

  it('invites a first pomodoro when there is nothing to spend and nothing planted', async () => {
    const els = await mountGarden();
    expect(shownTokens(els)).toBe('0');
    expect(spokenTokens(els)).toBe('0 tokens available');
    // Nothing on the stage tells a new player what to do: the shop button and
    // the token readout carry that, on hover. A line of onboarding text
    // standing permanently over the garden is what made the screen hard to
    // read in the first place.
    expect(els.gardenHint.textContent).toBe('');
    expect(plants(els)).toHaveLength(0);
  });

  it('points at the shop once there is something to spend', async () => {
    seedSessions(pomodoros(3));
    const els = await mountGarden();
    expect(els.gardenHint.textContent).toBe('');
    // The guidance lives where it applies — on the shop control, and inside
    // the panel it opens.
    expect(document.getElementById('gardenShopToggle').getAttribute('title'))
      .toBe('Pick something here, then choose a spot for it in the garden.');
    expect(document.querySelector('#gardenShopPanel .shop-panel-note').textContent)
      .toBe('Pick something, then choose a spot for it in the garden.');
  });
});

// The stage is a game screen, so the only text over it is what the player is
// currently doing. Everything explanatory sits on the control it explains.
describe('where the instructions live', () => {
  it('keeps the stage clear of instructions and puts them on the shop instead', async () => {
    seedSessions(pomodoros(50));
    const els = await mountGarden();
    expect(els.gardenHint.textContent).toBe('');

    // Hovering the shop control is where 'pick, then place' is explained.
    expect(document.getElementById('gardenShopToggle').getAttribute('title'))
      .toMatch(/pick something here/i);
    // And how a token is earned is on the token readout, not on the garden.
    expect(els.gardenCount.getAttribute('title')).toMatch(/one finished pomodoro earns one token/i);
  });

  it('speaks up only while something is being carried', async () => {
    seedSessions(pomodoros(50));
    const els = await mountGarden();

    shopBtn(els, 'sunflower').click();
    expect(els.gardenHint.textContent).toMatch(/^Holding Sunflower/);

    slot(els, 0, 0).click();          // put it down
    expect(els.gardenHint.textContent).toBe('');

    slot(els, 0, 0).click();          // pick it up again to move it
    expect(els.gardenHint.textContent).toMatch(/^Moving/);
  });
});

// Each plant carries its own `mature`: the pomodoros from planting to the last
// stage, and for an annual crop, to harvest. One shared schedule was the whole
// problem — an aloe vera that ripened as fast as a rice paddy would pay several
// times its own price every twelve pomodoros, which is the runaway the price
// table exists to prevent.
describe('how long a plant takes', () => {
  it('holds an expensive crop back while a cheap one on the same day is ready', async () => {
    // Both planted at the same moment, both looked at 13 pomodoros later.
    seedSessions(pomodoros(13));
    seedGarden({
      spent: 26, income: 0, basket: {},
      items: [item('rice', 0, 0, 0), item('aloevera', 0, 0, 1)]
    });
    const els = await mountGarden();

    expect(slot(els, 0, 0).querySelector('.plant').getAttribute('data-stage')).toBe('5');
    expect(slot(els, 0, 0).querySelector('.plant').getAttribute('data-ripe')).toBe('1');
    // 13 of the 46 pomodoros aloe vera needs — still on its way, and visibly so.
    expect(slot(els, 0, 1).querySelector('.plant').getAttribute('data-stage')).toBe('2');
    expect(slot(els, 0, 1).querySelector('.plant').getAttribute('data-ripe')).toBeNull();
  });

  it('reaches the last stage exactly on the pomodoro its price bought', async () => {
    seedSessions(pomodoros(46));
    seedGarden({ spent: 48, income: 0, basket: {}, items: [item('aloevera', 0, 0, 0)] });
    const ready = await mountGarden();
    expect(slot(ready, 0, 0).querySelector('.plant').getAttribute('data-stage')).toBe('5');

    localStorage.clear();
    seedSessions(pomodoros(45));
    seedGarden({ spent: 48, income: 0, basket: {}, items: [item('aloevera', 0, 0, 0)] });
    const almost = await mountGarden();
    expect(slot(almost, 0, 0).querySelector('.plant').getAttribute('data-stage')).toBe('4');
  });

  it('pays an annual crop more than it cost, and takes the plant with the harvest', async () => {
    seedSessions(pomodoros(60));
    seedGarden({ spent: 24, income: 0, basket: {}, items: [item('aloevera', 0, 0, 0)] });
    const els = await mountGarden();

    slot(els, 0, 0).click();                       // harvest
    const after = gardenState();
    // Aloe vera costs 24 and its leaves sell for 34: pressing it can never
    // leave you worse off than not having planted it.
    expect(after.basket.aloe).toBe(1);
    expect(after.items).toHaveLength(0);
    expect(slot(els, 0, 0).querySelector('.plant')).toBeNull();
  });

  it('leaves a perennial standing and lets it bear again', async () => {
    seedSessions(pomodoros(80));
    seedGarden({ spent: 46, income: 0, basket: {}, items: [item('apple', 0, 0, 0)] });
    const els = await mountGarden();

    slot(els, 0, 0).click();                       // harvest
    const after = gardenState();
    expect(after.items).toHaveLength(1);
    expect(after.items[0].harvestedSeeds).toBe(80);
    // Still there, and now counting again from scratch rather than ripe.
    expect(slot(els, 0, 0).querySelector('.plant')).toBeTruthy();
    expect(slot(els, 0, 0).querySelector('.plant').getAttribute('data-ripe')).toBeNull();
  });
});

// The one number that decides whether this whole tab keeps meaning anything.
//
// Tokens buy garden items and nothing else, so an item that pays well does not
// make the player rich — it makes the SHOP meaningless, and takes away the thing
// there was to aim for. That failure has already happened here once: maple and
// cypress paid 1.00 token per pomodoro for ever, so one tree doubled your income
// by itself and forty of them multiplied it by forty.
//
// Everything below is measured out of the running app — time to maturity, cycle
// length, sale price, and whether the plant is taken with its harvest — rather
// than read from a copy of the price table, because a test that restates the
// table cannot catch the table being wrong.
describe('the rate every item pays', () => {
  const MIN_RATE = 0.05;   // below this an item is not worth a plot at all
  const MAX_RATE = 0.25;   // above this the shop stops being something to reach

  // One mount, one kind, a hundred copies of it aged 0..99 pomodoros. Reading
  // which ages are at the last stage and which are carrying produce gives both
  // the maturity and the cycle length without the app having to expose either.
  // Returns null for anything with nothing to harvest — an ornament or a pet.
  async function measure(kind, price) {
    localStorage.clear();
    seedSessions(pomodoros(120));
    const copies = [];
    for (let age = 0; age < 100; age += 1) {
      copies.push(item(kind, 120 - age, Math.floor(age / 10), age % 10));
    }
    seedGarden({ spent: 0, income: 0, basket: {}, items: copies });
    const els = await mountGarden();

    const ageOf = (p) => {
      const cell = p.closest('.plot-slot');
      return Number(cell.getAttribute('data-row')) * 10 + Number(cell.getAttribute('data-col'));
    };
    const all = plants(els);
    expect(all).toHaveLength(100);

    const ripe = all.filter((p) => p.getAttribute('data-ripe') === '1').map(ageOf);
    if (ripe.length === 0) return null;
    const grown = all.filter((p) => p.getAttribute('data-stage') === '5').map(ageOf);
    const mature = grown.length ? Math.min(...grown) : 0;
    const ripeAt = Math.min(...ripe);

    // Harvest the youngest ripe one, so it is carrying exactly one unit, then
    // sell the basket: the income is the sale price of a single unit.
    slot(els, Math.floor(ripeAt / 10), ripeAt % 10).click();
    const picked = gardenState();
    expect(Object.values(picked.basket)).toEqual([1]);
    document.getElementById('gardenSellBtn').click();
    const value = gardenState().income;

    // An annual is lifted with its crop, so its plot is empty now.
    const annual = picked.items.length === 99;
    // `ripeAt` is max(mature, cycle), not the cycle — a plant has to be grown
    // AND have waited. So the cycle is measured separately, on copies that have
    // already been harvested once: for those, ripeness depends on nothing but
    // the wait since that harvest.
    const cycle = annual ? mature : await measureCycle(kind);
    expect(cycle).toBeGreaterThan(0);
    return {
      mature, ripeAt, value, annual, cycle,
      rate: annual ? (value - price) / mature : value / cycle
    };
  }

  // A hundred fully grown copies, each harvested a different number of
  // pomodoros ago. The youngest one carrying produce again is the cycle.
  async function measureCycle(kind) {
    localStorage.clear();
    seedSessions(pomodoros(200));
    const copies = [];
    for (let since = 0; since < 100; since += 1) {
      const it = item(kind, 0, Math.floor(since / 10), since % 10);
      it.harvestedSeeds = 200 - since;
      copies.push(it);
    }
    seedGarden({ spent: 0, income: 0, basket: {}, items: copies });
    const els = await mountGarden();
    const ripe = plants(els).filter((p) => p.getAttribute('data-ripe') === '1').map((p) => {
      const cell = p.closest('.plot-slot');
      return Number(cell.getAttribute('data-row')) * 10 + Number(cell.getAttribute('data-col'));
    });
    expect(ripe.length).toBeGreaterThan(0);
    return Math.min(...ripe);
  }

  it('keeps every producing item inside one narrow band, so none of them is the obvious play', async () => {
    const shelf = await mountGarden();
    const priced = shopButtons(shelf).map((b) => ({
      kind: b.getAttribute('data-shop'),
      price: Number(b.querySelector('.shop-price').textContent)
    }));
    expect(priced.length).toBeGreaterThanOrEqual(16);

    const measured = [];
    for (const { kind, price } of priced) {
      const m = await measure(kind, price);
      if (m) measured.push({ kind, price, ...m });
    }

    // Enough of the shop is productive that this is a real sweep rather than an
    // accidentally empty loop.
    expect(measured.length).toBeGreaterThanOrEqual(20);

    expect(measured.filter((m) => m.rate > MAX_RATE).map((m) => m.kind + ' ' + m.rate.toFixed(3)))
      .toEqual([]);
    expect(measured.filter((m) => m.rate < MIN_RATE).map((m) => m.kind + ' ' + m.rate.toFixed(3)))
      .toEqual([]);

    // A crop taken with its harvest must always sell for more than it cost, or
    // pressing it would leave the player worse off for having tended it.
    expect(measured.filter((m) => m.annual && m.value <= m.price).map((m) => m.kind))
      .toEqual([]);

    // And the ladder has to stay worth climbing: the dearest producing item must
    // not pay a worse rate than the cheapest one.
    const byPrice = [...measured].sort((a, b) => a.price - b.price);
    expect(byPrice[byPrice.length - 1].rate).toBeGreaterThanOrEqual(byPrice[0].rate);
  }, 180000);
});

describe('the garden shop', () => {
  it('offers every item at its price', async () => {
    const els = await mountGarden();
    const buttons = shopButtons(els);
    // The roster is data and keeps growing, so what is pinned here is the
    // contract rather than the list: every button carries a kind, a name and a
    // price, and no price is ever blank or zero. A frozen list of kinds only
    // ever fails for the harmless reason that a plant was added.
    expect(buttons.length).toBeGreaterThanOrEqual(16);
    const kinds = buttons.map((b) => b.getAttribute('data-shop'));
    expect(new Set(kinds).size).toBe(kinds.length);
    buttons.forEach((b) => {
      expect(b.querySelector('.shop-name').textContent.trim()).not.toBe('');
      expect(Number(b.querySelector('.shop-price').textContent)).toBeGreaterThan(0);
      expect(b.querySelector('.shop-art svg')).toBeTruthy();
    });

    // The two ends of the ladder are worth pinning, because the whole shape of
    // the shop depends on them: the cheapest thing has to be reachable on the
    // first day, and the dearest has to stay out of reach for a long time.
    const priceOf = (kind) => Number(buttons.find((b) => b.getAttribute('data-shop') === kind)
      .querySelector('.shop-price').textContent);
    expect(Math.min(...buttons.map((b) => Number(b.querySelector('.shop-price').textContent))))
      .toBeLessThanOrEqual(3);
    expect(priceOf('sunflower')).toBe(3);
    expect(priceOf('apple')).toBe(46);
  });

  it('lays the shelf out group by group, in the order the shop reads', async () => {
    const els = await mountGarden();
    const order = [...els.gardenShop.querySelectorAll('.shop-group')].map((g) =>
      [...g.querySelectorAll('.shop-item')].map((b) => b.getAttribute('data-shop')));
    // Buttons never straddle a group, and the flat reading order of the shelf is
    // exactly the groups laid end to end — which is what makes the shop
    // navigable by keyboard in the order it reads on screen.
    expect(order.flat()).toEqual(shopButtons(els).map((b) => b.getAttribute('data-shop')));
    order.forEach((group) => expect(group.length).toBeGreaterThan(0));
  });

  it('dims exactly the items the tokens on hand cannot cover yet', async () => {
    seedSessions(pomodoros(8));
    const els = await mountGarden();
    const locked = shopButtons(els)
      .filter((b) => b.classList.contains('shop-item-locked'))
      .map((b) => b.getAttribute('data-shop'));
    // Read off the prices on screen rather than from a list written down here,
    // so this stays a statement about the RULE — dimmed exactly when the price
    // is out of reach — and not about which plants happen to exist.
    const expected = shopButtons(els)
      .filter((b) => Number(b.querySelector('.shop-price').textContent) > 8)
      .map((b) => b.getAttribute('data-shop'));
    expect(locked.sort()).toEqual(expected.sort());
    // At 8 tokens some things must be reachable and some must not, or the test
    // would pass on an empty shop.
    expect(locked.length).toBeGreaterThan(0);
    expect(locked.length).toBeLessThan(shopButtons(els).length);
  });

  // With crops, fruit trees, flowers, livestock, fish and ornaments all on one
  // shelf, a flat strip stops being browsable — so the shelf is grouped, and a
  // group with nothing in it yet does not appear at all.
  it('sorts the shelf into labelled groups and hides the empty ones', async () => {
    const els = await mountGarden();
    const labels = [...els.gardenShop.querySelectorAll('.shop-group-label')].map((h) => h.textContent);
    // No Ornaments group: the pot, fence, lantern and bench are out of the shop
    // for now, because land is divided into working parcels and an ornament in a
    // bed is a plot that grows nothing.
    expect(labels).toEqual(['Flowers', 'Vegetables & spices', 'Fruit & trees',
      'Special', 'Livestock', 'Fish']);
    // Every button lives inside a group, and every group holds at least one.
    const groups = [...els.gardenShop.querySelectorAll('.shop-group')];
    expect(groups).toHaveLength(labels.length);
    groups.forEach((g) => expect(g.querySelectorAll('.shop-item').length).toBeGreaterThan(0));
    expect(els.gardenShop.querySelectorAll('.shop-group .shop-item')).toHaveLength(
      els.gardenShop.querySelectorAll('.shop-item').length
    );
  });

  it('holds an item when it is pressed, and puts it back when pressed again', async () => {
    seedSessions(pomodoros(5));
    const els = await mountGarden();

    shopBtn(els, 'sunflower').click();
    expect(shopBtn(els, 'sunflower').classList.contains('shop-item-held')).toBe(true);
    expect(shopBtn(els, 'sunflower').getAttribute('aria-pressed')).toBe('true');
    expect(els.gardenPlot.classList.contains('plot-armed')).toBe(true);
    expect(els.gardenHint.textContent)
      .toBe('Holding Sunflower — pick an empty spot to plant it, or press it again to put it back.');

    shopBtn(els, 'sunflower').click();
    expect(els.gardenShop.querySelector('.shop-item-held')).toBeNull();
    expect(shopBtn(els, 'sunflower').getAttribute('aria-pressed')).toBe('false');
    expect(els.gardenPlot.classList.contains('plot-armed')).toBe(false);
  });

  it('swaps the held item rather than stacking a second one', async () => {
    seedSessions(pomodoros(8));
    const els = await mountGarden();

    shopBtn(els, 'sunflower').click();
    shopBtn(els, 'rice').click();
    expect(shopButtons(els)
      .filter((b) => b.classList.contains('shop-item-held'))
      .map((b) => b.getAttribute('data-shop'))).toEqual(['rice']);
  });

  // Pressing something out of reach does nothing at all: no held item, no
  // message. The item stays on the menu at its price and that is the whole
  // response — the alternative is scolding, which is what this card avoids.
  it('silently ignores an item there are not enough seeds for', async () => {
    seedSessions(pomodoros(2));
    const els = await mountGarden();

    shopBtn(els, 'cypress').click();
    expect(els.gardenShop.querySelector('.shop-item-held')).toBeNull();
    expect(els.gardenPlot.classList.contains('plot-armed')).toBe(false);
    expect(els.gardenHint.textContent).toBe('');
  });
});

describe('the garden plot', () => {
  // A flat field, read top to bottom, the way a field is laid out. The old
  // layout stacked tiers with the highest first, which put the oldest and
  // largest row at the bottom of a scroller and filled the top of the screen
  // with sky.
  it('lays the farm out as parcels of ten plots, in reading order', async () => {
    const els = await mountGarden();
    // The four free parcels, plus the one up for sale past them.
    expect(parcels(els)).toHaveLength(5);
    expect(parcels(els).map((p) => p.getAttribute('data-parcel')))
      .toEqual(['0', '1', '2', '3', '4']);
    expect(parcel(els, 0).querySelectorAll('button.plot-slot')).toHaveLength(10);
    expect(els.gardenPlot.classList.contains('plot-field')).toBe(true);

    // Parcel 0 covers rows 0-1 and columns 0-4; parcel 1 is the next five
    // columns of the same two rows. That is what puts a path down the middle.
    const at = (p, n) => parcel(els, p).querySelectorAll('.plot-slot')[n];
    expect(at(0, 0).getAttribute('data-row')).toBe('0');
    expect(at(0, 0).getAttribute('data-col')).toBe('0');
    expect(at(0, 9).getAttribute('data-row')).toBe('1');
    expect(at(0, 9).getAttribute('data-col')).toBe('4');
    expect(at(1, 0).getAttribute('data-col')).toBe('5');
    expect(at(2, 0).getAttribute('data-row')).toBe('2');
  });

  // The field is never a fixed allowance to fill: there is always one more plot
  // for sale past the last one owned, so there is no denominator on screen and
  // therefore no countable gap between what you have and a full garden.
  it('always shows one more parcel than is owned, so the farm never reads as finished', async () => {
    seedSessions(pomodoros(400));
    seedGarden({ spent: 12, parcels: 7, items: [item('oak', 400, 2, 3)] });
    const els = await mountGarden();
    expect(parcels(els)).toHaveLength(8);
    expect(parcel(els, 7).classList.contains('parcel-locked')).toBe(true);
    expect(buySign(els, 7)).not.toBeNull();
    expect(parcel(els, 6).classList.contains('parcel-locked')).toBe(false);
    expect(slot(els, 2, 3).classList.contains('plot-slot-filled')).toBe(true);
  });

  it('keeps a hand-edited store inside the ceiling rather than asking for unbounded DOM', async () => {
    seedSessions(pomodoros(40));
    seedGarden({ spent: 12, parcels: 999999, items: [item('oak', 40, 5000, 3)] });
    const els = await mountGarden();
    // The impossible row is dropped on load and the impossible parcel count is
    // clamped, so a corrupt store can never ask for an unbounded amount of DOM.
    expect(parcels(els)).toHaveLength(40);
    expect(plants(els)).toHaveLength(0);
  });

  it('fills only the plot an item sits in, and labels the empty ones', async () => {
    seedSessions(pomodoros(20));
    seedGarden({ spent: 12, items: [item('oak', 20, 2, 7)] });
    const els = await mountGarden();

    const filled = slots(els).filter((s) => s.classList.contains('plot-slot-filled'));
    expect(filled).toHaveLength(1);
    expect(filled[0]).toBe(slot(els, 2, 7));
    expect(filled[0].querySelector('span.plant').getAttribute('data-kind')).toBe('oak');
    expect(slot(els, 0, 0).getAttribute('aria-label')).toBe('Empty plot, land 1 plot 1');
  });

  it('does nothing when an empty slot is pressed with nothing held', async () => {
    seedSessions(pomodoros(20));
    const els = await mountGarden();

    slot(els, 1, 1).click();
    expect(plants(els)).toHaveLength(0);
    expect(shownTokens(els)).toBe('20');
    expect(localStorage.getItem(GARDEN_KEY)).toBeNull();
  });
});

describe('planting', () => {
  it('plants the held item where it is put down and charges exactly its price', async () => {
    seedSessions(pomodoros(20));
    const els = await mountGarden();

    shopBtn(els, 'oak').click();
    slot(els, 3, 4).click();

    const g = gardenState();
    expect(g.spent).toBe(12);
    expect(g.items).toHaveLength(1);
    expect(g.items[0]).toMatchObject({ kind: 'oak', row: 3, col: 4, plantedSeeds: 20 });
    expect(typeof g.items[0].id).toBe('string');
    expect(g.items[0].plantedAt).toBeGreaterThan(0);

    expect(shownTokens(els)).toBe('8');
    expect(slot(els, 3, 4).classList.contains('plot-slot-filled')).toBe(true);
    // Putting it down releases the cursor.
    expect(els.gardenShop.querySelector('.shop-item-held')).toBeNull();
    expect(els.gardenHint.textContent).toBe(''); // the stage says what you are doing, and you are not doing anything
  });

  it('records the pomodoro count at planting, so a new plant starts at the first stage', async () => {
    seedSessions(pomodoros(30));
    const els = await mountGarden();

    shopBtn(els, 'maple').click();
    slot(els, 3, 0).click();

    const plant = plants(els)[0];
    expect(plant.getAttribute('data-stage')).toBe('1');
    expect(plant.title).toBe('Maple · a seedling · 0 pomodoros since planting');
  });

  it('lets several things be bought one after another, charging each once', async () => {
    seedSessions(pomodoros(20));
    const els = await mountGarden();

    shopBtn(els, 'sunflower').click();
    slot(els, 3, 0).click();
    shopBtn(els, 'rice').click();
    slot(els, 3, 1).click();

    expect(gardenState().spent).toBe(5); // 3 + 2
    expect(gardenState().items.map((i) => i.kind)).toEqual(['sunflower', 'rice']);
    expect(shownTokens(els)).toBe('15');
  });

  it('will not plant on top of something, and charges nothing for the attempt', async () => {
    seedSessions(pomodoros(20));
    seedGarden({ spent: 3, items: [item('sunflower', 20, 3, 2)] });
    const els = await mountGarden();

    shopBtn(els, 'oak').click();
    slot(els, 3, 2).click();

    const g = gardenState();
    expect(g.spent).toBe(3);
    expect(g.items).toHaveLength(1);
    expect(g.items[0].kind).toBe('sunflower');
  });
});

describe('moving what is planted', () => {
  it('picks a plant up and puts it down elsewhere for free', async () => {
    seedSessions(pomodoros(20));
    // Deliberately a young plant: pressing a RIPE one harvests it instead, so
    // moving is the second press. That is covered separately below.
    seedGarden({ spent: 12, items: [item('oak', 18, 1, 3)] });
    const els = await mountGarden();

    slot(els, 1, 3).click();
    expect(slot(els, 1, 3).classList.contains('plot-slot-lifted')).toBe(true);
    expect(els.gardenHint.textContent)
      .toBe('Moving — pick an empty spot to put it down, or press it again to leave it.');

    slot(els, 3, 9).click();

    const g = gardenState();
    expect(g.spent).toBe(12);          // moving is never charged for
    expect(g.items).toHaveLength(1);   // and never duplicates
    expect(g.items[0]).toMatchObject({ row: 3, col: 9, kind: 'oak', plantedSeeds: 18 });
    expect(slot(els, 1, 3).classList.contains('plot-slot-filled')).toBe(false);
    expect(slot(els, 3, 9).classList.contains('plot-slot-filled')).toBe(true);
    expect(els.gardenPlot.querySelector('.plot-slot-lifted')).toBeNull();
  });

  it('leaves a plant where it is when it is pressed a second time', async () => {
    seedSessions(pomodoros(20));
    seedGarden({ spent: 16, items: [item('pine', 18, 2, 2)] });
    const els = await mountGarden();

    slot(els, 2, 2).click();
    slot(els, 2, 2).click();

    expect(els.gardenPlot.querySelector('.plot-slot-lifted')).toBeNull();
    expect(gardenState().items[0]).toMatchObject({ row: 2, col: 2 });
    expect(gardenState().spent).toBe(16);
  });

  it('switches to carrying a different plant when another one is pressed', async () => {
    seedSessions(pomodoros(40));
    seedGarden({ spent: 28, items: [item('oak', 38, 3, 0), item('pine', 38, 3, 1)] });
    const els = await mountGarden();

    slot(els, 3, 0).click();
    slot(els, 3, 1).click();
    expect(slot(els, 3, 0).classList.contains('plot-slot-lifted')).toBe(false);
    expect(slot(els, 3, 1).classList.contains('plot-slot-lifted')).toBe(true);
    expect(gardenState().items.map((i) => i.col)).toEqual([0, 1]);
  });
});

describe('plant growth', () => {
  // Growth is paid for in work done *after* planting, never in elapsed time.
  // GROWTH_STEPS is a set of fractions rather than a set of counts, stretched to
  // each item"s own `mature`; an oak matures in 22 pomodoros, so its five stages
  // begin at 0, 4, 8, 13 and 22.
  it('takes a plant through the five stages on pomodoros completed since planting', async () => {
    seedSessions(pomodoros(22));
    seedGarden({
      spent: 60,
      items: [
        item('oak', 22, 3, 0), // age 0
        item('oak', 18, 3, 1), // age 4
        item('oak', 14, 3, 2), // age 8
        item('oak', 9, 3, 3),  // age 13
        item('oak', 0, 3, 4)   // age 22
      ]
    });
    const els = await mountGarden();
    expect(stagesOf(els)).toEqual(['1', '2', '3', '4', '5']);
    // A ripe plant appends what is waiting to be taken, so the stage words are
    // checked as a prefix rather than the whole string.
    expect(plants(els).map((p) => p.title.split(' since planting')[0] + ' since planting')).toEqual([
      'Oak · a seedling · 0 pomodoros since planting',
      'Oak · a sapling · 4 pomodoros since planting',
      'Oak · a young plant · 8 pomodoros since planting',
      'Oak · a full plant · 13 pomodoros since planting',
      'Oak · in bloom · 22 pomodoros since planting'
    ]);
  });

  // .plant-growing is the class the CSS animates, so it has to land on
  // everything that still has somewhere to go: nothing here is ever rendered as
  // the plant that stalled, only ones on their way and ones that arrived.
  it('marks everything below the last stage as still growing, and nothing at it', async () => {
    seedSessions(pomodoros(22));
    seedGarden({
      spent: 36,
      items: [item('oak', 22, 3, 0), item('oak', 9, 3, 1), item('oak', 0, 3, 2)]
    });
    const els = await mountGarden();
    expect(plants(els).map((p) => p.classList.contains('plant-growing'))).toEqual([true, true, false]);
  });

  // Stage tops out at five and further work becomes blossoms, capped: a long
  // streak reads as lush rather than as a bigger number, and there is never a
  // stage counter or target on screen to fall short of.
  // Fruit is no longer a function of age: it is what is ripe and waiting. A
  // mature plant carries fruit once `every` pomodoros have passed since its last
  // harvest, and carrying more of it never becomes a shortfall — an unripe plant
  // simply draws none.
  // Oak ripens every 24 pomodoros and credits one unit per full cycle waited,
  // so the drawing never promises more than harvesting gives. Nine cycles is
  // the cap: the plot is for tending, not for hoarding.
  it('carries one unit per cycle waited once it is ripe, up to a cap', async () => {
    seedSessions(pomodoros(320));
    seedGarden({
      spent: 36,
      items: [
        item('oak', 320 - 23, 3, 0),  // 23 since planting: mature but not yet ripe
        item('oak', 320 - 24, 3, 1),  // exactly one cycle
        item('oak', 320 - 100, 3, 2), // four cycles
        item('oak', 320, 3, 3)        // planted just now
      ]
    });
    const els = await mountGarden();
    const counts = plants(els).map(blossoms);
    expect(counts[0]).toBe(0);   // mature, nothing to take yet
    expect(counts[1]).toBe(1);
    expect(counts[2]).toBe(4);
    expect(counts[3]).toBe(0);   // a seedling carries nothing
    expect(plants(els)[1].classList.contains('plant-ripe')).toBe(true);
    expect(plants(els)[0].classList.contains('plant-ripe')).toBe(false);
  });

  it('stops banking fruit at nine cycles', async () => {
    seedSessions(pomodoros(400));
    seedGarden({ spent: 12, items: [item('oak', 0, 3, 0)] });
    const els = await mountGarden();
    expect(blossoms(plants(els)[0])).toBe(9);
  });

  it('leaves a mature plant bare again in the pomodoros after it is harvested', async () => {
    seedSessions(pomodoros(42));
    seedGarden({ spent: 12, items: [item('oak', 0, 3, 0)] });
    const els = await mountGarden();
    expect(plants(els)[0].classList.contains('plant-ripe')).toBe(true);

    slot(els, 3, 0).click();                         // pressing a ripe plant harvests it

    expect(plants(els)[0].classList.contains('plant-ripe')).toBe(false);
    expect(blossoms(plants(els)[0])).toBe(0);
    expect(gardenState().basket).toEqual({ acorn: 1 });
    expect(gardenState().items).toHaveLength(1);     // the plant itself is untouched
    expect(gardenState().items[0]).toMatchObject({ row: 3, col: 0, kind: 'oak' });
    expect(gardenState().spent).toBe(12);            // and harvesting costs nothing
  });

  it('gives a plant below the last stage no blossoms at all', async () => {
    seedSessions(pomodoros(21));
    seedGarden({ spent: 12, items: [item('oak', 0, 3, 0)] });
    const els = await mountGarden();
    expect(stagesOf(els)).toEqual(['4']);
    expect(blossoms(plants(els)[0])).toBe(0);
  });

  it('grows the plant that is already there when later pomodoros land', async () => {
    seedSessions(pomodoros(12));
    const els = await mountGarden();

    shopBtn(els, 'sakura').click();
    slot(els, 3, 5).click();
    expect(stagesOf(els)).toEqual(['1']);

    seedSessions(pomodoros(30));
    els.tabTimerBtn.click();
    els.tabGardenBtn.click();

    expect(stagesOf(els)).toEqual(['5']); // 18 pomodoros since planting, which is a cherry
    expect(plants(els)).toHaveLength(1);  // it grew, it did not become a second plant
    expect(gardenState().spent).toBe(8);  // and growing costs nothing
  });

  it('draws every plant as a real drawing rather than a coloured box', async () => {
    seedSessions(pomodoros(20));
    seedGarden({ spent: 23, items: [item('sunflower', 0, 3, 0), item('birch', 18, 3, 1)] });
    const els = await mountGarden();
    plants(els).forEach((p) => {
      const svg = p.querySelector('svg.plant-svg');
      expect(svg).not.toBeNull();
      expect(svg.querySelectorAll('.t-shadow')).toHaveLength(1);
      expect(svg.querySelectorAll('.t-base, .t-deep, .t-light, .t-stem').length).toBeGreaterThan(1);
    });
  });
});

// The pot, fence, lantern and bench are out of the shop for the moment: land is
// divided into working parcels — beds, pens and ponds — and an ornament taking a
// plot in a bed is a plot that grows nothing. They come back when there is
// somewhere for them to stand.
describe('ornaments, while they are out of the shop', () => {
  it('offers none of them for sale', async () => {
    seedSessions(pomodoros(60));
    const els = await mountGarden();
    const kinds = shopButtons(els).map((b) => b.getAttribute('data-shop'));
    ['pot', 'fence', 'lantern', 'bench'].forEach((kind) => {
      expect(kinds).not.toContain(kind);
      expect(shopBtn(els, kind)).toBeNull();
    });
  });

  it('keeps one that was already planted in storage, and simply does not draw it', async () => {
    seedSessions(pomodoros(60));
    const planted = {
      spent: 50, income: 0, basket: {},
      items: [item('bench', 0, 0, 0), item('rice', 0, 0, 1)]
    };
    seedGarden(planted);
    const els = await mountGarden();

    // Taking a row out of the price table must never destroy what somebody
    // built. The bench is still in the store, exactly as saved; it just has
    // nothing to draw with, so its plot reads as empty for now.
    expect(plants(els).map((p) => p.getAttribute('data-kind'))).toEqual(['rice']);
    expect(slot(els, 0, 0).classList.contains('plot-slot-filled')).toBe(false);
    expect(gardenState().items).toHaveLength(2);
    expect(gardenState().items.map((it) => it.kind)).toEqual(['bench', 'rice']);
  });
});

describe('rules the garden exists to keep', () => {
  // docs/motivation-evidence.md: a reward rendered as the gap you failed to
  // close is the worst-performing design in the reward literature. A price is a
  // menu and is fine; "you need 24 more seeds" is not, and appears nowhere.
  it('never renders a shortfall, only prices', async () => {
    seedSessions(pomodoros(2)); // almost everything on screen is out of reach
    const els = await mountGarden();

    expect(shopButtons(els).filter((b) => b.classList.contains('shop-item-locked')).length)
      .toBeGreaterThan(5);
    expect(els.viewGarden.textContent).not.toMatch(/need|short|more seeds|not enough|locked/i);
    // The prices themselves are still there to save toward.
    expect(shopButtons(els).map((b) => b.querySelector('.shop-price').textContent)).toContain('28');
  });

  // docs/motivation-evidence.md: every seed earned stays earned. Resetting
  // statistics (or any other shrinking of the log) must never leave a debt on
  // screen, and must never take back what was already planted.
  it('never shows a negative balance when the log shrinks after spending', async () => {
    seedSessions(pomodoros(5));
    const els = await mountGarden();

    shopBtn(els, 'sunflower').click();
    slot(els, 3, 0).click();
    expect(gardenState().spent).toBe(3);

    localStorage.removeItem(KEYS.sessions);
    const after = await mountGarden();

    expect(shownTokens(after)).toBe('0');
    expect(gardenState().items).toHaveLength(1);
    expect(plants(after)).toHaveLength(1);
    expect(after.viewGarden.textContent).not.toMatch(/-\d/);
  });

  // docs/motivation-evidence.md: nothing wilts, nothing decays, nothing charges
  // upkeep. A month away leaves the garden exactly as it was left.
  it('changes nothing at all after a long gap in the session dates', async () => {
    seedSessions(pomodoros(8, { date: daysAgoKey(400) }));
    const planted = { spent: 12, items: [item('oak', 0, 1, 1)] };
    seedGarden(planted);

    const before = await mountGarden();
    expect(stagesOf(before)).toEqual(['3']); // 8 pomodoros since planting
    expect(shownTokens(before)).toBe('0');

    const after = await mountGarden();
    expect(stagesOf(after)).toEqual(['3']);
    expect(shownTokens(after)).toBe('0');
    expect(gardenState()).toEqual(planted);
    expect(after.gardenHint.textContent).toBe('');
  });

  // There is no sell, no refund and no clear: the only two actions are buy and
  // move, so the garden can only ever accumulate.
  it('offers no way to remove or refund anything', async () => {
    seedSessions(pomodoros(20));
    seedGarden({ spent: 12, items: [item('oak', 0, 3, 0)] });
    const els = await mountGarden();

    expect(els.viewGarden.querySelectorAll('[data-sell], [data-remove], .garden-sell')).toHaveLength(0);
    expect(els.viewGarden.textContent).not.toMatch(/sell|refund|remove|dig up|uproot/i);
  });
});

// The three ornaments that are alive: two pets and a pond with fish in it.
// They are decor as far as the model is concerned (grows:false), and the point
// of covering them apart from the others is that "alive" is exactly where a
// garden card usually grows a care mechanic — see the last test in this block.
describe('pets and the pond', () => {
  // The pond is no longer among them, because a pond is not a thing you buy —
  // it is land, and it becomes a pond when a fish goes in it. A carp stands in
  // for it here: the stock, not the place.
  const PETS = [
    ['cat', 'Cat', 26],
    ['dog', 'Dog', 30],
    ['carp', 'Carp', 26]
  ];

  it('draws each of them as a real drawing, in its slot and on the shop shelf', async () => {
    seedSessions(pomodoros(100));
    seedGarden({
      spent: 92,
      items: [item('cat', 100, 3, 0), item('dog', 100, 3, 1), item('carp', 100, 3, 2)]
    });
    const els = await mountGarden();

    const drawn = plants(els);
    expect(drawn.map((p) => p.getAttribute('data-kind'))).toEqual(['cat', 'dog', 'carp']);
    drawn.forEach((p) => {
      const svg = p.querySelector('svg.plant-svg');
      expect(svg).not.toBeNull();
      expect(svg.getAttribute('viewBox')).toBe('0 0 60 96');
      expect(svg.querySelectorAll('.t-shadow')).toHaveLength(1);
      // A drawing, not one blob: several shapes inside the animated body.
      expect(svg.querySelectorAll('.plant-body *').length).toBeGreaterThan(3);
    });

    PETS.forEach(([kind]) => {
      expect(shopBtn(els, kind).querySelector('.shop-art svg.plant-svg')).not.toBeNull();
    });
  });

  // The groups exist so the CSS can move one part without the rest sliding: the
  // dog walks on its legs and wags, the cat sits and flicks, the fish swim
  // inside a still pond.
  // Rewritten for the group contract every animal now shares. It used to look for
  // `g.pet-walk` / `g.pet-sit` / `g.pet-tail`, which were per-animal names — so
  // each animal had its own rig and the movement code had to know which. One
  // structure for all of them is what lets a single walk cycle drive the lot.
  it('gives every animal the same rig, with the shadow outside the bounce', async () => {
    // Old enough that all of them are full grown.
    seedSessions(pomodoros(400));
    seedGarden({
      spent: 200,
      items: [item('cow', 0, 3, 0), item('cow', 0, 3, 1), item('cow', 0, 3, 2)]
    });
    let els = await mountGarden();

    for (const col of [0, 1, 2]) {
      const a = slot(els, 3, col).querySelector('span.plant');
      expect(a.querySelectorAll('g.stock-bob')).toHaveLength(1);
      expect(a.querySelectorAll('g.stock-ink')).toHaveLength(1);
      expect(a.querySelectorAll('g.stock-head')).toHaveLength(1);
      expect(a.querySelectorAll('g.a-leg-a')).toHaveLength(1);
      expect(a.querySelectorAll('g.a-leg-b')).toHaveLength(1);
      // The outline wraps the parts, so a leg is inside it, not beside it.
      expect(a.querySelector('g.stock-ink g.a-leg-a')).not.toBeNull();
      expect(a.querySelector('g.stock-ink g.stock-head')).not.toBeNull();
      // And the cast shadow is NOT inside the bob. A shadow that bounces with
      // the animal is the single mistake that undoes the whole effect, and it is
      // invisible in code review.
      const shadow = a.querySelector('.t-s-shade');
      expect(shadow).not.toBeNull();
      expect(shadow.closest('g.stock-bob')).toBeNull();
    }

    // Nothing the CSS animates may carry its own SVG transform attribute: a CSS
    // transform REPLACES the attribute rather than composing with it, so such a
    // group would silently lose its placement the moment it animated.
    const animated = els.gardenPlot.querySelectorAll(
      'g.stock-bob, g.stock-swim, g.stock-head, g.a-leg-a, g.a-leg-b, g.stock-tail');
    expect(animated.length).toBeGreaterThan(0);
    for (const g of animated) expect(g.hasAttribute('transform')).toBe(false);

    // A fish swims instead of walking, and has no legs to swing.
    localStorage.clear();
    seedSessions(pomodoros(400));
    seedGarden({ spent: 100, items: [item('carp', 0, 3, 0)] });
    els = await mountGarden();
    const fish = slot(els, 3, 0).querySelector('span.plant');
    expect(fish.querySelectorAll('g.stock-swim')).toHaveLength(1);
    expect(fish.querySelectorAll('g.a-leg-a, g.a-leg-b')).toHaveLength(0);
  });

  // This used to assert the opposite — that an animal never has a stage. It was
  // changed on purpose: an animal that arrives full grown was never raised, and
  // it also gave livestock the cheapest rate on the farm, because it started
  // producing the moment it was bought.
  it('raises an animal from young to full grown, and pays nothing until it is', async () => {
    // Two pomodoros old: every one of them is a long way from its `mature`.
    seedSessions(pomodoros(2));
    seedGarden({
      spent: 92,
      items: [item('cat', 0, 3, 0), item('dog', 0, 3, 1), item('carp', 0, 3, 2)]
    });
    let els = await mountGarden();

    let drawn = plants(els);
    expect(drawn).toHaveLength(3);
    drawn.forEach((p) => {
      expect(Number(p.getAttribute('data-stage'))).toBeLessThan(5);
      expect(p.classList.contains('stock-young')).toBe(true);
      // A young animal is drawn smaller, and the drawing is what says so.
      // ART_SCALE is 1.34, so a full grown animal draws at scale(1.340 1.340).
      // A young one has the stage ramp multiplied in, which puts it strictly
      // below that — this is the assertion that caught the newborn animal being
      // drawn at full size.
      const drewAt = /scale\(([\d.]+) [\d.]+\)/.exec(p.innerHTML);
      expect(drewAt).not.toBeNull();
      expect(Number(drewAt[1])).toBeLessThan(1.34);
      expect(Number(drewAt[1])).toBeGreaterThan(0.5);
      // Sways are for plants. A swaying cow is a cow in a gale.
      expect(p.classList.contains('plant-growing')).toBe(false);
    });
    // Nothing to collect off an animal that is not grown up, and nothing that
    // says there is: no ripe marker, no harvest wording.
    drawn.forEach((p) => {
      expect(p.hasAttribute('data-ripe')).toBe(false);
      expect(p.title).not.toMatch(/ready — press to harvest/);
    });
    expect(els.gardenPlot.querySelectorAll('circle.t-yield')).toHaveLength(0);

    // Long enough for all three to be full grown, and for the pond to have run
    // several of its cycles.
    localStorage.clear();
    seedSessions(pomodoros(400));
    seedGarden({
      spent: 92,
      items: [item('cat', 0, 3, 0), item('dog', 0, 3, 1), item('carp', 0, 3, 2)]
    });
    els = await mountGarden();

    drawn = plants(els);
    expect(drawn).toHaveLength(3);
    drawn.forEach((p) => {
      expect(p.getAttribute('data-stage')).toBe('5');
      expect(p.classList.contains('stock-young')).toBe(false);
      expect(p.classList.contains('pl-decor')).toBe(true);
      // No plant vocabulary on an animal, whatever stage it is at.
      expect(p.title).not.toMatch(/seedling|sapling|full plant|in bloom|since planting/);
    });
    // The name still reads off the front, and only the producing one is ripe.
    expect(drawn.map((p) => p.title.split(' · ')[0])).toEqual(PETS.map(([, name]) => name));
    const ripe = drawn.filter((p) => p.hasAttribute('data-ripe'));
    expect(ripe).toHaveLength(1);
    expect(ripe[0].getAttribute('data-kind')).toBe('carp');
  });

  it('grows an animal through every stage in order as the work lands', async () => {
    // The cow is the slowest of them, so it is the one that shows every step.
    const seen = [];
    for (const done of [0, 6, 11, 16, 30]) {
      localStorage.clear();
      seedSessions(pomodoros(done));
      seedGarden({ spent: 34, items: [item('cow', 0, 3, 0)] });
      const els = await mountGarden();
      seen.push(plants(els)[0].getAttribute('data-stage'));
    }
    // Monotonic, and it does reach the top: a ramp that never arrives would
    // pass a "grows" test while never paying out.
    expect(seen).toEqual([...seen].sort());
    // Never stage 1. That is bare soil with a seed under it, which is the right
    // picture for a crop and the wrong one for something you bought alive.
    expect(seen[0]).toBe('2');
    expect(seen[seen.length - 1]).toBe('5');
    expect(seen).not.toContain('1');
  });

  it('charges each one like anything else, and then moves it for free', async () => {
    for (const [kind, , price] of PETS) {
      localStorage.clear();
      seedSessions(pomodoros(40));
      const els = await mountGarden();

      shopBtn(els, kind).click();
      slot(els, 2, 0).click();
      expect(gardenState().spent).toBe(price);
      expect(shownTokens(els)).toBe(String(40 - price));

      slot(els, 2, 0).click();
      slot(els, 2, 6).click();
      expect(gardenState().spent).toBe(price);
      expect(gardenState().items).toHaveLength(1);
      expect(gardenState().items[0]).toMatchObject({ kind: kind, row: 2, col: 6 });
    }
  });

  // Every shape in a drawing takes its fill from a `t-*` class in the
  // stylesheet, so a mistyped tone paints nothing at all — and jsdom, which
  // paints nothing anyway, would never notice. A part with no tone renders as
  // `t-undefined`, which is the fingerprint to look for.
  it('renders no tone unfilled', async () => {
    seedSessions(pomodoros(400));
    // Grouped as the parcels require: pets share one pen, the chicken and the
    // cow get their own, and the pond is its own kind of land.
    seedGarden({
      spent: 0, income: 0, basket: {}, parcels: 8,
      items: [
        item('dog', 0, 0, 0), item('cat', 0, 0, 1),
        item('chicken', 0, 2, 0), item('cow', 0, 2, 5), item('carp', 0, 4, 0)
      ]
    });
    const els = await mountGarden();

    const drawn = plants(els);
    expect(drawn).toHaveLength(5);
    // Every shape carries a tone class, and every tone class is one the
    // stylesheet actually fills — an unstyled shape renders as black.
    drawn.forEach((p) => {
      const shapes = [...p.querySelectorAll('path, circle, ellipse, rect')];
      expect(shapes.length).toBeGreaterThan(0);
      shapes.forEach((shape) => {
        expect(shape.getAttribute('class')).toMatch(/\S/);
      });
    });
  });

  // docs/motivation-evidence.md: an animal that decays without attention is a
  // punishment mechanic dressed up as cuteness — the same free-choice loss the
  // rest of this card is built to avoid. So a pet is never fed, never hungry,
  // never sad and never dying: it is bought once and it is simply there.
  it('never says a pet is fed, hungry, sad or dying', async () => {
    seedSessions(pomodoros(5, { date: daysAgoKey(300) })); // 300 days untended
    seedGarden({
      spent: 92,
      items: [item('cat', 0, 3, 0), item('dog', 0, 3, 1), item('carp', 0, 3, 2)]
    });
    const els = await mountGarden();

    const forbidden = /\b(feed|feeds|feeding|fed|hungry|hunger|starving|thirsty|sad|unhappy|lonely|neglected|sick|dying|dies|died|dead)\b/i;
    expect(els.viewGarden.textContent).not.toMatch(forbidden);
    expect(els.gardenPlot.innerHTML).not.toMatch(forbidden);
    expect(els.gardenShop.innerHTML).not.toMatch(forbidden);
    // And no affordance to care for one, either.
    expect(els.viewGarden.querySelectorAll('[data-feed], [data-care], .pet-hungry, .pet-mood'))
      .toHaveLength(0);
    // Three hundred days away, and the pets are exactly as they were left.
    // Cat and dog are companions with nothing to harvest, so the only thing that
    // can follow their name is how grown up they are. Checked as a whitelist
    // rather than as a bare string, because the point of this test is that no
    // word about need or mood ever appears — not that the title never grows.
    expect(plants(els).map((p) => p.title.split(' · ')[0])).toEqual(['Cat', 'Dog', 'Carp']);
    const allowedAfterName = ['newborn', 'growing', 'nearly grown', 'full grown'];
    for (const p of plants(els).slice(0, 2)) {
      const rest = p.title.split(' · ').slice(1);
      for (const part of rest) expect(allowedAfterName).toContain(part);
    }
    expect(els.gardenHint.textContent).toBe(''); // the stage says what you are doing, and you are not doing anything
  });
});

// GARDEN_MIN_TIERS = 4, GARDEN_TIER_HEADROOM = 2, GARDEN_MAX_TIERS = 200
// (js/app.js). The plot is not an allowance to fill: it keeps empty tiers above
// the highest one used, so there is never a denominator on screen.
// A garden has beds, a lawn, a pond and a path in it — not one surface with
// everything standing on it. Before this, a cow was kept in a vegetable bed and
// the fish pond read as a puddle in a flowerbed, because every plot was soil.
describe('what the plot under a thing is made of', () => {
  const groundOf = (els, row, col) =>
    [...slot(els, row, col).classList].filter((c) => c.startsWith('plot-ground-'));

  it('gives soil to what grows, a yard to animals and water to the pond', async () => {
    seedSessions(pomodoros(400));
    // Grouped the way the parcels require: a bed of crops, a pen of cows, a pen
    // shared by the dog and cat, and a pond.
    seedGarden({
      spent: 0, income: 0, basket: {}, parcels: 8,
      items: [
        item('rice', 0, 0, 0),      // a crop
        item('apple', 0, 0, 1),     // a fruit tree
        item('rose', 0, 0, 2),      // a flower
        item('ginseng', 0, 0, 3),   // the special one
        item('cow', 0, 2, 0),       // a pen of its own
        item('chicken', 0, 2, 5),   // and another
        item('dog', 0, 4, 0),       // pets share
        item('cat', 0, 4, 1),
        item('carp', 0, 4, 5)       // a fish makes its parcel a pond
      ]
    });
    const els = await mountGarden();

    expect(groundOf(els, 0, 0)).toEqual(['plot-ground-soil']);
    expect(groundOf(els, 0, 1)).toEqual(['plot-ground-soil']);
    expect(groundOf(els, 0, 2)).toEqual(['plot-ground-soil']);
    expect(groundOf(els, 0, 3)).toEqual(['plot-ground-soil']);

    expect(groundOf(els, 2, 0)).toEqual(['plot-ground-yard']);
    expect(groundOf(els, 2, 5)).toEqual(['plot-ground-yard']);
    expect(groundOf(els, 4, 0)).toEqual(['plot-ground-yard']);
    expect(groundOf(els, 4, 1)).toEqual(['plot-ground-yard']);

    expect(groundOf(els, 4, 5)).toEqual(['plot-ground-water']);
  });

  it('leaves an untouched plot with no material of its own', async () => {
    seedSessions(pomodoros(20));
    const els = await mountGarden();
    // An empty plot is not "soil that failed to grow anything" — it is simply a
    // plot, and it is styled on its own terms.
    expect(groundOf(els, 0, 0)).toEqual([]);
  });

  it('changes the ground when the thing standing on it moves away', async () => {
    seedSessions(pomodoros(200));
    const els = await mountGarden();

    shopBtn(els, 'carp').click();
    slot(els, 0, 5).click();
    expect(groundOf(els, 0, 5)).toEqual(['plot-ground-water']);

    slot(els, 0, 5).click();           // pick the fish up
    slot(els, 0, 6).click();           // put it down one plot over, same parcel
    expect(groundOf(els, 0, 5)).toEqual([]);
    expect(groundOf(els, 0, 6)).toEqual(['plot-ground-water']);
  });
});

// Land is the thing you buy, and the reason this section exists at all: tokens
// had exactly one sink — the shop — and one of everything costs a few hundred.
// After that there was nothing left to aim for, and tiers appeared for free,
// so the field grew without ever being earned.
// Land is sold by the parcel — ten plots at a time, in order, from a sign on the
// next one along. It exists because tokens had exactly one sink, the shop, and
// one of everything costs a few hundred; after that there was nothing left to aim
// for. Parcels rather than single plots because the parcel is also what gives the
// screen its structure: blocks of land with paths between them.
describe('opening new land', () => {
  it('gives the first four parcels away and puts exactly one up for sale', async () => {
    seedSessions(pomodoros(60));
    const els = await mountGarden();

    // Forty free plots — the same land the version before this gave away, so
    // nobody loses ground they were already using.
    for (let p = 0; p < 4; p += 1) {
      expect(parcel(els, p).classList.contains('parcel-locked')).toBe(false);
      expect(buySign(els, p)).toBeNull();
      expect(parcel(els, p).querySelectorAll('.plot-slot')).toHaveLength(10);
    }
    // And exactly one for sale: one thing to aim for at a time.
    expect(parcel(els, 4).classList.contains('parcel-locked')).toBe(true);
    // A parcel is ten plots, so it is priced like one of the dearer plants
    // rather than like a single plot: 24 + 16 per parcel already bought.
    expect(signPrice(els, 4)).toBe(40);
    expect(parcel(els, 5)).toBeNull();
    expect(els.gardenPlot.querySelectorAll('.parcel-buy')).toHaveLength(1);
  });

  it('buys the parcel when its sign is pressed, and moves the sale on by one', async () => {
    seedSessions(pomodoros(60));
    const els = await mountGarden();

    buySign(els, 4).click();
    expect(gardenState().parcels).toBe(5);
    expect(gardenState().spent).toBe(40);
    expect(shownTokens(els)).toBe('20');

    // What was bought is ordinary land now, with ten plots on it, and the next
    // one along costs more.
    expect(parcel(els, 4).classList.contains('parcel-locked')).toBe(false);
    expect(parcel(els, 4).querySelectorAll('.plot-slot')).toHaveLength(10);
    expect(signPrice(els, 5)).toBe(56);
  });

  it('opens the farm parcel by parcel, each one dearer than the last', async () => {
    seedSessions(pomodoros(600));
    const els = await mountGarden();

    const paid = [];
    for (let n = 4; n < 9; n += 1) {
      paid.push(signPrice(els, n));
      buySign(els, n).click();
    }
    expect(paid).toEqual([40, 56, 72, 88, 104]);
    expect(gardenState().parcels).toBe(9);
    expect(gardenState().spent).toBe(360);
  });

  it('ignores the sign in silence when the price is out of reach', async () => {
    seedSessions(pomodoros(4));
    const els = await mountGarden();

    // Four tokens against a price of forty. Dimmed and still priced — never
    // "you need thirty-six more", which is the same rule the shop follows.
    expect(buySign(els, 4).classList.contains('parcel-buy-costly')).toBe(true);
    expect(signPrice(els, 4)).toBe(40);

    buySign(els, 4).click();
    expect(localStorage.getItem(GARDEN_KEY)).toBeNull();
    expect(shownTokens(els)).toBe('4');
    expect(els.gardenHint.textContent).toBe('');
  });

  it('never renders how far short of the next parcel the tokens are', async () => {
    seedSessions(pomodoros(3));
    await mountGarden();
    const text = document.getElementById('gardenStage').textContent;
    expect(text).not.toMatch(/\bmore\b/i);
    expect(text).not.toMatch(/\bneed\b/i);
    expect(text).not.toMatch(/\bshort\b/i);
    expect(text).not.toMatch(/\d+\s*\/\s*\d+/);
  });

  it('refuses to plant on land it has not opened, and charges nothing for trying', async () => {
    seedSessions(pomodoros(200));
    const els = await mountGarden();

    // Parcel 4 is drawn — it is the visible edge of the farm — but it is not
    // opened, and it has no plots to press. Land is bought from its sign and
    // nowhere else, so there is exactly one way to do it.
    expect(parcel(els, 4).querySelectorAll('.plot-slot')).toHaveLength(0);

    shopBtn(els, 'sunflower').click();
    slot(els, 0, 0).click();
    expect(plants(els)).toHaveLength(1);
    expect(gardenState().spent).toBe(3);
  });

  it('grandfathers in a garden saved before land had to be bought', async () => {
    seedSessions(pomodoros(400));
    // No `parcels` at all, and a plant on row 7 — land this version charges for.
    // Charging retroactively, or hiding the plant behind land the player now has
    // to buy, would both be theft.
    seedGarden({ spent: 12, income: 0, basket: {}, items: [item('oak', 0, 7, 3)] });
    const els = await mountGarden();

    expect(plants(els)).toHaveLength(1);
    expect(slot(els, 7, 3).classList.contains('plot-slot-filled')).toBe(true);
    // Row 7, column 3 is parcel 6, so parcels 0-6 are owned and 7 is for sale.
    expect(parcel(els, 6).classList.contains('parcel-locked')).toBe(false);
    expect(parcel(els, 7).classList.contains('parcel-locked')).toBe(true);
    expect(gardenState().spent).toBe(12);
  });

  it('migrates the short-lived per-plot count without losing part of a parcel', async () => {
    seedSessions(pomodoros(400));
    // A garden saved by the version that sold single plots. 55 plots is five and
    // a half parcels, and half a parcel is not a thing — so it rounds UP.
    seedGarden({ spent: 40, income: 0, basket: {}, plots: 55, items: [] });
    const els = await mountGarden();
    expect(parcels(els)).toHaveLength(7);        // 6 owned, 1 for sale
    expect(parcel(els, 5).classList.contains('parcel-locked')).toBe(false);
    expect(parcel(els, 6).classList.contains('parcel-locked')).toBe(true);
  });

  it('stops selling land at the ceiling instead of asking for unbounded DOM', async () => {
    // Bought with sale income rather than a huge seeded session log, which
    // overruns the storage quota jsdom gives a test.
    seedSessions(pomodoros(50));
    seedGarden({ spent: 0, income: 40000, basket: {}, parcels: 40, items: [] });
    const els = await mountGarden();

    expect(parcels(els)).toHaveLength(40);
    expect(slots(els)).toHaveLength(400);
    expect(els.gardenPlot.querySelector('.parcel-buy')).toBeNull();
  }, 60000);

  // Every plot carries its own animation offset, so a wide farm sways in waves
  // rather than as one rigid sheet.
  it('staggers the sway delay from plot to plot', async () => {
    seedSessions(pomodoros(60));
    const els = await mountGarden();

    const delays = slots(els).map((s) => s.style.getPropertyValue('--sway-delay'));
    expect(delays).toHaveLength(40);
    delays.forEach((d) => expect(d).toMatch(/^-?[\d.]+s$/));
    expect(new Set(delays).size).toBeGreaterThan(1);
  });
});
