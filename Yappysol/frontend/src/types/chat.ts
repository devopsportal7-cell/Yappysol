export interface ChatContext {
  walletAddress?: string;
  [key: string]: any;
}

export interface ChatResponse {
  response: string;
  step?: string;
  unsignedTransaction?: string;
  requireSignature?: boolean;
  swapDetails?: any;
}

export interface SwapSession {
  step: string | null;
  fromToken?: string;
  toToken?: string;
  amount?: number;
  validationErrorCount?: number;
  awaitingConfirmation?: boolean;
  [key: string]: any;
}

export type AdvisorResearchPayload = {
  mode: 'research';
  card: any;
};

export type AdvisorComparePayload = {
  mode: 'compare';
  ranked: any[];
  buys: any[];
  sells: any[];
};

export type SolanaExpertPayload = {
  action: 'solana-expert';
  answer: string;
  citations?: { title: string; url: string }[];
  details?: any;
  code?: string;
}; 