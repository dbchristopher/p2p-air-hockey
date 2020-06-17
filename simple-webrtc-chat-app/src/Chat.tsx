import React, { Fragment, useState, useEffect, useRef, ReactNode } from "react";
import {
  Header,
  Icon,
  Input,
  Grid,
  Segment,
  Button,
  Loader,
} from "semantic-ui-react";
import SweetAlert from "react-bootstrap-sweetalert";
import { format } from "date-fns";
import "./App.css";
import UsersList from "./UsersList";
import MessageBox from "./MessageBox";

// Use for remote connections
const configuration = {
  iceServers: [{ urls: "stun:stun.1.google.com:19302" }],
};

// Use for local connections
// const configuration = null;

const Chat = ({
  connection,
  updateConnection,
  channel,
  updateChannel,
}: any) => {
  const [socketOpen, setSocketOpen] = useState(false);
  const [socketMessages, setSocketMessages] = useState<any[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [connectedTo, setConnectedTo] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [alert, setAlert] = useState<ReactNode>(null);
  const connectedRef = useRef<string>();
  const webSocket = useRef<any>(null);
  const [message, setMessage] = useState("");
  const messagesRef = useRef<{ [key: string]: any }>({});
  const [messages, setMessages] = useState({});

  useEffect(() => {
    // initiate connection on load
    if (process.env.REACT_APP_WEBSOCKET_URL) {
      webSocket.current = new WebSocket(process.env.REACT_APP_WEBSOCKET_URL);
      webSocket.current.onmessage = (message: any) => {
        const data = JSON.parse(message.data);
        setSocketMessages((prev: any) => [...prev, data]);
      };
      webSocket.current.onclose = () => {
        webSocket.current.close();
      };
    }
    return () => webSocket.current && webSocket.current.close();
  }, []);

  useEffect(() => {
    let data = socketMessages.pop();
    console.log("DATA!", data);
    if (data) {
      switch (data.type) {
        case "connect":
          setSocketOpen(true);
          break;
        case "login":
          onLogin(data);
          break;
        case "updateUsers":
          updateUsersList(data);
          break;
        case "removeUser":
          removeUser(data);
          break;
        case "offer":
          onOffer(data);
          break;
        case "answer":
          onAnswer(data);
          break;
        case "candidate":
          onCandidate(data);
          break;
        default:
          break;
      }
    }
  }, [socketMessages]);

  const closeAlert = () => {
    setAlert(null);
  };

  const send = (data: any) => {
    webSocket.current.send(JSON.stringify(data));
  };

  const handleLogin = () => {
    setLoggingIn(true);
    send({
      type: "login",
      name,
    });
  };

  const updateUsersList = ({ user }: any) => {
    setUsers((prev: any) => [...prev, user]);
  };

  const removeUser = ({ user }: any) => {
    setUsers((prev) => prev.filter((u: any) => u.userName !== user.userName));
  };

  const handleDataChannelMessageReceived = ({
    data,
  }: {
    [key: string]: any;
  }) => {
    const message = JSON.parse(data);
    const { name: user } = message;
    let messages = messagesRef.current;
    let userMessages = messages[user];
    if (userMessages) {
      userMessages = [...userMessages, message];
      let newMessages = Object.assign({}, messages, { [user]: userMessages });
      messagesRef.current = newMessages;
      setMessages(newMessages);
    } else {
      let newMessages = Object.assign({}, messages, { [user]: [message] });
      messagesRef.current = newMessages;
      setMessages(newMessages);
    }
  };

  const onLogin = ({ success, message, users: loggedIn }: any) => {
    setLoggingIn(false);
    if (success) {
      setAlert(
        <SweetAlert
          success
          title="Success!"
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          Logged in successfully!
        </SweetAlert>
      );
      setIsLoggedIn(true);
      setUsers(loggedIn);
      let localConnection = new RTCPeerConnection(configuration);
      //when the browser finds an ice candidate we send it to another peer
      localConnection.onicecandidate = ({ candidate }) => {
        let connectedTo = connectedRef.current;

        if (candidate && !!connectedTo) {
          send({
            name: connectedTo,
            type: "candidate",
            candidate,
          });
        }
      };
      localConnection.ondatachannel = (event) => {
        console.log("Data channel is created!");
        let receiveChannel = event.channel;
        receiveChannel.onopen = () => {
          console.log("Data channel is open and ready to be used.");
        };
        receiveChannel.onmessage = handleDataChannelMessageReceived;
        updateChannel(receiveChannel);
      };
      updateConnection(localConnection);
    } else {
      setAlert(
        <SweetAlert
          warning
          confirmBtnBsStyle="danger"
          title="Failed"
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          {message}
        </SweetAlert>
      );
    }
  };

  //when somebody wants to message us
  const onOffer = ({ offer, name }: any) => {
    setConnectedTo(name);
    connectedRef.current = name;

    connection
      .setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => connection.createAnswer())
      .then((answer: any) => connection.setLocalDescription(answer))
      .then(() =>
        send({ type: "answer", answer: connection.localDescription, name })
      )
      .catch((e: any) => {
        console.log({ e });
        setAlert(
          <SweetAlert
            warning
            confirmBtnBsStyle="danger"
            title="Failed"
            onConfirm={closeAlert}
            onCancel={closeAlert}
          >
            An error has occurred.
          </SweetAlert>
        );
      });
  };

  //when another user answers to our offer
  const onAnswer = ({ answer }: any) => {
    connection.setRemoteDescription(new RTCSessionDescription(answer));
  };

  //when we got ice candidate from another user
  const onCandidate = ({ candidate }: any) => {
    connection.addIceCandidate(new RTCIceCandidate(candidate));
  };

  //when a user clicks the send message button
  const sendMsg = () => {
    const time = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    let text = { time, message, name };
    let messages = messagesRef.current;
    let connectedTo = connectedRef.current as string;
    let userMessages = messages[connectedTo];
    if (messages[connectedTo]) {
      userMessages = [...userMessages, text];
      let newMessages = Object.assign({}, messages, {
        [connectedTo]: userMessages,
      });
      messagesRef.current = newMessages;
      setMessages(newMessages);
    } else {
      userMessages = Object.assign({}, messages, { [connectedTo]: [text] });
      messagesRef.current = userMessages;
      setMessages(userMessages);
    }
    channel.send(JSON.stringify(text));
    setMessage("");
  };

  const handleConnection = (name: any) => {
    var dataChannelOptions = {
      reliable: true,
    };

    let dataChannel = connection.createDataChannel("messenger");

    dataChannel.onerror = (error: any) => {
      setAlert(
        <SweetAlert
          warning
          confirmBtnBsStyle="danger"
          title="Failed"
          onConfirm={closeAlert}
          onCancel={closeAlert}
        >
          An error has occurred.
        </SweetAlert>
      );
    };

    dataChannel.onmessage = handleDataChannelMessageReceived;
    updateChannel(dataChannel);

    connection
      .createOffer()
      .then((offer: any) => connection.setLocalDescription(offer))
      .then(() =>
        send({ type: "offer", offer: connection.localDescription, name })
      )
      .catch((e: any) =>
        setAlert(
          <SweetAlert
            warning
            confirmBtnBsStyle="danger"
            title="Failed"
            onConfirm={closeAlert}
            onCancel={closeAlert}
          >
            An error has occurred.
          </SweetAlert>
        )
      );
  };

  const toggleConnection = (userName: any) => {
    if (connectedRef.current === userName) {
      setConnecting(true);
      setConnectedTo("");
      connectedRef.current = "";
      setConnecting(false);
    } else {
      setConnecting(true);
      setConnectedTo(userName);
      connectedRef.current = userName;
      handleConnection(userName);
      setConnecting(false);
    }
  };
  return (
    <div className="App">
      {alert}
      <Header as="h2" icon>
        <Icon name="users" />
        Simple WebRTC Chap App
      </Header>
      {(socketOpen && (
        <Fragment>
          <Grid centered columns={4}>
            <Grid.Column>
              {(!isLoggedIn && (
                <Input
                  fluid
                  disabled={loggingIn}
                  type="text"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Username..."
                  action
                >
                  <input />
                  <Button
                    color="teal"
                    disabled={!name || loggingIn}
                    onClick={handleLogin}
                  >
                    <Icon name="sign-in" />
                    Login
                  </Button>
                </Input>
              )) || (
                <Segment raised textAlign="center" color="olive">
                  Logged In as: {name}
                </Segment>
              )}
            </Grid.Column>
          </Grid>
          <Grid>
            <UsersList
              users={users}
              toggleConnection={toggleConnection}
              connectedTo={connectedTo}
              connection={connecting}
            />
            <MessageBox
              messages={messages}
              connectedTo={connectedTo}
              message={message}
              setMessage={setMessage}
              sendMsg={sendMsg}
              name={name}
            />
          </Grid>
        </Fragment>
      )) || (
        <Loader size="massive" active inline="centered">
          Loading
        </Loader>
      )}
    </div>
  );
};

export default Chat;
