// Every resource and product in the workshop economy.
// `value` is the Quick Sell price in Acorns.

export const ITEMS = {
  mossFiber: {
    id: 'mossFiber',
    name: 'Moss Fiber',
    plural: 'Moss Fiber',
    value: 3,
    kind: 'raw',
    color: '#8fd16a',
    description: 'Soft, springy strands grown by Mosslets.',
  },
  nectarDrop: {
    id: 'nectarDrop',
    name: 'Nectar Drop',
    plural: 'Nectar Drops',
    value: 5,
    kind: 'raw',
    color: '#ffc63d',
    description: 'Sweet golden drops gathered by Nectabees.',
  },
  nectarWeave: {
    id: 'nectarWeave',
    name: 'Nectar Weave',
    plural: 'Nectar Weave',
    value: 30,
    kind: 'product',
    color: '#f2a65a',
    description: 'A shimmering cloth of moss and nectar, set with Emberpup heat.',
  },
};

export const ITEM_IDS = Object.keys(ITEMS);

export function itemLabel(itemId, qty) {
  const item = ITEMS[itemId];
  return qty === 1 ? item.name : item.plural;
}
