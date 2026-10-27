import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** false saat render di server dan hidrasi, true setelah komponen terpasang di browser. */
export const useMounted = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
