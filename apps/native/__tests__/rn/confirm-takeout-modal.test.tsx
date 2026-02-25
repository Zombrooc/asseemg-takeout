import React from "react";
import renderer, { act } from "react-test-renderer";

import { ConfirmTakeoutModal } from "@/components/takeout/confirm-takeout-modal";

const postTakeoutConfirm = jest.fn();
const postLocksAcquire = jest.fn().mockResolvedValue(undefined);
const postLocksRenew = jest.fn().mockResolvedValue(undefined);
const deleteLocksRelease = jest.fn().mockResolvedValue(undefined);

jest.mock("@/contexts/takeout-connection-context", () => ({
  useTakeoutConnection: () => ({
    api: { postTakeoutConfirm, postLocksAcquire, postLocksRenew, deleteLocksRelease },
    deviceId: "dev-1",
  }),
}));

jest.mock("@/lib/takeout-queue", () => ({ addToQueue: jest.fn().mockResolvedValue(undefined) }));

function renderRoot(element: React.ReactElement) {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return (tree as renderer.ReactTestRenderer).root;
}

describe("ConfirmTakeoutModal", () => {
  beforeEach(() => jest.clearAllMocks());

  it("submits on confirm CTA", async () => {
    postTakeoutConfirm.mockResolvedValue({ status: "CONFIRMED" });
    const onConfirmed = jest.fn();
    const onClose = jest.fn();

    const tree = renderRoot(
      <ConfirmTakeoutModal
        visible
        participant={{ id: "p1", ticketId: "t1", name: "Nome" } as any}
        onClose={onClose}
        onConfirmed={onConfirmed}
      />,
    );

    await act(async () => {
      tree.findByProps({ testID: "cta-confirmar" }).props.onPress();
    });

    expect(postTakeoutConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });
});
