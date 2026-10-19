// Progression milestones, completed strictly in order. The first group forms
// the introductory tutorial; the rest are longer-term goals for free play.
//
// check(state)    -> true when complete
// progress(state) -> optional [current, target] for display
// unlocks         -> keys set to true in state.unlocks on completion

import { countSpecies, countStations } from '../core/rules.js';
import { maxLevel } from './upgrades.js';

const sumValues = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);

export const MILESTONES = [
  {
    id: 'assign-mosslet',
    intro: true,
    title: 'Put your Mosslet to work',
    hint: 'Tap your Mosslet, then tap the empty Gathering Station.',
    reward: 0,
    check: (s) =>
      s.creatures.some((c) => c.species === 'mosslet' && s.stations.some((st) => st.id === c.stationId)),
  },
  {
    id: 'gather-moss',
    intro: true,
    title: 'Gather 5 Moss Fiber',
    hint: 'Fiber flies straight into your Storage Crate.',
    reward: 10,
    check: (s) => s.stats.produced.mossFiber >= 5,
    progress: (s) => [Math.min(5, s.stats.produced.mossFiber), 5],
  },
  {
    id: 'first-sale',
    intro: true,
    title: 'Make your first sale',
    hint: 'Open the Market and sell some Moss Fiber.',
    reward: 15,
    unlocks: ['nectabee'],
    check: (s) => sumValues(s.stats.sold) > 0 || s.stats.ordersCompleted > 0,
  },
  {
    id: 'hire-nectabee',
    intro: true,
    title: 'Hire a Nectabee',
    hint: 'Find one under Creatures. Short on Acorns? Keep selling, or fill an order.',
    reward: 20,
    check: (s) => countSpecies(s, 'nectabee') >= 1,
  },
  {
    id: 'collect-nectar',
    intro: true,
    title: 'Collect a Nectar Drop',
    hint: 'Your Nectabee needs its own Gathering Station.',
    reward: 25,
    unlocks: ['emberpup', 'crafting'],
    check: (s) => s.stats.produced.nectarDrop >= 1,
  },
  {
    id: 'setup-crafting',
    intro: true,
    title: 'Set up crafting',
    hint: 'Hire an Emberpup and build a Crafting Station.',
    reward: 30,
    check: (s) => countSpecies(s, 'emberpup') >= 1 && countStations(s, 'crafting') >= 1,
    progress: (s) => [Math.min(1, countSpecies(s, 'emberpup')) + Math.min(1, countStations(s, 'crafting')), 2],
  },
  {
    id: 'first-weave',
    intro: true,
    title: 'Craft a Nectar Weave',
    hint: 'Give the Crafting Station an Emberpup. It needs 3 Moss Fiber + 2 Nectar Drops.',
    reward: 40,
    check: (s) => s.stats.crafted.nectarWeave >= 1,
  },
  {
    id: 'first-order',
    intro: true,
    title: 'Complete a Market order',
    hint: 'Orders pay much more than Quick Sell.',
    reward: 50,
    check: (s) => s.stats.ordersCompleted >= 1,
  },
  {
    id: 'first-upgrade',
    intro: true,
    title: 'Improve your workshop',
    hint: 'Buy any upgrade to grow your operation.',
    reward: 50,
    check: (s) => s.stats.upgradesBought >= 1,
  },
  {
    id: 'expand',
    title: 'Room to grow',
    hint: 'Buy a Workshop Expansion.',
    reward: 60,
    check: (s) => s.upgrades.expansion >= 1,
  },
  {
    id: 'weave-10',
    title: 'Master weaver',
    hint: 'Craft 10 Nectar Weave in total.',
    reward: 120,
    check: (s) => s.stats.crafted.nectarWeave >= 10,
    progress: (s) => [Math.min(10, s.stats.crafted.nectarWeave), 10],
  },
  {
    id: 'crew-6',
    title: 'A bustling crew',
    hint: 'Have 6 creatures in your workshop.',
    reward: 150,
    check: (s) => s.creatures.length >= 6,
    progress: (s) => [Math.min(6, s.creatures.length), 6],
  },
  {
    id: 'orders-10',
    title: 'Trusted supplier',
    hint: 'Complete 10 Market orders.',
    reward: 200,
    check: (s) => s.stats.ordersCompleted >= 10,
    progress: (s) => [Math.min(10, s.stats.ordersCompleted), 10],
  },
  {
    id: 'earn-5000',
    title: 'Acorn tycoon',
    hint: 'Earn 5,000 Acorns in total.',
    reward: 300,
    check: (s) => s.stats.acornsEarned >= 5000,
    progress: (s) => [Math.min(5000, Math.floor(s.stats.acornsEarned)), 5000],
  },
  {
    id: 'max-efficiency',
    title: 'Peak performance',
    hint: 'Reach maximum Production Efficiency.',
    reward: 400,
    check: (s) => s.upgrades.efficiency >= maxLevel('efficiency'),
    progress: (s) => [s.upgrades.efficiency, maxLevel('efficiency')],
  },
];

export const MILESTONE_IDS = MILESTONES.map((m) => m.id);
