import React from "react";
import renderer, { act } from "react-test-renderer";

import { StatusPill } from "@/components/takeout/status-pill";

function renderRoot(element: React.ReactElement) {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return (tree as renderer.ReactTestRenderer).root;
}

describe("StatusPill", () => {
  it("renders LIVE when online", () => {
    const tree = renderRoot(<StatusPill isOnline />);
    expect(tree.findByType("Text").props.children).toBe("LIVE");
  });

  it("renders OFFLINE when offline", () => {
    const tree = renderRoot(<StatusPill isOnline={false} />);
    expect(tree.findByType("Text").props.children).toBe("OFFLINE");
  });
});
