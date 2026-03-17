import { useState, useEffect, useRef } from "react";
import { Command } from "@tauri-apps/plugin-shell";
import { downloadDir } from "@tauri-apps/api/path";
import { BaseDirectory, readTextFile, remove } from "@tauri-apps/plugin-fs";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { invoke } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import "./App.css";
import { path } from "@tauri-apps/api";

type Format = {
  format_id: string;
  ext: string;
  resolution: string;
  fps: number | null;
  tbr: number | null;
  filesize: number | null;
  filesize_approx: number | null;
  vcodec: string;
  acodec: string;
  format_note: string;
  language: string | null;
  asr: number | null;
  audio_channels: number | null;
  dynamic_range: string | null;
  protocol: string | null;
};

function fmtSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

function fmtCodec(codec: string): string {
  if (!codec || codec === "none") return "—";
  return codec.split(".")[0];
}

const QT_INCOMPAT_VIDEO = new Set(["av01", "vp09", "vp9", "vp08", "vp8"]);
const QT_INCOMPAT_AUDIO = new Set(["opus", "vorbis"]);
const QT_INCOMPAT_EXT   = new Set(["webm", "mkv", "flv"]);

function qtIncompat(value: string, set: Set<string>): boolean {
  return set.has(value?.split(".")[0]);
}

