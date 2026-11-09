import { useEffect, useState, useCallback } from 'react';
import {
  getBots, createBot, removeBot, getBotQR, startBot as apiStartBot, stopBot as apiStopBot,
  requestPair,
} from '../lib/api.js';
import { useWebSocket } from '../hooks/useWebSocket.js';
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
  Modal,
  ModalHeader,
  Code,
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
  const [selectedBotId, setSelectedBotId] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [pairPhone, setPairPhone] = useState('');
  const [pairCode, setPairCode] = useState('');
  const [pairLoading, setPairLoading] = useState(false);
  const [pairErr, setPairErr] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const loadBots = useCallback(() => {
    getBots()
      .then((d) => setBots(d.bots || []))
      .catch(() => toast('Failed to load bots', false))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    loadBots();
  }, [loadBots]);

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

  async function handleShowQR(botId) {
    setQrLoading(true);
    setSelectedBotId(botId);
    try {
      const res = await getBotQR(botId);
      if (res.qr) {
        setQrCode(res.qr);
        setQrModalOpen(true);
      } else {
        toast('No QR code available. Bot may be connected or starting.', false);
      }
    } catch (err) {
      toast(err.message, false);
    } finally {
      setQrLoading(false);
    }
  }

  async function handleGetPairCode(botId) {
    if (!pairPhone.trim()) {
      toast('Enter phone number with country code', false);
      return;
    }
    setPairLoading(true);
    setPairErr('');
    setPairCode('');
    try {
      const res = await requestPair(pairPhone.trim(), botId);
      setPairCode(res.code);
      toast('Pairing code ready!');
    } catch (err) {
      setPairErr(err.message);
    } finally {
      setPairLoading(false);
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
                <Th>Pair Code</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {bots.map((bot) => {
                const status = bot.status || 'disconnected';
                const isConnected = status === 'connected';
                const isQrState = status === 'qr';
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
                      {isQrState ? (
                        <Btn
                          variant='ghost'
                          size='sm'
                          onClick={() => handleShowQR(bot.botId)}
                          disabled={qrLoading}
                        >
                          {qrLoading ? <Spinner size='size-3.5' /> : 'Show QR'}
                        </Btn>
                      ) : isConnected ? (
                        <span className='text-[0.72rem] text-success'>Connected</span>
                      ) : (
                        <Btn
                          variant='ghost'
                          size='sm'
                          onClick={() => handleStartBot(bot.botId)}
                          disabled={status === 'connecting'}
                        >
                          Start
                        </Btn>
                      )}
                    </Td>
                    <Td>
                      {!isConnected ? (
                        <Btn
                          variant='ghost'
                          size='sm'
                          onClick={() => {
                            setSelectedBotId(bot.botId);
                            setPairPhone('');
                            setPairCode('');
                            setPairErr('');
                          }}
                        >
                          Get Pair Code
                        </Btn>
                      ) : (
                        <span className='text-[0.72rem> text-muted'>—</span>
                      )}
                    </Td>
                    <Td>
                      <div className='flex items-center gap-1.5'>
                        {status === 'connected' ? (
                          <Btn variant='smDanger' onClick={() => handleStopBot(bot.botId)}>
                            Stop
                          </Btn>
                        ) : status === 'connecting' ? (
                          <span className='text-[0.72rem] text-muted'>Starting…</span>
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

      {qrModalOpen && (
        <Modal
          onClose={() => { setQrModalOpen(false); setQrCode(''); }}
          maxWidth='max-w-[420px]'
        >
          <ModalHeader
            title='QR Code'
            sub={`Scan with WhatsApp → Linked Devices → Link a Device`}
            onClose={() => { setQrModalOpen(false); setQrCode(''); }}
          />
          {qrCode ? (
            <div className='flex flex-col items-center gap-4'>
              <div className='bg-white p-4 rounded-[12px] shadow-lg'>
                <Code className='bg-transparent p-0 text-[0.6rem] leading-normal font-mono'>{qrCode}</Code>
              </div>
              <p className='text-[0.78rem] text-muted text-center max-w-[300px]'>
                Scan this QR code with WhatsApp: <strong>Linked Devices → Link a Device</strong>
              </p>
              <Btn variant='ghost' onClick={() => navigator.clipboard.writeText(qrCode)}>
                Copy QR Code
              </Btn>
            </div>
          ) : (
            <div className='text-center text-muted py-8'>Loading QR code…</div>
          )}
        </Modal>
      )}

      {selectedBotId !== null && !qrModalOpen && (
        <Modal
          onClose={() => { setSelectedBotId(null); setPairPhone(''); setPairCode(''); setPairErr(''); }}
          maxWidth='max-w-[420px]'
        >
          <ModalHeader
            title='Pairing Code'
            sub={`Enter phone number to get a pairing code for ${selectedBotId}`}
            onClose={() => { setSelectedBotId(null); setPairPhone(''); setPairCode(''); setPairErr(''); }}
          />
          <div className='flex flex-col gap-3'>
            <Field label='Phone Number' hint='With country code (e.g. 2349137250390)'>
              <Input
                type='tel'
                placeholder='2349137250390'
                value={pairPhone}
                onChange={(e) => { setPairPhone(e.target.value); setPairErr(''); setPairCode(''); }}
                className='font-mono'
              />
            </Field>
            <Btn
              variant='primary'
              onClick={() => handleGetPairCode(selectedBotId)}
              disabled={pairLoading || !pairPhone.trim()}
            >
              {pairLoading ? <Spinner size='size-3.5' /> : 'Get Pairing Code'}
            </Btn>
            {pairErr && <p className='text-[0.75rem] text-danger'>{pairErr}</p>}
            {pairCode && (
              <div className='flex flex-col items-center gap-3'>
                <p className='text-[0.67rem] text-accent font-bold uppercase tracking-widest'>
                  Pairing Code
                </p>
                <Code className='bg-accent/10 text-accent text-[1.5rem] tracking-[0.2em] font-mono px-4 py-2 rounded-[10px]'>
                  {pairCode}
                </Code>
                <p className='text-[0.7rem] text-muted text-center'>
                  WhatsApp → Linked Devices → Link a Device → Link with phone number
                </p>
                <Btn variant='ghost' onClick={() => navigator.clipboard.writeText(pairCode)}>
                  Copy
                </Btn>
              </div>
            )}
          </div>
        </Modal>
      )}

      <Card className='mt-6'>
        <CardTitle>How it works</CardTitle>
        <p className='text-[0.78rem] text-soft leading-relaxed'>
          Each bot runs as an independent WhatsApp instance with its own session stored in
          MongoDB. Use <strong>Show QR</strong> to scan with WhatsApp camera, or
          <strong>Get Pair Code</strong> to link via phone number. The default
          bot starts automatically on server boot.
        </p>
      </Card>
    </div>
  );
}