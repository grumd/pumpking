import { splitFirstWord } from '../../platform/platform';
import { findPlayerByNickname, getVisiblePlayers } from '../../platform/players';
import { getPreferences, savePreferences, type BotPreferences } from '../../platform/preferences';
import { wrap } from '../../platform/texts';
import type { ChatContext, Plugin } from '../../platform/types';
import { notificationsForResult, replayNotifications, sendNotifications } from './notifications';

// Rivals: a player hears when they beat or catch up with a rival's best score, and a
// rival hears when theirs gets beaten. Ported from the legacy bot's rivals.py and
// rivals_chat_control.py; new results come from `resultAdded` events instead of polling

const RIVALS_LIMIT = 15;

const isAdmin = (ctx: ChatContext) =>
  ctx.username !== undefined && ctx.username === ctx.bot.config.adminNickname;

const showHelp = async (ctx: ChatContext) => {
  let text = `<b>Rivals management</b>:
<code>rivals</code> - see your rivals settings
<code>rivals add</code> <i>&lt;name&gt;</i> - add rival
<code>rivals remove</code> <i>&lt;name&gt;</i> - remove rival
<code>rivals on/off</code> - turn rivals tracking on/off
<code>rivals smart on/off</code> - turn smart players tracking on/off
<code>rivals levels</code> <i>&lt;from&gt;</i> <i>&lt;to&gt;</i> - limit rivals tracking on specific levels`;
  if (isAdmin(ctx)) {
    text +=
      '\n<code>rivals test</code> <i>&lt;minutes_back&gt;</i> <i>&lt;player_name&gt;</i> - test rivals';
  }
  await ctx.reply(text);
};

const showStatus = async (ctx: ChatContext) => {
  const { rivals } = await getPreferences(ctx.chatId);
  const rivalPlayers = await getVisiblePlayers(rivals.list);
  const names = rivals.list.flatMap((id) => {
    const player = rivalPlayers.find((p) => p.id === id);
    return player ? [rivals.track ? `<b>${wrap(player.nickname)}</b>` : wrap(player.nickname)] : [];
  });

  let message = '';
  if (!rivals.track) {
    message += "You <b>don't</b> track your rivals\n";
  }
  message += `Your rivals are: ${names.join(', ')}\n`;
  message += `Tracked chart levels:  <code>${rivals.levels[0]}</code> - <code>${rivals.levels[1]}</code>\n`;
  message += rivals.trackInferior
    ? 'You use smart players tracking\n'
    : "You don't use smart players tracking\n";
  message += '\n';
  message += 'Use <code>rivals help</code> to see other options';
  await ctx.reply(message);
};

const changeRivalsList = async (ctx: ChatContext, rivalName: string, add: boolean) => {
  const prefs = await getPreferences(ctx.chatId);
  const { rivals } = prefs;

  if (add && rivals.list.length > RIVALS_LIMIT) {
    await ctx.reply(`You already have ${RIVALS_LIMIT}+ rivals`);
    return;
  }

  const rival = await findPlayerByNickname(rivalName);
  if (!rival) {
    await ctx.reply(`I don't know player <b>${wrap(rivalName)}</b>`);
    return;
  }
  const name = wrap(rival.nickname);

  if (add) {
    if (rivals.list.includes(rival.id)) {
      await ctx.reply(`You already have <b>${name}</b> as your rival`);
      return;
    }
    rivals.list.push(rival.id);
    await savePreferences(ctx.chatId, prefs);
    await ctx.reply(`<b>${name}</b> added to your rivals`);
  } else {
    if (!rivals.list.includes(rival.id)) {
      await ctx.reply(`You don't have <b>${name}</b> as your rival`);
      return;
    }
    rivals.list = rivals.list.filter((id) => id !== rival.id);
    await savePreferences(ctx.chatId, prefs);
    await ctx.reply(`<b>${name}</b> removed from your rivals`);
  }
};

