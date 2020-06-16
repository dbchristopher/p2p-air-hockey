import React, { useState, createContext } from "react";
import Container from "./Container";

type RTCCallback = (argument: any) => void;

const ConnectionContext = createContext<{
  connection: any;
  updateConnection: RTCCallback;
}>({
  connection: null,
  updateConnection: () => {},
});

const ChannelContext = createContext<{
  channel: any;
  updateChannel: RTCCallback;
}>({
  channel: null,
  updateChannel: () => {},
});

const App = () => {
  const [connection, setconnection] = useState(null);
  const [channel, setChannel] = useState(null);
  const updateConnection = (conn: any) => {
    setconnection(conn);
  };
  const updateChannel = (chn: any) => {
    setChannel(chn);
  };
  return (
    <ConnectionContext.Provider value={{ connection, updateConnection }}>
      <ChannelContext.Provider value={{ channel, updateChannel }}>
        <Container />
      </ChannelContext.Provider>
    </ConnectionContext.Provider>
  );
};

export const ConnectionConsumer = ConnectionContext.Consumer;
export const ChannelConsumer = ChannelContext.Consumer;
export default App;
