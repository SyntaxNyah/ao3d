import { describe, expect, it } from "vitest";

import {
  DESK_MODIFIER,
  EMOTE_MODIFIER,
  SOUND_DELAY_KEY,
  SOUND_DELAY_LEGACY_KEY,
  TICK_MS,
} from "./constants";

describe("canonical AO2 format constants", () => {
  it("encodes EmoteModifier per aolib-meta CharIni.schema.json", () => {
    expect(EMOTE_MODIFIER).toEqual({
      no_preanim: 0,
      preanim: 1,
      preanim_and_objection: 2,
      zoom: 5,
      objection_zoom: 6,
    });
  });

  it("encodes DeskModifier per aolib-meta CharIni.schema.json", () => {
    expect(DESK_MODIFIER).toEqual({
      hidden: 0,
      shown: 1,
      hide_during_preanim: 2,
      show_during_preanim: 3,
      hide_and_center_during_preanim: 4,
      show_during_preanim_then_center: 5,
    });
  });

  it("normalizes legacy [soundt] ticks at 60 ms each", () => {
    expect(TICK_MS).toBe(60);
  });

  it("uses sounddelayms as canonical and sounddelay as the legacy synonym", () => {
    expect(SOUND_DELAY_KEY).toBe("sounddelayms");
    expect(SOUND_DELAY_LEGACY_KEY).toBe("sounddelay");
  });
});
