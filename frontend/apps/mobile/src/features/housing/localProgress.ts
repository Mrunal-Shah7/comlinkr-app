// src/features/housing/localProgress.ts
//
// Progress the server does not keep, stored on the device: a listing's journey step (Enquired / Viewing /
// Applied) and the shared spaces this user has requested. Read and written by the detail routes.

import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const JOURNEY_KEY = "comlinkr_listing_journey";
const REQUESTED_KEY = "comlinkr_requested_rooms";

/** The saved journey step for one listing; `loaded` is false until storage has answered. */
export function useListingJourney(listingId: string) {
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
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
  }, [listingId]);
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