const switchTracking = async (ctx: ChatContext, on: boolean) => {
  const prefs = await getPreferences(ctx.chatId);
  if (prefs.rivals.track === on) {
    await ctx.reply(on ? 'Rivals are already tracked' : 'Rivals are already not tracked');
    return;
  }
  prefs.rivals.track = on;
  await savePreferences(ctx.chatId, prefs);
  await ctx.reply(`Rivals tracking is turned <b>${on ? 'on' : 'off'}</b>`);
};

const switchSmartTracking = async (ctx: ChatContext, on: boolean) => {
  const prefs = await getPreferences(ctx.chatId);
  if (prefs.rivals.trackInferior === on) {
    await ctx.reply(`Smart tracking is already <b>${on ? 'on' : 'off'}</b>`);
    return;
  }
  prefs.rivals.trackInferior = on;
  await savePreferences(ctx.chatId, prefs);
  await ctx.reply(`Smart tracking is turned <b>${on ? 'on' : 'off'}</b>`);
};

const parseLevel = (word: string) => (/^\d+$/.test(word) ? Number(word) : 0);

const setLevels = async (ctx: ChatContext, text: string) => {
  const [first, rest] = splitFirstWord(text);
  let from = parseLevel(first);
  let to = parseLevel(splitFirstWord(rest)[0]);
  if (from < 1 || from > 30 || to < 1 || to > 30) {
    await ctx.reply('Allowed chart levels - 1..30');
    return;
  }
  if (from > to) {
    [from, to] = [to, from];
  }
  const prefs: BotPreferences = await getPreferences(ctx.chatId);
  prefs.rivals.levels = [from, to];
  await savePreferences(ctx.chatId, prefs);
  await ctx.reply(`Tracked chart levels are <code>${from}</code> - <code>${to}</code>`);
};

// Sends the admin what a player would have been told about the last minutes' results
const testRivals = async (ctx: ChatContext, text: string) => {
  if (!isAdmin(ctx)) {
    await ctx.reply("It's a service command only, sorry");
    return;
  }
  const [minutesText, playerName] = splitFirstWord(text);
  if (minutesText === '') {
    await ctx.reply('Specify minutes to test');
    return;
  }
  if (!/^\d+$/.test(minutesText)) {
    await ctx.reply('Specify numeric minutes to test');
    return;
  }
  const minutes = Number(minutesText);
  const player = await findPlayerByNickname(playerName);
  if (!player) {
    await ctx.reply(`Player '${wrap(playerName)}' not found`);
    return;
  }

  await ctx.reply(`Requesting results ${minutes} minutes back for '${wrap(player.nickname)}'`);
  for (const { html } of await replayNotifications(minutes, player)) {
    await ctx.bot.sendToAdmin(html);
  }
};

const handleRivalsCommand = async (ctx: ChatContext) => {
  const [word, rest] = splitFirstWord(ctx.text);
  const command = word.toLowerCase();
  if (command === '') {
    await showStatus(ctx);
  } else if (command === 'add' || command === 'remove') {
    await changeRivalsList(ctx, rest, command === 'add');
  } else if (command === 'on' || command === 'off') {
    await switchTracking(ctx, command === 'on');
  } else if (command === 'smart') {
    const option = splitFirstWord(rest)[0].toLowerCase();
    if (option === 'on' || option === 'off') {
      await switchSmartTracking(ctx, option === 'on');
    } else {
      await showHelp(ctx);
    }
  } else if (command === 'levels') {
    await setLevels(ctx, rest);
  } else if (command === 'test') {
    await testRivals(ctx, rest);
  } else {
    await showHelp(ctx);
  }
};

export const rivalsPlugin: Plugin = {
  name: 'rivals',
  commands: [{ command: 'rivals', description: 'Show rivals info', handle: handleRivalsCommand }],
  events: {
    resultAdded: async ({ resultId }, bot) => {
      await sendNotifications(bot, await notificationsForResult(resultId));
    },
  },
};
