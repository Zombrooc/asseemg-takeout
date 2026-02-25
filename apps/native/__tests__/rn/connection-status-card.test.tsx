import React from "react";
import renderer, { act } from "react-test-renderer";

import { ConnectionStatusCard } from "@/components/takeout/connection-status-card";

function renderRoot(element: React.ReactElement) {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return (tree as renderer.ReactTestRenderer).root;
}

describe("ConnectionStatusCard", () => {
  it("shows connected state", () => {
    const tree = renderRoot(
      <ConnectionStatusCard isReachable onReconnect={jest.fn()} onRetry={jest.fn()} />,
    );
    expect(tree.findAllByType("Text").some((t) => t.props.children === "Conectado ao desktop")).toBe(true);
  });

  it("triggers retry action with CTA", () => {
    const onRetry = jest.fn();
    const tree = renderRoot(
      <ConnectionStatusCard isReachable={false} onReconnect={jest.fn()} onRetry={onRetry} />,
    );
    const retry = tree.findByProps({ testID: "cta-conectar" });
    retry.props.onPress();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
