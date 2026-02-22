import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "takeout_pending_confirm";

export type PendingConfirmItem = {
  request_id: string;
  ticket_id: string;
  device_id: string;
  payload_json?: string;
  created_at: string;
};

export async function getPendingQueue(): Promise<PendingConfirmItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingConfirmItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addToQueue(item: Omit<PendingConfirmItem, "created_at">): Promise<void> {
  const list = await getPendingQueue();
  const withDate: PendingConfirmItem = {
    ...item,
    created_at: new Date().toISOString(),
  };
  list.push(withDate);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function removeFromQueue(requestId: string): Promise<void> {
  const list = await getPendingQueue();
  const next = list.filter((i) => i.request_id !== requestId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function setQueue(list: PendingConfirmItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
