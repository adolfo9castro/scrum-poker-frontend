import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Grid,
  Button,
  Card,
  CardContent,
  TextField,
  IconButton,
} from "@mui/material";
import { AccessTime, Settings, People, PlayArrow } from "@mui/icons-material";
import socket from "./socket";

const App = () => {
  const [roomId, setRoomId] = useState("");
  const [userStory, setUserStory] = useState("");
  const [userDescription, setUserDescription] = useState("")
  const [username, setUsername] = useState("");
  const [participants, setParticipants] = useState([]);
  const [votes, setVotes] = useState({});
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [showVotes, setShowVotes] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [timer, setTimer] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [averageVote, setAverageVote] = useState(null);

  useEffect(() => {
    socket.on("connect", () => {
      //console.log("Connected to WebSocket server with ID:", socket.id);
    });

    socket.on("connect_error", (error) => {
      console.error("Connection Error: ", error);
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
    };
  }, []);

  useEffect(() => {
    let countdown;
    if (isTimerRunning && timer > 0) {
      countdown = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);        
      }, 1000);
    } else {
      revealVotes()
      clearInterval(countdown);
    }
    return () => clearInterval(countdown);
  }, [timer, isTimerRunning]);

  useEffect(() => {
    if (showVotes) {
      calculateAverageVote();
    }
  }, [showVotes, votes]);

  const calculateAverageVote = () => {
    const numericVotes = Object.values(votes).filter((vote) => !isNaN(vote)).map(Number);
    if (numericVotes.length > 0) {
      const sum = numericVotes.reduce((acc, curr) => acc + curr, 0);
      setAverageVote((sum / numericVotes.length).toFixed(2));
    } else {
      setAverageVote(null);
    }
  };

  // Crear una sala
  const createRoom = () => {
    if (roomId) {
      socket.emit("createRoom", { roomId }, (response) => {
        if (response && response.success) {
          console.log(`Room ${roomId} created successfully`);
        } else {
          console.error(response ? response.message : 'No response from server');
        }
      });
    }
  };

  const joinRoom = () => {
    if (roomId && username) {
      socket.emit("joinRoom", { roomId, user: username }, (response) => {
        if (response && response.success) {
          socket.on("updateParticipants", (data) => {
            console.log(data);
            setParticipants(
              Object.entries(data.participants).map(([name, status]) => ({
                name,
                status,
              }))
            );
          });
  
        } else {
          console.error(response ? response.message : 'No response from server');
        }
      });
    }
  };

  // Enviar voto
  const sendVote = (vote) => {
    setUserVote(vote);
    socket.emit("sendVote", { roomId, user: username, vote });
  };

  // Resetear votos
  const resetVotes = () => {
    socket.emit("resetVotes", { roomId });
    setShowVotes(false);
    setUserVote(null);
    setTimer(120); // Reset timer to 2 minutes
    setIsTimerRunning(false); // Start timer again
    setAverageVote(null); // Reset average vote
  };

  // Mostrar votos
  const revealVotes = () => {
    socket.emit("revealVotes", { roomId });
    setIsTimerRunning(false); // Stop timer when revealing votes
  };

  // Enviar mensaje al chat
  const sendMessage = () => {
    if (message) {
      const newMessage = { user: username, message };
      socket.emit("sendMessage", { roomId, user: username, message }, (response) => {
        if (response && response.success) {
          console.log('Message sent successfully');
        } else {
          console.error('Failed to send message');
        }
      });
      // Do not add message locally to avoid duplicate issues, rely on server response
      setMessage("");
    }
  };

  useEffect(() => {
    // Revelar votos
    socket.on("votesRevealed", (data) => {
      setShowVotes(true);
      setVotes(data.votes);
    });

    // Actualizar participantes
    socket.on("updateParticipants", (data) => {
      setParticipants(
        Object.entries(data.participants).map(([name, status]) => ({
          name,
          status,
        }))
      );
    });

    // Obtener participantes al unirse a la sala
    socket.on("getParticipantsResponse", (data) => {
      setParticipants(
        Object.entries(data.participants).map(([name, status]) => ({
          name,
          status,
        }))
      );
    });

    // Actualizar votos
    socket.on("updateVotes", (data) => {
      if (data && typeof data.votes === 'object') {
        setVotes(data.votes);
      } else {
        setVotes({});
      }
    });

    // Actualizar chat
    socket.on("updateChat", (data) => {      
      if (data) {
        console.log(data)
        setChat((prevChat) => [...prevChat, ...data.filter(msg => !prevChat.some(prevMsg => prevMsg.message === msg.message && prevMsg.user === msg.user))]);
      }
    });

    return () => {
      socket.off("votesRevealed");
      socket.off("getParticipantsResponse");
      socket.off("joinRoom");
      socket.off("updateParticipants");
      socket.off("updateVotes");
      socket.off("updateChat");
    };
  }, []);

  const cardValues = ["1", "2", "3", "5", "8", "13", "21", "?"];

  return (
    <Box>
      {/* Header */}
      <AppBar position="static" sx={{ background: "#fff", color: "#000" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Scrum Poker
          </Typography>
          <IconButton>
            <People />
          </IconButton>
          <IconButton>
            <Settings />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ padding: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={9}>
            {/* Crear o Unirse a Sala */}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="ID de la sala"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  fullWidth
                  variant="outlined"
                  sx={{ marginBottom: 2, borderRadius: "8px" }}
                />
                <TextField
                  label="Usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  fullWidth
                  variant="outlined"
                  sx={{ marginBottom: 2, borderRadius: "8px" }}
                />
                {/*<Button
                  variant="contained"
                  color="primary"
                  onClick={createRoom}
                  sx={{ marginRight: 2, borderRadius: "8px" }}
                >
                  Create Room
                </Button>*/}
                <Button variant="contained" color="secondary" onClick={joinRoom} sx={{ borderRadius: "8px" }}>
                  Ingresar a una sala
                </Button>
              </Grid>

              {/* Story Information */}
              <Grid item xs={12}>
                <Card sx={{ borderRadius: "8px" }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Historia de usuario:
                    </Typography>
                    <TextField
                      value={userStory} // Puedes cambiar esto por una nueva variable de estado, por ejemplo, `userStory`
                      onChange={(e) => setUserStory(e.target.value)} // Cambia esta función por la función adecuada para el nuevo estado
                      fullWidth
                      variant="standard"
                      placeholder="Escribe la historia de usuario aquí..."
                      InputProps={{ disableUnderline: true }}
                      sx={{ marginBottom: 2, fontSize: '1rem', fontWeight: 'bold' }}
                    />
                    <Typography variant="subtitle1" fontWeight="bold">
                      Descripción:
                    </Typography>
                    <TextField
                      value={userDescription} // Puedes cambiar esto por una nueva variable de estado, por ejemplo, `userDescription`
                      onChange={(e) => setUserDescription(e.target.value)} // Cambia esta función por la función adecuada para el nuevo estado
                      fullWidth
                      variant="standard"
                      placeholder="Yo como usuario quisiera..."
                      InputProps={{ disableUnderline: true }}
                      sx={{ fontSize: '0.875rem' }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Cards */}
              <Grid item xs={12}>
                <Grid container spacing={2} justifyContent="center">
                  {cardValues.map((value, index) => (
                    <Grid item key={index}>
                      <Button
                        variant="outlined"
                        sx={{
                          width: 80,
                          height: 50,
                          fontSize: "1.2rem",
                          fontWeight: "bold",
                          borderRadius: "8px",
                          backgroundColor: userVote === value ? "#e0e0e0" : "transparent",
                          boxShadow: userVote === value ? "0px 0px 10px rgba(0, 0, 0, 0.2)" : "none",
                          borderColor: userVote === value ? "#3f51b5" : "inherit",
                        }}
                        onClick={() => sendVote(value)}
                      >
                        {value}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* Timer and Reveal Button */}
              <Grid item xs={12} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AccessTime sx={{ marginRight: 1 }} />
                <Typography variant="h6">
                  {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                </Typography>
                <IconButton onClick={() => setIsTimerRunning(true)} sx={{ marginLeft: 2 }}>
                  <PlayArrow /> {/* Puedes cambiar el ícono por otro que prefieras, por ejemplo, PlayArrow */}
                </IconButton>
                <Button variant="contained" color="primary" sx={{ marginLeft: 3, borderRadius: "8px" }} onClick={revealVotes}>
                  Revelar Cartas
                </Button>
                <Button variant="outlined" sx={{ marginLeft: 2, borderRadius: "8px" }} onClick={resetVotes}>
                  Reiniciar
                </Button>
              </Grid>
            </Grid>
          </Grid>

          {/* Participants and Chat */}
          <Grid item xs={3}>
            <Grid container spacing={2}>
              {/* Participants */}
              <Grid item xs={12}>
                <Card sx={{ borderRadius: "8px" }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Participantes {participants.length}/8
                    </Typography>
                    {participants.map((participant, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: 1,
                        }}
                      >
                        <Typography>{participant.name}</Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            background:
                              participant.status === "Ha votado"
                                ? "#4CAF50"
                                : participant.status === "voting"
                                ? "#FFC107"
                                : "#9E9E9E",
                            color: "#fff",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {participant.status.replace("-", " ")}
                        </Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>

              {/* Chat */}
              <Grid item xs={12}>
                <Card sx={{ borderRadius: "8px" }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Chat
                    </Typography>
                    {chat.map((message, index) => (
                      <Box key={index} sx={{ marginBottom: 1 }}>
                        <Typography variant="body2">
                          <strong>{message.user}:</strong> {message.message}
                        </Typography>
                      </Box>
                    ))}
                    <Box sx={{ display: "flex", marginTop: 2 }}>
                      <TextField
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Deja un mensaje"
                        fullWidth
                        sx={{ borderRadius: "8px" }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            sendMessage();
                          }
                        }}
                      />
                      {/*<Button onClick={sendMessage} sx={{ borderRadius: "8px" }}>Enviar</Button>*/}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
          
          {/* Promedio de votos */}
          <Grid item xs={9}>
            <Card sx={{ borderRadius: "8px" }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold">
                  Promedio de Votos
                </Typography>
                <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {averageVote !== null ? (
                    <Typography variant="h4">{averageVote}</Typography>
                  ) : (
                    <Typography variant="body2">Aun no se ha votado</Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          {/* Votaciones */}
          <Grid item xs={3}>
            <Card sx={{ borderRadius: "8px" }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" align="left">
                    Usuario
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold" align="left">
                    Voto
                  </Typography>
                </Box>
                {showVotes ? (
                  Object.entries(votes).map(([user, vote], index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                      <Typography variant="body2" align="left">
                        {user}
                      </Typography>
                      <Button variant="outlined" sx={{ borderRadius: "8px" }}>{vote}</Button>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2">
                    Los votos no se revelan aún
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>          
        </Grid>
      </Box>
    </Box>
  );
};

export default App;
