import { io } from "socket.io-client";

const socket = io("https://productive-cerulean-warrior.glitch.me/", { transports: ["websocket"] });

export default socket;

