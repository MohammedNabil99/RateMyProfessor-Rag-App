"use client";
import { Box, Button, Stack, TextField } from "@mui/material";
import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, I am the Rate My Professor support assistant. How can I help you? ",
    },
  ]);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef(null);

  const sendMessage = async () => {
    if (!message.trim()) return; // Don't send empty messages

    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);

    setMessage("");
    setLoading(true);

    const response = fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let result = "";
      return reader.read().then(function processText({ done, value }) {
        if (done) {
          setLoading(false);
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), {
          stream: true,
        });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);

          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });

        return reader.read().then(processText);
      });
    });
  };

  // Auto-scroll to bottom whenever messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle Enter key press
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent the default behavior of adding a new line
      sendMessage(); // Call the sendMessage function
    }
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      p={2} // Add padding to the entire page
      sx={{
        "@media (max-width: 600px)": {
          p: 1,
        },
      }}
    >
      <Stack
        direction="column"
        width={{ xs: "95%", sm: "90%", md: "500px" }}
        height={{ xs: "90%", sm: "85%", md: "700px" }}
        border="1px solid black"
        borderRadius={4} // Rounded corners for a softer look
        p={2}
        spacing={3}
        sx={{
          backgroundColor: "background.paper",
          boxShadow: 3, // Add shadow to give a floating effect
          "@media (max-width: 600px)": {
            height: "calc(100vh - 60px)", // Adjust height for mobile devices
          },
        }}
      >
        <Stack
          direction="column"
          spacing={2}
          flexGrow={1}
          overflow="auto"
          maxHeight="100%"
          ref={chatContainerRef} // Attach the ref to the chat container
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              flexDirection="column"
              alignItems={
                message.role === "assistant" ? "flex-start" : "flex-end"
              }
            >
              <Box
                bgcolor={
                  message.role === "assistant"
                    ? "primary.main"
                    : "secondary.main"
                }
                color="white"
                borderRadius={6}
                p={2}
                sx={{
                  maxWidth: "90%",
                  wordBreak: "break-word",
                  "@media (max-width: 600px)": {
                    p: 1,
                    maxWidth: "90%",
                  },
                }}
              >
                {message.content}
              </Box>
              {index === messages.length - 1 &&
                message.role === "assistant" &&
                loading && (
                  <Box color="gray" mt={2} fontStyle="italic">
                    Typing...
                  </Box>
                )}
            </Box>
          ))}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <TextField
            label="message"
            fullWidth
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
            }}
            onKeyDown={handleKeyDown} // Add key down handler
            multiline
            sx={{
              "@media (max-width: 600px)": {
                fontSize: "0.875rem", // Smaller font size for mobile
              },
            }}
          />
          <Button variant="contained" onClick={sendMessage} sx={{ ml: 1 }}>
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
