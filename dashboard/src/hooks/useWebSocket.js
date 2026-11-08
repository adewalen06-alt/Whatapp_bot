import { useEffect, useState } from 'react';
import { addWsListener, removeWsListener, getBotStatus, getConnectedBots } from './wsClient.js';

export function useWebSocket() {
  const [status, setStatus] = useState('connecting');
  const [connectedBots, setConnectedBots] = useState([]);

  useEffect(() => {
    function handle({ status: s }) {
      setStatus(s);
    }
    addWsListener('_status', handle);
    return () => removeWsListener('_status', handle);
  }, []);

  useEffect(() => {
    function handle({ bots }) {
      setConnectedBots(getConnectedBots());
    }
    addWsListener('bots_snapshot', handle);
    return () => removeWsListener('bots_snapshot', handle);
  }, []);

  return { status, connectedBots };
}

export function useBotStatus(botId = 'default') {
  const [status, setStatus] = useState(getBotStatus(botId));

  useEffect(() => {
    function handle({ botId: id, status: s }) {
      if (id === botId) setStatus(s);
    }
    addWsListener('_bot_status', handle);
    return () => removeWsListener('_bot_status', handle);
  }, [botId]);

  return status;
}
