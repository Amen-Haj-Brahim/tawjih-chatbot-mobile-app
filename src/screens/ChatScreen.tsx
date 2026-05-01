import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  SourceRow,
  askQuestion,
  checkHealth,
} from "../services/api";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "loading";
  text: string;
  sources?: SourceRow[];
};

const STARTER_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "مرحبا! اسألني على التوجيه الجامعي، الشعب، المؤسسات، أو شروط القبول.",
  },
];

const TAWJIH_URL = "https://www.tawjih.tn/";
const TYPEWRITER_INTERVAL_MS = 12;
const GRADIENT_DURATION_MS = 9000;

function MovingGradientBackground() {
  const driftAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(driftAnim, {
          toValue: 1,
          duration: GRADIENT_DURATION_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(driftAnim, {
          toValue: 0,
          duration: GRADIENT_DURATION_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [driftAnim]);

  const primaryMotion = {
    transform: [
      {
        translateX: driftAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-70, 70],
        }),
      },
      {
        translateY: driftAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [55, -65],
        }),
      },
    ],
  };

  const secondaryMotion = {
    opacity: driftAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.62, 0.92, 0.62],
    }),
    transform: [
      {
        translateX: driftAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [60, -60],
        }),
      },
      {
        translateY: driftAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-50, 60],
        }),
      },
    ],
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={["#041E42", "#075985", "#38BDF8"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.gradientLayer, primaryMotion]}>
        <LinearGradient
          colors={["rgba(14, 165, 233, 0.85)", "rgba(2, 132, 199, 0.2)", "rgba(3, 7, 18, 0)"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.gradientFill}
        />
      </Animated.View>
      <Animated.View style={[styles.gradientLayer, secondaryMotion]}>
        <LinearGradient
          colors={["rgba(2, 6, 23, 0.78)", "rgba(56, 189, 248, 0.34)", "rgba(125, 211, 252, 0.68)"]}
          end={{ x: 0.1, y: 1 }}
          start={{ x: 1, y: 0 }}
          style={styles.gradientFill}
        />
      </Animated.View>
    </View>
  );
}

