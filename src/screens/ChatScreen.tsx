import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { API_BASE_URL, SourceRow, askQuestion, checkHealth } from '../services/api';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'loading';
  text: string;
  sources?: SourceRow[];
};

const STARTER_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: 'مرحبا! اسألني على التوجيه الجامعي، الشعب، المؤسسات، أو شروط القبول.',
  },
];

const TAWJIH_URL = 'https://www.tawjih.tn/';

export function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>(STARTER_MESSAGES);
  const [question, setQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const canSend = question.trim().length > 0 && !isSending;

  useEffect(() => {
    checkHealth().then(setIsOnline);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [messages]);

  const statusText = useMemo(() => {
    if (isOnline === null) {
      return 'Checking backend...';
    }

    return isOnline ? 'Backend connected' : `Backend not reachable at ${API_BASE_URL}`;
  }, [isOnline]);

  const sendQuestion = async () => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmedQuestion,
    };

    setMessages((current) => [...current, userMessage]);
    const loadingMessageId = `loading-${Date.now()}`;

    setMessages((current) => [
      ...current,
      {
        id: loadingMessageId,
        role: 'loading',
        text: 'Thinking...',
      },
    ]);
    setQuestion('');
    setIsSending(true);

    try {
      const result = await askQuestion(trimmedQuestion);
      setMessages((current) =>
        current.map((message) =>
          message.id === loadingMessageId
            ? {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
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
          : 'Could not reach the chatbot service. Check the backend URL.';

      setMessages((current) =>
        current.map((item) =>
          item.id === loadingMessageId
            ? {
                id: `error-${Date.now()}`,
                role: 'assistant',
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
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Tawjih Chatbot</Text>
          <Text style={[styles.status, isOnline === false && styles.statusError]}>
            {statusText}
          </Text>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Open Tawjih website"
          onPress={() => Linking.openURL(TAWJIH_URL)}
          style={({ pressed }) => [styles.logoWrap, pressed && styles.logoWrapPressed]}
        >
          <Image source={require('../../logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={[styles.statusDot, isOnline ? styles.statusDotOnline : styles.statusDotOff]} />
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
  const isUser = message.role === 'user';
  const isLoading = message.role === 'loading';
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const hasSources = !isUser && Boolean(message.sources?.length);

  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#2563EB" size="small" />
          <Text style={styles.loadingText}>Thinking...</Text>
        </View>
      ) : (
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>{message.text}</Text>
      )}
      {hasSources ? (
        <View style={styles.sources}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={sourcesExpanded ? 'Hide sources' : 'Show sources'}
            onPress={() => setSourcesExpanded((expanded) => !expanded)}
            style={({ pressed }) => [styles.sourcesToggle, pressed && styles.sourcesTogglePressed]}
          >
            <Text style={styles.sourcesTitle}>Sources ({message.sources?.length})</Text>
            <Ionicons
              color="#475569"
              name={sourcesExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
            />
          </Pressable>

          {sourcesExpanded
            ? message.sources?.slice(0, 3).map((source, index) => (
                <View key={`${source.source}-${source.row}-${index}`} style={styles.sourceItem}>
                  <Text style={styles.sourceProgram}>{source.program || source.source}</Text>
                  <Text style={styles.sourceMeta}>
                    {[source.university, source.establishment, source.code]
                      .filter(Boolean)
                      .join(' - ')}
                  </Text>
                </View>
              ))
            : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerText: {
    flex: 1,
    paddingRight: 14,
  },
  logoWrap: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    position: 'relative',
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
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
  },
  status: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
  statusError: {
    color: '#DC2626',
  },
  statusDot: {
    borderColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 2,
    bottom: -2,
    height: 12,
    position: 'absolute',
    right: -2,
    width: 12,
  },
  statusDotOnline: {
    backgroundColor: '#16A34A',
  },
  statusDotOff: {
    backgroundColor: '#CBD5E1',
  },
  messages: {
    gap: 12,
    padding: 16,
  },
  bubble: {
    borderRadius: 8,
    maxWidth: '88%',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563EB',
  },
  messageText: {
    color: '#0F172A',
    fontSize: 16,
    lineHeight: 24,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  sources: {
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 8,
  },
  sourcesToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  sourcesTogglePressed: {
    opacity: 0.72,
  },
  sourcesTitle: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sourceItem: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginTop: 6,
    padding: 8,
  },
  sourceProgram: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  sourceMeta: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
  },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0F172A',
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  sendButtonPressed: {
    opacity: 0.82,
  },
});
