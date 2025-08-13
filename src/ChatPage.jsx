import {
  Box,
  Flex,
  Text,
  useColorModeValue,
  Input,
  Skeleton,
  SkeletonCircle,
  Avatar,
  InputGroup,
  InputLeftElement,
  IconButton,
} from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import Conversation from "./components/Conversation";
import toast from "react-hot-toast";
import MessageContainer from "./components/MessageContainer";
import axios from "axios";
import { useRecoilState, useRecoilValue } from "recoil";
import { conversationsAtom, selectedConversationAtom } from "./atoms/messageAtom";
import userAtom from "./atoms/userAtom";
import { useSocket } from "./context/SocketContext";
import { SearchIcon, ChevronLeftIcon } from '@chakra-ui/icons';
import Header from "./components/Header";

// Search result အတွက် အသုံးပြုဖို့ Conversation-like component
// (A Conversation-like component to use for search results)
const SearchUserResult = ({ user, onClick, isOnline }) => {
  const bg = useColorModeValue("gray.50", "gray.700");
  const hoverBg = useColorModeValue("gray.100", "gray.600");

  return (
    <Flex
      gap={4}
      alignItems={"center"}
      p={"1"}
      _hover={{
        cursor: "pointer",
        bg: hoverBg,
      }}
      onClick={() => onClick(user)}
      borderRadius={"md"}
      bg={bg}
    >
      <Box position="relative">
        <Avatar size={"md"} src={user.profilePic} />
        {isOnline && (
          <Box
            position="absolute"
            bottom="0px"
            right="0px"
            p="1"
            bg="green.500"
            borderRadius="full"
            border="2px solid"
            borderColor={useColorModeValue("white", "gray.800")}
          />
        )}
      </Box>
      <Flex w={"full"} flexDirection={"column"}>
        <Text fontWeight={700}>
          {user.name}
        </Text>
        <Text fontSize={"sm"}>
          {user.username}
        </Text>
      </Flex>
    </Flex>
  );
};

