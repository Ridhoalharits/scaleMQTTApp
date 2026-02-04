"use client";

// This is now purely a UI component (Presenter)
// It receives all data and callbacks via props
export default function MqttScale({
  isConnected,
  isConnecting,
  isStale,
  topic,
  lastWeight,
  lastTimestamp,
  unit,
  serialNumber,
  log,
  mqttHost, // Display only
  onConnect,
  onDisconnect,
  onStart,
  onStop,
  onZero,
  onTare,
  onGetSerial,
  onTopicChange,
  onPrint,
  manufacturer,
  onManufacturerChange,
  scaleType,
  onScaleTypeChange,
}) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "960px",
        background: "#ffffff",
        borderRadius: "24px",
        padding: "24px",
        boxShadow:
          "0 25px 50px -12px rgba(22, 163, 74, 0.15), 0 0 0 1px rgba(22, 163, 74, 0.1)",
        border: "1px solid rgba(22, 163, 74, 0.1)",
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
              color: "#166534", // Dark green
            }}
          >
            Scale Control & Monitor
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            MQTT POC for reading scale data and sending commands.
          </p>
        </div>
        <div
          style={{
            textAlign: "right",
            minWidth: "180px",
          }}
        >
           {/* Scale Type Selector */}
           {/* Scale Configuration */}
           <div style={{ display: "flex", gap: "12px", marginBottom: "16px", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "10px", textTransform: "uppercase", color: "#6b7280", fontWeight: 600, letterSpacing: "0.05em" }}>Manufacturer</label>
              <select
                value={manufacturer}
                onChange={(e) => onManufacturerChange(e.target.value)}
                style={{
                  fontSize: "13px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#ffffff",
                  color: "#374151",
                  outline: "none",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}
              >
                <option value="mettler">Mettler Toledo</option>
                <option value="sartorius">Sartorius</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "10px", textTransform: "uppercase", color: "#6b7280", fontWeight: 600, letterSpacing: "0.05em" }}>Protocol</label>
              <select
                value={scaleType}
                onChange={(e) => onScaleTypeChange(e.target.value)}
                style={{
                  fontSize: "13px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#ffffff",
                  color: "#374151",
                  outline: "none",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}
              >
                <option value="typeA">Type A (Universal)</option>
                <option value="avery">Avery</option>
              </select>
            </div>
          </div>

          <div
            style={{
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#6b7280",
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
              backgroundColor: isConnected
                ? "rgba(22, 163, 74, 0.1)"
                : "rgba(243, 244, 246, 1)",
              border: "1px solid rgba(229, 231, 235, 1)",
              fontSize: "13px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "999px",
                backgroundColor: isConnected
                  ? "#16a34a"
                  : isConnecting
                  ? "#f97316"
                  : "#ef4444",
                boxShadow: isConnected
                  ? "0 0 12px rgba(22, 163, 74, 0.6)"
                  : "none",
              }}
            />
            <span style={{ color: "#374151", fontWeight: 500 }}>
              {isConnected
                ? "Connected"
                : isConnecting
                ? "Connecting..."
                : "Disconnected"}
            </span>
          </div>
          <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: 4 }}>
            {mqttHost}
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
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Scale display */}
          <div
            style={{
              padding: "18px 18px 20px",
              borderRadius: "18px",
              background: "linear-gradient(145deg, #ecfdf5, #f0fdf4)",
              border: "1px solid rgba(134, 239, 172, 0.5)",
            }}
          >
            {isStale && (
              <div
                style={{
                  marginBottom: "12px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "#fefce8",
                  border: "1px solid #fde047",
                  color: "#854d0e",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>⚠️</span>
                <span>No Data Stream</span>
              </div>
            )}
            <div
              style={{
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "#166534",
                marginBottom: "10px",
                fontWeight: 600,
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
                  color: lastWeight != null ? "#15803d" : "#9ca3af",
                }}
              >
                {lastWeight != null ? lastWeight.toFixed(3) : "--.--"}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "#166534",
                  marginBottom: "6px",
                  fontWeight: 600,
                }}
              >
                {unit || "kg"}
              </div>
            </div>
            <div
              style={{
                marginTop: "8px",
                fontSize: "12px",
                color: "#6b7280",
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
                Topic:{" "}
                <span style={{ color: "#15803d", fontWeight: "bold" }}>
                  {topic}
                </span>
              </span>
            </div>
            <div
              style={{ marginTop: "4px", fontSize: "12px", color: "#6b7280" }}
            >
              Serial Number:{" "}
              <span style={{ color: "#15803d", fontWeight: "bold" }}>
                {serialNumber || "N/A"}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div
            style={{
              padding: "16px",
              borderRadius: "18px",
              background: "#f9fafb",
              border: "1px solid rgba(229, 231, 235, 1)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {/* Topic Input Field */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <label
                style={{
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "#6b7280",
                }}
              >
                Target Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => onTopicChange(e.target.value)}
                disabled={isConnected || isConnecting}
                placeholder="Enter scale topic (e.g. CKRG123)"
                style={{
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "#1f2937",
                  fontSize: "14px",
                  outline: "none",
                  cursor: isConnected ? "not-allowed" : "text",
                  opacity: isConnected ? 0.6 : 1,
                }}
              />
            </div>

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
                  color: "#6b7280",
                }}
              >
                Actions
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {!isConnected ? (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "999px",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: 600,
                      background: "linear-gradient(135deg, #16a34a, #15803d)",
                      color: "#ffffff",
                      cursor: isConnecting ? "not-allowed" : "pointer",
                      opacity: isConnecting ? 0.7 : 1,
                      boxShadow:
                        "0 4px 6px -1px rgba(22, 163, 74, 0.4), 0 2px 4px -1px rgba(22, 163, 74, 0.2)",
                    }}
                  >
                    {isConnecting ? "Connecting..." : "Connect"}
                  </button>
                ) : (
                  <button
                    onClick={onDisconnect}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "999px",
                      border: "1px solid rgba(239, 68, 68, 0.5)",
                      fontSize: "13px",
                      fontWeight: 500,
                      background: "#fef2f2",
                      color: "#ef4444",
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
                onClick={onStart}
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
                    ? "linear-gradient(135deg, #16a34a, #15803d)"
                    : "#e5e7eb",
                  color: isConnected ? "white" : "#9ca3af",
                  cursor: isConnected ? "pointer" : "not-allowed",
                }}
              >
                Start Streaming
              </button>
              <button
                onClick={onStop}
                disabled={!isConnected}
                style={{
                  flex: 1,
                  minWidth: "120px",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: isConnected
                    ? "1px solid #ef4444" // Red border
                    : "1px solid #e5e7eb",
                  fontSize: "14px",
                  fontWeight: 600,
                  background: isConnected ? "#fef2f2" : "#f9fafb", // Light red bg
                  color: isConnected ? "#b91c1c" : "#9ca3af", // Dark red text
                  cursor: isConnected ? "pointer" : "not-allowed",
                }}
              >
                Stop Streaming
              </button>
              <button
                onClick={onZero}
                disabled={!isConnected}
                style={{
                  flex: 1,
                  minWidth: "120px",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: isConnected
                    ? "1px solid #16a34a"
                    : "1px solid #e5e7eb",
                  fontSize: "14px",
                  fontWeight: 600,
                  background: isConnected ? "#f0fdf4" : "#f9fafb",
                  color: isConnected ? "#166534" : "#9ca3af",
                  cursor: isConnected ? "pointer" : "not-allowed",
                }}
              >
                Zero
              </button>
              <button
                onClick={onTare}
                disabled={!isConnected}
                style={{
                  flex: 1,
                  minWidth: "120px",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: isConnected
                    ? "1px solid #d97706"
                    : "1px solid #e5e7eb",
                  fontSize: "14px",
                  fontWeight: 600,
                  background: isConnected ? "#fffbeb" : "#f9fafb",
                  color: isConnected ? "#b45309" : "#9ca3af",
                  cursor: isConnected ? "pointer" : "not-allowed",
                }}
              >
                Tare
              </button>
              <button
                onClick={onGetSerial}
                disabled={!isConnected}
                style={{
                  flex: 1,
                  minWidth: "120px",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: isConnected
                    ? "1px solid #3b82f6"
                    : "1px solid #e5e7eb",
                  fontSize: "14px",
                  fontWeight: 600,
                  background: isConnected ? "#eff6ff" : "#f9fafb",
                  color: isConnected ? "#1e40af" : "#9ca3af",
                  cursor: isConnected ? "pointer" : "not-allowed",
                }}
              >
                Get Serial
              </button>
              <button
                onClick={onPrint}
                disabled={!isConnected}
                style={{
                  flex: 1,
                  minWidth: "120px",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: isConnected
                    ? "1px solid #8b5cf6" // Violet
                    : "1px solid #e5e7eb",
                  fontSize: "14px",
                  fontWeight: 600,
                  background: isConnected ? "#f5f3ff" : "#f9fafb",
                  color: isConnected ? "#7c3aed" : "#9ca3af",
                  cursor: isConnected ? "pointer" : "not-allowed",
                }}
              >
                Get Weight Avery
              </button>
            </div>

            <div
              style={{
                fontSize: "11px",
                color: "#6b7280",
                marginTop: "4px",
              }}
            >
              - Press{" "}
              <span style={{ color: "#166534", fontWeight: "bold" }}>
                Connect
              </span>{" "}
              to connect. - Press{" "}
              <span style={{ color: "#166534", fontWeight: "bold" }}>
                Start Streaming
              </span>{" "}
              to send START. - Press{" "}
              <span style={{ color: "#166534", fontWeight: "bold" }}>
                Zero
              </span>{" "}
              to send Z. - Press{" "}
			  <span style={{ color: "#166534", fontWeight: "bold" }}>
                Tare
              </span>{" "}
              to send T.
            </div>
          </div>
        </div>

        {/* Right column: log */}
        <div
          style={{
            padding: "16px",
            borderRadius: "18px",
            background: "#f9fafb",
            border: "1px solid rgba(229, 231, 235, 1)",
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
              color: "#6b7280",
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
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              padding: "8px 10px",
              fontSize: "12px",
            }}
          >
            {log.length === 0 ? (
              <div style={{ color: "#9ca3af" }}>
                No events yet. Connect and start streaming to see messages here.
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
                  <span style={{ color: "#9ca3af", minWidth: "64px" }}>
                    {entry.ts}
                  </span>
                  <span style={{ color: "#374151" }}>{entry.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
