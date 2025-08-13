import React, { useState } from "react";
import { Flex, Box, Text, Avatar, Skeleton, Image, useColorModeValue } from "@chakra-ui/react";
import { BsCheckAll } from "react-icons/bs";
import { useRecoilValue } from "recoil";
import { selectedConversationAtom } from "../atoms/messageAtom";
import userAtom from "../atoms/userAtom";

// Message component ။
const Message = ({ ownMessage, message }) => {
    const selectedConversation = useRecoilValue(selectedConversationAtom);
    const user = useRecoilValue(userAtom);
    const [imgLoaded, setImgLoaded] = useState(false);

    // Light/Dark mode  message background 
    const ownMessageBgColor = useColorModeValue("blue.500", "blue.500");
    const otherMessageBgColor = useColorModeValue("gray.300", "gray.600");
    const otherMessageTextColor = useColorModeValue("black", "white");

    // message (text or image) empty  component 
    if (!message.text && !message.img) {
        return null;
    }

    return (
        <>
            {ownMessage ? (
                // self message  Flex container
                <Flex gap={2} alignSelf={"flex-end"} alignItems="flex-end">
                    {message.text && (
                        //  message  Flex
                        <Flex bg={ownMessageBgColor} maxW={"350px"} p={1} borderRadius={"md"}>
                            <Text color={"white"}>{message.text}</Text>
                            <Box alignSelf={"flex-end"} ml={1} color={message.seen ? "white" : ""} fontWeight={"bold"}>
                                <BsCheckAll size={16} />
                            </Box>
                        </Flex>
                    )}
                    {message.img && (
                        // Image  message  Box
                        <Box mt={1} w={"200px"}>
                            {!imgLoaded && <Skeleton w={"200px"} h={"200px"} />}
                            <Image
                                src={message.img.url}
                                alt='Message image'
                                borderRadius={4}
                                onLoad={() => setImgLoaded(true)}
                                style={{ display: imgLoaded ? "block" : "none" }}
                            />
                            {/* seen icon  */}
                            <Flex justifyContent="flex-end" mt={1}>
                                <Box color={message.seen ? "white" : ""} fontWeight={"bold"}>
                                    <BsCheckAll size={16} />
                                </Box>
                            </Flex>
                        </Box>
                    )}
                    {/*  profile  */}
                    <Avatar src={user.profilePic.url} w={3} h={3} />
                </Flex>
            ) : (
                //   message  Flex container
                <Flex gap={2} alignSelf={"flex-start"} alignItems="flex-end">
                    {/*  profile  */}
                    <Avatar src={selectedConversation.userProfilePic.url} w={4} h={4} />
                    {message.text && (
                        //  message  Flex
                        <Flex bg={otherMessageBgColor} maxW={"350px"} p={1} borderRadius={"md"}>
                            <Text color={otherMessageTextColor}> {message.text}</Text>
                        </Flex>
                    )}
                    {message.img && (
                        //  message  Box
                        <Box mt={1} w={"200px"}>
                            {!imgLoaded && <Skeleton w={"200px"} h={"200px"} />}
                            <Image
                                src={message.img.url}
                                alt='Message image'
                                borderRadius={4}
                                onLoad={() => setImgLoaded(true)}
                                style={{ display: imgLoaded ? "block" : "none" }}
                            />
                        </Box>
                    )}
                </Flex>
            )}
        </>
    );
};

export default Message;
