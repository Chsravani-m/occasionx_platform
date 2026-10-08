import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WebView } from "react-native-webview";

import { Screen, LoadingView } from "@/core/components/Screen";
import PrimaryButton from "@/core/components/PrimaryButton";
import { colors } from "@/core/theme/colors";
import { useAuth } from "@/core/context/AuthContext";
import { WEB_APP_URL } from "@/core/api/client";
import type { CustomerStackParamList } from "@/core/navigation/types";
import {
  getActiveCollabSession,
  setActiveCollabSession,
} from "@/features/collab-session/activeSession";
import {
  getCollabSession,
  sendCollabInvite,
  removeCollabService,
  sendCollabMessage,
  closeCollabSession,
  type CollabSessionState,
} from "@/features/collab-session/collabApi";

type Props = NativeStackScreenProps<CustomerStackParamList, "CollabSession">;

const POLL_INTERVAL_MS = 4000;

export default function CollabSessionScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const { user } = useAuth();

  const [session, setSession] = useState<CollabSessionState | null>(null);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notMine, setNotMine] = useState(false);

  const [inviteChannel, setInviteChannel] = useState<"EMAIL" | "WHATSAPP">("EMAIL");
  const [inviteContact, setInviteContact] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  const initialized = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const data = await getCollabSession(sessionId);
      setSession(data);
    } catch (e) {
      console.error(e);
    }
  }, [sessionId]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getCollabSession(sessionId);
        setSession(data);

        const active = await getActiveCollabSession();

        if (active?.sessionId === sessionId) {
          setMyParticipantId(active.participantId);
        } else if (user?.id === data.host_user_id) {
          const host = data.participants.find((p) => p.role === "HOST");
          if (host) {
            await setActiveCollabSession({
              sessionId: data.id,
              participantId: host.id,
              displayName: host.display_name,
            });
            setMyParticipantId(host.id);
          }
        } else {
          setNotMine(true);
        }
      } catch (e) {
        console.error(e);
        Alert.alert("Couldn't load this session.");
      } finally {
        setLoading(false);
        initialized.current = true;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  if (loading) return <LoadingView label="Loading session..." />;

  if (!session) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.title}>Session not found</Text>
          <Text style={styles.muted}>
            This planning session may have been closed or the link is
            incorrect.
          </Text>
        </View>
      </Screen>
    );
  }

  const isHost = myParticipantId
    ? session.participants.find((p) => p.id === myParticipantId)?.role === "HOST"
    : false;

  const guestSlotsUsed = session.participants.filter((p) => p.role === "GUEST").length;
  const guestSlotsLeft = Math.max(0, session.max_guests - guestSlotsUsed);

  // The host can only start a live screen share from the web app
  // (screen capture isn't available in Expo Go) - but a guest here
  // can still watch it, via an embedded WebView pointed at the web
  // app's compact session view. It authenticates as this same
  // participant via query params instead of shared browser storage,
  // since a fresh WebView has no access to the web app's localStorage.
  const watchingHostShare = Boolean(
    session.is_screen_sharing &&
      session.sharing_participant_id &&
      session.sharing_participant_id !== myParticipantId
  );
  const myDisplayName =
    session.participants.find((p) => p.id === myParticipantId)?.display_name ||
    user?.fullName ||
    "Guest";
  const screenShareViewerUrl = myParticipantId
    ? `${WEB_APP_URL}/collab/${session.id}?participant=${myParticipantId}&name=${encodeURIComponent(myDisplayName)}&compact=1`
    : null;

  const handleInvite = async () => {
    if (!user?.id) return;
    if (!inviteContact.trim()) {
      Alert.alert(
        inviteChannel === "EMAIL" ? "Enter an email address" : "Enter a WhatsApp number"
      );
      return;
    }
    try {
      setInviting(true);
      const result = await sendCollabInvite(
        session.id,
        user.id,
        inviteContact.trim(),
        inviteChannel,
        inviteName.trim() || undefined
      );
      setInviteContact("");
      setInviteName("");
      refresh();

      if (result.delivered) {
        Alert.alert(
          "Invite sent",
          `We sent an invite via ${inviteChannel === "EMAIL" ? "email" : "WhatsApp"}.`
        );
      } else {
        // Delivery isn't configured yet (no SMTP/WhatsApp creds) - the
        // link is the only way to share it, so it has to be surfaced
        // here rather than silently dropped.
        Alert.alert(
          "Invite created",
          `Delivery isn't set up yet, so share this link manually:\n\n${result.invite_link}`
        );
      }
    } catch (e: any) {
      const detail = e?.response?.data?.detail || "Couldn't send invite.";
      Alert.alert(detail);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveService = async (itemId: string) => {
    try {
      await removeCollabService(session.id, itemId);
      refresh();
    } catch (e) {
      console.error(e);
      Alert.alert("Couldn't remove that item.");
    }
  };

  const handleSendChat = async () => {
    if (!myParticipantId || !chatInput.trim()) return;
    try {
      setSendingChat(true);
      await sendCollabMessage(session.id, myParticipantId, chatInput.trim());
      setChatInput("");
      refresh();
    } catch (e) {
      console.error(e);
      Alert.alert("Couldn't send that message.");
    } finally {
      setSendingChat(false);
    }
  };

  const handleClose = async () => {
    if (!user?.id) return;
    try {
      await closeCollabSession(session.id, user.id);
      refresh();
    } catch (e) {
      console.error(e);
      Alert.alert("Couldn't close the session.");
    }
  };

  if (notMine) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.title}>Open this from your invite link</Text>
          <Text style={styles.muted}>
            This session isn&apos;t linked to this device. Use the join link
            that was emailed or sent to you on WhatsApp.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{session.title || "Plan Together"}</Text>
            <Text style={styles.subtitle}>
              Hosted by {session.host_name} · {session.status === "ACTIVE" ? "Active" : "Closed"}
            </Text>
          </View>
          {isHost && session.status === "ACTIVE" && (
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          )}
        </View>

        {/* Live screen share (view-only on mobile - see web app for
            starting one) */}
        {watchingHostShare && screenShareViewerUrl && (
          <View style={styles.shareCard}>
            <Text style={styles.shareCardLabel}>
              {session.host_name}&apos;s screen
            </Text>
            <View style={styles.shareCardViewer}>
              <WebView
                source={{ uri: screenShareViewerUrl }}
                style={styles.shareCardWebview}
                javaScriptEnabled
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                originWhitelist={["*"]}
              />
            </View>
          </View>
        )}

        {/* Participants */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="people-outline" size={18} color={colors.text} />
            <Text style={styles.cardTitle}>
              Participants ({session.participants.length})
            </Text>
          </View>

          <View style={styles.chipRow}>
            {session.participants.map((p) => (
              <View
                key={p.id}
                style={[
                  styles.chip,
                  p.role === "HOST"
                    ? styles.chipHost
                    : p.joined_at
                      ? styles.chipJoined
                      : styles.chipPending,
                ]}
              >
                <Text
                  style={
                    p.role === "HOST" ? styles.chipHostText : styles.chipText
                  }
                >
                  {p.display_name}
                  {p.role === "HOST" ? " (Host)" : p.joined_at ? "" : " (Invited)"}
                </Text>
              </View>
            ))}
          </View>

          {isHost && session.status === "ACTIVE" && (
            <View style={styles.inviteBox}>
              <Text style={styles.inviteLabel}>
                Invite up to {session.max_guests} people
                {guestSlotsLeft > 0
                  ? ` (${guestSlotsLeft} slot${guestSlotsLeft === 1 ? "" : "s"} left)`
                  : " (all slots used)"}
              </Text>

              {guestSlotsLeft > 0 && (
                <>
                  <View style={styles.channelRow}>
                    <Pressable
                      style={[
                        styles.channelButton,
                        inviteChannel === "EMAIL" && styles.channelButtonActive,
                      ]}
                      onPress={() => setInviteChannel("EMAIL")}
                    >
                      <Text
                        style={
                          inviteChannel === "EMAIL"
                            ? styles.channelTextActive
                            : styles.channelText
                        }
                      >
                        Email
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.channelButton,
                        inviteChannel === "WHATSAPP" && styles.channelButtonActive,
                      ]}
                      onPress={() => setInviteChannel("WHATSAPP")}
                    >
                      <Text
                        style={
                          inviteChannel === "WHATSAPP"
                            ? styles.channelTextActive
                            : styles.channelText
                        }
                      >
                        WhatsApp
                      </Text>
                    </Pressable>
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="Name (optional)"
                    value={inviteName}
                    onChangeText={setInviteName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={
                      inviteChannel === "EMAIL"
                        ? "friend@example.com"
                        : "10-digit phone number"
                    }
                    value={inviteContact}
                    onChangeText={setInviteContact}
                    autoCapitalize="none"
                    keyboardType={
                      inviteChannel === "EMAIL" ? "email-address" : "phone-pad"
                    }
                  />
                  <PrimaryButton
                    label={inviting ? "Sending..." : "Send Invite"}
                    onPress={handleInvite}
                    disabled={inviting}
                  />
                </>
              )}
            </View>
          )}
        </View>

        {/* Shared services - hidden while a screen share is live, same
            as the web app, since everyone's looking at the shared
            screen at that point instead. */}
        {!session.is_screen_sharing && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Shared Services ({session.selected_services.length})
            </Text>
            <Text style={styles.muted}>
              Open any provider&apos;s page while this session is active and use
              &quot;Add to Group Session&quot; to add it here.
            </Text>
            <Pressable onPress={() => navigation.navigate("Browse")} hitSlop={8}>
              <Text style={styles.browseLink}>Browse providers</Text>
            </Pressable>

            {session.selected_services.length === 0 ? (
              <Text style={styles.emptyText}>Nothing added yet.</Text>
            ) : (
              session.selected_services.map((item) => (
                <View key={item.id} style={styles.serviceRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceName}>
                      {item.provider_name || "Provider"}
                    </Text>
                    <Text style={styles.serviceMeta}>
                      {item.category_name}
                      {item.added_by_name ? ` · added by ${item.added_by_name}` : ""}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleRemoveService(item.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {/* Chat */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Group Chat</Text>

          {session.messages.length === 0 ? (
            <Text style={styles.emptyText}>No messages yet - say hello!</Text>
          ) : (
            session.messages.map((m) => (
              <Text key={m.id} style={styles.chatLine}>
                <Text style={styles.chatSender}>{m.sender_name}: </Text>
                {m.message}
              </Text>
            ))
          )}

          {session.status === "ACTIVE" && myParticipantId && (
            <View style={styles.chatInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Type a message..."
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={handleSendChat}
              />
              <Pressable
                onPress={handleSendChat}
                disabled={sendingChat}
                style={styles.sendButton}
              >
                <Ionicons name="send" size={18} color={colors.white} />
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  muted: { color: colors.textMuted, marginTop: 6, fontSize: 13 },
  closeButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeButtonText: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  shareCard: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
  },
  shareCardLabel: { color: "#E5E7EB", fontSize: 12, fontWeight: "600", marginBottom: 8 },
  shareCardViewer: {
    height: 220,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  shareCardWebview: { flex: 1, backgroundColor: "#000" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipHost: { backgroundColor: colors.primary },
  chipJoined: { backgroundColor: "#DCFCE7" },
  chipPending: { backgroundColor: colors.border },
  chipHostText: { color: colors.white, fontSize: 12, fontWeight: "600" },
  chipText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  inviteBox: { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  inviteLabel: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 8 },
  channelRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  channelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  channelButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  channelText: { color: colors.text, fontSize: 13 },
  channelTextActive: { color: colors.white, fontSize: 13, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    fontSize: 14,
    color: colors.text,
  },
  browseLink: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  emptyText: { marginTop: 10, color: colors.textMuted, fontSize: 13 },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 10,
  },
  serviceName: { fontWeight: "600", color: colors.text, fontSize: 13 },
  serviceMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  chatLine: { marginTop: 8, fontSize: 13, color: colors.text },
  chatSender: { fontWeight: "700", color: colors.primary },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 10,
  },
});
