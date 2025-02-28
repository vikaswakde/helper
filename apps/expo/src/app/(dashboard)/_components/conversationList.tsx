import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Animated, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";
import { UserIcon } from "react-native-heroicons/outline";
import { api, RouterOutputs } from "@/utils/api";
import { cssIconInterop } from "@/utils/css";
import { humanizeTime } from "@/utils/humanizeTime";

cssIconInterop(UserIcon);

type Conversation = RouterOutputs["mailbox"]["conversations"]["list"]["conversations"][number] & {
  height?: Animated.Value;
};

const ROW_HEIGHT = 72;

export function ConversationList({
  conversations,
  onRefresh,
  isRefreshing = false,
  isLoading = false,
  mailboxSlug,
}: {
  conversations?: RouterOutputs["mailbox"]["conversations"]["list"]["conversations"];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isLoading?: boolean;
  mailboxSlug: string;
}) {
  const { data: members } = api.organization.getMembers.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { mutateAsync: updateConversation } = api.mailbox.conversations.update.useMutation();

  const buildVisibleConversations = (
    conversations: RouterOutputs["mailbox"]["conversations"]["list"]["conversations"],
  ) => conversations.map((c) => ({ ...c, height: new Animated.Value(ROW_HEIGHT) }));

  const [visibleConversations, setVisibleConversations] = useState(buildVisibleConversations(conversations || []));

  useEffect(() => {
    setVisibleConversations(buildVisibleConversations(conversations || []));
  }, [conversations]);

  const closeConversation = (item: Conversation) => {
    void updateConversation({
      mailboxSlug,
      conversationSlug: item.slug,
      status: "closed",
    });
    setVisibleConversations((prev) => prev.filter(({ id }) => id !== item.id));
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const assigneeName = item.assignedToClerkId
      ? (members?.find((m) => m.id === item.assignedToClerkId)?.displayName?.split(" ")[0] ?? null)
      : null;

    return (
      <SwipeToClose onClose={() => closeConversation(item)} isClosed={item.status === "closed"} height={item.height}>
        <View className="border-b border-border bg-background">
          <Link href={{ pathname: "/conversations/[id]", params: { id: item.slug, mailboxSlug } }} asChild>
            <TouchableOpacity className="w-full p-4">
              <View className="flex-row items-center justify-between gap-6">
                <Text numberOfLines={1} className="text-base font-medium text-foreground flex-1">
                  {item.platformCustomer?.email ?? item.emailFrom ?? "Anonymous"}
                </Text>
                <View className="flex-row items-center gap-4 flex-shrink-0">
                  {assigneeName && (
                    <View className="flex-row items-center gap-1">
                      <UserIcon size={12} className="text-muted-foreground" />
                      <Text className="text-sm text-muted-foreground">{assigneeName}</Text>
                    </View>
                  )}
                  {item.platformCustomer?.isVip && (
                    <View className="bg-yellow-200 px-2 py-0.5 rounded">
                      <Text className="text-xs text-yellow-800 font-medium">VIP</Text>
                    </View>
                  )}
                  <Text className="text-sm text-muted-foreground">{humanizeTime(item.createdAt)}</Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between gap-6 mt-1">
                <Text numberOfLines={1} className="text-sm text-muted-foreground flex-1">
                  {item.subject}
                </Text>
                {item.platformCustomer?.value && parseFloat(item.platformCustomer.value) > 0 && (
                  <Text className="text-sm text-muted-foreground flex-shrink-0">
                    ${(parseFloat(item.platformCustomer.value) / 100).toFixed(2)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </Link>
        </View>
      </SwipeToClose>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={visibleConversations}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      className="flex-1"
      refreshControl={onRefresh ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} /> : undefined}
    />
  );
}

const SwipeToClose = ({
  onClose,
  isClosed = false,
  height,
  children,
}: {
  onClose: () => void;
  isClosed?: boolean;
  height?: Animated.Value;
  children: React.ReactNode;
}) => {
  const handleClose = () => {
    if (!height) return;

    Animated.timing(height, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      onClose();
    });
  };

  return (
    <Animated.View style={{ height, overflow: "hidden" }}>
      <GestureHandlerRootView>
        <Swipeable
          renderRightActions={() => <RightSwipeActions isClosed={isClosed} />}
          onSwipeableOpen={handleClose}
          rightThreshold={isClosed ? 10_000 : 160}
        >
          {children}
        </Swipeable>
      </GestureHandlerRootView>
    </Animated.View>
  );
};

const RightSwipeActions = ({ isClosed }: { isClosed: boolean }) => (
  <View className={`flex-1 ${isClosed ? "bg-muted" : "bg-destructive"} justify-center pr-4`}>
    <Text className={`text-right ${isClosed ? "text-muted-foreground" : "text-destructive-foreground"} font-medium`}>
      {isClosed ? "Already Closed" : "Close"}
    </Text>
  </View>
);
