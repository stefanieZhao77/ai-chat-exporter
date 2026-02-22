export class BaseAdapter {
  constructor() {
    this.platform = 'unknown';
  }

  isSupported() {
    return false;
  }

  extractChatData() {
    throw new Error('extractChatData must be implemented by adapter');
  }
}
