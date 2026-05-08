import React, { useEffect, useRef, useState } from "react";
import {
  findNodeHandle,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";

import TacticalScreen from "./TacticalScreen";

export default function KeyboardAwareScreen({
  bottomPadding = 0,
  children,
  contentContainerStyle,
  denseBackground = false,
  extraScrollHeight = 96,
  keyboardBottomPadding = 220,
  style,
  variant = "general",
}) {
  const scrollRef = useRef(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  function scrollToFocusedInput(inputRef) {
    const nodeHandle = findNodeHandle(inputRef?.current || inputRef);
    const responder = scrollRef.current?.getScrollResponder?.();

    if (!nodeHandle || !responder?.scrollResponderScrollNativeHandleToKeyboard) {
      return;
    }

    setTimeout(() => {
      responder.scrollResponderScrollNativeHandleToKeyboard(
        nodeHandle,
        extraScrollHeight,
        true
      );
    }, 80);
  }

  const renderedChildren = typeof children === "function"
    ? children({ scrollToFocusedInput })
    : children;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboard}
    >
      <TacticalScreen denseBackground={denseBackground} style={style} variant={variant}>
        <ScrollView
          contentContainerStyle={[
            contentContainerStyle,
            {
              paddingBottom: bottomPadding + (keyboardOpen ? keyboardBottomPadding : 0),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
        >
          {renderedChildren}
        </ScrollView>
      </TacticalScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
});
