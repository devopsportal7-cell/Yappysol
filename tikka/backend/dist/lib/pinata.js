"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMetadataToIPFS = exports.uploadImageToIPFS = exports.pinata = void 0;
const sdk_1 = __importDefault(require("@pinata/sdk"));
const stream_1 = require("stream");
const PinataClient = sdk_1.default.default || sdk_1.default;
console.log('PINATA_API_KEY:', process.env.PINATA_API_KEY ? 'set' : 'NOT SET');
console.log('PINATA_API_SECRET:', process.env.PINATA_API_SECRET ? 'set' : 'NOT SET');
exports.pinata = new PinataClient(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);
const uploadImageToIPFS = async (file) => {
    const readableStream = stream_1.Readable.from(file.buffer);
    // @ts-ignore
    readableStream.path = file.originalname;
    const { IpfsHash } = await exports.pinata.pinFileToIPFS(readableStream, {
        pinataMetadata: { name: `token-logo-${Date.now()}` }
    });
    return `https://gateway.pinata.cloud/ipfs/${IpfsHash}`;
};
exports.uploadImageToIPFS = uploadImageToIPFS;
const uploadMetadataToIPFS = async (metadata) => {
    const { IpfsHash } = await exports.pinata.pinJSONToIPFS(metadata, {
        pinataMetadata: { name: `token-metadata-${Date.now()}` }
    });
    return `https://gateway.pinata.cloud/ipfs/${IpfsHash}`;
};
exports.uploadMetadataToIPFS = uploadMetadataToIPFS;
