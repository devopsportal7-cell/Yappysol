import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class FileStorage<T> {
  private filePath: string;
  private data: Map<string, T> = new Map();

  constructor(filename: string) {
    this.filePath = path.join(DATA_DIR, `${filename}.json`);
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        const data = JSON.parse(fileContent);
        this.data = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error(`Error loading data from ${this.filePath}:`, error);
      this.data = new Map();
    }
  }

  private save(): void {
    try {
      const data = Object.fromEntries(this.data);
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error saving data to ${this.filePath}:`, error);
    }
  }

  set(key: string, value: T): void {
    this.data.set(key, value);
    this.save();
  }

  get(key: string): T | undefined {
    return this.data.get(key);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  delete(key: string): boolean {
    const result = this.data.delete(key);
    if (result) {
      this.save();
    }
    return result;
  }

  values(): IterableIterator<T> {
    return this.data.values();
  }

  entries(): IterableIterator<[string, T]> {
    return this.data.entries();
  }

  clear(): void {
    this.data.clear();
    this.save();
  }

  size(): number {
    return this.data.size;
  }
}
