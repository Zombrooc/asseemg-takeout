import React from "react";
import renderer, { act } from "react-test-renderer";

import { EventCard } from "@/components/takeout/event-card";

function renderRoot(element: React.ReactElement) {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return (tree as renderer.ReactTestRenderer).root;
}

describe("EventCard", () => {
  it("calls onPress with event id", () => {
    const onPress = jest.fn();
    const tree = renderRoot(
      <EventCard eventId="ev-1" name="Evento 1" startDate="2025-02-10" onPress={onPress} />,
    );
    tree.findByProps({ testID: "event-card-ev-1" }).props.onPress();
    expect(onPress).toHaveBeenCalledWith("ev-1");
  });
});
