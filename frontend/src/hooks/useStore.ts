import { create } from 'zustand';

interface Community {
  id: string;
  name: string;
  city: string;
  memberCount: number;
  isMember: boolean;
}

interface SubGroup {
  id: string;
  name: string;
  communityId: string;
  memberCount: number;
  isMember: boolean;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

interface AppState {
  communities: Community[];
  currentCommunity: Community | null;
  subgroups: SubGroup[];
  currentSubgroup: SubGroup | null;
  messages: Message[];
  
  setCommunities: (communities: Community[]) => void;
  setCurrentCommunity: (community: Community | null) => void;
  setSubgroups: (subgroups: SubGroup[]) => void;
  setCurrentSubgroup: (subgroup: SubGroup | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
}

export const useStore = create<AppState>((set) => ({
  communities: [],
  currentCommunity: null,
  subgroups: [],
  currentSubgroup: null,
  messages: [],
  
  setCommunities: (communities) => set({ communities }),
  setCurrentCommunity: (currentCommunity) => set({ currentCommunity }),
  setSubgroups: (subgroups) => set({ subgroups }),
  setCurrentSubgroup: (currentSubgroup) => set({ currentSubgroup }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
}));
