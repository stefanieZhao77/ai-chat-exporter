export class BaseAdapter {
  constructor() {
    this.platform = 'unknown';
  }

  isSupported() {
    return false;
  }

  extractMessageEntries() {
    throw new Error('extractMessageEntries must be implemented by adapter');
  }

  extractChatData() {
    throw new Error('extractChatData must be implemented by adapter');
  }
}