function App() {
  const [version, setVersion] = useState("...");
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);
  const [updating, setUpdating] = useState(false);
  const [url, setUrl] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formats, setFormats] = useState<Format[]>([]);
  const [fetchingFormats, setFetchingFormats] = useState(false);
  const [cmd, setCmd] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [failed, setFailed] = useState(false);
  const logsRef = useRef<HTMLPreElement>(null);
  const fetchedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const el = logsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  useEffect(() => {
    Command.create("yt-dlp", ["--version"])
      .execute()
      .then((result) => setVersion(result.stdout.trim()))
      .catch(() => setVersion("not found"));
  }, []);

  useEffect(() => {
    if (!showModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowModal(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal]);

  useEffect(() => {
    check().then((update) => {
      if (update?.available) setPendingUpdate(update);
    }).catch(() => {});
  }, []);

  async function installUpdate() {
    if (!pendingUpdate) return;
    setUpdating(true);
    try {
      await pendingUpdate.downloadAndInstall();
      await relaunch();
    } catch (err) {
      appendLog(String(err));
      setUpdating(false);
    }
  }

  async function openModal() {
    const trimmed = url.trim();

    if (trimmed === fetchedUrlRef.current && formats.length > 0) {
      setShowModal(true);
      return;
    }

    const tmp = `${await path.appCacheDir()}/download-bunny-formats.json`;
    const fetchArgs = [
      "--no-playlist",
      "--skip-download",
      "--print-to-file",
      "%(formats)j",
      tmp,
      trimmed,
    ];
    setFormats([]);
    setFetchingFormats(true);
    setFailed(false);
    setLogs([]);
    setCmd(`yt-dlp ${fetchArgs.join(" ")}`);

    try {
      const command = Command.create("yt-dlp", fetchArgs);

      command.stdout.on("data", (line) => appendLog(line.trim()));
      command.stderr.on("data", (line) => appendLog(line.trim()));

      await new Promise<void>((resolve, reject) => {
        command.on("close", ({ code }) => {
          if (code === 0) resolve();
          else reject(new Error(`yt-dlp exited with code ${code}`));
        });
        command.on("error", (err) => reject(new Error(String(err))));
        command.spawn().catch(reject);
      });

      const json = await readTextFile("download-bunny-formats.json", {
        baseDir: BaseDirectory.AppCache,
      });
      await remove("download-bunny-formats.json", {
        baseDir: BaseDirectory.AppCache,
      });
      const formats = JSON.parse(json);
      setFormats(Array.isArray(formats) ? formats.reverse() : []);
      fetchedUrlRef.current = trimmed;
      setShowModal(true);
    } catch (err) {
      setFailed(true);
      appendLog(String(err));
    } finally {
      setFetchingFormats(false);
    }
  }

  function appendLog(line: string) {
    if (line) setLogs((prev) => [...prev, line]);
  }

  async function download(fmt: Format) {
    setShowModal(false);
    setDownloading(true);
    setFailed(false);
    setLogs([]);

    const fArg = fmt.acodec === "none" ? `${fmt.format_id}+bestaudio` : fmt.format_id;

    try {
      const dir = await downloadDir();
      const args = [
        "--no-playlist",
        "--newline",
        "-f",
        fArg,
        "--merge-output-format", fmt.ext,
        url.trim(),
        "-o",
        `${dir}/%(title)s [%(format_id)s].%(ext)s`,
      ];
      setCmd(`yt-dlp ${args.join(" ")}`);
      const command = Command.create("yt-dlp", args);

      let savedFile = "";
      function parsePath(line: string) {
        const dest = line.match(/^\[download\] Destination: (.+)/);
        if (dest) { savedFile = dest[1].trim(); return; }
        const merge = line.match(/^\[Merger\] Merging formats into "(.+)"/);
        if (merge) { savedFile = merge[1].trim(); return; }
        const already = line.match(/^\[download\] (.+) has already been downloaded/);
        if (already) { savedFile = already[1].trim(); }
      }

      command.stdout.on("data", (line) => { appendLog(line.trim()); parsePath(line); });
      command.stderr.on("data", (line) => { appendLog(line.trim()); parsePath(line); });

      await new Promise<void>((resolve, reject) => {
        command.on("close", ({ code }) => {
          if (code === 0) resolve();
          else reject(new Error(`yt-dlp exited with code ${code}`));
        });
        command.on("error", (err) => reject(new Error(String(err))));
        command.spawn().catch(reject);
      });

      appendLog("Download complete!");
      if (savedFile) {
        await invoke("set_file_comment", {
          path: savedFile,
          comment: `Downloaded with Download Bunny from ${url.trim()}`,
        });
        await revealItemInDir(savedFile);
      }
    } catch (err) {
      setFailed(true);
      appendLog(String(err));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="container">
      <h1>Download Bunny</h1>
      <p className="version">
        yt-dlp <span className="version-number">{version}</span>
        {(() => {
          const parts = version.split(".");
          if (parts.length !== 3 || parts.some((p) => isNaN(Number(p))))
            return null;
          const [y, m, d] = parts.map(Number);
          const days = Math.floor(
            (Date.now() - new Date(y, m - 1, d).getTime()) / 86_400_000,
          );
          if (days < 0) return null;
          const cls =
            days <= 30
              ? "badge green"
              : days <= 90
                ? "badge orange"
                : "badge red";
          return <span className={cls}>released {days} days ago</span>;
        })()}
      </p>
      {pendingUpdate && (
        <p className="update-banner">
          <button className="update-btn" onClick={installUpdate} disabled={updating}>
            {updating ? "Updating…" : `Update available (${pendingUpdate.version}) — click to install`}
          </button>
        </p>
      )}

      <form
        className="url-row"
        onSubmit={(e) => {
          e.preventDefault();
          openModal();
        }}
      >
        <input
          id="url-input"
          value={url}
          onChange={(e) => setUrl(e.currentTarget.value)}
          placeholder="Enter URL..."
          disabled={downloading || fetchingFormats}
        />
        <button
          type="submit"
          disabled={downloading || fetchingFormats || !url.trim()}
        >
          {downloading
            ? "Downloading..."
            : fetchingFormats
              ? "Fetching..."
              : "Download"}
        </button>
      </form>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>Select format</span>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            {formats.length === 0 ? (
              <p className="fetching">No formats found.</p>
            ) : (
              <div className="format-table-wrap">
                <table className="format-table">
                  <thead>
                    <tr>
                      {["ID","Ext","Resolution","FPS","Size","Bitrate","Video","Audio","Lang","ASR","Ch","HDR","Proto","Note"].map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {formats.map((f) => (
                      <tr key={f.format_id} onClick={() => download(f)}>
                        <td>{f.format_id}</td>
                        <td>
                          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5em" }}>
                            {f.ext}
                            {qtIncompat(f.ext, QT_INCOMPAT_EXT) && <span className="badge orange" title="Not supported by QuickTime Player">⚠</span>}
                          </span>
                        </td>
                        <td>{f.resolution}</td>
                        <td>{f.fps != null ? (Number.isInteger(f.fps) ? f.fps : f.fps.toFixed(2)) : "—"}</td>
                        <td>{fmtSize(f.filesize ?? f.filesize_approx)}</td>
                        <td>{f.tbr != null ? `${Math.round(f.tbr)}k` : "—"}</td>
                        <td>
                          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5em" }}>
                            {fmtCodec(f.vcodec)}
                            {qtIncompat(f.vcodec, QT_INCOMPAT_VIDEO) && <span className="badge orange" title="Not supported by QuickTime Player">⚠</span>}
                          </span>
                        </td>
                        <td>
                          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5em" }}>
                            {fmtCodec(f.acodec)}
                            {qtIncompat(f.acodec, QT_INCOMPAT_AUDIO) && <span className="badge orange" title="Not supported by QuickTime Player">⚠</span>}
                          </span>
                        </td>
                        <td>{f.language ?? "—"}</td>
                        <td>{f.asr != null ? `${(f.asr / 1000).toFixed(1)}k` : "—"}</td>
                        <td>{f.audio_channels ?? "—"}</td>
                        <td>{f.dynamic_range ?? "—"}</td>
                        <td>{f.protocol ?? "—"}</td>
                        <td>{f.format_note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="log-panel">
        <pre className="cmd">{cmd ?? ""}</pre>
        <pre ref={logsRef} className={failed ? "logs error" : "logs"}>
          {logs.join("\n")}
        </pre>
      </div>
    </main>
  );
}

export default App;
