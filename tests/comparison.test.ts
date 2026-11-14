import { describe, expect, it } from "vitest";
import { DEFAULT_DATASET } from "../lib/data";
import { compareResponses } from "../lib/comparison";

describe("shared-question comparison", () => {
  it("compares only overlap, separates both no, and excludes N/A", () => {
    const ids = DEFAULT_DATASET.items.slice(0, 6).map((item) => item.item_id);
    const [sharedId, mineId, friendId, neitherId, naMineId, naFriendId] = ids;
    const result = compareResponses(
      {
        [sharedId]: "experienced",
        [mineId]: "experienced",
        [friendId]: "not_experienced",
        [neitherId]: "not_experienced",
        [naMineId]: "not_applicable",
        [naFriendId]: "experienced",
        // This answer was not asked of the friend and must not enter the diff.
        [DEFAULT_DATASET.items[6].item_id]: "experienced",
      },
      [...ids, DEFAULT_DATASET.items[6].item_id],
      {
        [sharedId]: "experienced",
        [mineId]: "not_experienced",
        [friendId]: "experienced",
        [neitherId]: "not_experienced",
        [naMineId]: "experienced",
        [naFriendId]: "not_applicable",
      },
      ids,
      DEFAULT_DATASET,
    );

    expect(result.overlappingItems.map((item) => item.item_id)).toEqual(ids);
    expect(result.comparableItems).toHaveLength(4);
    expect(result.shared.map((item) => item.item_id)).toEqual([sharedId]);
    expect(result.onlyMine.map((item) => item.item_id)).toEqual([mineId]);
    expect(result.onlyFriend.map((item) => item.item_id)).toEqual([friendId]);
    expect(result.neither.map((item) => item.item_id)).toEqual([neitherId]);
    expect(result.excludedNotApplicable).toBe(2);
  });

  it("returns no compared items when the asked-ID sets do not overlap", () => {
    const [mineId, friendId] = DEFAULT_DATASET.items.slice(0, 2).map((item) => item.item_id);
    const result = compareResponses(
      { [mineId]: "experienced" },
      [mineId],
      { [friendId]: "not_experienced" },
      [friendId],
      DEFAULT_DATASET,
    );
    expect(result.overlappingItems).toHaveLength(0);
    expect(result.comparableItems).toHaveLength(0);
  });
});
