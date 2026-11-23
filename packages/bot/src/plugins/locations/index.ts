import { findLinkedPlayer, languageOf } from '../../platform/players';
import { getState, setState } from '../../platform/state';
import { durationText, parseUtc, printableDuration, secondsAgo, wrap } from '../../platform/texts';
import { callbackData, type ChatContext, type Keyboard, type Plugin } from '../../platform/types';
import { getAgentLastPlayers, getAgentsStatus, type AgentStatus } from './activity';

const PLUGIN = 'locations';
const AGENT_TIMEOUT_MINUTES = 3;
const STALL_FROM_SECONDS = 5 * 60;
const STALL_TO_SECONDS = 10 * 60;
const DIALOG_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
// A failing capture reports 0 fps, or an anomaly high one (no frames to wait for). The
// game runs at 60 fps; 1 more allows for the agent's rounding
const MAX_FPS = 61;

export interface Location {
  state: AgentStatus;
  stalled: boolean;
  // The latest status of the agent reports a failing capture's fps
  fpsBad?: boolean;
}

const isBadFps = (fps: number | undefined) => fps !== undefined && (fps <= 0 || fps > MAX_FPS);

type Locations = Record<string, Location>;

const byLang = (lang: string, texts: { RU: string; UA: string; EN: string }) =>
  lang === 'RU' ? texts.RU : lang === 'UA' ? texts.UA : texts.EN;

export const updateLocation = (
  location: Location,
  state: AgentStatus,
  trackedName: string | undefined,
  now = Date.now()
): string[] => {
  const prev = location.state;
  const name = wrap(state.name);
  const messages: string[] = [];
  const notify = (message: string) => {
    if (state.name === trackedName) {
      messages.push(message);
    }
  };

  for (const player of Object.keys(state.players)) {
    if (!(player in prev.players)) {
      console.log(`Bot: Player ${player} appeared in location <${state.name}>`);
      notify(`👉  Player <b>${wrap(player)}</b> appeared in location <b>${name}</b>`);
    }
  }

  if (prev.startedAt !== state.startedAt) {
    const offline = Math.floor((parseUtc(state.startedAt) - parseUtc(prev.lastUpdatedAt)) / 1000);
    console.log(
      `Bot: Location <${state.name}> started working after ${printableDuration(offline)}`
    );
    notify(`➕  Location <b>${name}</b> started working after ${printableDuration(offline)}`);
    location.stalled = false;
  } else if (location.stalled) {
    if (prev.lastUpdatedAt !== state.lastUpdatedAt) {
      console.log(`Bot: Location <${state.name}> resumed working`);
      notify(`🟰  Location <b>${name}</b> resumed working`);
      location.stalled = false;
    }
  } else if (prev.lastUpdatedAt === state.lastUpdatedAt) {
    const updatedAgo = secondsAgo(state.lastUpdatedAt, now);
    if (updatedAgo >= STALL_FROM_SECONDS && updatedAgo <= STALL_TO_SECONDS) {
      const worked = Math.floor((parseUtc(state.lastUpdatedAt) - parseUtc(state.startedAt)) / 1000);
      console.log(
        `Bot: Location <${state.name}> stopped working after ${printableDuration(worked)}`
      );
      notify(`➖  Location <b>${name}</b> stopped working after ${printableDuration(worked)}`);
      location.stalled = true;
    }
  }

  if (isBadFps(state.fps) && !location.fpsBad) {
    console.log(`Bot: Location <${state.name}> reports ${state.fps} fps`);
    notify(
      `⚠️  Location <b>${name}</b> reports ${state.fps} fps${prev.fps ? ` (was ${prev.fps})` : ''}`
    );
    location.fpsBad = true;
  } else if (state.fps !== undefined && !isBadFps(state.fps) && location.fpsBad) {
    console.log(`Bot: Location <${state.name}> fps is back: ${state.fps}`);
    notify(`✅  Location <b>${name}</b> fps is back: ${state.fps}`);
    location.fpsBad = false;
  }

  location.state = state;
  return messages;
};

const getLocations = async () => (await getState<Locations>(PLUGIN, 'agents')) ?? {};

