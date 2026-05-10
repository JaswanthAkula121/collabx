import { motion } from "framer-motion";
import { useState } from "react";
import { FormCard } from "../ui/FormCard";
import { Input } from "../ui/Input";
import { FieldLabel } from "../ui/FieldLabel";
import { Badge } from "../ui/Badge";
import { ButtonPrimary, ButtonOutline } from "../ui/Button";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL;

export default function HeroForms() {
  const navigate = useNavigate();

  // CREATE ROOM STATES
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  // JOIN ROOM STATES
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinPassword, setJoinPassword] = useState("");

  // CREATE ROOM
  const handleCreateRoom = async () => {
    const trimmedName = name.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName) {
      toast.error("Please enter your name.");
      return;
    }

    if (!trimmedPassword) {
      toast.error("Please set a room password.");
      return;
    }

    const roomId = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();

    try {
      const response = await fetch(`${API_URL}/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          username: trimmedName,
          password: trimmedPassword,
        }),
      });

      const data = await response.json();

      console.log("CREATE ROOM RESPONSE:", data);

      if (!response.ok) {
        toast.error(data?.message || "Could not create room.");
        return;
      }

      localStorage.setItem("username", trimmedName);

      toast.success("Room created successfully!");

      navigate(`/room/${roomId}`, {
        state: {
          username: trimmedName,
          password: trimmedPassword,
        },
      });
    } catch (error) {
      console.error(error);
      toast.error("Server error while creating room.");
    }
  };

  // JOIN ROOM
  const handleJoinRoom = async () => {
    const trimmedRoomId = joinRoomId.trim().toUpperCase();
    const trimmedName = joinName.trim();
    const trimmedPassword = joinPassword.trim();

    if (!trimmedRoomId) {
      toast.error("Please enter room ID.");
      return;
    }

    if (!trimmedName) {
      toast.error("Please enter your name.");
      return;
    }

    if (!trimmedPassword) {
      toast.error("Please enter room password.");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/rooms/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
  roomId: trimmedRoomId,
  password: trimmedPassword,
}),
        }
      );

      const data = await response.json();

      console.log("VERIFY RESPONSE:", data);

      if (!response.ok) {
        toast.error(data?.message || "Incorrect room password");
        return;
      }

      localStorage.setItem("username", trimmedName);

      toast.success("Joined room successfully!");

      navigate(`/room/${trimmedRoomId}`, {
        state: {
          username: trimmedName,
          password: trimmedPassword,
        },
      });
    } catch (error) {
      console.error(error);

      toast.error(
        error?.message || "Server error while joining room."
      );
    }
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <Badge>
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
          No sign-up required
        </Badge>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: "easeOut" }}
        className="text-4xl md:text-5xl font-bold leading-[1.1] text-purple-50 mb-5"
      >
        Code together
        <br />
        now on <span className="text-purple-400">CollabX</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="text-purple-300/60 text-base leading-relaxed mb-10 max-w-sm"
      >
        Your collaborative coding space, reimagined.
        Start now, no sign-up required.
      </motion.p>

      {/* CREATE ROOM */}
      <FormCard title="Create a Room" delay={0.15}>
        <FieldLabel>Name</FieldLabel>

        <Input
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <FieldLabel>Password</FieldLabel>

        <Input
          type="password"
          placeholder="Set a room password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <ButtonPrimary onClick={handleCreateRoom}>
          <span className="text-lg leading-none">+</span>
          Create Room
        </ButtonPrimary>
      </FormCard>

      {/* JOIN ROOM */}
      <FormCard title="Join a Room" delay={0.22}>
        <FieldLabel>Room ID</FieldLabel>

        <Input
          placeholder="XXXX-XXXX"
          mono
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
        />

        <FieldLabel>Name</FieldLabel>

        <Input
          placeholder="Enter your name"
          value={joinName}
          onChange={(e) => setJoinName(e.target.value)}
        />

        <FieldLabel>Password</FieldLabel>

        <Input
          type="password"
          placeholder="Enter room password"
          value={joinPassword}
          onChange={(e) => setJoinPassword(e.target.value)}
        />

        <ButtonOutline onClick={handleJoinRoom}>
          Join Room -&gt;
        </ButtonOutline>
      </FormCard>
    </div>
  );
}
