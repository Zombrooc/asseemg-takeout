import React from "react";
import renderer, { act } from "react-test-renderer";

import { ParticipantListItem } from "@/components/takeout/participant-list-item";

function renderRoot(element: React.ReactElement) {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return (tree as renderer.ReactTestRenderer).root;
}

describe("ParticipantListItem states", () => {
  const base = {
    id: "p1",
    ticketId: "t1",
    name: "João",
    ticketLabel: "VIP-01",
    onPrimaryAction: jest.fn(),
    onDismissConflict: jest.fn(),
  };

  it.each([
    ["default", { isConfirmed: false, isPendingSync: false, isConflict: false, lockedByOther: false }, "Fazer check-in"],
    ["confirmed", { isConfirmed: true, isPendingSync: false, isConflict: false, lockedByOther: false }, "Check-in feito"],
    ["pending", { isConfirmed: false, isPendingSync: true, isConflict: false, lockedByOther: false }, "Pendente"],
    ["conflict", { isConfirmed: false, isPendingSync: false, isConflict: true, lockedByOther: false }, "Dispensar"],
    ["locked", { isConfirmed: false, isPendingSync: false, isConflict: false, lockedByOther: true }, "Em atendimento"],
  ])("renders %s state", (_name, state, expectedText) => {
    const tree = renderRoot(<ParticipantListItem {...base} {...state} />);
    const textNodes = tree.findAllByType("Text").map((n) => String(n.props.children));
    expect(textNodes.join(" ")).toContain(expectedText);
  });
});
