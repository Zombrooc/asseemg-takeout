import React from "react";
import renderer, { act } from "react-test-renderer";

import { AuditFilters } from "@/components/takeout/audit-filters";

function renderRoot(element: React.ReactElement) {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return (tree as renderer.ReactTestRenderer).root;
}

describe("AuditFilters", () => {
  it("calls callbacks and reset CTA", () => {
    const onQueryChange = jest.fn();
    const onStatusChange = jest.fn();
    const onReset = jest.fn();

    const tree = renderRoot(
      <AuditFilters
        query=""
        status=""
        onQueryChange={onQueryChange}
        onStatusChange={onStatusChange}
        onReset={onReset}
      />,
    );

    tree.findByProps({ testID: "audit-query-input" }).props.onChangeText("abc");
    tree.findByProps({ testID: "cta-reset" }).props.onPress();

    expect(onQueryChange).toHaveBeenCalledWith("abc");
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
