#!/usr/bin/env node
/**
 * Simple Email Tool für Rocky
 * SMTP: Senden | IMAP: Lesen
 * Nutzt auth-profiles.json für Credentials
 */

const nodemailer = require('nodemailer');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const fs = require('fs');
const path = require('path');

const AUTH_PATH = '/data/.openclaw/agents/main/agent/auth-profiles.json';

// Auth laden
function getAuth() {
  try {
    const auth = JSON.parse(fs.readFileSync(AUTH_PATH, 'utf8'));
    return auth.profiles?.['gmail:rockybot'];
  } catch (e) {
    console.error('Auth nicht gefunden:', e.message);
    return null;
  }
}

// SMTP Transporter erstellen
function createTransporter(creds) {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: creds.user,
      pass: creds.pass
    }
  });
}

// Email senden
async function send(to, subject, text) {
  const creds = getAuth();
  if (!creds) throw new Error('Gmail Auth nicht gefunden in auth-profiles.json');
  
  const transporter = createTransporter(creds);
  const info = await transporter.sendMail({
    from: creds.user,
    to,
    subject,
    text
  });
  
  console.log('✓ Gesendet:', info.messageId);
  return info;
}

// IMAP Verbindung
function createImap(creds) {
  return new Imap({
    user: creds.user,
    password: creds.pass,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  });
}

// Ungelesene Emails abrufen
async function checkUnread(limit = 5) {
  const creds = getAuth();
  if (!creds) throw new Error('Gmail Auth nicht gefunden');
  
  return new Promise((resolve, reject) => {
    const imap = createImap(creds);
    const emails = [];
    
    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) return reject(err);
        
        // Suche nach ungelesenen
        imap.search(['UNSEEN'], (err, results) => {
          if (err) return reject(err);
          if (!results || results.length === 0) {
            imap.end();
            return resolve([]);
          }
          
          const fetch = imap.fetch(results.slice(0, limit), { bodies: '' });
          
          fetch.on('message', (msg, seqno) => {
            let buffer = '';
            msg.on('body', (stream) => {
              stream.on('data', chunk => buffer += chunk.toString('utf8'));
            });
            msg.once('end', async () => {
              const parsed = await simpleParser(buffer);
              emails.push({
                subject: parsed.subject,
                from: parsed.from?.text,
                date: parsed.date,
                text: parsed.text?.substring(0, 200) + '...'
              });
            });
          });
          
          fetch.once('end', () => {
            imap.end();
          });
        });
      });
    });
    
    imap.once('end', () => resolve(emails));
    imap.once('error', reject);
    imap.connect();
  });
}

// CLI Interface
const [,, cmd, ...args] = process.argv;

(async () => {
  try {
    if (cmd === 'send') {
      const [to, subject, ...textParts] = args;
      const text = textParts.join(' ');
      if (!to || !subject) {
        console.log('Usage: node email.js send <to> <subject> <text>');
        process.exit(1);
      }
      await send(to, subject, text);
    } else if (cmd === 'check') {
      const emails = await checkUnread(args[0] || 5);
      console.log('Ungelesene Emails:', emails.length);
      emails.forEach((e, i) => {
        console.log(`\n${i + 1}. ${e.subject}`);
        console.log(`   Von: ${e.from}`);
        console.log(`   ${e.text}`);
      });
    } else {
      console.log(`
Rocky Email Tool

Usage:
  node email.js send <to> <subject> <text>  - Email senden
  node email.js check [limit]               - Ungelesene checken (default: 5)
      `);
    }
  } catch (err) {
    console.error('✗ Fehler:', err.message);
    process.exit(1);
  }
})();
