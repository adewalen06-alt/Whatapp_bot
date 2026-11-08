import { useEffect, useState, useCallback } from 'react';
import {
  getBots, createBot, removeBot, getBotQR, startBot as apiStartBot, stopBot as apiStopBot,
  fmtUptime,
} from '../lib/api.js';
import { useWebSocket, useBotStatus } from '../hooks/useWebSocket.js';
import { useToast } from '../App.jsx';
import {
  Badge,
  Btn,
  Card,
  CardTitle,
  Empty,
  Field,
  Input,
  Loading,
  PageHeader,
  Spinner,
  Table,
  TableWrap,
  Td,
  Th,
  Tr,
  cx,
} from '../components/ui.jsx';

const STATUS_COLORS = {
  connected: 'text-success bg-success/10',
  connecting: 'text-accent bg-accent/10',
  qr: 'text-warning bg-warning/10',
  disconnected: 'text-danger bg-danger/10',
};

const STATUS_LABELS = {
  connected: 'Online',
  connecting: 'Connecting…',
  qr: 'QR Needed',
  disconnected: 'Offline',
};

export default function Bots() {
  const toast = useToast();
  const { status: wsStatus } = useWebSocket();
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newBotId, setNewBotId] = useState('');
  const [newBotNumber, setNewBotNumber] = useState('');

  const loadBots = useCallback(() => {
    getBots()
      .then((d) => setBots(d.bots || []))
      .catch(() => toast('Failed to load bots', false))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  // Refresh when WebSocket status changes
  const { status: _ignored } = useWebSocket();

  async function handleCreateBot() {
    if (!newBotId.trim()) {
      toast('Bot ID is required', false);
      return;
    }
    setCreating(true);
    try {
      await createBot(newBotId.trim(), newBotNumber.trim() || undefined, undefined);
      toast(`Bot ${newBotId} created`);
      setNewBotId('');
      setNewBotNumber('');
      loadBots();
    } catch (err) {
      toast(err.message, false);
    } finally {
      setCreating(false);
    }
  }

  async function handleRemoveBot(botId) {
    if (!confirm(`Remove bot "${botId}"? This cannot be undone.`)) return;
    try {
      await removeBot(botId);
      toast(`Bot ${botId} removed`);
      loadBots();
    } catch (err) {
      toast(err.message, false);
    }
  }

  async function handleStartBot(botId) {
    try {
      await apiStartBot(botId);
      toast(`Bot ${botId} starting…`);
      loadBots();
    } catch (err) {
      toast(err.message, false);
    }
  }

  async function handleStopBot(botId) {
    try {
      await apiStopBot(botId);
      toast(`Bot ${botId} stopped`);
      loadBots();
    } catch (err) {
      toast(err.message, false);
    }
  }

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader title='Bot Manager' sub='Manage multiple WhatsApp bot instances.'>
        <div className='flex flex-col sm:flex-row gap-2 sm:items-end'>
          <div className='flex items-center gap-2'>
            <Input
              placeholder='bot ID (e.g. bot2)'
              value={newBotId}
              onChange={(e) => setNewBotId(e.target.value)}
            />
            <Input
              placeholder='bot number (optional)'
              value={newBotNumber}
              onChange={(e) => setNewBotNumber(e.target.value)}
            />
            <Btn
              variant='primary'
              onClick={handleCreateBot}
              disabled={creating || !newBotId.trim()}
            >
              {creating ? <Spinner size='size-4' /> : 'Add Bot'}
            </Btn>
          </div>
        </div>
      </PageHeader>

      {bots.length === 0 ? (
        <Empty>No bots configured. Add your first bot above.</Empty>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Bot ID</Th>
                <Th>Status</Th>
                <Th>Number</Th>
                <Th>QR Code</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {bots.map((bot) => {
                const status = bot.status || 'disconnected';
                const isConnected = status === 'connected';
                const botStatusColor = STATUS_COLORS[status] || STATUS_COLORS.disconnected;
                const botStatusLabel = STATUS_LABELS[status] || status;

                return (
                  <Tr key={bot.botId}>
                    <Td>
                      <strong className='font-mono text-[0.82rem]'>
                        {bot.botId}
                        {bot.botId === 'default' && (
                          <span className='text-xs text-muted'> (default)</span>
                        )}
                      </strong>
                    </Td>
                    <Td>
                      <Badge tone={isConnected ? 'on' : 'off'} className={botStatusColor}>
                        {botStatusLabel}
                      </Badge>
                    </Td>
                    <Td className='font-mono text-[0.74rem] text-muted'>
                      {bot.botNumber?.[0] || '—'}
                    </Td>
                    <Td>
                      {status === 'qr' && bot.qr ? (
                        <Btn
                          variant='ghost'
                          onClick={() => {
                            navigator.clipboard.writeText(bot.qr);
                            toast('QR code copied to clipboard');
                          }}
                        >
                          Show QR
                        </Btn>
                      ) : (
                        <span className='text-[0.72rem] text-muted'>—</span>
                      )}
                    </Td>
                    <Td>
                      <div className='flex items-center gap-1.5'>
                        {status === 'connected' ? (
                          <Btn variant='smDanger' onClick={() => handleStopBot(bot.botId)}>
                            Stop
                          </Btn>
                        ) : (
                          <Btn variant='sm' onClick={() => handleStartBot(bot.botId)}>
                            Start
                          </Btn>
                        )}
                        {bot.botId !== 'default' && (
                          <Btn variant='smDanger' onClick={() => handleRemoveBot(bot.botId)}>
                            Remove
                          </Btn>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <Card className='mt-6'>
        <CardTitle>How it works</CardTitle>
        <p className='text-[0.78rem] text-soft leading-relaxed'>
          Each bot runs as an independent WhatsApp instance with its own session stored in
          MongoDB. Scan the QR code for each bot to link it to a WhatsApp account. The default
          bot starts automatically on server boot.
        </p>
      </Card>
    </div>
  );
}
