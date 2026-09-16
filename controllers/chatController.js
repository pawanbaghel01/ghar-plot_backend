import Chat from "../models/chatSchema.js";
import User from "../models/user.js";
import admin from "../config/firebase.js";
import { sendPushNotification } from "../utils/sendNotification.js";


/**
 *  Get or Create Chat
 * Finds existing chat between the logged-in user and another user.
 */
export const getOrCreateChat = async (req, res) => {
  try {
    const senderId = req.user.id; // from token
    const { receiverId } = req.body;

    if (!receiverId) {
      return res
        .status(400)
        .json({ success: false, message: "receiverId is required" });
    }

    let chat = await Chat.findOne({
      participants: { $all: [senderId, receiverId] },
    })
      .populate("participants", "fullName email")
      .lean();

    if (!chat) {
      const newChat = new Chat({ participants: [senderId, receiverId] });
      const savedChat = await newChat.save();

      chat = await Chat.findById(savedChat._id)
        .populate("participants", "fullName email")
        .lean();
    }

    res.status(200).json({ success: true, chat });
  } catch (err) {
    console.error("Error in getOrCreateChat:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 *  Send Message + FCM Notification
 */
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { chatId, text } = req.body;

    if (!chatId || !text?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "chatId and text are required" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat)
      return res
        .status(404)
        .json({ success: false, message: "Chat not found" });

    // 🔹 Save new message
    const newMessage = {
      sender: senderId,
      text,
      isRead: false,
      createdAt: new Date(),
    };
    chat.messages.push(newMessage);
    await chat.save();

    // 🔹 Emit via socket.io (real-time)
    if (req.io) {
      req.io.to(chatId).emit("newMessage", { chatId, message: newMessage });
    }

    // 🔹 Find receiver (other participant)
    const receiverId = chat.participants.find((p) => p.toString() !== senderId);
    const receiver = await User.findById(receiverId);
    const sender = await User.findById(senderId);

    // 🔹 Send push notification via Firebase Cloud Messaging
    if (receiver?.fcmToken) {
      await sendPushNotification(
        receiver.fcmToken,
        `${sender.fullName} sent you a message`,
        text,
        {
          chatId: chatId.toString(),
          senderId: senderId.toString(),
          type: 'chat_message'
        }
      );
    } else {
      console.log(" Receiver has no FCM token registered");
    }

    res.status(200).json({ success: true, message: newMessage });
  } catch (err) {
    console.error("Error in sendMessage:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 *  Get Messages
 */
export const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    if (!chatId) {
      return res
        .status(400)
        .json({ success: false, message: "chatId is required" });
    }

    const chat = await Chat.findById(chatId)
      .populate("participants", "fullName email")
      .populate("messages.sender", "fullName email");

    if (!chat) {
      return res
        .status(404)
        .json({ success: false, message: "Chat not found" });
    }

    // Identify receiver
    const receiver = chat.participants.find((p) => p._id.toString() !== userId);

    // Mark unread messages as read
    let updated = false;
    chat.messages.forEach((msg) => {
      if (msg.sender._id.toString() !== userId && !msg.isRead) {
        msg.isRead = true;
        updated = true;
      }
    });

    if (updated) await chat.save();

    res.status(200).json({
      success: true,
      receiverId: receiver?._id || null,
      messages: chat.messages,
    });
  } catch (err) {
    console.error("Error in getMessages:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 *  Get Chat History
 */
// export const getChatHistory = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const chats = await Chat.find({
//       participants: { $in: [userId] },
//     })
//       .populate("participants", "fullName email avatar")
//       .lean();

//     const chatList = chats.map((chat) => {
//       const otherUser = chat.participants.find(
//         (p) => p._id.toString() !== userId
//       );

//       const lastMessage =
//         chat.messages.length > 0
//           ? chat.messages[chat.messages.length - 1]
//           : null;

//       const unreadCount = chat.messages.filter(
//         (m) => m.sender.toString() !== userId && !m.isRead
//       ).length;

//       return {
//         chatId: chat._id,
//         user: {
//           _id: otherUser?._id,
//           fullName: otherUser?.fullName,
//           email: otherUser?.email,
//           avatar: otherUser?.avatar,
//         },
//         lastMessage: lastMessage?.text || "No messages yet",
//         lastMessageTime: lastMessage?.createdAt || chat.createdAt,
//         unreadCount,
//       };
//     });

//     chatList.sort(
//       (a, b) =>
//         new Date(b.lastMessageTime).getTime() -
//         new Date(a.lastMessageTime).getTime()
//     );

//     res.status(200).json({ success: true, chats: chatList });
//   } catch (err) {
//     console.error("Error in getChatHistory:", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await Chat.find({
      participants: { $in: [userId] },
    })
      .populate("participants", "fullName email avatar photosAndVideo")
      .lean();

    const chatList = chats.map((chat) => {
      //  Get the other user (not the current one)
      const otherUser = chat.participants.find(
        (p) => p._id.toString() !== userId
      );

      //  Determine profile image logic
      const profileImage =
        otherUser?.photosAndVideo?.length > 0
          ? otherUser.photosAndVideo[0] // Use first uploaded photo
          : otherUser?.avatar; // Fallback to avatar

      //  Get last message and unread count
      const lastMessage =
        chat.messages.length > 0
          ? chat.messages[chat.messages.length - 1]
          : null;

      const unreadCount = chat.messages.filter(
        (m) => m.sender.toString() !== userId && !m.isRead
      ).length;

      //  Return formatted chat data
      return {
        chatId: chat._id,
        user: {
          _id: otherUser?._id,
          fullName: otherUser?.fullName,
          email: otherUser?.email,
          avatar: profileImage, //  Correct image logic applied here
        },
        lastMessage: lastMessage?.text || "No messages yet",
        lastMessageTime: lastMessage?.createdAt || chat.createdAt,
        unreadCount,
      };
    });

    //  Sort by last message time (descending)
    chatList.sort(
      (a, b) =>
        new Date(b.lastMessageTime).getTime() -
        new Date(a.lastMessageTime).getTime()
    );

    res.status(200).json({ success: true, chats: chatList });
  } catch (err) {
    console.error("Error in getChatHistory:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


/**
 *  Delete Chat
 */
export const deleteChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat)
      return res
        .status(404)
        .json({ success: false, message: "Chat not found" });

    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId
    );
    if (!isParticipant)
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized to delete this chat" });

    await Chat.findByIdAndDelete(chatId);

    res
      .status(200)
      .json({ success: true, message: "Chat deleted successfully" });
  } catch (err) {
    console.error("Error in deleteChat:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
