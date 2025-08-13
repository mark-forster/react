import { atom } from "recoil";

// saving all Conversation list  atom
export const conversationsAtom = atom({
  key: "conversationsAtom",
  default: [],
});

// save selected conversation  atom
export const selectedConversationAtom = atom({
  key: "selectedConversationAtom",
  default: {
    _id: "",
    userId: "",
    username: "",
    userProfilePic: "",
  },
});

// save message from current chat box  atom
export const messagesAtom = atom({
  key: "messagesAtom",
  default: [],
});