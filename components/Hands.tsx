"use client";

import { memo } from "react";
import { FINGERS, type FingerId } from "@/lib/fingers";

const LEFT: FingerId[] = ["l-pinky", "l-ring", "l-middle", "l-index"];
const RIGHT: FingerId[] = ["r-index", "r-middle", "r-ring", "r-pinky"];

// finger lengths (pinky shortest, middle longest) + slight arc offsets
const LEN: Record<string, number> = {
  pinky: 34,
  ring: 46,
  middle: 52,
  index: 44,
};

function Hand({
  side,
  active,
}: {
  side: "left" | "right";
  active: FingerId | null;
}) {
  const fingers = side === "left" ? LEFT : RIGHT;
  const thumbActive = active === "thumb";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="glass relative flex items-end justify-center gap-[7px] rounded-3xl px-4 pb-2.5 pt-3"
        style={{ width: 152, height: 98 }}
      >
        {fingers.map((f) => {
          const kind = f.split("-")[1];
          const len = LEN[kind];
          const isActive = active === f;
          const info = FINGERS[f];
          return (
            <div key={f} className="flex w-[22px] flex-col items-center justify-end">
              <div
                className="w-[19px] rounded-full transition-all duration-200"
                style={{
                  height: len,
                  background: `linear-gradient(180deg, ${info.light} 0%, ${info.fill} 70%)`,
                  boxShadow: isActive
                    ? `inset 0 -2px 0 ${info.edge}, 0 0 0 2.5px #059669, 0 0 16px 3px rgba(5,150,105,.45), 0 8px 16px -6px rgba(5,150,105,.5)`
                    : `inset 0 -2px 0 ${info.edge}, inset 0 1px 0 rgba(255,255,255,.7)`,
                  transform: isActive ? "scale(1.14) translateY(-4px)" : "scale(1)",
                }}
              />
            </div>
          );
        })}
        {/* thumb */}
        <div
          className="absolute bottom-2 rounded-full transition-all duration-200"
          style={{
            [side === "left" ? "right" : "left"]: 7,
            width: 31,
            height: 13,
            background: `linear-gradient(180deg, ${FINGERS.thumb.light}, ${FINGERS.thumb.fill})`,
            boxShadow: thumbActive
              ? `inset 0 -2px 0 ${FINGERS.thumb.edge}, 0 0 0 2.5px #059669, 0 0 14px 2px rgba(5,150,105,.4)`
              : `inset 0 -2px 0 ${FINGERS.thumb.edge}, inset 0 1px 0 rgba(255,255,255,.7)`,
            transform: `rotate(${side === "left" ? "-24deg" : "24deg"}) ${thumbActive ? "scale(1.12)" : ""}`,
          }}
        />
      </div>
      <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
        {side === "left" ? "Left hand" : "Right hand"}
      </span>
    </div>
  );
}

function Hands({ active }: { active: FingerId | null }) {
  return (
    <div className="flex items-start justify-center gap-4 sm:gap-8" aria-hidden="true">
      <Hand side="left" active={active} />
      <Hand side="right" active={active} />
    </div>
  );
}

/* Memoized (performance pass): `active` is a primitive that only
   changes when the next character changes, so the 200ms stats tick
   and unrelated parent re-renders skip the hands entirely. */
export default memo(Hands);
