import { parseCharIni as parseCharIniRaw } from "aolib-ts";
import type { CharEmote, CharIni, CharIniOptions } from "aolib-ts";

import { DESK_MODIFIER, EMOTE_MODIFIER, SOUND_DELAY_KEY } from "./constants";

export type { CharEmote, CharIni, CharIniOptions };

/** numeric value → canonical symbolic name (for writer output). */
function reverseNames(map: object): Partial<Record<number, string>> {
  const out: Partial<Record<number, string>> = {};
  for (const [name, value] of Object.entries(map)) {
    if (typeof value === "number") out[value] = name;
  }
  return out;
}

const MODIFIER_NAME = reverseNames(EMOTE_MODIFIER);
const DESKMOD_NAME = reverseNames(DESK_MODIFIER);

function enumName(map: Partial<Record<number, string>>, value: number): string {
  return map[value] ?? String(value);
}

/**
 * `sounddelay` is the legacy spelling of `sounddelayms`. aolib-ts reads only
 * `sounddelayms`, so fold the synonym in before parsing (case-insensitive,
 * line-leading, and never the longer `sounddelayms`).
 */
function normalizeSoundDelay(data: string): string {
  return data.replace(/^([ \t]*)sounddelay([ \t]*=)/gim, "$1sounddelayms$2");
}

/** Parse char.ini text (blocks or legacy banks) into a normalized CharIni. */
export function parseCharIni(data: string): CharIni {
  return parseCharIniRaw(normalizeSoundDelay(data));
}

const OPTION_ORDER = ["model", "name", "showname", "side", "gender", "blips", "chat", "category"];

/** Emit canonical char.ini (`[options]` + `[emotions]` + `[emote <name>]` blocks). */
export function writeCharIni(char: CharIni): string {
  const lines: string[] = [];

  const optionEntries: Array<[string, string]> = [];
  for (const key of OPTION_ORDER) {
    const value = char.options[key];
    if (value !== "") optionEntries.push([key, value]);
  }
  for (const [key, value] of Object.entries(char.options)) {
    if (!OPTION_ORDER.includes(key) && value !== "") optionEntries.push([key, value]);
  }
  if (optionEntries.length > 0) {
    lines.push("[options]");
    for (const [key, value] of optionEntries) lines.push(`${key} = ${value}`);
    lines.push("");
  }

  const count = char.emotes.reduce((max, emote) => Math.max(max, emote.id), 0);
  lines.push("[emotions]");
  lines.push(`number = ${count}`);
  for (const emote of char.emotes) lines.push(`${emote.id} = ${emote.key}`);
  lines.push("");

  for (const emote of char.emotes) {
    lines.push(`[emote ${emote.key}]`);
    if (emote.name !== "" && emote.name !== emote.key) lines.push(`name = ${emote.name}`);
    lines.push(`anim = ${emote.anim}`);
    if (emote.preanim !== null) lines.push(`preanim = ${emote.preanim}`);
    if (emote.sound !== null) lines.push(`sound = ${emote.sound}`);
    if (emote.soundDelayMs !== null) lines.push(`${SOUND_DELAY_KEY} = ${emote.soundDelayMs}`);
    if (emote.modifier !== 0) lines.push(`modifier = ${enumName(MODIFIER_NAME, emote.modifier)}`);
    if (emote.deskMod !== null) lines.push(`deskmod = ${enumName(DESKMOD_NAME, emote.deskMod)}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}
