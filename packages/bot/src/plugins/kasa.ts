import type { BotConfig } from '../env';
import { printableDuration, wrap } from '../platform/texts';
import type { Plugin } from '../platform/types';
import { randomUUID } from 'crypto';

// Tells the admin when a TP-Link Kasa plug (the heater at the tracked location) turns on
// or off, through TP-Link's cloud API. Ported from the legacy bot's kasa.py, which used
// the `tplinkcloud` package: a device that answers is working, one that's offline isn't

const CLOUD_URL = 'https://wap.tplinkcloud.com';
// A change is reported once it has lasted this long
const MIN_CHANGE_SECONDS = 5 * 60;

interface CloudResponse<T> {
  error_code: number;
  msg?: string;
  result?: T;
}

const callCloud = async <T>(url: string, body: object): Promise<CloudResponse<T>> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  return (await response.json()) as CloudResponse<T>;
};

const resultOf = <T>(response: CloudResponse<T>, what: string): T => {
  if (response.error_code !== 0 || !response.result) {
    throw new Error(`Kasa ${what} failed: ${response.msg ?? response.error_code}`);
  }
  return response.result;
};

interface KasaDevice {
  alias: string;
  deviceId: string;
  appServerUrl: string;
}

export const isKasaDeviceRunning = async (kasa: NonNullable<BotConfig['kasa']>) => {
  const { token } = resultOf(
    await callCloud<{ token: string }>(CLOUD_URL, {
      method: 'login',
      params: {
        appType: 'Kasa_Android',
        cloudUserName: kasa.login,
        cloudPassword: kasa.password,
        terminalUUID: randomUUID(),
      },
    }),
    'login'
  );

  const { deviceList } = resultOf(
    await callCloud<{ deviceList: KasaDevice[] }>(`${CLOUD_URL}?token=${token}`, {
      method: 'getDeviceList',
    }),
    'device list'
  );
  const device = deviceList.find((d) => d.alias === kasa.device);
  if (!device) {
    throw new Error(`Kasa device ${kasa.device} not found`);
  }

  // An offline device answers with an error
  const sysInfo = await callCloud(`${device.appServerUrl}?token=${token}`, {
    method: 'passthrough',
    params: {
      deviceId: device.deviceId,
      requestData: JSON.stringify({ system: { get_sysinfo: {} } }),
    },
  });
  return sysInfo.error_code === 0;
};

export const createKasaPlugin = (): Plugin => {
  let wasRunning: boolean | undefined;
  let lastChangeAt = 0;

  return {
    name: 'kasa',
    jobs: [
      {
        name: 'kasa update',
        intervalMs: 60 * 1000,
        run: async (bot) => {
          const kasa = bot.config.kasa!;
          const device = `<b>${wrap(kasa.device)}</b>`;
          const isRunning = await isKasaDeviceRunning(kasa);

          if (wasRunning === undefined) {
            wasRunning = isRunning;
            lastChangeAt = Date.now();
            await bot.sendToAdmin(
              isRunning ? `➕  Device ${device} is working` : `➖  Device ${device} is not working`
            );
            return;
          }

          if (wasRunning !== isRunning) {
            const passed = Math.floor((Date.now() - lastChangeAt) / 1000);
            if (passed >= MIN_CHANGE_SECONDS) {
              wasRunning = isRunning;
              lastChangeAt = Date.now();
              await bot.sendToAdmin(
                isRunning
                  ? `➕  Device ${device} started working after ${printableDuration(passed)}`
                  : `➖  Device ${device} stopped working after ${printableDuration(passed)}`
              );
            }
          }
        },
      },
    ],
  };
};
