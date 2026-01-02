"use client";

import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";

// ====== CONFIG - ADJUST FOR YOUR BROKER ======
const MQTT_HOST = "13.229.98.58";
// For browser you usually need a WebSocket URL, not raw 1883 TCP.
// Example (change to match your broker config):

const MQTT_URL = `ws://${MQTT_HOST}:9001`;

const MQTT_USERNAME = "ubuntu";
const MQTT_PASSWORD = "130802";

// Topics (match your Python simulator)
const SCALE_TOPIC = "CKRG123"; // scale data published here
const COMMAND_TOPIC = "CKRG123/commands"; // commands sent here
// ============================================

export default function App() {
  const clientRef = useRef(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastWeight, setLastWeight] = useState(null);
  const [lastTimestamp, setLastTimestamp] = useState(null);
  const [log, setLog] = useState([]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
      }
    };
  }, []);

  const appendLog = (msg) => {
    setLog((prev) => [
      { ts: new Date().toLocaleTimeString(), msg },
      ...prev.slice(0, 49),
    ]);
  };

  const handleConnect = () => {
    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    appendLog("Connecting to MQTT broker...");

    const client = mqtt.connect(MQTT_URL, {
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      reconnectPeriod: 2000,
    });

    client.on("connect", () => {
      setIsConnecting(false);
      setIsConnected(true);
      appendLog("Connected to MQTT broker.");

      client.subscribe(SCALE_TOPIC, (err) => {
        if (err) {
          appendLog(`Subscribe error: ${err.message}`);
        } else {
          appendLog(`Subscribed to topic: ${SCALE_TOPIC}`);
        }
      });
    });

    client.on("message", (topic, message) => {
      if (topic === SCALE_TOPIC) {
        const sizeBytes =
          message && typeof message.length === "number"
            ? message.length
            : new TextEncoder().encode(String(message)).length;
        appendLog(`Packet size: ${sizeBytes} bytes`);

        try {
          const payload = JSON.parse(message.toString());
          if (typeof payload.weight !== "undefined") {
            setLastWeight(payload.weight);
            setLastTimestamp(payload.ts || new Date().toISOString());
            appendLog(`Received weight: ${payload.weight}`);
          } else {
            appendLog(`Received non-weight payload: ${message.toString()}`);
          }
        } catch (e) {
          appendLog(`Invalid JSON from scale: ${message.toString()}`);
        }
      }
    });

    client.on("error", (err) => {
      appendLog(`MQTT error: ${err.message}`);
    });

    client.on("close", () => {
      setIsConnected(false);
      setIsConnecting(false);
      appendLog("Disconnected from MQTT broker.");
    });

    clientRef.current = client;
  };

  const handleDisconnect = () => {
    if (!clientRef.current) return;
    clientRef.current.end(true);
    clientRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    appendLog("Manual disconnect.");
  };

  const publishCommand = (command) => {
    if (!clientRef.current || !isConnected) {
      appendLog("Cannot send command: not connected.");
      return;
    }
    clientRef.current.publish(COMMAND_TOPIC, command, { qos: 0 }, (err) => {
      if (err) {
        appendLog(`Failed to publish command "${command}": ${err.message}`);
      } else {
        appendLog(`Published command "${command}" to ${COMMAND_TOPIC}`);
      }
    });
  };

  const handleStart = () => {
    // Your simulator listens for "START" to resume streaming
    publishCommand("SI");
  };

  const handleZero = () => {
    // Your simulator treats "Z" as tare/zero command
    publishCommand("Z");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #0f172a 0, #020617 45%, #000 100%)",
        color: "#e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "960px",
          background:
            "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(15,23,42,0.85))",
          borderRadius: "24px",
          padding: "24px",
          boxShadow:
            "0 25px 50px -12px rgba(15,23,42,0.9), 0 0 0 1px rgba(148,163,184,0.25)",
          border: "1px solid rgba(148,163,184,0.35)",
          backdropFilter: "blur(22px)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                marginBottom: "4px",
              }}
            >
              Scale Control & Monitor
            </h1>
            <p style={{ fontSize: "14px", color: "#9ca3af" }}>
              MQTT POC for reading scale data and sending commands.
            </p>
          </div>
          <div
            style={{
              textAlign: "right",
              minWidth: "180px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#9ca3af",
                marginBottom: "4px",
              }}
            >
              Connection
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 10px",
                borderRadius: "999px",
                backgroundColor: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(148,163,184,0.4)",
                fontSize: "13px",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "999px",
                  backgroundColor: isConnected
                    ? "#22c55e"
                    : isConnecting
                    ? "#f97316"
                    : "#ef4444",
                  boxShadow: isConnected
                    ? "0 0 12px rgba(34,197,94,0.8)"
                    : "none",
                }}
              />
              <span>
                {isConnected
                  ? "Connected"
                  : isConnecting
                  ? "Connecting..."
                  : "Disconnected"}
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: 4 }}>
              {MQTT_HOST} (port 1883 / WS bridge)
            </div>
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)",
            gap: "20px",
          }}
        >
          {/* Left column: scale & controls */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* Scale display */}
            <div
              style={{
                padding: "18px 18px 20px",
                borderRadius: "18px",
                background:
                  "radial-gradient(circle at top left, rgba(59,130,246,0.2), transparent 60%), #020617",
                border: "1px solid rgba(148,163,184,0.4)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: "#9ca3af",
                  marginBottom: "10px",
                }}
              >
                Current Weight
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "40px",
                    fontWeight: 700,
                    letterSpacing: "-0.06em",
                    color: lastWeight != null ? "#e5e7eb" : "#4b5563",
                  }}
                >
                  {lastWeight != null ? lastWeight.toFixed(3) : "--.--"}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    textTransform: "uppercase",
                    letterSpacing: "0.16em",
                    color: "#9ca3af",
                    marginBottom: "6px",
                  }}
                >
                  kg
                </div>
              </div>
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "12px",
                  color: "#9ca3af",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <span>
                  Last update:{" "}
                  {lastTimestamp
                    ? new Date(lastTimestamp).toLocaleTimeString()
                    : "-"}
                </span>
                <span style={{ color: "#6b7280" }}>
                  Topic: <span style={{ color: "#9ca3af" }}>{SCALE_TOPIC}</span>
                </span>
              </div>
            </div>

            {/* Controls */}
            <div
              style={{
                padding: "16px",
                borderRadius: "18px",
                background: "#020617",
                border: "1px solid rgba(148,163,184,0.3)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.16em",
                    color: "#9ca3af",
                  }}
                >
                  Actions
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {!isConnected ? (
                    <button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "999px",
                        border: "none",
                        fontSize: "13px",
                        fontWeight: 600,
                        background:
                          "linear-gradient(135deg, #22c55e, #16a34a, #22c55e)",
                        color: "#020617",
                        cursor: isConnecting ? "not-allowed" : "pointer",
                        opacity: isConnecting ? 0.7 : 1,
                        boxShadow:
                          "0 10px 25px -8px rgba(34,197,94,0.8), 0 0 0 1px rgba(21,128,61,0.8)",
                      }}
                    >
                      {isConnecting ? "Connecting..." : "Connect"}
                    </button>
                  ) : (
                    <button
                      onClick={handleDisconnect}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "999px",
                        border: "1px solid rgba(248,113,113,0.9)",
                        fontSize: "13px",
                        fontWeight: 500,
                        background: "rgba(30,64,175,0.1)",
                        color: "#fecaca",
                        cursor: "pointer",
                      }}
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "4px",
                }}
              >
                <button
                  onClick={handleStart}
                  disabled={!isConnected}
                  style={{
                    flex: 1,
                    minWidth: "120px",
                    padding: "10px 16px",
                    borderRadius: "12px",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: 600,
                    background: isConnected
                      ? "linear-gradient(135deg, #38bdf8, #0ea5e9)"
                      : "linear-gradient(135deg, #1e293b, #0f172a)",
                    color: "#0f172a",
                    cursor: isConnected ? "pointer" : "not-allowed",
                    opacity: isConnected ? 1 : 0.5,
                  }}
                >
                  Start Streaming
                </button>
                <button
                  onClick={handleZero}
                  disabled={!isConnected}
                  style={{
                    flex: 1,
                    minWidth: "120px",
                    padding: "10px 16px",
                    borderRadius: "12px",
                    border: "1px solid rgba(248,250,252,0.1)",
                    fontSize: "14px",
                    fontWeight: 600,
                    background: isConnected
                      ? "linear-gradient(135deg, #f97316, #fb923c)"
                      : "linear-gradient(135deg, #1e293b, #0f172a)",
                    color: "#020617",
                    cursor: isConnected ? "pointer" : "not-allowed",
                    opacity: isConnected ? 1 : 0.5,
                  }}
                >
                  Zero (Tare)
                </button>
              </div>

              <div
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  marginTop: "4px",
                }}
              >
                - Press <span style={{ color: "#e5e7eb" }}>Connect</span> to
                connect to MQTT. - Press{" "}
                <span style={{ color: "#e5e7eb" }}>Start Streaming</span> to
                send START command. - Press{" "}
                <span style={{ color: "#e5e7eb" }}>Zero (Tare)</span> to send Z
                command.
              </div>
            </div>
          </div>

          {/* Right column: log */}
          <div
            style={{
              padding: "16px",
              borderRadius: "18px",
              background: "#020617",
              border: "1px solid rgba(148,163,184,0.3)",
              display: "flex",
              flexDirection: "column",
              minHeight: "220px",
              maxHeight: "360px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "#9ca3af",
                marginBottom: "10px",
              }}
            >
              Event Log
            </div>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                borderRadius: "12px",
                background:
                  "radial-gradient(circle at top, rgba(15,23,42,0.8), #020617)",
                border: "1px solid rgba(30,64,175,0.6)",
                padding: "8px 10px",
                fontSize: "12px",
              }}
            >
              {log.length === 0 ? (
                <div style={{ color: "#6b7280" }}>
                  No events yet. Connect and start streaming to see messages
                  here.
                </div>
              ) : (
                log.map((entry, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ color: "#64748b", minWidth: "64px" }}>
                      {entry.ts}
                    </span>
                    <span style={{ color: "#e5e7eb" }}>{entry.msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
