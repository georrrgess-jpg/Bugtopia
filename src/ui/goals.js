// The goal card: the current milestone, its progress and reward.

import { MILESTONES } from '../data/milestones.js';
import { SPECIES } from '../data/species.js';
import { STATIONS } from '../data/stations.js';
import { on } from '../core/events.js';
import { currentMilestone } from '../core/sim.js';
import { app, subscribe, refresh } from '../app.js';
import { audio } from '../audio/audio.js';
import { h, icon, fmt, setText, replay, confettiAt } from './dom.js';
import { toast } from './toast.js';
import { tutorialFocus } from './tutorial.js';

const UNLOCK_MESSAGES = {
  nectabee: `New creature: ${SPECIES.nectabee.name}! Find it under Creatures.`,
  emberpup: `New creature: ${SPECIES.emberpup.name}! It powers crafting.`,
  crafting: `New station: ${STATIONS.crafting.name}!`,
};

export function createGoalCard() {
  const root = document.getElementById('goal-card');
  root.classList.add('panel');
  const kicker = h('span', { class: 'kicker' });
  const toggle = h('button', { class: 'goal-toggle', type: 'button', 'aria-expanded': 'true' }, 'Hide');
  const title = h('div', { class: 'goal-title' });
  const hint = h('div', { class: 'goal-hint' });
  const barFill = h('i');
  const bar = h('div', { class: 'bar' }, barFill);
  const progressText = h('span', { class: 'goal-progress-text' });
  const reward = h('span', { class: 'reward' }, icon('acorn'), h('span'));
  const foot = h('div', { class: 'goal-foot' }, bar, progressText, reward);
  root.append(h('div', { class: 'goal-head' }, kicker, toggle), title, hint, foot);

  let collapsed = false;
  toggle.addEventListener('click', () => {
    collapsed = !collapsed;
    root.classList.toggle('collapsed', collapsed);
    setText(toggle, collapsed ? 'Show' : 'Hide');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    refresh('layout');
  });

  function update() {
    const s = app.state;
    if (!s) return;
    const visible = app.settings.showGoals;
    if (root.hidden === visible) {
      root.hidden = !visible;
      refresh('layout');
    }
    if (!visible) return;
    const m = currentMilestone(s);
    if (!m) {
      setText(kicker, 'All goals complete');
      setText(title, 'Your workshop is thriving!');
      setText(hint, 'Keep filling orders, hiring helpers and growing your workshop.');
      foot.hidden = true;
      return;
    }
    const intro = MILESTONES.filter((x) => x.intro);
    const index = MILESTONES.indexOf(m);
    setText(kicker, m.intro ? `Getting started · ${index + 1} of ${intro.length}` : 'Workshop goal');
    setText(title, m.title);
    const focus = tutorialFocus();
    setText(hint, focus.hint || m.hint);
    foot.hidden = false;
    if (m.progress) {
      const [cur, max] = m.progress(s);
      bar.hidden = false;
      progressText.hidden = false;
      barFill.style.width = `${Math.round((cur / max) * 100)}%`;
      setText(progressText, `${fmt(cur)}/${fmt(max)}`);
    } else {
      bar.hidden = true;
      progressText.hidden = true;
    }
    reward.hidden = !m.reward;
    setText(reward.lastChild, `+${fmt(m.reward)}`);
  }

  subscribe(update);

  on((e) => {
    if (e.type !== 'milestone' || app.screen !== 'game') return;
    const m = MILESTONES.find((x) => x.id === e.id);
    audio.play('milestone');
    replay(root, 'celebrate');
    const r = root.getBoundingClientRect();
    if (!root.hidden) confettiAt(r.left + r.width / 2, r.top + r.height / 2, 18);
    toast(
      e.reward ? `Goal complete: ${m.title}! +${fmt(e.reward)} Acorns` : `Goal complete: ${m.title}!`,
      'good',
      3200,
      'star',
    );
    e.unlocked.forEach((key, i) => {
      setTimeout(() => toast(UNLOCK_MESSAGES[key] || 'Something new unlocked!', 'gold', 4200, 'star'), 500 + i * 400);
    });
    refresh('milestone');
  });

  return { update };
}