const ChatPage = () => {
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [searchingUser, setSearchingUser] = useState(false);
  const [conversations, setConversations] = useRecoilState(conversationsAtom);
  const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedUsers, setSearchedUsers] = useState([]);
  const currentUser = useRecoilValue(userAtom);
  const { socket, onlineUsers } = useSocket();

  useEffect(() => {
    const getConversations = async () => {
      try {
        const response = await axios.get("/api/v1/messages/conversations");
        let fetchedConversations = response.data.conversations;

        // Conversations များကို နောက်ဆုံး message ရဲ့ အချိန်အလိုက် စီစဉ်သည် (အသစ်ဆုံးက အပေါ်ဆုံး)
        // Sort conversations by the last message's time (newest at the top)
        fetchedConversations.sort((a, b) => {
          const aUpdatedAt = a.lastMessage?.updatedAt;
          const bUpdatedAt = b.lastMessage?.updatedAt;

          // If both are missing, their order doesn't matter, so we return 0.
          if (!aUpdatedAt && !bUpdatedAt) return 0;
          // If 'a' is missing, it should be placed after 'b'
          if (!aUpdatedAt) return 1;
          // If 'b' is missing, it should be placed after 'a'
          if (!bUpdatedAt) return -1;

          return new Date(bUpdatedAt) - new Date(aUpdatedAt);
        });

        setConversations(fetchedConversations);

        const storedSelectedId = localStorage.getItem("selectedConversationId");
        if (storedSelectedId) {
          const storedConversation = fetchedConversations.find(
            (conv) => conv._id === storedSelectedId
          );
          if (storedConversation && storedConversation.participants?.length > 0) {
            setSelectedConversation({
              _id: storedConversation._id,
              userId: storedConversation.participants[0]._id,
              username: storedConversation.participants[0].username,
              name: storedConversation.participants[0].name,
              userProfilePic: storedConversation.participants[0].profilePic,
              mock: storedConversation.mock,
            });
          }
        }
      } catch (err) {
        // toast.error("Failed to fetch conversations");
        console.log(err.message);
      } finally {
        setLoadingConversation(false);
      }
    };
    getConversations();
  }, [setConversations, setSelectedConversation]);

  useEffect(() => {
    if (selectedConversation?._id) {
      localStorage.setItem("selectedConversationId", selectedConversation._id);
    }
  }, [selectedConversation]);

  // Live search အတွက် useEffect ကို ပြင်ဆင်ထားသည်
  // useEffect is set up for live search
  useEffect(() => {
    // Debounce function ကို သုံးထားပါတယ်၊ ဒါမှ စာရိုက်နေစဉ်အတွင်း API calls တွေ အများကြီး မဖြစ်အောင် ကာကွယ်နိုင်ပါမယ်
    // Using a debounce function to prevent multiple API calls while typing
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim()) { // searchTerm ရှိမှသာ ရှာဖွေမှု စပါမယ် (Search only when searchTerm exists)
        setSearchingUser(true);
        setSearchedUsers([]); // ရှာဖွေမှုအသစ်မစခင် အရင်ရလဒ်တွေကို ရှင်းလင်းလိုက်သည် (Clear previous results before new search)
        try {
          // User ပေးထားသည့် API endpoint အတိုင်း ပြောင်းလဲထားသည် (Changed to the API endpoint provided by the user)
          const response = await axios.get(`/api/v1/users/search/${searchTerm}`);
          if (response.data.errorMessage) {
            toast.error(response.data.errorMessage);
            setSearchedUsers([]);
            return;
          }
          const foundUsers = response.data.users;

          // ကိုယ့်ကိုယ်ကိုရှာတာကို စစ်ဆေးသည် (Check if the user is searching for themselves)
          const filteredUsers = foundUsers.filter(user => user._id !== currentUser._id);

          if (filteredUsers.length === 0) {
            setSearchedUsers([]);
            return;
          }
          setSearchedUsers(filteredUsers);
        } catch (err) {
          setSearchedUsers([]);
          console.error("Error searching user:", err);
          toast.error("Error searching user");
        } finally {
          setSearchingUser(false);
        }
      } else {
        setSearchedUsers([]); // Search Term မရှိတော့ရင် ရလဒ်တွေကို ရှင်းပစ်သည် (Clear results if Search Term is empty)
      }
    }, 500); // 500ms စောင့်ပြီးမှ API call ခေါ်သည် (Call API after 500ms)

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentUser]);


  const handleUserClick = (foundUser) => {
    // 1. စကားပြောပြီးသား user ဟုတ်မဟုတ် စစ်ဆေးခြင်း (Check if a conversation with this user already exists)
    const conversationAlreadyExists = conversations.find(
      (conversation) =>
        !conversation.mock && conversation.participants?.find(p => p._id === foundUser._id)
    );

    if (conversationAlreadyExists) {
      // ရှိပြီးသား conversation ကို ရွေးချယ်သည် (Select the existing conversation)
      setSelectedConversation({
        _id: conversationAlreadyExists._id,
        userId: foundUser._id,
        username: foundUser.username,
        name: foundUser.name,
        userProfilePic: foundUser.profilePic,
        mock: false,
      });

      // Conversation list ရဲ့ ထိပ်ဆုံးကို ရွှေ့သည် (Move the conversation to the top of the list)
      setConversations(prev => {
        const otherConversations = prev.filter(c => c._id !== conversationAlreadyExists._id);
        return [conversationAlreadyExists, ...otherConversations];
      });
    } else {
      // 2. Mock conversation အသစ်တစ်ခု ဖန်တီးသည် (Create a new mock conversation)
      const mockConversation = {
        mock: true,
        lastMessage: {
          text: "",
          sender: "",
        },
        _id: `mock-${foundUser._id}`,
        participants: [
          {
            _id: foundUser._id,
            username: foundUser.username,
            name: foundUser.name,
            profilePic: foundUser.profilePic,
          },
        ],
      };

      // Conversation list ရဲ့ ထိပ်ဆုံးကို အသစ်ထည့်သည် (Add the new conversation to the top of the list)
      setConversations((prevConvs) => [mockConversation, ...prevConvs]);
      setSelectedConversation({
        _id: mockConversation._id,
        userId: foundUser._id,
        name: foundUser.name,
        username: foundUser.username,
        userProfilePic: foundUser.profilePic,
        updatedAt: foundUser.updatedAt,
        mock: true,
      });
    }
    setSearchedUsers([]); // စကားပြောစတင်ပြီးနောက် ရှာဖွေမှုရလဒ်များကို ရှင်းလင်းသည် (Clear search results after starting a conversation)
    setSearchTerm(""); // Search input ကိုလည်း ရှင်းပေးသည် (Clear the search input as well)
  };

  useEffect(() => {
    socket?.on("newMessage", (message) => {
      // Find the conversation and update it.
      let updatedConversations = conversations.map((conversation) => {
        if (conversation._id === message.conversationId) {
          const updatedConv = {
            ...conversation,
            lastMessage: {
              ...conversation.lastMessage,
              text: message.text,
              sender: message.sender,
              // Update timestamp to ensure it moves to the top
              updatedAt: new Date().toISOString(),
            },
          };
          return updatedConv;
        }
        return conversation;
      });

      const updatedConversation = updatedConversations.find(
        (conv) => conv._id === message.conversationId
      );

      if (updatedConversation) {
        // Move the updated conversation to the top.
        const otherConversations = updatedConversations.filter(
          (conv) => conv._id !== message.conversationId
        );
        setConversations([updatedConversation, ...otherConversations]);
      } else {
        const getNewConversation = async () => {
          try {
            const response = await axios.get(`/api/v1/messages/conversation/${message.conversationId}`);
            if (response.data) {
              setConversations((prevConvs) => [response.data.conversation, ...prevConvs]);
            }
          } catch (err) {
            toast.error("Failed to fetch new conversation");
          }
        };
        getNewConversation();
      }
    });

    socket?.on("messagesSeen", ({ conversationId }) => {
      setConversations((prevConvs) =>
        prevConvs.map((conversation) => {
          if (conversation._id === conversationId) {
            return {
              ...conversation,
              lastMessage: {
                ...conversation.lastMessage,
                seen: true,
              },
            };
          }
          return conversation;
        })
      );
    });

    return () => {
      socket?.off("newMessage");
      socket?.off("messagesSeen");
    }
  }, [socket, setConversations, conversations]);

  const handleBackClick = () => {
    setSearchTerm("");
    setSearchedUsers([]);
  };

  return (
    <>
      <Box
        position={"absolute"}
        left={"50%"}
        transform={"translateX(-50%)"}
        w={{ base: "100%", md: "100%", lg: "100%" }}
        py={0}
        px={10}
      >
        <Flex
          gap={4}
          flexDirection={{ base: "column", md: "row" }}
          maxW={{
            sm: "400px",
            md: "full",
          }}
          mx={"auto"}
          h="calc(100vh - 100px)"
        >
          <Flex
            flex={30}
            gap={2}
            flexDirection={"column"}
            maxW={{ sm: "250px", md: "full" }}
            mx={"auto"}
          >
            <Flex
              direction={"column"}
              gap={2}
              py={2}
              px={4}
              borderBottom="1px solid"
              borderColor={useColorModeValue("red.200", "gray.600")}
            >
               <Header />
              {/* <Text fontWeight={700} color={useColorModeValue("gray.600", "gray.400")}>
                Your Conversations
              </Text> */}
              <InputGroup>
                {searchTerm.trim() ? (
                  <InputLeftElement>
                    <IconButton
                      aria-label="Back"
                      icon={<ChevronLeftIcon />}
                      onClick={handleBackClick}
                      variant="ghost"
                    />
                  </InputLeftElement>
                ) : (
                  <InputLeftElement
                    pointerEvents="none"
                    children={<SearchIcon color="gray.300" />}
                  />
                )}
                <Input
                  placeholder='Search for a user'
                  onChange={(e) => setSearchTerm(e.target.value)}
                  value={searchTerm}
                  pl={searchTerm.trim() ? "45px" : "40px"}
                />
              </InputGroup>
            </Flex>
            <Flex
              direction={"column"}
              gap={2}
              p={2}
              h="100%"
              overflowY="auto"
            >
              {searchTerm.trim() ? (
                searchingUser ? (
                  [0, 1, 2, 3, 4].map((_, i) => (
                    <Flex key={i} gap={4} alignItems={"center"} p={"1"} borderRadius={"md"}>
                      <Box>
                        <SkeletonCircle size={"10"} />
                      </Box>
                      <Flex w={"full"} flexDirection={"column"} gap={3}>
                        <Skeleton h={"10px"} w={"80px"} />
                        <Skeleton h={"8px"} w={"90%"} />
                      </Flex>
                    </Flex>
                  ))
                ) : (
                  searchedUsers.length > 0 ? (
                    searchedUsers.map((user) => {
                      const isOnline = onlineUsers.includes(user._id);
                      return (
                        <SearchUserResult
                          key={user._id}
                          user={user}
                          onClick={handleUserClick}
                          isOnline={isOnline}
                        />
                      );
                    })
                  ) : (
                    <Text textAlign="center" mt={4}>
                      User ရှာမတွေ့ပါ
                    </Text>
                  )
                )
              ) : (
                loadingConversation ? (
                  [0, 1, 2, 3, 4].map((_, i) => (
                    <Flex key={i} gap={4} alignItems={"center"} p={"1"} borderRadius={"md"}>
                      <Box>
                        <SkeletonCircle size={"10"} />
                      </Box>
                      <Flex w={"full"} flexDirection={"column"} gap={3}>
                        <Skeleton h={"10px"} w={"80px"} />
                        <Skeleton h={"8px"} w={"90%"} />
                      </Flex>
                    </Flex>
                  ))
                ) : (
                  conversations.map((conversation) => {
                    if (!conversation?.participants || conversation.participants.length === 0) {
                      return null;
                    }
                    const isOnline = onlineUsers.includes(conversation.participants[0]._id);
                    return (
                      <Conversation
                        key={conversation._id}
                        conversation={conversation}
                        isOnline={isOnline}
                      />
                    );
                  })
                )
              )}
            </Flex>
          </Flex>
          {!selectedConversation?._id && (
            <Flex
              flex={70}
              borderRadius={"md"}
              p={2}
              flexDir={"column"}
              alignItems={"center"}
              justifyContent={"center"}
              h="100%"
            >
              <Text fontSize={20}>Select conversation </Text>
            </Flex>
          )}
          {selectedConversation?._id && <MessageContainer />}
        </Flex>
      </Box>
    </>
  );
};

export default ChatPage;