export const checkLocations = async (trackedName: string | undefined) => {
  const statuses = await getAgentsStatus();
  const locations = await getLocations();
  const messages: string[] = [];

  for (const [id, state] of Object.entries(statuses)) {
    if (locations[id]) {
      messages.push(...updateLocation(locations[id], state, trackedName));
    } else {
      locations[id] = { state, stalled: false, fpsBad: isBadFps(state.fps) };
    }
  }
  await setState(PLUGIN, 'agents', locations);

  if (trackedName && !Object.values(statuses).some((state) => state.name === trackedName)) {
    throw new Error(`No reported location with name ${trackedName} is found`);
  }
  return messages;
};

const keyboard = (locations: Locations, now = Date.now()): Keyboard => [
  Object.entries(locations)
    .filter(
      ([, location]) => secondsAgo(location.state.lastUpdatedAt, now) < DIALOG_MAX_AGE_SECONDS
    )
    .map(([id, location]) => ({
      text: location.state.title,
      data: callbackData(PLUGIN, 'show', id),
    })),
];

export const lastPlayersText = async (agentId: number, title: string, lang: string) => {
  const { lastResults, agentStatus } = await getAgentLastPlayers(agentId);
  const locationStr = `"<i>${wrap(title)}</i>"`;
  let text = '';

  if (agentStatus && agentStatus.updatedMinsAgo > AGENT_TIMEOUT_MINUTES) {
    const time = durationText(lang, agentStatus.updatedMinsAgo);
    text += `❗️ <b>${byLang(lang, {
      RU: `Нет связи ${time}`,
      UA: `Нема зв'язку ${time}`,
      EN: `No connection ${time}`,
    })}</b>\n\n`;
  }

  const players = Object.entries(lastResults);
  if (players.length > 0) {
    text +=
      byLang(lang, {
        RU: `В локации ${locationStr} были:`,
        UA: `В локації ${locationStr} були:`,
        EN: `In location ${locationStr}:`,
      }) + '\n';
    for (const [player, lastGainedAt] of players) {
      const playerStr = `👉  <b>${wrap(player)}</b>`;
      const time = durationText(lang, Math.floor(secondsAgo(lastGainedAt) / 60));
      text +=
        byLang(lang, {
          RU: ` ${playerStr} - ${time} назад`,
          UA: ` ${playerStr} - ${time} тому`,
          EN: ` ${playerStr} - ${time} ago`,
        }) + '\n';
    }
  } else {
    text +=
      byLang(lang, {
        RU: `В локации ${locationStr} давно никого нет`,
        UA: `В локації ${locationStr} давно нікого нема`,
        EN: `No players for a long time in location ${locationStr}`,
      }) + '  😞\n';
  }

  if (agentStatus && agentStatus.updatedMinsAgo <= AGENT_TIMEOUT_MINUTES) {
    const time = durationText(lang, agentStatus.startedMinsAgo);
    text += `\n✓  ${byLang(lang, {
      RU: `Работает ${time}`,
      UA: `Працює ${time}`,
      EN: `Works ${time}`,
    })}`;
  }
  return text;
};

const showDialog = async (ctx: ChatContext) => {
  const locations = await getLocations();
  if (Object.keys(locations).length === 0) {
    await ctx.reply('No locations info, please wait...');
    return;
  }
  const lang = languageOf(await findLinkedPlayer(ctx.chatId));
  await ctx.reply(
    byLang(lang, { RU: 'Выбери локацию:', UA: 'Виберіть локацію:', EN: 'Choose location:' }),
    keyboard(locations)
  );
};

const showLocation = async (ctx: ChatContext, agentId: string) => {
  const locations = await getLocations();
  const location = locations[agentId];
  if (!location) {
    return;
  }
  const lang = languageOf(await findLinkedPlayer(ctx.chatId));
  const text = await lastPlayersText(Number(agentId), location.state.title, lang);
  await ctx.editMessage(text, keyboard(locations));
};

export const locationsPlugin: Plugin = {
  name: PLUGIN,
  commands: [{ command: 'locations', description: 'Show locations info', handle: showDialog }],
  callbacks: { show: showLocation },
  jobs: [
    {
      name: 'locations update',
      intervalMs: 60 * 1000,
      run: async (bot) => {
        const messages = await checkLocations(bot.config.trackedLocationName);
        for (const watcher of bot.config.trackedLocationWatchers) {
          for (const message of messages) {
            await bot.sender.send(watcher, message);
          }
        }
      },
    },
  ],
};
