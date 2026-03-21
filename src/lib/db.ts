import fs from 'fs';
import path from 'path';

// This is the fallback JSON database if Google Sheets GAS URL is not provided.
const DB_PATH = path.join(process.cwd(), 'database.json');

export interface User {
  id: string;
  memberNo: string;
  name: string;
  email: string;
  phone: string;
  isBanned: boolean;
  cancelCount: number;
  bookingCount: number;
  createdAt: string;
}

export interface Booking {
  id: string;
  userId: string;
  studioId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  peopleCount: number;
  totalPrice: number;
  status: string; // ACTIVE, CANCELLED_BY_USER, CANCELLED_BY_ADMIN
  cancelToken: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actionType: string;
  details: string;
  createdAt: string;
}

interface DB {
  users: User[];
  bookings: Booking[];
  auditLogs: AuditLog[];
}

function readDB(): DB {
  if (!fs.existsSync(DB_PATH)) {
    return { users: [], bookings: [], auditLogs: [] };
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data: DB) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ----------------------------------------------------
// Core Database Adapter Interface
// In the future, this can be hot-swapped to Google Sheets API
// ----------------------------------------------------

export const db = {
  // Users
  getUsers: async () => readDB().users,
  getUserByEmail: async (email: string) => readDB().users.find(u => u.email === email),
  getUserByMemberNo: async (memberNo: string) => readDB().users.find(u => u.memberNo === memberNo),
  createUser: async (user: Omit<User, 'id' | 'createdAt' | 'cancelCount' | 'bookingCount'> & { id?: string }) => {
    const data = readDB();
    const newUser: User = {
      ...user,
      id: user.id || `usr_${Date.now()}`,
      createdAt: new Date().toISOString(),
      cancelCount: 0,
      bookingCount: 0,
    };
    data.users.push(newUser);
    writeDB(data);
    return newUser;
  },
  updateUser: async (id: string, updates: Partial<User>) => {
    const data = readDB();
    const idx = data.users.findIndex(u => u.id === id);
    if (idx > -1) {
      data.users[idx] = { ...data.users[idx], ...updates };
      writeDB(data);
      return data.users[idx];
    }
  },

  // Bookings
  getBookings: async () => {
    const data = readDB();
    return data.bookings.map(b => ({
      ...b,
      user: data.users.find(u => u.id === b.userId) || null,
      studio: { id: b.studioId, name: b.studioId }
    }));
  },
  getBookingByToken: async (cancelToken: string) => readDB().bookings.find(b => b.cancelToken === cancelToken),
  createBooking: async (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status' | 'cancelToken'>) => {
    const data = readDB();
    const newBooking: Booking = {
      ...bookingData,
      id: `bk_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
      cancelToken: `tok_${Math.random().toString(36).substring(2, 15)}`,
    };
    
    // Increment booking count
    const userIdx = data.users.findIndex(u => u.id === bookingData.userId);
    if (userIdx > -1) data.users[userIdx].bookingCount += 1;

    data.bookings.push(newBooking);
    writeDB(data);
    return newBooking;
  },
  updateBooking: async (id: string, updates: Partial<Booking>) => {
    const data = readDB();
    const idx = data.bookings.findIndex(b => b.id === id);
    if (idx > -1) {
      data.bookings[idx] = { ...data.bookings[idx], ...updates };
      writeDB(data);
      return data.bookings[idx];
    }
  },

  // Audit Logs
  getAuditLogs: async () => readDB().auditLogs,
  createAuditLog: async (log: Omit<AuditLog, 'id' | 'createdAt'>) => {
    const data = readDB();
    data.auditLogs.unshift({
      ...log,
      id: `log_${Date.now()}`,
      createdAt: new Date().toISOString()
    });
    // Keep only last 100 logs
    if (data.auditLogs.length > 100) data.auditLogs.pop();
    writeDB(data);
  }
};
