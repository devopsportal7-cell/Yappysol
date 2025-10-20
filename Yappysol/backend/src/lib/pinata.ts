import PinataClientImport from '@pinata/sdk';
import { Readable } from 'stream';

const PinataClient = (PinataClientImport as any).default || PinataClientImport;

console.log('PINATA_API_KEY:', process.env.PINATA_API_KEY ? 'set' : 'NOT SET');
console.log('PINATA_API_SECRET:', process.env.PINATA_API_SECRET ? 'set' : 'NOT SET');

export const pinata = new PinataClient(
  process.env.PINATA_API_KEY!,
  process.env.PINATA_API_SECRET!
);

export const uploadImageToIPFS = async (file: Express.Multer.File) => {
  const readableStream = Readable.from(file.buffer);
  // @ts-ignore
  readableStream.path = file.originalname;
  const { IpfsHash } = await pinata.pinFileToIPFS(readableStream, {
    pinataMetadata: { name: `token-logo-${Date.now()}` }
  });
  return `https://gateway.pinata.cloud/ipfs/${IpfsHash}`;
};

export const uploadMetadataToIPFS = async (metadata: any) => {
  const { IpfsHash } = await pinata.pinJSONToIPFS(metadata, {
    pinataMetadata: { name: `token-metadata-${Date.now()}` }
  });
  return `https://gateway.pinata.cloud/ipfs/${IpfsHash}`;
}; 