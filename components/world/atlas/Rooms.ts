import { type WorldData, type Pick, PEN, FILL, FAMILY_INK, span } from "./model";

/* Rooms you can walk into from the world. Each is built from data the world
   already publishes, so a room never says more than the world does, and a
   new project lands on a wall without anyone hanging it.

   A room is an open-fronted box: a floor, a back wall and two side walls,
   seen from the open side like a doll's house. Exhibits hang on the walls or
   stand on the floor; each has a spot in front of it to walk to. */

export type ExhibitKind = "frame" | "board" | "bench" | "arch" | "year" | "kiosk";

export type Exhibit = {
  id: string;
  kind: ExhibitKind;
  at: [number, number, number];        // centre, in room units
  yaw: number;                         // which way it faces
  w: number; h: number;
  title: string; sub?: string;
  art?: string;                        // an icon name, drawn on it
  pen: string;
  pick?: Pick;
  href?: string; download?: boolean;
  stand: [number, number];             // where to stand to look at it
  /** a board's own pickable items, laid out on it */
  items?: { art: string; title: string; pick: Pick }[];
};

/** Something drawn that stands in a room for looks: a plant, a seat, a lamp. */
export type Decor = { art: string; at: [number, number, number]; w: number; yaw?: number; flat?: boolean };

export type RoomDef = {
  id: string;
  wallArt: string; doorArt: string;    // drawn wallpaper and door building, under /world/room
  decor: Decor[];
  title: string; kicker: string;
  pen: string; tint: string; wall: string;
  W: number; D: number; H: number;
  door: { x: number; z: number; yaw: number };   // in the world: the doorway, and which way it faces
  exhibits: Exhibit[];
  /** where you come in, and where the way out is, in room units */
  spawn: [number, number]; exit: [number, number];
  text: string;                       // the text page this room stands for
};

const DIST = 40, BESIDE = -5;          // hall doors: this far out along the road, this far to its side
const LANE = 38;                        // other doors: in the lanes between districts, this far out

/** Wall spots for n frames: back wall low row, side walls low, then the upper rows. */
function wallSpots(n: number, W: number, D: number, size: number, gap: number) {
  // the drawn frame stands taller than its picture, with a plaque under it
  const rows = [3.4, 9.3];
  const out: { at: [number, number, number]; yaw: number; stand: [number, number] }[] = [];
  const back = Math.floor((W - 4) / (size + gap));
  const side = Math.floor((D - 7) / (size + gap));
  const lineBack = (y: number) => Array.from({ length: back }, (_, i) => {
    const x = (i - (back - 1) / 2) * (size + gap);
    return { at: [x, y, -D / 2 + 0.12] as [number, number, number], yaw: 0, stand: [x, -D / 2 + 4.6] as [number, number] };
  });
  const lineSide = (y: number, s: 1 | -1) => Array.from({ length: side }, (_, i) => {
    const z = -D / 2 + 3 + size / 2 + i * (size + gap);
    return { at: [s * (W / 2 - 0.12), y, z] as [number, number, number], yaw: -s * Math.PI / 2, stand: [s * (W / 2 - 4.6), z] as [number, number] };
  });
  for (const y of rows) out.push(...lineBack(y), ...lineSide(y, -1), ...lineSide(y, 1));
  return out.slice(0, n);
}

function lane(i: number, n: number) {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.cos(a) * LANE, z: Math.sin(a) * LANE, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) };
}

const base = (W: number, D: number) => ({
  W, D, H: 11,
  spawn: [-W / 2 + 5, D / 2 - 3] as [number, number],
  exit: [-W / 2 + 2.6, D / 2 - 1.4] as [number, number],
});

