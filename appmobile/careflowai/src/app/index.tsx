import React, { useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Pressable,
} from "react-native";

import AnimatedReanimated, {
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AnimatedMessage from "../components/AnimatedMessage";

const { width } = Dimensions.get("window");
const DRAWER_WIDTH = width * 0.78;


const PAST_CHATS = [
  { id: "1", title: "Back pain for 3 days" },
  { id: "2", title: "Paracetamol dosage" },
  { id: "3", title: "Allergy symptoms" },
  { id: "4", title: "Flu-like symptoms" },
  { id: "5", title: "Headache for 2 days" },
];

export default function Index() {
  const [message, setMessage] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  // Drawer states
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSignOut, setShowSignOut] = useState(false);

  const slideAnim = useRef(
    new Animated.Value(-DRAWER_WIDTH)
  ).current;

  const openMenu = () => {
    setMenuVisible(true);

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setMenuVisible(false);
      setShowSignOut(false);
    });
  };

  const handleSignOut = () => {
    
    setShowSignOut(false);
    closeMenu();
  };

  const filteredChats = PAST_CHATS.filter((chat) =>
    chat.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const sendMessage = () => {
    if (!message.trim()) return;

    if (!hasStarted) {
      setHasStarted(true);
    }

    const userMessage = {
      id: Date.now().toString(),
      text: message,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);

    setTimeout(() => {
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm still learning :)",
        sender: "bot",
      };

      setMessages((prev) => [...prev, botMessage]);
    }, 700);

    setMessage("");
  };

  return (
    <>
      
      {!hasStarted && (
        <AnimatedReanimated.View
          entering={FadeIn}
          exiting={FadeOut.duration(1000)}
          style={StyleSheet.absoluteFillObject}
        >
          <LinearGradient
            colors={[
              "#000000",
              "#061B40",
              "#9AA0A6",
              "#061B40",
              "#000000",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          />
        </AnimatedReanimated.View>
      )}

      {/* Welcome Text */}
      {!hasStarted && (
        <View style={styles.welcome}>
          <Text style={styles.heading}>HI User</Text>
          <Text style={styles.subHeading}>
            Ask anything...
          </Text>
        </View>
      )}

      
      <TouchableOpacity
        style={styles.menuButton}
        onPress={openMenu}
        hitSlop={{
          top: 10,
          bottom: 10,
          left: 10,
          right: 10,
        }}
      >
        <Ionicons
          name="menu"
          size={28}
          color="white"
        />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={[
          styles.container,
          {
            backgroundColor: hasStarted
              ? "black"
              : "transparent",
          },
        ]}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        {hasStarted && (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AnimatedMessage
                text={item.text}
                sender={item.sender}
              />
            )}
            contentContainerStyle={{
              padding: 15,
            }}
          />
        )}

        
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Ask anything..."
            placeholderTextColor="#888"
            value={message}
            onChangeText={setMessage}
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={sendMessage}
          >
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

     
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={closeMenu}
          />

          <Animated.View
            style={[
              styles.drawer,
              {
                transform: [
                  {
                    translateX: slideAnim,
                  },
                ],
              },
            ]}
          >
            
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>
                Chats
              </Text>

              <TouchableOpacity
                onPress={closeMenu}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
            </View>

            
            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={18}
                color="#888"
                style={{ marginRight: 8 }}
              />

              <TextInput
                placeholder="Search past chats..."
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />
            </View>

           
            <FlatList
              data={filteredChats}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                paddingTop: 5,
              }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.chatItem}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={16}
                    color="#aaa"
                    style={{
                      marginRight: 10,
                    }}
                  />

                  <Text
                    style={
                      styles.chatItemText
                    }
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  No chats found
                </Text>
              }
            />

            
            <View style={styles.profileSection}>
              {showSignOut && (
                <TouchableOpacity
                  style={
                    styles.signOutButton
                  }
                  onPress={
                    handleSignOut
                  }
                >
                  <Ionicons
                    name="log-out-outline"
                    size={18}
                    color="#8d0202"
                    style={{
                      marginRight: 8,
                    }}
                  />

                  <Text
                    style={
                      styles.signOutText
                    }
                  >
                    Sign Out
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.profileRow}
                onPress={() =>
                  setShowSignOut(
                    (prev) => !prev
                  )
                }
              >
                <View
                  style={
                    styles.profileIcon
                  }
                >
                  <Ionicons
                    name="person"
                    size={20}
                    color="white"
                  />
                </View>

                <Text
                  style={
                    styles.profileName
                  }
                >
                  My Profile
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    opacity: 0.95,
  },

  welcome: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    alignItems: "center",
  },

  heading: {
    fontSize: 52,
    fontWeight: "700",
    color: "white",
    marginBottom: 10,
  },

  subHeading: {
    fontSize: 24,
    color: "#D9D9D9",
  },

  menuButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 55 : 30,
    left: 20,
    zIndex: 20,
  },

  container: {
    flex: 1,
    justifyContent: "flex-end",
  },

  inputContainer: {
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
  },

  input: {
    flex: 1,
    backgroundColor: "#141414",
    color: "white",
    padding: 18,
    borderRadius: 30,
    fontSize: 16,
  },

  button: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: "#347afc96",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  arrow: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },

  modalRoot: {
    flex: 1,
    flexDirection: "row",
  },

  backdrop: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.5)",
  },

  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#111111",
    paddingTop:
      Platform.OS === "ios"
        ? 55
        : 30,
    paddingHorizontal: 16,
  },

  drawerHeader: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  drawerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 14,
  },

  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomColor: "#222",
    borderBottomWidth: 1,
  },

  chatItemText: {
    color: "#eee",
    fontSize: 14,
    flexShrink: 1,
  },

  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },

  profileSection: {
    borderTopColor: "#222",
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom:
      Platform.OS === "ios"
        ? 30
        : 16,
  },

  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 6,
  },

  signOutText: {
    color: "#fa3e3e",
    fontSize: 15,
    fontWeight: "600",
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },

  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#296ae496",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  profileName: {
    color: "white",
    fontSize: 15,
    fontWeight: "500",
  },
});