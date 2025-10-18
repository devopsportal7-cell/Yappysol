"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStorage = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.join(__dirname, '../../data');
// Ensure data directory exists
if (!fs_1.default.existsSync(DATA_DIR)) {
    fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
}
class FileStorage {
    constructor(filename) {
        this.data = new Map();
        this.filePath = path_1.default.join(DATA_DIR, `${filename}.json`);
        this.load();
    }
    load() {
        try {
            if (fs_1.default.existsSync(this.filePath)) {
                const fileContent = fs_1.default.readFileSync(this.filePath, 'utf8');
                const data = JSON.parse(fileContent);
                this.data = new Map(Object.entries(data));
            }
        }
        catch (error) {
            console.error(`Error loading data from ${this.filePath}:`, error);
            this.data = new Map();
        }
    }
    save() {
        try {
            const data = Object.fromEntries(this.data);
            fs_1.default.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
        }
        catch (error) {
            console.error(`Error saving data to ${this.filePath}:`, error);
        }
    }
    set(key, value) {
        this.data.set(key, value);
        this.save();
    }
    get(key) {
        return this.data.get(key);
    }
    has(key) {
        return this.data.has(key);
    }
    delete(key) {
        const result = this.data.delete(key);
        if (result) {
            this.save();
        }
        return result;
    }
    values() {
        return this.data.values();
    }
    entries() {
        return this.data.entries();
    }
    clear() {
        this.data.clear();
        this.save();
    }
    size() {
        return this.data.size;
    }
}
exports.FileStorage = FileStorage;
