import React, {
  ReactNode,
  Fragment,
  useState,
  useEffect,
  useRef,
  FC,
} from "react";
import { Icon, Grid, Input, Button, Segment } from "semantic-ui-react";
import { Header, Loader } from "semantic-ui-react";
import SweetAlert from "react-bootstrap-sweetalert";
import UsersList from "./UsersList";

const configuration = {
  iceServers: [{ urls: "stun:stun.1.google.com:19302" }],
};

const Chat: FC<any> = ({
  connection,
  updateConnection,
  channel,
  updateChannel,
}) => {
  const webSocket = useRef<any>(null);
  const [socketOpen, setSocketOpen] = useState(false);
  const [socketMessages, setSocketMessages] = useState([]);
  const [alert, setAlert] = useState<ReactNode>(null);

  const [connectedTo, setConnectedTo] = useState("");
  const connectedRef = useRef(null);
  const [connecting, setConnecting] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [users, setUsers] = useState([]);

  const handleDataChannelMessageReceived = (...args: any) => {
    console.log(args);
  };

  const handleConnection = (name: any) => {
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
  };

  const updateUsersList = (arg: any) => {};
  const removeUser = (arg: any) => {};
  const onOffer = (arg: any) => {};
  const onAnswer = (arg: any) => {};
  const onCandidate = (arg: any) => {};
  const closeAlert = () => {
    setAlert(null);
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

  const handleLogin = () => {
    setLoggingIn(true);
    send({
      type: "login",
      name,
    });
  };

  useEffect(() => {
    webSocket.current = new WebSocket("ws://localhost:9000");
    webSocket.current.onmessage = (message: any) => {
      const data = JSON.parse(message.data);
      setSocketMessages((prev: any): any => [...prev, data]);
    };
    webSocket.current.onclose = () => {
      webSocket.current.close();
    };
    return () => webSocket.current.close();
  }, []);

  const send = (data: any) => {
    webSocket.current.send(JSON.stringify(data));
  };

  useEffect(() => {
    let data: any = socketMessages.pop();
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

  const toggleConnection = (userName: any) => {
    if (connectedRef.current === userName) {
      setConnecting(true);
      setConnectedTo("");
      connectedRef.current = null;
      setConnecting(false);
    } else {
      setConnecting(true);
      setConnectedTo(userName);
      connectedRef.current = userName;
      // To be discussed later
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
