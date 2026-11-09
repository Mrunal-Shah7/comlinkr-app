// src/hooks/useBackState.ts — in-screen Back history (plan 05, TR-023).
//
// useBackState works like useState, but every change the user makes is recorded in the screen's history. Android
// Back (the button or the edge swipe) undoes the last recorded change before it leaves the screen, so a section
// switch, a filter or a search is undone step by step, like the Play Store or Instagram.
//
// - `set` records; use it in event handlers (a tap, typing).
// - `setSilently` does not; use it in effects (route params, resets after a city change, defaults from data).
// - Changes made together (one tap that sets several values, "Clear all") are one step.
// - Typing is one step per burst (`coalesceMs`).
// - Everything changed while a sheet is open is one step: call `begin()` when it opens and `end()` when it closes
//   (useBackBatch).
//
// Only Android has a system Back that reaches JavaScript. On iOS the edge swipe pops a pushed screen and never
// undoes in-screen changes.
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { BackHandler } from "react-native";
import { useFocusEffect, useRoute } from "expo-router";

type Undo = () => boolean; // false when the value was already back where it started
type Entry = { time: number; owners: Map<number, Undo> };

const SAME_TAP_MS = 80; // changes this close together come from one action
const histories = new Map<string, Entry[]>();
const batches = new Map<string, Entry | null>(); // open sheet batch per screen
const users = new Map<string, number>(); // mounted hooks per screen, to drop a history on unmount
let nextOwner = 1;

function record(screen: string, owner: number, undo: Undo, coalesceMs: number) {
  const now = Date.now();
  const batch = batches.get(screen);
  if (batch) {
    if (!batch.owners.has(owner)) batch.owners.set(owner, undo); // keep the value from before the sheet opened
    batch.time = now;
    return;
  }
  const list = histories.get(screen) ?? [];
  const top = list[list.length - 1];
  if (top && now - top.time < SAME_TAP_MS) {
    if (!top.owners.has(owner)) top.owners.set(owner, undo);
    top.time = now;
  } else if (top && coalesceMs > 0 && top.owners.size === 1 && top.owners.has(owner) && now - top.time < coalesceMs) {
    top.time = now; // still the same burst of typing: keep the value from before it started
  } else {
    list.push({ time: now, owners: new Map([[owner, undo]]) });
  }
  histories.set(screen, list);
}

/** Undoes the screen's last step that still changes something. True when Back was used up. */
function undoLast(screen: string): boolean {
  const list = histories.get(screen);
  while (list && list.length) {
    const entry = list.pop()!;
    let changed = false;
    entry.owners.forEach((undo) => { if (undo()) changed = true; });
    if (changed) return true;
  }
  return false;
}

function useScreenKey(): string {
  const route = useRoute();
  return route?.key ?? "root";
}

/** Registers the screen's Back listener while it is focused, and drops its history when it unmounts. */
function useBackListener(screen: string) {
  useEffect(() => {
    users.set(screen, (users.get(screen) ?? 0) + 1);
    return () => {
      const n = (users.get(screen) ?? 1) - 1;
      if (n > 0) users.set(screen, n);
      else { users.delete(screen); histories.delete(screen); batches.delete(screen); }
    };
  }, [screen]);
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => undoLast(screen));
      return () => sub.remove();
    }, [screen]),
  );
}

export function useBackState<T>(
  initial: T | (() => T),
  options: { coalesceMs?: number } = {},
): [T, Dispatch<SetStateAction<T>>, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const screen = useScreenKey();
  const current = useRef(value);
  current.current = value;
  const owner = useRef(0);
  if (!owner.current) owner.current = nextOwner++;
  const coalesceMs = options.coalesceMs ?? 0;
  useBackListener(screen);

  const set = useCallback<Dispatch<SetStateAction<T>>>(
    (action) => {
      const prev = current.current;
      const next = typeof action === "function" ? (action as (p: T) => T)(prev) : action;
      if (Object.is(prev, next)) return;
      current.current = next;
      setValue(next);
      record(screen, owner.current, () => {
        if (Object.is(current.current, prev)) return false;
        current.current = prev;
        setValue(prev);
        return true;
      }, coalesceMs);
    },
    [screen, coalesceMs],
  );

  const setSilently = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    const next = typeof action === "function" ? (action as (p: T) => T)(current.current) : action;
    current.current = next;
    setValue(next);
  }, []);

  return [value, set, setSilently];
}

/** Groups the changes made while a sheet is open into one Back step. */
export function useBackBatch() {
  const screen = useScreenKey();
  const begin = useCallback(() => {
    if (!batches.get(screen)) batches.set(screen, { time: Date.now(), owners: new Map() });
  }, [screen]);
  const end = useCallback(() => {
    const batch = batches.get(screen);
    batches.set(screen, null);
    if (!batch || batch.owners.size === 0) return;
    const list = histories.get(screen) ?? [];
    list.push(batch);
    histories.set(screen, list);
  }, [screen]);
  return { begin, end };
}
