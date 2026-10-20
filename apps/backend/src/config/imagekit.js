import ImageKit from '@imagekit/nodejs';

// Hardcoded ImageKit configuration to bypass env variable issues
const imagekit = new ImageKit({
  publicKey: 'public_yA8SidcLwvvuQ9QCRnj81kFrLMg=',
  privateKey: 'private_CRNtVo2/Fa7atiHdeMnsMAEwlxo=',
  urlEndpoint: 'https://ik.imagekit.io/ohgmcj4v2'
});

export default imagekit;
