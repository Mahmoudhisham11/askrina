/**
 * Before `next dev`: free default Next ports from stray Node processes and remove
 * a stale `.next/dev/lock` so "Unable to acquire lock" does not block a fresh start.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(root, ".next", "dev", "lock");
const PORTS = [3000, 3001, 3002];

function unlinkLock() {
  try {
    fs.unlinkSync(lockPath);
  } catch {
    // no lock or race — ignore
  }
}

function listenerPidsWin(port) {
  try {
    const out = execSync(`netstat -ano | findstr ":${port} "`, {
      encoding: "utf8",
      windowsHide: true,
    });
    const pids = new Set();
    for (const line of out.trim().split("\n")) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) continue;
      const local = parts[1];
      const state = parts[parts.length - 2];
      const pid = parts[parts.length - 1];
      if (state !== "LISTENING") continue;
      if (!local.endsWith(`:${port}`)) continue;
      if (/^\d+$/.test(pid)) pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

function isNodeProcessWin(pid) {
  try {
    const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
      encoding: "utf8",
      windowsHide: true,
    });
    return out.toLowerCase().includes("node.exe");
  } catch {
    return false;
  }
}

function killPidWin(pid) {
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore", windowsHide: true });
  } catch {
    // already gone or access denied
  }
}

function freePortsWin() {
  const seen = new Set();
  for (const port of PORTS) {
    for (const pid of listenerPidsWin(port)) {
      if (seen.has(pid)) continue;
      if (!isNodeProcessWin(pid)) continue;
      seen.add(pid);
      killPidWin(pid);
    }
  }
}

function listenerPidsUnix(port) {
  try {
    const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, {
      encoding: "utf8",
    });
    return out
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isNodePidUnix(pid) {
  try {
    const out = execSync(`ps -p ${Number(pid)} -o comm=`, { encoding: "utf8" });
    return /node/i.test(out);
  } catch {
    return false;
  }
}

function freePortsUnix() {
  const seen = new Set();
  for (const port of PORTS) {
    for (const pid of listenerPidsUnix(port)) {
      if (seen.has(pid)) continue;
      if (!isNodePidUnix(pid)) continue;
      seen.add(pid);
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {
        // ignore
      }
    }
  }
}

unlinkLock();

if (process.platform === "win32") {
  freePortsWin();
} else {
  freePortsUnix();
}

// Brief pause so the OS releases the port and lock before Next starts
await new Promise((r) => setTimeout(r, 300));