export function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>(STARTER_MESSAGES);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const canSend = question.trim().length > 0 && !isSending;

  useEffect(() => {
    checkHealth().then(setIsOnline);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: true }),
    );
  }, [messages]);

  const statusText = useMemo(() => {
    if (isOnline === null) {
      return "checking";
    }

    return isOnline ? "connected" : "offline";
  }, [isOnline]);

  const sendQuestion = async () => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmedQuestion,
    };

    setMessages((current) => [...current, userMessage]);
    const loadingMessageId = `loading-${Date.now()}`;

    setMessages((current) => [
      ...current,
      {
        id: loadingMessageId,
        role: "loading",
        text: "Thinking...",
      },
    ]);
    setQuestion("");
    setIsSending(true);

    try {
      const result = await askQuestion(trimmedQuestion);
      setMessages((current) =>
        current.map((message) =>
          message.id === loadingMessageId
            ? {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                text: result.answer,
                sources: result.sources,
              }
            : message,
        ),
      );
      setIsOnline(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not reach the chatbot service. Check the backend URL.";

      setMessages((current) =>
        current.map((item) =>
          item.id === loadingMessageId
            ? {
                id: `error-${Date.now()}`,
                role: "assistant",
                text: `Sorry, I could not get an answer. ${message}`,
              }
            : item,
        ),
      );
      setIsOnline(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <MovingGradientBackground />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Tawjih Chatbot</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.inlineStatusDot,
                isOnline ? styles.statusDotOnline : styles.statusDotOff,
                isOnline === false && styles.statusDotError,
              ]}
            />
            <Text
              style={[styles.status, isOnline === false && styles.statusError]}
            >
              {statusText}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Open Tawjih website"
          onPress={() => Linking.openURL(TAWJIH_URL)}
          style={({ pressed }) => [
            styles.logoWrap,
            pressed && styles.logoWrapPressed,
          ]}
        >
          <Image
            source={require("../../logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <MessageBubble message={item} />}
      />

      <View style={styles.composer}>
        <TextInput
          multiline
          placeholder="اكتب سؤالك هنا..."
          placeholderTextColor="#94A3B8"
          style={styles.input}
          value={question}
          onChangeText={setQuestion}
          textAlign="right"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send question"
          disabled={!canSend}
          onPress={sendQuestion}
          style={({ pressed }) => [
            styles.sendButton,
            !canSend && styles.sendButtonDisabled,
            pressed && canSend && styles.sendButtonPressed,
          ]}
        >
          {isSending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons color="#FFFFFF" name="send" size={20} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isLoading = message.role === "loading";
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [renderSources, setRenderSources] = useState(false);
  const [displayedText, setDisplayedText] = useState(message.text);
  const [dotCount, setDotCount] = useState(1);
  const bubbleAnim = useRef(
    new Animated.Value(message.id === "welcome" ? 1 : 0),
  ).current;
  const textFadeAnim = useRef(new Animated.Value(1)).current;
  const sourceAnim = useRef(new Animated.Value(0)).current;
  const hasSources = !isUser && Boolean(message.sources?.length);
  const shouldTypeText =
    message.role === "assistant" && message.id !== "welcome";

  useEffect(() => {
    if (message.id === "welcome") {
      return;
    }

    Animated.spring(bubbleAnim, {
      toValue: 1,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [bubbleAnim, message.id]);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const interval = setInterval(() => {
      setDotCount((current) => (current === 3 ? 1 : current + 1));
    }, 400);

    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (!shouldTypeText) {
      setDisplayedText(message.text);
      return;
    }

    const characters = Array.from(message.text);
    let index = 0;
    setDisplayedText("");

    const interval = setInterval(() => {
      index += 1;
      setDisplayedText(characters.slice(0, index).join(""));
      textFadeAnim.setValue(0.72);
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 90,
        useNativeDriver: true,
      }).start();

      if (index >= characters.length) {
        clearInterval(interval);
      }
    }, TYPEWRITER_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [message.id, message.text, shouldTypeText, textFadeAnim]);

  useEffect(() => {
    if (sourcesExpanded) {
      setRenderSources(true);
      Animated.timing(sourceAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(sourceAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setRenderSources(false);
      }
    });
  }, [sourceAnim, sourcesExpanded]);

  const sourceChevronStyle = {
    transform: [
      {
        rotate: sourceAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "180deg"],
        }),
      },
    ],
  };

  const sourceContentStyle = {
    opacity: sourceAnim,
    transform: [
      {
        translateY: sourceAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-6, 0],
        }),
      },
    ],
  };

  const bubbleEntryStyle = {
    opacity: bubbleAnim,
    transform: [
      {
        translateY: bubbleAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
      {
        scale: bubbleAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1],
        }),
      },
    ],
  };

  return (
    <Animated.View
      style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.assistantBubble,
        bubbleEntryStyle,
      ]}
    >
      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#2563EB" size="small" />
          <Text style={styles.loadingText}>Thinking{".".repeat(dotCount)}</Text>
        </View>
      ) : (
        <Animated.Text
          style={[
            styles.messageText,
            isUser && styles.userMessageText,
            shouldTypeText && { opacity: textFadeAnim },
          ]}
        >
          {displayedText}
        </Animated.Text>
      )}
      {hasSources ? (
        <View style={styles.sources}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              sourcesExpanded ? "Hide sources" : "Show sources"
            }
            onPress={() => setSourcesExpanded((expanded) => !expanded)}
            style={({ pressed }) => [
              styles.sourcesToggle,
              pressed && styles.sourcesTogglePressed,
            ]}
          >
            <Text style={styles.sourcesTitle}>
              Sources ({message.sources?.length})
            </Text>
            <Animated.View style={sourceChevronStyle}>
              <Ionicons color="#475569" name="chevron-down" size={18} />
            </Animated.View>
          </Pressable>

          {renderSources ? (
            <Animated.View style={sourceContentStyle}>
              {message.sources?.slice(0, 3).map((source, index) => (
                <View
                  key={`${source.source}-${source.row}-${index}`}
                  style={styles.sourceItem}
                >
                  <Text style={styles.sourceProgram}>
                    {source.program || source.source}
                  </Text>
                  <Text style={styles.sourceMeta}>
                    {[source.university, source.establishment, source.code]
                      .filter(Boolean)
                      .join(" - ")}
                  </Text>
                </View>
              ))}
            </Animated.View>
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#041E42",
    flex: 1,
  },
  gradientLayer: {
    bottom: -90,
    left: -90,
    position: "absolute",
    right: -90,
    top: -90,
  },
  gradientFill: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    backgroundColor: "rgba(2, 6, 23, 0.12)",
    borderBottomColor: "rgba(255, 255, 255, 0.18)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerText: {
    flex: 1,
    paddingRight: 14,
  },
  logoWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    position: "relative",
    width: 48,
  },
  logoWrapPressed: {
    opacity: 0.75,
  },
  logo: {
    height: 36,
    width: 36,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  status: {
    color: "rgba(255, 255, 255, 0.86)",
    fontSize: 12,
  },
  statusError: {
    color: "#FEE2E2",
  },
  inlineStatusDot: {
    borderColor: "rgba(255, 255, 255, 0.82)",
    borderRadius: 5,
    borderWidth: 1,
    height: 10,
    width: 10,
  },
  statusDot: {
    borderColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 2,
    bottom: -2,
    height: 12,
    position: "absolute",
    right: -2,
    width: 12,
  },
  statusDotOnline: {
    backgroundColor: "#16A34A",
  },
  statusDotOff: {
    backgroundColor: "#CBD5E1",
  },
  statusDotError: {
    backgroundColor: "#EF4444",
  },
  messages: {
    gap: 12,
    padding: 16,
  },
  bubble: {
    borderRadius: 8,
    maxWidth: "88%",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(226, 232, 240, 0.8)",
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
  },
  messageText: {
    color: "#0F172A",
    fontSize: 16,
    lineHeight: 24,
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  loadingText: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "600",
  },
  userMessageText: {
    color: "#FFFFFF",
  },
  sources: {
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 8,
  },
  sourcesToggle: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 32,
  },
  sourcesTogglePressed: {
    opacity: 0.72,
  },
  sourcesTitle: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  sourceItem: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    marginTop: 6,
    padding: 8,
  },
  sourceProgram: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
  },
  sourceMeta: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 3,
  },
  composer: {
    alignItems: "flex-end",
    backgroundColor: "rgba(2, 6, 23, 0.1)",
    borderTopColor: "rgba(255, 255, 255, 0.18)",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    borderColor: "rgba(255, 255, 255, 0.72)",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  sendButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  sendButtonPressed: {
    opacity: 0.82,
  },
});
