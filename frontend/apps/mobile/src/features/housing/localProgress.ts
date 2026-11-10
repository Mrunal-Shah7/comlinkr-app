// src/features/housing/localProgress.ts
//
// Progress the server does not keep, stored on the device: a listing's journey step (Enquired / Viewing /
// Applied) and the shared spaces this user has requested. Read and written by the detail routes.

import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const JOURNEY_KEY = "comlinkr_listing_journey";
const REQUESTED_KEY = "comlinkr_requested_rooms";

/** The saved journey step for one listing; `loaded` is false until storage has answered. */
/**
 * Set a listing's journey step from a screen that is not the detail, such as Apply. By default it only raises the
 * step; withdrawing an application lowers it (`lower: true`).
 */
export async function raiseListingJourneyStep(id: string, next: number, lower = false): Promise<void> {
  try {
    const val = await AsyncStorage.getItem(JOURNEY_KEY);
    const map = val ? (JSON.parse(val) as Record<string, number>) : {};
    if (!lower && (map[id] ?? 0) >= next) return;
    await AsyncStorage.setItem(JOURNEY_KEY, JSON.stringify({ ...map, [id]: next }));
  } catch { /* storage unavailable */ }
}

export function useListingJourney(listingId: string) {
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // Read again whenever the detail is shown: the Apply screen opened on top of it may have moved the step on.
  const [focusCount, setFocusCount] = useState(0);
  useFocusEffect(useCallback(() => { setFocusCount((n) => n + 1); }, []));
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(JOURNEY_KEY)
      .then((val) => {
        if (!live) return;
        try {
          const map = val ? (JSON.parse(val) as Record<string, number>) : {};
          setStep(map[listingId] ?? 0);
        } catch { /* corrupt value: start from 0 */ }
      })
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, [listingId, focusCount]);
  const save = useCallback(async (id: string, next: number) => {
    setStep(next);
    try {
      const val = await AsyncStorage.getItem(JOURNEY_KEY);
      const map = val ? (JSON.parse(val) as Record<string, number>) : {};
      await AsyncStorage.setItem(JOURNEY_KEY, JSON.stringify({ ...map, [id]: next }));
    } catch { /* storage unavailable: the step lasts for this visit only */ }
  }, []);
  return { step, loaded, save };
}

/** Whether this user has requested the shared space, and a setter that remembers it. */
export function useRoomRequested(roomId: string) {
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(REQUESTED_KEY).then((val) => {
      if (!live || !val) return;
      try {
        setRequested((JSON.parse(val) as string[]).includes(roomId));
      } catch { /* ignore */ }
    });
    return () => {
      live = false;
    };
  }, [roomId]);
  const markRequested = useCallback(async () => {
    setRequested(true);
    try {
      const val = await AsyncStorage.getItem(REQUESTED_KEY);
      const list = val ? (JSON.parse(val) as string[]) : [];
      if (!list.includes(roomId)) await AsyncStorage.setItem(REQUESTED_KEY, JSON.stringify([...list, roomId]));
    } catch { /* ignore */ }
  }, [roomId]);
  return { requested, markRequested };
}
