import React from "react";

function createPrimitive(name: string) {
  return ({ children, ...props }: any) => React.createElement(name, props, children);
}

export const View = createPrimitive("View");
export const Text = createPrimitive("Text");
export const Pressable = createPrimitive("Pressable");
export const ScrollView = createPrimitive("ScrollView");
export const ActivityIndicator = createPrimitive("ActivityIndicator");
export const FlatList = ({ data = [], renderItem, ListEmptyComponent }: any) => {
  if (!data.length && ListEmptyComponent) return React.createElement(ListEmptyComponent, null);
  return React.createElement(
    "FlatList",
    null,
    data.map((item: any, idx: number) => React.createElement("Item", { key: idx }, renderItem({ item }))),
  );
};
export const Modal = ({ visible, children }: any) => (visible ? React.createElement("Modal", null, children) : null);
export const TextInput = createPrimitive("TextInput");
export const Alert = { alert: jest.fn() };
export const BackHandler = { addEventListener: jest.fn(() => ({ remove: jest.fn() })) };
export const AppState = { addEventListener: jest.fn(() => ({ remove: jest.fn() })) };
