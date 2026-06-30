const { goals } = require('mineflayer-pathfinder');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => Math.random() * (max - min) + min;

class HumanBehavior {
  constructor(bot, serverId, logFn) {
    this.bot = bot;
    this.serverId = serverId;
    this.log = logFn;
    this._idleTimer = null;
    this._taskAbort = false;
  }

  async humanDelay(min = 100, max = 400) {
    await sleep(randInt(min, max));
  }

  async lookAround() {
    const yaw = randFloat(-Math.PI, Math.PI);
    const pitch = randFloat(-0.5, 0.5);
    try { await this.bot.look(yaw, pitch, true); } catch (_) {}
    await this.humanDelay(200, 800);
  }

  startIdleBehavior() {
    this._idleTimer = setInterval(async () => {
      if (!this.bot?.entity) return;
      const action = randInt(1, 10);
      try {
        if (action <= 4) {
          await this.lookAround();
        } else if (action === 5) {
          this.bot.setControlState('jump', true);
          await sleep(100);
          this.bot.setControlState('jump', false);
        } else if (action === 6) {
          this.bot.setControlState('sneak', true);
          await sleep(randInt(300, 800));
          this.bot.setControlState('sneak', false);
        }
      } catch (_) {}
    }, randInt(5000, 15000));
  }

  stopAll() {
    this._taskAbort = true;
    clearInterval(this._idleTimer);
    try { this.bot.pathfinder?.stop(); } catch (_) {}
    try { this.bot.clearControlStates(); } catch (_) {}
  }

  stopTask() {
    this._taskAbort = true;
    try { this.bot.pathfinder?.stop(); } catch (_) {}
    try { this.bot.stopDigging?.(); } catch (_) {}
    try { this.bot.clearControlStates(); } catch (_) {}
    setTimeout(() => { this._taskAbort = false; }, 300);
  }

  async goTo(x, y, z) {
    this._taskAbort = false;
    const { GoalNear } = goals;
    this.log(this.serverId, `🚶 Moving to (${Math.round(x)}, ${Math.round(y)}, ${Math.round(z)})`, 'info');
    await this.humanDelay(300, 800);
    const goal = new GoalNear(x, y, z, 2);
    await this.bot.pathfinder.goto(goal);
    this.log(this.serverId, `✅ Arrived at destination`, 'success');
    await this.lookAround();
  }

  async mineBlock(blockName, count = 64) {
    this._taskAbort = false;
    this.log(this.serverId, `⛏️ Mining ${count}x ${blockName}`, 'info');
    let mined = 0;

    while (mined < count && !this._taskAbort) {
      const block = this.bot.findBlock({
        matching: b => b.name === blockName || b.name.includes(blockName),
        maxDistance: 32,
        count: 1
      });

      if (!block) {
        this.log(this.serverId, `❓ No ${blockName} found nearby — searching...`, 'warn');
        const pos = this.bot.entity.position;
        try {
          await this.goTo(
            pos.x + randInt(-20, 20),
            pos.y,
            pos.z + randInt(-20, 20)
          );
        } catch (_) {}
        await this.humanDelay(1500, 3000);
        continue;
      }

      try {
        const { GoalBlock } = goals;
        await this.bot.pathfinder.goto(new GoalBlock(block.position.x, block.position.y, block.position.z));
      } catch (_) {}

      if (this._taskAbort) break;

      try { await this.bot.lookAt(block.position.offset(0.5, 0.5, 0.5)); } catch (_) {}
      await this.humanDelay(150, 500);

      try {
        await this.bot.dig(block, true);
        mined++;
        this.log(this.serverId, `⛏️ Mined ${mined}/${count} ${blockName}`, 'info');
        await this.humanDelay(80, 400);

        if (mined % randInt(8, 18) === 0) {
          const breakTime = randInt(1500, 5000);
          this.log(this.serverId, `😮‍💨 Taking a ${Math.round(breakTime / 1000)}s break...`, 'info');
          await this.lookAround();
          await sleep(breakTime);
        }
      } catch (err) {
        if (err.message?.includes('aborted') || this._taskAbort) break;
        await this.humanDelay(500, 1200);
      }
    }

    this.log(this.serverId, `✅ Done mining: ${mined}/${count} ${blockName}`, 'success');
  }

  async craftItem(itemName, count = 1) {
    this._taskAbort = false;
    this.log(this.serverId, `🔨 Crafting ${count}x ${itemName}`, 'info');
    try {
      const item = this.bot.registry?.itemsByName[itemName];
      if (!item) {
        this.log(this.serverId, `❌ Unknown item: ${itemName}`, 'error');
        return;
      }
      const recipes = this.bot.recipesFor(item.id, null, 1, null);
      if (!recipes.length) {
        this.log(this.serverId, `❌ No recipe found for ${itemName}`, 'error');
        return;
      }
      await this.humanDelay(500, 1000);
      await this.bot.craft(recipes[0], count, null);
      this.log(this.serverId, `✅ Crafted ${count}x ${itemName}`, 'success');
    } catch (err) {
      this.log(this.serverId, `❌ Craft error: ${err.message}`, 'error');
    }
  }
}

module.exports = HumanBehavior;
