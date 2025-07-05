const mediasoup = require('mediasoup');

let worker;
let router;
const transports = {};
const producers = {};
const consumers = {};
const peers = {};

async function startMediasoup() {
  worker = await mediasoup.createWorker({
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  });

  router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {},
      },
    ],
  });

  console.log('Mediasoup Router created ✅');
}

async function createWebRtcTransport() {
  const transport = await router.createWebRtcTransport({
    listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.ANNOUNCED_IP || 'YOUR_PUBLIC_IP' }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  });

  return {
    transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    },
  };
}

module.exports = {
  startMediasoup,
  router,
  transports,
  producers,
  consumers,
  peers,
  createWebRtcTransport,
};
