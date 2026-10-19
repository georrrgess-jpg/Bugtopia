// Market order generation. Orders only ever ask for items the player can
// produce, and never for more than storage can hold, so they are always
// achievable.

import { ITEMS, ITEM_IDS } from '../data/items.js';
import { ORDER_SLOTS } from '../config.js';
import { capacityPerItem, itemObtainable, round5 } from './rules.js';
import { random, randInt, pick } from './rng.js';

// Hand-written introductory orders, issued once each as soon as their item
// becomes obtainable.
export const STORY_ORDERS = [
  { story: 'story-moss', item: 'mossFiber', qty: 10, reward: 45, client: 'Toadstool Teahouse' },
  { story: 'story-nectar', item: 'nectarDrop', qty: 8, reward: 65, client: 'Cricket Bakery' },
  { story: 'story-weave', item: 'nectarWeave', qty: 3, reward: 130, client: 'The Ladybug Tailors' },
];

const CLIENTS = [
  'Toadstool Teahouse',
  'Cricket Bakery',
  'The Ladybug Tailors',
  'Mayor Beetle',
  'Old Snail Tuck',
  'Moth Lantern Co.',
  'Professor Pillbug',
  'Dewdrop Inn',
  'Firefly Choir',
  'Rootcellar Library',
];

const ORDER_SHAPES = {
  mossFiber: { weight: 3, min: 8, max: 14, perTier: 3 },
  nectarDrop: { weight: 3, min: 5, max: 9, perTier: 2 },
  nectarWeave: { weight: 4, min: 2, max: 4, perTier: 1 },
};

export function orderSlots(state) {
  const kinds = ITEM_IDS.filter((id) => itemObtainable(state, id)).length;
  return Math.min(ORDER_SLOTS, 1 + kinds);
}

export function generateOrder(state) {
  const id = `o${state.nextId++}`;
  const cap = capacityPerItem(state);

  const story = STORY_ORDERS.find(
    (o) => !state.market.storyIssued.includes(o.story) && itemObtainable(state, o.item),
  );
  if (story) {
    state.market.storyIssued.push(story.story);
    return { id, item: story.item, qty: Math.min(story.qty, cap), reward: story.reward, client: story.client };
  }

  const options = ITEM_IDS.filter((itemId) => itemObtainable(state, itemId) && ORDER_SHAPES[itemId]);
  const totalWeight = options.reduce((sum, itemId) => sum + ORDER_SHAPES[itemId].weight, 0);
  let roll = random(state) * totalWeight;
  let item = options[0];
  for (const itemId of options) {
    roll -= ORDER_SHAPES[itemId].weight;
    if (roll < 0) {
      item = itemId;
      break;
    }
  }

  const shape = ORDER_SHAPES[item];
  const tier = Math.min(8, Math.floor(state.stats.ordersCompleted / 3));
  const qty = Math.max(1, Math.min(cap, randInt(state, shape.min, shape.max) + tier * shape.perTier));
  const premium = 1.45 + random(state) * 0.35;
  const reward = round5(qty * ITEMS[item].value * premium);
  return { id, item, qty, reward, client: pick(state, CLIENTS) };
}

// Top the order board up to the number of available slots.
export function fillOrders(state) {
  const slots = orderSlots(state);
  let added = 0;
  while (state.orders.length < slots) {
    state.orders.push(generateOrder(state));
    added++;
  }
  return added;
}
