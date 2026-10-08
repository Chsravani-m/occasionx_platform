import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Screen, LoadingView } from "@/core/components/Screen";
import PrimaryButton from "@/core/components/PrimaryButton";
import { colors } from "@/core/theme/colors";
import { useAuth } from "@/core/context/AuthContext";
import type { CustomerStackParamList } from "@/core/navigation/types";
import { setActiveCollabSession } from "@/features/collab-session/activeSession";
import { previewCollabInvite, joinCollabSession } from "@/features/collab-session/collabApi";

type Props = NativeStackScreenProps<CustomerStackParamList, "CollabJoin">;

// No deep-link/universal-link handling is wired up yet, so a guest
// coming from an emailed/WhatsApp'd link opens it in their phone's
// browser (the web app's /collab/join/[token] page works fine there).
// This screen covers the case where they're already inside the app -
// paste the link or just the token to join from here instead.
function extractToken(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const parts = trimmed.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

export default function JoinSessionScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const initialToken = route.params?.token;

  const [tokenInput, setTokenInput] = useState(initialToken || "");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    session_id: string;
    host_name: string;
    title?: string | null;
    guest_name?: string | null;
    already_joined: boolean;
    session_closed: boolean;
  } | null>(null);

  const [displayName, setDisplayName] = useState(user?.fullName || "");
  const [joining, setJoining] = useState(false);

  const handleLookup = async () => {
    const token = extractToken(tokenInput);
    if (!token) {
      Alert.alert("Enter your invite link or code");
      return;
    }
    try {
      setLoading(true);
      const data = await previewCollabInvite(token);
      setPreview(data);
      if (!displayName) setDisplayName(data.guest_name || "");
    } catch (e) {
      console.error(e);
      Alert.alert("This invite link is invalid or has expired.");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialToken) {
      handleLookup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJoin = async () => {
    const token = extractToken(tokenInput);
    if (!displayName.trim()) {
      Alert.alert("Enter your name to join");
      return;
    }
    try {
      setJoining(true);
      const result = await joinCollabSession(token, displayName.trim(), user?.id);
      await setActiveCollabSession({
        sessionId: result.session_id,
        participantId: result.participant_id,
        displayName: displayName.trim(),
      });
      navigation.replace("CollabSession", { sessionId: result.session_id });
    } catch (e) {
      console.error(e);
      Alert.alert("Couldn't join this session. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <Screen>
      <View style={styles.content}>
        {!preview ? (
          <>
            <Text style={styles.title}>Join a Group Session</Text>
            <Text style={styles.muted}>
              Paste the invite link or code you received by email or
              WhatsApp.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Invite link or code"
              value={tokenInput}
              onChangeText={setTokenInput}
              autoCapitalize="none"
            />
            {loading ? (
              <LoadingView />
            ) : (
              <PrimaryButton label="Continue" onPress={handleLookup} />
            )}
          </>
        ) : preview.session_closed ? (
          <>
            <Text style={styles.title}>This session has ended</Text>
            <Text style={styles.muted}>
              {preview.host_name} has closed this planning session.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>
              {preview.host_name} invited you to plan together
            </Text>
            <Text style={styles.muted}>
              Join to pick services and chat about{" "}
              {preview.title || "the event"} - up to 4 people can be in this
              session.
            </Text>
            <Text style={styles.label}>Your name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              value={displayName}
              onChangeText={setDisplayName}
            />
            <PrimaryButton
              label={
                joining ? "Joining..." : preview.already_joined ? "Rejoin Session" : "Join Session"
              }
              onPress={handleJoin}
              disabled={joining}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 8 },
  muted: { color: colors.textMuted, fontSize: 13, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 14,
    color: colors.text,
  },
});