export function buildRooms(w: WorldData): RoomDef[] {
  const n = w.districts.length, sector = (Math.PI * 2) / n;
  const label = Object.fromEntries(w.domains.map((d) => [d.id, d.label]));
  const rooms: RoomDef[] = [];

  /* the district halls: one per domain, its projects newest first */
  w.districts.forEach((d, i) => {
    const a = (i + 0.5) * sector - Math.PI / 2;
    const x = Math.cos(a) * DIST - Math.sin(a) * BESIDE, z = Math.sin(a) * DIST + Math.cos(a) * BESIDE;
    const list = w.projects.filter((p) => p.domain === d)
      .sort((p, q) => (q.last ?? "").localeCompare(p.last ?? "") || q.tier - p.tier);
    const W = list.length > 14 ? 50 : 42, D = list.length > 14 ? 28 : 24;
    const spots = wallSpots(list.length, W, D, 3.4, 1.6);
    rooms.push({
      id: `hall-${d}`, title: `${label[d]} hall`, kicker: `${list.length} projects, newest first`,
      wallArt: `wall-${d}`, doorArt: `door-hall-${d}`,
      decor: [
        { art: "fit-plant", at: [-W / 2 + 1.8, 0, -D / 2 + 1.8], w: 2.6 },
        { art: "fit-plant", at: [W / 2 - 1.8, 0, -D / 2 + 1.8], w: 2.6 },
        { art: "fit-seat", at: [0, 0, 1.5], w: 3.4 },
        { art: "fit-rope", at: [W / 2 - 4, 0, D / 2 - 1.5], w: 3 },
      ],
      pen: PEN[d], tint: FILL[d], wall: "#fbfaf6", ...base(W, D), H: 15,
      door: { x, z, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) },
      text: `/work/?d=${d}`,
      exhibits: list.map((p, k) => ({
        id: p.slug, kind: "frame", ...spots[k], w: 3.4, h: 3.4,
        title: p.label, sub: span(p), art: `project-${p.slug}`, pen: PEN[d],
        pick: { kind: "project", slug: p.slug },
      })),
    });
  });

  /* the story gallery: every story, grouped by kind */
  {
    const order = ["decisions", "people", "incidents", "influence"];
    const list = [...w.stories].sort((s, t) => order.indexOf(s.family ?? "decisions") - order.indexOf(t.family ?? "decisions"));
    const W = 46, D = 26, spots = wallSpots(list.length, W, D, 3.4, 1.6);
    const fam: Record<string, string> = { decisions: "A call I made", people: "People", incidents: "When it broke", influence: "Changing minds" };
    rooms.push({
      id: "stories", title: "Story gallery", kicker: `${list.length} stories, told short`,
      wallArt: "wall-search-commerce", doorArt: "door-stories",
      decor: [
        { art: "gal-bench", at: [0, 0, 2], w: 5 },
        { art: "gal-easel", at: [W / 2 - 3, 0, D / 2 - 3], w: 2.6 },
        { art: "gal-lamp", at: [-W / 2 + 2, 0, -D / 2 + 2], w: 1.6 },
        // the four kinds of story, hung high on the side walls above the frames
        { art: "gal-decisions", at: [-W / 2 + 0.2, 12.2, -D / 4], w: 2.2, yaw: Math.PI / 2 },
        { art: "gal-people", at: [-W / 2 + 0.2, 12.2, D / 6], w: 2.2, yaw: Math.PI / 2 },
        { art: "gal-incidents", at: [W / 2 - 0.2, 12.2, -D / 4], w: 2.2, yaw: -Math.PI / 2 },
        { art: "gal-influence", at: [W / 2 - 0.2, 12.2, D / 6], w: 2.2, yaw: -Math.PI / 2 },
      ],
      pen: "#c35f92", tint: "#f8e3ee", wall: "#fffaf6", ...base(W, D), H: 15, door: lane(4, n), text: "/work/?kind=stories",
      exhibits: list.map((s, k) => {
        const p = w.projects.find((x) => x.slug === s.project);
        return {
          id: s.id, kind: "frame" as const, ...spots[k], w: 3.4, h: 3.4,
          title: s.title, sub: `${fam[s.family ?? "decisions"] ?? ""} · ${s.period}`,
          art: `story-${s.id}`, pen: p ? PEN[p.domain] : "#c35f92", pick: { kind: "story", id: s.id } as Pick,
        };
      }),
    });
  }

  /* the timeline hall: a corridor from 2019 to now, an arch per role */
  {
    const W = 52, D = 16;
    const years: number[] = [];
    const first = +w.oldest.slice(0, 4), last = +w.now.slice(0, 4);
    for (let y = first; y <= last; y++) years.push(y);
    const xOf = (y: number) => -W / 2 + 5 + ((y - first) / Math.max(1, last - first)) * (W - 10);
    const startYear = (d: string) => +(d.match(/\d{4}/)?.[0] ?? first);
    const began = (y: number) => w.projects.filter((p) => (p.first ?? "").startsWith(String(y))).length;
    rooms.push({
      id: "timeline", title: "Timeline hall", kicker: `${first} to now, one arch per role`,
      wallArt: "wall-conversational-ai", doorArt: "door-timeline",
      decor: [
        { art: "time-clock", at: [W / 2 - 4, 6.5, -D / 2 + 0.15], w: 2.6 },
        { art: "time-lantern", at: [-W / 4, 8.4, -D / 2 + 2.5], w: 1.6 },
        { art: "time-lantern", at: [W / 4, 8.4, -D / 2 + 2.5], w: 1.6 },
        { art: "time-milestone", at: [W / 2 - 3, 0, D / 2 - 3], w: 1.8 },
        { art: "time-rope", at: [0, 0, D / 2 - 1], w: 6 },
      ],
      pen: "#009bb4", tint: "#d9f1f5", wall: "#f7fbfc", ...base(W, D), H: 14, door: lane(5, n), text: "/about/",
      exhibits: [
        // oldest role on the left; arches spaced evenly, the plaques carry the dates
        ...[...w.roles].sort((p, q) => startYear(p.dates) - startYear(q.dates)).map((r, k, all) => {
          const x = all.length === 1 ? 0 : -W / 2 + 10 + (k * (W - 20)) / (all.length - 1);
          return {
            id: r.id, kind: "arch" as const, at: [x, 0, -D / 2 + 3.2] as [number, number, number], yaw: 0, w: 6, h: 7,
            title: r.title, sub: `${r.employer} · ${r.dates}`, pen: ["#009bb4", "#5a62e8", "#d8871a"][k % 3],
            art: ["room/time-arch-teal", "room/time-arch-indigo", "room/time-arch-amber"][k % 3],
            pick: { kind: "about" } as Pick, stand: [x, -D / 2 + 7.5] as [number, number],
          };
        }),
        ...years.map((y) => ({
          id: `y${y}`, kind: "year" as const, at: [xOf(y), 0.05, 2.5] as [number, number, number], yaw: 0, w: 3.6, h: 1.6,
          title: String(y), sub: began(y) ? `${began(y)} project${began(y) === 1 ? "" : "s"} began` : "", pen: "#1b2437",
          pick: { kind: "about" } as Pick, stand: [xOf(y), 4.6] as [number, number],
        })),
      ],
    });
  }

  /* the lab: things built because I wanted them to exist */
  {
    const built = w.about?.built ?? [];
    const W = 38, D = 20, gap = (W - 8) / Math.max(1, built.length);
    // each build gets the drawn object that says what it is
    const thing = (n: string) => /ludo/i.test(n) ? "room/lab-ludo" : /navo|plan/i.test(n) ? "room/lab-planner"
      : /gmail|mail/i.test(n) ? "room/lab-envelopes" : /schedul/i.test(n) ? "room/lab-calendar"
      : /class/i.test(n) ? "room/lab-chalkboard" : "room/lab-toolbox";
    rooms.push({
      id: "lab", title: "The lab", kicker: "Built for myself",
      wallArt: "wall-platform-internal", doorArt: "door-lab",
      decor: [
        { art: "lab-toolbox", at: [W / 2 - 3.5, 0, D / 2 - 3], w: 2.6 },
        { art: "lab-phone", at: [-W / 2 + 3, 0, -D / 2 + 1.6], w: 1.6 },
        { art: "fit-plant", at: [W / 2 - 1.8, 0, -D / 2 + 1.8], w: 2.4 },
      ],
      pen: "#6b953a", tint: "#e6f0d6", wall: "#fbfcf6", ...base(W, D), door: lane(3, n), text: "/about/",
      exhibits: built.map((b, k) => {
        const x = -W / 2 + 4 + gap * (k + 0.5);
        return {
          id: `built-${k}`, kind: "bench" as const, at: [x, 0, -D / 2 + 4] as [number, number, number], yaw: 0, w: 5, h: 2.4,
          title: b.name, sub: "open on GitHub ↗", art: thing(b.name), pen: "#6b953a",
          pick: { kind: "built", i: k } as Pick, stand: [x, -D / 2 + 8] as [number, number],
        };
      }),
    });
  }

  /* the skills workshop: a pegboard per family, a tool per skill */
  {
    const fams = [...new Set(w.skills.map((s) => s.family))];
    const W = 46, D = 24;
    const names: Record<string, string> = {
      backend: "Backend", cloud: "Cloud and platform", ai: "AI", architecture: "Architecture",
      leadership: "Leadership", commercial: "Commercial", domains: "Domains",
    };
    // back wall takes four boards, each side wall takes the rest
    const spots = fams.map((_, k) => {
      if (k < 4) { const x = (k - 1.5) * 10.5; return { at: [x, 4.6, -D / 2 + 0.12] as [number, number, number], yaw: 0, stand: [x, -D / 2 + 5.5] as [number, number] }; }
      const j = k - 4, s = j % 2 ? 1 : -1, z = -D / 2 + 7 + Math.floor(j / 2) * 9.5;
      return { at: [s * (W / 2 - 0.12), 4.6, z] as [number, number, number], yaw: -s * Math.PI / 2, stand: [s * (W / 2 - 5.5), z] as [number, number] };
    });
    rooms.push({
      id: "workshop", title: "Skills workshop", kicker: `${w.skills.length} tools on ${fams.length} boards`,
      wallArt: "wall-data-crawling", doorArt: "door-workshop",
      decor: [
        { art: "shop-bench", at: [0, 0, 1], w: 5 },
        { art: "shop-sawhorse", at: [W / 2 - 4, 0, D / 2 - 3], w: 3.6 },
        { art: "shop-rack", at: [-W / 2 + 3, 0, D / 2 - 6], w: 2.4 },
      ],
      pen: "#398ad6", tint: "#dcebfa", wall: "#f8fbff", ...base(W, D), door: lane(1, n), text: "/work/?kind=skills",
      exhibits: fams.map((f, k) => {
        const list = w.skills.filter((s) => s.family === f).sort((a, b) => b.strength - a.strength || a.name.localeCompare(b.name));
        return {
          id: `board-${f}`, kind: "board" as const, ...spots[k], w: 9.4, h: 6.6,
          title: names[f] ?? f, sub: `${list.length} skills`, pen: FAMILY_INK[f] ?? "#398ad6",
          items: list.map((s) => ({ art: s.icon, title: s.name, pick: { kind: "skill", slug: s.slug } as Pick })),
        };
      }),
    });
  }

  /* the post office: every way to reach me, as things on a counter */
  {
    const c = w.about?.contact;
    const W = 34, D = 18;
    const stalls: Omit<Exhibit, "at" | "stand">[] = [
      { id: "plane", kind: "kiosk", yaw: 0, w: 5, h: 3, title: "Throw a paper plane", sub: "write a line, I'll find it", pen: "#5a62e8", art: "room/post-box", pick: { kind: "reach" } },
      ...(c?.resume ? [{ id: "resume", kind: "kiosk" as const, yaw: 0, w: 5, h: 3, title: "Take a résumé", sub: "PDF, one page", pen: "#d8871a", art: "room/post-rack", href: c.resume, download: true }] : []),
      { id: "qr", kind: "kiosk", yaw: 0, w: 5, h: 3, title: "Scan to save me", sub: "QR and contact card", pen: "#12a98a", art: "room/post-poster", pick: { kind: "reach" } },
      ...(c?.phone ? [{ id: "call", kind: "kiosk" as const, yaw: 0, w: 5, h: 3, title: "Call or WhatsApp", sub: c.phone, pen: "#e0557f", art: "room/post-booth", href: `tel:${c.phone.replace(/\s+/g, "")}` }] : []),
    ];
    const gap = (W - 6) / stalls.length;
    rooms.push({
      id: "post", title: "Post office", kicker: "Every way to reach me",
      wallArt: "wall-document-ai", doorArt: "door-post",
      decor: [
        { art: "post-counter", at: [W / 2 - 5, 0, D / 2 - 3.5], w: 5 },
        { art: "post-scales", at: [W / 2 - 5.8, 2.15, D / 2 - 3.4], w: 1.6 },
        { art: "post-parcels", at: [-W / 2 + 6, 0, D / 2 - 2.5], w: 2.6 },
        { art: "post-slot", at: [0, 7.3, -D / 2 + 0.15], w: 3.2 },
      ],
      pen: "#5a62e8", tint: "#e4e6fb", wall: "#fbfbff", ...base(W, D), door: lane(0, n), text: "/about/",
      exhibits: stalls.map((s, k) => {
        const x = -W / 2 + 3 + gap * (k + 0.5);
        return { ...s, at: [x, 0, -D / 2 + 3.5] as [number, number, number], stand: [x, -D / 2 + 7.5] as [number, number] };
      }),
    });
  }

  return rooms;
}

/** The point just outside a room's doorway, where walking in begins. */
export function doorstep(r: RoomDef, out = 2.4): [number, number] {
  return [r.door.x + Math.sin(r.door.yaw) * out, r.door.z + Math.cos(r.door.yaw) * out];
}

/** Find the exhibit that shows a pick, if this room has one. */
export function exhibitFor(r: RoomDef, p: Pick) {
  const same = (q?: Pick) => !!q && JSON.stringify(q) === JSON.stringify(p);
  return r.exhibits.find((e) => same(e.pick) || e.items?.some((it) => same(it.pick)));
}
