import { db, auth } from "./firebase";
import { collection, doc, addDoc, getDocs, deleteDoc, updateDoc, query, orderBy, Timestamp } from "firebase/firestore";

// Type definitions
export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export type Conversation = {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
};

/**
 * Clear all chats for the current user
 */
export async function clearAllChats() {
  const user = auth?.currentUser;
  if (!user) throw new Error("User not authenticated");
  if (!db) throw new Error("Firestore database is not initialized");

  try {
    const chatsRef = collection(db, "users", user.uid, "chats");
    const chatsSnapshot = await getDocs(chatsRef);

    const deletePromises = chatsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error("Error clearing all chats:", error);
    return false;
  }
}

/**
 * Create a new chat for the current user
 */
export async function startNewChat(title = "New conversation") {
  const user = auth?.currentUser;
  if (!user) throw new Error("User not authenticated");
  if (!db) throw new Error("Firestore database is not initialized");

  try {
    const timestamp = Date.now();
    const chatRef = await addDoc(collection(db, "users", user.uid, "chats"), {
      title,
      timestamp,
    });

    return {
      id: chatRef.id,
      title,
      timestamp,
      messages: [],
    };
  } catch (error) {
    console.error("Error creating new chat:", error);
    throw error;
  }
}

/**
 * Add a message to a specific chat
 */
export async function addMessageToChat(chatId: string, content: string, role: "user" | "assistant") {
  const user = auth?.currentUser;
  if (!user) throw new Error("User not authenticated");
  if (!db) throw new Error("Firestore database is not initialized");

  try {
    const timestamp = Date.now();

    // If it's a user message and it's the first message, update the chat title
    if (role === "user") {
      const messagesRef = collection(db, "users", user.uid, "chats", chatId, "messages");
      const messagesSnapshot = await getDocs(messagesRef);

      if (messagesSnapshot.empty) {
        await updateDoc(doc(db, "users", user.uid, "chats", chatId), {
          title: content.substring(0, 30) + "...",
        });
      }
    }

    const messageRef = await addDoc(collection(db, "users", user.uid, "chats", chatId, "messages"), {
      role,
      content,
      timestamp,
    });

    await updateDoc(doc(db, "users", user.uid, "chats", chatId), {
      timestamp,
    });

    return {
      id: messageRef.id,
      role,
      content,
      timestamp,
    };
  } catch (error) {
    console.error("Error adding message:", error);
    throw error;
  }
}

/**
 * Get all chats for the current user with their messages
 */
export async function getAllChats() {
  const user = auth?.currentUser;
  if (!user) return [];
  if (!db) throw new Error("Firestore database is not initialized");

  try {
    const chatsRef = collection(db, "users", user.uid, "chats");
    const q = query(chatsRef, orderBy("timestamp", "desc"));
    const chatSnapshot = await getDocs(q);

    const chats: Conversation[] = [];
    for (const chatDoc of chatSnapshot.docs) {
      const chatData = chatDoc.data();

      const messagesRef = collection(db, "users", user.uid, "chats", chatDoc.id, "messages");
      const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));
      const messagesSnapshot = await getDocs(messagesQuery);

      const messages = messagesSnapshot.docs.map((messageDoc) => {
        const messageData = messageDoc.data();
        return {
          id: messageDoc.id,
          role: messageData.role,
          content: messageData.content,
          timestamp: messageData.timestamp instanceof Timestamp
            ? messageData.timestamp.toMillis()
            : messageData.timestamp || Date.now(),
        } as Message;
      });

      chats.push({
        id: chatDoc.id,
        title: chatData.title || "New conversation",
        timestamp: chatData.timestamp instanceof Timestamp
          ? chatData.timestamp.toMillis()
          : chatData.timestamp || Date.now(),
        messages,
      });
    }

    return chats;
  } catch (error) {
    console.error("Error fetching chats:", error);
    return [];
  }
}

/**
 * Delete a specific chat
 */
export async function deleteChat(chatId: string) {
  const user = auth?.currentUser;
  if (!user) throw new Error("User not authenticated");
  if (!db) throw new Error("Firestore database is not initialized");

  try {
    const messagesRef = collection(db, "users", user.uid, "chats", chatId, "messages");
    const messagesSnapshot = await getDocs(messagesRef);
    const deleteMessagesPromises = messagesSnapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deleteMessagesPromises);

    await deleteDoc(doc(db, "users", user.uid, "chats", chatId));
    console.log(`Chat with ID ${chatId} deleted successfully.`);
    return true;
  } catch (error) {
    console.error("Error deleting chat:", error);
    return false;
  }
}
