import type { Dataset, MemoryItem, Responses } from "@/lib/types";

export interface ComparisonBuckets {
  overlappingItems: MemoryItem[];
  comparableItems: MemoryItem[];
  shared: MemoryItem[];
  onlyMine: MemoryItem[];
  onlyFriend: MemoryItem[];
  neither: MemoryItem[];
  excludedNotApplicable: number;
}

/** Categorize only items asked of both people; N/A is never a one-sided answer. */
export function compareResponses(
  mine: Responses,
  mineAsked: string[],
  friend: Responses,
  friendAsked: string[],
  dataset: Dataset,
): ComparisonBuckets {
  const mineAskedSet = new Set(mineAsked);
  const friendAskedSet = new Set(friendAsked);
  const overlappingItems = dataset.items.filter(
    (item) => mineAskedSet.has(item.item_id) && friendAskedSet.has(item.item_id),
  );
  const comparableItems = overlappingItems.filter((item) =>
    isBinaryAnswer(mine[item.item_id]) && isBinaryAnswer(friend[item.item_id]),
  );
  const shared = comparableItems.filter(
    (item) => mine[item.item_id] === "experienced" && friend[item.item_id] === "experienced",
  );
  const onlyMine = comparableItems.filter(
    (item) => mine[item.item_id] === "experienced" && friend[item.item_id] === "not_experienced",
  );
  const onlyFriend = comparableItems.filter(
    (item) => mine[item.item_id] === "not_experienced" && friend[item.item_id] === "experienced",
  );
  const neither = comparableItems.filter(
    (item) => mine[item.item_id] === "not_experienced" && friend[item.item_id] === "not_experienced",
  );

  return {
    overlappingItems,
    comparableItems,
    shared,
    onlyMine,
    onlyFriend,
    neither,
    excludedNotApplicable: overlappingItems.length - comparableItems.length,
  };
}

function isBinaryAnswer(answer: Responses[string] | undefined): boolean {
  return answer === "experienced" || answer === "not_experienced";
}
