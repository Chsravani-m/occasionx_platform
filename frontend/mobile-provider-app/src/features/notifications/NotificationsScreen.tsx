import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import {
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  Notification,
} from "@/features/notifications/notificationApi";
import { useAuth } from "@/core/context/AuthContext";
import { Screen, LoadingView } from "@/core/components/Screen";
import { colors } from "@/core/theme/colors";

// Mirrors mobile-customer-app's NotificationsScreen - new booking
// requests, cancellations, and payments all land here (see
// create_notification calls in booking-service's crud/booking.py).
export default function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    const data = await getUserNotifications(user.id);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  if (loading) return <LoadingView />;

  const handleMarkAll = async () => {
    if (!user?.id) return;
    await markAllNotificationsRead(user.id);
    load();
  };

  const handleTap = async (n: Notification) => {
    if (!n.is_read) {
      await markNotificationRead(n.id);
      load();
    }
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Notifications</Text>
        <Pressable onPress={handleMarkAll}>
          <Text style={styles.markAll}>Mark all read</Text>
        </Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        style={styles.flatList}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No notifications yet. New booking requests and updates will show up here.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, !item.is_read && styles.unreadCard]}
            onPress={() => handleTap(item)}
          >
            <Text style={styles.notifTitle}>{item.title}</Text>
            {item.message ? <Text style={styles.notifMessage}>{item.message}</Text> : null}
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  markAll: { color: colors.primary, fontWeight: "600" },
  flatList: { flex: 1 },
  list: { padding: 16 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 60, paddingHorizontal: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadCard: { borderColor: colors.primary, backgroundColor: "#EFF4FF" },
  notifTitle: { fontWeight: "600", color: colors.text },
  notifMessage: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
});
