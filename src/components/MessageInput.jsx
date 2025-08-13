import React, { useState, useRef } from 'react';
import {
    Flex,
    Image,
    Input,
    InputGroup,
    InputRightElement,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Spinner,
    useDisclosure,
    IconButton,
    useColorModeValue,
} from "@chakra-ui/react";
import { IoSendSharp } from "react-icons/io5";
import toast from 'react-hot-toast';
import axios from 'axios';
import usePreviewImg from "../hooks/usePreviewImg";
import { selectedConversationAtom, conversationsAtom } from '../atoms/messageAtom';
import { useRecoilState, useSetRecoilState, useRecoilValue } from 'recoil';
import userAtom from '../atoms/userAtom';
import { FaLink } from 'react-icons/fa';

const MessageInput = ({ setMessages }) => {
    // State to hold the message content from the input field
    const [messageText, setMessageText] = useState("");
    // Recoil state for the currently selected conversation
    const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
    // Recoil state to update the list of conversations
    const setConversations = useSetRecoilState(conversationsAtom);
    // Recoil state for the current user
    const user = useRecoilValue(userAtom);
    // useRef to get a reference to the hidden file input
    const imageRef = useRef(null);
    // useDisclosure hook for managing the image preview modal's state
    const { isOpen, onOpen, onClose } = useDisclosure();
    // Custom hook to handle image selection and preview
    const { handleImageChange, imgUrl, setImgUrl } = usePreviewImg();
    // State to manage loading status during API call
    const [isSending, setIsSending] = useState(false);

    // Dynamically change the background color for light/dark mode
    const inputBg = useColorModeValue("white", "gray.600");
    const buttonBg = useColorModeValue("blue.500", "blue.400");
    const buttonHoverBg = useColorModeValue("blue.600", "blue.500");

    // Function to handle sending the message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (isSending) return;

        setIsSending(true);

        const isMessageEmpty = !messageText.trim();
        const isImageEmpty = !imgUrl;

        // Make sure either a message or an image is present
        if (isMessageEmpty && isImageEmpty) {
            toast.error("Message or image cannot be empty");
            setIsSending(false);
            return;
        }

        try {
            // Get the current conversation ID from the state.
            const currentConversationId = selectedConversation._id;

            // Use FormData to send the file and other data.
            // This is crucial because your backend expects a file upload.
            const formData = new FormData();
            if (messageText) {
                formData.append('message', messageText);
            }
            formData.append('recipientId', selectedConversation.userId);
            formData.append('conversationId', currentConversationId);
            
            // Append the actual image file from the file input to FormData
            const imageFile = imageRef.current.files[0];
            if (imageFile) {
                formData.append('image', imageFile); 
            }
            
            const api = axios.create({
                baseURL: "/api/v1",
                withCredentials: true,
                // Do not set Content-Type, as axios handles it automatically for FormData
            });

            // Send the FormData object instead of a JSON object
            const response = await api.post('/messages', formData);

            const newMessage = response.data.data;
            const newConversationId = newMessage.conversationId;

            setMessages((prevMessages) => [...prevMessages, newMessage]);
            setMessageText("");
            setImgUrl("");
            // Clear the file input after sending
            if (imageRef.current) {
                imageRef.current.value = null;
            }
            onClose();

            // The rest of the logic remains the same
            if (currentConversationId !== newConversationId) {
                setSelectedConversation({
                    ...selectedConversation,
                    _id: newConversationId,
                    mock: false,
                });

                setConversations((prevConvs) => {
                    const updatedConversation = {
                        ...prevConvs.find(c => c._id === currentConversationId),
                        _id: newConversationId,
                        mock: false,
                        lastMessage: {
                            text: newMessage.text || (newMessage.img ? "Image" : ""),
                            sender: newMessage.sender,
                        }
                    };
                    const otherConversations = prevConvs.filter(c => c._id !== currentConversationId);
                    return [updatedConversation, ...otherConversations];
                });
            } else {
                setConversations((prevConvs) => {
                    const updatedConversations = prevConvs.map((conversation) => {
                        if (conversation._id === selectedConversation._id) {
                            return {
                                ...conversation,
                                lastMessage: {
                                    text: newMessage.text || (newMessage.img ? "Image" : ""),
                                    sender: newMessage.sender,
                                },
                            };
                        }
                        return conversation;
                    });
                    return updatedConversations;
                });
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to send message.");
        } finally {
            setIsSending(false);
        }
    };

    const handleImageOpen = () => {
        imageRef.current.click();
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    return (
        <>
            <form onSubmit={handleSendMessage}>
                <Flex
                    alignItems={"center"}
                    p={4}
                    bg={useColorModeValue("gray.100", "gray.700")}
                    borderRadius="lg"
                    boxShadow="md"
                    mt={4}
                    gap={2}
                >
                    <IconButton
                        onClick={handleImageOpen}
                        aria-label="Attach image"
                        icon={<FaLink />}
                        bg="transparent"
                        size="md"
                        color={useColorModeValue("gray.600", "gray.300")}
                        _hover={{ bg: useColorModeValue("gray.200", "gray.600") }}
                        isDisabled={isSending}
                    />
                    <Input type="file" hidden ref={imageRef} onChange={handleImageChange} />
                    <InputGroup flex={1}>
                        <Input
                            placeholder="Type a message..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            bg={inputBg}
                            border="1px solid"
                            borderColor={useColorModeValue("gray.300", "gray.500")}
                            _focus={{
                                borderColor: "blue.500",
                                boxShadow: "0 0 0 1px #4299E1",
                            }}
                            borderRadius={"full"}
                            px={4}
                            py={2}
                            size="lg"
                            isDisabled={isSending}
                        />
                        <InputRightElement>
                            <IconButton
                                type="submit"
                                aria-label="Send message"
                                icon={isSending ? <Spinner size="sm" /> : <IoSendSharp />}
                                bg={buttonBg}
                                color="white"
                                _hover={{ bg: buttonHoverBg }}
                                isRound={true}
                                size="lg"
                                isDisabled={isSending || (!messageText.trim() && !imgUrl)}
                            />
                        </InputRightElement>
                    </InputGroup>
                </Flex>
            </form>

            <Modal
                isOpen={!!imgUrl}
                onClose={() => {
                    setImgUrl("");
                }}
            >
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader></ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Flex mt={5} w={"full"} direction="column" alignItems="center">
                            <Image src={imgUrl} />
                            <Flex justifyContent={"flex-end"} my={2} width="100%">
                                {!isSending ? (
                                    <IconButton
                                        onClick={handleSendMessage}
                                        aria-label="Send image"
                                        icon={<IoSendSharp size={24} />}
                                        isRound={true}
                                        bg={buttonBg}
                                        color="white"
                                        _hover={{ bg: buttonHoverBg }}
                                    />
                                ) : (
                                    <Spinner size={"md"} />
                                )}
                            </Flex>
                        </Flex>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
};

export default MessageInput;