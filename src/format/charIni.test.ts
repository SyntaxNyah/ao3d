import Ajv from "ajv";
import { describe, expect, it } from "vitest";

import { parseCharIni, writeCharIni, type CharIni } from "./charIni";
// Vendored verbatim from aolib-meta `schemas/assets/CharIni.schema.json`.
import charIniSchema from "./schemas/CharIni.schema.json";

const ajv = new Ajv({ allErrors: true, strict: false });
const validateCharIni = ajv.compile(charIniSchema);

describe("parseCharIni", () => {
  it("parses [emote <name>] blocks into normalized emotes", () => {
    const ini = `[options]
model = model.pmx

[emotions]
number = 2
1 = objection
2 = think

[emote objection]
anim = objection.vmd
preanim = point.vmd
sound = objection.opus
sounddelayms = 480
modifier = zoom
deskmod = shown

[emote think]
anim = think_loop.vmd
`;
    const parsed = parseCharIni(ini);
    expect(parsed.options.model).toBe("model.pmx");
    expect(parsed.emotes).toHaveLength(2);
    expect(parsed.emotes[0]).toMatchObject({
      id: 1,
      key: "objection",
      name: "objection",
      anim: "objection.vmd",
      preanim: "point.vmd",
      sound: "objection.opus",
      soundDelayMs: 480,
      modifier: 5,
      deskMod: 1,
    });
    expect(parsed.emotes[1]).toMatchObject({
      id: 2,
      key: "think",
      preanim: null,
      sound: null,
      soundDelayMs: null,
      modifier: 0,
      deskMod: null,
    });
  });

  it("accepts `sounddelay` as a synonym for `sounddelayms`", () => {
    const ini = `[emotions]\nnumber = 1\n1 = a\n\n[emote a]\nanim = a.vmd\nsounddelay = 240\n`;
    expect(parseCharIni(ini).emotes[0].soundDelayMs).toBe(240);
  });

  it("normalizes legacy banks, converting [soundt] ticks to milliseconds", () => {
    const ini = `[emotions]
number = 2
1 = normal#-#normal#1
2 = point#point#point#5

[soundn]
2 = shocked

[soundt]
2 = 8
`;
    const parsed = parseCharIni(ini);
    expect(parsed.emotes[0]).toMatchObject({
      id: 1,
      key: "1",
      name: "normal",
      anim: "normal",
      preanim: null,
      modifier: 1,
      sound: null,
      soundDelayMs: null,
    });
    expect(parsed.emotes[1]).toMatchObject({
      id: 2,
      key: "2",
      name: "point",
      anim: "point",
      preanim: "point",
      modifier: 5,
      sound: "shocked",
      soundDelayMs: 480,
    });
  });
});

describe("writeCharIni", () => {
  it("round-trips a parsed char.ini", () => {
    const ini = `[options]
model = model.pmx

[emotions]
number = 2
1 = objection
2 = think

[emote objection]
anim = objection.vmd
preanim = point.vmd
sound = objection.opus
sounddelayms = 480
modifier = zoom
deskmod = shown

[emote think]
anim = think_loop.vmd
`;
    const first = parseCharIni(ini);
    const second = parseCharIni(writeCharIni(first));
    expect(second.options.model).toBe(first.options.model);
    expect(second.emotes).toEqual(first.emotes);
  });

  it("emits canonical keys and symbolic modifier/deskmod", () => {
    const char: CharIni = {
      options: {
        name: "",
        showname: "",
        side: "",
        gender: "",
        blips: "",
        chat: "",
        category: "",
        model: "model.pmx",
      },
      emotes: [
        {
          id: 1,
          key: "obj",
          name: "obj",
          anim: "obj.vmd",
          preanim: "pt.vmd",
          sound: "obj.opus",
          soundDelayMs: 480,
          modifier: 5,
          deskMod: 1,
        },
        {
          id: 2,
          key: "think",
          name: "think",
          anim: "think.vmd",
          preanim: null,
          sound: null,
          soundDelayMs: null,
          modifier: 0,
          deskMod: null,
        },
      ],
      sections: {},
    };
    const text = writeCharIni(char);
    expect(text).toContain("sounddelayms = 480");
    expect(text).toContain("modifier = zoom");
    expect(text).toContain("deskmod = shown");
    expect(text).not.toContain("sounddelay =");

    const thinkBlock = text.slice(text.indexOf("[emote think]"));
    expect(thinkBlock).not.toContain("modifier");
    expect(thinkBlock).not.toContain("deskmod");
    expect(thinkBlock).not.toContain("preanim");
  });

  it("produces output that validates against CharIni.schema.json", () => {
    const char: CharIni = {
      options: {
        name: "Test",
        showname: "",
        side: "defense",
        gender: "",
        blips: "",
        chat: "",
        category: "",
        model: "model.pmx",
      },
      emotes: [
        {
          id: 1,
          key: "objection",
          name: "Objection!",
          anim: "objection.vmd",
          preanim: null,
          sound: "objection.opus",
          soundDelayMs: 120,
          modifier: 6,
          deskMod: 0,
        },
      ],
      sections: {},
    };
    const reparsed = parseCharIni(writeCharIni(char));
    expect(validateCharIni(reparsed)).toBe(true);
  });
});
