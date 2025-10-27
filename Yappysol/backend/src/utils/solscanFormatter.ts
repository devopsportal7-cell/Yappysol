/**
 * Smart Solscan link formatter
 * Provides enhanced formatting and preview capabilities for Solscan links
 */

export interface SolscanLinkInfo {
  url: string;
  displayText: string;
  type: 'token' | 'transaction' | 'wallet';
  label: string;
  icon?: string;
}

/**
 * Format Solscan link with smart truncation and display
 */
export function formatSolscanLink(
  identifier: string,
  type: 'token' | 'transaction' | 'wallet' = 'token',
  options?: {
    truncated?: boolean;
    icon?: boolean;
    label?: string;
  }
): SolscanLinkInfo {
  const baseUrl = 'https://solscan.io';
  
  let url: string;
  let displayText: string;
  let label: string;
  let icon: string;
  
  switch (type) {
    case 'token':
      url = `${baseUrl}/token/${identifier}`;
      displayText = options?.truncated ? truncateAddress(identifier) : identifier;
      label = options?.label || 'View Token';
      icon = '🪙';
      break;
      
    case 'transaction':
      url = `${baseUrl}/tx/${identifier}`;
      displayText = options?.truncated ? truncateSignature(identifier) : identifier;
      label = options?.label || 'View Transaction';
      icon = '📋';
      break;
      
    case 'wallet':
      url = `${baseUrl}/account/${identifier}`;
      displayText = options?.truncated ? truncateAddress(identifier) : identifier;
      label = options?.label || 'View Wallet';
      icon = '👛';
      break;
      
    default:
      url = baseUrl;
      displayText = identifier;
      label = 'View on Solscan';
      icon = '🔗';
  }
  
  return {
    url,
    displayText,
    type,
    label,
    icon: options?.icon !== false ? icon : undefined
  };
}

/**
 * Truncate address for display
 */
function truncateAddress(address: string, startLength: number = 4, endLength: number = 4): string {
  if (address.length <= startLength + endLength) {
    return address;
  }
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Truncate transaction signature for display
 */
function truncateSignature(signature: string, length: number = 8): string {
  if (signature.length <= length * 2) {
    return signature;
  }
  return `${signature.slice(0, length)}...`;
}

/**
 * Generate rich markdown link with icon
 */
export function generateMarkdownLink(info: SolscanLinkInfo): string {
  if (info.icon) {
    return `${info.icon} [${info.displayText}](${info.url})`;
  }
  return `[${info.displayText}](${info.url})`;
}

/**
 * Generate rich HTML-style card with metadata
 */
export function generateRichLink(
  info: SolscanLinkInfo,
  metadata?: {
    symbol?: string;
    name?: string;
    amount?: string;
    timestamp?: string;
  }
): string {
  let output = generateMarkdownLink(info);
  
  if (metadata) {
    output += `\n**Type:** ${info.type}`;
    if (metadata.symbol) output += ` | **Symbol:** ${metadata.symbol}`;
    if (metadata.name) output += ` | **Name:** ${metadata.name}`;
    if (metadata.amount) output += ` | **Amount:** ${metadata.amount}`;
  }
  
  return output;
}

/**
 * Smart link detection - automatically detect if it's token, tx, or wallet
 */
export function smartSolscanLink(identifier: string): SolscanLinkInfo {
  // Transaction signatures are base58 encoded and typically 88 chars
  if (identifier.length > 80) {
    return formatSolscanLink(identifier, 'transaction');
  }
  
  // Wallet addresses are base58 encoded and typically 44 chars
  if (identifier.length > 35 && identifier.length < 50) {
    return formatSolscanLink(identifier, 'wallet');
  }
  
  // Default to token
  return formatSolscanLink(identifier, 'token');
}

